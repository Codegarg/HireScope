import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import AIAssistant from '../components/AIAssistant';
import Navbar from '../components/Navbar';
import { ArrowLeft, Download, Sparkles, Save, Edit3, Check, X, MessageSquare, BarChart3, Bot, ChevronDown, AlertTriangle } from 'lucide-react';
import ATSAnalysis from '../components/ATSAnalysis';
import ResumeRenderer from '../components/resume/ResumeRenderer';
import PDFPreview from '../components/resume/PDFPreview';
import ResumeLayout from '../components/resume/ResumeLayout';

// ─── Templates Configuration ──────────────────────────────────────────────────
const TEMPLATE_CONFIGS = {
    classic: {
        id: 'classic',
        name: 'Classic',
        fontFamily: "'Times New Roman', Georgia, serif",
        headingFont: "'Times New Roman', Georgia, serif",
        headerAlignment: 'center',
        sectionLine: true,
        fontSize: '0.82rem',
        headingSize: '0.92rem',
        contactSize: '0.78rem',
        nameSize: '1.4rem',
        lineSpacing: '1.55',
        sectionGap: '1.2rem'
    },
    modern: {
        id: 'modern',
        name: 'Modern',
        fontFamily: "'Inter', -apple-system, sans-serif",
        headingFont: "'Inter', -apple-system, sans-serif",
        headerAlignment: 'left',
        sectionLine: true,
        fontSize: '0.8rem',
        headingSize: '0.95rem',
        contactSize: '0.75rem',
        nameSize: '1.6rem',
        accentColor: '#2563eb', // Clean blue accent
        lineSpacing: '1.6',
        sectionGap: '1.4rem'
    },
    minimalist: {
        id: 'minimalist',
        name: 'Minimalist',
        fontFamily: "Georgia, serif",
        headingFont: "-apple-system, sans-serif",
        headerAlignment: 'center',
        sectionLine: false,
        fontSize: '0.82rem',
        headingSize: '0.9rem',
        contactSize: '0.75rem',
        nameSize: '1.25rem',
        lineSpacing: '1.7',
        sectionGap: '1.5rem',
        letterSpacing: '0.02em'
    }
};

// ─── Smart heading detector ───────────────────────────────────────────────────
// Detects if a line is a resume section heading using heuristics:
//  1. ALL CAPS (e.g. "EDUCATION", "WORK EXPERIENCE")
//  2. Title Case + short + standalone (surrounded by blank lines OR at start)
//  3. Matches known heading keywords (case-insensitive)
const KNOWN_HEADINGS = new Set([
    'summary', 'professional summary', 'objective', 'career objective', 'profile', 'about', 'about me',
    'experience', 'work experience', 'employment', 'work history', 'professional experience',
    'education', 'academic background', 'academic qualifications',
    'skills', 'technical skills', 'core competencies', 'key skills', 'skill set', 'skill summary',
    'projects', 'project experience', 'personal projects', 'academic projects', 'key projects',
    'certifications', 'certificates', 'awards', 'honors', 'achievements', 'accomplishments',
    'languages', 'interests', 'hobbies', 'volunteer', 'volunteering', 'community service',
    'publications', 'references', 'declaration',
    'relevant coursework', 'coursework', 'courses', 'related coursework',
    'leadership', 'extracurricular', 'leadership / extracurricular',
    'leadership/extracurricular', 'leadership & extracurricular', 'leadership and extracurricular',
    'activities', 'co-curricular', 'co curricular', 'extra curricular', 'extracurricular activities',
    'training', 'internships', 'internship', 'apprenticeship',
    'research', 'research experience', 'research & publications',
    'tools', 'technologies', 'tech stack', 'tools & technologies',
    'open source', 'portfolio', 'github projects',
    'contact', 'personal information', 'personal details',
]);

