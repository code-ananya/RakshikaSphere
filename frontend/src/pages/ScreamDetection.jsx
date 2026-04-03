import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/auth";
import toast from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SCREAM_THRESHOLD    = 85;   // dB level considered a scream
const SUSTAINED_MS        = 1500; // must be loud for 1.5 seconds
const SOS_COOLDOWN_MS     = 30000;

const ScreamDetection = () => {
    const [auth] = useAuth();
    const audioContextRef  = useRef(null);
    const analyserRef      = useRef(null);
    const micStreamRef     = useRef(null);
    const animFrameRef     = useRef(null);
    const screamStartRef   = useRef(null);
    const lastSosRef       = useRef(0);
    const canvasRef        = useRef(null);

    const [isListening, setIsListening]     = useState(false);
    const [volumeLevel, setVolumeLevel]     = useState(0);
    const [isScreaming, setIsScreaming]     = useState(false);
    const [sosSent, setSosSent]             = useState(false);
    const [sosCount, setSosCount]           = useState(0);
    const [position, setPosition]           = useState(null);
    const [sensitivity, setSensitivity]     = useState(SCREAM_THRESHOLD);
    const [history, setHistory]             = useState([]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos =>
                setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            );
        }
        return () => stopListening();
    }, []);

    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            micStreamRef.current = stream;

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioCtx;

            const source   = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.3;
            source.connect(analyser);
            analyserRef.current = analyser;

            setIsListening(true);
            toast.success("🎤 Scream detection active!");
            detectLoop();
        } catch (e) {
            toast.error("Microphone access denied. Please allow mic permission.");
        }
    };

    const stopListening = () => {
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        screamStartRef.current = null;
        setIsListening(false);
        setVolumeLevel(0);
        setIsScreaming(false);
        toast.success("Scream detection stopped");
    };

    const getVolumeDB = (analyser) => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        // Convert to approximate dB (0-100 scale)
        return Math.round(avg / 255 * 100);
    };

    const drawWaveform = (analyser) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.fillStyle = "#0f0f1a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = isScreaming ? "#ff2d55" : "#7B61FF";
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    };

    const detectLoop = () => {
        if (!analyserRef.current) return;

        const volume = getVolumeDB(analyserRef.current);
        setVolumeLevel(volume);
        drawWaveform(analyserRef.current);

        const now = Date.now();
        const isLoud = volume >= sensitivity;

        if (isLoud) {
            setIsScreaming(true);
            if (!screamStartRef.current) {
                screamStartRef.current = now;
            } else if (now - screamStartRef.current >= SUSTAINED_MS) {
                // Sustained loud sound — trigger SOS!
                if (now - lastSosRef.current > SOS_COOLDOWN_MS) {
                    lastSosRef.current = now;
                    screamStartRef.current = null;
                    triggerSOS(volume);
                }
            }
        } else {
            setIsScreaming(false);
            screamStartRef.current = null;
        }

        animFrameRef.current = requestAnimationFrame(detectLoop);
    };

    const triggerSOS = async (volume) => {
        setSosSent(true);
        setSosCount(prev => prev + 1);
        const timestamp = new Date().toLocaleTimeString();
        setHistory(prev => [{
            time: timestamp, volume, type: "🚨 Scream Detected"
        }, ...prev.slice(0, 4)]);

        toast.error(`🚨 Scream detected (${volume}dB)! Sending SOS...`, { duration: 5000 });

        try {
            await fetch(`${API_URL}/api/v1/emergency/emergencypressed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: auth?.user?._id,
                    lat: position?.lat,
                    long: position?.lng,
                    trigger: "scream_detection",
                    volume,
                }),
            });
            toast.success("🚨 Emergency contacts notified!");
        } catch (e) {
            toast.error("Failed to send SOS");
        }

        setTimeout(() => setSosSent(false), 10000);
    };

    const getVolumeColor = () => {
        if (volumeLevel >= sensitivity) return "#ff2d55";
        if (volumeLevel >= sensitivity * 0.8) return "#ff8c00";
        if (volumeLevel >= sensitivity * 0.6) return "#ffd700";
        return "#7B61FF";
    };

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "700px", margin: "0 auto" }}>

            {/* Header */}
            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ color: "#7B61FF", fontWeight: "bold", fontSize: "26px" }}>
                    🗣️ Scream Detection SOS
                </h2>
                <p style={{ color: "#666" }}>
                    Automatically sends SOS when a scream or loud distress sound is detected
                </p>
            </div>

            {/* SOS Alert */}
            {sosSent && (
                <div style={{
                    background: "#ff2d55", color: "white", borderRadius: "12px",
                    padding: "15px 20px", marginBottom: "20px", textAlign: "center",
                    fontWeight: "bold", fontSize: "18px", animation: "pulse 1s infinite"
                }}>
                    🚨 SOS SENT! Emergency contacts notified! (#{sosCount})
                </div>
            )}

            {/* Volume Meter */}
            <div style={{
                background: isScreaming ? "#ff2d5511" : "#f8f9fa",
                borderRadius: "16px", padding: "20px", marginBottom: "20px",
                border: isScreaming ? "2px solid #ff2d55" : "2px solid transparent",
                transition: "all 0.3s"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontWeight: "bold", color: "#333" }}>Volume Level</span>
                    <span style={{ fontWeight: "bold", color: getVolumeColor(), fontSize: "18px" }}>
                        {volumeLevel} dB {isScreaming ? "🚨 SCREAM!" : ""}
                    </span>
                </div>
                <div style={{ background: "#e0e0e0", borderRadius: "10px", height: "20px", overflow: "hidden" }}>
                    <div style={{
                        width: `${volumeLevel}%`, height: "20px",
                        background: `linear-gradient(90deg, #7B61FF, ${getVolumeColor()})`,
                        borderRadius: "10px", transition: "width 0.1s",
                        boxShadow: isScreaming ? `0 0 20px ${getVolumeColor()}` : "none"
                    }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px", fontSize: "11px", color: "#888" }}>
                    <span>Silent</span>
                    <span style={{ color: "#ff8c00" }}>⚠️ Warning ({Math.round(sensitivity * 0.8)})</span>
                    <span style={{ color: "#ff2d55" }}>🚨 Trigger ({sensitivity})</span>
                </div>
            </div>

            {/* Waveform Canvas */}
            <div style={{ borderRadius: "16px", overflow: "hidden", marginBottom: "20px", background: "#0f0f1a" }}>
                <canvas
                    ref={canvasRef}
                    width={640} height={120}
                    style={{ width: "100%", height: "120px", display: "block" }}
                />
                {!isListening && (
                    <div style={{ textAlign: "center", padding: "20px", color: "#888", position: "absolute", width: "100%", marginTop: "-80px" }}>
                        🎤 Start listening to see waveform
                    </div>
                )}
            </div>

            {/* Sensitivity Control */}
            <div style={{ background: "#f0ebff", borderRadius: "12px", padding: "15px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontWeight: "bold", color: "#7B61FF" }}>🎚️ Sensitivity</span>
                    <span style={{ fontWeight: "bold" }}>Trigger at {sensitivity} dB</span>
                </div>
                <input
                    type="range" min="50" max="95" value={sensitivity}
                    onChange={e => setSensitivity(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#7B61FF" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginTop: "4px" }}>
                    <span>Very Sensitive</span>
                    <span>Less Sensitive</span>
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                {!isListening ? (
                    <button onClick={startListening} style={{
                        flex: 1, padding: "15px", borderRadius: "12px", border: "none",
                        background: "linear-gradient(135deg, #7B61FF, #a855f7)",
                        color: "white", fontSize: "16px", fontWeight: "bold", cursor: "pointer"
                    }}>
                        🎤 Start Listening
                    </button>
                ) : (
                    <>
                        <button onClick={stopListening} style={{
                            flex: 1, padding: "15px", borderRadius: "12px", border: "none",
                            background: "#dc3545", color: "white", fontSize: "15px",
                            fontWeight: "bold", cursor: "pointer"
                        }}>
                            ⏹ Stop
                        </button>
                        <button onClick={() => triggerSOS(volumeLevel)} style={{
                            flex: 1, padding: "15px", borderRadius: "12px", border: "none",
                            background: "#ff2d55", color: "white", fontSize: "15px",
                            fontWeight: "bold", cursor: "pointer"
                        }}>
                            🆘 Manual SOS
                        </button>
                    </>
                )}
            </div>

            {/* History */}
            {history.length > 0 && (
                <div style={{ background: "#f8f9fa", borderRadius: "12px", padding: "15px", marginBottom: "20px" }}>
                    <p style={{ fontWeight: "bold", marginBottom: "10px" }}>📋 Detection History:</p>
                    {history.map((h, i) => (
                        <div key={i} style={{
                            display: "flex", justifyContent: "space-between",
                            padding: "8px 0", borderBottom: i < history.length - 1 ? "1px solid #eee" : "none",
                            fontSize: "13px"
                        }}>
                            <span>{h.type}</span>
                            <span style={{ color: "#888" }}>{h.time} — {h.volume} dB</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Info */}
            <div style={{ background: "#fff3cd", borderRadius: "12px", padding: "15px" }}>
                <p style={{ fontWeight: "bold", marginBottom: "8px" }}>⚙️ How it works:</p>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#666", lineHeight: "2" }}>
                    <li>Microphone monitors ambient sound level continuously</li>
                    <li>If sound exceeds <b>{sensitivity} dB</b> for <b>1.5 seconds</b> → SOS triggered</li>
                    <li>30 second cooldown between SOS alerts to prevent spam</li>
                    <li>Adjust sensitivity slider based on your environment</li>
                    <li><b>Keep this page open</b> while walking alone at night</li>
                </ul>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
};

export default ScreamDetection;
