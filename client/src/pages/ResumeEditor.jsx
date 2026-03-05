import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AIAssistant from '../components/AIAssistant';
import Navbar from '../components/Navbar';
import { ArrowLeft, Sparkles, Save, Check, X, Bot, ChevronDown, AlertTriangle, Download, Palette, BarChart3 } from 'lucide-react';
import ATSAnalysis from '../components/ATSAnalysis';
import PDFPreview from '../components/resume/PDFPreview';
import ResumeLayout from '../components/resume/ResumeLayout';



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
    const [isImproving, setIsImproving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
    const [isDownloading, setIsDownloading] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showATS, setShowATS] = useState(false);
    const [showImproveMenu, setShowImproveMenu] = useState(false);
    const improveMenuRef = useRef(null);
    const [improveMode, setImproveMode] = useState('structured'); // 'structured' | 'regenerate'
    const lastSavedRef = useRef('');
    const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

    const handleGenerateStructure = async () => {
        setIsGeneratingStructure(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`http://localhost:5000/api/resumes/${id}/structure`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                // Success: update the local resume state and it should trigger a re-render
                setResume(prev => ({ ...prev, resumeData: res.data.data }));
            }
        } catch (err) {
            console.error("Failed to generate structure:", err);
            setFetchError("Failed to generate resume structure automatically. Please try the Wizard.");
        } finally {
            setIsGeneratingStructure(false);
        }
    };

    // ── Dropdown Close Handler ───────────────────────────────────────────────
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (improveMenuRef.current && !improveMenuRef.current.contains(event.target)) {
                setShowImproveMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Load resume ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchResume = async () => {
            if (location.state?.initialResume) {
                const initial = location.state.initialResume;
                setResume(initial);
                // If initialContent is passed from Wizard, use it, otherwise fallback
                const content = initialContent || initial.content || initial.resumeText || '';
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
                const res = await axios.get(`http://localhost:5000/api/resumes/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const found = res.data.data;
                if (found) {
                    setResume(found);
                    const content = found.versions?.[found.currentVersionIndex]?.content || found.parsedText || found.originalContent || '';
                    setCurrentContent(content);
                    lastSavedRef.current = content;

                    // Fetch PDF as Blob to handle Authorization header for iframe
                    try {
                        const pdfRes = await axios.get(`http://localhost:5000/api/resumes/${id}/file`, {
                            headers: { Authorization: `Bearer ${token}` },
                            responseType: 'blob'
                        });
                        const url = URL.createObjectURL(pdfRes.data);
                        setPdfBlobUrl(url);
                    } catch (pdfErr) {
                        console.error('Error fetching PDF blob:', pdfErr);
                    }
                }
            } catch (err) {
                console.error('Error fetching resume:', err);
                setFetchError(err.response?.data?.message || 'Failed to load resume.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchResume();

        return () => {
            if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        };
    }, [id, location.state]);

    // ── Auto-trigger magic improve if ?improve=true ──────────────────────────────
    useEffect(() => {
        if (shouldImprove === 'true' && resume && !isImproving) {
            handleMagicImprove();
            navigate(`/editor/${id}`, { replace: true });
        }
    }, [resume, shouldImprove]);

    // ── Auto-save ────────────────────────────────────────────────────────────────
    // Magic Improve comparison states
    const [improvedContent, setImprovedContent] = useState('');
    const [improvedResumeData, setImprovedResumeData] = useState(null);
    const [improvementsSummary, setImprovementsSummary] = useState([]);
    const [originalSnapshot, setOriginalSnapshot] = useState(null); // pre-improve snapshot for restore
    const [postImproveAts, setPostImproveAts] = useState(null); // ATS_UPDATE from backend after improve
    const [resumeTheme, setResumeTheme] = useState('classic'); // 'classic', 'modern', 'minimal'
    const [isDownloadingImproved, setIsDownloadingImproved] = useState(false);
    const [improvedVersionNumber, setImprovedVersionNumber] = useState(null); // The generated candidate version

    // ATS Integration State
    const [isComparing, setIsComparing] = useState(false);

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
            // Update to use the correct PUT endpoint and parsedText field
            await axios.put(`http://localhost:5000/api/resumes/${id}`, {
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
        const element = document.getElementById('resume-pdf-container');
        if (!element) return;

        setIsDownloading(true);
        try {
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default ? html2pdfModule.default : html2pdfModule;
            const opt = {
                margin: 0,
                filename: `Resume_${resumeData.versionCounter || 1}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Generate blob instead of saving directly to browser
            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');

            const sortedVersions = [...(resumeData.versions || [])].sort((a, b) => b.versionNumber - a.versionNumber);
            const latestVersionNumber = sortedVersions.length > 0 ? sortedVersions[0].versionNumber : 1;
            const token = localStorage.getItem('token');

            // Upload the perfectly rendered PDF back to the server to securely store it in latestVersion.fileKey
            const formData = new FormData();
            formData.append('pdf', pdfBlob, opt.filename);

            await axios.put(`http://localhost:5000/api/resumes/${id}/version/${latestVersionNumber}/pdf`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Now that the backend contains the identical PDF, invoke the backend download system
            window.location.href = `http://localhost:5000/api/resumes/${id}/version/${latestVersionNumber}/download?token=${token}`;
        } catch (err) {
            console.error("PDF generation/upload failed:", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadImprovedPDF = async () => {
        const element = document.getElementById('resume-pdf-container');
        if (!element) return;

        setIsDownloadingImproved(true);
        try {
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default ? html2pdfModule.default : html2pdfModule;
            const opt = {
                margin: 0,
                filename: `${resume?.personalInfo?.fullName || 'Improved_Resume'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsDownloadingImproved(false);
        }
    };

    const handleAcceptImprovement = async () => {
        if (!improvedVersionNumber) {
            alert("No candidate version to commit.");
            return;
        }

        try {
            setSaveStatus('saving');
            const token = localStorage.getItem('token');
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            // Call the new commit endpoint to promote the candidate version to the root state
            const response = await fetch(`${apiBase}/resumes/${id}/commit/${improvedVersionNumber}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to apply improved version');
            }

            const { data: updatedResume } = await response.json();

            // Clean up states
            setOriginalSnapshot(null);
            setCurrentContent(improvedContent);
            setImprovedContent('');
            setImprovedResumeData(null);
            setImprovedVersionNumber(null);
            setIsComparing(false);
            setPostImproveAts(null);

            // Re-sync parent state if possible, or just rely on the API reload
            window.location.reload(); // Quickest way to sync all tabs/PDFs properly

        } catch (err) {
            console.error('Accept improvement error:', err);
            alert(`Failed to save improved resume: ${err.message}`);
            setSaveStatus('unsaved');
        }
    };

    const handleRejectImprovement = () => {
        setImprovedContent('');
        setImprovedResumeData(null);
        setImprovedVersionNumber(null);
        setIsComparing(false);
        setPostImproveAts(null);
    };

    const handleRestoreVersion = () => {
        if (!originalSnapshot) return;
        if (!window.confirm('Restore the version before Magic AI improvement? Your current content will be replaced.')) return;
        setCurrentContent(originalSnapshot);
        setOriginalSnapshot(null);
        setAtsAnalysis(null);
        setSaveStatus('unsaved');
        autoSave(originalSnapshot);
    };

    // ── Magic Improve ────────────────────────────────────────────────────────────
    const handleMagicImprove = async () => {
        // Fallback: use resume.content or resume.resumeText if currentContent is empty
        const contentToUse = currentContent && currentContent.trim().length >= 50
            ? currentContent
            : (resume?.parsedText || resume?.content || resume?.resumeText || '');

        if (!contentToUse || contentToUse.trim().length < 50) {
            alert("We couldn't extract enough text from your resume to improve it. Please paste your resume content manually first.");
            return;
        }

        if (isImproving) return;

        // ── Snapshot the current content before we overwrite it ──────────────────
        setOriginalSnapshot(contentToUse);
        setPostImproveAts(null);
        setIsImproving(true);
        setIsComparing(true); // Open overlay immediately to see the stream
        setImprovedContent('');
        setImprovementsSummary([]);

        setImprovedResumeData(null);
        setImprovedVersionNumber(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Authentication token missing. Please log in again.');

            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            // Call the standard JSON endpoint instead of the stream
            const response = await fetch(`${apiBase}/resumes/${id}/improve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: contentToUse,
                    jobDescription,
                    mode: improveMode,
                    previousScore: atsAnalysis?.atsScore || null
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to start improvement');
            }

            const data = await response.json();

            if (data.optimizedResume) {
                setImprovedContent(data.optimizedResume);
            }
            if (data.optimizedResumeData) {
                setImprovedResumeData(data.optimizedResumeData);
            }
            if (data.newAnalysis) {
                setAtsAnalysis(data.newAnalysis);
                setPostImproveAts({
                    atsScore: data.newScore,
                    scoreDelta: data.scoreDelta,
                    analysis: data.newAnalysis
                });
            }
            if (data.improvementSummary) {
                setImprovementsSummary([data.improvementSummary]);
            }
            if (data.newVersionNumber) {
                setImprovedVersionNumber(data.newVersionNumber);
            }

            if (data.llmFallback) {
                alert("AI optimization encountered an issue bridging structures. The original format has been preserved.");
            }

        } catch (err) {
            console.error('Improvement error:', err);
            alert(`Magic Improve Error: ${err.message}`);
            setIsComparing(false);
        } finally {
            setIsImproving(false);
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
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{fetchError || "We couldn't find this resume. It may have been deleted or doesn't have structured data."}</p>
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

                {/* Magic Improve Dropdown Button */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={improveMenuRef}>
                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleMagicImprove}
                        disabled={isImproving}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.65rem 1.2rem',
                            background: isImproving ? 'rgba(245,158,11,0.1)' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                            color: isImproving ? '#fbbf24' : 'white',
                            borderRadius: '0.8rem 0 0 0.8rem',
                            border: 'none', fontWeight: '800', cursor: isImproving ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem', minWidth: '160px', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)', transition: 'all 0.3s ease',
                            borderRight: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <Sparkles size={16} fill={isImproving ? "none" : "white"} />
                        <span>{isImproving ? 'Weaving Magic...' : (improveMode === 'structured' ? 'Optimize Content' : 'Regenerate Resume')}</span>
                    </motion.button>

                    <button
                        onClick={() => setShowImproveMenu(!showImproveMenu)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0.65rem 0.5rem',
                            background: isImproving ? 'rgba(245,158,11,0.1)' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                            color: 'white', borderRadius: '0 0.8rem 0.8rem 0',
                            border: 'none', cursor: 'pointer', height: '100%',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                        }}
                    >
                        <ChevronDown size={14} style={{ transform: showImproveMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>

                    <AnimatePresence>
                        {showImproveMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                style={{
                                    position: 'absolute', top: '110%', right: 0, zIndex: 100,
                                    background: 'rgba(30,30,45,0.98)', backdropFilter: 'blur(12px)',
                                    borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden', minWidth: '240px'
                                }}
                            >
                                <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <button
                                        onClick={() => { setImproveMode('structured'); setShowImproveMenu(false); }}
                                        style={{
                                            display: 'flex', flexDirection: 'column', width: '100%', padding: '0.8rem 1rem', textAlign: 'left',
                                            background: improveMode === 'structured' ? 'rgba(245,158,11,0.1)' : 'transparent',
                                            border: 'none', cursor: 'pointer', borderRadius: '0.6rem',
                                            color: improveMode === 'structured' ? '#f59e0b' : '#94a3b8',
                                            fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = improveMode === 'structured' ? 'rgba(245,158,11,0.1)' : 'transparent'}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Sparkles size={14} /> Optimize Content
                                        </span>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.2rem' }}>Surgical wording & keyword updates (Recommended)</span>
                                    </button>
                                    <button
                                        onClick={() => { setImproveMode('regenerate'); setShowImproveMenu(false); }}
                                        style={{
                                            display: 'flex', flexDirection: 'column', width: '100%', padding: '0.8rem 1rem', textAlign: 'left',
                                            background: improveMode === 'regenerate' ? 'rgba(245,158,11,0.1)' : 'transparent',
                                            border: 'none', cursor: 'pointer', borderRadius: '0.6rem',
                                            color: improveMode === 'regenerate' ? '#f59e0b' : '#94a3b8',
                                            fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = improveMode === 'regenerate' ? 'rgba(245,158,11,0.1)' : 'transparent'}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <AlertTriangle size={14} /> Regenerate Resume
                                        </span>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.2rem' }}>Full AI-powered rewrite for major changes (Experimental)</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>



                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="glow-btn"
                    style={{ opacity: isDownloading ? 0.65 : 1, cursor: isDownloading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', padding: '0.55rem 1.25rem' }}
                >
                    <Download size={15} />
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                </button>

                {/* Restore Earlier Version — only visible after accepting Magic Improve */}
                {originalSnapshot && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={handleRestoreVersion}
                        title="Restore the version before Magic AI improvement"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)',
                            borderRadius: '0.6rem', padding: '0.5rem 1rem',
                            color: '#f87171', cursor: 'pointer',
                            fontSize: '0.82rem', fontWeight: '700',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ↩ Restore Earlier
                    </motion.button>
                )}
            </div>

            {/* Scrollable content area — only this region scrolls */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

                {/* Magic Improve banner */}
                <AnimatePresence>
                    {isImproving && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '0.6rem 2rem', textAlign: 'center', fontSize: '0.85rem', color: '#fbbf24', fontWeight: '600' }}
                        >
                            ✨ AI is rewriting your resume for maximum impact — this may take 15–30 seconds...
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main layout */}
                <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem', minHeight: '100%' }}>

                    {/* ── Resume Preview (Fixed PDF Viewer) ───────────────────── */}
                    <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ display: 'flex', justifyContent: 'center' }}
                        >
                            <div
                                style={{
                                    width: '100%',
                                    maxWidth: '850px',
                                    padding: '0',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    minHeight: '800px'
                                }}
                            >
                                <ResumeLayout resumeData={resume?.resumeData || resume} theme={resumeTheme || 'classic'} />
                            </div>
                        </motion.div>
                    </main>
                </div>
            </div>

            {/* ── Magic Improve Comparison Overlay ──────────────────────────────── */}
            <AnimatePresence>
                {isComparing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 5000,
                            background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column'
                        }}
                    >
                        <div style={{
                            flexShrink: 0, padding: '1.25rem 2.5rem',
                            background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'var(--blur)'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: "'Outfit', sans-serif" }}>
                                    <Sparkles size={20} color="var(--accent)" /> Highlighted AI Improvements
                                </h2>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Review the proposed changes before applying them to your resume.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {/* Live ATS score badge — shown if backend sent ATS_UPDATE */}
                                {postImproveAts && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
                                        borderRadius: '0.6rem', padding: '0.4rem 0.85rem',
                                        fontSize: '0.78rem', fontWeight: '700', color: '#a78bfa'
                                    }}>
                                        <Sparkles size={13} />
                                        ATS {postImproveAts.atsScore}%
                                        {postImproveAts.scoreDelta != null && postImproveAts.scoreDelta > 0 && (
                                            <span style={{ color: '#4ade80', marginLeft: '0.3rem' }}>+{postImproveAts.scoreDelta} pts</span>
                                        )}
                                    </div>
                                )}

                                {improvedResumeData && (
                                    <button
                                        onClick={handleDownloadImprovedPDF}
                                        disabled={isDownloadingImproved}
                                        className="ghost-btn"
                                        style={{ padding: '0.7rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Download size={16} />
                                        {isDownloadingImproved ? 'Exporting...' : 'Download PDF'}
                                    </button>
                                )}

                                <button
                                    onClick={handleRejectImprovement}
                                    className="ghost-btn"
                                    style={{ padding: '0.7rem 1.5rem' }}
                                >
                                    Keep Original
                                </button>
                                <button
                                    onClick={handleAcceptImprovement}
                                    className="glow-btn"
                                    style={{ padding: '0.7rem 1.5rem' }}
                                    disabled={!improvedContent && !improvedVersionNumber}
                                >
                                    Use Improved
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            {/* Left: Original */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', borderRight: '1px solid var(--border)' }}>
                                <div style={{ position: 'sticky', top: 0, marginBottom: '1.5rem', textAlign: 'center', zIndex: 10 }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'var(--bg-elevated)', padding: '0.3rem 0.8rem', borderRadius: '9999px', backdropFilter: 'var(--blur)' }}>Original Version</span>
                                </div>
                                <div style={{
                                    background: '#f1f5f9', borderRadius: '0.5rem', padding: '0',
                                    maxWidth: '800px', margin: '0 auto',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', overflow: 'hidden', minHeight: '800px'
                                }}>
                                    <ResumeLayout resumeData={resume?.resumeData || resume} theme={resumeTheme || 'classic'} />
                                </div>
                            </div>

                            {/* Right: Improved */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(124,58,237,0.04)' }}>
                                <div style={{ position: 'sticky', top: 0, marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', zIndex: 10 }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(124,58,237,0.15)', padding: '0.3rem 0.8rem', borderRadius: '9999px', backdropFilter: 'var(--blur)', border: '1px solid var(--primary-glow)', display: 'flex', alignItems: 'center' }}>
                                        ✨ Improved Version
                                    </span>

                                    {/* Theme Switcher */}
                                    {improvedResumeData && (
                                        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                                            {['classic', 'modern', 'minimal'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setResumeTheme(t)}
                                                    style={{
                                                        background: resumeTheme === t ? 'var(--primary-light)' : 'transparent',
                                                        color: resumeTheme === t ? '#fff' : 'var(--text-muted)',
                                                        border: 'none',
                                                        padding: '0.2rem 0.8rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: resumeTheme === t ? '600' : '500',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        textTransform: 'capitalize',
                                                        display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                    }}
                                                >
                                                    {resumeTheme === t && <Palette size={12} />}
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {improvementsSummary.length > 0 && (
                                    <div style={{
                                        marginBottom: '1.5rem',
                                        padding: '1.2rem',
                                        background: 'rgba(124, 58, 237, 0.05)',
                                        border: '1px solid rgba(124, 58, 237, 0.15)',
                                        borderRadius: '0.75rem',
                                        maxWidth: '800px',
                                        margin: '0 auto 1.5rem'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', color: '#a78bfa', fontWeight: '800', fontSize: '0.8rem' }}>
                                            <Sparkles size={14} />
                                            WEAVING MAGIC: WHAT'S IMPROVED
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem' }}>
                                            {improvementsSummary.map((s, i) => (
                                                <div key={i} style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                    <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>•</span>
                                                    <span>{s}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{
                                    margin: '0 auto',
                                    display: 'flex', flexDirection: 'column',
                                    justifyContent: (isImproving && !improvedContent) ? 'center' : 'flex-start'
                                }}>
                                    {isImproving && !improvedContent && (
                                        <div style={{
                                            background: '#ffffff', color: '#1e293b', borderRadius: '0.5rem', padding: '3rem',
                                            maxWidth: '800px', margin: '0 auto', boxShadow: '0 20px 40px rgba(124,58,237,0.1)',
                                            minHeight: '800px', width: '100%',
                                            display: 'flex', flexDirection: 'column', justifyContent: 'center'
                                        }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    display: 'inline-block',
                                                    width: '40px', height: '40px',
                                                    border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed',
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite',
                                                    marginBottom: '1rem'
                                                }} />
                                                <p style={{ fontSize: '0.9rem', color: '#7c3aed', fontWeight: '700', margin: 0 }}>
                                                    {improvementsSummary.length > 0 ? 'Polishing the highlights...' : 'AI is weaving magic...'}
                                                </p>
                                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>Wait for the magic to appear...</p>
                                            </div>
                                        </div>
                                    )}

                                    {!isImproving && improvedVersionNumber && (
                                        <div style={{ boxShadow: '0 20px 40px rgba(124,58,237,0.15)', borderRadius: '8px', overflow: 'hidden', margin: '0 auto', background: '#fff' }}>
                                            <PDFPreview
                                                key={`pdf-improved-${improvedVersionNumber}`}
                                                resumeId={id}
                                                versionNumber={improvedVersionNumber}
                                            />
                                        </div>
                                    )}

                                    {!isImproving && !improvedVersionNumber && improvedResumeData && (
                                        <div style={{ boxShadow: '0 20px 40px rgba(124,58,237,0.15)', borderRadius: '8px', overflow: 'hidden', margin: '0 auto', background: '#fff' }}>
                                            <ResumeLayout resumeData={improvedResumeData} theme={resumeTheme} />
                                        </div>
                                    )}

                                    {!isImproving && !improvedResumeData && !improvedVersionNumber && improvedContent && (
                                        <div style={{
                                            background: '#ffffff', color: '#1e293b', borderRadius: '0.5rem', padding: '3rem',
                                            maxWidth: '800px', margin: '0 auto', boxShadow: '0 20px 40px rgba(124,58,237,0.1)',
                                            minHeight: '800px', width: '100%'
                                        }}>
                                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.85rem' }}>
                                                {improvedContent}
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Floating AI Chat Bubble ──────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {!showChat ? (
                    <motion.button
                        key="chat-trigger"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setShowChat(true)}
                        style={{
                            position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 5000,
                            width: '62px', height: '62px', borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            border: 'none', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', boxShadow: '0 8px 32px var(--primary-glow)',
                        }}
                    >
                        <Bot size={26} />
                    </motion.button>
                ) : (
                    <motion.div
                        key="chat-window"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        style={{
                            position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 5000,
                            width: '420px', height: '580px',
                            background: 'var(--nav-bg)',
                            backdropFilter: 'var(--blur)', WebkitBackdropFilter: 'var(--blur)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border)',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <div style={{
                            padding: '1rem 1.5rem',
                            background: 'var(--bg-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            borderBottom: '1px solid var(--border)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-light)' }} />
                                <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--primary-light)', letterSpacing: '0.05em' }}>AI ASSISTANT</span>
                            </div>
                            <button
                                onClick={() => setShowChat(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <AIAssistant context={{ resumeText: currentContent, jobDescription }} hideHeader={true} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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



