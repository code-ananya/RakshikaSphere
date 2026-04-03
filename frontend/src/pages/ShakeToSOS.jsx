import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/auth";
import toast from "react-hot-toast";
import Navbar from "../Components/Navbar/Navbar";
import Footer from "../Components/Footer/Footer";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"
const ShakeToSOS = () => {
  const [auth] = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [sensitivity, setSensitivity] = useState(15);
  const [lastSOS, setLastSOS] = useState(null);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [permissionStatus, setPermissionStatus] = useState("unknown"); // unknown | granted | denied | unsupported
  const [shakeLog, setShakeLog] = useState([]);

  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const lastShakeTime = useRef(0);
  const sosTriggeredAt = useRef(0);
  const SHAKE_THRESHOLD_COUNT = 3; // shakes needed to trigger SOS
  const SOS_COOLDOWN = 30000; // 30 seconds between SOS triggers

  // Get GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const handleMotion = (event) => {
    const { x, y, z } = event.accelerationIncludingGravity || {};
    if (x == null) return;

    const deltaX = Math.abs(x - lastAccel.current.x);
    const deltaY = Math.abs(y - lastAccel.current.y);
    const deltaZ = Math.abs(z - lastAccel.current.z);
    const totalDelta = deltaX + deltaY + deltaZ;

    lastAccel.current = { x, y, z };

    const now = Date.now();

    if (totalDelta > sensitivity && now - lastShakeTime.current > 300) {
      lastShakeTime.current = now;

      setShakeCount((prev) => {
        const newCount = prev + 1;

        // Log the shake
        setShakeLog((log) => [
          { time: new Date().toLocaleTimeString(), force: Math.round(totalDelta) },
          ...log.slice(0, 4),
        ]);

        if (newCount >= SHAKE_THRESHOLD_COUNT) {
          // Trigger SOS if cooldown passed
          if (now - sosTriggeredAt.current > SOS_COOLDOWN) {
            sosTriggeredAt.current = now;
            triggerSOS();
          }
          return 0; // reset count after triggering
        }
        return newCount;
      });
    }
  };

  const requestPermissionAndStart = async () => {
    // iOS 13+ requires explicit permission for DeviceMotion
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission === "granted") {
          setPermissionStatus("granted");
          startListening();
        } else {
          setPermissionStatus("denied");
          toast.error("Motion permission denied. Shake to SOS won't work.");
        }
      } catch {
        setPermissionStatus("denied");
      }
    } else if (window.DeviceMotionEvent) {
      // Android / Desktop — no permission needed
      setPermissionStatus("granted");
      startListening();
    } else {
      setPermissionStatus("unsupported");
      toast.error("Your device doesn't support motion detection.");
    }
  };

  const startListening = () => {
    window.addEventListener("devicemotion", handleMotion);
    setIsActive(true);
    toast.success("🤝 Shake detection is ON! Shake your phone rapidly 3 times to trigger SOS.");
  };

  const stopListening = () => {
    window.removeEventListener("devicemotion", handleMotion);
    setIsActive(false);
    setShakeCount(0);
    toast("Shake detection turned OFF.", { icon: "⏹️" });
  };

  const triggerSOS = async () => {
    setLastSOS(new Date().toLocaleTimeString());
    toast.error("🚨 SHAKE DETECTED — Sending SOS!", { duration: 5000 });

    // Vibrate if supported
    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);

    // Play alert sound
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      oscillator.type = "square";
      oscillator.frequency.value = 880;
      oscillator.connect(ctx.destination);
      oscillator.start();
      setTimeout(() => oscillator.stop(), 800);
    } catch {}

    // Send SOS to backend
    if (auth?.user) {
      try {
        const res = await fetch(`${API_URL}/api/v1/emergency/emergencypressed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: auth.user._id,
            lat: location.lat,
            long: location.lng,
            trigger: "shake",
          }),
        });
        if (res.ok) {
          toast.success("✅ SOS sent to your emergency contacts!", { duration: 6000 });
        }
      } catch {
        toast.error("SOS send failed — check your connection.");
      }
    } else {
      toast("⚠️ Please login for SOS to reach your contacts.", { duration: 5000 });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, []);

  const shakePercent = Math.min((shakeCount / SHAKE_THRESHOLD_COUNT) * 100, 100);

  return (
    <>
      <Navbar />
      <div style={{ minHeight: "80vh", padding: "30px 20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold", color: "#7B61FF" }}>📳 Shake to SOS</h2>
          <p style={{ color: "#666", marginTop: "8px" }}>
            Shake your phone rapidly <strong>3 times</strong> to send an emergency SOS signal automatically.
          </p>
        </div>

        {/* Status Card */}
        <div style={{
          background: isActive ? "#e8f5e9" : "#f5f5f5",
          border: `2px solid ${isActive ? "#4caf50" : "#ddd"}`,
          borderRadius: "16px", padding: "24px", textAlign: "center", marginBottom: "24px",
          transition: "all 0.3s ease",
        }}>
          <div style={{ fontSize: "60px", marginBottom: "10px" }}>
            {isActive ? "📳" : "📵"}
          </div>
          <div style={{
            fontSize: "20px", fontWeight: "bold",
            color: isActive ? "#2e7d32" : "#999",
          }}>
            {isActive ? "🟢 ACTIVE — Listening for shakes" : "⚫ INACTIVE"}
          </div>
          {location.lat && (
            <div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
              📍 GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </div>
          )}
        </div>

        {/* Shake Progress Bar */}
        {isActive && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "14px", color: "#555" }}>Shake intensity</span>
              <span style={{ fontSize: "14px", fontWeight: "bold", color: "#7B61FF" }}>
                {shakeCount} / {SHAKE_THRESHOLD_COUNT} shakes
              </span>
            </div>
            <div style={{ background: "#eee", borderRadius: "8px", height: "14px", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "8px",
                width: `${shakePercent}%`,
                background: shakePercent >= 100 ? "#f44336" : shakePercent > 50 ? "#ff9800" : "#7B61FF",
                transition: "width 0.2s ease, background 0.2s ease",
              }} />
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          {!isActive ? (
            <button
              onClick={requestPermissionAndStart}
              style={{
                flex: 1, padding: "16px", borderRadius: "12px", border: "none",
                background: "#7B61FF", color: "white", fontSize: "16px",
                fontWeight: "bold", cursor: "pointer",
              }}
            >
              ▶ Enable Shake Detection
            </button>
          ) : (
            <button
              onClick={stopListening}
              style={{
                flex: 1, padding: "16px", borderRadius: "12px", border: "none",
                background: "#f44336", color: "white", fontSize: "16px",
                fontWeight: "bold", cursor: "pointer",
              }}
            >
              ⏹ Disable
            </button>
          )}
          <button
            onClick={triggerSOS}
            style={{
              padding: "16px 20px", borderRadius: "12px", border: "2px solid #f44336",
              background: "white", color: "#f44336", fontSize: "14px",
              fontWeight: "bold", cursor: "pointer",
            }}
          >
            🧪 Test SOS
          </button>
        </div>

        {/* Sensitivity Slider */}
        <div style={{ background: "#f9f9f9", borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <label style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>Shake Sensitivity</label>
            <span style={{ fontSize: "13px", color: "#7B61FF" }}>
              {sensitivity <= 10 ? "High" : sensitivity <= 20 ? "Medium" : "Low"}
            </span>
          </div>
          <input
            type="range" min="5" max="30" value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#999", marginTop: "4px" }}>
            <span>Very sensitive</span>
            <span>Less sensitive</span>
          </div>
        </div>

        {/* Last SOS */}
        {lastSOS && (
          <div style={{
            background: "#fff3e0", border: "1px solid #ff9800",
            borderRadius: "12px", padding: "14px", marginBottom: "16px",
          }}>
            <strong>⚠️ Last SOS triggered at:</strong> {lastSOS}
            <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              Next SOS available after {Math.round(SOS_COOLDOWN / 1000)} second cooldown.
            </div>
          </div>
        )}

        {/* Shake Log */}
        {shakeLog.length > 0 && (
          <div style={{ background: "#f9f9f9", borderRadius: "12px", padding: "16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "#555" }}>Recent Shakes</h4>
            {shakeLog.map((log, i) => (
              <div key={i} style={{ fontSize: "13px", color: "#777", marginBottom: "4px" }}>
                🔔 {log.time} — force: {log.force}
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div style={{ marginTop: "24px", background: "#f0f4ff", borderRadius: "12px", padding: "16px" }}>
          <h4 style={{ margin: "0 0 10px", color: "#7B61FF" }}>How it works</h4>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#555", lineHeight: "1.8" }}>
            <li>Enable shake detection and keep this page open</li>
            <li>Shake your phone <strong>rapidly 3 times</strong> when in danger</li>
            <li>SOS is automatically sent to your emergency contacts</li>
            <li>Works even when phone is in your pocket or bag</li>
            <li>30-second cooldown prevents accidental triggers</li>
          </ul>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ShakeToSOS;
