import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
    FileText, Sparkles, ArrowRight, TrendingUp,
    Plus, Target, Bot, X, Loader2, ArrowLeft
} from 'lucide-react';
import AIAssistant from '../components/AIAssistant';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';

/* ─────────────────────────────────────────────
   Stat Card
   ───────────────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, accent, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        style={{
            background: 'var(--bg-card)',
            backdropFilter: 'var(--blur)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
        }}
        whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
    >
        {/* glow orb */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: '100px', height: '100px', background: accent, filter: 'blur(40px)', opacity: 0.25, borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.55rem', borderRadius: '0.75rem', background: `${accent}18`, color: accent, border: `1px solid ${accent}25`, display: 'flex' }}>
                <Icon size={20} />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '600' }}>{title}</span>
        </div>

        <div style={{ fontSize: '2.75rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
            {value}
        </div>
    </motion.div>
);

/* ─────────────────────────────────────────────
   Resume Card
   ───────────────────────────────────────────── */
const ResumeCard = ({ resume, navigate }) => {
    const scoreColor = resume.atsScore >= 70 ? 'var(--success-light)'
        : resume.atsScore >= 50 ? 'var(--warning)'
            : resume.atsScore > 0 ? 'var(--error-light)'
                : 'var(--text-faint)';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -5, borderColor: 'var(--primary)' }}
            onClick={() => navigate(`/editor/${resume._id}`)}
            style={{
                background: 'var(--bg-card)',
                backdropFilter: 'var(--blur)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                height: '220px',
                transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)', display: 'grid', placeItems: 'center', color: 'var(--primary-light)' }}>
                    <FileText size={20} />
                </div>
                {resume.atsScore > 0 && (
                    <span style={{ padding: '0.25rem 0.7rem', borderRadius: '9999px', background: `${scoreColor}18`, border: `1px solid ${scoreColor}44`, color: scoreColor, fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target size={12} /> {resume.atsScore}%
                    </span>
                )}
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.3rem', lineHeight: 1.3 }}>
                    {resume.title || 'Untitled Resume'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                    Edited {new Date(resume.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>A4 PDF</span>
                <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'grid', placeItems: 'center', color: 'white', boxShadow: '0 4px 12px var(--primary-glow)' }}>
                    <ArrowRight size={16} />
                </motion.div>
            </div>
        </motion.div>
    );
};

/* ─────────────────────────────────────────────
   SVG Trend Chart
   ───────────────────────────────────────────── */
const TrendChart = ({ data }) => {
    if (!data || data.length < 2) return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', gap: '0.5rem' }}>
            <TrendingUp size={24} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: '0.85rem' }}>Not enough data yet</span>
        </div>
    );

    const height = 140;
    const width = 1000;
    const padding = 20;
    const scores = data.map(d => d.score);
    const minScore = Math.min(...scores, 0);
    const maxScore = 100;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((d.score - minScore) / (maxScore - minScore)) * (height - padding * 2) - padding;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(124,58,237,0.35)" />
                        <stop offset="100%" stopColor="rgba(124,58,237,0)" />
                    </linearGradient>
                </defs>
                <path d={`M${padding},${height} L${points.split(' ')[0]} ${points} L${width - padding},${height} Z`} fill="url(#chartGrad)" />
                <polyline points={points} fill="none" stroke="var(--primary-light)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 6px var(--primary-glow))' }} />
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
                    const y = height - ((d.score - minScore) / (maxScore - minScore)) * (height - padding * 2) - padding;
                    return <circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 5 : 3} fill={i === data.length - 1 ? 'var(--text-main)' : 'var(--primary-light)'} stroke="var(--primary-light)" strokeWidth="2" />;
                })}
            </svg>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Dashboard Page
   ───────────────────────────────────────────── */
