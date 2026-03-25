import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    MapContainer, TileLayer, Marker, Popup, Circle, useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const API_URL = process.env.REACT_APP_API_URL || "True";

// ── place type config ─────────────────────────────────────────────────────────
const PLACE_CONFIG = {
    police:   { label: "Police",   emoji: "👮", color: "#0a84ff", bg: "rgba(10,132,255,0.12)",  border: "rgba(10,132,255,0.35)"  },
    hospital: { label: "Hospital", emoji: "🏥", color: "#ff2d55", bg: "rgba(255,45,85,0.12)",   border: "rgba(255,45,85,0.35)"   },
    clinic:   { label: "Clinic",   emoji: "🩺", color: "#ff6b35", bg: "rgba(255,107,53,0.12)",  border: "rgba(255,107,53,0.35)"  },
    pharmacy: { label: "Pharmacy", emoji: "💊", color: "#30d158", bg: "rgba(48,209,88,0.12)",   border: "rgba(48,209,88,0.30)"   },
    fire:     { label: "Fire Stn", emoji: "🚒", color: "#ffd60a", bg: "rgba(255,214,10,0.10)",  border: "rgba(255,214,10,0.30)"  },
    shelter:  { label: "Shelter",  emoji: "🏠", color: "#bf5af2", bg: "rgba(191,90,242,0.12)",  border: "rgba(191,90,242,0.30)"  },
};

const RADIUS_OPTIONS = [
    { label: "500 m",  value: 500  },
    { label: "1 km",   value: 1000 },
    { label: "3 km",   value: 3000 },
    { label: "5 km",   value: 5000 },
];

// Fix leaflet default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom colored marker icon
function makeIcon(color, emoji) {
    return L.divIcon({
        className: "",
        html: `<div style="
            width:36px;height:36px;border-radius:50% 50% 50% 4px;
            background:${color};
            display:flex;align-items:center;justify-content:center;
            font-size:16px;
            box-shadow:0 2px 8px ${color}66;
            border:2px solid rgba(255,255,255,0.3);
            transform:rotate(-45deg);
        ">
            <span style="transform:rotate(45deg)">${emoji}</span>
        </div>`,
        iconSize:   [36, 36],
        iconAnchor: [18, 36],
        popupAnchor:[0, -38],
    });
}

function userIcon() {
    return L.divIcon({
        className: "",
        html: `<div style="
            width:18px;height:18px;border-radius:50%;
            background:#ff2d55;
            border:3px solid white;
            box-shadow:0 0 0 4px rgba(255,45,85,0.3);
        "></div>`,
        iconSize:   [18, 18],
        iconAnchor: [9, 9],
    });
}

// Auto-fit map bounds to markers
function FitBounds({ places, userLoc }) {
    const map = useMap();
    useEffect(() => {
        if (!userLoc) return;
        if (places.length === 0) {
            map.setView([userLoc.lat, userLoc.lng], 14);
            return;
        }
        const points = [[userLoc.lat, userLoc.lng], ...places.map(p => [p.lat, p.lng])];
        map.fitBounds(points, { padding: [48, 48], maxZoom: 15 });
    }, [places, userLoc, map]);
    return null;
}

