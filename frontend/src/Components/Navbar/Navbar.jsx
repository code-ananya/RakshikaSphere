import React, { useEffect, useState, useRef } from 'react'
import { BiMenuAltRight, BiChevronDown } from 'react-icons/bi'
import { Link, useLocation } from "react-router-dom"
import toast from 'react-hot-toast'
import '../../styles/navbar.css'
import { useAuth } from '../../context/auth'
import { useDarkMode } from '../../context/DarkModeContext'

const SAFETY_TOOLS = [
    {
        group: "🚨 Emergency",
        items: [
            { path: "/sos",       label: "SOS Panic Button",   desc: "Instant alert to contacts" },
            { path: "/emergency", label: "Emergency Contacts",  desc: "Quick dial & info" },
            { path: "/fakecall",  label: "Fake Call",           desc: "Escape unsafe situations" },
        ]
    },
    {
        group: "🗺️ Maps & Routes",
        items: [
            { path: "/safeplaces",     label: "Safe Places Near Me", desc: "Police, hospitals, shelters" },
            { path: "/dangerzones",    label: "Danger Zone Map",      desc: "AI-powered risk heatmap" },
            { path: "/saferoute",      label: "Safe Route",           desc: "Avoid high-risk areas" },
            { path: "/live-location",  label: "Live Location",        desc: "Share real-time location" },
        ]
    },
    {
        group: "🧠 AI Tools",
        items: [
            { path: "/classifier", label: "Threat Classifier",  desc: "Auto-classify incidents" },
            { path: "/violence",   label: "Violence Detector",  desc: "Analyze text & images" },
        ]
    },
    {
        group: "🛡️ Safety Modes",
        items: [
            { path: "/voice-sos",  label: "Voice SOS",    desc: "Say 'Help me' to trigger SOS" },
            { path: "/safe-walk",  label: "Safe Walk",    desc: "Auto-alert if no check-in" },
            { path: "/emotion-sos", label: "Emotion Detection", desc: "Facial distress detection" },
{ path: "/scream-sos",  label: "Scream Detection",  desc: "Auto SOS on loud sounds" },
        ]
    },
    {
        group: "📋 Reports",
        items: [
            { path: "/report",     label: "Report Incident", desc: "Submit a safety report" },
            { path: "/incident",   label: "View Reports",    desc: "Browse all incidents" },
            { path: "/chat",       label: "Safety Chat",     desc: "Talk to our assistant" },
            { path: "/analytics",  label: "Analytics",       desc: "Safety insights & charts" },

        ]
    },
];

