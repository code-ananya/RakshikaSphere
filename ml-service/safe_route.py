from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import json

app = Flask(__name__)
CORS(app)

def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km"""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def point_to_segment_distance(px, py, ax, ay, bx, by):
    """Minimum distance from point P to line segment AB"""
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return haversine(px, py, ax, ay)
    t = max(0, min(1, ((px - ax)*dx + (py - ay)*dy) / (dx*dx + dy*dy)))
    nearest_x = ax + t * dx
    nearest_y = ay + t * dy
    return haversine(px, py, nearest_x, nearest_y)

def calculate_route_danger(route_points, danger_zones):
    """Calculate total danger score for a route"""
    if not danger_zones:
        return 0.0

    severity_weights = {"Critical": 4.0, "High": 2.5, "Medium": 1.5, "Low": 0.5}
    influence_radius = {"Critical": 0.8, "High": 0.6, "Medium": 0.4, "Low": 0.2}

    total_danger = 0.0
    for i in range(len(route_points) - 1):
        seg_danger = 0.0
        p1, p2 = route_points[i], route_points[i+1]
        for zone in danger_zones:
            dist = point_to_segment_distance(
                zone["lat"], zone["lng"],
                p1[0], p1[1], p2[0], p2[1]
            )
            radius = influence_radius.get(zone.get("risk", "Low"), 0.2)
            weight = severity_weights.get(zone.get("risk", "Low"), 0.5)
            if dist < radius:
                danger_contribution = weight * (1 - dist / radius)
                seg_danger += danger_contribution
        total_danger += seg_danger

    return round(total_danger, 3)

def generate_route_variants(start, end, num_variants=3):
    """Generate multiple route variants with different waypoints"""
    slat, slng = start["lat"], start["lng"]
    elat, elng = end["lat"], end["lng"]

    mid_lat = (slat + elat) / 2
    mid_lng = (slng + elng) / 2
    lat_diff = elat - slat
    lng_diff = elng - slng

    routes = []

    # Route 1: Direct
    routes.append({
        "id": "direct",
        "name": "Direct Route",
        "points": [[slat, slng], [mid_lat, mid_lng], [elat, elng]],
        "description": "Shortest path between origin and destination"
    })

    # Route 2: Northern detour
    detour1_lat = mid_lat + abs(lat_diff) * 0.4 + 0.003
    detour1_lng = mid_lng - abs(lng_diff) * 0.2
    routes.append({
        "id": "north",
        "name": "Northern Route",
        "points": [
            [slat, slng],
            [slat + (detour1_lat - slat) * 0.4, slng + (detour1_lng - slng) * 0.3],
            [detour1_lat, detour1_lng],
            [detour1_lat - (detour1_lat - elat) * 0.3, detour1_lng + (elng - detour1_lng) * 0.4],
            [elat, elng]
        ],
        "description": "Takes a northern detour through main roads"
    })

    # Route 3: Southern detour
    detour2_lat = mid_lat - abs(lat_diff) * 0.4 - 0.003
    detour2_lng = mid_lng + abs(lng_diff) * 0.2
    routes.append({
        "id": "south",
        "name": "Southern Route",
        "points": [
            [slat, slng],
            [slat + (detour2_lat - slat) * 0.4, slng + (detour2_lng - slng) * 0.3],
            [detour2_lat, detour2_lng],
            [detour2_lat - (detour2_lat - elat) * 0.3, detour2_lng + (elng - detour2_lng) * 0.4],
            [elat, elng]
        ],
        "description": "Takes a southern detour through wider streets"
    })

    return routes

def calculate_route_distance(points):
    """Total distance of a route in km"""
    total = 0
    for i in range(len(points) - 1):
        total += haversine(points[i][0], points[i][1], points[i+1][0], points[i+1][1])
    return round(total, 2)

def get_safety_label(danger_score):
    if danger_score == 0:
        return "Safe", "#30d158"
    elif danger_score < 1:
        return "Mostly Safe", "#7bc67e"
    elif danger_score < 2.5:
        return "Moderate Risk", "#ffd60a"
    elif danger_score < 4:
        return "High Risk", "#ff6b35"
    else:
        return "Dangerous", "#ff2d55"

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "RakshikaSphere Safe Route Service Running", "version": "1.0"})

@app.route("/safe-route", methods=["POST"])
def safe_route():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    start = data.get("start")
    end = data.get("end")
    danger_zones = data.get("danger_zones", [])

    if not start or not end:
        return jsonify({"error": "Start and end coordinates required"}), 400

    routes = generate_route_variants(start, end)

    results = []
    for route in routes:
        danger = calculate_route_danger(route["points"], danger_zones)
        distance = calculate_route_distance(route["points"])
        safety_label, safety_color = get_safety_label(danger)
        est_minutes = round((distance / 5) * 60)  # walking at 5km/h

        results.append({
            "id": route["id"],
            "name": route["name"],
            "description": route["description"],
            "points": route["points"],
            "danger_score": danger,
            "distance_km": distance,
            "estimated_minutes": est_minutes,
            "safety_label": safety_label,
            "safety_color": safety_color,
            "is_recommended": False
        })

    # Mark safest route
    safest = min(results, key=lambda r: (r["danger_score"], r["distance_km"]))
    safest["is_recommended"] = True

    # Sort: safest first
    results.sort(key=lambda r: (r["danger_score"], r["distance_km"]))

    return jsonify({
        "success": True,
        "routes": results,
        "total_danger_zones": len(danger_zones),
        "recommended_route_id": safest["id"]
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, debug=True)