import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Sparkles, Clock, ArrowRight, TrendingUp, Briefcase, Plus, Target, Zap, ChevronRight, Star, MoreHorizontal, Trash2, Copy, Download } from 'lucide-react';
import Navbar from '../components/Navbar';

// Improved Trend Chart with smooth curves and gradient fill
const TrendChart = ({ data }) => {
    if (!data || data.length < 2) return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            Not enough data for trend analysis
        </div>
    );

    const height = 120;
    const width = 400;
    const padding = 15;

    // Normalize data
    const scores = data.map(d => d.score);
    const minScore = Math.min(...scores, 0);
    const maxScore = 100;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((d.score - minScore) / (maxScore - minScore)) * (height - padding * 2) - padding;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="50%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#f472b6" />
                    </linearGradient>
                    <linearGradient id="fillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(192, 132, 252, 0.2)" />
                        <stop offset="100%" stopColor="rgba(192, 132, 252, 0)" />
                    </linearGradient>
                </defs>

                {/* Area Fill */}
                <path
                    d={`M${padding},${height} L${points.split(' ')[0]} ${points} L${width - padding},${height} Z`}
                    fill="url(#fillGradient)"
                    stroke="none"
                />

                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map(p => {
                    const y = height - ((p - minScore) / (maxScore - minScore)) * (height - padding * 2) - padding;
                    return (y > 0 && y < height) ? (
                        <line key={p} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    ) : null;
                })}

                {/* Main Line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0 4px 6px rgba(192, 132, 252, 0.3))' }}
                />

                {/* Data Points */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
                    const y = height - ((d.score - minScore) / (maxScore - minScore)) * (height - padding * 2) - padding;
                    return (
                        <g key={i}>
                            <circle cx={x} cy={y} r="4" fill="#0f172a" stroke="#c084fc" strokeWidth="2" />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const Dashboard = () => {
    const [resumes, setResumes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const theme = {
        bg: '#030014',
        cardBg: 'rgba(255, 255, 255, 0.03)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        primary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        textMain: '#f8fafc',
        textMuted: '#94a3b8',
    };

    useEffect(() => {
        const fetchResumes = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:5000/api/resumes', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setResumes(res.data.data);
            } catch (err) {
                console.error("Failed to fetch resumes", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchResumes();
    }, []);

    // Calculate dynamic stats
    const stats = {
        totalResumes: resumes.length,
        topAtsScore: resumes.length > 0 ? Math.max(...resumes.map(r => r.atsScore || 0)) : 0,
        averageScore: resumes.length > 0 ? Math.round(resumes.reduce((sum, r) => sum + (r.atsScore || 0), 0) / resumes.length) : 0,
        interviewsPrep: 0 // Placeholder
    };

    // Prepare trend data
    const trendData = [...resumes]
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
        .map(r => ({ date: r.updatedAt, score: r.atsScore || 0 }))
        .slice(-10);

    const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
        <motion.div
            whileHover={{ y: -5 }}
            style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: '1.5rem',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(10px)'
            }}
        >
            <div style={{
                position: 'absolute', top: '-10%', right: '-10%',
                width: '100px', height: '100px',
                background: color,
                filter: 'blur(60px)',
                opacity: 0.15,
                borderRadius: '50%'
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{
                    padding: '0.75rem',
                    background: `rgba(255,255,255,0.05)`,
                    borderRadius: '1rem',
                    color: color
                }}>
                    <Icon size={24} />
                </div>
            </div>

            <div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: theme.textMain, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: theme.textMuted, marginTop: '0.25rem' }}>{title}</div>
            </div>

            {subtext && (
                <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {subtext}
                </div>
            )}
        </motion.div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: theme.bg, color: theme.textMain, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
            <Navbar />

            {/* Background Gradients */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', background: '#7c3aed', filter: 'blur(120px)', opacity: 0.1 }} />
                <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '300px', height: '300px', background: '#ec4899', filter: 'blur(100px)', opacity: 0.1 }} />
            </div>

            <div style={{ padding: '7rem 2rem 4rem', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '3rem' }}>
                        <div>
                            <h1 style={{ fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.03em', background: 'linear-gradient(to right, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
                                Good Evening, Creator
                            </h1>
                            <p style={{ color: theme.textMuted, fontSize: '1.1rem' }}>Here's what's happening with your job search today.</p>
                        </div>

                        <Link to="/" style={{
                            padding: '1rem 2rem',
                            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                            color: 'white',
                            borderRadius: '1rem',
                            textDecoration: 'none',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 8px 20px rgba(124, 58, 237, 0.3)',
                            fontSize: '0.95rem',
                            transition: 'transform 0.2s'
                        }}>
                            <Plus size={20} strokeWidth={3} /> New Resume
                        </Link>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                        <div style={{ gridColumn: 'span 3' }}>
                            <StatCard
                                title="Active Resumes"
                                value={stats.totalResumes}
                                icon={FileText}
                                color="#8b5cf6"
                                subtext={`Updated recently`}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 3' }}>
                            <StatCard
                                title="Top ATS Score"
                                value={`${stats.topAtsScore}%`}
                                icon={Star}
                                color="#10b981"
                                subtext="Optimize to reach 100%"
                            />
                        </div>
                        <div style={{ gridColumn: 'span 6', background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '1.5rem', padding: '1.5rem', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>Performance Trend</div>
                                    <div style={{ fontSize: '0.8rem', color: theme.textMuted }}>ATS Score improvement over time</div>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: theme.textMain }}>{stats.averageScore}% <span style={{ fontSize: '0.8rem', color: theme.textMuted, fontWeight: '600' }}>AVG</span></div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <TrendChart data={trendData} />
                            </div>
                        </div>
                    </div>

                    {/* Recent Resumes Section */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Recent Resumes</h2>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {/* Filter buttons could go here */}
                            </div>
                        </div>

                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: theme.textMuted }}>
                                <Sparkles className="animate-spin" size={32} style={{ marginBottom: '1rem', color: theme.primary }} />
                                <p>Loading your career assets...</p>
                            </div>
                        ) : resumes.length === 0 ? (
                            <div style={{
                                padding: '4rem',
                                border: `2px dashed ${theme.cardBorder}`,
                                borderRadius: '1.5rem',
                                textAlign: 'center'
                            }}>
                                <FileText size={48} color={theme.textMuted} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>No resumes created yet</h3>
                                <p style={{ color: theme.textMuted, marginBottom: '2rem' }}>Create your first ATS-optimized resume to get started.</p>
                                <Link to="/" style={{ color: theme.primary, textDecoration: 'none', fontWeight: '700' }}>Create New Resume →</Link>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                {resumes.map(resume => (
                                    <motion.div
                                        key={resume._id}
                                        whileHover={{ y: -5, borderColor: theme.primary }}
                                        onClick={() => navigate(`/editor/${resume._id}`)}
                                        style={{
                                            background: theme.cardBg,
                                            border: `1px solid ${theme.cardBorder}`,
                                            borderRadius: '1.25rem',
                                            padding: '1.5rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            height: '220px',
                                            position: 'relative',
                                            transition: 'border-color 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div style={{
                                                width: '40px', height: '40px',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '0.75rem',
                                                display: 'grid', placeItems: 'center'
                                            }}>
                                                <FileText size={20} color={theme.textMuted} />
                                            </div>
                                            {resume.atsScore > 0 && (
                                                <div style={{
                                                    padding: '0.25rem 0.75rem',
                                                    background: resume.atsScore >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                    color: resume.atsScore >= 70 ? '#10b981' : '#f59e0b',
                                                    borderRadius: '2rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    border: `1px solid ${resume.atsScore >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                                                }}>
                                                    {resume.atsScore}% Score
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem', color: theme.textMain }}>{resume.title}</h3>
                                            <p style={{ fontSize: '0.8rem', color: theme.textMuted }}>Last edited {new Date(resume.updatedAt).toLocaleDateString()}</p>
                                        </div>

                                        <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Sparkles size={12} color={theme.warning} /> AI Optimized
                                            </div>
                                            <div style={{
                                                width: '32px', height: '32px',
                                                background: theme.primary,
                                                borderRadius: '50%',
                                                display: 'grid', placeItems: 'center',
                                                boxShadow: '0 4px 10px rgba(124, 58, 237, 0.4)'
                                            }}>
                                                <ArrowRight size={16} color="white" />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                <motion.div
                                    whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.05)' }}
                                    onClick={() => navigate('/')}
                                    style={{
                                        border: `2px dashed ${theme.cardBorder}`,
                                        borderRadius: '1.25rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: theme.textMuted,
                                        height: '220px'
                                    }}
                                >
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', marginBottom: '1rem' }}>
                                        <Plus size={24} />
                                    </div>
                                    <span style={{ fontWeight: '600' }}>Create New</span>
                                </motion.div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
