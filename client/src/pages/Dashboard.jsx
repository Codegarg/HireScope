import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [resumes, setResumes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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
        <div className="dashboard-container">
            <div className="dashboard-wrapper">
                <header className="dashboard-header">
                    <div>
                        <h1>My Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage your career growth and resume versions.</p>
                    </div>
                    <Link to="/analyze" className="premium-btn btn-blue" style={{ padding: '0.75rem 1.5rem', borderRadius: '9999px', textDecoration: 'none' }}>
                        Analyze New Resume
                    </Link>
                </header>

                <div className="stats-grid">
                    <motion.div whileHover={{ y: -5 }} className="stat-card">
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }}>Total Resumes</h3>
                        <p className="stat-value" style={{ color: '#2563eb' }}>{resumes.length || 0}</p>
                    </motion.div>
                    <motion.div whileHover={{ y: -5 }} className="stat-card">
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }}>Best ATS Score</h3>
                        <p className="stat-value" style={{ color: '#10b981' }}>85%</p>
                    </motion.div>
                    <motion.div whileHover={{ y: -5 }} className="stat-card">
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }}>Interviews Prepped</h3>
                        <p className="stat-value" style={{ color: '#7c3aed' }}>3</p>
                    </motion.div>
                </div>

                <section className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="flex-between" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Recent Resume Versions</h2>
                    </div>

                    {isLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading your history...</div>
                    ) : resumes.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center' }}>
                            <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '1.125rem' }}>No resumes found yet. Start by analyzing one!</p>
                            <Link to="/analyze" style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>Get Started &rarr;</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {resumes.map(resume => (
                                <div key={resume._id} className="flex-between" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>{resume.title}</h4>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Last updated: {new Date(resume.updatedAt).toLocaleDateString()}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <Link
                                            to={`/editor/${resume._id}`}
                                            className="premium-btn"
                                            style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'inherit', textDecoration: 'none' }}
                                        >
                                            View Versions
                                        </Link>
                                        <Link
                                            to={`/editor/${resume._id}`}
                                            className="premium-btn btn-blue"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            Optimize Further
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
