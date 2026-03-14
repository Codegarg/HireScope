import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
    FileText, Sparkles, ArrowRight, TrendingUp,
    Plus, Target, Bot, X, Loader2, ArrowLeft,
    Clock, RotateCcw, Eye, Download, ChevronDown, ChevronUp, AlertTriangle, History
} from 'lucide-react';

import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';

/* ─────────────────────────────────────────────
   Stat Card
   ───────────────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, accent, delay, style = {} }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="glass-card"
        style={{
            padding: '1.5rem',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            ...style
        }}
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
const ResumeCard = ({ resume, navigate, onRestore, onDownload, onPreview, isRestoring, isSelected }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const scoreColor = resume.atsScore >= 70 ? 'var(--success-light)'
        : resume.atsScore >= 50 ? 'var(--warning)'
            : resume.atsScore > 0 ? 'var(--error-light)'
                : 'var(--text-faint)';

    const sortedVersions = [...(resume.versions || [])].sort((a, b) => b.versionNumber - a.versionNumber);
    const latestVersion = sortedVersions[0] || { versionNumber: 1, createdAt: resume.createdAt };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
                opacity: 1,
                scale: 1,
                borderColor: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                boxShadow: isSelected ? '0 0 30px rgba(124, 58, 237, 0.2)' : 'var(--shadow-md)'
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card"
            style={{
                padding: '1.25rem',
                display: 'flex', flexDirection: 'column',
                gap: '1rem',
                position: 'relative'
            }}
        >
            {/* Top Row: Icon & Score */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)', display: 'grid', placeItems: 'center', color: 'var(--primary-light)' }}>
                    <FileText size={18} />
                </div>
                {resume.atsScore > 0 && (
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', background: `${scoreColor}12`, border: `1px solid ${scoreColor}33`, color: scoreColor, fontSize: '0.72rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target size={11} /> {resume.atsScore}% Match
                    </span>
                )}
            </div>

            {/* Content: Title & Meta */}
            <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.25rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {resume.title || 'Untitled Resume'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={12} /> Edited {new Date(resume.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
            </div>

            {/* Action Buttons: Direct access */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/editor/${resume._id}`); }}
                    className="glow-btn"
                    style={{ padding: '0.55rem', fontSize: '0.8rem', width: '100%', justifyContent: 'center', gap: '0.4rem' }}
                >
                    <FileText size={14} /> Edit
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => { e.stopPropagation(); onDownload(resume._id, latestVersion.versionNumber); }}
                    className="ghost-btn"
                    style={{ padding: '0.55rem', fontSize: '0.8rem', width: '100%', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', gap: '0.4rem' }}
                >
                    <Download size={14} /> Export
                </motion.button>
            </div>

            {/* Versions Toggler */}
            <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)',
                    width: '100%', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', color: 'var(--text-sub)', fontSize: '0.78rem', cursor: 'pointer', padding: '0.5rem 0.75rem',
                    transition: 'all 0.2s'
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
                    <History size={13} />
                    {resume.versions?.length || 1} Version{(resume.versions?.length || 1) !== 1 ? 's' : ''}
                </span>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Expanded Version History */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: '0.4rem' }}>
                            {sortedVersions.map((v, idx) => (
                                <div key={`${v.versionNumber}-${idx}`} style={{ padding: '0.5rem 0.65rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: idx === 0 ? 'var(--primary-light)' : 'var(--text-main)' }}>
                                            v{v.versionNumber} {idx === 0 && '• Active'}
                                        </span>
                                        <span style={{ fontSize: '0.62rem', color: 'var(--text-faint)' }}>{new Date(v.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.15rem' }}>
                                        <button onClick={(e) => { e.stopPropagation(); onPreview(resume._id, v.versionNumber); }} title="Quick Preview" style={{ padding: '0.3rem', background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}><Eye size={12} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDownload(resume._id, v.versionNumber); }} title="Download PDF" style={{ padding: '0.3rem', background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}><Download size={12} /></button>
                                        {idx !== 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRestore(resume._id, v.versionNumber); }}
                                                disabled={isRestoring}
                                                title="Make this current active version"
                                                style={{ padding: '0.3rem', background: 'transparent', border: 'none', color: 'var(--error-light)', cursor: 'pointer', opacity: isRestoring ? 0.3 : 1 }}
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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
   Skeleton Loaders
   ───────────────────────────────────────────── */
const SkeletonCard = () => (
    <div className="skeleton-card">
        {/* Icon + Badge row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="skeleton-base skeleton-avatar" />
            <div className="skeleton-base skeleton-badge" />
        </div>

        {/* Title lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
            <div className="skeleton-base skeleton-line skeleton-line-medium" />
            <div className="skeleton-base skeleton-line skeleton-line-short" />
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* Action button row */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="skeleton-base skeleton-line" style={{ flex: 1, height: '32px', borderRadius: '0.5rem' }} />
            <div className="skeleton-base skeleton-line" style={{ flex: 1, height: '32px', borderRadius: '0.5rem' }} />
        </div>
    </div>
);

const SkeletonGrid = ({ count = 6 }) => (
    <div className="dashboard-grid">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </div>
);

/* ─────────────────────────────────────────────
   Dashboard Page
   ───────────────────────────────────────────── */
const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [resumes, setResumes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedResume, setSelectedResume] = useState(null);

    // Version specific state
    const [isRestoring, setIsRestoring] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    const navigate = useNavigate();

    const handleRestore = async (resumeId, versionNumber) => {
        if (!window.confirm(`Are you sure you want to restore Version ${versionNumber}? This will create a new 'restored' version as your current resume.`)) return;

        setIsRestoring(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`http://localhost:5000/api/resumes/${resumeId}/restore/${versionNumber}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update the local list
            setResumes(prev => prev.map(r => r._id === resumeId ? res.data.data : r));
            alert("Version restored successfully!");
        } catch (err) {
            console.error("Restore failed", err);
            alert("Failed to restore version: " + (err.response?.data?.message || err.message));
        } finally {
            setIsRestoring(false);
        }
    };

    const handleDownload = (resumeId, versionNumber) => {
        const token = localStorage.getItem('token');
        window.location.href = `http://localhost:5000/api/resumes/${resumeId}/version/${versionNumber}/download?token=${token}`;
    };

    const openPreview = (resumeId, versionNumber) => {
        const token = localStorage.getItem('token');
        setPreviewUrl(`http://localhost:5000/api/resumes/${resumeId}/version/${versionNumber}/view?token=${token}`);
        setIsPreviewOpen(true);
    };

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
                if (err.response?.status === 401) {
                    logout();
                    navigate('/login');
                } else {
                    setFetchError("Unable to connect to the server. Please check your connection and try again.");
                }
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

                    <Link to="/wizard/new" style={{ textDecoration: 'none' }}>
                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 0 30px var(--primary-glow)' }}
                            whileTap={{ scale: 0.98 }}
                            className="glow-btn"
                            style={{ fontSize: '1rem', padding: '0.9rem 1.75rem' }}
                        >
                            <Plus size={20} strokeWidth={2.5} /> New Resume
                        </motion.button>
                    </Link>
                </motion.div>

                <div className="bento-grid">
                    {/* Score Trend - Hero Tile */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="glass-card"
                        style={{
                            padding: '1.5rem',
                            gridColumn: 'span 2',
                            gridRow: 'span 2',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
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
                        <div style={{ flex: 1, minHeight: '140px' }}>
                            <TrendChart data={trendData} />
                        </div>
                    </motion.div>

                    {/* Total Resumes - Vertical Slim Tile */}
                    <StatCard
                        title="Total Resumes"
                        value={stats.total}
                        icon={FileText}
                        accent="var(--primary)"
                        delay={0.1}
                        style={{ gridRow: 'span 2' }}
                    />

                    {/* Other Stats */}
                    <StatCard title="Avg. Score" value={stats.avgScore} icon={Target} accent="var(--secondary)" delay={0.2} />
                    <StatCard title="Top Score" value={stats.topScore} icon={TrendingUp} accent="var(--success)" delay={0.3} />

                    {/* Resume Cards */}
                    {resumes
                        .sort((a, b) => {
                            const dateA = new Date(a.updatedAt);
                            const dateB = new Date(b.updatedAt);
                            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                        })
                        .map(resume => (
                            <div
                                key={resume._id}
                                onClick={() => setSelectedResume(resume._id === selectedResume?._id ? null : resume)}
                                style={{ cursor: 'pointer' }}
                            >
                                <ResumeCard
                                    resume={resume}
                                    navigate={navigate}
                                    onRestore={handleRestore}
                                    onDownload={handleDownload}
                                    onPreview={openPreview}
                                    isRestoring={isRestoring}
                                    isSelected={selectedResume?._id === resume._id}
                                />
                            </div>
                        ))}

                    {/* New resume card */}
                    <motion.div
                        whileHover={{ scale: 1.02, borderColor: 'var(--primary)', boxShadow: 'var(--shadow-lg)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/wizard/new')}
                        className="glass-card"
                        style={{
                            border: '2px dashed rgba(255,255,255,0.1)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', minHeight: '260px',
                            color: 'var(--text-faint)',
                            gap: '1rem'
                        }}
                    >
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'grid', placeItems: 'center', transition: 'background 0.2s' }}>
                            <Plus size={22} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)', display: 'block' }}>Create New</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Start a new ATS flow</span>
                        </div>
                    </motion.div>
                </div>

                {/* Quick Action Floating Bar */}
                <AnimatePresence>
                    {selectedResume && (
                        <motion.div
                            initial={{ y: 100, x: '-50%', opacity: 0 }}
                            animate={{ y: 0, x: '-50%', opacity: 1 }}
                            exit={{ y: 100, x: '-50%', opacity: 0 }}
                            style={{
                                position: 'fixed',
                                bottom: '2rem',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 100,
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(20px)',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '1.5rem',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: '700' }}>SELECTED</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '700', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {selectedResume.title}
                                </span>
                            </div>
                            <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => navigate(`/editor/${selectedResume._id}`)} className="glow-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                                    Edit
                                </button>
                                <button onClick={() => handleDownload(selectedResume._id, 1)} className="ghost-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                                    Export
                                </button>
                                <button onClick={() => setSelectedResume(null)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>


            {/* Preview Modal */}
            <AnimatePresence>
                {isPreviewOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                            zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem'
                        }}
                        onClick={() => setIsPreviewOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%', maxWidth: '900px', height: '90vh',
                                background: 'white', borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column'
                            }}
                        >
                            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                                <h3 style={{ fontWeight: '700', fontFamily: "'Outfit', sans-serif" }}>Version Preview</h3>
                                <button onClick={() => setIsPreviewOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <X size={24} />
                                </button>
                            </div>
                            <iframe
                                src={previewUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 'none', flex: 1 }}
                                title="Version PDF Preview"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Responsive styles for Dashboard */}
            <style>{`
                .bento-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                }
                @media (max-width: 1024px) {
                    .bento-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 768px) {
                    main > div:first-child > div:first-child > :first-child { font-size: 2rem !important; }
                    .bento-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div >
    );
};

export default Dashboard;
