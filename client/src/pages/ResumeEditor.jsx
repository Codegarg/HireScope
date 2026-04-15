import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

import Navbar from '../components/Navbar';
import {
    Download, Sparkles, Zap, History, RotateCcw, FileText, Check, X,
    ChevronDown, AlertCircle, ArrowLeft, BarChart3, AlertTriangle, Save,
    Edit3, Layout, Wand2
} from 'lucide-react';
import PDFPreview from '../components/resume/PDFPreview';
import StructuredManualEditor from '../components/resume/StructuredManualEditor';
import ATSAnalysis from '../components/ATSAnalysis';



// ─── Main Component ───────────────────────────────────────────────────────────
const ResumeEditor = ({ wizardMode = false, passedId = null, initialContent = null }) => {
    const { id: paramId } = useParams();
    const id = passedId || paramId;
    const navigate = useNavigate();
    const location = useLocation();
    const { search } = location;
    const queryParams = new URLSearchParams(search);
    const shouldImprove = queryParams.get('improve');

    const [isLoading, setIsLoading] = useState(!location.state?.initialResume && !!id);
    const [fetchError, setFetchError] = useState(null);
    const [resume, setResume] = useState(location.state?.initialResume || null);
    // Initialize ATS analysis from state if available
    const [atsAnalysis, setAtsAnalysis] = useState(location.state?.analysisResults || null);
    const [jobDescription, setJobDescription] = useState(location.state?.analysisResults?.jdText || '');

    const [currentContent, setCurrentContent] = useState('');
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
    const [isDownloading, setIsDownloading] = useState(false);
    const [showATS, setShowATS] = useState(false);
    const lastSavedRef = useRef('');


    // ── Load resume ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchResume = async () => {
            if (location.state?.initialResume) {
                const initial = location.state.initialResume;
                setResume(initial);
                // If initialContent is passed from Wizard, use it, otherwise fallback
                const content = initialContent || initial.content || initial.parsedText || initial.originalContent || '';
                setCurrentContent(content);
                lastSavedRef.current = content;

                // Handle passed-in analysis results (e.g. from Home page)
                if (location.state.analysisResults) {
                    setAtsAnalysis(location.state.analysisResults);
                    if (location.state.analysisResults.jdText) {
                        setJobDescription(location.state.analysisResults.jdText);
                        // Persist to localStorage immediately
                        if (initial._id) {
                            localStorage.setItem(`ats_jd_${initial._id}`, location.state.analysisResults.jdText);
                        }
                    }
                }
                return;
            }
            if (!id || id === 'null' || id === 'undefined') return;
            try {
                const token = localStorage.getItem('token');
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                const res = await axios.get(`${apiBase}/resumes/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const found = res.data.data;
                if (found) {
                    setResume(found);
                    // Use parsedText as the editable content — no longer reading from version.content
                    const content = found.parsedText || found.originalContent || '';
                    setCurrentContent(content);
                    lastSavedRef.current = content;
                }
            } catch (err) {
                console.error('Error fetching resume:', err);
                setFetchError(err.response?.data?.message || 'Failed to load resume.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchResume();

    }, [id, location.state]);



    // Manual Editing State
    const [isManualEditing, setIsManualEditing] = useState(false);
    const [isSavingManual, setIsSavingManual] = useState(false);
    const [isExtractingStructure, setIsExtractingStructure] = useState(false);



    const handleStartManualEdit = async () => {
        // Ensure we have a structured object, not a string or null
        const needsExtraction = !resume.content || typeof resume.content === 'string';
        
        if (needsExtraction) {
            setIsExtractingStructure(true);
            try {
                const token = localStorage.getItem('token');
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                const res = await axios.post(`${apiBase}/resumes/${id}/extract-structure`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) {
                    setResume(prev => ({ ...prev, content: res.data.data }));
                }
            } catch (err) {
                console.error("Structure extraction failed", err);
            } finally {
                setIsExtractingStructure(false);
            }
        }
        setIsManualEditing(true);
    };

    const handleSaveManualEdit = async (newContent, newTitle) => {
        setIsSavingManual(true);
        try {
            const token = localStorage.getItem('token');
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const res = await axios.put(`${apiBase}/resumes/${id}`, {
                content: newContent,
                title: newTitle
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setResume(res.data.data); // Updates versions, content, and title
                setIsManualEditing(false);
                // Refresh preview is automatic because versionNumber in PDFPreview prop will change
            }
        } catch (err) {
            console.error("Manual save failed", err);
        } finally {
            setIsSavingManual(false);
        }
    };

    // Persist JD when it changes
    useEffect(() => {
        if (id && jobDescription) {
            localStorage.setItem(`ats_jd_${id}`, jobDescription);
        }
    }, [id, jobDescription]);

    // Load JD when ID becomes available (fix for initial load) or from localStorage if not passed via state
    useEffect(() => {
        if (id) {
            const savedJD = localStorage.getItem(`ats_jd_${id}`);
            if (savedJD && !jobDescription) {
                setJobDescription(savedJD);
            }
        }
    }, [id]);


    const autoSave = useCallback(async (content) => {
        if (!id || id === 'null' || id === 'undefined') {
            console.warn('Auto-save skipped: No valid id');
            return;
        }
        try {
            setSaveStatus('saving');
            const token = localStorage.getItem('token');
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            // Update to use the correct PUT endpoint and parsedText field
            await axios.put(`${apiBase}/resumes/${id}`, {
                parsedText: content
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            lastSavedRef.current = content;
            setSaveStatus('saved');
        } catch (err) {
            console.error('Auto-save error:', err);
            setSaveStatus('unsaved');
        }
    }, [id]);

    // ── PDF Download (direct file fetch) ───────────────────────────────────────
    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const sortedVersions = [...(resume?.versions || [])].sort((a, b) => b.versionNumber - a.versionNumber);
            const latestVersionNumber = sortedVersions.length > 0 ? sortedVersions[0].versionNumber : 1;
            // Stream the stored PDF directly from R2 via the version download endpoint
            window.location.href = `${apiBase}/resumes/${id}/version/${latestVersionNumber}/download?token=${token}`;
        } catch (err) {
            console.error('Download failed:', err);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };




    if (isLoading) return (
        <div className="page-wrapper" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
            <div className="ambient-bg" />
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '52px', height: '52px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem', boxShadow: '0 0 20px var(--primary-glow)' }} />
                <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Loading editor...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    if (fetchError || (!resume && !isLoading)) {
        return (
            <div className="page-wrapper" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
                <div className="ambient-bg" />
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, background: 'var(--bg-card)', padding: '3rem', borderRadius: '1rem', border: '1px solid rgba(239,68,68,0.2)', maxWidth: '400px' }}>
                    <AlertTriangle size={48} style={{ color: '#ef4444', margin: '0 auto 1.5rem' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>Unable to Load Resume</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{fetchError || "We couldn't find this resume. It may have been deleted or the file is temporarily unavailable."}</p>
                    <button onClick={() => navigate('/')} className="glow-btn" style={{ padding: '0.8rem 2rem' }}>
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    // Removed mandatory structure check block that was here (lines 422-463)
    // Resumes can now be viewed via PDF even without structured data.

    const saveStatusColor = saveStatus === 'saved' ? '#4ade80' : saveStatus === 'saving' ? '#fbbf24' : '#f87171';
    const saveStatusLabel = saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '⏳ Saving...' : '● Unsaved';

    return (
        <div style={{ height: wizardMode ? '100%' : '100vh', display: 'flex', flexDirection: 'column', background: wizardMode ? 'transparent' : 'var(--bg-deep)', color: 'var(--text-main)', overflow: 'hidden' }}>
            {!wizardMode && <Navbar />}

            {/* Spacer for fixed floating navbar (~80px from top + navbar pill height) */}
            {!wizardMode && <div style={{ height: '88px', flexShrink: 0 }} />}

            {/* Top toolbar — always visible, never scrolls */}
            <div style={{
                flexShrink: 0, zIndex: 50,
                background: wizardMode ? 'transparent' : 'var(--nav-bg)', backdropFilter: wizardMode ? 'none' : 'var(--blur)',
                WebkitBackdropFilter: wizardMode ? 'none' : 'var(--blur)',
                borderBottom: wizardMode ? 'none' : '1px solid var(--border)',
                padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'
            }}>
                {!wizardMode && (
                    <button
                        onClick={() => navigate(-1)}
                        className="ghost-btn"
                        style={{ fontSize: '0.85rem' }}
                    >
                        <ArrowLeft size={15} /> Back
                    </button>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif" }}>
                        {resume?.title || 'Resume Editor'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: saveStatusColor, fontWeight: '600', marginTop: '1px' }}>{saveStatusLabel}</div>
                </div>



                {/* ATS Optimizer Button */}
                <button
                    onClick={() => {
                        if (saveStatus !== 'saved') {
                            autoSave(currentContent);
                            setSaveStatus('saved');
                        }
                        setShowATS(true);
                    }}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: 'rgba(124,58,237,0.08)', border: '1px solid var(--primary-glow)',
                        borderRadius: '0.6rem', padding: '0.5rem 1rem', color: 'var(--primary-light)',
                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <BarChart3 size={15} /> ATS Match
                    {atsAnalysis && jobDescription && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-light)' }} />}
                </button>

                {/* Save manually */}
                <button
                    onClick={() => {
                        autoSave(currentContent);
                        if (saveStatus === 'saved') {
                            setSaveStatus('saving');
                            setTimeout(() => setSaveStatus('saved'), 500);
                        }
                    }}
                    disabled={saveStatus === 'saving'}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: saveStatus === 'unsaved' ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)',
                        border: `1px solid ${saveStatus === 'unsaved' ? 'var(--success)' : 'var(--border)'}`,
                        borderRadius: '0.6rem', padding: '0.5rem 1rem',
                        color: saveStatus === 'unsaved' ? 'var(--success-light)' : 'var(--text-muted)',
                        cursor: saveStatus === 'saving' ? 'default' : 'pointer',
                        fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s ease'
                    }}
                >
                    <Save size={14} /> {saveStatus === 'saved' ? 'Saved' : 'Save'}
                </button>




                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="glow-btn"
                    style={{ opacity: isDownloading ? 0.65 : 1, cursor: isDownloading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', padding: '0.55rem 1.25rem' }}
                >
                    <Download size={15} />
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                </button>

                <div
                    onClick={handleStartManualEdit}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.55rem 1rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.8rem',
                        color: 'white', cursor: 'pointer', fontSize: '0.85rem'
                    }}
                >
                    <Edit3 size={15} />
                    {isExtractingStructure ? 'Preparing...' : 'Edit Manually'}
                </div>

            </div>

            {/* Scrollable content area — only this region scrolls */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>


                {/* Main layout */}
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', minHeight: '100%', width: '100%' }}>

                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                        {/* ── Resume Preview (Unified HTML Rendering) ───────────────────── */}
                        <main style={{ flex: isManualEditing ? '0 0 600px' : '1', minWidth: 0, position: 'relative' }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ display: 'flex', justifyContent: 'center' }}
                            >
                                <PDFPreview
                                    resumeId={id}
                                    versionNumber={resume?.versions?.length > 0
                                        ? [...resume.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0].versionNumber
                                        : null
                                    }
                                />
                            </motion.div>
                        </main>

                        {/* ── Manual Editor Side Panel ────────────────────────────────── */}
                        <AnimatePresence>
                            {isManualEditing && (
                                <motion.aside
                                    initial={{ x: 300, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 300, opacity: 0 }}
                                    style={{ flex: 1, height: 'calc(100vh - 160px)', position: 'sticky', top: '100px' }}
                                >
                                    <StructuredManualEditor
                                        initialContent={resume.content}
                                        initialTitle={resume?.title}
                                        onSave={handleSaveManualEdit}
                                        onCancel={() => setIsManualEditing(false)}
                                        isSaving={isSavingManual}
                                    />
                                </motion.aside>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>


            {/* ATS Analysis Modal */}
            <AnimatePresence>
                {showATS && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', zIndex: 5000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ width: '100%', maxWidth: '600px', position: 'relative' }}
                        >
                            <ATSAnalysis
                                resumeId={id}
                                value={jobDescription}
                                initialData={atsAnalysis}
                                resumeContent={currentContent} // Pass latest content for real-time analysis
                                onJobDescriptionChange={setJobDescription}
                                onAnalysisComplete={(data) => {
                                    setAtsAnalysis(data);
                                    if (data && typeof data.score === 'number') {
                                        setResume(prev => ({ ...prev, atsScore: data.score }));
                                    }
                                }}
                                onClose={() => setShowATS(false)}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default ResumeEditor;



