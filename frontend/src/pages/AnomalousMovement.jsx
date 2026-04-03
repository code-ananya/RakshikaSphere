import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/auth";
import toast from "react-hot-toast";
import Navbar from "../Components/Navbar/Navbar";
import Footer from "../Components/Footer/Footer";
import axios from "axios";


const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// --- Movement analysis logic ---
function analyzeMovement(locationHistory) {
  if (locationHistory.length < 3) return { anomaly: false, type: null, confidence: 0 };

  const recent = locationHistory.slice(-10);

  // 1. STOPPED IN DANGER ZONE — user hasn't moved > 20m in 5+ minutes
  const first = recent[0];
  const last = recent[recent.length - 1];
  const totalDistanceMoved = haversineMeters(first.lat, first.lng, last.lat, last.lng);
  const timeElapsedMin = (last.timestamp - first.timestamp) / 60000;

  if (totalDistanceMoved < 30 && timeElapsedMin > 5) {
    return { anomaly: true, type: "STOPPED", confidence: 85, desc: "User has not moved significantly for over 5 minutes." };
  }

  // 2. CIRCULAR MOVEMENT — start and end are close but path is long
  const pathLength = recent.reduce((acc, pt, i) => {
    if (i === 0) return acc;
    return acc + haversineMeters(recent[i - 1].lat, recent[i - 1].lng, pt.lat, pt.lng);
  }, 0);

  const straightLineDist = haversineMeters(first.lat, first.lng, last.lat, last.lng);
  const ratio = pathLength > 0 ? straightLineDist / pathLength : 1;

  if (pathLength > 200 && ratio < 0.25) {
    return { anomaly: true, type: "CIRCULAR", confidence: 78, desc: "User appears to be moving in circles — possible confusion or being followed." };
  }

  // 3. VERY SLOW MOVEMENT — moving < 0.5 km/h (crawling pace)
  if (timeElapsedMin > 3 && totalDistanceMoved > 10) {
    const speedKmh = (totalDistanceMoved / 1000) / (timeElapsedMin / 60);
    if (speedKmh < 0.5 && speedKmh > 0.05) {
      return { anomaly: true, type: "VERY_SLOW", confidence: 65, desc: "User is moving extremely slowly — may be in distress or injured." };
    }
  }

  // 4. SUDDEN STOP after rapid movement
  if (recent.length >= 6) {
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstSpeed = calcSpeed(firstHalf);
    const secondSpeed = calcSpeed(secondHalf);

    if (firstSpeed > 5 && secondSpeed < 0.3) {
      return { anomaly: true, type: "SUDDEN_STOP", confidence: 72, desc: "User was moving quickly and then suddenly stopped." };
    }
  }

  return { anomaly: false, type: null, confidence: 0, desc: "Movement appears normal." };
}

