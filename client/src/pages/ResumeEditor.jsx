import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

import Navbar from '../components/Navbar';
import {
    Download, BarChart3, AlertTriangle, Save, ArrowLeft, Loader2, Edit3
} from 'lucide-react';
import InlineResumeEditor from '../components/resume/InlineResumeEditor';
import ATSAnalysis from '../components/ATSAnalysis';

// ─── Main Component ───────────────────────────────────────────────────────────
const ResumeEditor = ({ wizardMode = false, passedId = null, initialContent = null }) => {
    const { id: paramId } = useParams();
    const id = passedId || paramId;
    const navigate = useNavigate();
    const location = useLocation();

    const [isLoading, setIsLoading] = useState(!location.state?.initialResume && !!id);
    const [fetchError, setFetchError] = useState(null);
    const [resume, setResume] = useState(location.state?.initialResume || null);
    
    // Initialize ATS analysis from state if available
    const [atsAnalysis, setAtsAnalysis] = useState(location.state?.analysisResults || null);
    const [jobDescription, setJobDescription] = useState(location.state?.analysisResults?.jdText || '');

    const [currentContent, setCurrentContent] = useState('');
    const [saveStatus, setSaveStatus] = useState('saved');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(''); // 'saved' | 'unsaved' | 'saving'
    const [isDownloading, setIsDownloading] = useState(false);
    
    // By default show ATS if we have job description or ats analysis, else we can toggle it
    const [showATS, setShowATS] = useState(!!location.state?.analysisResults || !!location.state?.initialResume?.atsScore);
    const lastSavedRef = useRef('');

    const [isExtractingStructure, setIsExtractingStructure] = useState(false);

    // ── Load resume ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchResume = async () => {
            if (location.state?.initialResume) {
                const initial = location.state.initialResume;
                setResume(initial);
                const content = initialContent || initial.parsedText || initial.originalContent || '';
                setCurrentContent(content);
                lastSavedRef.current = content;

                if (location.state.analysisResults) {
                    setAtsAnalysis(location.state.analysisResults);
                    if (location.state.analysisResults.jdText) {
                        setJobDescription(location.state.analysisResults.jdText);
                        if (initial._id) {
                            localStorage.setItem(`ats_jd_${initial._id}`, location.state.analysisResults.jdText);
                        }
                    }
                }
                checkAndExtractStructure(initial, initial._id);
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
                    const content = found.parsedText || found.originalContent || '';
                    setCurrentContent(content);
                    lastSavedRef.current = content;
                    checkAndExtractStructure(found, id);
                    if (found.atsScore) setShowATS(true);
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

    const checkAndExtractStructure = async (resumeData, resumeId) => {
        const needsExtraction = !resumeData.content || typeof resumeData.content === 'string' || Object.keys(resumeData.content).length === 0;
        if (needsExtraction && resumeId) {
            setIsExtractingStructure(true);
            try {
                const token = localStorage.getItem('token');
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                const res = await axios.post(`${apiBase}/resumes/${resumeId}/extract-structure`, {}, {
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
    };

    // Persist JD when it changes
    useEffect(() => {
        if (id && jobDescription) {
            localStorage.setItem(`ats_jd_${id}`, jobDescription);
        }
    }, [id, jobDescription]);

    // Load JD when ID becomes available
    useEffect(() => {
        if (id) {
            const savedJD = localStorage.getItem(`ats_jd_${id}`);
            if (savedJD && !jobDescription) {
                setJobDescription(savedJD);
            }
        }
    }, [id]);

    const handleSaveManualEdit = async (newContent, newTitle) => {
        setSaveStatus('saving');
        try {
            const token = localStorage.getItem('token');
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            // We stringify the JSON content to be used as parsedText for compatibility with other tools if needed
            // But we primarily save `content`.
            const parsedTextString = JSON.stringify(newContent, null, 2);
            setCurrentContent(parsedTextString);
            
            const res = await axios.put(`${apiBase}/resumes/${id}`, {
                content: newContent,
                parsedText: parsedTextString,
                title: newTitle
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setResume(res.data.data);
                setSaveStatus('saved');
            }
        } catch (err) {
            console.error("Manual save failed", err);
            setSaveStatus('unsaved');
        }
    };

    // ── PDF Download (direct file fetch) ───────────────────────────────────────
    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const token = localStorage.getItem('token');
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            
            const sortedVersions = [...(resume?.versions || [])].sort((a, b) => b.versionNumber - a.versionNumber);
            const latestVersionNumber = sortedVersions.length > 0 ? sortedVersions[0].versionNumber : 1;
            
            // Wait a brief moment if we just saved to ensure backend PDF generation finishes
            if (saveStatus === 'saving') {
                await new Promise(r => setTimeout(r, 1500)); 
            }
            
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
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)', fontFamily: "'Space Grotesk', sans-serif" }}>Unable to Load Resume</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{fetchError || "We couldn't find this resume. It may have been deleted or the file is temporarily unavailable."}</p>
                    <button onClick={() => navigate('/')} className="glow-btn" style={{ padding: '0.8rem 2rem' }}>
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    const saveStatusColor = saveStatus === 'saved' ? '#4ade80' : saveStatus === 'saving' ? '#fbbf24' : '#f87171';
    const saveStatusLabel = saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '⏳ Saving...' : '● Unsaved';

    return (
        <div style={{ height: wizardMode ? '100%' : '100vh', display: 'flex', flexDirection: 'column', background: wizardMode ? 'transparent' : 'var(--bg-deep)', color: 'var(--text-main)', overflow: 'hidden' }}>
            {!wizardMode && <Navbar />}

            {!wizardMode && <div style={{ height: '88px', flexShrink: 0 }} />}

            {/* Top toolbar */}
            <div style={{
                flexShrink: 0, zIndex: 50,
                background: wizardMode ? 'transparent' : 'var(--nav-bg)', backdropFilter: wizardMode ? 'none' : 'var(--blur)',
                WebkitBackdropFilter: wizardMode ? 'none' : 'var(--blur)',
                borderBottom: wizardMode ? 'none' : '1px solid var(--border)',
                padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'
            }}>
                {!wizardMode && (
                    <button onClick={() => navigate(-1)} className="ghost-btn" style={{ fontSize: '0.85rem' }}>
                        <ArrowLeft size={15} /> Back
                    </button>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditingTitle ? (
                            <input 
                                autoFocus
                                value={titleInput}
                                onChange={e => setTitleInput(e.target.value)}
                                onBlur={() => {
                                    setIsEditingTitle(false);
                                    if (titleInput && titleInput !== resume?.title) {
                                        handleSaveManualEdit(currentContent, titleInput);
                                    }
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') e.target.blur();
                                }}
                                style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--primary)', color: 'var(--text-main)', fontSize: '1rem', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif", outline: 'none' }}
                            />
                        ) : (
                            <div 
                                onClick={() => { setIsEditingTitle(true); setTitleInput(resume?.title || ''); }}
                                style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Space Grotesk', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                title="Click to rename"
                            >
                                {resume?.title || 'Resume Editor'}
                                <Edit3 size={14} style={{ opacity: 0.5 }} />
                            </div>
                        )}
                    <div style={{ fontSize: '0.72rem', color: saveStatusColor, fontWeight: '600', marginTop: '1px' }}>{saveStatusLabel}</div>
                </div>

                {/* Toggle ATS Panel */}
                <button
                    onClick={() => setShowATS(!showATS)}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: showATS ? 'var(--primary-glow)' : 'var(--bg-card)', 
                        border: showATS ? '1px solid var(--primary-glow)' : '1px solid var(--border)',
                        borderRadius: '0.6rem', padding: '0.5rem 1rem', 
                        color: showATS ? 'var(--primary-light)' : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <BarChart3 size={15} /> ATS Match
                    {atsAnalysis && jobDescription && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-light)' }} />}
                </button>

                {/* Save button manually (though auto-save happens inside the editor on Check click) */}
                <button
                    disabled={saveStatus === 'saving'}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.6rem', padding: '0.5rem 1rem',
                        color: 'var(--text-muted)',
                        cursor: saveStatus === 'saving' ? 'default' : 'pointer',
                        fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s ease',
                        opacity: saveStatus === 'saving' ? 0.7 : 1
                    }}
                >
                    <Save size={14} /> {saveStatus === 'saved' ? 'Saved' : 'Saving...'}
                </button>

                <button
                    onClick={handleDownload}
                    disabled={isDownloading || saveStatus === 'saving'}
                    className="glow-btn"
                    style={{ opacity: (isDownloading || saveStatus === 'saving') ? 0.65 : 1, cursor: (isDownloading || saveStatus === 'saving') ? 'not-allowed' : 'pointer', fontSize: '0.85rem', padding: '0.55rem 1.25rem' }}
                >
                    <Download size={15} />
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                </button>
            </div>

            {/* Main scrollable layout */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem', minHeight: '100%', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexDirection: showATS ? 'row' : 'column', justifyContent: 'center' }}>
                        
                        {/* ── Inline Editable Resume HTML ───────────────────── */}
                        <main style={{ flex: showATS ? '1' : '0 1 850px', minWidth: 0, position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                            {isExtractingStructure ? (
                                <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'white', borderRadius: '4px', width: '100%', maxWidth: '850px' }}>
                                    <Loader2 className="animate-spin" size={32} color="#3b82f6" />
                                    <p style={{ color: '#64748b' }}>Extracting resume structure for editing...</p>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                                >
                                    <InlineResumeEditor 
                                        resume={resume} 
                                        onSave={handleSaveManualEdit} 
                                    />
                                </motion.div>
                            )}
                        </main>

                        {/* ── ATS Analysis Side Panel ────────────────────────────────── */}
                        <AnimatePresence>
                            {showATS && (
                                <motion.aside
                                    initial={{ x: 300, opacity: 0, width: 0 }}
                                    animate={{ x: 0, opacity: 1, width: '450px' }}
                                    exit={{ x: 300, opacity: 0, width: 0 }}
                                    style={{ flexShrink: 0, height: 'calc(100vh - 160px)', position: 'sticky', top: '20px' }}
                                >
                                    <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                                    </div>
                                </motion.aside>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeEditor;
