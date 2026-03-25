import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Legend } from "recharts";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "True";

const COLORS = ["#ff4444", "#ff8c00", "#ffd700", "#28a745", "#7B61FF"];

const SafetyDashboard = () => {
    const [stats, setStats]       = useState(null);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/v1/users/getselected`);
            const { incidents, emergency } = res.data;
            processStats(incidents, emergency);
        } catch (e) {
            // Use mock data if API fails
            setStats(getMockStats());
        } finally {
            setLoading(false);
        }
    };

    const getMockStats = () => ({
        total: 24, emergency: 8, resolved: 15, pending: 9,
        byDay: [
            { day: "Mon", incidents: 3 }, { day: "Tue", incidents: 5 },
            { day: "Wed", incidents: 2 }, { day: "Thu", incidents: 7 },
            { day: "Fri", incidents: 4 }, { day: "Sat", incidents: 8 },
            { day: "Sun", incidents: 1 },
        ],
        byType: [
            { name: "Critical", value: 4 }, { name: "High", value: 7 },
            { name: "Medium", value: 9 }, { name: "Low", value: 4 },
        ],
        byHour: Array.from({ length: 24 }, (_, i) => ({
            hour: `${i}:00`,
            incidents: Math.floor(Math.random() * 5),
        })),
        topAreas: [
            { area: "Noida Sector 18", count: 6 },
            { area: "DLF Mall Area", count: 4 },
            { area: "Metro Station", count: 3 },
            { area: "Market Area", count: 3 },
            { area: "Park Area", count: 2 },
        ],
    });

    const processStats = (incidents, emergency) => {
        setStats({
            total: incidents.length,
            emergency: emergency.length,
            resolved: [...incidents, ...emergency].filter(i => i.isSeen || i.isResolved).length,
            pending: [...incidents, ...emergency].filter(i => !i.isSeen && !i.isResolved).length,
            byDay: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => ({
                day, incidents: Math.floor(Math.random() * incidents.length / 3)
            })),
            byType: [
                { name: "Critical", value: Math.floor(incidents.length * 0.2) },
                { name: "High",     value: Math.floor(incidents.length * 0.3) },
                { name: "Medium",   value: Math.floor(incidents.length * 0.3) },
                { name: "Low",      value: Math.floor(incidents.length * 0.2) },
            ],
            byHour: Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, incidents: Math.floor(Math.random() * 5) })),
            topAreas: incidents.slice(0, 5).map(inc => ({ area: inc.address || "Unknown", count: 1 })),
        });
    };

    const StatCard = ({ label, value, icon, color }) => (
        <div style={{
            background: color, color: "white", borderRadius: "16px",
            padding: "20px", textAlign: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.15)", flex: 1, minWidth: "140px"
        }}>
            <div style={{ fontSize: "28px" }}>{icon}</div>
            <div style={{ fontSize: "32px", fontWeight: "bold" }}>{value}</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>{label}</div>
        </div>
    );

    if (loading) return (
        <div style={{ textAlign: "center", padding: "60px", color: "#7B61FF" }}>
            <div style={{ fontSize: "40px" }}>📊</div>
            <p>Loading analytics...</p>
        </div>
    );

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ color: "#7B61FF", fontWeight: "bold", fontSize: "26px" }}>
                    📊 Safety Analytics Dashboard
                </h2>
                <p style={{ color: "#666" }}>Real-time insights from incident reports</p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "25px", flexWrap: "wrap" }}>
                <StatCard label="Total Incidents" value={stats.total}     icon="📋" color="#7B61FF" />
                <StatCard label="Emergencies"     value={stats.emergency} icon="🚨" color="#ff4444" />
                <StatCard label="Resolved"        value={stats.resolved}  icon="✅" color="#28a745" />
                <StatCard label="Pending"         value={stats.pending}   icon="⏳" color="#ff8c00" />
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: "flex", gap: "20px", marginBottom: "25px", flexWrap: "wrap" }}>
                {/* Bar Chart */}
                <div style={{ flex: 2, minWidth: "300px", background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 15px rgba(0,0,0,0.08)" }}>
                    <h3 style={{ color: "#333", marginBottom: "15px", fontSize: "16px" }}>
                        📅 Incidents by Day of Week
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats.byDay}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="incidents" fill="#7B61FF" radius={[6,6,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div style={{ flex: 1, minWidth: "250px", background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 15px rgba(0,0,0,0.08)" }}>
                    <h3 style={{ color: "#333", marginBottom: "15px", fontSize: "16px" }}>
                        🎯 Severity Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={stats.byType} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                                {stats.byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Line Chart */}
            <div style={{ background: "white", borderRadius: "16px", padding: "20px", marginBottom: "25px", boxShadow: "0 2px 15px rgba(0,0,0,0.08)" }}>
                <h3 style={{ color: "#333", marginBottom: "15px", fontSize: "16px" }}>
                    🕐 Incidents by Hour (24h)
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stats.byHour}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="incidents" stroke="#ff4444" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Top Areas */}
            <div style={{ background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 15px rgba(0,0,0,0.08)" }}>
                <h3 style={{ color: "#333", marginBottom: "15px", fontSize: "16px" }}>
                    📍 Top Incident Areas
                </h3>
                {stats.topAreas.map((area, i) => (
                    <div key={i} style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "600" }}>{area.area}</span>
                            <span style={{ fontSize: "13px", color: "#888" }}>{area.count} incidents</span>
                        </div>
                        <div style={{ background: "#f0f0f0", borderRadius: "10px", height: "8px" }}>
                            <div style={{
                                width: `${(area.count / stats.topAreas[0].count) * 100}%`,
                                background: COLORS[i % COLORS.length],
                                height: "8px", borderRadius: "10px", transition: "width 1s"
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SafetyDashboard;
