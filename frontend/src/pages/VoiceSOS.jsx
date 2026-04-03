import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/auth";
import toast from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

const TRIGGER_PHRASES = ["help me", "help", "bachao", "emergency", "sos", "danger"];

const VoiceSOS = () => {
    const [auth] = useAuth();
    const [isListening, setIsListening]   = useState(false);
    const [transcript, setTranscript]     = useState("");
    const [triggered, setTriggered]       = useState(false);
    const [supported, setSupported]       = useState(true);
    const [position, setPosition]         = useState(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            setSupported(false);
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous   = true;
        recognition.interimResults = true;
        recognition.lang         = "en-IN";

        recognition.onresult = (event) => {
            const text = Array.from(event.results)
                .map(r => r[0].transcript)
                .join(" ")
                .toLowerCase();
            setTranscript(text);

            const matched = TRIGGER_PHRASES.find(phrase => text.includes(phrase));
            if (matched && !triggered) {
                triggerSOS(matched);
            }
        };

        recognition.onerror = (e) => {
            if (e.error !== "no-speech") {
                toast.error("Microphone error: " + e.error);
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            // Restart if still supposed to be listening
            if (isListening) recognition.start();
        };

        recognitionRef.current = recognition;

        // Get location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            });
        }
    }, []);

    const triggerSOS = async (phrase) => {
        setTriggered(true);
        toast.error(`🚨 SOS triggered! Detected: "${phrase}"`);

        try {
            await fetch(`${API_URL}/api/v1/emergency/emergencypressed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: auth?.user?._id,
                    lat: position?.lat,
                    long: position?.lng,
                    trigger: "voice",
                    phrase,
                }),
            });
            toast.success("🚨 Emergency contacts notified!");
        } catch (e) {
            toast.error("Failed to send SOS");
        }

        // Reset after 10 seconds
        setTimeout(() => setTriggered(false), 10000);
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setTranscript("");
            toast.success("Voice SOS deactivated");
        } else {
            recognitionRef.current.start();
            setIsListening(true);
            toast.success("🎤 Voice SOS activated! Say 'Help me' to trigger SOS");
        }
    };

    if (!supported) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: "50px" }}>😔</div>
                <p>Voice recognition is not supported in this browser.</p>
                <p style={{ color: "#666" }}>Please use Chrome or Edge.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ color: "#7B61FF", fontWeight: "bold", fontSize: "26px" }}>
                    🔊 Voice Activated SOS
                </h2>
                <p style={{ color: "#666" }}>
                    Say a trigger phrase to automatically send SOS
                </p>
            </div>

            {/* Main Button */}
            <div style={{ textAlign: "center", marginBottom: "30px" }}>
                <button onClick={toggleListening} style={{
                    width: "180px", height: "180px", borderRadius: "50%", border: "none",
                    background: triggered ? "#ff0000" : isListening
                        ? "linear-gradient(135deg, #ff4444, #ff6b6b)"
                        : "linear-gradient(135deg, #7B61FF, #a855f7)",
                    color: "white", fontSize: "50px", cursor: "pointer",
                    boxShadow: isListening ? "0 0 0 20px rgba(255,68,68,0.2), 0 0 0 40px rgba(255,68,68,0.1)" : "0 8px 30px rgba(123,97,255,0.4)",
                    transition: "all 0.3s",
                    animation: isListening ? "pulse 1.5s infinite" : "none"
                }}>
                    {triggered ? "🚨" : isListening ? "🎤" : "🎙️"}
                </button>
                <p style={{ marginTop: "15px", fontWeight: "bold", color: triggered ? "#ff0000" : isListening ? "#ff4444" : "#333" }}>
                    {triggered ? "🚨 SOS TRIGGERED!" : isListening ? "Listening... Say 'Help Me'" : "Tap to Activate"}
                </p>
            </div>

            {/* Live Transcript */}
            {isListening && (
                <div style={{
                    background: "#f8f9fa", borderRadius: "12px", padding: "15px",
                    marginBottom: "20px", minHeight: "60px", border: "1px solid #ddd"
                }}>
                    <p style={{ fontSize: "12px", color: "#888", marginBottom: "5px" }}>Live transcript:</p>
                    <p style={{ color: "#333", fontSize: "14px" }}>
                        {transcript || "Waiting for speech..."}
                    </p>
                </div>
            )}

            {/* Trigger Phrases */}
            <div style={{
                background: "#f0ebff", borderRadius: "12px", padding: "15px", marginBottom: "20px"
            }}>
                <p style={{ fontWeight: "bold", color: "#7B61FF", marginBottom: "10px" }}>
                    🗣️ Trigger Phrases:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {TRIGGER_PHRASES.map(phrase => (
                        <span key={phrase} style={{
                            background: "white", border: "1px solid #7B61FF",
                            color: "#7B61FF", padding: "4px 12px", borderRadius: "20px",
                            fontSize: "13px", fontWeight: "bold"
                        }}>
                            "{phrase}"
                        </span>
                    ))}
                </div>
            </div>

            {/* Tips */}
            <div style={{ background: "#fff3cd", borderRadius: "12px", padding: "15px" }}>
                <p style={{ fontWeight: "bold", marginBottom: "8px" }}>💡 Tips:</p>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#666" }}>
                    <li>Keep this page open in background while walking</li>
                    <li>Speak clearly and at normal volume</li>
                    <li>Works best in Chrome/Edge browser</li>
                    <li>Allow microphone access when prompted</li>
                </ul>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255,68,68,0.4); }
                    70% { box-shadow: 0 0 0 30px rgba(255,68,68,0); }
                    100% { box-shadow: 0 0 0 0 rgba(255,68,68,0); }
                }
            `}</style>
        </div>
    );
};

export default VoiceSOS;
