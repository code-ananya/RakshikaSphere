import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/auth";

// Fix leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const DURATIONS = [
    { label: "15 mins", value: 15 },
    { label: "30 mins", value: 30 },
    { label: "1 hour",  value: 60 },
    { label: "2 hours", value: 120 },
];

const LiveLocation = () => {
    const [auth] = useAuth();
    const [position, setPosition]       = useState(null);
    const [isSharing, setIsSharing]     = useState(false);
    const [duration, setDuration]       = useState(30);
    const [timeLeft, setTimeLeft]       = useState(0);
    const [shareLink, setShareLink]     = useState("");
    const [accuracy, setAccuracy]       = useState(null);
    const intervalRef  = useRef(null);
    const countdownRef = useRef(null);
    const watchRef     = useRef(null);

    // Watch GPS position
    useEffect(() => {
        if (navigator.geolocation) {
            watchRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    setPosition([pos.coords.latitude, pos.coords.longitude]);
                    setAccuracy(Math.round(pos.coords.accuracy));
                },
                (err) => toast.error("Location access denied"),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
        return () => {
            if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
        };
    }, []);

    // Send location to backend every 30s
    const startSending = () => {
        intervalRef.current = setInterval(async () => {
            if (!position) return;
            try {
                await axios.post(`${API_URL}/api/v1/emergency/live-location`, {
                    userId: auth?.user?._id,
                    lat: position[0],
                    long: position[1],
                    timestamp: new Date().toISOString(),
                });
            } catch (e) {
                console.error("Location update failed:", e);
            }
        }, 30000);
    };

    const startSharing = () => {
        if (!position) {
            toast.error("Getting your location... please wait");
            return;
        }
        setIsSharing(true);
        setTimeLeft(duration * 60);
        const link = `${window.location.origin}/track/${auth?.user?._id}`;
        setShareLink(link);
        startSending();

        // Countdown timer
        countdownRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopSharing();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        toast.success(`📍 Location sharing started for ${duration} mins!`);
    };

    const stopSharing = () => {
        setIsSharing(false);
        setShareLink("");
        setTimeLeft(0);
        if (intervalRef.current)  clearInterval(intervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        toast.success("Location sharing stopped");
    };

    const copyLink = () => {
        navigator.clipboard.writeText(shareLink);
        toast.success("Link copied!");
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = (secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            {/* Header */}
            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ color: "#7B61FF", fontWeight: "bold", fontSize: "26px" }}>
                    📍 Live Location Sharing
                </h2>
                <p style={{ color: "#666" }}>
                    Share your real-time location with trusted contacts
                </p>
            </div>

            {/* Status Card */}
            <div style={{
                background: isSharing ? "linear-gradient(135deg, #7B61FF, #a855f7)" : "#f8f9fa",
                borderRadius: "16px", padding: "20px", marginBottom: "20px",
                color: isSharing ? "white" : "#333",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                            {isSharing ? "🟢 Sharing Active" : "⚫ Not Sharing"}
                        </div>
                        <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "4px" }}>
                            {position
                                ? `📍 ${position[0].toFixed(5)}, ${position[1].toFixed(5)} (±${accuracy}m)`
                                : "Getting location..."}
                        </div>
                    </div>
                    {isSharing && (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "28px", fontWeight: "bold" }}>
                                {formatTime(timeLeft)}
                            </div>
                            <div style={{ fontSize: "11px", opacity: 0.8 }}>remaining</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            {!isSharing ? (
                <div style={{ marginBottom: "20px" }}>
                    <p style={{ fontWeight: "600", marginBottom: "10px" }}>Share for how long?</p>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
                        {DURATIONS.map(d => (
                            <button key={d.value} onClick={() => setDuration(d.value)} style={{
                                padding: "10px 20px", borderRadius: "20px", border: "2px solid",
                                borderColor: duration === d.value ? "#7B61FF" : "#ddd",
                                background: duration === d.value ? "#7B61FF" : "white",
                                color: duration === d.value ? "white" : "#333",
                                fontWeight: "bold", cursor: "pointer"
                            }}>
                                {d.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={startSharing} style={{
                        width: "100%", padding: "15px", borderRadius: "12px", border: "none",
                        background: "linear-gradient(135deg, #7B61FF, #a855f7)",
                        color: "white", fontSize: "16px", fontWeight: "bold", cursor: "pointer"
                    }}>
                        📍 Start Sharing Location
                    </button>
                </div>
            ) : (
                <div style={{ marginBottom: "20px" }}>
                    {/* Share Link */}
                    <div style={{
                        background: "#f0ebff", borderRadius: "12px", padding: "15px",
                        marginBottom: "15px", border: "1px solid #7B61FF"
                    }}>
                        <p style={{ fontWeight: "bold", color: "#7B61FF", marginBottom: "8px" }}>
                            🔗 Share this link with your contacts:
                        </p>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <input value={shareLink} readOnly style={{
                                flex: 1, padding: "8px 12px", borderRadius: "8px",
                                border: "1px solid #ddd", fontSize: "13px"
                            }} />
                            <button onClick={copyLink} style={{
                                padding: "8px 16px", borderRadius: "8px", border: "none",
                                background: "#7B61FF", color: "white", fontWeight: "bold", cursor: "pointer"
                            }}>Copy</button>
                        </div>
                    </div>

                    {/* WhatsApp Share */}
                    <a href={`https://wa.me/?text=I'm sharing my live location with you: ${shareLink}`}
                        target="_blank" rel="noreferrer"
                        style={{
                            display: "block", textAlign: "center", padding: "12px",
                            borderRadius: "12px", background: "#25D366", color: "white",
                            fontWeight: "bold", textDecoration: "none", marginBottom: "10px"
                        }}>
                        📱 Share via WhatsApp
                    </a>

                    <button onClick={stopSharing} style={{
                        width: "100%", padding: "12px", borderRadius: "12px", border: "none",
                        background: "#ff4444", color: "white", fontSize: "15px",
                        fontWeight: "bold", cursor: "pointer"
                    }}>
                        ⏹ Stop Sharing
                    </button>
                </div>
            )}

            {/* Map */}
            {position && (
                <div style={{ borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                    <MapContainer center={position} zoom={16} style={{ height: "350px", width: "100%" }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={position}>
                            <Popup>📍 Your current location</Popup>
                        </Marker>
                        {isSharing && (
                            <Circle center={position} radius={accuracy || 50}
                                pathOptions={{ color: "#7B61FF", fillColor: "#7B61FF", fillOpacity: 0.15 }} />
                        )}
                    </MapContainer>
                </div>
            )}
        </div>
    );
};

export default LiveLocation;
