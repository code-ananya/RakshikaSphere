from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.cluster import DBSCAN
import math
import collections
from datetime import datetime
import re
import random

app = Flask(__name__)
CORS(app)


# ══════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ══════════════════════════════════════════════════════════════

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_time_risk_multiplier(hour, weekday):
    if 22 <= hour or hour < 4:
        time_risk = 1.0
    elif (19 <= hour < 22) or (4 <= hour < 6):
        time_risk = 0.7
    else:
        time_risk = 0.3
    if weekday >= 5 and (22 <= hour or hour < 4):
        time_risk = min(time_risk + 0.15, 1.0)
    return time_risk


# ══════════════════════════════════════════════════════════════
# 1. DANGER ZONE CLUSTERING
# ══════════════════════════════════════════════════════════════

def predict_danger_zones(incidents):
    if len(incidents) < 2:
        return [
            {
                "lat": inc["lat"],
                "lng": inc["lng"],
                "intensity": 0.5,
                "count": 1,
                "risk": "low",
            }
            for inc in incidents
        ]

    coords = np.array([[inc["lat"], inc["lng"]] for inc in incidents])
    coords_rad = np.radians(coords)

    db = DBSCAN(
        eps=0.5 / 6371,
        min_samples=2,
        metric="haversine"
    ).fit(coords_rad)

    labels = db.labels_
    clusters = {}
    noise_points = []

    for i, label in enumerate(labels):
        if label == -1:
            noise_points.append({
                "lat": float(incidents[i]["lat"]),
                "lng": float(incidents[i]["lng"]),
                "intensity": 0.3,
                "count": 1,
                "risk": "low",
            })
        else:
            clusters.setdefault(label, []).append(incidents[i])

    danger_zones = []
    max_count = max([len(v) for v in clusters.values()], default=1)

    for label, points in clusters.items():
        center_lat = float(np.mean([p["lat"] for p in points]))
        center_lng = float(np.mean([p["lng"] for p in points]))
        count = len(points)
        intensity = min(count / max(max_count, 1), 1.0)

        if intensity >= 0.7:
            risk = "critical"
        elif intensity >= 0.4:
            risk = "high"
        elif intensity >= 0.2:
            risk = "medium"
        else:
            risk = "low"

        danger_zones.append({
            "lat": center_lat,
            "lng": center_lng,
            "intensity": round(intensity, 2),
            "count": count,
            "risk": risk,
        })

    danger_zones.sort(key=lambda x: x["intensity"], reverse=True)
    return danger_zones + noise_points


# ══════════════════════════════════════════════════════════════
# 2. INCIDENT SEVERITY CLASSIFIER
# ══════════════════════════════════════════════════════════════

CRITICAL_KEYWORDS = [
    "rape", "sexual assault", "murder", "kill", "stabbed", "knife",
    "gun", "weapon", "kidnap", "abduct", "trafficking", "acid attack",
    "death threat", "unconscious", "bleeding", "shot", "strangled",
    "attacked", "beaten", "molested", "threatened with weapon",
    "help me", "save me", "bachao", "maaro mat"
]

HIGH_KEYWORDS = [
    "harassment", "stalking", "following", "groping", "assault",
    "eve teasing", "blackmail", "threatening", "abuse", "violence",
    "unsafe", "scared", "fear", "danger", "help", "please help",
    "uncomfortable", "suspicious man", "being followed"
]

MEDIUM_KEYWORDS = [
    "inappropriate", "staring", "uncomfortable", "suspicious",
    "weird", "strange", "uneasy", "catcalling", "verbal abuse",
    "obscene", "lewd", "indecent", "nuisance", "misbehave"
]


def classify_text(text):
    if not text:
        return "Low", 0.4

    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)

    critical_score = sum(2 for kw in CRITICAL_KEYWORDS if kw in text_lower)
    high_score = sum(1.5 for kw in HIGH_KEYWORDS if kw in text_lower)
    medium_score = sum(1 for kw in MEDIUM_KEYWORDS if kw in text_lower)

    # Urgency boost
    urgency_words = ["please", "help", "now", "immediately", "urgent", "sos", "emergency"]
    critical_score += sum(0.5 for w in urgency_words if w in words)

    # Punctuation signals
    exclamations = text.count("!")
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if exclamations > 1:
        critical_score += 0.5
    if caps_ratio > 0.3:
        high_score += 0.5

    if critical_score >= 2:
        confidence = min(0.95, 0.6 + critical_score * 0.05)
        return "Critical", round(confidence, 2)
    elif critical_score >= 1 or high_score >= 2:
        confidence = min(0.90, 0.55 + high_score * 0.05)
        return "High", round(confidence, 2)
    elif high_score >= 1 or medium_score >= 2:
        confidence = min(0.80, 0.50 + medium_score * 0.05)
        return "Medium", round(confidence, 2)
    else:
        return "Low", 0.4


