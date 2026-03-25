from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.cluster import DBSCAN
import math
import collections
from datetime import datetime

app = Flask(__name__)
CORS(app)


# -----------------------------
# Utility Functions
# -----------------------------

def haversine(lat1, lon1, lat2, lon2):
    """Distance in km between two coordinates"""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )

    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_time_risk_multiplier(hour, weekday):
    """Rule-based time risk scoring"""

    if 22 <= hour or hour < 4:
        time_risk = 1.0

    elif (19 <= hour < 22) or (4 <= hour < 6):
        time_risk = 0.7

    else:
        time_risk = 0.3

    if weekday >= 5 and (22 <= hour or hour < 4):
        time_risk = min(time_risk + 0.15, 1.0)

    return time_risk


# -----------------------------
# CLUSTERING
# -----------------------------

def predict_danger_zones(incidents):
    """
    Cluster incidents into danger zones using geographic distance.
    """

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

    # Convert to radians for haversine metric
    coords = np.radians(coords)

    db = DBSCAN(
        eps=0.5 / 6371,   # 0.5 km radius
        min_samples=2,
        metric="haversine"
    ).fit(coords)

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

    max_count = max(
        [len(v) for v in clusters.values()],
        default=1
    )

    for label, points in clusters.items():

        center_lat = float(
            np.mean([p["lat"] for p in points])
        )

        center_lng = float(
            np.mean([p["lng"] for p in points])
        )

        count = len(points)

        intensity = min(
            count / max(max_count, 1),
            1.0
        )

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
            "points": [
                {
                    "lat": float(p["lat"]),
                    "lng": float(p["lng"])
                }
                for p in points
            ],
        })

    danger_zones.sort(
        key=lambda x: x["intensity"],
        reverse=True
    )

    return danger_zones + noise_points


# -----------------------------
# AREA RISK PREDICTION
# -----------------------------

def predict_area_risk(
    lat,
    lng,
    incidents,
    target_hour=None,
    target_weekday=None,
):

    if target_hour is None:
        target_hour = datetime.now().hour

    if target_weekday is None:
        target_weekday = datetime.now().weekday()

    RADIUS_KM = 1.5

    nearby = []

    for inc in incidents:

        d = haversine(
            lat,
            lng,
            inc["lat"],
            inc["lng"]
        )

        if d <= RADIUS_KM:

            nearby.append({
                **inc,
                "distance": d
            })

    if not nearby:

        time_risk = get_time_risk_multiplier(
            target_hour,
            target_weekday
        )

        return {
            "risk_score": round(
                time_risk * 0.4,
                2
            ),
            "risk_level":
                "low"
                if time_risk < 0.5
                else "medium",
            "nearby_incidents": 0,
            "time_multiplier": time_risk,
            "peak_hours": [],
            "reason":
                "No historical incidents nearby",
        }

    hour_counts = collections.Counter(
        [inc["hour"] for inc in nearby]
    )

    peak_hours = [
        h for h, _
        in hour_counts.most_common(3)
    ]

    hour_risk = (
        1.0
        if target_hour in peak_hours
        else 0.5
    )

    sev_map = {
        "low": 1,
        "medium": 2,
        "high": 3,
        "critical": 3,
    }

    avg_severity = (
        sum(
            sev_map.get(
                i.get("severity", "medium"),
                2,
            )
            for i in nearby
        )
        / max(len(nearby), 1)
    )

    dist_weight = (
        sum(
            1 / (1 + i["distance"])
            for i in nearby
        )
        / max(len(nearby), 1)
    )

    time_mult = get_time_risk_multiplier(
        target_hour,
        target_weekday
    )

    raw_score = (
        (len(nearby) / 20) * 0.3
        + hour_risk * 0.25
        + time_mult * 0.25
        + (avg_severity / 3) * 0.1
        + dist_weight * 0.1
    )

    score = min(
        round(raw_score, 2),
        1.0
    )

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
        "reason":
            f"{len(nearby)} incidents within 1.5km",
    }


# -----------------------------
# FORECAST
# -----------------------------

def generate_24h_forecast(
    lat,
    lng,
    incidents,
):

    now = datetime.now()

    forecast = []

    for h in range(24):

        hour = (now.hour + h) % 24

        weekday = (
            now.weekday()
            + (now.hour + h) // 24
        ) % 7

        result = predict_area_risk(
            lat,
            lng,
            incidents,
            hour,
            weekday,
        )

        forecast.append({
            "hour": hour,
            "hour_label":
                f"{hour:02d}:00",
            "risk_score":
                result["risk_score"],
            "risk_level":
                result["risk_level"],
            "is_current":
                h == 0,
        })

    return forecast


# -----------------------------
# ROUTES
# -----------------------------

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status":
            "RakshikaSphere ML Service Running",
        "version": "1.0"
    })


@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "healthy"
    })


@app.route("/predict", methods=["POST"])
def predict():

    try:

        data = request.get_json()

        if not data or "incidents" not in data:

            return jsonify({
                "error":
                "Missing incidents"
            }), 400

        incidents = data["incidents"]

        danger_zones = predict_danger_zones(
            incidents
        )

        return jsonify({

            "danger_zones":
                danger_zones,

            "total_incidents":
                len(incidents),

            "total_clusters":
                len([
                    z
                    for z in danger_zones
                    if z["count"] > 1
                ]),

            "message":
                "Prediction successful",
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


@app.route(
    "/hotspot/predict",
    methods=["POST"]
)
def hotspot_predict():

    """
    POST body:
    {
        lat,
        lng,
        incidents,
        target_hour,
        target_weekday
    }
    """

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "error":
                "Missing JSON body",
            }), 400

        if "lat" not in data or "lng" not in data:

            return jsonify({
                "success": False,
                "error":
                "lat and lng required",
            }), 400

        lat = float(data["lat"])
        lng = float(data["lng"])

        incidents = data.get(
            "incidents",
            []
        )

        target_hour = data.get(
            "target_hour"
        )

        target_weekday = data.get(
            "target_weekday"
        )

        result = predict_area_risk(
            lat,
            lng,
            incidents,
            target_hour,
            target_weekday,
        )

        return jsonify({
            "success": True,
            **result
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e),
        }), 500


@app.route(
    "/hotspot/forecast",
    methods=["POST"]
)
def hotspot_forecast():

    """
    Returns 24-hour risk forecast
    """

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "error":
                "Missing JSON body",
            }), 400

        lat = float(data["lat"])
        lng = float(data["lng"])

        incidents = data.get(
            "incidents",
            []
        )

        forecast = generate_24h_forecast(
            lat,
            lng,
            incidents,
        )

        peak = max(
            forecast,
            key=lambda x:
            x["risk_score"]
        )

        safest = min(
            forecast,
            key=lambda x:
            x["risk_score"]
        )

        return jsonify({

            "success": True,

            "forecast":
                forecast,

            "peak_risk_hour":
                peak["hour_label"],

            "safest_hour":
                safest["hour_label"],
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e),
        }), 500


if __name__ == "__main__":

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5001
    )