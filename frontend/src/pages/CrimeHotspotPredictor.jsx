import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "True";
const ML_URL = process.env.REACT_APP_ML_URL || "http://localhost:5001";

const RISK_COLORS = {
  low:      { color: "#22c55e", bg: "#f0fff4", bar: "#22c55e", icon: "🟢", label: "Low" },
  medium:   { color: "#f59e0b", bg: "#fffbeb", bar: "#f59e0b", icon: "🟡", label: "Medium" },
  high:     { color: "#ef4444", bg: "#fff0f0", bar: "#ef4444", icon: "🔴", label: "High" },
  critical: { color: "#7f1d1d", bg: "#fecaca", bar: "#7f1d1d", icon: "🚨", label: "Critical" },
};

const CrimeHotspotPredictor = () => {
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [forecast, setForecast] = useState(null);
  const [currentRisk, setCurrentRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [incidents, setIncidents] = useState([]);

  // Fetch user location + incidents on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setError("Could not get location")
      );
    }

    // Load incidents from backend
    axios.get(`${API_URL}/api/v1/incidents`)
      .then((res) => {
        const formatted = (res.data?.incidents || [])
          .filter((inc) => inc.lat && inc.lng)
          .map((inc) => ({
            lat: inc.lat,
            lng: inc.lng,
            hour: new Date(inc.createdAt).getHours(),
            weekday: new Date(inc.createdAt).getDay(),
            severity: inc.severity || "medium",
          }));
        setIncidents(formatted);
      })
      .catch(() => {}); // silently fail — will use time-based prediction
  }, []);

  const runPrediction = async () => {
    if (!location.lat) { setError("Location not available"); return; }
    setLoading(true);
    setError(null);

    try {
      // Get current risk
      const currentRes = await axios.post(`${ML_URL}/hotspot/predict`, {
        lat: location.lat,
        lng: location.lng,
        incidents,
      });

      // Get 24-hour forecast
      const forecastRes = await axios.post(`${ML_URL}/hotspot/forecast`, {
        lat: location.lat,
        lng: location.lng,
        incidents,
      });

      setCurrentRisk(currentRes.data);
      setForecast(forecastRes.data);
    } catch (err) {
      setError("ML service unavailable — is it running on port 5001?");
    } finally {
      setLoading(false);
    }
  };

  const checkSpecificHour = async (hour) => {
    if (!location.lat) return;
    setSelectedHour(hour);
    try {
      const res = await axios.post(`${ML_URL}/hotspot/predict`, {
        lat: location.lat,
        lng: location.lng,
        incidents,
        target_hour: hour,
      });
      setCurrentRisk(res.data);
    } catch (err) {}
  };

  const riskCfg = currentRisk ? RISK_COLORS[currentRisk.risk_level] : null;

  return (
    <div style={{ fontFamily: "sans-serif", padding: "24px", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ color: "#7B61FF", fontWeight: "bold", fontSize: "24px", marginBottom: "4px" }}>
        ⏰ Crime Hotspot Time Predictor
      </h2>
      <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
        AI predicts how dangerous your current area is at different times of day, based on incident history.
      </p>

      {/* Location status */}
      <div style={{
        background: location.lat ? "#e8f5e9" : "#fff3e0",
        padding: "10px 14px",
        borderRadius: "10px",
        fontSize: "13px",
        color: location.lat ? "#2e7d32" : "#e65100",
        marginBottom: "16px",
      }}>
        📍 {location.lat
          ? `Your location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} | ${incidents.length} historical incidents loaded`
          : "Getting your location..."}
      </div>

      {/* Predict button */}
      <button
        onClick={runPrediction}
        disabled={loading || !location.lat}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "12px",
          border: "none",
          background: loading ? "#ccc" : "#7B61FF",
          color: "white",
          fontWeight: "bold",
          fontSize: "15px",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "20px",
          boxShadow: "0 4px 16px rgba(123,97,255,0.3)",
        }}
      >
        {loading ? "🔄 Analyzing..." : "🔍 Predict Risk for My Area"}
      </button>

      {error && (
        <div style={{ background: "#fff0f0", border: "1px solid #ef4444", padding: "12px", borderRadius: "10px", marginBottom: "16px", fontSize: "13px", color: "#cc0000" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Current risk card */}
      {currentRisk && riskCfg && (
        <div style={{
          background: riskCfg.bg,
          border: `2px solid ${riskCfg.color}`,
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "20px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "48px" }}>{riskCfg.icon}</div>
          <div style={{ fontWeight: "bold", fontSize: "22px", color: riskCfg.color }}>
            {riskCfg.label} Risk
          </div>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: riskCfg.color, margin: "4px 0" }}>
            {Math.round(currentRisk.risk_score * 100)}%
          </div>
          <div style={{ fontSize: "13px", color: "#555", marginTop: "8px" }}>
            {currentRisk.reason}
          </div>
          {selectedHour !== null && (
            <div style={{ marginTop: "8px", fontSize: "13px", color: "#777" }}>
              Showing prediction for {String(selectedHour).padStart(2, "0")}:00
            </div>
          )}
          {currentRisk.peak_hours?.length > 0 && (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#555" }}>
              🕐 Peak danger hours: {currentRisk.peak_hours.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ")}
            </div>
          )}
        </div>
      )}

      {/* 24-hour forecast chart */}
      {forecast && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "#333" }}>
              📊 24-Hour Risk Forecast
            </h3>
            <div style={{ fontSize: "12px", color: "#777" }}>
              🟢 Safest: {forecast.safest_hour} &nbsp;|&nbsp; 🚨 Riskiest: {forecast.peak_risk_hour}
            </div>
          </div>

          {/* Bar chart */}
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "3px",
            height: "100px",
            background: "#f9f9f9",
            borderRadius: "12px",
            padding: "12px 10px 0",
            marginBottom: "8px",
            overflowX: "auto",
          }}>
            {forecast.forecast.map((f, i) => {
              const fcfg = RISK_COLORS[f.risk_level];
              return (
                <div
                  key={i}
                  onClick={() => checkSpecificHour(f.hour)}
                  title={`${f.hour_label} — ${fcfg.label} (${Math.round(f.risk_score * 100)}%)`}
                  style={{
                    flex: "1 0 auto",
                    minWidth: "18px",
                    height: `${Math.max(f.risk_score * 80, 6)}px`,
                    background: f.is_current ? "#7B61FF" : fcfg.bar,
                    borderRadius: "4px 4px 0 0",
                    cursor: "pointer",
                    opacity: selectedHour === f.hour ? 1 : 0.75,
                    border: selectedHour === f.hour ? "2px solid #333" : "none",
                    transition: "opacity 0.2s, height 0.3s",
                  }}
                />
              );
            })}
          </div>

          {/* Hour labels (every 4 hours) */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px" }}>
            {[0, 4, 8, 12, 16, 20].map((h) => (
              <span key={h} style={{ fontSize: "11px", color: "#888" }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          <p style={{ fontSize: "12px", color: "#888", textAlign: "center", marginTop: "8px" }}>
            Click any bar to see risk prediction for that hour
          </p>

          {/* Legend */}
          <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
            {Object.entries(RISK_COLORS).map(([key, val]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "12px", height: "12px", background: val.bar, borderRadius: "3px" }} />
                <span style={{ fontSize: "12px", color: "#555" }}>{val.label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "12px", height: "12px", background: "#7B61FF", borderRadius: "3px" }} />
              <span style={{ fontSize: "12px", color: "#555" }}>Now</span>
            </div>
          </div>
        </div>
      )}

      {/* Safety tips based on risk */}
      {currentRisk && (
        <div style={{ marginTop: "20px", background: "#f9f9f9", borderRadius: "12px", padding: "16px" }}>
          <p style={{ fontWeight: "600", fontSize: "14px", marginBottom: "8px", color: "#333" }}>
            💡 Safety Advice:
          </p>
          <ul style={{ paddingLeft: "16px", color: "#555", fontSize: "13px", lineHeight: "1.8", margin: 0 }}>
            {currentRisk.risk_level === "critical" || currentRisk.risk_level === "high" ? (
              <>
                <li>Avoid being alone in this area right now</li>
                <li>Stay in well-lit, populated places</li>
                <li>Enable Shake-to-SOS and share your location</li>
                <li>Consider waiting until a safer hour: {forecast?.safest_hour}</li>
              </>
            ) : (
              <>
                <li>Area appears relatively safe at this time</li>
                <li>Still stay alert and aware of surroundings</li>
                <li>Avoid risk hours: {forecast?.peak_risk_hour}</li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CrimeHotspotPredictor;
