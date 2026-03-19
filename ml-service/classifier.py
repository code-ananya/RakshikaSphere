from flask import Flask, request, jsonify
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)

# Keyword-based severity classifier (no external ML libraries needed)
CRITICAL_KEYWORDS = [
    "rape", "assault", "attack", "murder", "kill", "knife", "gun", "weapon",
    "abduct", "kidnap", "stab", "shoot", "threat", "unconscious", "bleeding",
    "help", "emergency", "danger", "trapped", "forced", "violence", "beaten",
    "molest", "harass severely", "acid", "fire", "bomb", "hostage"
]

HIGH_KEYWORDS = [
    "follow", "stalk", "chase", "touch", "grope", "grab", "pull", "drag",
    "threaten", "scare", "intimidate", "surround", "block", "harass",
    "inappropriate", "uncomfortable", "unsafe", "scared", "afraid", "fear",
    "hurt", "injury", "hit", "push", "shove", "eve tease", "catcall"
]

MEDIUM_KEYWORDS = [
    "suspicious", "watching", "staring", "comment", "remark", "shout",
    "whistle", "gesture", "uncomfortable", "weird", "strange", "odd",
    "creepy", "unease", "trouble", "problem", "concerned", "worry"
]

def classify_text(text):
    if not text:
        return "Low", 0.3

    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)

    critical_score = sum(2 for kw in CRITICAL_KEYWORDS if kw in text_lower)
    high_score = sum(1.5 for kw in HIGH_KEYWORDS if kw in text_lower)
    medium_score = sum(1 for kw in MEDIUM_KEYWORDS if kw in text_lower)

    # Boost score for urgency words
    urgency_words = ["please", "help", "now", "immediately", "urgent", "sos"]
    urgency_boost = sum(0.5 for w in urgency_words if w in words)

    critical_score += urgency_boost

    # Exclamation marks and caps suggest urgency
    exclamations = text.count("!")
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)

    if exclamations > 1:
        critical_score += 0.5
    if caps_ratio > 0.3:
        high_score += 0.5

    # Determine severity
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
        "Critical": "Immediate police response required. Contact emergency services.",
        "High": "Urgent follow-up needed. Assign to senior officer within 1 hour.",
        "Medium": "Review within 24 hours. Monitor for escalation.",
        "Low": "Log and review within 48 hours."
    }
    return actions.get(severity, "Review as needed.")

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "RakshikaSphere Classifier Running", "version": "1.0"})

@app.route("/classify", methods=["POST"])
def classify():
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

@app.route("/classify-batch", methods=["POST"])
def classify_batch():
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)