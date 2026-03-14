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
import StreamingResumeView from '../components/resume/StreamingResumeView';
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
    const [isImproving, setIsImproving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
    const [isDownloading, setIsDownloading] = useState(false);
    const [showATS, setShowATS] = useState(false);
    const lastSavedRef = useRef('');
    const [baselineVersionNumber, setBaselineVersionNumber] = useState(null);

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
    const [improvementsSummary, setImprovementsSummary] = useState([]);
    const [originalSnapshot, setOriginalSnapshot] = useState(null); // pre-improve snapshot for restore
    const [postImproveAts, setPostImproveAts] = useState(null); // ATS_UPDATE from backend after improve
    const [isDownloadingImproved, setIsDownloadingImproved] = useState(false);
    const [improvedVersionNumber, setImprovedVersionNumber] = useState(null); // The generated candidate version

    // ATS Integration State
    const [isComparing, setIsComparing] = useState(false);

    // Manual Editing State
    const [isManualEditing, setIsManualEditing] = useState(false);
    const [isSavingManual, setIsSavingManual] = useState(false);
    const [isExtractingStructure, setIsExtractingStructure] = useState(false);

    // ── Persistence / Restoration ──────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        const savedState = localStorage.getItem(`magic_improve_${id}`);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.improvedContent) {
                    setImprovedContent(parsed.improvedContent);
                    setIsComparing(true);
                    if (parsed.improvedVersionNumber) setImprovedVersionNumber(parsed.improvedVersionNumber);
                    if (parsed.improvementsSummary) setImprovementsSummary(parsed.improvementsSummary);
                    if (parsed.originalSnapshot) setOriginalSnapshot(parsed.originalSnapshot);
                    if (parsed.baselineVersionNumber) setBaselineVersionNumber(parsed.baselineVersionNumber);
                }
            } catch (e) {
                console.error("Failed to restore magic improve state", e);
            }
        }
    }, [id]);

    useEffect(() => {
        if (!id) return;
        if (isComparing && (improvedContent || improvedVersionNumber)) {
            const stateToSave = {
                improvedContent,
                improvedVersionNumber,
                improvementsSummary,
                originalSnapshot,
                baselineVersionNumber
            };
            localStorage.setItem(`magic_improve_${id}`, JSON.stringify(stateToSave));
        } else if (!isComparing && !isImproving) {
            localStorage.removeItem(`magic_improve_${id}`);
        }
    }, [id, isComparing, isImproving, improvedContent, improvedVersionNumber, improvementsSummary]);

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

    const handleDownloadImprovedPDF = async () => {
        const element = document.getElementById('resume-pdf-container');
        if (!element) return;

        setIsDownloadingImproved(true);
        try {
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default ? html2pdfModule.default : html2pdfModule;
            const opt = {
                margin: 0,
                filename: `${resume?.title || 'Improved_Resume'}.pdf`,
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
                },
                body: JSON.stringify({
                    improvedText: improvedContent,
                    analysis: atsAnalysis
                })
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
        setImprovedVersionNumber(null);
        setIsComparing(false);
        setPostImproveAts(null);
        if (id) localStorage.removeItem(`magic_improve_${id}`);
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
        if (isImproving) return;
        if (!id) {
            alert("No resume ID found. Please refresh and try again.");
            return;
        }

        // Safely determine which content to use, ensuring it's a string
        let contentToUse = typeof currentContent === 'string' && currentContent.trim().length >= 50
            ? currentContent
            : (resume?.parsedText || resume?.resumeText || '');

        // If we only have structured content (object), stringify it for the AI
        if ((!contentToUse || contentToUse.length < 50) && resume?.content && typeof resume.content === 'object') {
            contentToUse = JSON.stringify(resume.content, null, 2);
        }

        if (!contentToUse || typeof contentToUse !== 'string' || contentToUse.trim().length < 50) {
            alert("We couldn't extract enough text from your resume to improve it.");
            return;
        }

        setOriginalSnapshot(contentToUse);
        const sorted = (resume?.versions || []).sort((a, b) => b.versionNumber - a.versionNumber);
        setBaselineVersionNumber(sorted[0]?.versionNumber || null);

        setPostImproveAts(null);
        setIsImproving(true);
        setIsComparing(true);
        setImprovedContent('');
        setImprovementsSummary([]);
        setImprovedVersionNumber(null);

        try {
            const token = localStorage.getItem('token');
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            const response = await fetch(`${apiBase}/resumes/${id}/improve-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: contentToUse,
                    jobDescription,
                    mode: 'structured',
                    previousScore: atsAnalysis?.atsScore || null
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to start improvement stream');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";
            let lineBuffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (lineBuffer.trim().startsWith('data: ')) {
                        processLine(lineBuffer.trim());
                    }
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                lineBuffer += chunk;
                
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop();

                for (const line of lines) {
                    processLine(line.trim());
                }
            }

            function processLine(line) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (!dataStr || dataStr === '[DONE]') return;

                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                        if (parsed.response) {
                            accumulatedText += parsed.response;
                            
                            // SURGICAL FILTER: Remove preambles/markdown during live stream
                            let displayableText = accumulatedText;
                            
                            // 1. Strip markdown fences and basic formatting
                            displayableText = displayableText
                                .replace(/```[\w]*\n?/gi, '')
                                .replace(/```/g, '')
                                .replace(/[#*_~`]/g, ''); // Strip all markdown symbols

                            // 2. Find start of resume (candidate's name)
                            const firstLineOriginal = contentToUse.split('\n').find(l => l.trim().length > 0) || '';
                            const needle = firstLineOriginal.trim().toLowerCase().substring(0, 15);
                            
                            if (needle) {
                                const lowerText = displayableText.toLowerCase();
                                const startIndex = lowerText.indexOf(needle);
                                if (startIndex !== -1) {
                                    displayableText = displayableText.substring(startIndex);
                                } else if (displayableText.length > 500) {
                                    // Safety fallback: if we've accumulated a lot and can't find name,
                                    // the AI might have started with a different name or format.
                                    // Just show it to avoid a blank screen, but usually startIndex works.
                                } else {
                                    // Haven't reached the name yet, keep it hidden
                                    displayableText = '';
                                }
                            }
                            
                            if (displayableText) {
                                setImprovedContent(displayableText);
                            }
                        } else if (parsed.type === 'metadata') {
                            if (parsed.newAnalysis) setAtsAnalysis(parsed.newAnalysis);
                            if (parsed.newVersionNumber) setImprovedVersionNumber(parsed.newVersionNumber);
                            if (parsed.improvementSummary) setImprovementsSummary([parsed.improvementSummary]);
                            if (parsed.newScore) {
                                setPostImproveAts({
                                    atsScore: parsed.newScore,
                                    scoreDelta: parsed.scoreDelta,
                                    analysis: parsed.newAnalysis
                                });
                            }
                        }
                    } catch (e) {
                        console.warn("Error parsing SSE line:", line, e);
                    }
                }
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

                {/* Magic Improve Button */}
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
                        borderRadius: '0.8rem',
                        border: 'none', fontWeight: '800', cursor: isImproving ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem', minWidth: '160px', justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)', transition: 'all 0.3s ease'
                    }}
                >
                    <Sparkles size={16} fill={isImproving ? "none" : "white"} />
                    <span>{isImproving ? 'Weaving Magic...' : 'Magic Improve'}</span>
                </motion.button>



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
                                {improvedVersionNumber && (
                                    <button
                                        onClick={async () => {
                                            const token = localStorage.getItem('token');
                                            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                                            window.location.href = `${apiBase}/resumes/${id}/version/${improvedVersionNumber}/download?token=${token}`;
                                        }}
                                        className="ghost-btn"
                                        style={{ padding: '0.7rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Download size={16} />
                                        Download Improved PDF
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
                                <div style={{ display: 'flex', justifyContent: 'center', transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                                    <PDFPreview resumeId={id} versionNumber={baselineVersionNumber} />
                                </div>
                            </div>

                            {/* Right: Improved */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(124,58,237,0.04)' }}>
                                <div style={{ position: 'sticky', top: 0, marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', zIndex: 10 }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(124,58,237,0.15)', padding: '0.3rem 0.8rem', borderRadius: '9999px', backdropFilter: 'var(--blur)', border: '1px solid var(--primary-glow)', display: 'flex', alignItems: 'center' }}>
                                        ✨ Improved Version
                                    </span>
                                </div>

                                {improvementsSummary.length > 0 && (
                                    <div style={{
                                        marginBottom: '1.5rem',
                                        padding: '1.2rem',
                                        background: 'rgba(124, 58, 237, 0.05)',
                                        border: '1px solid rgba(124, 58, 237, 0.15)',
                                        borderRadius: '0.75rem',
                                        maxWidth: '850px',
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

                                <div style={{ display: 'flex', justifyContent: 'center', transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                                    {isImproving || (improvedContent && !improvedVersionNumber) ? (
                                        <StreamingResumeView content={improvedContent} />
                                    ) : (
                                        <PDFPreview resumeId={id} versionNumber={improvedVersionNumber} />
                                    )}
                                </div>
                            </div>
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



