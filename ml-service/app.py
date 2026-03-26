from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.cluster import DBSCAN
import math
import collections
from datetime import datetime
import re
import random
import base64
import os
import io
import time

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


# ══════════════════════════════════════════════════════════════
# SHARED UTILITIES
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
# 1. DANGER ZONE CLUSTERING (DBSCAN)
# ══════════════════════════════════════════════════════════════

def predict_danger_zones(incidents):
    if len(incidents) < 2:
        return [
            {"lat": inc["lat"], "lng": inc["lng"],
             "intensity": 0.5, "count": 1, "risk": "low"}
            for inc in incidents
        ]

    coords = np.array([[inc["lat"], inc["lng"]] for inc in incidents])
    coords_rad = np.radians(coords)

    db = DBSCAN(eps=0.5 / 6371, min_samples=2, metric="haversine").fit(coords_rad)
    labels = db.labels_
    clusters = {}
    noise_points = []

    for i, label in enumerate(labels):
        if label == -1:
            noise_points.append({
                "lat": float(incidents[i]["lat"]),
                "lng": float(incidents[i]["lng"]),
                "intensity": 0.3, "count": 1, "risk": "low"
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

        if intensity >= 0.7:   risk = "critical"
        elif intensity >= 0.4: risk = "high"
        elif intensity >= 0.2: risk = "medium"
        else:                  risk = "low"

        danger_zones.append({
            "lat": center_lat, "lng": center_lng,
            "intensity": round(intensity, 2), "count": count, "risk": risk
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
    "help me", "save me", "bachao", "maaro mat", "bomb", "hostage", "forced"
]

HIGH_KEYWORDS = [
    "harassment", "stalking", "following", "groping", "assault",
    "eve teasing", "blackmail", "threatening", "abuse", "violence",
    "unsafe", "scared", "fear", "danger", "help", "please help",
    "uncomfortable", "suspicious man", "being followed", "chase",
    "grab", "pull", "drag", "intimidate", "surround", "block",
    "hurt", "injury", "hit", "push", "shove"
]

MEDIUM_KEYWORDS = [
    "inappropriate", "staring", "uncomfortable", "suspicious",
    "weird", "strange", "uneasy", "catcalling", "verbal abuse",
    "obscene", "lewd", "indecent", "nuisance", "misbehave",
    "watching", "comment", "remark", "shout", "whistle", "gesture",
    "creepy", "trouble", "concerned", "worry"
]


def classify_text(text):
    if not text:
        return "Low", 0.4

    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)

    critical_score = sum(2 for kw in CRITICAL_KEYWORDS if kw in text_lower)
    high_score     = sum(1.5 for kw in HIGH_KEYWORDS if kw in text_lower)
    medium_score   = sum(1 for kw in MEDIUM_KEYWORDS if kw in text_lower)

    urgency_words = ["please", "help", "now", "immediately", "urgent", "sos", "emergency"]
    critical_score += sum(0.5 for w in urgency_words if w in words)

    exclamations = text.count("!")
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if exclamations > 1: critical_score += 0.5
    if caps_ratio > 0.3: high_score += 0.5

    if critical_score >= 2:
        return "Critical", round(min(0.95, 0.6 + critical_score * 0.05), 2)
    elif critical_score >= 1 or high_score >= 2:
        return "High", round(min(0.90, 0.55 + high_score * 0.05), 2)
    elif high_score >= 1 or medium_score >= 2:
        return "Medium", round(min(0.80, 0.50 + medium_score * 0.05), 2)
    else:
        return "Low", 0.4


def get_suggested_action(severity):
    return {
        "Critical": "Immediate police response required. Contact emergency services now.",
        "High":     "Urgent follow-up needed. Assign to senior officer within 1 hour.",
        "Medium":   "Review within 24 hours. Monitor for escalation.",
        "Low":      "Log and review within 48 hours."
    }.get(severity, "Review as needed.")


# ══════════════════════════════════════════════════════════════
# 3. SAFE ROUTE (3 variants with danger scoring)
# ══════════════════════════════════════════════════════════════

def point_to_segment_distance(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return haversine(px, py, ax, ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return haversine(px, py, ax + t * dx, ay + t * dy)


def calculate_route_danger(route_points, danger_zones):
    if not danger_zones:
        return 0.0
    severity_weights = {"critical": 4.0, "high": 2.5, "medium": 1.5, "low": 0.5}
    influence_radius = {"critical": 0.8, "high": 0.6,  "medium": 0.4, "low": 0.2}
    total_danger = 0.0

    for i in range(len(route_points) - 1):
        p1, p2 = route_points[i], route_points[i + 1]
        for zone in danger_zones:
            dist   = point_to_segment_distance(
                zone["lat"], zone["lng"], p1[0], p1[1], p2[0], p2[1])
            risk   = zone.get("risk", "low").lower()
            radius = influence_radius.get(risk, 0.2)
            weight = severity_weights.get(risk, 0.5)
            if dist < radius:
                total_danger += weight * (1 - dist / radius)

    return round(total_danger, 3)


def generate_route_variants(start, end):
    slat, slng = start["lat"], start["lng"]
    elat, elng = end["lat"], end["lng"]
    mid_lat  = (slat + elat) / 2
    mid_lng  = (slng + elng) / 2
    lat_diff = abs(elat - slat)
    lng_diff = abs(elng - slng)

    d1lat = mid_lat + lat_diff * 0.4 + 0.003
    d1lng = mid_lng - lng_diff * 0.2
    d2lat = mid_lat - lat_diff * 0.4 - 0.003
    d2lng = mid_lng + lng_diff * 0.2

    return [
        {
            "id": "direct", "name": "Direct Route",
            "description": "Shortest path between origin and destination",
            "points": [[slat, slng], [mid_lat, mid_lng], [elat, elng]]
        },
        {
            "id": "north", "name": "Northern Route",
            "description": "Takes a northern detour through main roads",
            "points": [
                [slat, slng],
                [slat + (d1lat - slat) * 0.4, slng + (d1lng - slng) * 0.3],
                [d1lat, d1lng],
                [d1lat - (d1lat - elat) * 0.3, d1lng + (elng - d1lng) * 0.4],
                [elat, elng]
            ]
        },
        {
            "id": "south", "name": "Southern Route",
            "description": "Takes a southern detour through wider streets",
            "points": [
                [slat, slng],
                [slat + (d2lat - slat) * 0.4, slng + (d2lng - slng) * 0.3],
                [d2lat, d2lng],
                [d2lat - (d2lat - elat) * 0.3, d2lng + (elng - d2lng) * 0.4],
                [elat, elng]
            ]
        }
    ]


def calculate_route_distance(points):
    return round(sum(
        haversine(points[i][0], points[i][1], points[i+1][0], points[i+1][1])
        for i in range(len(points) - 1)
    ), 2)


def get_safety_label(danger_score):
    if danger_score == 0:    return "Safe",          "#30d158"
    elif danger_score < 1:   return "Mostly Safe",   "#7bc67e"
    elif danger_score < 2.5: return "Moderate Risk", "#ffd60a"
    elif danger_score < 4:   return "High Risk",     "#ff6b35"
    else:                    return "Dangerous",      "#ff2d55"


# ══════════════════════════════════════════════════════════════
# 4. VIOLENCE / CONTENT DETECTION (text + image)
# ══════════════════════════════════════════════════════════════

VIOLENCE_KEYWORDS_V = [
    "knife", "gun", "weapon", "blood", "attack", "hit", "punch", "stab",
    "shoot", "fight", "assault", "hurt", "injury", "wound", "beaten",
    "choke", "strangle", "threat", "abused", "violence", "harm", "danger",
    "emergency", "help", "police", "rape", "murder", "kill", "bruise",
    "bleeding", "unconscious", "trapped", "forced", "grabbed", "dragged"
]
SEVERITY_CRITICAL_V = ["gun", "shoot", "stab", "knife", "rape", "murder", "kill",
                        "strangle", "unconscious", "bleeding", "weapon"]
SEVERITY_HIGH_V     = ["attack", "assault", "choke", "punch", "hit", "blood",
                        "wound", "injury", "forced", "trapped"]
SEVERITY_MEDIUM_V   = ["fight", "beaten", "threat", "abuse", "grabbed", "dragged",
                        "hurt", "bruise", "emergency", "danger"]


def analyze_text_violence(text):
    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)
    found = [w for w in words if w in VIOLENCE_KEYWORDS_V]

    if any(w in text_lower for w in SEVERITY_CRITICAL_V):
        return {"severity": "Critical",
                "confidence": round(min(0.95, 0.70 + len(found) * 0.05), 2),
                "recommended_action": "Dispatch emergency services immediately. Share location with authorities.",
                "color": "#ff2d55", "detected_keywords": found, "keyword_count": len(found)}
    elif any(w in text_lower for w in SEVERITY_HIGH_V):
        return {"severity": "High",
                "confidence": round(min(0.90, 0.60 + len(found) * 0.05), 2),
                "recommended_action": "Alert nearby contacts and authorities. Document evidence now.",
                "color": "#ff6b35", "detected_keywords": found, "keyword_count": len(found)}
    elif any(w in text_lower for w in SEVERITY_MEDIUM_V):
        return {"severity": "Medium",
                "confidence": round(min(0.80, 0.50 + len(found) * 0.04), 2),
                "recommended_action": "Record details and report to nearest police station.",
                "color": "#ffd60a", "detected_keywords": found, "keyword_count": len(found)}
    elif found:
        return {"severity": "Low",
                "confidence": round(0.45 + len(found) * 0.03, 2),
                "recommended_action": "Stay alert. Keep emergency contacts ready.",
                "color": "#30d158", "detected_keywords": found, "keyword_count": len(found)}
    else:
        return {"severity": "Safe", "confidence": 0.85,
                "recommended_action": "No immediate threat detected.",
                "color": "#636366", "detected_keywords": [], "keyword_count": 0}


def analyze_image_heuristic(image_data):
    try:
        if "," in image_data:
            image_data = image_data.split(",")[1]
        img_bytes = base64.b64decode(image_data)
        size_kb = len(img_bytes) / 1024

        if size_kb > 500:
            return {"severity": "Medium", "confidence": 0.52, "color": "#ffd60a",
                    "recommended_action": "High-resolution image. Manual review recommended.",
                    "size_kb": round(size_kb, 1), "analysis_type": "heuristic"}
        elif size_kb > 100:
            return {"severity": "Low", "confidence": 0.41, "color": "#30d158",
                    "recommended_action": "No obvious threat signals detected automatically.",
                    "size_kb": round(size_kb, 1), "analysis_type": "heuristic"}
        else:
            return {"severity": "Safe", "confidence": 0.78, "color": "#636366",
                    "recommended_action": "Small image. Likely a thumbnail.",
                    "size_kb": round(size_kb, 1), "analysis_type": "heuristic"}
    except Exception as e:
        return {"severity": "Unknown", "confidence": 0.0, "color": "#636366",
                "recommended_action": "Could not process image.", "error": str(e)}


# ══════════════════════════════════════════════════════════════
# 5. FAKE CALL
# ══════════════════════════════════════════════════════════════

SCRIPTS = {
    "mom": [
        "Hello beta, kahan ho tum? Ghar kab aa rahe ho?",
        "Kal shopping chalne ka plan hai, saath chalogi?",
        "Khana kha liya? Dhyan rakho apna.",
        "Beta, papa bhi puch rahe the tumhare baare mein.",
        "Ghar aa jao jaldi, raat ho rahi hai.",
    ],
    "dad": [
        "Haan bolo, kya hua? Sab theek hai na?",
        "Kahan ho abhi? Koi problem to nahi?",
        "Office se nikle kya? Ghar aa jao.",
        "Seedha ghar ao, raat bahut ho gayi.",
        "Car ki chabi maine rakh di hai table pe.",
    ],
    "friend": [
        "Hey! Kahan chhup gayi thi? Kal party hai, aa rahi ho na?",
        "Arre yaar, vo movie release ho gayi, dekhne chalein?",
        "Bhai sun, urgent baat karni thi. Call kar mujhe.",
        "Oye! Kab free ho? Bahut din ho gaye mille nahi.",
        "Yaar location share kar, pick up karne aa jata hoon.",
    ],
    "boss": [
        "Hello, kal meeting 10 baje rakhni hai. Note kar lena.",
        "Project update chahiye tha kal tak. Ho jayega?",
        "Office mein koi issue tha, aap dekh sakti hain?",
        "Client call schedule kar do please, urgent hai.",
        "Report ready kar lena, review karna hai.",
    ],
    "brother": [
        "Didi! Kahan ho? Ghar kab aa rahi ho?",
        "Suno, kal bike se drop kar dunga. Bol dena.",
        "Maa puch rahi thi. Call karo usse.",
        "Arey wapas aa jao, raat bahut ho gayi.",
        "Koi takleef? Bata, abhi aa jata hoon.",
    ],
    "police": [
        "Hello, this is Inspector Sharma speaking.",
        "We received your complaint and are following up.",
        "A patrol team has been dispatched to your area.",
        "Please stay where you are, help is on the way.",
    ],
}

CALLER_DISPLAY = {
    "mom":     {"name": "Maa 💕",      "number": "+91 98765 43210"},
    "dad":     {"name": "Papa 👨",     "number": "+91 98765 43211"},
    "friend":  {"name": "Priya 👯",    "number": "+91 97654 32109"},
    "boss":    {"name": "Manager 💼",  "number": "+91 96543 21098"},
    "brother": {"name": "Bhai 🤜",     "number": "+91 95432 10987"},
    "police":  {"name": "Police 🚔",   "number": "+91 100"},
}


# ══════════════════════════════════════════════════════════════
# 6. HOTSPOT PREDICTION
# ══════════════════════════════════════════════════════════════

def predict_area_risk(lat, lng, incidents, target_hour=None, target_weekday=None):
    if target_hour is None:    target_hour    = datetime.now().hour
    if target_weekday is None: target_weekday = datetime.now().weekday()

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
            "nearby_incidents": 0, "time_multiplier": time_risk,
            "peak_hours": [], "reason": "No historical incidents nearby — time-based prediction only"
        }

    hour_counts = collections.Counter([inc.get("hour", 12) for inc in nearby])
    peak_hours  = [h for h, _ in hour_counts.most_common(3)]
    hour_risk   = 1.0 if target_hour in peak_hours else 0.5
    sev_map     = {"low": 1, "medium": 2, "high": 3, "critical": 3}
    avg_sev     = sum(sev_map.get(i.get("severity", "medium"), 2) for i in nearby) / len(nearby)
    dist_weight = sum(1 / (1 + i["distance"]) for i in nearby) / len(nearby)
    time_mult   = get_time_risk_multiplier(target_hour, target_weekday)

    score = min(round(
        (len(nearby) / 20) * 0.3 + hour_risk * 0.25 +
        time_mult * 0.25 + (avg_sev / 3) * 0.1 + dist_weight * 0.1, 2
    ), 1.0)

    level = ("critical" if score >= 0.7 else "high" if score >= 0.5
             else "medium" if score >= 0.3 else "low")

    return {
        "risk_score": score, "risk_level": level,
        "nearby_incidents": len(nearby), "time_multiplier": time_mult,
        "peak_hours": peak_hours,
        "reason": f"{len(nearby)} incidents within 1.5km; peak hours: {peak_hours}"
    }


def generate_24h_forecast(lat, lng, incidents):
    now = datetime.now()
    forecast = []
    for h in range(24):
        hour    = (now.hour + h) % 24
        weekday = (now.weekday() + (now.hour + h) // 24) % 7
        result  = predict_area_risk(lat, lng, incidents, hour, weekday)
        forecast.append({
            "hour": hour, "hour_label": f"{hour:02d}:00",
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
        "version": "3.0",
        "endpoints": {
            "danger_zone":     "POST /predict",
            "classifier":      "POST /classify",
            "batch_classify":  "POST /classify-batch",
            "safe_route":      "POST /safe-route",
            "violence_text":   "POST /analyze/text",
            "violence_image":  "POST /analyze/image",
            "violence_report": "POST /analyze/report",
            "fake_call_get":   "GET  /call/quick?caller=mom",
            "fake_call_post":  "POST /call/generate",
            "call_scripts":    "GET  /call/scripts",
            "hotspot":         "POST /hotspot/predict",
            "forecast":        "POST /hotspot/forecast",
        }
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "version": "3.0"})


# ── 1. Danger Zone ────────────────────────────────────────────

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data or "incidents" not in data:
            return jsonify({"error": "Missing incidents"}), 400
        incidents    = data["incidents"]
        danger_zones = predict_danger_zones(incidents)
        return jsonify({
            "danger_zones": danger_zones,
            "total_incidents": len(incidents),
            "total_clusters": len([z for z in danger_zones if z["count"] > 1]),
            "message": "Prediction successful"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 2. Classifier ─────────────────────────────────────────────

@app.route("/classify", methods=["POST"])
def classify():
    try:
        data = request.get_json()
        if not data or "text" not in data:
            return jsonify({"error": "No text provided"}), 400
        severity, confidence = classify_text(data["text"])
        return jsonify({
            "severity": severity, "confidence": confidence,
            "suggested_action": get_suggested_action(severity),
            "text_length": len(data["text"])
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
            sev, conf = classify_text(inc.get("report", ""))
            results.append({
                "id": inc.get("id"), "severity": sev, "confidence": conf,
                "suggested_action": get_suggested_action(sev)
            })
        return jsonify({"results": results, "total": len(results)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 3. Safe Route ─────────────────────────────────────────────

@app.route("/safe-route", methods=["POST"])
def safe_route():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing request body"}), 400

        start        = data.get("start") or data.get("origin")
        end          = data.get("end")   or data.get("destination")
        danger_zones = data.get("danger_zones", [])

        if not start or not end:
            return jsonify({"error": "start/origin and end/destination coordinates required"}), 400

        routes  = generate_route_variants(start, end)
        results = []

        for route in routes:
            danger       = calculate_route_danger(route["points"], danger_zones)
            distance     = calculate_route_distance(route["points"])
            label, color = get_safety_label(danger)
            results.append({
                "id": route["id"], "name": route["name"],
                "description": route["description"],
                "points": route["points"],
                "danger_score": danger,
                "distance_km": distance,
                "estimated_minutes": round((distance / 5) * 60),
                "safety_label": label,
                "safety_color": color,
                "is_recommended": False
            })

        safest = min(results, key=lambda r: (r["danger_score"], r["distance_km"]))
        safest["is_recommended"] = True
        results.sort(key=lambda r: (r["danger_score"], r["distance_km"]))

        return jsonify({
            "success": True,
            "routes": results,
            "total_danger_zones": len(danger_zones),
            "recommended_route_id": safest["id"]
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── 4. Violence Detection ─────────────────────────────────────

@app.route("/analyze/text", methods=["POST"])
def analyze_text():
    try:
        data = request.get_json()
        text = data.get("text", "").strip()
        if not text:
            return jsonify({"error": "No text provided"}), 400
        return jsonify({"success": True, **analyze_text_violence(text)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/analyze/image", methods=["POST"])
def analyze_image():
    try:
        data         = request.get_json()
        image_data   = data.get("image", "")
        context_text = data.get("context", "")
        if not image_data:
            return jsonify({"error": "No image provided"}), 400

        img_result = analyze_image_heuristic(image_data)
        if context_text:
            text_result = analyze_text_violence(context_text)
            sev_rank    = {"Safe": 0, "Low": 1, "Medium": 2, "High": 3, "Critical": 4}
            if sev_rank.get(text_result["severity"], 0) > sev_rank.get(img_result["severity"], 0):
                img_result.update({
                    "severity":           text_result["severity"],
                    "color":              text_result["color"],
                    "confidence":         max(img_result["confidence"], text_result["confidence"]),
                    "recommended_action": text_result["recommended_action"],
                    "context_keywords":   text_result["detected_keywords"]
                })
        return jsonify({"success": True, **img_result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/analyze/report", methods=["POST"])
def analyze_report():
    try:
        data        = request.get_json()
        full_text   = f"{data.get('report', '')} {data.get('address', '')}"
        text_result = analyze_text_violence(full_text)
        image_data  = data.get("image", "")

        if image_data:
            img_result = analyze_image_heuristic(image_data)
            sev_rank   = {"Safe": 0, "Low": 1, "Medium": 2, "High": 3, "Critical": 4}
            final_sev  = (text_result["severity"]
                          if sev_rank.get(text_result["severity"], 0) >= sev_rank.get(img_result["severity"], 0)
                          else img_result["severity"])
            combined = {**text_result, "image_analysis": img_result, "severity": final_sev}
        else:
            combined = text_result

        return jsonify({"success": True, **combined})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── 5. Fake Call ──────────────────────────────────────────────

@app.route("/call/quick", methods=["GET"])
def fake_call_quick():
    try:
        caller = request.args.get("caller", "mom").lower()
        if caller not in SCRIPTS: caller = "mom"
        display = CALLER_DISPLAY.get(caller, {"name": "Unknown", "number": "+91 00000 00000"})
        return jsonify({
            "success": True, "caller": caller,
            "caller_name": display["name"], "number": display["number"],
            "script": random.choice(SCRIPTS[caller]),
            "duration": random.randint(25, 90), "timestamp": int(time.time())
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/call/generate", methods=["POST"])
def fake_call_generate():
    try:
        data   = request.get_json() or {}
        caller = data.get("caller", "mom").lower()
        if caller not in SCRIPTS: caller = "mom"
        display = CALLER_DISPLAY.get(caller, {"name": "Unknown", "number": "+91 00000 00000"})
        return jsonify({
            "success": True, "caller": caller,
            "caller_name": display["name"], "number": display["number"],
            "script": random.choice(SCRIPTS[caller]),
            "duration": random.randint(25, 90), "timestamp": int(time.time())
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/call/scripts", methods=["GET"])
def list_scripts():
    return jsonify({
        "callers": [
            {"id": k, **CALLER_DISPLAY.get(k, {}), "scripts": SCRIPTS[k]}
            for k in SCRIPTS
        ]
    })


# ── 6. Hotspot Prediction ─────────────────────────────────────

@app.route("/hotspot/predict", methods=["POST"])
def hotspot_predict():
    try:
        data = request.get_json()
        if not data or "lat" not in data or "lng" not in data:
            return jsonify({"success": False, "error": "lat and lng required"}), 400
        result = predict_area_risk(
            float(data["lat"]), float(data["lng"]),
            data.get("incidents", []),
            data.get("target_hour"), data.get("target_weekday")
        )
        return jsonify({"success": True, **result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/hotspot/forecast", methods=["POST"])
def hotspot_forecast():
    try:
        data = request.get_json()
        if not data or "lat" not in data or "lng" not in data:
            return jsonify({"success": False, "error": "lat and lng required"}), 400
        forecast = generate_24h_forecast(
            float(data["lat"]), float(data["lng"]), data.get("incidents", [])
        )
        peak   = max(forecast, key=lambda x: x["risk_score"])
        safest = min(forecast, key=lambda x: x["risk_score"])
        return jsonify({
            "success": True, "forecast": forecast,
            "peak_risk_hour": peak["hour_label"],
            "safest_hour": safest["hour_label"]
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)