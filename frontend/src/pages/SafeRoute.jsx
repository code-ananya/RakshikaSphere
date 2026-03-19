import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Polyline, Circle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
 
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
 
const ROUTE_COLORS = ["#30d158", "#ffd60a", "#ff6b35"];
 
const FitRoute = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      map.fitBounds(points, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
};
 
const createDotIcon = (color) => L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 8px ${color}"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});
 
export default function SafeRoute() {
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [totalZones, setTotalZones] = useState(0);
 
  const geocode = async (address) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      if (res.data && res.data.length > 0) {
        return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
      }
      return null;
    } catch { return null; }
  };
 
  const getMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setStartCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStartInput("📍 My Current Location");
        setUseMyLocation(true);
      });
    }
  };
 
  const findRoutes = async () => {
    setError(null);
    setRoutes([]);
    setSelectedRoute(null);
 
    let start = startCoords;
    let end = endCoords;
 
    if (!start && startInput && !useMyLocation) {
      start = await geocode(startInput);
      if (!start) { setError("Could not find starting location. Try a more specific address."); return; }
      setStartCoords(start);
    }
 
    if (!end && endInput) {
      end = await geocode(endInput);
      if (!end) { setError("Could not find destination. Try a more specific address."); return; }
      setEndCoords(end);
    }
 
    if (!start || !end) {
      setError("Please enter both start and destination.");
      return;
    }
 
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/v1/saferoute`, { start, end });
      if (res.data.success) {
        setRoutes(res.data.routes);
        setTotalZones(res.data.total_danger_zones);
        const recommended = res.data.routes.find(r => r.is_recommended);
        setSelectedRoute(recommended?.id || res.data.routes[0]?.id);
      }
    } catch {
      setError("Could not calculate routes. Make sure all services are running.");
    } finally {
      setLoading(false);
    }
  };
 
  const selected = routes.find(r => r.id === selectedRoute);
  const allPoints = selected?.points || [];
  const mapCenter = startCoords ? [startCoords.lat, startCoords.lng] : [28.6139, 77.2090];
 
  const s = {
    root: { fontFamily: "'Syne', sans-serif", background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" },
    header: { background: "linear-gradient(180deg,#0d0d1a,#0a0a0f)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "28px 36px 24px" },
    badge: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(48,209,88,0.15)", border: "1px solid rgba(48,209,88,0.3)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontFamily: "monospace", color: "#30d158", letterSpacing: "0.05em", marginBottom: 12 },
    title: { fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", background: "linear-gradient(135deg,#ffffff,#30d158)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    subtitle: { fontSize: 14, color: "rgba(240,240,245,0.45)", margin: 0 },
    inputSection: { padding: "24px 36px", display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" },
    inputGroup: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 11, fontFamily: "monospace", color: "rgba(240,240,245,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" },
    input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", color: "#f0f0f5", fontFamily: "'Syne',sans-serif", fontSize: 14, outline: "none" },
    locationBtn: { padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(48,209,88,0.3)", background: "rgba(48,209,88,0.1)", color: "#30d158", fontFamily: "'Syne',sans-serif", fontSize: 11, cursor: "pointer", marginTop: 4 },
    findBtn: { padding: "12px 24px", borderRadius: 10, border: "none", background: loading ? "rgba(48,209,88,0.3)" : "linear-gradient(135deg,#30d158,#1a8c3a)", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", height: 48, alignSelf: "end" },
    routeCards: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "0 36px 20px" },
    routeCard: (active, color) => ({ background: active ? `rgba(${hexToRgb(color)},0.1)` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? color : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "16px 18px", cursor: "pointer", transition: "all 0.15s", borderTop: `3px solid ${color}` }),
    safetyBadge: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "monospace", background: `rgba(${hexToRgb(color)},0.15)`, color, border: `1px solid rgba(${hexToRgb(color)},0.3)`, marginBottom: 8 }),
    mapWrap: { margin: "0 36px 24px", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
    error: { margin: "0 36px 16px", background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.25)", borderRadius: 12, padding: "14px 18px", fontSize: 13, color: "#ff6b8a", fontFamily: "monospace" },
  };
 
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.root}>
 
        {/* Header */}
        <div style={s.header}>
          <div style={s.badge}>🛣️ AI SAFE ROUTING</div>
          <h1 style={s.title}>Safe Route Planner</h1>
          <p style={s.subtitle}>Navigate around danger zones with AI-powered route recommendations</p>
          {totalZones > 0 && (
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#ffd60a", marginTop: 10 }}>
              ⚠ {totalZones} active danger zone{totalZones !== 1 ? "s" : ""} factored into routing
            </div>
          )}
        </div>
 
        {/* Input Section */}
        <div style={s.inputSection}>
          <div style={s.inputGroup}>
            <label style={s.label}>Starting Point</label>
            <input
              style={s.input}
              placeholder="e.g. Sector 62, Noida"
              value={startInput}
              onChange={e => { setStartInput(e.target.value); setStartCoords(null); setUseMyLocation(false); }}
            />
            <button style={s.locationBtn} onClick={getMyLocation}>📍 Use my location</button>
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Destination</label>
            <input
              style={s.input}
              placeholder="e.g. Connaught Place, Delhi"
              value={endInput}
              onChange={e => { setEndInput(e.target.value); setEndCoords(null); }}
            />
          </div>
          <button style={s.findBtn} onClick={findRoutes} disabled={loading}>
            {loading ? "Finding..." : "🔍 Find Safe Routes"}
          </button>
        </div>
 
        {/* Error */}
        {error && <div style={s.error}>⚠ {error}</div>}
 
        {/* Route Cards */}
        {routes.length > 0 && (
          <div style={s.routeCards}>
            {routes.map((route, i) => {
              const color = ROUTE_COLORS[i] || "#a78bfa";
              const isActive = selectedRoute === route.id;
              return (
                <div key={route.id} style={s.routeCard(isActive, color)} onClick={() => setSelectedRoute(route.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{route.name}</span>
                    {route.is_recommended && (
                      <span style={{ fontSize: 10, fontFamily: "monospace", background: "rgba(48,209,88,0.15)", color: "#30d158", border: "1px solid rgba(48,209,88,0.3)", borderRadius: 10, padding: "2px 8px" }}>★ RECOMMENDED</span>
                    )}
                  </div>
                  <div style={s.safetyBadge(route.safety_color)}>{route.safety_label}</div>
                  <div style={{ fontSize: 12, color: "rgba(240,240,245,0.5)", fontFamily: "monospace", marginBottom: 4 }}>
                    📏 {route.distance_km} km · ⏱ ~{route.estimated_minutes} min walk
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(240,240,245,0.4)", fontFamily: "monospace" }}>
                    ⚡ Danger score: {route.danger_score}
                  </div>
                  <div style={{ marginTop: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 4 }}>
                    <div style={{ width: `${Math.min(100, route.danger_score * 20)}%`, height: "100%", background: route.safety_color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
 
        {/* Map */}
        <div style={s.mapWrap}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: 500, width: "100%" }}>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {allPoints.length > 0 && <FitRoute points={allPoints} />}
 
            {/* All routes (dimmed) */}
            {routes.map((route, i) => (
              <Polyline
                key={route.id}
                positions={route.points}
                pathOptions={{
                  color: ROUTE_COLORS[i] || "#a78bfa",
                  weight: selectedRoute === route.id ? 5 : 2,
                  opacity: selectedRoute === route.id ? 0.9 : 0.3,
                  dashArray: selectedRoute === route.id ? null : "6 4"
                }}
              />
            ))}
 
            {/* Start marker */}
            {startCoords && (
              <Marker position={[startCoords.lat, startCoords.lng]} icon={createDotIcon("#30d158")}>
                <Popup><div style={{ fontFamily: "monospace", fontSize: 12 }}>🟢 Start</div></Popup>
              </Marker>
            )}
 
            {/* End marker */}
            {endCoords && (
              <Marker position={[endCoords.lat, endCoords.lng]} icon={createDotIcon("#ff2d55")}>
                <Popup><div style={{ fontFamily: "monospace", fontSize: 12 }}>🔴 Destination</div></Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
 
        {/* Empty state */}
        {routes.length === 0 && !loading && !error && (
          <div style={{ textAlign: "center", padding: "40px 36px", color: "rgba(240,240,245,0.3)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
            <div style={{ fontSize: 14, fontFamily: "monospace" }}>Enter a start and destination to find the safest route</div>
          </div>
        )}
 
      </div>
    </>
  );
}
 
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}