// isHeadingLine: strict-only mode (only KNOWN_HEADINGS) or full heuristics
function isHeadingLine(line, prevLine, nextLine, strictOnly = false) {
    // Strip markdown formatting like **EXPERIENCE** or # EXPERIENCE
    let raw = line.trim().replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/__/g, '').trim();

    if (!raw || raw.length > 60) return false;

    // Skip obvious non-headings
    if (raw.startsWith('•') || raw.startsWith('-') || raw.startsWith('*') || raw.startsWith('·')) return false;
    if (raw.startsWith('http') || raw.includes('@')) return false;
    // Skip lines that look like phone numbers or addresses
    if (/^[\d\s()\-+]{7,}$/.test(raw)) return false;

    // Skip conversational fluff (e.g., "Here is a rewritten...", "I hope this...")
    const fluffKeywords = ['here is', 'it is optimized', 'i have', 'rewrite of', 'rewritten version', 'hope this helps'];
    if (fluffKeywords.some(k => raw.toLowerCase().includes(k))) return false;

    // 1. Exact match with known headings (case-insensitive) — always active
    const lower = raw.toLowerCase().replace(/:$/, '').trim();
    if (KNOWN_HEADINGS.has(lower)) return true;

    // 2 & 3 only active after the header block has been consumed
    if (strictOnly) return false;

    // 2. ALL CAPS line
    const upperRaw = raw.replace(/[^A-Za-z\s\/&]/g, '');
    if (upperRaw.trim().length >= 3 && upperRaw.trim() === upperRaw.trim().toUpperCase()) {
        return true;
    }
    // ── Dynamic Font Scaling Logic ──────────────────────────────────────────
    useLayoutEffect(() => {
        if (!resumeContainerRef.current || resume?.originalFileKey) return;

        const container = resumeContainerRef.current;
        const targetHeight = 1123; // A4 height @ 96 DPI
        const minFs = 11.5; // Slightly lower min to be safe
        const maxFs = 16;

        // Use a small delay to ensure DOM is fully painted if needed, but 
        // usually scrollHeight is ready in useLayoutEffect.
        const scrollH = container.scrollHeight;

        // If too big, shrink
        if (scrollH > targetHeight + 2 && fontScale > minFs) {
            setFontScale(prev => Math.max(minFs, prev - 0.25));
        }
        // If too small (less than 94% of page), grow
        else if (scrollH < targetHeight * 0.94 && fontScale < maxFs) {
            setFontScale(prev => Math.min(maxFs, prev + 0.25));
        }

        setIsOverflowing(scrollH > targetHeight + 10 && fontScale <= minFs);
    }, [currentContent, sections, fontScale, selectedTemplate]);
    // 3. Title Case + short + surrounded by blank lines
    const isTitleCase = raw.split(/\s+/).every(w => /^[A-Z\/&(]/.test(w) || w.length <= 2);
    const prevBlank = !prevLine || prevLine.trim() === '';
    const nextBlank = !nextLine || nextLine.trim() === '';
    if (isTitleCase && raw.length <= 45 && (prevBlank || nextBlank) && raw.split(/\s+/).length <= 6) {
        // Exclude lines with hyphens/dashes (likely project titles e.g. "Project - Tech")
        // unless it's a known format like "Leadership / Extracurricular"
        if (!raw.includes(',') && !raw.match(/\b(19|20)\d{2}\b/) && !raw.includes(' - ') && !raw.includes(' – ')) {
            return true;
        }
    }

    return false;
}

