import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_ML_URL || "http://localhost:5001";

const CALLERS = [
  { id: "mom",     label: "Maa",     icon: "💕", color: "#ff6b9d", sub: "Most trusted" },
  { id: "dad",     label: "Papa",    icon: "👨", color: "#5ac8fa", sub: "Authority" },
  { id: "friend",  label: "Friend",  icon: "👯", color: "#bf5af2", sub: "Casual escape" },
  { id: "boss",    label: "Boss",    icon: "💼", color: "#ffd60a", sub: "Work excuse" },
  { id: "brother", label: "Bhai",    icon: "🤜", color: "#30d158", sub: "Sibling backup" },
];

const DELAY_OPTIONS = [
  { label: "Now",   value: 0 },
  { label: "5 sec", value: 5 },
  { label: "15 sec",value: 15 },
  { label: "30 sec",value: 30 },
];

export default function FakeCall() {
  const [selectedCaller, setCaller] = useState("mom");
  const [delay, setDelay]           = useState(5);
  const [callState, setCallState]   = useState("idle"); // idle | ringing | active | ended
  const [callData, setCallData]     = useState(null);
  const [elapsed, setElapsed]       = useState(0);
  const [countdown, setCountdown]   = useState(0);
  const [vibrating, setVibrating]   = useState(false);
  const timerRef  = useRef(null);
  const audioRef  = useRef(null);

  // Ring sound using Web Audio API
  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.1);
      };
      // Classic phone ring pattern
      for (let i = 0; i < 3; i++) {
        playBeep(880, i * 0.8, 0.3);
        playBeep(880, i * 0.8 + 0.35, 0.3);
      }
    } catch {}
  };

  const triggerCall = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/v1/fakecall/generate`, { caller: selectedCaller });
      setCallData(res.data);

      if (delay === 0) {
        startRinging(res.data);
      } else {
        setCountdown(delay);
        setCallState("countdown");
        let remaining = delay;
        const cd = setInterval(() => {
          remaining--;
          setCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(cd);
            startRinging(res.data);
          }
        }, 1000);
      }
    } catch {
      alert("Fake call service unavailable. Make sure fake_call.py is running on port 5005.");
    }
  };

  const startRinging = (data) => {
    setCallData(data);
    setCallState("ringing");
    setVibrating(true);
    playRingtone();
    // Auto-answer after 8 seconds if user doesn't
    const autoAnswer = setTimeout(() => answerCall(), 8000);
    timerRef.current = autoAnswer;
  };

  const answerCall = () => {
    clearTimeout(timerRef.current);
    setVibrating(false);
    setCallState("active");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const endCall = () => {
    clearTimeout(timerRef.current);
    clearInterval(timerRef.current);
    setCallState("ended");
    setVibrating(false);
    setTimeout(() => setCallState("idle"), 2500);
  };

  useEffect(() => {
    return () => { clearTimeout(timerRef.current); clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const caller = CALLERS.find(c => c.id === selectedCaller);

  const s = {
    root: { fontFamily: "'Nunito', 'Syne', sans-serif", background: "#06060e", minHeight: "100vh", color: "#f5f5fa" },
    header: { background: "linear-gradient(180deg,#0d0d1e 0%,#06060e 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "28px 36px 22px" },
    badge: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(191,90,242,0.12)", border: "1px solid rgba(191,90,242,0.3)", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontFamily: "monospace", color: "#bf5af2", letterSpacing: "0.08em", marginBottom: 12 },
    title: { fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", background: "linear-gradient(135deg,#ffffff 0%,#bf5af2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    subtitle: { fontSize: 13, color: "rgba(245,245,250,0.4)", margin: 0 },
    body: { padding: "28px 36px" },
    grid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 24 },
    callerCard: (active, color) => ({
      background: active ? `${color}18` : "rgba(255,255,255,0.03)",
      border: active ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "14px 8px", textAlign: "center", cursor: "pointer",
      transition: "all 0.2s",
    }),
    callerIcon: { fontSize: 30, marginBottom: 6 },
    callerName: (active, color) => ({ fontSize: 13, fontWeight: 700, color: active ? color : "rgba(245,245,250,0.7)" }),
    callerSub: { fontSize: 10, color: "rgba(245,245,250,0.3)", marginTop: 3, fontFamily: "monospace" },
    delayRow: { display: "flex", gap: 8, marginBottom: 24 },
    delayBtn: (active) => ({
      flex: 1, padding: "10px 0", borderRadius: 10,
      border: active ? "1px solid rgba(191,90,242,0.4)" : "1px solid rgba(255,255,255,0.08)",
      background: active ? "rgba(191,90,242,0.15)" : "rgba(255,255,255,0.03)",
      color: active ? "#bf5af2" : "rgba(245,245,250,0.5)",
      fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
    }),
    triggerBtn: { width: "100%", padding: "16px 0", background: "linear-gradient(135deg,#bf5af2,#8e44c0)", border: "none", borderRadius: 14, color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em" },

    // Phone UI overlay
    phoneOverlay: { position: "fixed", inset: 0, background: "linear-gradient(180deg,#1a0a2e 0%,#0d0620 100%)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "60px 32px 50px" },
    callerInfo: { textAlign: "center" },
    callerAvatarRing: (color, vib) => ({ width: 110, height: 110, borderRadius: "50%", background: `${color}22`, border: `3px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, margin: "0 auto 20px", animation: vib ? "vibrate 0.1s infinite" : "none" }),
    callerNameBig: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
    callerNumber: { fontSize: 16, color: "rgba(245,245,250,0.5)", fontFamily: "monospace", marginBottom: 12 },
    callStatus: { fontSize: 14, color: "rgba(245,245,250,0.5)" },
    script: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "18px 22px", fontSize: 15, lineHeight: 1.7, textAlign: "center", maxWidth: 320, fontStyle: "italic", color: "rgba(245,245,250,0.8)" },
    callBtns: { display: "flex", gap: 32, justifyContent: "center" },
    declineBtn: { width: 72, height: 72, borderRadius: "50%", background: "#ff2d55", border: "none", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    answerBtn: { width: 72, height: 72, borderRadius: "50%", background: "#30d158", border: "none", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    endBtn: { width: 72, height: 72, borderRadius: "50%", background: "#ff2d55", border: "none", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" },
    tip: { background: "rgba(191,90,242,0.08)", border: "1px solid rgba(191,90,242,0.2)", borderRadius: 14, padding: "16px 20px", marginTop: 24, fontSize: 13, color: "rgba(245,245,250,0.6)", lineHeight: 1.7 },
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes vibrate { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.05)} }
      `}</style>

      <div style={s.root}>
        <div style={s.header}>
          <div style={s.badge}>● SAFETY FEATURE</div>
          <h1 style={s.title}>Fake Call Generator</h1>
          <p style={s.subtitle}>Trigger a realistic incoming call to escape uncomfortable or unsafe situations</p>
        </div>

        <div style={s.body}>
          <p style={{ fontSize: 13, color: "rgba(245,245,250,0.4)", fontFamily: "monospace", marginBottom: 20 }}>SELECT CALLER</p>
          <div style={s.grid}>
            {CALLERS.map(c => (
              <div key={c.id} style={s.callerCard(selectedCaller === c.id, c.color)} onClick={() => setCaller(c.id)}>
                <div style={s.callerIcon}>{c.icon}</div>
                <div style={s.callerName(selectedCaller === c.id, c.color)}>{c.label}</div>
                <div style={s.callerSub}>{c.sub}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, color: "rgba(245,245,250,0.4)", fontFamily: "monospace", marginBottom: 12 }}>CALL DELAY</p>
          <div style={s.delayRow}>
            {DELAY_OPTIONS.map(d => (
              <button key={d.value} style={s.delayBtn(delay === d.value)} onClick={() => setDelay(d.value)}>{d.label}</button>
            ))}
          </div>

          <button style={s.triggerBtn} onClick={triggerCall} disabled={callState !== "idle"}>
            📞 Trigger Fake Call from {caller?.label}
          </button>

          {callState === "countdown" && (
            <div style={{ textAlign: "center", marginTop: 24, fontSize: 48, fontWeight: 800, color: "#bf5af2" }}>
              {countdown}
              <div style={{ fontSize: 13, color: "rgba(245,245,250,0.4)", fontFamily: "monospace", marginTop: 8 }}>Call incoming in...</div>
            </div>
          )}

          <div style={s.tip}>
            <strong style={{ color: "#bf5af2" }}>💡 How to use:</strong> Select who should "call" you, set a delay, then trigger. A realistic phone screen will appear. Show it to anyone nearby — it looks like a real incoming call.<br/><br/>
            <strong>Quick tip:</strong> Set 15-second delay and put your phone in your pocket — it'll ring when you need it!
          </div>
        </div>
      </div>

      {/* Phone call overlay */}
      {(callState === "ringing" || callState === "active" || callState === "ended") && callData && (
        <div style={s.phoneOverlay}>
          <div style={s.callerInfo}>
            <div style={s.callerAvatarRing(caller?.color || "#bf5af2", vibrating)}>
              {caller?.icon}
            </div>
            <div style={s.callerNameBig}>{callData.caller_name}</div>
            <div style={s.callerNumber}>{callData.number}</div>
            <div style={s.callStatus}>
              {callState === "ringing" && <span style={{ animation: "pulse 1s infinite", display: "inline-block" }}>Incoming call...</span>}
              {callState === "active"  && formatTime(elapsed)}
              {callState === "ended"   && "Call ended"}
            </div>
          </div>

          {callState === "active" && (
            <div style={s.script}>"{callData.script}"</div>
          )}
          {callState !== "active" && <div />}

          <div>
            {callState === "ringing" && (
              <div style={s.callBtns}>
                <button style={s.declineBtn} onClick={endCall}>📵</button>
                <button style={s.answerBtn} onClick={answerCall}>📞</button>
              </div>
            )}
            {callState === "active" && (
              <button style={s.endBtn} onClick={endCall}>📵</button>
            )}
            {callState === "ended" && (
              <div style={{ textAlign: "center", color: "rgba(245,245,250,0.4)", fontSize: 15 }}>Returning to app...</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
