from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import json

app = Flask(__name__)
CORS(app)

def predict_danger_zones(incidents):
    """
    Takes a list of incidents with lat/lng coordinates
    and returns danger zone clusters with risk levels.
    """
    if len(incidents) < 2:
        # Not enough data — return each point as its own zone
        return [
            {
                "lat": inc["lat"],
                "lng": inc["lng"],
                "intensity": 0.5,
                "count": 1,
                "risk": "Low"
            }
            for inc in incidents
        ]

    # Extract coordinates
    coords = np.array([[inc["lat"], inc["lng"]] for inc in incidents])

    # Scale coordinates for DBSCAN
    scaler = StandardScaler()
    coords_scaled = scaler.fit_transform(coords)

    # DBSCAN clustering
    # eps: max distance between points in a cluster
    # min_samples: min points to form a cluster
    db = DBSCAN(eps=0.3, min_samples=2).fit(coords_scaled)
    labels = db.labels_

    # Build cluster results
    clusters = {}
    noise_points = []

    for i, label in enumerate(labels):
        if label == -1:
            # Noise point — isolated incident
            noise_points.append({
                "lat": float(incidents[i]["lat"]),
                "lng": float(incidents[i]["lng"]),
                "intensity": 0.3,
                "count": 1,
                "risk": "Low"
            })
        else:
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(incidents[i])

    # Convert clusters to danger zones
    danger_zones = []
    max_count = max([len(v) for v in clusters.values()], default=1)

    for label, points in clusters.items():
        # Centroid of cluster
        center_lat = float(np.mean([p["lat"] for p in points]))
        center_lng = float(np.mean([p["lng"] for p in points]))
        count = len(points)

        # Intensity: normalized 0-1 based on incident count
        intensity = min(count / max(max_count, 1), 1.0)

        # Risk level
        if intensity >= 0.7:
            risk = "Critical"
        elif intensity >= 0.4:
            risk = "High"
        elif intensity >= 0.2:
            risk = "Medium"
        else:
            risk = "Low"

        danger_zones.append({
            "lat": center_lat,
            "lng": center_lng,
            "intensity": round(intensity, 2),
            "count": count,
            "risk": risk,
            "points": [{"lat": float(p["lat"]), "lng": float(p["lng"])} for p in points]
        })

    # Sort by intensity descending
    danger_zones.sort(key=lambda x: x["intensity"], reverse=True)

    return danger_zones + noise_points


@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "RakshikaSphere ML Service Running", "version": "1.0"})


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        if not data or "incidents" not in data:
            return jsonify({"error": "Missing 'incidents' field in request body"}), 400

        incidents = data["incidents"]

        if not isinstance(incidents, list):
            return jsonify({"error": "'incidents' must be a list"}), 400

        if len(incidents) == 0:
            return jsonify({"danger_zones": [], "total_incidents": 0, "message": "No incidents provided"})

        # Validate each incident has lat/lng
        for inc in incidents:
            if "lat" not in inc or "lng" not in inc:
                return jsonify({"error": "Each incident must have 'lat' and 'lng' fields"}), 400

        danger_zones = predict_danger_zones(incidents)

        return jsonify({
            "danger_zones": danger_zones,
            "total_incidents": len(incidents),
            "total_clusters": len([z for z in danger_zones if z["count"] > 1]),
            "message": "Prediction successful"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)