function parseResumeIntoSections(text) {
    if (!text) return [{ title: 'Content', body: '' }];

    const lines = text.split('\n');
    const sections = [];
    let currentTitle = null;
    let currentBody = [];
    let headerLines = [];
    let seenFirstSection = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Strip markdown boldness
        const strippedLine = line.replace(/\*\*/g, '').replace(/__/g, '');

        const prevLine = lines[i - 1] ?? '';
        const nextLine = lines[i + 1] ?? '';
        const strictOnly = !seenFirstSection;

        if (isHeadingLine(line, prevLine, nextLine, strictOnly)) {
            seenFirstSection = true;
            // Save previous section or header
            if (currentTitle !== null) {
                sections.push({ title: currentTitle, body: currentBody.join('\n').trim() });
            } else if (currentBody.length > 0 || headerLines.length > 0) {
                const headText = [...headerLines, ...currentBody].join('\n').trim();
                // Strip common intro fluff if it's the very first part of the header
                const cleanHead = headText.replace(/^(here is|it is|i have|professional|this is).*\n/i, '').trim();
                if (cleanHead) sections.push({ title: '__header__', body: cleanHead });
            }
            // Start new section (strip markdown from title too)
            currentTitle = strippedLine.trim().replace(/:$/, '').trim();
            currentBody = [];
        } else {
            // Check for intro fluff at the very beginning before first section
            if (!seenFirstSection) {
                const lower = strippedLine.toLowerCase().trim();
                const isFluff = lower.includes('here is') || lower.includes('i have') || lower.includes('optimized resume') || lower.includes('rewritten version');
                if (!isFluff || headerLines.length > 0) {
                    headerLines.push(strippedLine);
                }
            } else {
                currentBody.push(strippedLine);
            }
        }
    }

    // Push last section
    if (currentTitle !== null) {
        sections.push({ title: currentTitle, body: currentBody.join('\n').trim() });
    } else if (headerLines.length > 0 || currentBody.length > 0) {
        sections.push({ title: '__header__', body: [...headerLines, ...currentBody].join('\n').trim() });
    }

    if (sections.length === 0) {
        sections.push({ title: 'Resume', body: text.trim() });
    }

    return sections;
}

function sectionsToText(sections) {
    return sections.map(s => {
        if (s.title === '__header__') return s.body;
        return `${s.title}\n${s.body}`;
    }).join('\n\n');
}