const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [resumes, setResumes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('desc');
    const [showChat, setShowChat] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchResumes = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) { navigate('/login'); return; }
                const res = await axios.get('http://localhost:5000/api/resumes', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setResumes(res.data.data);
            } catch (err) {
                console.error("Failed to fetch resumes", err);
                if (err.response?.status === 401) logout();
            } finally {
                setIsLoading(false);
            }
        };
        fetchResumes();
    }, [navigate, logout]);

    const stats = {
        total: resumes.length,
        avgScore: resumes.length > 0 ? Math.round(resumes.reduce((a, b) => a + (b.atsScore || 0), 0) / resumes.length) : 0,
        topScore: resumes.length > 0 ? Math.max(...resumes.map(r => r.atsScore || 0)) : 0
    };

    const trendData = [...resumes]
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
        .map(r => ({ date: r.updatedAt, score: r.atsScore || 0 }));

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const firstName = user?.name?.split(' ')[0] || 'Creator';

    return (
        <div className="page-wrapper">
            <div className="ambient-bg" />
            <Navbar />

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '8rem 1.5rem 5rem', position: 'relative', zIndex: 1 }}>

                {/* Navigation / Back Button */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ marginBottom: '1.5rem' }}
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="ghost-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                </motion.div>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '3rem' }}
                >
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.4rem' }}>{getGreeting()},</p>
                        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: '800', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '0.75rem', fontFamily: "'Outfit', sans-serif" }}>
                            <span style={{ color: 'var(--text-main)' }}>Welcome back,{' '}</span>
                            <span style={{ background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{firstName}</span>
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                            Your resumes are performing{' '}
                            <span style={{ color: stats.avgScore > 70 ? 'var(--success-light)' : 'var(--primary-light)', fontWeight: '600' }}>
                                {stats.avgScore > 70 ? 'excellently' : 'steadily'}.
                            </span>
                        </p>
                    </div>

                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <motion.button
                            whileHover={{ scale: 1.04, boxShadow: '0 0 30px var(--primary-glow)' }}
                            whileTap={{ scale: 0.96 }}
                            className="glow-btn"
                            style={{ fontSize: '1rem', padding: '0.9rem 1.75rem' }}
                        >
                            <Plus size={20} strokeWidth={2.5} /> New Resume
                        </motion.button>
                    </Link>
                </motion.div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
                    {/* Smal stat cards */}
                    <StatCard title="Total Resumes" value={stats.total} icon={FileText} accent="var(--primary)" delay={0.1} />
                    <StatCard title="Avg. ATS Score" value={stats.avgScore} icon={Target} accent="var(--secondary)" delay={0.2} />
                    <StatCard title="Top ATS Score" value={stats.topScore} icon={TrendingUp} accent="var(--success)" delay={0.3} />
                </div>

                {/* Trend Chart Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="glass-card"
                    style={{ padding: '1.5rem', marginBottom: '3rem' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.4rem', borderRadius: '0.6rem', background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}>
                                <TrendingUp size={18} />
                            </div>
                            <span style={{ fontWeight: '700', color: 'var(--text-sub)', fontSize: '0.9rem' }}>Score Trend</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', background: 'var(--bg-elevated)', padding: '0.2rem 0.7rem', borderRadius: '9999px' }}>Last 10 updates</span>
                    </div>
                    <div style={{ height: '140px' }}>
                        <TrendChart data={trendData} />
                    </div>
                </motion.div>

                {/* Resumes Section */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', fontFamily: "'Outfit', sans-serif" }}>Your Resumes</h2>
                        <button
                            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="ghost-btn"
                        >
                            Sort {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
                        </button>
                    </div>

                    {isLoading ? (
                        <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
                            <p style={{ fontWeight: '600' }}>Loading your resumes...</p>
                        </div>
                    ) : resumes.length === 0 ? (
                        <div style={{ padding: '5rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius-xl)', textAlign: 'center', background: 'var(--bg-card)' }}>
                            <div style={{ width: '64px', height: '64px', background: 'var(--bg-elevated)', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'grid', placeItems: 'center' }}>
                                <FileText size={28} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>No resumes yet</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Create your first ATS-optimized resume to get started.</p>
                            <Link to="/" className="glow-btn" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                                <Plus size={18} /> Create First Resume
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                            {resumes
                                .sort((a, b) => {
                                    const dateA = new Date(a.updatedAt);
                                    const dateB = new Date(b.updatedAt);
                                    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                                })
                                .map(resume => (
                                    <ResumeCard key={resume._id} resume={resume} navigate={navigate} />
                                ))}

                            {/* New resume card */}
                            <motion.div
                                whileHover={{ scale: 1.02, borderColor: 'var(--primary)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/')}
                                style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', height: '220px', color: 'var(--text-faint)', transition: 'all 0.2s ease', background: 'var(--bg-card)' }}
                            >
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'grid', placeItems: 'center', marginBottom: '0.875rem', transition: 'background 0.2s' }}>
                                    <Plus size={22} />
                                </div>
                                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Create New Resume</span>
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </main>

            {/* Floating AI Chat */}
            <div style={{ position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 1000 }}>
                <AnimatePresence mode="wait">
                    {!showChat ? (
                        <motion.button
                            key="chat-trigger"
                            initial={{ opacity: 0, rotate: -45 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 45 }}
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => setShowChat(true)}
                            className="animate-glow"
                            style={{ width: '62px', height: '62px', borderRadius: '50%', background: 'var(--gradient-primary)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 32px var(--primary-glow)' }}
                        >
                            <Bot size={28} />
                        </motion.button>
                    ) : (
                        <motion.div
                            key="chat-window"
                            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            style={{ width: '420px', height: '600px', background: 'var(--nav-bg)', backdropFilter: 'var(--blur)', WebkitBackdropFilter: 'var(--blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}
                        >
                            <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-light)' }} />
                                    <span style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--primary-light)' }}>AI ASSISTANT</span>
                                </div>
                                <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <AIAssistant />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Responsive styles for Dashboard */}
            <style>{`
                @media (max-width: 768px) {
                    main > div:first-child > div:first-child > :first-child { font-size: 2rem !important; }
                }
                @media (max-width: 640px) {
                    main > div:nth-child(2) { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 480px) {
                    main > div:nth-child(2) { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