def get_suggested_action(severity):
    actions = {
        "Critical": "Immediate police response required. Contact emergency services now.",
        "High": "Urgent follow-up needed. Assign to senior officer within 1 hour.",
        "Medium": "Review within 24 hours. Monitor for escalation.",
        "Low": "Log and review within 48 hours."
    }
    return actions.get(severity, "Review as needed.")


# ══════════════════════════════════════════════════════════════
# 3. SAFE ROUTE
# ══════════════════════════════════════════════════════════════

def calculate_route_safety(route_points, incidents, current_hour=None):
    if current_hour is None:
        current_hour = datetime.now().hour

    time_multiplier = get_time_risk_multiplier(current_hour, datetime.now().weekday())
    total_risk = 0
    danger_spots = []

    for point in route_points:
        point_risk = 0
        for inc in incidents:
            dist = haversine(point["lat"], point["lng"], inc["lat"], inc["lng"])
            if dist < 0.5:
                point_risk += 1 / (1 + dist)

        point_risk *= time_multiplier
        total_risk += point_risk

        if point_risk > 0.5:
            danger_spots.append({
                "lat": point["lat"],
                "lng": point["lng"],
                "risk": round(point_risk, 2)
            })

    avg_risk = total_risk / max(len(route_points), 1)
    safety_score = max(0, 1 - min(avg_risk, 1))

    if safety_score >= 0.7:
        safety_level = "safe"
    elif safety_score >= 0.4:
        safety_level = "moderate"
    else:
        safety_level = "unsafe"

    return {
        "safety_score": round(safety_score, 2),
        "safety_level": safety_level,
        "danger_spots": danger_spots,
        "time_multiplier": time_multiplier,
        "recommendation": (
            "This route appears safe." if safety_level == "safe"
            else "Exercise caution on this route." if safety_level == "moderate"
            else "Avoid this route if possible. Consider alternatives."
        )
    }


# ══════════════════════════════════════════════════════════════
# 4. VIOLENCE / CONTENT DETECTION
# ══════════════════════════════════════════════════════════════

VIOLENCE_KEYWORDS = [
    "knife", "gun", "weapon", "blood", "attack", "fight", "assault",
    "stab", "shoot", "hit", "beat", "punch", "kick", "murder", "kill",
    "rape", "abuse", "violence", "threat", "harm", "hurt", "wound",
    "injury", "dead", "dying", "unconscious", "bleeding", "choke",
    "strangle", "burn", "acid"
]

DISTRESS_KEYWORDS_V = [
    "help", "save", "please", "stop", "no", "don't", "leave me",
    "let go", "screaming", "crying", "scared", "afraid", "fear",
    "bachao", "chodo", "mat maro"
]


def analyze_content(text="", image_description=""):
    combined = (text + " " + image_description).lower()
    words = re.findall(r'\b\w+\b', combined)

    violence_score = sum(2 for kw in VIOLENCE_KEYWORDS if kw in combined)
    distress_score = sum(1 for kw in DISTRESS_KEYWORDS_V if kw in combined)

    total_score = violence_score + distress_score * 0.5

    if total_score >= 4:
        level = "critical"
        flag = True
    elif total_score >= 2:
        level = "high"
        flag = True
    elif total_score >= 1:
        level = "medium"
        flag = True
    else:
        level = "safe"
        flag = False

    return {
        "flagged": flag,
        "violence_level": level,
        "violence_score": round(min(total_score / 6, 1.0), 2),
        "matched_keywords": [kw for kw in VIOLENCE_KEYWORDS if kw in combined][:5],
        "recommended_action": (
            "Immediately alert admin and authorities." if level == "critical"
            else "Flag for admin review." if level in ["high", "medium"]
            else "Content appears safe."
        )
    }


# ══════════════════════════════════════════════════════════════
# 5. FAKE CALL
# ══════════════════════════════════════════════════════════════

