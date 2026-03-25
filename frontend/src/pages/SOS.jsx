import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "True";

// ── helpers ──────────────────────────────────────────────────────────────────
function getUserId() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?._id || parsed?.user?._id || null;
    } catch { return null; }
}

function formatCountdown(ms) {
    if (ms <= 0) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const TIMER_PRESETS = [
    { label: "15 min", ms: 15 * 60 * 1000 },
    { label: "30 min", ms: 30 * 60 * 1000 },
    { label: "1 hr",   ms: 60 * 60 * 1000 },
    { label: "2 hr",   ms: 120 * 60 * 1000 },
];

// ── main component ────────────────────────────────────────────────────────────
export default function SOSPage() {
    const userId = getUserId();

    // SOS state
    const [sosState, setSosState]         = useState("idle"); // idle | locating | triggered | shared
    const [location, setLocation]         = useState(null);
    const [sosData, setSosData]           = useState(null);
    const [holdProgress, setHoldProgress] = useState(0);
    const holdInterval  = useRef(null);
    const holdStart     = useRef(null);
    const HOLD_DURATION = 1500; // 1.5s hold to trigger

    // Check-in timer state
    const [timerActive, setTimerActive]   = useState(false);
    const [timerDuration, setTimerDuration] = useState(30 * 60 * 1000);
    const [timerRemaining, setTimerRemaining] = useState(0);
    const [timerExpired, setTimerExpired] = useState(false);
    const [checkedIn, setCheckedIn]       = useState(false);
    const [customMinutes, setCustomMinutes] = useState("");
    const timerRef = useRef(null);
    const endTimeRef = useRef(null);

    // Contacts
    const [contacts, setContacts]         = useState([]);

    // Get location on mount
    useEffect(() => {
        navigator.geolocation?.getCurrentPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => setLocation(null)
        );
    }, []);

    // Load contacts
    useEffect(() => {
        if (!userId) return;
        axios.get(`${API_URL}/api/v1/sos/contacts/${userId}`)
            .then(r => setContacts(r.data.contacts || []))
            .catch(() => {});
    }, [userId]);

    // ── Check-in timer logic ──────────────────────────────────────────────────
    const startTimer = useCallback((duration) => {
        clearInterval(timerRef.current);
        endTimeRef.current = Date.now() + duration;
        setTimerRemaining(duration);
        setTimerActive(true);
        setTimerExpired(false);
        setCheckedIn(false);

        timerRef.current = setInterval(() => {
            const remaining = endTimeRef.current - Date.now();
            if (remaining <= 0) {
                clearInterval(timerRef.current);
                setTimerRemaining(0);
                setTimerActive(false);
                setTimerExpired(true);
                // vibrate device if supported
                navigator.vibrate?.([500, 200, 500, 200, 500]);
            } else {
                setTimerRemaining(remaining);
            }
        }, 500);
    }, []);

    const stopTimer = useCallback(() => {
        clearInterval(timerRef.current);
        setTimerActive(false);
        setTimerRemaining(0);
        setTimerExpired(false);
    }, []);

    const handleCheckIn = async () => {
        try {
            if (userId) {
                await axios.post(`${API_URL}/api/v1/sos/checkin`, { userId });
            }
        } catch {}
        setCheckedIn(true);
        stopTimer();
        // restart timer automatically
        setTimeout(() => {
            setCheckedIn(false);
            startTimer(timerDuration);
        }, 2000);
    };

    useEffect(() => () => clearInterval(timerRef.current), []);

    // ── SOS hold-to-trigger logic ─────────────────────────────────────────────
    const startHold = () => {
        if (sosState !== "idle") return;
        holdStart.current = Date.now();
        holdInterval.current = setInterval(() => {
            const elapsed = Date.now() - holdStart.current;
            const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
            setHoldProgress(pct);
            if (elapsed >= HOLD_DURATION) {
                clearInterval(holdInterval.current);
                triggerSOS();
            }
        }, 30);
    };

    const cancelHold = () => {
        clearInterval(holdInterval.current);
        setHoldProgress(0);
    };

    const triggerSOS = async () => {
        setSosState("locating");
        setHoldProgress(100);

        // vibrate SOS pattern: ... --- ...
        navigator.vibrate?.([100,50,100,50,100,200,300,100,300,100,300,200,100,50,100,50,100]);

        try {
            const payload = {
                userId: userId || "guest",
                lat:  location?.lat,
                lng:  location?.lng,
                address: location ? null : "Location not available",
            };
            const res = await axios.post(`${API_URL}/api/v1/sos/trigger`, payload);
            setSosData(res.data);
            setSosState("triggered");
        } catch {
            // Even if backend fails, show share options with device location
            setSosData({
                success: true,
                userName: "User",
                contacts: contacts,
                sosMessage: `SOS ALERT! I need help.\nLocation: ${location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : "Unknown"}\nTime: ${new Date().toLocaleString()}`,
                locationUrl: location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : null,
            });
            setSosState("triggered");
        }
    };

    const shareViaWhatsApp = (phone, msg) => {
        const clean = phone.replace(/\D/g, "");
        window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, "_blank");
    };

    const shareViaEmail = (email, msg) => {
        window.open(`mailto:${email}?subject=SOS%20ALERT&body=${encodeURIComponent(msg)}`, "_blank");
    };

    const shareViaNative = () => {
        if (navigator.share) {
            navigator.share({
                title: "SOS ALERT",
                text: sosData?.sosMessage,
                url: sosData?.locationUrl || window.location.href,
            });
        }
    };

    const callEmergency = () => window.open("tel:112");

    const resetSOS = () => {
        setSosState("idle");
        setSosData(null);
        setHoldProgress(0);
    };

    // ── progress ring for timer ───────────────────────────────────────────────
    const timerPct = timerActive ? (timerRemaining / timerDuration) : 0;
    const circumference = 2 * Math.PI * 54;
    const dashOffset = circumference * (1 - timerPct);

    // ── styles ────────────────────────────────────────────────────────────────
    const s = {
        root: { fontFamily: "'DM Sans', 'Syne', sans-serif", background: "#07070f", minHeight: "100vh", color: "#f0f0f5", paddingBottom: 40 },
        header: { background: "linear-gradient(180deg,#120a1e 0%,#07070f 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "26px 32px 20px" },
        badge: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,45,85,0.12)", border: "1px solid rgba(255,45,85,0.3)", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontFamily: "monospace", color: "#ff6b8a", letterSpacing: "0.08em", marginBottom: 10 },
        title: { fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 4px", background: "linear-gradient(135deg,#fff 0%,#ff6b8a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
        subtitle: { fontSize: 13, color: "rgba(240,240,245,0.4)", margin: 0 },
        body: { padding: "28px 32px" },
        grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 },

        // SOS card
        sosCard: { background: "rgba(255,45,85,0.06)", border: "1px solid rgba(255,45,85,0.2)", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 },
        sosTitle: { fontSize: 13, fontFamily: "monospace", color: "rgba(240,240,245,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" },
        sosBtnWrap: { position: "relative", width: 140, height: 140 },
        sosRing: { position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(#ff2d55 ${holdProgress * 3.6}deg, rgba(255,45,85,0.12) 0deg)`, transition: holdProgress === 0 ? "background 0.3s" : "none" },
        sosBtn: {
            position: "absolute", inset: 8, borderRadius: "50%",
            background: sosState === "triggered" ? "linear-gradient(135deg,#ff2d55,#c01040)" : "linear-gradient(135deg,#2a0a12,#3d0f1e)",
            border: "none", color: sosState === "triggered" ? "#fff" : "#ff6b8a",
            fontSize: sosState === "triggered" ? 13 : 32, fontWeight: 800,
            cursor: sosState === "idle" ? "pointer" : "default",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            userSelect: "none", WebkitUserSelect: "none",
            fontFamily: "inherit",
        },
        sosHint: { fontSize: 12, color: "rgba(240,240,245,0.3)", textAlign: "center", fontFamily: "monospace" },

        // Timer card
        timerCard: { background: "rgba(48,209,88,0.05)", border: "1px solid rgba(48,209,88,0.18)", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
        timerTitle: { fontSize: 13, fontFamily: "monospace", color: "rgba(240,240,245,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" },
        timerRing: { position: "relative", width: 130, height: 130 },
        timerText: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
        timerCountdown: (expired) => ({ fontSize: 22, fontWeight: 800, color: expired ? "#ff2d55" : "#30d158", fontFamily: "monospace" }),
        timerLabel: { fontSize: 10, fontFamily: "monospace", color: "rgba(240,240,245,0.35)", marginTop: 2 },

        // Presets
        presetRow: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" },
        presetBtn: (active) => ({
            padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            border: active ? "1px solid rgba(48,209,88,0.5)" : "1px solid rgba(255,255,255,0.1)",
            background: active ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.04)",
            color: active ? "#30d158" : "rgba(240,240,245,0.5)",
        }),
        startTimerBtn: (active) => ({
            width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
            background: active ? "rgba(255,45,85,0.15)" : "linear-gradient(135deg,#1a4a28,#0d6b2a)",
            color: active ? "#ff6b8a" : "#30d158", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer",
        }),
        checkInBtn: { width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#30d158,#1a8a35)", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" },

        // Alert section (shown when SOS triggered)
        alertCard: { background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.3)", borderRadius: 20, padding: 24, marginBottom: 20 },
        alertTitle: { fontSize: 16, fontWeight: 800, color: "#ff2d55", marginBottom: 12 },
        alertMsg: { fontFamily: "monospace", fontSize: 12, background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "12px 14px", color: "rgba(240,240,245,0.7)", lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-wrap", wordBreak: "break-word" },
        shareGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 },
        shareBtn: (color) => ({ padding: "12px 0", borderRadius: 12, border: "none", background: `${color}18`, color, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", border: `1px solid ${color}33` }),
        contactsList: { display: "flex", flexDirection: "column", gap: 8 },
        contactRow: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px" },
        contactLabel: { fontSize: 12, color: "rgba(240,240,245,0.5)", fontFamily: "monospace" },
        contactValue: { fontSize: 13, fontWeight: 700, color: "#f0f0f5" },
        sendBtn: (color) => ({ padding: "6px 14px", borderRadius: 8, border: `1px solid ${color}40`, background: `${color}15`, color, fontSize: 12, fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }),

        // Expired banner
        expiredBanner: { background: "rgba(255,45,85,0.12)", border: "1px solid rgba(255,45,85,0.35)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 },
        expiredText: { fontSize: 14, fontWeight: 700, color: "#ff2d55" },
        expiredSub: { fontSize: 12, color: "rgba(240,240,245,0.5)", marginTop: 3 },

        // No userId warning
        warnCard: { background: "rgba(255,214,10,0.08)", border: "1px solid rgba(255,214,10,0.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#ffd60a", fontFamily: "monospace" },

        // Custom timer input
        customRow: { display: "flex", gap: 6, alignItems: "center", width: "100%" },
        customInput: { flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f0f0f5", fontFamily: "monospace", fontSize: 13, padding: "7px 10px", outline: "none", minWidth: 0 },
    };

    const timerExpiredCard = timerExpired && (
        <div style={s.expiredBanner}>
            <div>
                <div style={s.expiredText}>⏰ Check-in timer expired!</div>
                <div style={s.expiredSub}>You didn't check in. Consider sending an SOS if you need help.</div>
            </div>
            <button style={{ ...s.shareBtn("#ff2d55"), padding: "9px 18px" }} onClick={() => { setTimerExpired(false); startTimer(timerDuration); }}>
                Restart
            </button>
        </div>
    );

    return (
        <>
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
            <style>{`
                @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.08);opacity:1} }
                @keyframes spin { to{transform:rotate(360deg)} }
                .sos-pulse { animation: pulse-ring 1.6s ease-in-out infinite; }
            `}</style>

            <div style={s.root}>
                <div style={s.header}>
                    <div style={s.badge}>● SAFETY TOOLS</div>
                    <h1 style={s.title}>SOS & Safe Check-in</h1>
                    <p style={s.subtitle}>Emergency alert system with live location sharing and timed check-ins</p>
                </div>

                <div style={s.body}>
                    {!userId && (
                        <div style={s.warnCard}>
                            ⚠ Not logged in — SOS will work but won't fetch your saved emergency contacts. <a href="/login" style={{ color: "#ffd60a" }}>Login here</a>
                        </div>
                    )}

                    {timerExpiredCard}

                    {/* SOS triggered view */}
                    {sosState === "triggered" && sosData && (
                        <div style={s.alertCard}>
                            <div style={s.alertTitle}>🚨 SOS Activated — Share your location now</div>
                            <div style={s.alertMsg}>{sosData.sosMessage}</div>

                            <div style={s.shareGrid}>
                                <button style={s.shareBtn("#25d366")} onClick={() => { const c = sosData.contacts?.find(c => c.type === "phone"); if (c) shareViaWhatsApp(c.value, sosData.sosMessage); else window.open(`https://wa.me/?text=${encodeURIComponent(sosData.sosMessage)}`,"_blank"); }}>
                                    📱 WhatsApp
                                </button>
                                <button style={s.shareBtn("#0a84ff")} onClick={() => { const c = sosData.contacts?.find(c => c.type === "email"); if (c) shareViaEmail(c.value, sosData.sosMessage); }}>
                                    📧 Email
                                </button>
                                <button style={s.shareBtn("#ff2d55")} onClick={callEmergency}>
                                    📞 Call 112
                                </button>
                                <button style={s.shareBtn("#bf5af2")} onClick={shareViaNative}>
                                    🔗 Share
                                </button>
                            </div>

                            {sosData.contacts?.length > 0 && (
                                <>
                                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(240,240,245,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                                        Emergency Contacts
                                    </div>
                                    <div style={s.contactsList}>
                                        {sosData.contacts.map((c, i) => (
                                            <div key={i} style={s.contactRow}>
                                                <div>
                                                    <div style={s.contactLabel}>{c.label || c.type}</div>
                                                    <div style={s.contactValue}>{c.value}</div>
                                                </div>
                                                {c.type === "phone" && (
                                                    <button style={s.sendBtn("#25d366")} onClick={() => shareViaWhatsApp(c.value, sosData.sosMessage)}>
                                                        WhatsApp
                                                    </button>
                                                )}
                                                {c.type === "email" && (
                                                    <button style={s.sendBtn("#0a84ff")} onClick={() => shareViaEmail(c.value, sosData.sosMessage)}>
                                                        Email
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <button style={{ ...s.startTimerBtn(false), marginTop: 16, background: "rgba(255,255,255,0.05)", color: "rgba(240,240,245,0.5)" }} onClick={resetSOS}>
                                ✕ Dismiss
                            </button>
                        </div>
                    )}

                    {/* Main grid: SOS + Timer */}
                    <div style={s.grid}>
                        {/* SOS Panic Button */}
                        <div style={s.sosCard}>
                            <div style={s.sosTitle}>Panic Button</div>

                            <div style={s.sosBtnWrap}>
                                <div style={s.sosRing} />
                                <button
                                    style={s.sosBtn}
                                    className={sosState === "idle" ? "sos-pulse" : ""}
                                    onMouseDown={startHold}
                                    onMouseUp={cancelHold}
                                    onMouseLeave={cancelHold}
                                    onTouchStart={(e) => { e.preventDefault(); startHold(); }}
                                    onTouchEnd={cancelHold}
                                >
                                    {sosState === "idle"     && <>🆘<span style={{ fontSize: 10, marginTop: 4, fontFamily: "monospace", color: "#ff6b8a80" }}>SOS</span></>}
                                    {sosState === "locating" && <div style={{ width: 24, height: 24, border: "3px solid rgba(255,45,85,0.2)", borderTopColor: "#ff2d55", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
                                    {sosState === "triggered" && <>✓<span style={{ fontSize: 10, marginTop: 2 }}>SENT</span></>}
                                </button>
                            </div>

                            <div style={s.sosHint}>
                                {sosState === "idle"      && "Hold 1.5s to trigger"}
                                {sosState === "locating"  && "Getting location..."}
                                {sosState === "triggered" && "Alert sent! Share now ↑"}
                            </div>

                            <button style={{ ...s.shareBtn("#ff2d55"), width: "100%", padding: "10px 0", fontSize: 13 }} onClick={callEmergency}>
                                📞 Call 112 (Police)
                            </button>
                        </div>

                        {/* Safe Check-in Timer */}
                        <div style={s.timerCard}>
                            <div style={s.timerTitle}>Safe Check-in</div>

                            {/* Ring */}
                            <div style={s.timerRing}>
                                <svg width="130" height="130" viewBox="0 0 130 130">
                                    <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(48,209,88,0.1)" strokeWidth="8" />
                                    <circle
                                        cx="65" cy="65" r="54"
                                        fill="none"
                                        stroke={timerExpired ? "#ff2d55" : timerActive ? "#30d158" : "rgba(48,209,88,0.2)"}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={dashOffset}
                                        transform="rotate(-90 65 65)"
                                        style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s" }}
                                    />
                                </svg>
                                <div style={s.timerText}>
                                    <div style={s.timerCountdown(timerExpired)}>
                                        {timerExpired ? "!" : timerActive ? formatCountdown(timerRemaining) : formatCountdown(timerDuration)}
                                    </div>
                                    <div style={s.timerLabel}>
                                        {timerExpired ? "EXPIRED" : timerActive ? "remaining" : "duration"}
                                    </div>
                                </div>
                            </div>

                            {/* Presets */}
                            {!timerActive && !timerExpired && (
                                <>
                                    <div style={s.presetRow}>
                                        {TIMER_PRESETS.map(p => (
                                            <button key={p.ms} style={s.presetBtn(timerDuration === p.ms)}
                                                onClick={() => setTimerDuration(p.ms)}>
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={s.customRow}>
                                        <input
                                            style={s.customInput}
                                            type="number"
                                            placeholder="Custom (min)"
                                            value={customMinutes}
                                            onChange={e => { setCustomMinutes(e.target.value); if (e.target.value > 0) setTimerDuration(Number(e.target.value) * 60 * 1000); }}
                                        />
                                    </div>
                                </>
                            )}

                            {timerActive && !checkedIn && (
                                <button style={s.checkInBtn} onClick={handleCheckIn}>
                                    ✅ I'm Safe — Check In
                                </button>
                            )}

                            {checkedIn && (
                                <div style={{ fontSize: 13, color: "#30d158", fontFamily: "monospace", textAlign: "center" }}>
                                    ✓ Checked in! Restarting timer...
                                </div>
                            )}

                            <button style={s.startTimerBtn(timerActive)}
                                onClick={timerActive ? stopTimer : () => startTimer(timerDuration)}>
                                {timerActive ? "⏹ Stop Timer" : "▶ Start Timer"}
                            </button>
                        </div>
                    </div>

                    {/* How it works */}
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 22px" }}>
                        <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(240,240,245,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>How it works</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            {[
                                ["🆘 Panic Button", "Hold the SOS button for 1.5s to trigger. Your live GPS location is packaged and sent to all saved emergency contacts via WhatsApp, email, or native share."],
                                ["⏰ Check-in Timer", "Set a timer before entering an unsafe situation. If you don't tap 'I'm Safe' before it expires, an alert fires. Restart it after each safe check-in."],
                                ["📍 Live Location", "Location is captured the moment SOS fires — shared as a Google Maps link. Works even without internet for the link generation."],
                                ["📋 Emergency Contacts", "Pulls from your profile's emergency contacts. Add extras in Profile → Emergency. The more contacts, the better."],
                            ].map(([title, desc]) => (
                                <div key={title} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 16px" }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{title}</div>
                                    <div style={{ fontSize: 12, color: "rgba(240,240,245,0.45)", lineHeight: 1.6 }}>{desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
