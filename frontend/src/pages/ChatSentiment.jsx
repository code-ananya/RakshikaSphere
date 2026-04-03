import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/auth";
import toast from "react-hot-toast";
import Navbar from "../Components/Navbar/Navbar";
import Footer from "../Components/Footer/Footer";
import axios from "axios";


const ML_URL = process.env.REACT_APP_ML_URL || "http://localhost:5001";
const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// Keyword-based sentiment engine (runs in browser, no API call needed)
const DISTRESS_KEYWORDS = [
  "help", "help me", "save me", "emergency", "danger", "scared", "afraid",
  "following me", "being followed", "attacked", "hurt", "pain", "cry",
  "crying", "please", "please help", "bachao", "madad", "darr", "khatra",
  "unsafe", "threat", "threatening", "knife", "gun", "weapon", "trapped",
  "can't escape", "can't leave", "stuck", "alone", "no one", "nobody",
];

const POSITIVE_KEYWORDS = [
  "safe", "okay", "fine", "good", "home", "arrived", "reached", "happy",
  "better", "thank you", "thanks", "all good",
];

function analyzeSentiment(text) {
  const lower = text.toLowerCase();
  let distressScore = 0;
  let positiveScore = 0;
  const matchedKeywords = [];

  DISTRESS_KEYWORDS.forEach((kw) => {
    if (lower.includes(kw)) {
      distressScore += kw.split(" ").length > 1 ? 2 : 1; // multi-word = higher weight
      matchedKeywords.push(kw);
    }
  });

  POSITIVE_KEYWORDS.forEach((kw) => {
    if (lower.includes(kw)) positiveScore += 1;
  });

  // Punctuation signals
  if (text.includes("!!!") || text.includes("???")) distressScore += 1;
  if ((text.match(/!/g) || []).length > 2) distressScore += 1;

  // ALL CAPS signal
  if (text === text.toUpperCase() && text.length > 5) distressScore += 1;

  const netScore = distressScore - positiveScore;

  if (netScore >= 3) return { level: "Critical", color: "#f44336", emoji: "🚨", score: netScore, keywords: matchedKeywords };
  if (netScore >= 1) return { level: "Distressed", color: "#ff9800", emoji: "⚠️", score: netScore, keywords: matchedKeywords };
  if (positiveScore > 0) return { level: "Safe", color: "#4caf50", emoji: "✅", score: 0, keywords: [] };
  return { level: "Neutral", color: "#9e9e9e", emoji: "💬", score: 0, keywords: [] };
}

