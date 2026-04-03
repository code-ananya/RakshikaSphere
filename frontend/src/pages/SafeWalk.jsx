import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/auth";
import toast from "react-hot-toast";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const SafeWalk = () => {
    const [auth] = useAuth();
    const [isActive, setIsActive]         = useState(false);
    const [checkInTime, setCheckInTime]   = useState(5);
    const [timeLeft, setTimeLeft]         = useState(0);
    const [position, setPosition]         = useState(null);
    const [checkIns, setCheckIns]         = useState(0);
    const [route, setRoute]               = useState([]);
    const intervalRef  = useRef(null);
    const countdownRef = useRef(null);
    const watchRef     = useRef(null);

    useEffect(() => {
        if (navigator.geolocation) {
            watchRef.current = navigator.geolocation.watchPosition(pos => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setPosition(newPos);
                if (isActive) setRoute(prev => [...prev, newPos]);
            }, null, { enableHighAccuracy: true });
        }
        return () => {
            if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
        };
    }, [isActive]);

    const startSafeWalk = () => {
        if (!position) {
            toast.error("Getting your location... please wait");
            return;
        }
        setIsActive(true);
        setTimeLeft(checkInTime * 60);
        setCheckIns(0);
        setRoute([]);
        startCountdown();
        toast.success(`🚶 Safe Walk started! Check in every ${checkInTime} mins`);
    };

    const startCountdown = () => {
        countdownRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    triggerMissedCheckIn();
                    return checkInTime * 60;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const triggerMissedCheckIn = async () => {
        toast.error("⚠️ Check-in missed! Alerting contacts...", { duration: 5000 });
        try {
            await fetch(`${API_URL}/api/v1/emergency/emergencypressed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: auth?.user?._id,
                    lat: position?.lat,
                    long: position?.lng,
                    trigger: "missed_checkin",
                }),
            });
        } catch (e) {
            console.error(e);
        }
    };

    const checkIn = () => {
        setCheckIns(prev => prev + 1);
        setTimeLeft(checkInTime * 60);
        toast.success("✅ Check-in successful! Timer reset.");
    };

    const stopSafeWalk = () => {
        setIsActive(false);
        setTimeLeft(0);
        if (intervalRef.current)  clearInterval(intervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        toast.success("Safe Walk ended. Stay safe! 💜");
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = (secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const urgencyColor = timeLeft < 60 ? "#ff4444" : timeLeft < 120 ? "#ff8c00" : "#7B61FF";

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ color: "#7B61FF", fontWeight: "bold", fontSize: "26px" }}>
                    🌙 Safe Walk Mode
                </h2>
                <p style={{ color: "#666" }}>
                    Auto-alerts contacts if you don't check in regularly
                </p>
            </div>

            {/* Status */}
            <div style={{
                background: isActive ? `linear-gradient(135deg, ${urgencyColor}, ${urgencyColor}cc)` : "#f8f9fa",
                borderRadius: "16px", padding: "25px", marginBottom: "20px",
                textAlign: "center", color: isActive ? "white" : "#333",
                boxShadow: isActive ? `0 8px 30px ${urgencyColor}44` : "none",
                transition: "all 0.5s"
            }}>
                {isActive ? (
                    <>
                        <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "5px" }}>
                            Next check-in required in
                        </div>
                        <div style={{ fontSize: "56px", fontWeight: "bold", letterSpacing: "2px" }}>
                            {formatTime(timeLeft)}
                        </div>
                        <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "5px" }}>
                            ✅ {checkIns} check-ins completed
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: "40px", marginBottom: "10px" }}>🌙</div>
                        <div style={{ fontSize: "18px", fontWeight: "bold" }}>Safe Walk Inactive</div>
                        <div style={{ fontSize: "13px", color: "#888", marginTop: "5px" }}>
                            Activate before walking alone at night
                        </div>
                    </>
                )}
            </div>

            {/* Controls */}
            {!isActive ? (
                <div>
                    <p style={{ fontWeight: "600", marginBottom: "10px" }}>
                        Check-in interval:
                    </p>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                        {[3, 5, 10, 15].map(mins => (
                            <button key={mins} onClick={() => setCheckInTime(mins)} style={{
                                flex: 1, padding: "10px", borderRadius: "10px", border: "2px solid",
                                borderColor: checkInTime === mins ? "#7B61FF" : "#ddd",
                                background: checkInTime === mins ? "#7B61FF" : "white",
                                color: checkInTime === mins ? "white" : "#333",
                                fontWeight: "bold", cursor: "pointer"
                            }}>
                                {mins}m
                            </button>
                        ))}
                    </div>
                    <button onClick={startSafeWalk} style={{
                        width: "100%", padding: "16px", borderRadius: "12px", border: "none",
                        background: "linear-gradient(135deg, #7B61FF, #a855f7)",
                        color: "white", fontSize: "16px", fontWeight: "bold", cursor: "pointer"
                    }}>
                        🌙 Start Safe Walk
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={checkIn} style={{
                        flex: 2, padding: "16px", borderRadius: "12px", border: "none",
                        background: "#28a745", color: "white", fontSize: "16px",
                        fontWeight: "bold", cursor: "pointer"
                    }}>
                        ✅ I'm Safe — Check In
                    </button>
                    <button onClick={stopSafeWalk} style={{
                        flex: 1, padding: "16px", borderRadius: "12px", border: "none",
                        background: "#dc3545", color: "white", fontSize: "14px",
                        fontWeight: "bold", cursor: "pointer"
                    }}>
                        ⏹ Stop
                    </button>
                </div>
            )}

            {/* How it works */}
            <div style={{
                background: "#f0ebff", borderRadius: "12px", padding: "15px", marginTop: "20px"
            }}>
                <p style={{ fontWeight: "bold", color: "#7B61FF", marginBottom: "10px" }}>
                    ℹ️ How it works:
                </p>
                <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#555", lineHeight: "1.8" }}>
                    <li>Activate Safe Walk before going out alone</li>
                    <li>Press <b>"I'm Safe"</b> every {checkInTime} minutes</li>
                    <li>If you miss a check-in, emergency contacts are alerted automatically</li>
                    <li>Your live location is shared with contacts during the walk</li>
                </ol>
            </div>
        </div>
    );
};

export default SafeWalk;
