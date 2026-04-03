import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const SEVERITY_CONFIG = {
  Critical: { color: "#ff2d55", bg: "rgba(255,45,85,0.12)", border: "rgba(255,45,85,0.3)", emoji: "🚨", priority: 1 },
  High:     { color: "#ff6b35", bg: "rgba(255,107,53,0.12)", border: "rgba(255,107,53,0.3)", emoji: "🔴", priority: 2 },
  Medium:   { color: "#ffd60a", bg: "rgba(255,214,10,0.12)", border: "rgba(255,214,10,0.3)", emoji: "⚠️", priority: 3 },
  Low:      { color: "#30d158", bg: "rgba(48,209,88,0.12)",  border: "rgba(48,209,88,0.3)",  emoji: "🟢", priority: 4 },
};

const ConfidenceBar = ({ value, color }) => (
  <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 4, width: "100%", marginTop: 6 }}>
    <div style={{ width: `${value * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
  </div>
);

export default function IncidentClassifier() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveText, setLiveText] = useState("");
  const [liveResult, setLiveResult] = useState(null);
  const [classifying, setClassifying] = useState(false);

  useEffect(() => { fetchIncidents(); }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/api/v1/classifier/all`);
      if (res.data.success) {
        setIncidents(res.data.incidents);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch {
      setError("Could not load incidents. Make sure all services are running.");
    } finally {
      setLoading(false);
    }
  };

  const classifyLive = async () => {
    if (!liveText.trim()) return;
    try {
      setClassifying(true);
      const res = await axios.post(`${API_URL}/api/v1/classifier/classify`, { text: liveText });
      setLiveResult(res.data);
    } catch {
      setLiveResult({ severity: "Error", confidence: 0, suggested_action: "Service unavailable." });
    } finally {
      setClassifying(false);
    }
  };

  const filtered = filter === "All" ? incidents : incidents.filter(i => i.severity === filter);
  const countBy = s => incidents.filter(i => i.severity === s).length;

  const s = {
    root: { fontFamily: "'Syne', sans-serif", background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" },
    header: { background: "linear-gradient(180deg,#0d0d1a,#0a0a0f)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "28px 36px 24px" },
    badge: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.3)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontFamily: "monospace", color: "#ff9f7a", letterSpacing: "0.05em", marginBottom: 12 },
    title: { fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", background: "linear-gradient(135deg,#ffffff,#ff6b35)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    subtitle: { fontSize: 14, color: "rgba(240,240,245,0.45)", margin: 0 },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "20px 36px" },
    statCard: (accent) => ({ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px", borderTop: `2px solid ${accent}` }),
    liveBox: { margin: "0 36px 24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" },
    liveTitle: { fontSize: 14, fontWeight: 700, color: "rgba(240,240,245,0.7)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
    textarea: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", color: "#f0f0f5", fontFamily: "monospace", fontSize: 13, resize: "vertical", minHeight: 80, outline: "none", boxSizing: "border-box" },
    classifyBtn: { marginTop: 10, padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#ff6b35,#c94000)", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" },
    resultBox: (sev) => ({ marginTop: 12, padding: "14px 18px", borderRadius: 10, background: SEVERITY_CONFIG[sev]?.bg || "rgba(255,255,255,0.05)", border: `1px solid ${SEVERITY_CONFIG[sev]?.border || "rgba(255,255,255,0.1)"}` }),
    controls: { display: "flex", alignItems: "center", gap: 8, padding: "0 36px 16px", flexWrap: "wrap" },
    filterBtn: (active) => ({ padding: "8px 16px", borderRadius: 8, border: active ? "1px solid rgba(255,107,53,0.5)" : "1px solid rgba(255,255,255,0.1)", background: active ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.04)", color: active ? "#ff9f7a" : "rgba(240,240,245,0.6)", fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }),
    refreshBtn: { padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#ff6b35,#c94000)", color: "white", fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", marginLeft: "auto" },
    card: (sev) => ({ background: "rgba(255,255,255,0.02)", border: `1px solid ${SEVERITY_CONFIG[sev]?.border || "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "18px 20px", marginBottom: 10, borderLeft: `3px solid ${SEVERITY_CONFIG[sev]?.color || "#fff"}` }),
    sevBadge: (sev) => ({ display: "inline-flex", alignItems: "center", gap: 5, background: SEVERITY_CONFIG[sev]?.bg, border: `1px solid ${SEVERITY_CONFIG[sev]?.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: SEVERITY_CONFIG[sev]?.color, fontFamily: "monospace" }),
    actionBox: { marginTop: 8, padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, fontSize: 12, color: "rgba(240,240,245,0.5)", fontFamily: "monospace" },
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.root}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.badge}>🧠 NLP SEVERITY CLASSIFIER</div>
          <h1 style={s.title}>Incident Intelligence</h1>
          <p style={s.subtitle}>AI-powered severity classification of reported incidents</p>
          {lastUpdated && <div style={{ fontSize: 11, fontFamily: "monospace", color: "#30d158", marginTop: 10 }}>● Last updated {lastUpdated}</div>}
        </div>

        {/* Stats */}
        <div style={s.statsGrid}>
          {[
            { label: "Total Reports", value: incidents.length, icon: "📋", accent: "#7b61ff", color: "#a78bfa" },
            { label: "Critical", value: countBy("Critical"), icon: "🚨", accent: "#ff2d55", color: "#ff2d55" },
            { label: "High", value: countBy("High"), icon: "🔴", accent: "#ff6b35", color: "#ff6b35" },
            { label: "Medium", value: countBy("Medium"), icon: "⚠️", accent: "#ffd60a", color: "#ffd60a" },
          ].map((stat, i) => (
            <div key={i} style={s.statCard(stat.accent)}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: stat.color, lineHeight: 1, marginBottom: 4, fontFamily: "monospace" }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "rgba(240,240,245,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Live Classifier */}
        <div style={s.liveBox}>
          <div style={s.liveTitle}>⚡ Live Text Classifier — test any incident description</div>
          <textarea
            style={s.textarea}
            placeholder="Type or paste an incident report to classify its severity..."
            value={liveText}
            onChange={e => { setLiveText(e.target.value); setLiveResult(null); }}
          />
          <button style={s.classifyBtn} onClick={classifyLive} disabled={classifying}>
            {classifying ? "Classifying..." : "🧠 Classify Now"}
          </button>
          {liveResult && liveResult.severity !== "Error" && (
            <div style={s.resultBox(liveResult.severity)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={s.sevBadge(liveResult.severity)}>{SEVERITY_CONFIG[liveResult.severity]?.emoji} {liveResult.severity}</span>
                <span style={{ fontSize: 12, color: "rgba(240,240,245,0.5)", fontFamily: "monospace" }}>
                  {(liveResult.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <ConfidenceBar value={liveResult.confidence} color={SEVERITY_CONFIG[liveResult.severity]?.color} />
              <div style={s.actionBox}>📋 {liveResult.suggested_action}</div>
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div style={s.controls}>
          {["All", "Critical", "High", "Medium", "Low"].map(level => (
            <button key={level} style={s.filterBtn(filter === level)} onClick={() => setFilter(level)}>
              {level !== "All" && SEVERITY_CONFIG[level]?.emoji + " "}{level}
              {level !== "All" && ` (${countBy(level)})`}
            </button>
          ))}
          <button style={s.refreshBtn} onClick={fetchIncidents}>↺ Refresh</button>
        </div>

        {/* Error */}
        {error && <div style={{ margin: "0 36px 20px", background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.25)", borderRadius: 12, padding: "14px 18px", fontSize: 13, color: "#ff6b8a", fontFamily: "monospace" }}>⚠ {error}</div>}

        {/* Incidents List */}
        <div style={{ padding: "0 36px 40px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "rgba(240,240,245,0.3)", fontFamily: "monospace" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
              Classifying incidents...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "rgba(240,240,245,0.3)", fontFamily: "monospace" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              No {filter !== "All" ? filter + " " : ""}incidents found.
            </div>
          ) : (
            filtered.map((inc, i) => (
              <div key={i} style={s.card(inc.severity)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <span style={s.sevBadge(inc.severity)}>{SEVERITY_CONFIG[inc.severity]?.emoji} {inc.severity}</span>
                  <span style={{ fontSize: 11, color: "rgba(240,240,245,0.35)", fontFamily: "monospace" }}>
                    {new Date(inc.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "rgba(240,240,245,0.85)", lineHeight: 1.6, marginBottom: 8 }}>
                  {inc.report || "No report text"}
                </div>
                <div style={{ fontSize: 12, color: "rgba(240,240,245,0.4)", fontFamily: "monospace", marginBottom: 6 }}>
                  📍 {inc.address || "No address"} · PIN {inc.pincodeOfIncident || "N/A"}
                </div>
                <ConfidenceBar value={inc.confidence} color={SEVERITY_CONFIG[inc.severity]?.color} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "rgba(240,240,245,0.3)", fontFamily: "monospace" }}>
                    Confidence: {(inc.confidence * 100).toFixed(0)}%
                  </span>
                  <span style={{ fontSize: 11, color: inc.isSeen ? "#30d158" : "#ffd60a", fontFamily: "monospace" }}>
                    {inc.isSeen ? "✓ Reviewed" : "○ Pending"}
                  </span>
                </div>
                <div style={s.actionBox}>📋 {inc.suggested_action}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
