import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Clock, Target, FileText,
    Download, RotateCcw, Eye, ExternalLink,
    Calendar, User, Mail, Shield, AlertCircle, X,
    Edit3
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';

const ResumeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);

    const [resume, setResume] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const fetchResume = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) { navigate('/login'); return; }
                const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/resumes/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setResume(res.data.data);
            } catch (err) {
                console.error("Failed to fetch resume details", err);
                setError(err.response?.data?.message || "Failed to load resume details");
                if (err.response?.status === 401) { logout(); navigate('/login'); }
            } finally {
                setIsLoading(false);
            }
        };
        fetchResume();
    }, [id, navigate, logout]);

    const handleRestore = async (versionNumber) => {
        if (!window.confirm(`Are you sure you want to restore Version ${versionNumber}? This will create a new 'restored' version as your current resume.`)) return;

        setIsRestoring(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/resumes/${id}/restore/${versionNumber}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setResume(res.data.data);
            alert("Version restored successfully!");
        } catch (err) {
            console.error("Restore failed", err);
            alert("Failed to restore version: " + (err.response?.data?.message || err.message));
        } finally {
            setIsRestoring(false);
        }
    };

    const handleDownload = (versionNumber) => {
        const token = localStorage.getItem('token');
        window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/resumes/${id}/version/${versionNumber}/download?token=${token}`;
    };

    if (isLoading) return (
        <div className="page-wrapper" style={{ display: 'grid', placeItems: 'center' }}>
            <div className="ambient-bg" />
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '50px', height: '50px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Fetching history...</p>
            </div>
        </div>
    );

    if (error || !resume) return (
        <div className="page-wrapper" style={{ display: 'grid', placeItems: 'center' }}>
            <div className="ambient-bg" />
            <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }} className="glass-card">
                <AlertCircle size={48} color="var(--error)" style={{ marginBottom: '1rem' }} />
                <h2 style={{ marginBottom: '0.5rem' }}>Oops!</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || "Resume not found"}</p>
                <button onClick={() => navigate('/dashboard')} className="glow-btn">Back to Dashboard</button>
            </div>
        </div>
    );

    const sortedVersions = [...(resume.versions || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <div className="page-wrapper">
            <div className="ambient-bg" />
            <Navbar />

            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '7rem 1.5rem 5rem', position: 'relative', zIndex: 1 }}>

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: '3rem' }}
                >
                    <button onClick={() => navigate('/dashboard')} className="ghost-btn" style={{ marginBottom: '1.5rem' }}>
                        <ArrowLeft size={16} /> Dashboard
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>
                                {resume.title || 'Untitled Resume'}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    <Clock size={16} /> Last updated {new Date(resume.updatedAt).toLocaleDateString()}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    <User size={16} /> {resume.title || 'Untitled'}
                                </div>
                                {resume.atsScore > 0 && (
                                    <div className="badge badge-success">
                                        <Target size={14} /> {resume.atsScore}% ATS Score
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/editor/${resume._id}`)}
                            className="glow-btn"
                            style={{ padding: '0.8rem 1.5rem' }}
                        >
                            <Edit3 size={18} /> Open in Editor
                        </button>
                    </div>
                </motion.div>

                {/* PDF Preview Section */}
                <section style={{ marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <FileText size={20} color="var(--primary)" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: "'Outfit', sans-serif" }}>Original PDF</h2>
                    </div>

                    <div style={{
                        width: '100%',
                        height: '700px',
                        background: 'white',
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        border: '1px solid var(--border)',
                        position: 'relative'
                    }}>
                        {resume.originalFileKey ? (
                            <iframe
                                src={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/resumes/${resume._id}/file?token=${localStorage.getItem('token')}`}
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                                title="Original Resume PDF"
                            />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem' }}>
                                <AlertCircle size={48} style={{ opacity: 0.3 }} />
                                <p>No original PDF file found for this resume.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Versions Section */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <RotateCcw size={20} color="var(--primary)" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: "'Outfit', sans-serif" }}>Version History</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {sortedVersions.map((v, idx) => {
                            const isCurrent = idx === 0;
                            const vNum = v.versionNumber;

                            return (
                                <motion.div
                                    key={vNum}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass-card"
                                    style={{
                                        padding: '1.25rem 1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '1rem',
                                        borderLeft: isCurrent ? '4px solid var(--primary)' : '1px solid var(--border)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: isCurrent ? 'var(--primary)' : 'var(--bg-elevated)',
                                            color: isCurrent ? 'white' : 'var(--text-muted)',
                                            display: 'grid', placeItems: 'center', fontWeight: '700'
                                        }}>
                                            {vNum}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                                <span style={{ fontWeight: '700', fontSize: '1rem' }}>
                                                    {v.type?.toUpperCase() || 'VERSION'}
                                                </span>
                                                {isCurrent && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>ACTIVE</span>}
                                                {v.atsScore > 0 && (
                                                    <span style={{ color: 'var(--success-light)', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Target size={12} /> {v.atsScore}%
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Calendar size={12} /> {new Date(v.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <button
                                            onClick={() => { setSelectedVersion(v); setIsPreviewOpen(true); }}
                                            className="ghost-btn"
                                            style={{ padding: '0.5rem 0.8rem' }}
                                            title="Preview this version"
                                        >
                                            <Eye size={16} /> Preview
                                        </button>
                                        <button
                                            onClick={() => handleDownload(v.versionNumber)}
                                            className="ghost-btn"
                                            style={{ padding: '0.5rem 0.8rem' }}
                                            disabled={isDownloading}
                                            title="Download PDF"
                                        >
                                            <Download size={16} />
                                        </button>
                                        {!isCurrent && (
                                            <button
                                                onClick={() => handleRestore(v.versionNumber)}
                                                className="ghost-btn"
                                                style={{ padding: '0.5rem 0.8rem', color: 'var(--warning)' }}
                                                disabled={isRestoring}
                                                title="Restore this version"
                                            >
                                                <RotateCcw size={16} /> Restore
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
            </main>

            {/* Preview Modal */}
            <AnimatePresence>
                {isPreviewOpen && selectedVersion && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 2000,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '2rem'
                        }}
                        onClick={() => setIsPreviewOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            style={{
                                width: '100%', maxWidth: '900px', height: '90vh',
                                background: 'white', borderRadius: '1rem', overflow: 'hidden',
                                position: 'relative', display: 'flex', flexDirection: 'column'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{
                                padding: '1rem 1.5rem', background: 'var(--bg-card)',
                                borderBottom: '1px solid var(--border)', display: 'flex',
                                alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>
                                        Previewing Version: {selectedVersion.type?.toUpperCase()} ({selectedVersion.versionNumber})
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {new Date(selectedVersion.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsPreviewOpen(false)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ flex: 1, background: '#f5f5f7' }}>
                                <iframe
                                    src={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/resumes/${id}/version/${selectedVersion.versionNumber}/view?token=${localStorage.getItem('token')}`}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 'none' }}
                                    title={`Version ${selectedVersion.versionNumber} Preview`}
                                />
                            </div>

                            <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button onClick={() => setIsPreviewOpen(false)} className="ghost-btn">Close</button>
                                <button onClick={() => handleDownload(selectedVersion.versionNumber)} className="glow-btn" style={{ padding: '0.6rem 1.25rem' }}>
                                    <Download size={16} /> Download
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ResumeDetail;
