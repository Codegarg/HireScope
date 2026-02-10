import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Dashboard = () => {
    const [resumes, setResumes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const theme = {
        primary: '#7c3aed',
        primaryLight: '#a78bfa',
        secondary: '#4f46e5',
        accent: '#f59e0b',
        glassBg: 'rgba(255, 255, 255, 0.03)',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        textMuted: '#94a3b8',
        radius: '1.5rem',
    };

    const glassCardStyle = {
        background: theme.glassBg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${theme.glassBorder}`,
        borderRadius: theme.radius,
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
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
        <div style={{ minHeight: '100vh', backgroundColor: '#030014', color: '#f8fafc' }}>
            {/* Aurora Background */}
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1,
                background: 'radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.1) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(79, 70, 229, 0.1) 0%, transparent 40%)'
            }}></div>

            <Navbar />

            <div style={{ padding: '8rem 2rem 5rem 2rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <header style={{ marginBottom: '4.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem' }}>
                        <div>
                            <h1 className="gradient-text" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: '800', marginBottom: '0.75rem', lineHeight: '1' }}>
                                My Dashboard
                            </h1>
                            <p style={{ color: theme.textMuted, fontSize: '1.2rem', fontWeight: '500' }}>Manage your career growth and resume versions.</p>
                        </div>
                        <Link to="/" style={{
                            padding: '1rem 2rem', background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                            color: 'white', borderRadius: '999px', textDecoration: 'none', fontWeight: '700', boxShadow: '0 10px 20px rgba(124, 58, 237, 0.3)', transition: 'all 0.3s'
                        }}
                            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            Analyze New Resume
                        </Link>
                    </header>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '6rem' }}>
                        <motion.div whileHover={{ y: -5 }} style={{ ...glassCardStyle, padding: '2rem' }}>
                            <h3 style={{ fontSize: '0.9rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', marginBottom: '1rem' }}>Total Resumes</h3>
                            <p style={{ fontSize: '3.5rem', fontWeight: '800', color: theme.primaryLight, margin: 0 }}>{resumes.length || 0}</p>
                        </motion.div>
                        <motion.div whileHover={{ y: -5 }} style={{ ...glassCardStyle, padding: '2rem' }}>
                            <h3 style={{ fontSize: '0.9rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', marginBottom: '1rem' }}>Best ATS Score</h3>
                            <p style={{ fontSize: '3.5rem', fontWeight: '800', color: '#10b981', margin: 0 }}>85%</p>
                        </motion.div>
                        <motion.div whileHover={{ y: -5 }} style={{ ...glassCardStyle, padding: '2rem' }}>
                            <h3 style={{ fontSize: '0.9rem', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', marginBottom: '1rem' }}>System Status</h3>
                            <p style={{ fontSize: '3.5rem', fontWeight: '800', color: theme.accent, margin: 0 }}>Optimum</p>
                        </motion.div>
                    </div>

                    <section>
                        <h2 style={{ fontSize: '2rem', marginBottom: '2.5rem', fontWeight: '800' }}>Recent Resume Versions</h2>

                        {isLoading ? (
                            <div style={{ padding: '8rem', textAlign: 'center', color: theme.textMuted }}>
                                Loading your history...
                            </div>
                        ) : resumes.length === 0 ? (
                            <div style={{ ...glassCardStyle, padding: '8rem', textAlign: 'center' }}>
                                <p style={{ color: theme.textMuted, marginBottom: '2.5rem', fontSize: '1.4rem' }}>No resumes found yet. Start by analyzing one!</p>
                                <Link to="/" style={{
                                    padding: '1.25rem 3rem', background: theme.primary, color: 'white', borderRadius: '999px', textDecoration: 'none', fontWeight: '700'
                                }}>Get Started &rarr;</Link>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {resumes.map(resume => (
                                    <motion.div
                                        key={resume._id}
                                        whileHover={{ x: 10 }}
                                        style={{ ...glassCardStyle, padding: '2rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}
                                    >
                                        <div>
                                            <h4 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>{resume.title}</h4>
                                            <div style={{ display: 'flex', gap: '2rem', color: theme.textMuted, fontSize: '1rem', fontWeight: '500' }}>
                                                <span>📅 {new Date(resume.updatedAt).toLocaleDateString()}</span>
                                                <span>📋 {resume.versions?.length || 1} Versions</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <Link
                                                to={`/editor/${resume._id}`}
                                                style={{
                                                    padding: '0.75rem 1.75rem', background: 'transparent', color: 'white', border: `1px solid ${theme.glassBorder}`,
                                                    borderRadius: '999px', textDecoration: 'none', fontWeight: '600', transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.borderColor = theme.primary}
                                                onMouseLeave={(e) => e.target.style.borderColor = theme.glassBorder}
                                            >
                                                History
                                            </Link>
                                            <Link
                                                to={`/editor/${resume._id}`}
                                                style={{
                                                    padding: '0.75rem 1.75rem', background: theme.primary, color: 'white', border: 'none',
                                                    borderRadius: '999px', textDecoration: 'none', fontWeight: '700', transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                            >
                                                Optimize &rarr;
                                            </Link>
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