// ── main component ────────────────────────────────────────────────────────────
export default function SafePlaces() {
    const [userLoc,   setUserLoc]   = useState(null);
    const [locError,  setLocError]  = useState(null);
    const [places,    setPlaces]    = useState([]);
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState(null);
    const [radius,    setRadius]    = useState(3000);
    const [activeTypes, setActiveTypes] = useState(
        new Set(["police", "hospital", "clinic", "pharmacy"])
    );
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [lastUpdated,   setLastUpdated]   = useState(null);

    // Get user location on mount
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocError("Geolocation not supported by your browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            ()  => setLocError("Location permission denied. Please allow location access."),
            { timeout: 8000 }
        );
    }, []);

    const toggleType = (type) => {
        setActiveTypes(prev => {
            const next = new Set(prev);
            if (next.has(type)) { if (next.size > 1) next.delete(type); }
            else next.add(type);
            return next;
        });
    };

    const fetchPlaces = useCallback(async (loc = userLoc) => {
        if (!loc) return;
        setLoading(true);
        setError(null);
        try {
            const types = Array.from(activeTypes).join(",");
            const res = await axios.get(`${API_URL}/api/v1/safeplaces`, {
                params: { lat: loc.lat, lng: loc.lng, radius, types },
            });
            setPlaces(res.data.places || []);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load safe places. Check your connection.");
        } finally {
            setLoading(false);
        }
    }, [userLoc, radius, activeTypes]);

    // Auto-fetch when location is available
    useEffect(() => {
        if (userLoc) fetchPlaces(userLoc);
    }, [userLoc]);

    const filteredPlaces = places.filter(p => activeTypes.has(p.type));

    // ── styles ────────────────────────────────────────────────────────────────
    const s = {
        root: { fontFamily: "'Outfit', 'Syne', sans-serif", background: "#090912", minHeight: "100vh", color: "#eeeef5" },

        header: {
            background: "linear-gradient(180deg,#0e0e1f 0%,#090912 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "24px 28px 20px",
        },
        badge: {
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(10,132,255,0.12)", border: "1px solid rgba(10,132,255,0.3)",
            borderRadius: 20, padding: "4px 14px", fontSize: 11,
            fontFamily: "monospace", color: "#5ac8fa", letterSpacing: "0.08em", marginBottom: 10,
        },
        title: {
            fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px",
            background: "linear-gradient(135deg,#ffffff 0%,#5ac8fa 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        },
        subtitle: { fontSize: 13, color: "rgba(238,238,245,0.4)", margin: 0 },

        // Controls bar
        controls: {
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10,
            padding: "14px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.015)",
        },
        typeBtn: (active, color) => ({
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            border: active ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.08)",
            background: active ? `${color}18` : "rgba(255,255,255,0.03)",
            color: active ? color : "rgba(238,238,245,0.45)",
        }),
        radiusRow: { display: "flex", gap: 6, marginLeft: "auto" },
        radiusBtn: (active) => ({
            padding: "7px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            cursor: "pointer", fontFamily: "monospace",
            border: active ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
            background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
            color: active ? "#eeeef5" : "rgba(238,238,245,0.35)",
        }),
        refreshBtn: {
            padding: "7px 16px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg,#0a84ff,#0060cc)",
            color: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
        },

        // Layout
        layout: { display: "grid", gridTemplateColumns: "340px 1fr", height: "calc(100vh - 170px)", minHeight: 500 },

        // Sidebar
        sidebar: { borderRight: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", display: "flex", flexDirection: "column" },
        sidebarHeader: { padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" },
        sidebarTitle: { fontSize: 11, fontFamily: "monospace", color: "rgba(238,238,245,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" },
        sidebarCount: { fontSize: 11, fontFamily: "monospace", color: "rgba(238,238,245,0.35)" },

        placeCard: (selected, color) => ({
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            cursor: "pointer", transition: "background 0.15s",
            background: selected ? `${color}12` : "transparent",
            borderLeft: selected ? `3px solid ${color}` : "3px solid transparent",
        }),
        placeTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 },
        placeName: { fontSize: 14, fontWeight: 600, lineHeight: 1.3, flex: 1, paddingRight: 8 },
        placeDist: (color) => ({
            fontSize: 11, fontFamily: "monospace", color, fontWeight: 700,
            background: `${color}18`, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap",
        }),
        placeType: (color) => ({
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 10, fontFamily: "monospace", color,
            background: `${color}12`, borderRadius: 4, padding: "2px 7px", marginBottom: 6,
        }),
        placeMeta: { fontSize: 12, color: "rgba(238,238,245,0.4)", lineHeight: 1.5 },
        placeActions: { display: "flex", gap: 6, marginTop: 8 },
        actionBtn: (color) => ({
            padding: "5px 12px", borderRadius: 7,
            border: `1px solid ${color}33`, background: `${color}10`,
            color, fontSize: 11, fontFamily: "inherit", fontWeight: 700, cursor: "pointer",
        }),

        // Map
        mapWrap: { position: "relative" },

        // States
        loadingOverlay: {
            position: "absolute", inset: 0, background: "rgba(9,9,18,0.75)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            zIndex: 500, gap: 12,
        },
        loadingText: { fontSize: 13, fontFamily: "monospace", color: "rgba(238,238,245,0.5)" },
        emptyState: {
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: 32, textAlign: "center", gap: 10,
        },
        errorBanner: {
            margin: "12px 18px", background: "rgba(255,45,85,0.08)",
            border: "1px solid rgba(255,45,85,0.25)", borderRadius: 10,
            padding: "12px 14px", fontSize: 12, color: "#ff6b8a", fontFamily: "monospace",
        },
        locErrorBanner: {
            margin: 24, background: "rgba(255,214,10,0.08)",
            border: "1px solid rgba(255,214,10,0.25)", borderRadius: 14,
            padding: "20px 22px", fontSize: 13, color: "#ffd60a",
        },
        liveTag: {
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10, fontFamily: "monospace", color: "#30d158",
            marginTop: 6,
        },
        liveDot: { width: 5, height: 5, borderRadius: "50%", background: "#30d158" },
    };

    const defaultCenter = userLoc
        ? [userLoc.lat, userLoc.lng]
        : [28.6139, 77.2090]; // Delhi fallback

    return (
        <>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                .place-card:hover { background: rgba(255,255,255,0.03) !important; }
                /* Dark map tiles */
                .leaflet-tile { filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.7); }
                /* Popup */
                .leaflet-popup-content-wrapper { background: #141428 !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 12px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; }
                .leaflet-popup-tip { background: #141428 !important; }
                .leaflet-popup-content { margin: 14px 16px !important; color: #eeeef5 !important; font-family: 'Outfit', sans-serif; }
                .leaflet-container { background: #090912; }
            `}</style>

            <div style={s.root}>
                {/* Header */}
                <div style={s.header}>
                    <div style={s.badge}>● NEARBY SAFETY</div>
                    <h1 style={s.title}>Safe Places Near You</h1>
                    <p style={s.subtitle}>Police stations, hospitals, clinics and shelters within your radius</p>
                    {lastUpdated && (
                        <div style={s.liveTag}>
                            <div style={s.liveDot} />
                            Updated {lastUpdated}
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div style={s.controls}>
                    {Object.entries(PLACE_CONFIG).map(([type, cfg]) => (
                        <button key={type} style={s.typeBtn(activeTypes.has(type), cfg.color)}
                            onClick={() => toggleType(type)}>
                            <span style={{ fontSize: 14 }}>{cfg.emoji}</span>
                            {cfg.label}
                            {activeTypes.has(type) && (
                                <span style={{ fontSize: 10, fontFamily: "monospace", opacity: 0.7 }}>
                                    ({filteredPlaces.filter(p => p.type === type).length})
                                </span>
                            )}
                        </button>
                    ))}
                    <div style={s.radiusRow}>
                        {RADIUS_OPTIONS.map(r => (
                            <button key={r.value} style={s.radiusBtn(radius === r.value)}
                                onClick={() => setRadius(r.value)}>
                                {r.label}
                            </button>
                        ))}
                        <button style={s.refreshBtn} onClick={() => fetchPlaces(userLoc)}
                            disabled={loading || !userLoc}>
                            {loading ? "..." : "↺ Search"}
                        </button>
                    </div>
                </div>

                {/* Location error */}
                {locError && (
                    <div style={s.locErrorBanner}>
                        📍 {locError}
                        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>
                            Allow location in your browser settings and refresh the page.
                        </div>
                    </div>
                )}

                {/* Main layout */}
                {!locError && (
                    <div style={s.layout}>
                        {/* Sidebar */}
                        <div style={s.sidebar}>
                            <div style={s.sidebarHeader}>
                                <span style={s.sidebarTitle}>Results</span>
                                <span style={s.sidebarCount}>
                                    {loading ? "Searching..." : `${filteredPlaces.length} found`}
                                </span>
                            </div>

                            {error && <div style={s.errorBanner}>⚠ {error}</div>}

                            {!loading && filteredPlaces.length === 0 && !error && (
                                <div style={s.emptyState}>
                                    <div style={{ fontSize: 36 }}>🗺️</div>
                                    <div style={{ fontSize: 13, color: "rgba(238,238,245,0.4)", lineHeight: 1.6 }}>
                                        {userLoc ? "No places found in this radius. Try increasing the search area." : "Waiting for your location..."}
                                    </div>
                                </div>
                            )}

                            {filteredPlaces.map(place => {
                                const cfg = PLACE_CONFIG[place.type] || { color: "#8e8e93", emoji: "📍", label: "Place" };
                                const isSelected = selectedPlace?.id === place.id;
                                return (
                                    <div key={place.id}
                                        className="place-card"
                                        style={s.placeCard(isSelected, cfg.color)}
                                        onClick={() => setSelectedPlace(isSelected ? null : place)}>
                                        <div style={s.placeTop}>
                                            <div style={s.placeName}>{place.name}</div>
                                            <div style={s.placeDist(cfg.color)}>{place.distanceText}</div>
                                        </div>
                                        <div style={s.placeType(cfg.color)}>
                                            {cfg.emoji} {cfg.label}
                                        </div>
                                        {place.address && (
                                            <div style={s.placeMeta}>📍 {place.address}</div>
                                        )}
                                        {place.phone && (
                                            <div style={s.placeMeta}>📞 {place.phone}</div>
                                        )}
                                        {place.openingHours && (
                                            <div style={s.placeMeta}>🕐 {place.openingHours}</div>
                                        )}
                                        <div style={s.placeActions}>
                                            <button style={s.actionBtn(cfg.color)}
                                                onClick={(e) => { e.stopPropagation(); window.open(place.mapsUrl, "_blank"); }}>
                                                Navigate
                                            </button>
                                            {place.phone && (
                                                <button style={s.actionBtn("#30d158")}
                                                    onClick={(e) => { e.stopPropagation(); window.open(`tel:${place.phone}`); }}>
                                                    Call
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Map */}
                        <div style={s.mapWrap}>
                            {loading && (
                                <div style={s.loadingOverlay}>
                                    <div style={{ width: 36, height: 36, border: "3px solid rgba(10,132,255,0.2)", borderTopColor: "#0a84ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                    <div style={s.loadingText}>Fetching nearby safe places...</div>
                                </div>
                            )}

                            <MapContainer
                                center={defaultCenter}
                                zoom={13}
                                style={{ height: "100%", width: "100%" }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {userLoc && filteredPlaces.length > 0 && (
                                    <FitBounds places={filteredPlaces} userLoc={userLoc} />
                                )}

                                {/* Search radius circle */}
                                {userLoc && (
                                    <Circle
                                        center={[userLoc.lat, userLoc.lng]}
                                        radius={radius}
                                        pathOptions={{
                                            color: "rgba(10,132,255,0.5)",
                                            fillColor: "rgba(10,132,255,0.04)",
                                            fillOpacity: 1,
                                            weight: 1,
                                            dashArray: "6 4",
                                        }}
                                    />
                                )}

                                {/* User location marker */}
                                {userLoc && (
                                    <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon()}>
                                        <Popup>
                                            <div style={{ fontFamily: "Outfit, sans-serif" }}>
                                                <strong style={{ color: "#ff2d55" }}>📍 Your location</strong>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}

                                {/* Place markers */}
                                {filteredPlaces.map(place => {
                                    const cfg = PLACE_CONFIG[place.type] || { color: "#8e8e93", emoji: "📍" };
                                    return (
                                        <Marker
                                            key={place.id}
                                            position={[place.lat, place.lng]}
                                            icon={makeIcon(cfg.color, cfg.emoji)}
                                            eventHandlers={{ click: () => setSelectedPlace(place) }}
                                        >
                                            <Popup>
                                                <div style={{ minWidth: 200, fontFamily: "Outfit, sans-serif" }}>
                                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: cfg.color }}>
                                                        {cfg.emoji} {place.name}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: "rgba(238,238,245,0.6)", marginBottom: 4 }}>
                                                        {cfg.label} · {place.distanceText} away
                                                    </div>
                                                    {place.address && (
                                                        <div style={{ fontSize: 12, color: "rgba(238,238,245,0.5)", marginBottom: 4 }}>
                                                            📍 {place.address}
                                                        </div>
                                                    )}
                                                    {place.phone && (
                                                        <div style={{ fontSize: 12, color: "rgba(238,238,245,0.5)", marginBottom: 8 }}>
                                                            📞 {place.phone}
                                                        </div>
                                                    )}
                                                    <div style={{ display: "flex", gap: 6 }}>
                                                        <a href={place.mapsUrl} target="_blank" rel="noreferrer"
                                                            style={{ padding: "5px 12px", borderRadius: 6, background: cfg.color, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                                                            Navigate
                                                        </a>
                                                        {place.phone && (
                                                            <a href={`tel:${place.phone}`}
                                                                style={{ padding: "5px 12px", borderRadius: 6, background: "rgba(48,209,88,0.2)", color: "#30d158", fontSize: 11, fontWeight: 700, textDecoration: "none", border: "1px solid rgba(48,209,88,0.3)" }}>
                                                                Call
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </MapContainer>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