function calcSpeed(points) {
  if (points.length < 2) return 0;
  const dist = haversineMeters(
    points[0].lat, points[0].lng,
    points[points.length - 1].lat, points[points.length - 1].lng
  );
  const timeMin = (points[points.length - 1].timestamp - points[0].timestamp) / 60000;
  if (timeMin <= 0) return 0;
  return (dist / 1000) / (timeMin / 60); // km/h
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ANOMALY_LABELS = {
  STOPPED: { label: "Stopped in Place", icon: "🛑", color: "#f44336" },
  CIRCULAR: { label: "Circular Movement", icon: "🔄", color: "#ff9800" },
  VERY_SLOW: { label: "Very Slow Movement", icon: "🐌", color: "#ff9800" },
  SUDDEN_STOP: { label: "Sudden Stop", icon: "⚡", color: "#f44336" },
};

const AnomalousMovement = () => {
  const [auth] = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [locationHistory, setLocationHistory] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [anomalyLog, setAnomalyLog] = useState([]);
  const [checkInInterval, setCheckInInterval] = useState(5); // minutes
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [secondsToNextCheck, setSecondsToNextCheck] = useState(0);

  const watchIdRef = useRef(null);
  const analysisTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const sosAlertedRef = useRef(false);

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    sosAlertedRef.current = false;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: Date.now(),
        };
        setLocationHistory((prev) => {
          const updated = [...prev, newPoint].slice(-20); // keep last 20 points
          const analysis = analyzeMovement(updated);
          setCurrentAnalysis(analysis);

          if (analysis.anomaly && !sosAlertedRef.current) {
            sosAlertedRef.current = true;
            handleAnomalyDetected(analysis, newPoint);
          } else if (!analysis.anomaly) {
            sosAlertedRef.current = false;
          }

          return updated;
        });
      },
      (err) => toast.error("Location error: " + err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    setIsTracking(true);
    toast.success("🗺️ Movement monitoring started!");

    // Countdown timer
    let secs = checkInInterval * 60;
    setSecondsToNextCheck(secs);
    countdownRef.current = setInterval(() => {
      secs -= 1;
      setSecondsToNextCheck(secs);
      if (secs <= 0) {
        secs = checkInInterval * 60;
        setSecondsToNextCheck(secs);
        promptCheckIn();
      }
    }, 1000);
  };

  const stopTracking = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsTracking(false);
    setLocationHistory([]);
    setCurrentAnalysis(null);
    setSecondsToNextCheck(0);
    toast("Movement monitoring stopped.", { icon: "⏹️" });
  };

  const promptCheckIn = () => {
    toast((t) => (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>🔔 Are you safe?</div>
        <div style={{ fontSize: "12px", marginBottom: "10px" }}>Check-in required — click below within 60 seconds</div>
        <button
          onClick={() => {
            setLastCheckIn(new Date().toLocaleTimeString());
            toast.dismiss(t.id);
            toast.success("✅ Check-in recorded. Stay safe!");
          }}
          style={{ padding: "8px 16px", background: "#4caf50", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          ✅ I'm Safe
        </button>
      </div>
    ), { duration: 60000 });
  };

  const handleAnomalyDetected = async (analysis, location) => {
    const entry = {
      id: Date.now(),
      type: analysis.type,
      desc: analysis.desc,
      confidence: analysis.confidence,
      time: new Date().toLocaleTimeString(),
      lat: location.lat,
      lng: location.lng,
    };
    setAnomalyLog((prev) => [entry, ...prev.slice(0, 9)]);

    toast.error(`🚨 Anomaly detected: ${ANOMALY_LABELS[analysis.type]?.label || analysis.type}`, { duration: 8000 });

    // Auto report to backend if Critical anomaly
    if ((analysis.type === "STOPPED" || analysis.type === "SUDDEN_STOP") && auth?.user) {
      try {
        await axios.post(
          `${API_URL}/api/v1/incidents`,
          {
            report: `⚠️ AUTO: Anomalous movement detected — ${analysis.desc}`,
            pincodeOfIncident: "000000",
            address: `GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
            lat: location.lat,
            lng: location.lng,
          },
          { headers: { Authorization: `Bearer ${auth?.token}` } }
        );
        toast("📋 Auto-reported to admin.", { icon: "📋" });
      } catch {}
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const lastLocation = locationHistory[locationHistory.length - 1];

  return (
    <>
      <Navbar />
      <div style={{ minHeight: "80vh", padding: "24px 20px", maxWidth: "700px", margin: "0 auto", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#7B61FF" }}>🗺️ Anomalous Movement Detection</h2>
          <p style={{ color: "#666" }}>AI monitors your movement patterns and alerts contacts if something seems wrong.</p>
        </div>

        {/* Status */}
        <div style={{
          background: isTracking ? "#e8f5e9" : "#f5f5f5",
          border: `2px solid ${isTracking ? "#4caf50" : "#ddd"}`,
          borderRadius: "16px", padding: "20px", marginBottom: "20px", textAlign: "center",
        }}>
          <div style={{ fontSize: "48px" }}>{isTracking ? "🗺️" : "📵"}</div>
          <div style={{ fontWeight: "bold", fontSize: "18px", color: isTracking ? "#2e7d32" : "#999" }}>
            {isTracking ? "🟢 MONITORING ACTIVE" : "⚫ Not Monitoring"}
          </div>
          {isTracking && lastLocation && (
            <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
              📍 {lastLocation.lat.toFixed(5)}, {lastLocation.lng.toFixed(5)} · {locationHistory.length} points recorded
            </div>
          )}
          {isTracking && secondsToNextCheck > 0 && (
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#555" }}>
              Next check-in in: <strong style={{ color: "#7B61FF" }}>{formatCountdown(secondsToNextCheck)}</strong>
            </div>
          )}
        </div>

        {/* Current Analysis */}
        {currentAnalysis && (
          <div style={{
            background: currentAnalysis.anomaly ? "#fff3f3" : "#f0fff4",
            border: `2px solid ${currentAnalysis.anomaly ? "#f44336" : "#4caf50"}`,
            borderRadius: "14px", padding: "16px", marginBottom: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>
                {currentAnalysis.anomaly ? ANOMALY_LABELS[currentAnalysis.type]?.icon || "⚠️" : "✅"}
              </span>
              <div>
                <div style={{ fontWeight: "bold", color: currentAnalysis.anomaly ? "#f44336" : "#2e7d32" }}>
                  {currentAnalysis.anomaly
                    ? `${ANOMALY_LABELS[currentAnalysis.type]?.label || currentAnalysis.type} (${currentAnalysis.confidence}% confidence)`
                    : "Movement Normal"}
                </div>
                <div style={{ fontSize: "13px", color: "#555" }}>
                  {currentAnalysis.desc || "Everything looks fine."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          {!isTracking ? (
            <button
              onClick={startTracking}
              style={{
                flex: 1, padding: "16px", borderRadius: "12px", border: "none",
                background: "#7B61FF", color: "white", fontSize: "16px",
                fontWeight: "bold", cursor: "pointer",
              }}
            >
              ▶ Start Monitoring
            </button>
          ) : (
            <button
              onClick={stopTracking}
              style={{
                flex: 1, padding: "16px", borderRadius: "12px", border: "none",
                background: "#f44336", color: "white", fontSize: "16px",
                fontWeight: "bold", cursor: "pointer",
              }}
            >
              ⏹ Stop Monitoring
            </button>
          )}
          <button
            onClick={promptCheckIn}
            style={{
              padding: "16px 18px", borderRadius: "12px", border: "2px solid #4caf50",
              background: "white", color: "#4caf50", fontWeight: "bold", cursor: "pointer",
            }}
          >
            ✅ Check In
          </button>
        </div>

        {/* Settings */}
        <div style={{ background: "#f9f9f9", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
          <label style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>
            Check-in interval: <span style={{ color: "#7B61FF" }}>{checkInInterval} minutes</span>
          </label>
          <input
            type="range" min="2" max="30" value={checkInInterval}
            onChange={(e) => setCheckInInterval(Number(e.target.value))}
            style={{ width: "100%", marginTop: "8px" }}
            disabled={isTracking}
          />
          <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>
            You will be prompted to confirm you're safe every {checkInInterval} minutes.
            {isTracking && " (Disable monitoring to change)"}
          </p>
        </div>

        {/* Last Check-In */}
        {lastCheckIn && (
          <div style={{
            background: "#e8f5e9", border: "1px solid #4caf50",
            borderRadius: "10px", padding: "12px", marginBottom: "16px",
            fontSize: "13px", color: "#2e7d32",
          }}>
            ✅ Last check-in: {lastCheckIn}
          </div>
        )}

        {/* Anomaly Log */}
        <div>
          <h4 style={{ color: "#555", marginBottom: "12px" }}>📋 Anomaly Log</h4>
          {anomalyLog.length === 0 ? (
            <div style={{
              background: "#f9f9f9", borderRadius: "12px", padding: "20px",
              textAlign: "center", color: "#aaa", fontSize: "13px",
            }}>
              No anomalies detected yet. Start monitoring to begin tracking.
            </div>
          ) : (
            anomalyLog.map((entry) => (
              <div key={entry.id} style={{
                background: "#fff", border: `1px solid ${ANOMALY_LABELS[entry.type]?.color || "#ddd"}`,
                borderRadius: "10px", padding: "12px", marginBottom: "8px",
                borderLeft: `4px solid ${ANOMALY_LABELS[entry.type]?.color || "#ddd"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "bold", fontSize: "13px", color: ANOMALY_LABELS[entry.type]?.color }}>
                    {ANOMALY_LABELS[entry.type]?.icon} {ANOMALY_LABELS[entry.type]?.label || entry.type}
                  </span>
                  <span style={{ fontSize: "11px", color: "#aaa" }}>{entry.time}</span>
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{entry.desc}</div>
                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>
                  📍 {entry.lat?.toFixed(4)}, {entry.lng?.toFixed(4)} · Confidence: {entry.confidence}%
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AnomalousMovement;