// ─── Single editable section card ────────────────────────────────────────────
const SectionCard = ({ section, onSave, templateConfig, readOnly = false }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(section.body);
    const textareaRef = useRef(null);

    useEffect(() => { setDraft(section.body); }, [section.body]);
    const isHeader = section.title === '__header__';

    const startEdit = () => { setEditing(true); setTimeout(() => textareaRef.current?.focus(), 50); };
    const cancel = () => { setDraft(section.body); setEditing(false); };
    const save = () => { onSave(draft); setEditing(false); };

    // Parse header: first non-empty line = name, rest = contact lines
    const headerLinesArr = isHeader ? section.body.split('\n').filter(l => l.trim()) : [];
    const candidateName = headerLinesArr[0] || '';
    const contactLines = headerLinesArr.slice(1);

    return (
        <div style={{ marginBottom: isHeader ? templateConfig.sectionGap : '0.9rem', position: 'relative', fontFamily: templateConfig.fontFamily }}>
            {/* Header section — name centered, contacts centered */}
            {isHeader && !editing && (
                <div style={{ textAlign: templateConfig.headerAlignment, paddingBottom: '0.1rem', marginBottom: '0.1rem', position: 'relative' }}>
                    <div style={{
                        fontSize: templateConfig.nameSize,
                        fontWeight: '700',
                        color: templateConfig.accentColor || '#000',
                        letterSpacing: templateConfig.letterSpacing || '0px',
                        marginBottom: '0.15rem',
                        lineHeight: 1.2,
                        fontFamily: templateConfig.headingFont
                    }}>
                        {candidateName}
                    </div>
                    {contactLines.length > 0 && (
                        <div style={{
                            fontSize: templateConfig.contactSize,
                            color: '#000',
                            lineHeight: '1.4',
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: templateConfig.headerAlignment === 'center' ? 'center' : 'flex-start',
                            gap: '0.2rem 1.1rem',
                            textDecoration: 'none'
                        }}>
                            {contactLines.map((cl, idx) => (
                                <span key={idx} style={{ whiteSpace: 'nowrap', textDecoration: cl.trim().includes('@') || cl.trim().startsWith('http') || cl.trim().includes('linkedin') || cl.trim().includes('github') ? 'underline' : 'none' }}>{cl.trim()}</span>
                            ))}
                        </div>
                    )}
                    {!readOnly && (
                        <button onClick={startEdit} style={{ ...editBtnStyle, position: 'absolute', top: 0, right: 0 }} title="Edit header">
                            <Edit3 size={13} /> Edit
                        </button>
                    )}
                </div>
            )}

            {/* Regular section — bold black heading + thin black line */}
            {!isHeader && !editing && (
                <div style={{ position: 'relative', marginTop: '0.4rem' }}>
                    {/* Heading row: bold black title left + tiny edit btn right */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.05rem' }}>
                        <div style={{
                            fontSize: templateConfig.headingSize,
                            fontWeight: '700',
                            color: templateConfig.accentColor || '#000',
                            letterSpacing: templateConfig.letterSpacing || '0',
                            fontFamily: templateConfig.headingFont,
                            textTransform: templateConfig.id === 'modern' ? 'uppercase' : 'none'
                        }}>
                            {section.title}
                        </div>
                        {!readOnly && (
                            <button onClick={startEdit} style={editBtnStyle} title="Edit section">
                                <Edit3 size={12} />
                            </button>
                        )}
                    </div>
                    {/* Thin black separator line — just like original resume */}
                    {templateConfig.sectionLine && (
                        <div style={{ borderTop: `1px solid ${templateConfig.accentColor || '#000'}`, marginBottom: '0.45rem' }} />
                    )}
                    <div style={{
                        fontSize: templateConfig.fontSize,
                        lineHeight: templateConfig.lineSpacing,
                        color: '#000',
                        whiteSpace: 'pre-wrap',
                        fontFamily: templateConfig.fontFamily
                    }}>
                        {section.body ? (
                            (() => {
                                const isCoursework = section.title.toLowerCase().includes('coursework');
                                const allLines = section.body.split('\n');

                                if (isCoursework) {
                                    // Split by NEWLINE or BULLET character to handle bunched items
                                    const items = section.body
                                        .split(/[\n•]/)
                                        .map(t => t.trim())
                                        .filter(t => t.length > 0);

                                    return (
                                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                            {items.map((item, idx) => (
                                                <div key={idx} style={{ flex: '0 0 50%', display: 'flex', gap: '0.4rem', marginBottom: '0.1rem' }}>
                                                    <span style={{ flexShrink: 0 }}>•</span>
                                                    <span>{item.replace(/^[•-]\s*/, '')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }

                                return allLines.map((line, idx, arr) => {
                                    const trimmed = line.trim();
                                    if (!trimmed) return <div key={idx} style={{ height: '0.4rem' }} />;

                                    // 1. Bullet points
                                    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                                        return (
                                            <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.1rem', paddingLeft: '0.2rem' }}>
                                                <span style={{ flexShrink: 0 }}>•</span>
                                                <span>{trimmed.replace(/^[•-]\s*/, '')}</span>
                                            </div>
                                        );
                                    }

                                    // 2. Sub-headings & Dates (Greedy alignment + Merged string fix)
                                    const monthNames = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)";
                                    const datePart = `(?:${monthNames}\\s+)?(?:[0-9]{4}|Present)`;

                                    // Detect merged text like "MemberSep" or "PlatformGitHub"
                                    const socialLinks = "(?:GitHub|LinkedIn|Portfolio|Website|http|www)";
                                    const metadataFullRegex = new RegExp(`^(.+?)(?:\\s{2,}|(?=${monthNames}|${socialLinks}))(${datePart}\\s*[-–]\\s*${datePart}|${socialLinks}.*)$`, 'i');

                                    const metaMatch = trimmed.match(metadataFullRegex);
                                    if (metaMatch) {
                                        return (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginBottom: '0.05rem', fontSize: '0.86rem', color: '#000' }}>
                                                <span>{metaMatch[1].trim()}</span>
                                                <span style={{ textAlign: 'right', marginLeft: '1rem', fontWeight: '500', fontSize: '0.82rem' }}>{metaMatch[2].trim()}</span>
                                            </div>
                                        );
                                    }

                                    // 3. Project Names or Subtitles Highlight (Bold)
                                    const isProjectLine = (trimmed.includes('—') || trimmed.includes('–') || (trimmed.includes(' - ') && trimmed.length < 100)) && !trimmed.startsWith('•');
                                    const prevLine = arr[idx - 1] || '';
                                    const genDateRegex = new RegExp(`\\b${datePart}\\b`, 'i');
                                    const prevHadDate = prevLine.match(genDateRegex);

                                    if (isProjectLine && (section.title.toLowerCase().includes('project') || trimmed.length < 65) && !metaMatch) {
                                        return (
                                            <div key={idx} style={{ fontWeight: '700', marginBottom: '0.15rem', color: '#000', fontSize: '0.86rem' }}>
                                                {trimmed}
                                            </div>
                                        );
                                    }

                                    // 4. Bold Keys (e.g., "Languages: ...")
                                    if (trimmed.includes(':') && trimmed.indexOf(':') < 30) {
                                        const splitIdx = trimmed.indexOf(':');
                                        const key = trimmed.slice(0, splitIdx);
                                        const val = trimmed.slice(splitIdx + 1);
                                        return (
                                            <div key={idx} style={{ marginBottom: '0.15rem' }}>
                                                <span style={{ fontWeight: '700' }}>{key}:</span> {val}
                                            </div>
                                        );
                                    }

                                    return <div key={idx} style={{ marginBottom: '0.15rem' }}>{trimmed}</div>;
                                });
                            })()
                        ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Empty section. Click edit to add content.</span>
                        )}
                    </div>
                </div>
            )}

            {/* Edit mode */}
            {editing && (
                <div>
                    {!isHeader && (
                        <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.4rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem' }}>
                            {section.title}
                        </div>
                    )}
                    {isHeader && (
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.4rem' }}>
                            Name / Contact Header
                        </div>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        rows={Math.max(4, draft.split('\n').length + 2)}
                        style={{
                            width: '100%', resize: 'vertical', border: '2px solid #7c3aed',
                            borderRadius: '0.5rem', padding: '0.75rem', fontFamily: "'Times New Roman', Georgia, serif",
                            fontSize: '0.82rem', lineHeight: '1.65', outline: 'none',
                            color: '#0f172a', background: '#f8faff',
                        }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', justifyContent: 'flex-end' }}>
                        <button onClick={cancel} style={{ ...smallBtnStyle, background: '#f1f5f9', color: '#475569' }}>
                            <X size={14} /> Cancel
                        </button>
                        <button onClick={save} style={{ ...smallBtnStyle, background: '#7c3aed', color: 'white' }}>
                            <Check size={14} /> Save
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const editBtnStyle = {
    position: 'relative', background: 'none', border: '1px solid #e2e8f0', borderRadius: '0.375rem',
    padding: '3px 8px', cursor: 'pointer', color: '#94a3b8', display: 'inline-flex', alignItems: 'center',
    gap: '4px', fontSize: '0.7rem', transition: 'all 0.15s',
};

const smallBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.85rem',
    borderRadius: '0.5rem', border: 'none', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer',
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ResumeEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { search } = location;
    const queryParams = new URLSearchParams(search);
    const shouldImprove = queryParams.get('improve');

    const [resume, setResume] = useState(location.state?.initialResume || null);
    const [sections, setSections] = useState([]);
    // Initialize ATS analysis from state if available
    const [atsAnalysis, setAtsAnalysis] = useState(location.state?.analysisResults || null);
    const [jobDescription, setJobDescription] = useState(location.state?.analysisResults?.jdText || '');

    const [currentContent, setCurrentContent] = useState('');
    const [fontScale, setFontScale] = useState(14); // 14px default
    const [isOverflowing, setIsOverflowing] = useState(false);
    const resumeContainerRef = useRef(null);
    const [activeVersion, setActiveVersion] = useState(0);
    const [isImproving, setIsImproving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
    const [isDownloading, setIsDownloading] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showATS, setShowATS] = useState(false);
    const [showImproveMenu, setShowImproveMenu] = useState(false);
    const improveMenuRef = useRef(null);
    const [improveMode, setImproveMode] = useState('structured'); // 'structured' | 'regenerate'
    const saveTimeoutRef = useRef(null);
    const lastSavedRef = useRef('');

    const theme = {
        primary: '#7c3aed', primaryLight: '#a78bfa', secondary: '#4f46e5',
        glassBg: 'rgba(255, 255, 255, 0.03)', glassBorder: 'rgba(255, 255, 255, 0.08)',
        textMuted: '#94a3b8', radius: '1.5rem',
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
                const content = initial.content || initial.resumeText || '';
                setCurrentContent(content);
                lastSavedRef.current = content;
                setSections(parseResumeIntoSections(content));
                setActiveVersion(initial.currentVersionIndex || 0);

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
                    const content = found.versions?.[found.currentVersionIndex]?.content || found.originalContent || '';
                    setCurrentContent(content);
                    lastSavedRef.current = content;
                    setSections(parseResumeIntoSections(content));
                    setActiveVersion(found.currentVersionIndex || 0);
                }
            } catch (err) { console.error('Error fetching resume:', err); }
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
    const [selectedTemplate, setSelectedTemplate] = useState('classic');
    const templateConfig = TEMPLATE_CONFIGS[selectedTemplate];

    // Magic Improve comparison states
    const [improvedContent, setImprovedContent] = useState('');
    const [improvedResumeData, setImprovedResumeData] = useState(null); // structured JSON from V2 mode
    const [improvementsSummary, setImprovementsSummary] = useState([]);
    const [originalSnapshot, setOriginalSnapshot] = useState(null); // pre-improve snapshot for restore
    const [postImproveAts, setPostImproveAts] = useState(null); // ATS_UPDATE from backend after improve
    const [previewTab, setPreviewTab] = useState('original'); // 'original' | 'improved'

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
            await axios.post('http://localhost:5000/api/resumes/version', {
                resumeId: id, content, feedback: 'Auto-saved'
            }, { headers: { Authorization: `Bearer ${token}` } });
            lastSavedRef.current = content;
            setSaveStatus('saved');
        } catch (err) {
            console.error('Auto-save error:', err);
            setSaveStatus('unsaved');
        }
    }, [id]);

    // ── Sync sections → currentContent ──────────────────────────────────────────
    const updateContent = useCallback((newSections) => {
        const newText = sectionsToText(newSections);
        setCurrentContent(newText);
        setSections(newSections);
        // Clear ATS analysis when content changes, so user knows score is stale
        if (newText !== lastSavedRef.current) {
            setAtsAnalysis(null);
            setSaveStatus('unsaved');
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => autoSave(newText), 3000);
        }
    }, [autoSave]);

    const handleSectionSave = (index, newBody) => {
        const updated = sections.map((s, i) => i === index ? { ...s, body: newBody } : s);
        updateContent(updated);
    };

    // ── PDF Download (WYSIWYG via Window.Print) ──────────────────────────────
    const handleDownload = () => {
        window.print();
    };

    const handleAcceptImprovement = () => {
        if (!improvedContent) return;
        setOriginalSnapshot(currentContent);
        setCurrentContent(improvedContent);
        setSections(parseResumeIntoSections(improvedContent));
        setImprovedContent('');
        setImprovedResumeData(null);
        setIsComparing(false);
        // Apply post-improve ATS score if we got one from the backend
        if (postImproveAts) {
            setAtsAnalysis(prev => ({ ...prev, ...postImproveAts, score: postImproveAts.atsScore }));
            if (postImproveAts.atsScore != null) {
                setResume(prev => ({ ...prev, atsScore: postImproveAts.atsScore }));
            }
            setPostImproveAts(null);
        } else {
            setAtsAnalysis(null); // Clear old analysis so user re-runs
        }
        setSaveStatus('unsaved');
        autoSave(improvedContent);
    };

    const handleRejectImprovement = () => {
        setImprovedContent('');
        setImprovedResumeData(null);
        setIsComparing(false);
        setPostImproveAts(null);
    };

    const handleRestoreVersion = () => {
        if (!originalSnapshot) return;
        if (!window.confirm('Restore the version before Magic AI improvement? Your current content will be replaced.')) return;
        setCurrentContent(originalSnapshot);
        setSections(parseResumeIntoSections(originalSnapshot));
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
            : (resume?.content || resume?.resumeText || '');

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
        setImprovedResumeData(null);
        setImprovementsSummary([]);

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Authentication token missing. Please log in again.');

            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            // Use fetch for streaming (ReadableStream)
            const response = await fetch(`${apiBase}/resumes/${id}/improve-stream`, {
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
                throw new Error(errData.message || 'Failed to start improvement stream');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (!dataStr || dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);

                            if (data.response) {
                                accumulatedText += data.response;
                                setImprovedContent(accumulatedText);
                            } else if (data.type === 'metadata') {
                                // Final metadata updates
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
                            } else if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (e) {
                            // Ignored: likely non-JSON chunk or mid-stream cut
                        }
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



    if (!resume) return (
        <div className="page-wrapper" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
            <div className="ambient-bg" />
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '52px', height: '52px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem', boxShadow: '0 0 20px var(--primary-glow)' }} />
                <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Loading editor...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    const saveStatusColor = saveStatus === 'saved' ? '#4ade80' : saveStatus === 'saving' ? '#fbbf24' : '#f87171';
    const saveStatusLabel = saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '⏳ Saving...' : '● Unsaved';

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-deep)', color: 'var(--text-main)', overflow: 'hidden' }}>
            <Navbar />

            {/* Spacer for fixed floating navbar (~80px from top + navbar pill height) */}
            <div style={{ height: '88px', flexShrink: 0 }} />

            {/* Top toolbar — always visible, never scrolls */}
            <div style={{
                flexShrink: 0, zIndex: 50,
                background: 'var(--nav-bg)', backdropFilter: 'var(--blur)',
                WebkitBackdropFilter: 'var(--blur)',
                borderBottom: '1px solid var(--border)',
                padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    className="ghost-btn"
                    style={{ fontSize: '0.85rem' }}
                >
                    <ArrowLeft size={15} /> Back
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif" }}>
                        {resume?.title || 'Resume Editor'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: saveStatusColor, fontWeight: '600', marginTop: '1px' }}>{saveStatusLabel}</div>
                </div>

                {/* Template Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 1rem', borderLeft: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Template</span>
                    <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.4rem 0.75rem', color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: '600', outline: 'none', cursor: 'pointer' }}
                    >
                        {Object.values(TEMPLATE_CONFIGS).map(t => (
                            <option key={t.id} value={t.id} style={{ background: 'var(--bg-surface)' }}>{t.name}</option>
                        ))}
                    </select>
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

                    {/* ── Resume Preview (Fixed A4 One-Page WYSIWYG) ───────────────────── */}
                    <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                        {/* Overflow Warning */}
                        <AnimatePresence>
                            {isOverflowing && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                    style={{
                                        position: 'absolute', top: '2rem', right: '-16rem', width: '14rem',
                                        background: 'rgba(239, 68, 68, 0.95)', color: 'white', padding: '1rem',
                                        borderRadius: '0.8rem', fontSize: '0.75rem', fontWeight: '600',
                                        boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)', border: '1px solid rgba(255,255,255,0.2)',
                                        zIndex: 10
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <AlertTriangle size={16} /> Content Overflow!
                                    </div>
                                    Resume exceeds one page. Please reduce content or sections to fit the professional limit.
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ display: 'flex', justifyContent: 'center' }}
                        >
                            <div
                                id="resume-container"
                                ref={resumeContainerRef}
                                style={{
                                    width: '794px', // A4 at 96 DPI
                                    height: '1123px', // A4 at 96 DPI
                                    background: '#ffffff',
                                    padding: '0',
                                    boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7)',
                                    overflow: 'hidden',
                                    fontSize: `${fontScale}px`,
                                    position: 'relative'
                                }}
                            >
                                {/* Print CSS */}
                                <style>{`
                                    @media print {
                                        body * { visibility: hidden; }
                                        #resume-container, #resume-container * { visibility: visible; }
                                        #resume-container {
                                            position: fixed;
                                            left: 0;
                                            top: 0;
                                            margin: 0;
                                            padding: 0;
                                            box-shadow: none;
                                            width: 210mm;
                                            height: 297mm;
                                            background: white;
                                            z-index: 9999;
                                        }
                                        @page {
                                            size: A4;
                                            margin: 0;
                                        }
                                    }
                                `}</style>

                                {resume?.originalFileKey
                                    ? <PDFPreview
                                        key={`pdf-${resume._id}`}
                                        resumeId={resume._id}
                                        fallbackText={currentContent}
                                        templateConfig={templateConfig}
                                    />
                                    : <ResumeRenderer
                                        text={currentContent}
                                        templateConfig={templateConfig}
                                    />
                                }
                            </div>
                        </motion.div>
                    </main>

                    {/* ── Edit Sections Panel ─────────────────────────────────────────── */}
                    <details
                        style={{
                            marginTop: '1.5rem', maxWidth: '760px', margin: '1.5rem auto 0',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '1rem', overflow: 'hidden',
                            background: 'rgba(255,255,255,0.02)',
                        }}
                    >
                        <summary style={{
                            padding: '0.85rem 1.5rem', cursor: 'pointer', listStyle: 'none',
                            fontWeight: '700', fontSize: '0.82rem', color: '#94a3b8',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            userSelect: 'none',
                        }}>
                            <Edit3 size={14} /> Edit Individual Sections
                        </summary>
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {sections.map((section, i) => (
                                <SectionCard
                                    key={i}
                                    section={section}
                                    templateConfig={templateConfig}
                                    onSave={(newBody) => handleSectionSave(i, newBody)}
                                />
                            ))}
                            {sections.length === 0 && (
                                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No sections found. Upload a resume first.</p>
                            )}
                        </div>
                    </details>
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
                                <button
                                    onClick={handleRejectImprovement}
                                    className="ghost-btn"
                                    style={{ padding: '0.7rem 1.5rem' }}
                                >
                                    Reject All
                                </button>
                                <button
                                    onClick={handleAcceptImprovement}
                                    className="glow-btn"
                                    style={{ padding: '0.7rem 1.5rem' }}
                                >
                                    Accept Changes
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            {/* Left: Original */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '3rem', borderRight: '1px solid var(--border)' }}>
                                <div style={{ position: 'sticky', top: 0, marginBottom: '1.5rem', textAlign: 'center', zIndex: 10 }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'var(--bg-elevated)', padding: '0.3rem 0.8rem', borderRadius: '9999px', backdropFilter: 'var(--blur)' }}>Original Version</span>
                                </div>
                                <div style={{
                                    background: '#ffffff', color: '#000', borderRadius: '0.5rem', padding: '3rem',
                                    maxWidth: '800px', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                    fontFamily: templateConfig.fontFamily,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center'
                                }}>
                                    <ResumeRenderer text={currentContent} templateConfig={templateConfig} />
                                </div>
                            </div>

                            {/* Right: Improved */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '3rem', background: 'rgba(124,58,237,0.04)' }}>
                                <div style={{ position: 'sticky', top: 0, marginBottom: '1.5rem', textAlign: 'center', zIndex: 10 }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(124,58,237,0.15)', padding: '0.3rem 0.8rem', borderRadius: '9999px', backdropFilter: 'var(--blur)', border: '1px solid var(--primary-glow)' }}>✨ Improved Version</span>
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
                                    background: '#ffffff', color: '#000', borderRadius: '0.5rem', padding: '3rem',
                                    maxWidth: '800px', margin: '0 auto', boxShadow: '0 20px 40px rgba(124,58,237,0.1)',
                                    fontFamily: templateConfig.fontFamily,
                                    minHeight: '600px',
                                    display: 'flex', flexDirection: 'column',
                                    justifyContent: (isImproving && !improvedContent) ? 'center' : 'flex-start'
                                }}>
                                    {isImproving ? (
                                        improvedContent ? (
                                            // Real-time typewriter streaming view
                                            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.6', color: '#1e293b', width: '100%' }}>
                                                {improvedContent}
                                                <motion.span
                                                    animate={{ opacity: [1, 0] }}
                                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                                    style={{ display: 'inline-block', width: '8px', height: '1.2em', background: '#7c3aed', marginLeft: '4px', verticalAlign: 'middle' }}
                                                />
                                            </div>
                                        ) : (
                                            // Loading spinner before stream starts
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
                                        )
                                    ) : (
                                        <ResumeRenderer text={improvedContent} templateConfig={templateConfig} />
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



