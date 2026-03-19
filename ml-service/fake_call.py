from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os, io, base64, random, time

app = Flask(__name__)
CORS(app)

# ── Fake call scripts ──────────────────────────────────────────────────────────
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
}

CALLER_DISPLAY = {
    "mom":     {"name": "Maa 💕",     "number": "+91 98765 43210"},
    "dad":     {"name": "Papa 👨",    "number": "+91 98765 43211"},
    "friend":  {"name": "Priya 👯",   "number": "+91 97654 32109"},
    "boss":    {"name": "Manager 💼", "number": "+91 96543 21098"},
    "brother": {"name": "Bhai 🤜",    "number": "+91 95432 10987"},
}

def generate_tts_base64(text: str) -> str | None:
    """Try gTTS first, fall back to pyttsx3, return base64 MP3 or None."""
    # Try gTTS (requires internet)
    try:
        from gtts import gTTS
        buf = io.BytesIO()
        tts = gTTS(text=text, lang="hi", slow=False)
        tts.write_to_fp(buf)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")
    except Exception:
        pass

    # Try pyttsx3 (offline, Windows/Linux)
    try:
        import pyttsx3, tempfile
        engine = pyttsx3.init()
        engine.setProperty("rate", 160)
        engine.setProperty("volume", 0.9)
        # pick female voice if available
        voices = engine.getProperty("voices")
        for v in voices:
            if "female" in v.name.lower() or "zira" in v.name.lower() or "hazel" in v.name.lower():
                engine.setProperty("voice", v.id)
                break
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            tmp_path = f.name
        engine.save_to_file(text, tmp_path)
        engine.runAndWait()
        with open(tmp_path, "rb") as f:
            data = base64.b64encode(f.read()).decode("utf-8")
        os.unlink(tmp_path)
        return data
    except Exception:
        pass

    return None


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "RakshikaSphere Fake Call Service Running", "port": 5005})


@app.route("/call/generate", methods=["POST"])
def generate_call():
    data     = request.get_json() or {}
    caller   = data.get("caller", "mom").lower()
    with_tts = data.get("tts", False)      # set True to generate audio

    if caller not in SCRIPTS:
        caller = "mom"

    script  = random.choice(SCRIPTS[caller])
    display = CALLER_DISPLAY[caller]

    result = {
        "success":     True,
        "caller":      caller,
        "caller_name": display["name"],
        "number":      display["number"],
        "script":      script,
        "duration":    random.randint(25, 90),   # fake call duration seconds
        "timestamp":   int(time.time()),
    }

    if with_tts:
        audio_b64 = generate_tts_base64(script)
        if audio_b64:
            result["audio_base64"] = audio_b64
            result["audio_format"] = "mp3"
        else:
            result["tts_error"] = "TTS unavailable — install gTTS or pyttsx3"

    return jsonify(result)


@app.route("/call/scripts", methods=["GET"])
def list_scripts():
    return jsonify({
        "callers": [
            {"id": k, **CALLER_DISPLAY[k], "scripts": SCRIPTS[k]}
            for k in SCRIPTS
        ]
    })


@app.route("/call/quick", methods=["GET"])
def quick_call():
    """Quick GET endpoint — frontend can call /call/quick?caller=mom"""
    caller = request.args.get("caller", "mom").lower()
    if caller not in SCRIPTS:
        caller = "mom"
    script  = random.choice(SCRIPTS[caller])
    display = CALLER_DISPLAY[caller]
    return jsonify({
        "success": True, "caller": caller,
        "caller_name": display["name"], "number": display["number"],
        "script": script, "duration": random.randint(25, 90),
    })


if __name__ == "__main__":
    print("📞 Fake Call Service starting on port 5005...")
    app.run(host="0.0.0.0", port=5005, debug=True)