CALL_SCRIPTS = {
    "mom": [
        {"speaker": "Mom", "text": "Beta, kahan ho tum? Ghar aa jao jaldi!"},
        {"speaker": "Mom", "text": "Sab theek hai na? Main worried hoon."},
        {"speaker": "Mom", "text": "Khana ready hai, jaldi aao."},
        {"speaker": "Mom", "text": "Call kar dena jab pahunch jao, okay?"},
    ],
    "friend": [
        {"speaker": "Friend", "text": "Hey! Kahan ho yaar? Party shuru ho gayi!"},
        {"speaker": "Friend", "text": "Arre jaldi aao, sab tumhara wait kar rahe hain!"},
        {"speaker": "Friend", "text": "Bhai/Behen, location share karo, main pick up kar loon?"},
        {"speaker": "Friend", "text": "Okay okay, jaldi aana! Missing you here!"},
    ],
    "boss": [
        {"speaker": "Boss", "text": "Hello, urgent meeting hai aaj shaam ko."},
        {"speaker": "Boss", "text": "Can you come to the office immediately?"},
        {"speaker": "Boss", "text": "There's an important client call at 6 PM."},
        {"speaker": "Boss", "text": "Please confirm your availability right away."},
    ],
    "police": [
        {"speaker": "Officer", "text": "Hello, this is Inspector Sharma speaking."},
        {"speaker": "Officer", "text": "We received your complaint and are following up."},
        {"speaker": "Officer", "text": "A patrol team has been dispatched to your area."},
        {"speaker": "Officer", "text": "Please stay where you are, help is on the way."},
    ],
    "default": [
        {"speaker": "Caller", "text": "Hello? Are you there?"},
        {"speaker": "Caller", "text": "I've been trying to reach you!"},
        {"speaker": "Caller", "text": "Can you talk right now?"},
        {"speaker": "Caller", "text": "Okay, call me back when you're free."},
    ]
}

CALLER_NAMES = {
    "mom": "Maa 💜",
    "friend": "Best Friend 😊",
    "boss": "Office 💼",
    "police": "Police 🚔",
    "default": "Unknown Caller"
}


# ══════════════════════════════════════════════════════════════
# 6. HOTSPOT PREDICTION
# ══════════════════════════════════════════════════════════════

def predict_area_risk(lat, lng, incidents, target_hour=None, target_weekday=None):
    if target_hour is None:
        target_hour = datetime.now().hour
    if target_weekday is None:
        target_weekday = datetime.now().weekday()

    RADIUS_KM = 1.5
    nearby = []

    for inc in incidents:
        d = haversine(lat, lng, inc["lat"], inc["lng"])
        if d <= RADIUS_KM:
            nearby.append({**inc, "distance": d})

    if not nearby:
        time_risk = get_time_risk_multiplier(target_hour, target_weekday)
        return {
            "risk_score": round(time_risk * 0.4, 2),
            "risk_level": "low" if time_risk < 0.5 else "medium",
            "nearby_incidents": 0,
            "time_multiplier": time_risk,
            "peak_hours": [],
            "reason": "No historical incidents nearby — time-based prediction only"
        }

    hour_counts = collections.Counter([inc.get("hour", 12) for inc in nearby])
    peak_hours = [h for h, _ in hour_counts.most_common(3)]
    hour_risk = 1.0 if target_hour in peak_hours else 0.5

    sev_map = {"low": 1, "medium": 2, "high": 3, "critical": 3}
    avg_severity = sum(sev_map.get(i.get("severity", "medium"), 2) for i in nearby) / max(len(nearby), 1)
    dist_weight = sum(1 / (1 + i["distance"]) for i in nearby) / max(len(nearby), 1)
    time_mult = get_time_risk_multiplier(target_hour, target_weekday)

    raw_score = (
        (len(nearby) / 20) * 0.3
        + hour_risk * 0.25
        + time_mult * 0.25
        + (avg_severity / 3) * 0.1
        + dist_weight * 0.1
    )
    score = min(round(raw_score, 2), 1.0)

    if score >= 0.7:
        level = "critical"
    elif score >= 0.5:
        level = "high"
    elif score >= 0.3:
        level = "medium"
    else:
        level = "low"

    return {
        "risk_score": score,
        "risk_level": level,
        "nearby_incidents": len(nearby),
        "time_multiplier": time_mult,
        "peak_hours": peak_hours,
        "reason": f"{len(nearby)} incidents within 1.5km; peak hours: {peak_hours}"
    }


