from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
import os
import re

app = Flask(__name__)
CORS(app)

# ── keyword-based heuristic classifier (no heavy ML deps needed) ──────────────
VIOLENCE_KEYWORDS = [
    "knife","gun","weapon","blood","attack","hit","punch","stab","shoot","fight",
    "assault","hurt","injury","wound","beaten","choke","strangle","threat","abused",
    "violence","harm","danger","emergency","help","police","rape","murder","kill",
    "bruise","bleeding","unconscious","trapped","forced","grabbed","dragged"
]

SEVERITY_CRITICAL = ["gun","shoot","stab","knife","rape","murder","kill","strangle","unconscious","bleeding","weapon"]
SEVERITY_HIGH     = ["attack","assault","choke","punch","hit","blood","wound","injury","forced","trapped"]
SEVERITY_MEDIUM   = ["fight","beaten","threat","abuse","grabbed","dragged","hurt","bruise","emergency","danger"]

def analyze_text_context(text: str) -> dict:
    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)
    found = [w for w in words if w in VIOLENCE_KEYWORDS]

    if any(w in text_lower for w in SEVERITY_CRITICAL):
        severity = "Critical"
        confidence = min(0.95, 0.70 + len(found) * 0.05)
        action = "Dispatch emergency services immediately. Share location with authorities."
        color = "#ff2d55"
    elif any(w in text_lower for w in SEVERITY_HIGH):
        severity = "High"
        confidence = min(0.90, 0.60 + len(found) * 0.05)
        action = "Alert nearby contacts and authorities. Document evidence now."
        color = "#ff6b35"
    elif any(w in text_lower for w in SEVERITY_MEDIUM):
        severity = "Medium"
        confidence = min(0.80, 0.50 + len(found) * 0.04)
        action = "Record details and report to nearest police station."
        color = "#ffd60a"
    elif found:
        severity = "Low"
        confidence = 0.45 + len(found) * 0.03
        action = "Stay alert. Keep emergency contacts ready."
        color = "#30d158"
    else:
        severity = "Safe"
        confidence = 0.85
        action = "No immediate threat detected."
        color = "#636366"

    return {
        "severity": severity,
        "confidence": round(confidence, 2),
        "detected_keywords": found,
        "recommended_action": action,
        "color": color,
        "keyword_count": len(found)
    }


def analyze_image_heuristic(image_data: str) -> dict:
    """
    Heuristic image analysis based on image properties.
    For production, replace with a real CV model (e.g. TensorFlow, ONNX).
    """
    try:
        # Decode base64 to get raw bytes
        if "," in image_data:
            image_data = image_data.split(",")[1]
        img_bytes = base64.b64decode(image_data)
        size_kb = len(img_bytes) / 1024

        # Simple heuristics based on image properties
        # (In production: run through MobileNet or similar)
        if size_kb > 500:
            severity = "Medium"
            confidence = 0.52
            note = "High-resolution image. Manual review recommended."
            color = "#ffd60a"
        elif size_kb > 100:
            severity = "Low"
            confidence = 0.41
            note = "Image received. No obvious threat signals detected automatically."
            color = "#30d158"
        else:
            severity = "Safe"
            confidence = 0.78
            note = "Small image. Likely a thumbnail or icon."
            color = "#636366"

        return {
            "severity": severity,
            "confidence": confidence,
            "recommended_action": note,
            "color": color,
            "analysis_type": "heuristic",
            "size_kb": round(size_kb, 1),
            "note": "⚠ For production accuracy, integrate a trained CV model (TensorFlow / ONNX)."
        }
    except Exception as e:
        return {
            "severity": "Unknown",
            "confidence": 0.0,
            "recommended_action": "Could not process image.",
            "color": "#636366",
            "error": str(e)
        }


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "RakshikaSphere Violence Detector Running", "port": 5004})


@app.route("/analyze/text", methods=["POST"])
def analyze_text():
    data = request.get_json()
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    result = analyze_text_context(text)
    return jsonify({"success": True, **result})


@app.route("/analyze/image", methods=["POST"])
def analyze_image():
    data = request.get_json()
    image_data = data.get("image", "")
    context_text = data.get("context", "")

    if not image_data:
        return jsonify({"error": "No image provided"}), 400

    img_result = analyze_image_heuristic(image_data)

    # Boost severity if context text is also alarming
    if context_text:
        text_result = analyze_text_context(context_text)
        severity_rank = {"Safe": 0, "Low": 1, "Medium": 2, "High": 3, "Critical": 4, "Unknown": 0}
        if severity_rank.get(text_result["severity"], 0) > severity_rank.get(img_result["severity"], 0):
            img_result["severity"] = text_result["severity"]
            img_result["color"] = text_result["color"]
            img_result["confidence"] = max(img_result["confidence"], text_result["confidence"])
            img_result["recommended_action"] = text_result["recommended_action"]
            img_result["context_keywords"] = text_result["detected_keywords"]

    return jsonify({"success": True, **img_result})


@app.route("/analyze/report", methods=["POST"])
def analyze_full_report():
    """Analyze a full incident report (text + optional image)."""
    data = request.get_json()
    report_text = data.get("report", "")
    image_data  = data.get("image", "")
    address     = data.get("address", "")

    full_text = f"{report_text} {address}"
    text_result = analyze_text_context(full_text)

    if image_data:
        img_result = analyze_image_heuristic(image_data)
        severity_rank = {"Safe": 0, "Low": 1, "Medium": 2, "High": 3, "Critical": 4, "Unknown": 0}
        final_severity = text_result["severity"] if severity_rank.get(text_result["severity"], 0) >= severity_rank.get(img_result["severity"], 0) else img_result["severity"]
        combined = {**text_result, "image_analysis": img_result, "severity": final_severity}
    else:
        combined = text_result

    return jsonify({"success": True, **combined})


if __name__ == "__main__":
    print("🔍 Violence Detector Service starting on port 5004...")
    app.run(host="0.0.0.0", port=5004, debug=True)