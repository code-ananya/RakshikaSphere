import React, { useState, useRef } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const SEVERITY_CONFIG = {
  Critical: { color: "#ff2d55", bg: "rgba(255,45,85,0.12)", border: "rgba(255,45,85,0.35)", emoji: "🚨", label: "CRITICAL THREAT" },
  High:     { color: "#ff6b35", bg: "rgba(255,107,53,0.12)", border: "rgba(255,107,53,0.35)", emoji: "🔴", label: "HIGH RISK" },
  Medium:   { color: "#ffd60a", bg: "rgba(255,214,10,0.10)", border: "rgba(255,214,10,0.30)", emoji: "⚠️", label: "MEDIUM RISK" },
  Low:      { color: "#30d158", bg: "rgba(48,209,88,0.10)",  border: "rgba(48,209,88,0.30)",  emoji: "🟡", label: "LOW RISK" },
  Safe:     { color: "#636366", bg: "rgba(99,99,102,0.10)",  border: "rgba(99,99,102,0.25)",  emoji: "✅", label: "SAFE" },
  Unknown:  { color: "#8e8e93", bg: "rgba(142,142,147,0.10)",border: "rgba(142,142,147,0.2)", emoji: "❓", label: "UNKNOWN" },
};

export default function ViolenceDetector() {
  const [tab, setTab]             = useState("text"); // "text" | "image" | "report"
  const [text, setText]           = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageB64, setImageB64]   = useState(null);
  const [contextText, setContext] = useState("");
  const [reportText, setReport]   = useState("");
  const [address, setAddress]     = useState("");
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const fileRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
      setImageB64(ev.target.result); // full data URL, backend strips prefix
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      let res;
      if (tab === "text") {
        res = await axios.post(`${API_URL}/api/v1/violence/analyze/text`, { text });
      } else if (tab === "image") {
        res = await axios.post(`${API_URL}/api/v1/violence/analyze/image`, { image: imageB64, context: contextText });
      } else {
        res = await axios.post(`${API_URL}/api/v1/violence/analyze/report`, { report: reportText, address });
      }
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Analysis service unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? (SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.Unknown) : null;

  const s = {
    root: { fontFamily: "'Space Grotesk', 'Syne', sans-serif", background: "#080810", minHeight: "100vh", color: "#eeeef2" },
    header: { background: "linear-gradient(180deg,#0d0d1e 0%,#080810 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "28px 36px 22px" },
    badge: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,45,85,0.12)", border: "1px solid rgba(255,45,85,0.3)", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontFamily: "monospace", color: "#ff6b8a", letterSpacing: "0.08em", marginBottom: 12 },
    title: { fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", background: "linear-gradient(135deg,#ffffff 0%,#ff6b8a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    subtitle: { fontSize: 13, color: "rgba(238,238,242,0.4)", margin: 0 },
    body: { padding: "28px 36px" },
    tabs: { display: "flex", gap: 8, marginBottom: 28 },
    tab: (active) => ({
      padding: "9px 20px", borderRadius: 10,
      border: active ? "1px solid rgba(255,45,85,0.4)" : "1px solid rgba(255,255,255,0.08)",
      background: active ? "rgba(255,45,85,0.15)" : "rgba(255,255,255,0.03)",
      color: active ? "#ff6b8a" : "rgba(238,238,242,0.5)",
      fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em",
    }),
    card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 24, marginBottom: 20 },
    label: { fontSize: 11, fontFamily: "monospace", color: "rgba(238,238,242,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, display: "block" },
    textarea: { width: "100%", minHeight: 130, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#eeeef2", fontFamily: "inherit", fontSize: 14, padding: "14px 16px", resize: "vertical", outline: "none", boxSizing: "border-box" },
    input: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#eeeef2", fontFamily: "inherit", fontSize: 14, padding: "12px 16px", outline: "none", boxSizing: "border-box" },
    uploadBox: { border: "2px dashed rgba(255,255,255,0.12)", borderRadius: 14, padding: 32, textAlign: "center", cursor: "pointer", marginBottom: 16 },
    analyzeBtn: { width: "100%", padding: "14px 0", background: "linear-gradient(135deg,#ff2d55,#c0113a)", border: "none", borderRadius: 12, color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em" },
    resultCard: (c) => ({ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 18, padding: 24, marginTop: 24 }),
    severityBadge: (c) => ({ display: "inline-flex", alignItems: "center", gap: 8, background: `${c.color}22`, border: `1px solid ${c.color}55`, borderRadius: 20, padding: "6px 16px", fontSize: 12, fontFamily: "monospace", color: c.color, fontWeight: 700, letterSpacing: "0.1em" }),
    confBar: (pct, c) => ({ height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${c} ${pct}%, rgba(255,255,255,0.06) ${pct}%)` }),
    action: { marginTop: 16, fontSize: 14, lineHeight: 1.6, color: "rgba(238,238,242,0.8)", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 16px", borderLeft: "3px solid" },
    keywords: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 },
    keyword: (c) => ({ background: `${c}18`, border: `1px solid ${c}40`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace", color: c }),
    error: { background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.25)", borderRadius: 12, padding: "14px 18px", fontSize: 13, color: "#ff6b8a", fontFamily: "monospace", marginTop: 16 },
    spinner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "32px 0", color: "rgba(238,238,242,0.4)", fontSize: 14, fontFamily: "monospace" },
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.root}>
        <div style={s.header}>
          <div style={s.badge}>● THREAT ANALYSIS ENGINE</div>
          <h1 style={s.title}>Violence & Threat Detector</h1>
          <p style={s.subtitle}>AI-powered analysis of incident reports, images, and text for safety threats</p>
        </div>

        <div style={s.body}>
          {/* Tabs */}
          <div style={s.tabs}>
            {[["text","📝 Text Analysis"],["image","🖼️ Image Analysis"],["report","📋 Full Report"]].map(([id, label]) => (
              <button key={id} style={s.tab(tab === id)} onClick={() => { setTab(id); setResult(null); setError(null); }}>{label}</button>
            ))}
          </div>

          {/* Input card */}
          <div style={s.card}>
            {tab === "text" && (
              <>
                <span style={s.label}>Describe the incident or paste report text</span>
                <textarea style={s.textarea} placeholder="e.g. A man was following me with a knife near the bus stop..." value={text} onChange={e => setText(e.target.value)} />
              </>
            )}

            {tab === "image" && (
              <>
                <div style={s.uploadBox} onClick={() => fileRef.current.click()}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 10 }} />
                  ) : (
                    <>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
                      <div style={{ color: "rgba(238,238,242,0.4)", fontSize: 14 }}>Click to upload an image or screenshot</div>
                    </>
                  )}
                  <input type="file" accept="image/*" ref={fileRef} onChange={handleImageChange} style={{ display: "none" }} />
                </div>
                <span style={s.label}>Context description (optional)</span>
                <input style={s.input} placeholder="Describe what's in the image..." value={contextText} onChange={e => setContext(e.target.value)} />
              </>
            )}

            {tab === "report" && (
              <>
                <span style={s.label}>Incident report</span>
                <textarea style={s.textarea} placeholder="Full incident description..." value={reportText} onChange={e => setReport(e.target.value)} />
                <span style={{ ...s.label, marginTop: 14 }}>Location / Address</span>
                <input style={s.input} placeholder="e.g. Sector 62, Noida, UP" value={address} onChange={e => setAddress(e.target.value)} />
              </>
            )}

            <button
              style={{ ...s.analyzeBtn, marginTop: 20, opacity: loading ? 0.6 : 1 }}
              onClick={analyze}
              disabled={loading || (tab === "text" && !text) || (tab === "image" && !imageB64) || (tab === "report" && !reportText)}
            >
              {loading ? "Analyzing..." : "🔍 Analyze Threat"}
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div style={s.spinner}>
              <div style={{ width: 20, height: 20, border: "2px solid rgba(255,45,85,0.2)", borderTopColor: "#ff2d55", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              Scanning for threat signals...
            </div>
          )}

          {/* Error */}
          {error && <div style={s.error}>⚠ {error}</div>}

          {/* Result */}
          {result && cfg && (
            <div style={s.resultCard(cfg)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={s.severityBadge(cfg)}>{cfg.emoji} {cfg.label}</div>
                <div style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(238,238,242,0.35)" }}>
                  {Math.round((result.confidence || 0) * 100)}% confidence
                </div>
              </div>

              {/* Confidence bar */}
              <span style={s.label}>Confidence Level</span>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden", marginBottom: 18 }}>
                <div style={{ ...s.confBar(Math.round((result.confidence || 0) * 100), cfg.color), transition: "width 0.8s ease" }} />
              </div>

              {/* Recommended action */}
              {result.recommended_action && (
                <div style={{ ...s.action, borderLeftColor: cfg.color }}>
                  <strong style={{ color: cfg.color }}>Recommended Action: </strong>
                  {result.recommended_action}
                </div>
              )}

              {/* Keywords */}
              {result.detected_keywords?.length > 0 && (
                <>
                  <span style={{ ...s.label, marginTop: 16 }}>Threat Keywords Detected</span>
                  <div style={s.keywords}>
                    {result.detected_keywords.map((kw, i) => (
                      <span key={i} style={s.keyword(cfg.color)}>{kw}</span>
                    ))}
                  </div>
                </>
              )}

              {/* Image analysis info */}
              {result.size_kb && (
                <div style={{ marginTop: 14, fontSize: 12, fontFamily: "monospace", color: "rgba(238,238,242,0.35)" }}>
                  Image size: {result.size_kb} KB · {result.analysis_type || "heuristic"} analysis
                </div>
              )}
              {result.note && (
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(238,238,242,0.3)", fontFamily: "monospace" }}>{result.note}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