const Navbar = () => {
    const [auth, setAuth] = useAuth();
    const { darkMode, toggleDarkMode } = useDarkMode();
    const [color, setColor] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const location = useLocation();

    const handleSubmit = () => {
        setAuth({ ...auth, user: null, token: '' });
        localStorage.removeItem('auth');
        toast.success('Logged Out Successfully');
    };

    useEffect(() => {
        const changeColor = () => setColor(window.scrollY >= 90);
        window.addEventListener('scroll', changeColor);
        return () => window.removeEventListener('scroll', changeColor);
    }, []);

    useEffect(() => {
        const navBar = document.querySelectorAll(".nav-link");
        const navCollapse = document.querySelector(".navbar-collapse.collapse");
        const handleNavClick = () => navCollapse?.classList.remove("show");
        navBar.forEach(a => a.addEventListener("click", handleNavClick));
        return () => navBar.forEach(a => a.removeEventListener("click", handleNavClick));
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => { setDropdownOpen(false); }, [location]);

    const isLoggedIn = !!auth?.user;
    const isAdmin    = auth?.user?.role === 1;

    const dropStyles = {
        wrapper: { position: 'relative', display: 'inline-block' },
        menu: {
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '720px',
            maxWidth: '95vw',
            background: '#0f0f1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            padding: '20px',
            zIndex: 9999,
            display: dropdownOpen ? 'grid' : 'none',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
        },
        group: { marginBottom: '4px' },
        groupLabel: {
            fontSize: '11px', fontWeight: '700',
            color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em',
            textTransform: 'uppercase', padding: '6px 10px 4px', fontFamily: 'monospace',
        },
        item: {
            display: 'flex', flexDirection: 'column', padding: '10px 12px',
            borderRadius: '10px', textDecoration: 'none', transition: 'background 0.15s', cursor: 'pointer',
        },
        itemName: { fontSize: '13px', fontWeight: '700', color: '#f0f0f5', marginBottom: '2px' },
        itemDesc: { fontSize: '11px', color: 'rgba(240,240,245,0.4)', fontFamily: 'monospace' },
        divider: { gridColumn: '1 / -1', height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' },
        sosHighlight: {
            background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.25)',
            borderRadius: '10px', gridColumn: '1 / -1', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', marginBottom: '8px', textDecoration: 'none',
        },
    };

    const SafetyDropdown = () => (
        <div style={dropStyles.wrapper} ref={dropdownRef}>
            <button
                className="safety-tools-btn"
                onClick={() => setDropdownOpen(prev => !prev)}
            >
                🛡️ Safety Tools
                <BiChevronDown
                    size={20}
                    style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                />
            </button>

            <div style={dropStyles.menu}>
                {/* SOS Highlight */}
                <Link to="/sos" style={dropStyles.sosHighlight}>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#ff6b8a' }}>
                            🆘 SOS Panic Button
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,107,138,0.6)', fontFamily: 'monospace', marginTop: 2 }}>
                            Hold to send emergency alert with live location
                        </div>
                    </div>
                    <div style={{ fontSize: '11px', background: 'rgba(255,45,85,0.2)', border: '1px solid rgba(255,45,85,0.4)', borderRadius: '6px', padding: '4px 10px', color: '#ff2d55', fontWeight: '700', fontFamily: 'monospace' }}>
                        EMERGENCY
                    </div>
                </Link>

                <div style={dropStyles.divider} />

                {/* All Groups except Emergency */}
                {SAFETY_TOOLS.filter(g => g.group !== "🚨 Emergency").map((group, gi) => (
                    <div key={gi} style={dropStyles.group}>
                        <div style={dropStyles.groupLabel}>{group.group}</div>
                        {group.items.map((item, ii) => (
                            <Link key={ii} to={item.path} style={dropStyles.item}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <span style={dropStyles.itemName}>{item.label}</span>
                                <span style={dropStyles.itemDesc}>{item.desc}</span>
                            </Link>
                        ))}
                    </div>
                ))}

                {/* Emergency group (without SOS) */}
                <div style={dropStyles.group}>
                    <div style={dropStyles.groupLabel}>🚨 Emergency</div>
                    {SAFETY_TOOLS.find(g => g.group === "🚨 Emergency")
                        ?.items.filter(i => i.path !== "/sos")
                        .map((item, ii) => (
                            <Link key={ii} to={item.path} style={dropStyles.item}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <span style={dropStyles.itemName}>{item.label}</span>
                                <span style={dropStyles.itemDesc}>{item.desc}</span>
                            </Link>
                        ))
                    }
                </div>
            </div>
        </div>
    );

    const commonLinks = (
        <>
            <Link to='/' style={{ textDecoration: 'none' }}>
                <li className="nav-item"><a className="nav-link" aria-current="page">Home</a></li>
            </Link>
            <Link to='/about' style={{ textDecoration: 'none' }}>
                <li className="nav-item"><a className="nav-link" aria-current="page">About Us</a></li>
            </Link>
            <Link to='/contact' style={{ textDecoration: 'none' }}>
                <li className="nav-item"><a className="nav-link" aria-current="page">Contact Us</a></li>
            </Link>
        </>
    );

    // Dark mode toggle button
    const DarkModeToggle = () => (
        <button
            onClick={toggleDarkMode}
            className="dark-mode-toggle"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {darkMode ? "☀️" : "🌙"}
        </button>
    );

    return (
        <>
            {auth?.user?.role ? (
                <header className='header_wrapper'>
                    <nav className="navbar navbar-expand-lg fixed-top">
                        <div className="container-fluid mx-3">
                            <Link to='/' style={{ textDecoration: 'none' }}>
                                <span style={{ fontSize: '22px', fontWeight: 'bold', color: 'white' }}>RakshikaSphere</span>
                            </Link>
                            <button className="navbar-toggler pe-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                                <BiMenuAltRight size={35} />
                            </button>
                            <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                                <ul className="navbar-nav menu-navbar-nav">{commonLinks}</ul>
                                <ul style={{ display: 'flex', alignItems: 'center', listStyle: 'none', margin: '0 12px', padding: 0 }}>
                                    <li><SafetyDropdown /></li>
                                </ul>
                                <ul style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
                                    <li><DarkModeToggle /></li>
                                    <Link to={`/dashboard${isAdmin ? "/" : "/profile"}`} style={{ textDecoration: 'none' }} className="nav-item text-center">
                                        <a className="nav-link learn-more-btn" aria-current="page">Dashboard</a>
                                    </Link>
                                    <Link onClick={handleSubmit} to='/login' style={{ textDecoration: 'none' }} className="nav-item text-center">
                                        <a className="nav-link learn-more-btn-logout" aria-current="page">Logout</a>
                                    </Link>
                                </ul>
                            </div>
                        </div>
                    </nav>
                </header>
            ) : (
                <header className='header_wrapper'>
                    <nav className="navbar navbar-expand-lg fixed-top">
                        <div className="container-fluid mx-3">
                            <Link to='/' style={{ textDecoration: 'none' }}>
                                <span style={{ fontSize: '22px', fontWeight: 'bold', color: 'white' }}>RakshikaSphere</span>
                            </Link>
                            <button className="navbar-toggler pe-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                                <BiMenuAltRight size={35} />
                            </button>
                            <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                                <ul className="navbar-nav menu-navbar-nav">
                                    <Link to='/emergency' style={{ textDecoration: 'none' }} className="nav-item text-center">
                                        <a className="nav-link learn-more-btn-logout" aria-current="page">Emergency</a>
                                    </Link>
                                    {commonLinks}
                                    <Link to='/report' style={{ textDecoration: 'none' }}>
                                        <li className="nav-item"><a className="nav-link" aria-current="page">Report Incident</a></li>
                                    </Link>
                                </ul>
                                <ul style={{ display: 'flex', alignItems: 'center', listStyle: 'none', margin: '0 12px', padding: 0 }}>
                                    <li><SafetyDropdown /></li>
                                </ul>
                                {!isLoggedIn ? (
                                    <ul style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
                                        <li><DarkModeToggle /></li>
                                        <Link to='/login' style={{ textDecoration: 'none' }} className="nav-item text-center">
                                            <a className="nav-link learn-more-btn btn-extra-header" aria-current="page">Login</a>
                                        </Link>
                                        <Link to='/register' style={{ textDecoration: 'none' }} className="nav-item text-center">
                                            <a className="nav-link learn-more-btn" aria-current="page">Register</a>
                                        </Link>
                                    </ul>
                                ) : (
                                    <ul style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
                                        <li><DarkModeToggle /></li>
                                        <Link to={`/dashboard/${isAdmin ? "/" : "profile"}`} style={{ textDecoration: 'none' }} className="nav-item text-center">
                                            <a className="nav-link learn-more-btn" aria-current="page">Profile</a>
                                        </Link>
                                        <Link onClick={handleSubmit} to='/login' style={{ textDecoration: 'none' }} className="nav-item text-center">
                                            <a className="nav-link learn-more-btn-logout" aria-current="page">Logout</a>
                                        </Link>
                                    </ul>
                                )}
                            </div>
                        </div>
                    </nav>
                </header>
            )}
        </>
    );
};

export default Navbar;
