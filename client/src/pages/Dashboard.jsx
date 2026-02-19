import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
    FileText, Sparkles, Clock, ArrowRight, TrendingUp, Briefcase,
    Plus, Target, Zap, ChevronRight, Star, MoreHorizontal, Trash2,
    Copy, Download, ArrowLeft, LayoutDashboard, Settings, LogOut, Bot, MessageSquare, X
} from 'lucide-react';
import AIAssistant from '../components/AIAssistant';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: delay }}
        whileHover={{ y: -5, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
        style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            display: 'relative',
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        }}
    >
        <div style={{
            position: 'absolute', top: -10, right: -10,
            width: '100px', height: '100px',
            background: color,
            filter: 'blur(50px)',
            opacity: 0.15,
            borderRadius: '50%',
            pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
            <div style={{
                padding: '0.6rem',
                borderRadius: '0.8rem',
                background: `rgba(255,255,255,0.05)`,
                color: color,
                border: `1px solid ${color}20`
            }}>
                <Icon size={20} />
            </div>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>{title}</span>
        </div>

        <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#f8fafc', lineHeight: 1 }}>
                {value}
            </div>
        </div>
    </motion.div>
);

const ResumeCard = ({ resume, navigate, onDelete }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -5, borderColor: '#8b5cf6' }}
        style={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            height: '240px',
            transition: 'border-color 0.2s'
        }}
        onClick={() => navigate(`/editor/${resume._id}`)}
    >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{
                width: '42px', height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.05))',
                border: '1px solid rgba(139, 92, 246, 0.1)',
                display: 'grid', placeItems: 'center',
                color: '#a78bfa'
            }}>
                <FileText size={20} />
            </div>
            {resume.atsScore > 0 && (
                <div style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '2rem',
                    background: resume.atsScore >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${resume.atsScore >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                    color: resume.atsScore >= 70 ? '#34d399' : '#fbbf24',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    <Target size={12} /> {resume.atsScore}%
                </div>
            )}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                {resume.title || 'Untitled Resume'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Edited {new Date(resume.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>
                    A4 PDF
                </span>
            </div>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                    width: '32px', height: '32px',
                    borderRadius: '50%',
                    background: '#8b5cf6',
                    border: 'none',
                    display: 'grid', placeItems: 'center',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
            >
                <ArrowRight size={16} />
            </motion.button>
        </div>
    </motion.div>
);

const TrendChart = ({ data }) => {
    if (!data || data.length < 2) return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '0.5rem' }}>
            <TrendingUp size={24} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: '0.85rem' }}>Not enough data for insights yet</span>
        </div>
    );

    const height = 140;
    const width = 1000; // SVG coordinate space
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
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
                        <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
                    </linearGradient>
                </defs>

                {/* Area */}
                <path
                    d={`M${padding},${height} L${points.split(' ')[0]} ${points} L${width - padding},${height} Z`}
                    fill="url(#chartGradient)"
                />

                {/* Line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0 4px 6px rgba(139, 92, 246, 0.2))' }}
                />

                {/* Points */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
                    const y = height - ((d.score - minScore) / (maxScore - minScore)) * (height - padding * 2) - padding;
                    return (
                        <circle
                            key={i}
                            cx={x} cy={y}
                            r={i === data.length - 1 ? 5 : 3}
                            fill={i === data.length - 1 ? '#fff' : '#8b5cf6'}
                            stroke="#8b5cf6"
                            strokeWidth="2"
                        />
                    );
                })}
            </svg>
        </div>
    );
};

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [resumes, setResumes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = Newest First, 'asc' = Oldest First
    const [showChat, setShowChat] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchResumes = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }
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

    return (
        <div style={{
            minHeight: '100vh',
            background: '#030014',
            color: '#f8fafc',
            fontFamily: 'Inter, sans-serif',
            overflowX: 'hidden'
        }}>
            <Navbar />

            {/* Ambient Background */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: -100, left: -100, width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)' }} />
                <div style={{ position: 'absolute', bottom: -100, right: -100, width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)' }} />
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '8rem 2rem 4rem', position: 'relative', zIndex: 1 }}>

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}
                >
                    <div>
                        <h1 style={{
                            fontSize: '3.5rem',
                            fontWeight: '800',
                            letterSpacing: '-0.03em',
                            lineHeight: 1.1,
                            marginBottom: '0.5rem',
                            background: 'linear-gradient(to right, #fff, #94a3b8)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            {getGreeting()},<br />
                            <span style={{ color: '#8b5cf6' }}>{user?.name?.split(' ')[0] || 'Creator'}</span>
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '500px' }}>
                            Ready to make your next career move? Your resumes are performing <span style={{ color: '#34d399', fontWeight: '600' }}>{stats.avgScore > 70 ? 'exceedingly well' : 'steadily'}</span>.
                        </p>
                    </div>

                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)' }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                padding: '1rem 2rem',
                                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '1rem',
                                fontWeight: '700',
                                fontSize: '1rem',
                                display: 'flex', alignItems: 'center', gap: '0.8rem',
                                cursor: 'pointer',
                                boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)'
                            }}
                        >
                            <Plus size={22} strokeWidth={3} /> Create New Resume
                        </motion.button>
                    </Link>
                </motion.div>

                {/* Back Button (Restored) */}
                <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onClick={() => navigate(-1)}
                    style={{
                        position: 'absolute', top: '5rem', left: '2rem',
                        background: 'rgba(255,255,255,0.05)', border: 'none',
                        color: '#64748b', padding: '0.5rem 1rem', borderRadius: '0.5rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                        fontSize: '0.9rem', fontWeight: '600',
                        zIndex: 50 // Ensure it's clickable
                    }}
                >
                    <ArrowLeft size={16} /> Back
                </motion.button>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div style={{ gridColumn: 'span 3' }}>
                        <StatCard
                            title="Total Resumes"
                            value={stats.total}
                            icon={FileText}
                            color="#8b5cf6"
                            delay={0.1}
                        />
                    </div>
                    <div style={{ gridColumn: 'span 3' }}>
                        <StatCard
                            title="Avg. ATS Score"
                            value={stats.avgScore}
                            icon={Target}
                            color="#3b82f6"
                            delay={0.2}
                        />
                    </div>
                    <div style={{ gridColumn: 'span 6' }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '1.5rem',
                                padding: '1.5rem',
                                height: '100%',
                                display: 'flex', flexDirection: 'column'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '0.6rem', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
                                        <TrendingUp size={18} />
                                    </div>
                                    <span style={{ fontWeight: '600', color: '#94a3b8' }}>Score Trend</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                                    Last 10 updates
                                </div>
                            </div>
                            <div style={{ flex: 1, minHeight: '100px' }}>
                                <TrendChart data={trendData} />
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Resumes List */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f8fafc' }}>Your Resumes</h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                                Sort by Date {sortOrder === 'desc' ? '↓' : '↑'}
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                            <Sparkles className="animate-spin" size={32} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
                            <p>Loading your assets...</p>
                        </div>
                    ) : resumes.length === 0 ? (
                        <div style={{
                            padding: '4rem',
                            border: '2px dashed rgba(255,255,255,0.1)',
                            borderRadius: '1.5rem',
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.01)'
                        }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'grid', placeItems: 'center' }}>
                                <FileText size={32} color="#64748b" />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>No resumes yet</h3>
                            <p style={{ color: '#64748b', marginBottom: '2rem' }}>Create your first ATS-optimized resume to get started.</p>
                            <Link to="/" style={{ color: '#8b5cf6', fontWeight: '700', textDecoration: 'none' }}>Create a Resume →</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {resumes
                                .sort((a, b) => {
                                    const dateA = new Date(a.updatedAt);
                                    const dateB = new Date(b.updatedAt);
                                    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                                })
                                .map(resume => (
                                    <ResumeCard key={resume._id} resume={resume} navigate={navigate} />
                                ))}

                            <motion.div
                                whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.04)', borderColor: '#8b5cf6' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/')}
                                style={{
                                    border: '2px dashed rgba(255,255,255,0.1)',
                                    borderRadius: '1.25rem',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                    height: '240px',
                                    color: '#64748b',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', marginBottom: '1rem' }}>
                                    <Plus size={24} />
                                </div>
                                <span style={{ fontWeight: '600' }}>Create New Resume</span>
                            </motion.div>
                        </div>
                    )}
                </motion.div>

            </div>

            {/* Floating AI Assistant Trigger */}
            <AnimatePresence>
                <div style={{ position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 1000 }}>
                    <AnimatePresence mode="wait">
                        {!showChat ? (
                            <motion.button
                                key="chat-trigger"
                                initial={{ opacity: 0, rotate: -45 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 45 }}
                                whileHover={{ scale: 1.1, boxShadow: `0 0 20px #7c3aed66` }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setShowChat(true)}
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)`,
                                    border: 'none',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                }}
                            >
                                <Bot size={32} />
                            </motion.button>
                        ) : (
                            <motion.div
                                key="chat-window"
                                initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                style={{
                                    width: '420px',
                                    height: '600px',
                                    background: 'rgba(10, 10, 20, 0.85)',
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                    borderRadius: '1.5rem',
                                    border: `1px solid #7c3aed55`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                                }}
                            >
                                <div style={{
                                    padding: '1rem 1.5rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#a78bfa' }}>AI ASSISTANT</span>
                                    <button
                                        onClick={() => setShowChat(false)}
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <AIAssistant />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
