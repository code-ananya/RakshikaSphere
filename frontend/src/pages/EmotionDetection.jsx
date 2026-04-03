import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { useAuth } from "../context/auth";
import toast from "react-hot-toast";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// Emotions that trigger SOS
const DISTRESS_EMOTIONS = ["fearful", "sad", "disgusted", "angry"];
const DISTRESS_THRESHOLD = 0.65; // confidence threshold
const SOS_TRIGGER_COUNT = 3;     // trigger SOS after 3 consecutive distress detections

const EMOTION_COLORS = {
    happy:     { bg: "#d4edda", color: "#155724", emoji: "😊" },
    sad:       { bg: "#fff3cd", color: "#856404", emoji: "😢" },
    angry:     { bg: "#f8d7da", color: "#721c24", emoji: "😠" },
    fearful:   { bg: "#f8d7da", color: "#721c24", emoji: "😱" },
    disgusted: { bg: "#f8d7da", color: "#721c24", emoji: "🤢" },
    surprised: { bg: "#cce5ff", color: "#004085", emoji: "😲" },
    neutral:   { bg: "#e2e3e5", color: "#383d41", emoji: "😐" },
};

const EmotionDetection = () => {
    const [auth] = useAuth();
    const videoRef   = useRef(null);
    const canvasRef  = useRef(null);
    const intervalRef = useRef(null);

    const [isActive, setIsActive]         = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loading, setLoading]           = useState(false);
    const [currentEmotion, setCurrentEmotion] = useState(null);
    const [allEmotions, setAllEmotions]   = useState(null);
    const [distressCount, setDistressCount] = useState(0);
    const [sosSent, setSosSent]           = useState(false);
    const [position, setPosition]         = useState(null);
    const [faceDetected, setFaceDetected] = useState(false);

    // Load face-api models from CDN
    useEffect(() => {
        loadModels();
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            });
        }
    }, []);

    const loadModels = async () => {
        setLoading(true);
        try {
            const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
            toast.success("✅ AI models loaded!");
        } catch (e) {
            toast.error("Failed to load AI models. Check internet connection.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 640, height: 480 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsActive(true);
            startDetection();
            toast.success("📷 Camera started! Monitoring emotions...");
        } catch (e) {
            toast.error("Camera access denied. Please allow camera permission.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsActive(false);
        setCurrentEmotion(null);
        setAllEmotions(null);
        setDistressCount(0);
        setSosSent(false);
        setFaceDetected(false);
        toast.success("Camera stopped");
    };

    const startDetection = () => {
        intervalRef.current = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current) return;

            const detections = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceExpressions();

            if (!detections) {
                setFaceDetected(false);
                return;
            }

            setFaceDetected(true);

            // Draw on canvas
            const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
            const resized = faceapi.resizeResults(detections, dims);
            const ctx = canvasRef.current.getContext("2d");
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            faceapi.draw.drawDetections(canvasRef.current, resized);
            faceapi.draw.drawFaceExpressions(canvasRef.current, resized);

            // Get dominant emotion
            const expressions = detections.expressions;
            setAllEmotions(expressions);
            const dominant = Object.entries(expressions).reduce((a, b) => a[1] > b[1] ? a : b);
            const [emotion, confidence] = dominant;
            setCurrentEmotion({ emotion, confidence });

            // Check for distress
            const isDistressed = DISTRESS_EMOTIONS.includes(emotion) && confidence >= DISTRESS_THRESHOLD;

            if (isDistressed) {
                setDistressCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= SOS_TRIGGER_COUNT && !sosSent) {
                        triggerEmergencySOS(emotion, confidence);
                    }
                    return newCount;
                });
            } else {
                setDistressCount(0);
            }

        }, 1500); // detect every 1.5 seconds
    };

    const triggerEmergencySOS = async (emotion, confidence) => {
        setSosSent(true);
        toast.error(`🚨 Distress detected (${emotion})! Sending SOS...`, { duration: 5000 });

        try {
            await fetch(`${API_URL}/api/v1/emergency/emergencypressed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: auth?.user?._id,
                    lat: position?.lat,
                    long: position?.lng,
                    trigger: "emotion_detection",
                    emotion,
                    confidence: confidence.toFixed(2),
                }),
            });
            toast.success("🚨 Emergency contacts notified!");
        } catch (e) {
            toast.error("Failed to send SOS");
        }

        // Reset after 30 seconds
        setTimeout(() => setSosSent(false), 30000);
    };

    const manualSOS = () => triggerEmergencySOS("manual", 1.0);

    const emotionStyle = currentEmotion
        ? EMOTION_COLORS[currentEmotion.emotion] || EMOTION_COLORS.neutral
        : null;

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>

            {/* Header */}
            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ color: "#7B61FF", fontWeight: "bold", fontSize: "26px" }}>
                    😱 Emotion Detection SOS
                </h2>
                <p style={{ color: "#666" }}>
                    AI monitors your facial expressions and auto-triggers SOS if distress is detected
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ textAlign: "center", padding: "30px", background: "#f0ebff", borderRadius: "12px", marginBottom: "20px" }}>
                    <div style={{ fontSize: "30px", marginBottom: "10px" }}>🤖</div>
                    <p style={{ color: "#7B61FF", fontWeight: "bold" }}>Loading AI models... please wait</p>
                    <p style={{ color: "#888", fontSize: "13px" }}>Downloading face detection models (~6MB)</p>
                </div>
            )}

            {/* SOS Alert Banner */}
            {sosSent && (
                <div style={{
                    background: "#ff2d55", color: "white", borderRadius: "12px",
                    padding: "15px 20px", marginBottom: "20px", textAlign: "center",
                    animation: "pulse 1s infinite", fontWeight: "bold", fontSize: "18px"
                }}>
                    🚨 SOS SENT! Emergency contacts notified!
                </div>
            )}

            {/* Current Emotion */}
            {currentEmotion && emotionStyle && (
                <div style={{
                    background: emotionStyle.bg, borderRadius: "16px",
                    padding: "20px", marginBottom: "20px", textAlign: "center",
                    border: `2px solid ${emotionStyle.color}22`
                }}>
                    <div style={{ fontSize: "50px" }}>{emotionStyle.emoji}</div>
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: emotionStyle.color, textTransform: "capitalize" }}>
                        {currentEmotion.emotion}
                    </div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                        Confidence: {(currentEmotion.confidence * 100).toFixed(1)}%
                    </div>
                    {DISTRESS_EMOTIONS.includes(currentEmotion.emotion) && distressCount > 0 && (
                        <div style={{
                            marginTop: "10px", background: "#ff2d5522",
                            borderRadius: "8px", padding: "8px", color: "#ff2d55", fontWeight: "bold"
                        }}>
                            ⚠️ Distress detected {distressCount}/{SOS_TRIGGER_COUNT} times
                        </div>
                    )}
                </div>
            )}

            {/* Camera View */}
            <div style={{ position: "relative", marginBottom: "20px", borderRadius: "16px", overflow: "hidden", background: "#000", minHeight: "300px" }}>
                <video
                    ref={videoRef}
                    style={{ width: "100%", display: isActive ? "block" : "none", transform: "scaleX(-1)" }}
                    muted
                    playsInline
                />
                <canvas
                    ref={canvasRef}
                    style={{
                        position: "absolute", top: 0, left: 0,
                        width: "100%", height: "100%",
                        transform: "scaleX(-1)",
                        display: isActive ? "block" : "none"
                    }}
                />
                {!isActive && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", color: "#888" }}>
                        <div style={{ fontSize: "60px" }}>📷</div>
                        <p>Camera is off</p>
                    </div>
                )}
                {isActive && !faceDetected && (
                    <div style={{
                        position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)",
                        background: "rgba(0,0,0,0.7)", color: "white", padding: "8px 16px",
                        borderRadius: "20px", fontSize: "13px"
                    }}>
                        👤 No face detected — move closer
                    </div>
                )}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                {!isActive ? (
                    <button
                        onClick={startCamera}
                        disabled={!modelsLoaded || loading}
                        style={{
                            flex: 1, padding: "15px", borderRadius: "12px", border: "none",
                            background: modelsLoaded ? "linear-gradient(135deg, #7B61FF, #a855f7)" : "#ccc",
                            color: "white", fontSize: "16px", fontWeight: "bold",
                            cursor: modelsLoaded ? "pointer" : "not-allowed"
                        }}
                    >
                        {loading ? "Loading AI..." : "📷 Start Emotion Monitor"}
                    </button>
                ) : (
                    <>
                        <button onClick={stopCamera} style={{
                            flex: 1, padding: "15px", borderRadius: "12px", border: "none",
                            background: "#dc3545", color: "white", fontSize: "15px",
                            fontWeight: "bold", cursor: "pointer"
                        }}>
                            ⏹ Stop Camera
                        </button>
                        <button onClick={manualSOS} style={{
                            flex: 1, padding: "15px", borderRadius: "12px", border: "none",
                            background: "#ff2d55", color: "white", fontSize: "15px",
                            fontWeight: "bold", cursor: "pointer"
                        }}>
                            🆘 Manual SOS
                        </button>
                    </>
                )}
            </div>

            {/* All Emotions Bar */}
            {allEmotions && (
                <div style={{ background: "#f8f9fa", borderRadius: "12px", padding: "15px", marginBottom: "20px" }}>
                    <p style={{ fontWeight: "bold", marginBottom: "12px", color: "#333" }}>
                        📊 Emotion Breakdown:
                    </p>
                    {Object.entries(allEmotions)
                        .sort((a, b) => b[1] - a[1])
                        .map(([emotion, value]) => (
                            <div key={emotion} style={{ marginBottom: "8px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                    <span style={{ fontSize: "13px", textTransform: "capitalize" }}>
                                        {EMOTION_COLORS[emotion]?.emoji} {emotion}
                                    </span>
                                    <span style={{ fontSize: "13px", color: "#888" }}>
                                        {(value * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div style={{ background: "#e0e0e0", borderRadius: "10px", height: "6px" }}>
                                    <div style={{
                                        width: `${value * 100}%`,
                                        background: DISTRESS_EMOTIONS.includes(emotion) ? "#ff4444" : "#7B61FF",
                                        height: "6px", borderRadius: "10px", transition: "width 0.5s"
                                    }} />
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Info */}
            <div style={{ background: "#fff3cd", borderRadius: "12px", padding: "15px" }}>
                <p style={{ fontWeight: "bold", marginBottom: "8px" }}>⚙️ How it works:</p>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#666", lineHeight: "2" }}>
                    <li>AI detects your face and analyzes 7 emotions in real-time</li>
                    <li>If <b>fear, sadness, anger or disgust</b> is detected {SOS_TRIGGER_COUNT} times consecutively → SOS sent</li>
                    <li>Confidence must be above {DISTRESS_THRESHOLD * 100}% to count as distress</li>
                    <li>All processing happens <b>on your device</b> — no video is sent to servers</li>
                </ul>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            `}</style>
        </div>
    );
};

export default EmotionDetection;
