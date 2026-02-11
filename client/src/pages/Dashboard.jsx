import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Sparkles, Clock, ArrowRight, TrendingUp, Briefcase, Plus, Search, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';

const Dashboard = () => {
    const [resumes, setResumes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const theme = {
        primary: '#7c3aed',
        primaryLight: '#a78bfa',
        secondary: '#4f46e5',
        accent: '#f59e0b',
        glassBg: 'rgba(255, 255, 255, 0.03)',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        textMuted: '#94a3b8',
        radius: '1.25rem',
    };

    const glassCardStyle = {
        background: theme.glassBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${theme.glassBorder}`,
        borderRadius: theme.radius,
        boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.2)',
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

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#030014', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Aurora Background */}
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1,
                background: 'radial-gradient(circle at 10% 10%, rgba(124, 58, 237, 0.08) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(79, 70, 229, 0.08) 0%, transparent 40%)'
            }}></div>

            <Navbar />

            <div style={{ padding: '7rem 2rem 5rem 2rem' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
                                Dashboard
                            </h1>
                            <p style={{ color: theme.textMuted, fontSize: '0.95rem', fontWeight: '500' }}>Review and optimize your career journey.</p>
                        </div>
                        <Link to="/" style={{
                            padding: '0.75rem 1.5rem', background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                            color: 'white', borderRadius: '0.75rem', textDecoration: 'none', fontWeight: '700', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 10px 20px rgba(124, 58, 237, 0.2)', transition: 'all 0.2s'
                        }}>
                            <Plus size={18} />
                            New Analysis
                        </Link>
                    </header>

                    {/* Quick Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
                        <div style={{ ...glassCardStyle, padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ background: 'rgba(124, 58, 237, 0.15)', padding: '0.5rem', borderRadius: '0.5rem', color: theme.primaryLight }}>
                                    <FileText size={20} />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Resumes</span>
                            </div>
                            <p style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>{resumes.length || 0}</p>
                        </div>

                        <div style={{ ...glassCardStyle, padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.5rem', borderRadius: '0.5rem', color: '#10b981' }}>
                                    <TrendingUp size={20} />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top ATS Score</span>
                            </div>
                            <p style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: '#10b981' }}>85%</p>
                        </div>

                        <div style={{ ...glassCardStyle, padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '0.5rem', borderRadius: '0.5rem', color: theme.accent }}>
                                    <Sparkles size={20} />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Suggestions</span>
                            </div>
                            <p style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>24</p>
                        </div>
                    </div>

                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.01em' }}>Recent Activity</h2>
                            <div style={{ color: theme.textMuted, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={14} />
                                Last updated just now
                            </div>
                        </div>

                        {isLoading ? (
                            <div style={{ padding: '6rem', textAlign: 'center', color: theme.textMuted, ...glassCardStyle }}>
                                <div style={{ marginBottom: '1rem' }}>Loading workspace...</div>
                            </div>
                        ) : resumes.length === 0 ? (
                            <div style={{ ...glassCardStyle, padding: '6rem', textAlign: 'center' }}>
                                <div style={{ color: theme.textMuted, marginBottom: '2rem', fontSize: '1rem' }}>Your history is empty. Start your career optimization today!</div>
                                <Link to="/" style={{
                                    padding: '0.8rem 2.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '0.75rem', textDecoration: 'none', fontWeight: '700', border: `1px solid ${theme.glassBorder}`, fontSize: '0.9rem'
                                }}>Begin Analysis</Link>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {resumes.map(resume => (
                                    <motion.div
                                        key={resume._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ background: 'rgba(255,255,255,0.05)', borderColor: theme.primaryLight + '44' }}
                                        style={{ ...glassCardStyle, padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
                                        onClick={() => navigate(`/editor/${resume._id}`)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '0.75rem', border: `1px solid ${theme.glassBorder}` }}>
                                                <FileText size={22} color={theme.primaryLight} />
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.25rem' }}>{resume.title}</h4>
                                                <div style={{ display: 'flex', gap: '1.25rem', color: theme.textMuted, fontSize: '0.8rem', fontWeight: '500' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={12} /> {new Date(resume.updatedAt).toLocaleDateString()}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Briefcase size={12} /> {resume.versions?.length || 1} Versions</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ textAlign: 'right', marginRight: '1.5rem' }}>
                                                <div style={{ fontSize: '0.7rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>ATS Compatibility</div>
                                                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>85%</div>
                                            </div>
                                            <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
                                                <ArrowRight size={18} color={theme.textMuted} />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
