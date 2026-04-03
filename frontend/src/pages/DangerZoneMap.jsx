import React, { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Circle, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const RISK_CONFIG = {
  Critical: { color: "#ff2d55", fillColor: "#ff2d55", emoji: "🚨" },
  High:     { color: "#ff6b35", fillColor: "#ff6b35", emoji: "🔴" },
  Medium:   { color: "#ffd60a", fillColor: "#ffd60a", emoji: "⚠️" },
  Low:      { color: "#30d158", fillColor: "#30d158", emoji: "🟢" },
};

const RISK_RADIUS = { Critical: 900, High: 650, Medium: 450, Low: 250 };

const FitBounds = ({ zones }) => {
  const map = useMap();
  useEffect(() => {
    if (zones.length > 0) {
      map.fitBounds(zones.map(z => [z.lat, z.lng]), { padding: [60, 60] });
    }
  }, [zones, map]);
  return null;
};

export default function DangerZoneMap() {
  const [dangerZones, setDangerZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, clusters: 0 });
  const [filter, setFilter] = useState("All");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { fetchDangerZones(); }, []);

  const fetchDangerZones = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/api/v1/dangerzones`);
      if (res.data.success) {
        setDangerZones(res.data.danger_zones || []);
        setStats({ total: res.data.total_incidents || 0, clusters: res.data.total_clusters || 0 });
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch {
      setError("Unable to fetch danger zone data. Check that all services are running.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "All" ? dangerZones : dangerZones.filter(z => z.risk === filter);
  const countByRisk = r => dangerZones.filter(z => z.risk === r).length;

  const styles = {
    root: { fontFamily: "'Syne', sans-serif", background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" },
    header: { background: "linear-gradient(180deg,#0d0d1a 0%,#0a0a0f 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "28px 36px 24px", position: "relative" },
    badge: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(123,97,255,0.15)", border: "1px solid rgba(123,97,255,0.3)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontFamily: "monospace", color: "#a78bfa", letterSpacing: "0.05em", marginBottom: 12 },
    title: { fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", background: "linear-gradient(135deg,#ffffff 0%,#a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    subtitle: { fontSize: 14, color: "rgba(240,240,245,0.45)", margin: 0 },
    live: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "monospace", color: "#30d158", marginTop: 10 },
    liveDot: { width: 6, height: 6, borderRadius: "50%", background: "#30d158" },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "20px 36px" },
    statCard: (accent) => ({ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px", borderTop: `2px solid ${accent}`, cursor: "default" }),
   statValue: (color) => ({ fontSize: 36, fontWeight: 800, color, lineHeight: 1, marginBottom: 4, fontFamily: "monospace" }),
    statLabel: { fontSize: 11, color: "rgba(240,240,245,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" },
    controls: { display: "flex", alignItems: "center", gap: 8, padding: "0 36px 20px", flexWrap: "wrap" },
    filterBtn: (active) => ({ padding: "8px 16px", borderRadius: 8, border: active ? "1px solid rgba(123,97,255,0.5)" : "1px solid rgba(255,255,255,0.1)", background: active ? "rgba(123,97,255,0.2)" : "rgba(255,255,255,0.04)", color: active ? "#a78bfa" : "rgba(240,240,245,0.6)", fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }),
    refreshBtn: { padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7b61ff,#5a45d4)", color: "white", fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", marginLeft: "auto" },
    mapWrap: { margin: "0 36px 24px", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
    error: { margin: "0 36px 20px", background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.25)", borderRadius: 12, padding: "14px 18px", fontSize: 13, color: "#ff6b8a", fontFamily: "monospace" },
    loading: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 36px", gap: 16 },
    loadingText: { color: "rgba(240,240,245,0.4)", fontSize: 14, fontFamily: "monospace" },
    empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 36px", gap: 12, color: "rgba(240,240,245,0.3)", textAlign: "center" },
    legend: { display: "flex", alignItems: "center", gap: 20, padding: "16px 36px 28px", flexWrap: "wrap" },
    legendLabel: { fontSize: 11, fontFamily: "monospace", color: "rgba(240,240,245,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" },
    legendItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(240,240,245,0.6)", fontWeight: 600 },
    legendDot: (color) => ({ width: 10, height: 10, borderRadius: "50%", background: color }),
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={styles.root}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>● AI-POWERED ANALYSIS</div>
          <h1 style={styles.title}>Danger Zone Heatmap</h1>
          <p style={styles.subtitle}>Real-time clustering of reported incidents using DBSCAN machine learning</p>
          {lastUpdated && (
            <div style={styles.live}>
              <div style={styles.liveDot} />
              Last updated {lastUpdated}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          {[
            { label: "Total Incidents", value: stats.total, icon: "📊", accent: "#7b61ff", color: "#a78bfa" },
            { label: "Danger Clusters", value: stats.clusters, icon: "⚡", accent: "#0a84ff", color: "#5ac8fa" },
            { label: "Critical Zones", value: countByRisk("Critical"), icon: "🚨", accent: "#ff2d55", color: "#ff2d55" },
            { label: "High Risk Zones", value: countByRisk("High"), icon: "🔴", accent: "#ff6b35", color: "#ff6b35" },
          ].map((s, i) => (
            <div key={i} style={styles.statCard(s.accent)}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
              <div style={styles.statValue(s.color)}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          {["All", "Critical", "High", "Medium", "Low"].map(level => (
            <button key={level} style={styles.filterBtn(filter === level)} onClick={() => setFilter(level)}>
              {level !== "All" && RISK_CONFIG[level]?.emoji + " "}{level}
              {level !== "All" && ` (${countByRisk(level)})`}
            </button>
          ))}
          <button style={styles.refreshBtn} onClick={fetchDangerZones}>↺ Refresh</button>
        </div>

        {/* Error */}
        {error && <div style={styles.error}>⚠ {error}</div>}

        {/* Loading */}
        {loading ? (
          <div style={styles.loading}>
            <div style={{ width: 40, height: 40, border: "3px solid rgba(123,97,255,0.2)", borderTopColor: "#7b61ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={styles.loadingText}>Analyzing incident clusters...</div>
          </div>
        ) : (
          <>
            <div style={styles.mapWrap}>
              <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: 520, width: "100%" }}>
                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {filtered.length > 0 && <FitBounds zones={filtered} />}
                {filtered.map((zone, i) => (
                  <Circle key={i} center={[zone.lat, zone.lng]} radius={RISK_RADIUS[zone.risk] || 300}
                    pathOptions={{ color: RISK_CONFIG[zone.risk]?.color, fillColor: RISK_CONFIG[zone.risk]?.fillColor, fillOpacity: 0.2, weight: 2 }}>
                    <Popup>
                      <div style={{ minWidth: 180, background: "#13131f", color: "#f0f0f5", fontFamily: "monospace", fontSize: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: RISK_CONFIG[zone.risk]?.color, marginBottom: 8 }}>
                          {RISK_CONFIG[zone.risk]?.emoji} {zone.risk} Risk Zone
                        </div>
                        <div>📍 {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}</div>
                        <div>📋 {zone.count} incident{zone.count !== 1 ? "s" : ""}</div>
                        <div>⚡ Intensity: {(zone.intensity * 100).toFixed(0)}%</div>
                      </div>
                    </Popup>
                  </Circle>
                ))}
              </MapContainer>
            </div>

            {filtered.length === 0 && !error && (
              <div style={styles.empty}>
                <div style={{ fontSize: 48 }}>🗺️</div>
                <div style={{ fontSize: 14, maxWidth: 300, lineHeight: 1.6 }}>
                  No {filter !== "All" ? filter.toLowerCase() + " risk " : ""}zones detected yet. Report incidents to see danger zones appear.
                </div>
              </div>
            )}
          </>
        )}

        {/* Legend */}
        <div style={styles.legend}>
          <span style={styles.legendLabel}>Legend</span>
          {Object.entries(RISK_CONFIG).map(([risk, cfg]) => (
            <div key={risk} style={styles.legendItem}>
              <div style={styles.legendDot(cfg.fillColor)} />
              {risk}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