def generate_24h_forecast(lat, lng, incidents):
    now = datetime.now()
    forecast = []
    for h in range(24):
        hour = (now.hour + h) % 24
        weekday = (now.weekday() + (now.hour + h) // 24) % 7
        result = predict_area_risk(lat, lng, incidents, hour, weekday)
        forecast.append({
            "hour": hour,
            "hour_label": f"{hour:02d}:00",
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "is_current": h == 0
        })
    return forecast


# ══════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "RakshikaSphere ML Service Running",
        "version": "2.0",
        "endpoints": {
            "danger_zone":   "POST /predict",
            "classifier":    "POST /classify",
            "batch_classify":"POST /classify-batch",
            "safe_route":    "POST /safe-route",
            "violence":      "POST /analyze/text",
            "fake_call":     "GET  /call/quick?caller=mom",
            "hotspot":       "POST /hotspot/predict",
            "forecast":      "POST /hotspot/forecast",
        }
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"})


# ── Danger Zone ───────────────────────────────────────────────

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data or "incidents" not in data:
            return jsonify({"error": "Missing incidents"}), 400

        incidents = data["incidents"]
        danger_zones = predict_danger_zones(incidents)

        return jsonify({
            "danger_zones": danger_zones,
            "total_incidents": len(incidents),
            "total_clusters": len([z for z in danger_zones if z["count"] > 1]),
            "message": "Prediction successful",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Incident Classifier ───────────────────────────────────────

@app.route("/classify", methods=["POST"])
def classify():
    try:
        data = request.get_json()
        if not data or "text" not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data.get("text", "")
        severity, confidence = classify_text(text)

        return jsonify({
            "severity": severity,
            "confidence": confidence,
            "suggested_action": get_suggested_action(severity),
            "text_length": len(text)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/classify-batch", methods=["POST"])
def classify_batch():
    try:
        data = request.get_json()
        if not data or "incidents" not in data:
            return jsonify({"error": "No incidents provided"}), 400

        results = []
        for inc in data["incidents"]:
            text = inc.get("report", "")
            severity, confidence = classify_text(text)
            results.append({
                "id": inc.get("id"),
                "severity": severity,
                "confidence": confidence,
                "suggested_action": get_suggested_action(severity)
            })

        return jsonify({"results": results, "total": len(results)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Safe Route ────────────────────────────────────────────────

@app.route("/safe-route", methods=["POST"])
def safe_route():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing request body"}), 400

        origin = data.get("origin")
        destination = data.get("destination")
        incidents = data.get("incidents", [])
        current_hour = data.get("current_hour", datetime.now().hour)

        if not origin or not destination:
            return jsonify({"error": "origin and destination required"}), 400

        # Generate simple intermediate points between origin and destination
        num_points = 8
        route_points = []
        for i in range(num_points + 1):
            t = i / num_points
            route_points.append({
                "lat": origin["lat"] + t * (destination["lat"] - origin["lat"]),
                "lng": origin["lng"] + t * (destination["lng"] - origin["lng"]),
            })

        safety = calculate_route_safety(route_points, incidents, current_hour)

        total_dist = haversine(
            origin["lat"], origin["lng"],
            destination["lat"], destination["lng"]
        )

        return jsonify({
            "success": True,
            "route_points": route_points,
            "distance_km": round(total_dist, 2),
            "estimated_walk_mins": round(total_dist / 0.083, 0),  # avg 5km/h walk
            **safety
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Violence / Content Detection ──────────────────────────────

@app.route("/analyze/text", methods=["POST"])
def analyze_text():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing request body"}), 400

        text = data.get("text", "")
        image_description = data.get("image_description", "")

        result = analyze_content(text, image_description)
        return jsonify({"success": True, **result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Fake Call ─────────────────────────────────────────────────

@app.route("/call/quick", methods=["GET"])
def fake_call_quick():
    try:
        caller = request.args.get("caller", "default").lower()
        script = CALL_SCRIPTS.get(caller, CALL_SCRIPTS["default"])
        caller_name = CALLER_NAMES.get(caller, "Unknown Caller")

        return jsonify({
            "success": True,
            "caller": caller_name,
            "caller_type": caller,
            "script": script,
            "duration_seconds": len(script) * 4,
            "ringtone": "default"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/call/generate", methods=["POST"])
def fake_call_generate():
    try:
        data = request.get_json() or {}
        caller = data.get("caller", "default").lower()
        script = CALL_SCRIPTS.get(caller, CALL_SCRIPTS["default"])
        caller_name = CALLER_NAMES.get(caller, "Unknown Caller")

        return jsonify({
            "success": True,
            "caller": caller_name,
            "caller_type": caller,
            "script": script,
            "duration_seconds": len(script) * 4,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Hotspot Prediction ────────────────────────────────────────

@app.route("/hotspot/predict", methods=["POST"])
def hotspot_predict():
    try:
        data = request.get_json()
        if not data or "lat" not in data or "lng" not in data:
            return jsonify({"success": False, "error": "lat and lng required"}), 400

        lat = float(data["lat"])
        lng = float(data["lng"])
        incidents = data.get("incidents", [])
        target_hour = data.get("target_hour")
        target_weekday = data.get("target_weekday")

        result = predict_area_risk(lat, lng, incidents, target_hour, target_weekday)
        return jsonify({"success": True, **result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/hotspot/forecast", methods=["POST"])
def hotspot_forecast():
    try:
        data = request.get_json()
        if not data or "lat" not in data or "lng" not in data:
            return jsonify({"success": False, "error": "lat and lng required"}), 400

        lat = float(data["lat"])
        lng = float(data["lng"])
        incidents = data.get("incidents", [])

        forecast = generate_24h_forecast(lat, lng, incidents)
        peak = max(forecast, key=lambda x: x["risk_score"])
        safest = min(forecast, key=lambda x: x["risk_score"])

        return jsonify({
            "success": True,
            "forecast": forecast,
            "peak_risk_hour": peak["hour_label"],
            "safest_hour": safest["hour_label"],
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)