const ChatSentiment = () => {
  const [auth] = useAuth();
  const [messages, setMessages] = useState([
    { id: 1, sender: "system", text: "Chat Sentiment Analysis is active. All messages are monitored for distress signals.", time: new Date().toLocaleTimeString(), sentiment: null },
  ]);
  const [input, setInput] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [stats, setStats] = useState({ total: 0, distressed: 0, critical: 0 });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const sentiment = analyzeSentiment(input);
    const newMsg = {
      id: Date.now(),
      sender: "user",
      text: input,
      time: new Date().toLocaleTimeString(),
      sentiment,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Update stats
    setStats((prev) => ({
      total: prev.total + 1,
      distressed: sentiment.level === "Distressed" ? prev.distressed + 1 : prev.distressed,
      critical: sentiment.level === "Critical" ? prev.critical + 1 : prev.critical,
    }));

    // Handle distress
    if (sentiment.level === "Critical" || sentiment.level === "Distressed") {
      const alert = {
        id: Date.now(),
        message: input,
        level: sentiment.level,
        time: new Date().toLocaleTimeString(),
        keywords: sentiment.keywords,
      };
      setAlerts((prev) => [alert, ...prev.slice(0, 4)]);
      toast.error(`${sentiment.emoji} ${sentiment.level} distress detected in message!`, { duration: 5000 });

      // Auto escalate critical messages
      if (autoEscalate && sentiment.level === "Critical" && auth?.user) {
        try {
          await axios.post(`${ML_URL}/classify`, { text: input });
        } catch {}
        // Notify admin via backend
        try {
          // fixed ✅
// fixed ✅
await axios.post(
    `${API_URL}/api/v1/incidents`,
            {
              report: `⚠️ AUTO-ESCALATED: Distress detected in chat — "${input}"`,
              pincodeOfIncident: "000000",
              address: "Chat — Auto Escalated",
            },
            { headers: { Authorization: `Bearer ${auth?.token}` } }
          );
          toast("📋 Escalated to admin panel automatically.", { icon: "📋" });
        } catch {}
      }

      // Simulate a support response
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "support",
            text: sentiment.level === "Critical"
              ? "🚨 We detected a distress signal in your message. Are you safe? Press SOS if you need immediate help."
              : "We noticed you may be in distress. Are you okay? Type 'help' or press the SOS button if you need assistance.",
            time: new Date().toLocaleTimeString(),
            sentiment: null,
          },
        ]);
      }, 1000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSenderStyle = (msg) => {
    if (msg.sender === "system") return { background: "#f0f4ff", alignSelf: "center", maxWidth: "90%", textAlign: "center" };
    if (msg.sender === "support") return { background: "#e8f5e9", alignSelf: "flex-start", maxWidth: "75%" };
    return { background: "#7B61FF", color: "white", alignSelf: "flex-end", maxWidth: "75%" };
  };

  return (
    <>
      <Navbar />
      <div style={{ minHeight: "80vh", padding: "20px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#7B61FF" }}>💬 Chat Sentiment Analysis</h2>
          <p style={{ color: "#666" }}>Every message is analyzed for distress signals in real-time.</p>
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {/* Chat Window */}
          <div style={{ flex: "2", minWidth: "300px" }}>
            {/* Stats Bar */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              {[
                { label: "Total Messages", value: stats.total, color: "#7B61FF" },
                { label: "Distressed", value: stats.distressed, color: "#ff9800" },
                { label: "Critical", value: stats.critical, color: "#f44336" },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, background: s.color, color: "white", borderRadius: "10px",
                  padding: "10px", textAlign: "center",
                }}>
                  <div style={{ fontSize: "22px", fontWeight: "bold" }}>{s.value}</div>
                  <div style={{ fontSize: "11px", opacity: 0.9 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Messages */}
            <div style={{
              height: "400px", overflowY: "auto", border: "1px solid #eee",
              borderRadius: "14px", padding: "16px", background: "#fafafa",
              display: "flex", flexDirection: "column", gap: "10px",
            }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", ...getSenderStyle(msg) }}>
                  <div style={{
                    padding: "10px 14px", borderRadius: "12px",
                    background: getSenderStyle(msg).background,
                    color: getSenderStyle(msg).color || "#333",
                  }}>
                    {msg.text}
                    {msg.sentiment && msg.sentiment.level !== "Neutral" && msg.sentiment.level !== "Safe" && (
                      <div style={{
                        marginTop: "6px", padding: "4px 8px", borderRadius: "6px",
                        background: "rgba(255,255,255,0.2)", fontSize: "11px",
                        border: `1px solid ${msg.sentiment.color}`,
                        color: msg.sender === "user" ? "white" : msg.sentiment.color,
                      }}>
                        {msg.sentiment.emoji} {msg.sentiment.level} detected
                        {msg.sentiment.keywords.length > 0 && ` · "${msg.sentiment.keywords[0]}"`}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "10px", color: "#aaa", marginTop: "2px", padding: "0 4px" }}>
                    {msg.time}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (try 'help me' or 'I'm safe')"
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: "10px",
                  border: "2px solid #ddd", fontSize: "14px", outline: "none",
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  padding: "12px 20px", borderRadius: "10px", border: "none",
                  background: "#7B61FF", color: "white", fontWeight: "bold",
                  cursor: "pointer", fontSize: "14px",
                }}
              >
                Send
              </button>
            </div>

            {/* Auto escalate toggle */}
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              marginTop: "12px", padding: "10px 14px", background: "#f0f4ff",
              borderRadius: "10px",
            }}>
              <input
                type="checkbox" id="autoEscalate" checked={autoEscalate}
                onChange={(e) => setAutoEscalate(e.target.checked)}
              />
              <label htmlFor="autoEscalate" style={{ fontSize: "13px", color: "#555", cursor: "pointer" }}>
                Auto-escalate Critical messages to admin panel
              </label>
            </div>
          </div>

          {/* Alerts Panel */}
          <div style={{ flex: "1", minWidth: "220px" }}>
            <h4 style={{ color: "#f44336", marginBottom: "12px" }}>🚨 Distress Alerts</h4>
            {alerts.length === 0 ? (
              <div style={{
                background: "#f9f9f9", borderRadius: "12px", padding: "20px",
                textAlign: "center", color: "#999", fontSize: "13px",
              }}>
                No distress signals detected yet. Keep chatting!
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} style={{
                  background: alert.level === "Critical" ? "#fff3f3" : "#fff8e1",
                  border: `1px solid ${alert.level === "Critical" ? "#f44336" : "#ff9800"}`,
                  borderRadius: "12px", padding: "12px", marginBottom: "10px",
                }}>
                  <div style={{
                    fontWeight: "bold", fontSize: "13px",
                    color: alert.level === "Critical" ? "#f44336" : "#ff9800",
                  }}>
                    {alert.level === "Critical" ? "🚨" : "⚠️"} {alert.level}
                  </div>
                  <div style={{ fontSize: "12px", color: "#555", margin: "6px 0" }}>
                    "{alert.message.substring(0, 60)}{alert.message.length > 60 ? "..." : ""}"
                  </div>
                  {alert.keywords.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {alert.keywords.slice(0, 3).map((kw, i) => (
                        <span key={i} style={{
                          background: "#f44336", color: "white",
                          borderRadius: "4px", padding: "1px 6px", fontSize: "10px",
                        }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: "10px", color: "#aaa", marginTop: "6px" }}>{alert.time}</div>
                </div>
              ))
            )}

            {/* Legend */}
            <div style={{ marginTop: "20px", background: "#f9f9f9", borderRadius: "12px", padding: "14px" }}>
              <h5 style={{ margin: "0 0 10px", fontSize: "13px", color: "#555" }}>Sentiment Levels</h5>
              {[
                { level: "Critical", color: "#f44336", desc: "Immediate danger keywords" },
                { level: "Distressed", color: "#ff9800", desc: "Signs of fear or distress" },
                { level: "Neutral", color: "#9e9e9e", desc: "No distress detected" },
                { level: "Safe", color: "#4caf50", desc: "Positive, safe keywords" },
              ].map((item) => (
                <div key={item.level} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: item.color }}>{item.level}</span>
                    <span style={{ fontSize: "11px", color: "#888" }}> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ChatSentiment;
