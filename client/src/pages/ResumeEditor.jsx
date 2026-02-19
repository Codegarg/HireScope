import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import AIAssistant from '../components/AIAssistant';
import Navbar from '../components/Navbar';
import { ArrowLeft, Download, Sparkles, Save, Edit3, Check, X, MessageSquare, BarChart3 } from 'lucide-react';
import ATSAnalysis from '../components/ATSAnalysis';

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

    // 3. Title Case + short + surrounded by blank lines
    const isTitleCase = raw.split(/\s+/).every(w => /^[A-Z\/&(]/.test(w) || w.length <= 2);
    const prevBlank = !prevLine || prevLine.trim() === '';
    const nextBlank = !nextLine || nextLine.trim() === '';
    if (isTitleCase && raw.length <= 45 && (prevBlank || nextBlank) && raw.split(/\s+/).length <= 6) {
        if (!raw.includes(',') && !raw.match(/\b(19|20)\d{2}\b/)) {
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

                                    // 2. Sub-headings & Dates (Greedy alignment)
                                    const monthNames = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)";
                                    const datePart = `(?:${monthNames}\\s+)?(?:[0-9]{4}|Present)`;
                                    const dateRangeRegex = new RegExp(`^(.+?)\\s+(${datePart}\\s*[-–]\\s*${datePart})$`, 'i');

                                    const dateMatch = trimmed.match(dateRangeRegex);
                                    if (dateMatch) {
                                        return (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginBottom: '0.05rem', fontSize: '0.86rem', color: '#000' }}>
                                                <span>{dateMatch[1].trim()}</span>
                                                <span style={{ textAlign: 'right', marginLeft: '1rem' }}>{dateMatch[2].trim()}</span>
                                            </div>
                                        );
                                    }

                                    // 3. Project Names or Subtitles Highlight (Bold)
                                    const isProjectLine = (trimmed.includes('—') || trimmed.includes('–') || (trimmed.includes(' - ') && trimmed.length < 100)) && !trimmed.startsWith('•');
                                    const prevLine = arr[idx - 1] || '';
                                    const genDateRegex = new RegExp(`\\b${datePart}\\b`, 'i');
                                    const prevHadDate = prevLine.match(genDateRegex);

                                    if ((isProjectLine && (section.title.toLowerCase().includes('project') || trimmed.length < 65)) || (prevHadDate && trimmed.length < 90 && !trimmed.includes('•'))) {
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

    const [resume, setResume] = useState(null);
    const [sections, setSections] = useState([]);
    const [currentContent, setCurrentContent] = useState('');
    const [activeVersion, setActiveVersion] = useState(0);
    const [isImproving, setIsImproving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
    const [isDownloading, setIsDownloading] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [rewriteInstructions, setRewriteInstructions] = useState('');
    const [isRewriting, setIsRewriting] = useState(false);
    const saveTimeoutRef = useRef(null);
    const lastSavedRef = useRef('');

    const theme = {
        primary: '#7c3aed', primaryLight: '#a78bfa', secondary: '#4f46e5',
        glassBg: 'rgba(255, 255, 255, 0.03)', glassBorder: 'rgba(255, 255, 255, 0.08)',
        textMuted: '#94a3b8', radius: '1.5rem',
    };

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
    const [improvementsSummary, setImprovementsSummary] = useState([]);

    // ATS Integration State
    // ATS Integration State
    const [showATS, setShowATS] = useState(false);
    const [jobDescription, setJobDescription] = useState(() => {
        // Try to load from localStorage on init
        if (id) {
            return localStorage.getItem(`ats_jd_${id}`) || "";
        }
        return "";
    });
    const [isComparing, setIsComparing] = useState(false);

    // Persist JD when it changes
    useEffect(() => {
        if (id && jobDescription) {
            localStorage.setItem(`ats_jd_${id}`, jobDescription);
        }
    }, [id, jobDescription]);

    // Store the latest analysis result here to use in "Magic Improve"
    const [atsAnalysis, setAtsAnalysis] = useState(null);

    // Load JD when ID becomes available (fix for initial load)

    // Load JD when ID becomes available (fix for initial load)
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
        if (newText !== lastSavedRef.current) {
            setSaveStatus('unsaved');
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => autoSave(newText), 3000);
        }
    }, [autoSave]);

    const handleSectionSave = (index, newBody) => {
        const updated = sections.map((s, i) => i === index ? { ...s, body: newBody } : s);
        updateContent(updated);
    };

    // ── PDF Download (browser-side via jsPDF — always 1 page) ───────────────────
    const handleDownload = () => {
        setIsDownloading(true);
        try {
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight(); // 297mm
            const margin = 14;
            const contentW = pageW - margin * 2;
            const maxH = pageH - margin * 2; // usable height = ~269mm

            const monthNames = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)";
            const datePart = `(?:${monthNames}\\s+)?(?:[0-9]{4}|Present)`;
            const dateRegex = new RegExp(`^(.+?)\\s+(${datePart}\\s*[-–]\\s*${datePart})$`, 'i');

            const measureHeight = (nameFz, contactFz, headingFz, bodyFz, lineH, sectionGap) => {
                let h = 0;
                sections.forEach(section => {
                    if (section.title === '__header__') {
                        const hdrLines = section.body.split('\n').filter(Boolean);
                        const name = hdrLines[0] || '';
                        if (name) h += nameFz * 0.352 + 0.8;
                        const contact = hdrLines.slice(1).join('  |  ');
                        if (contact) h += contactFz * 0.352 + 1.5;
                        h += 1.5;
                    } else {
                        h += headingFz * 0.352 + 1.2 + 2.5;
                        if (section.body) {
                            const bodyLines = section.body.split('\n');
                            bodyLines.forEach((line) => {
                                const trimmed = line.trim();
                                if (!trimmed) { h += 1.5; return; }
                                if (trimmed.match(dateRegex)) { h += lineH; return; }

                                const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
                                doc.setFontSize(bodyFz);
                                if (isBullet) {
                                    const textOnly = trimmed.replace(/^[•-]\s*/, '');
                                    const bulletW = doc.getTextWidth('• ');
                                    const wrapped = doc.splitTextToSize(textOnly, contentW - bulletW);
                                    h += wrapped.length * lineH;
                                } else {
                                    const wrapped = doc.splitTextToSize(trimmed, contentW);
                                    h += wrapped.length * lineH;
                                }
                            });
                        }
                        h += sectionGap;
                    }
                });
                return h;
            };

            // ── Base font sizes ───────────────────────────────────────────────────
            const isModern = selectedTemplate === 'modern';
            const isMinimalist = selectedTemplate === 'minimalist';
            const pdfFont = isModern ? 'helvetica' : 'times';
            const pdfHeadingFont = isModern ? 'helvetica' : 'times';
            const accentColor = isModern ? [37, 99, 235] : [0, 0, 0];

            const baseNameFz = 15, baseContactFz = 9, baseHeadingFz = 10, baseBodyFz = 9;
            const baseLineH = 4.5, baseSectionGap = 4;

            const rawH = measureHeight(baseNameFz, baseContactFz, baseHeadingFz, baseBodyFz, baseLineH, baseSectionGap);

            // ── Compute scale to fit within maxH ──────────────────────────────────
            const scale = rawH > maxH ? maxH / rawH : 1;

            const nameFz = baseNameFz * scale;
            const contactFz = baseContactFz * scale;
            const headingFz = baseHeadingFz * scale;
            const bodyFz = baseBodyFz * scale;
            const lineH = baseLineH * scale;
            const sectionGap = baseSectionGap * scale;

            // Map accent color from template
            const hexToRgb = (hex) => {
                if (!hex) return [0, 0, 0];
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? [
                    parseInt(result[1], 16),
                    parseInt(result[2], 16),
                    parseInt(result[3], 16)
                ] : [0, 0, 0];
            };
            const themeRgb = hexToRgb(templateConfig.accentColor);

            // ── Render ────────────────────────────────────────────────────────────
            let y = margin;

            sections.forEach(section => {
                if (section.title === '__header__') {
                    const hdrLines = section.body.split('\n').filter(Boolean);
                    const name = hdrLines[0] || '';
                    const contact = hdrLines.slice(1).join('  |  ');

                    const align = templateConfig.headerAlignment;
                    const headerX = align === 'center' ? pageW / 2 : margin;

                    if (name) {
                        doc.setFont(pdfHeadingFont, 'bold');
                        doc.setFontSize(nameFz);
                        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
                        doc.text(name, headerX, y, { align: align });
                        y += nameFz * 0.352 + 0.8 * scale;
                    }
                    if (contact) {
                        doc.setFont(pdfFont, 'normal');
                        doc.setFontSize(contactFz);
                        doc.setTextColor(0, 0, 0);
                        doc.text(contact, headerX, y, { align: align });
                        y += contactFz * 0.352 + 1.5 * scale;
                    }
                    y += 1.5 * scale;
                } else {
                    // Section heading
                    doc.setFont(pdfHeadingFont, 'bold');
                    doc.setFontSize(headingFz);
                    doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);

                    const headingText = templateConfig.id === 'modern' ? section.title.toUpperCase() : section.title;
                    doc.text(headingText, margin, y);
                    y += headingFz * 0.352 + 0.5 * scale;

                    if (templateConfig.sectionLine) {
                        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
                        doc.setLineWidth(0.3);
                        doc.line(margin, y, pageW - margin, y);
                        y += 3.8 * scale;
                    } else {
                        y += 1.5 * scale;
                    }

                    // Body text
                    if (section.body) {
                        const bodyLines = section.body.split('\n').filter(l => l.trim());
                        const isCoursework = section.title.toLowerCase().includes('coursework');

                        if (isCoursework) {
                            const colW = contentW / 2;
                            let startY = y;
                            let maxColumnY = y;

                            // Split by NEWLINE or BULLET character to handle bunched items
                            const courseworkItems = section.body
                                .split(/[\n•]/)
                                .map(t => t.trim())
                                .filter(t => t.length > 0);

                            courseworkItems.forEach((item, bIdx) => {
                                const colIndex = bIdx % 2;
                                const finalColX = margin + (colIndex * colW);

                                // Reset Y for the second column item if we are on a new row
                                if (colIndex === 0 && bIdx > 0) {
                                    y = maxColumnY;
                                    startY = y;
                                } else if (colIndex === 1) {
                                    y = startY;
                                }

                                doc.setFont(pdfFont, 'normal');
                                doc.setFontSize(bodyFz);
                                doc.text('•', finalColX, y);
                                doc.text(item.replace(/^[•-]\s*/, ''), finalColX + 2, y);

                                const currentItemHeight = lineH;
                                y += currentItemHeight;
                                if (y > maxColumnY) maxColumnY = y;
                            });
                            y = maxColumnY;
                        }
                        else {
                            bodyLines.forEach((line, idx) => {
                                const trimmed = line.trim();
                                if (!trimmed) { y += 2 * scale; return; }

                                // 1. Sub-heading with Date (Split left/right)
                                const dateMatch = trimmed.match(dateRegex);
                                if (dateMatch) {
                                    doc.setFont(pdfFont, 'bold');
                                    doc.setFontSize(bodyFz);
                                    doc.setTextColor(0, 0, 0);
                                    doc.text(dateMatch[1].trim(), margin, y);
                                    doc.text(dateMatch[2].trim(), pageW - margin, y, { align: 'right' });
                                    y += lineH;
                                    return;
                                }

                                // 2. Subtitle or Project (bold per "proper ui")
                                const prevLine = bodyLines[idx - 1] || '';
                                const isProject = (trimmed.includes('—') || trimmed.includes('–') || (trimmed.includes(' - ') && trimmed.length < 80)) && !trimmed.startsWith('•');
                                if ((prevLine.match(dateRegex) || isProject) && trimmed.length < 90 && !trimmed.startsWith('•')) {
                                    doc.setFont(pdfFont, 'bold');
                                    doc.setFontSize(bodyFz);
                                    doc.setTextColor(0, 0, 0);
                                    doc.text(trimmed, margin, y);
                                    y += lineH;
                                    return;
                                }

                                // 3. Bold Keys (e.g., "Languages: ...") - Technical Skills
                                if (trimmed.includes(':') && trimmed.indexOf(':') < 35 && !trimmed.startsWith('•')) {
                                    const splitIdx = trimmed.indexOf(':');
                                    const skillKey = trimmed.slice(0, splitIdx + 1).trim();
                                    const skillVal = trimmed.slice(splitIdx + 1).trim();

                                    doc.setFont(pdfFont, 'bold');
                                    doc.setFontSize(bodyFz);
                                    doc.text(skillKey, margin, y);

                                    const keyW = doc.getTextWidth(skillKey + ' ');
                                    doc.setFont(pdfFont, 'normal');
                                    const wrappedVal = doc.splitTextToSize(skillVal, contentW - keyW);
                                    wrappedVal.forEach((rl, vIdx) => {
                                        doc.text(rl, margin + (vIdx === 0 ? keyW : 0), y);
                                        y += lineH;
                                    });
                                    return;
                                }

                                // 4. Regular or Bullet (with hanging indent)
                                doc.setFont(pdfFont, 'normal');
                                doc.setFontSize(bodyFz);
                                doc.setTextColor(0, 0, 0);

                                if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                                    const textOnly = trimmed.replace(/^[•-]\s*/, '');
                                    const bulletChar = '•';
                                    const bulletW = doc.getTextWidth(bulletChar + ' ');

                                    doc.text(bulletChar, margin, y);
                                    const wrapped = doc.splitTextToSize(textOnly, contentW - bulletW);
                                    wrapped.forEach(rl => {
                                        doc.text(rl, margin + bulletW, y);
                                        y += lineH;
                                    });
                                } else {
                                    const wrapped = doc.splitTextToSize(trimmed, contentW);
                                    wrapped.forEach(rl => {
                                        doc.text(rl, margin, y);
                                        y += lineH;
                                    });
                                }
                            });
                        }
                    }
                    y += sectionGap;
                }
            });

            doc.save(`${resume?.title || 'resume'}.pdf`);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };


    const handleAcceptImprovement = () => {
        if (!improvedContent) return;
        setCurrentContent(improvedContent);
        setSections(parseResumeIntoSections(improvedContent));
        setImprovedContent('');
        setIsComparing(false);
        setSaveStatus('unsaved');
        autoSave(improvedContent);
    };

    const handleRejectImprovement = () => {
        setImprovedContent('');
        setIsComparing(false);
    };

    // ── Magic Improve ────────────────────────────────────────────────────────────
    const handleMagicImprove = async () => {
        if (isImproving) return;
        setIsImproving(true);
        setIsComparing(false);
        setImprovedContent('');
        setImprovementsSummary([]);
        let fullContent = '';
        let buffer = '';
        let startedComparing = false;

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Authentication token missing. Please log in again.');

            const response = await fetch('http://localhost:5000/api/resumes/improve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: currentContent,
                    jobDescription: jobDescription, // Send JD for targeted improvements
                    atsAnalysis: atsAnalysis // Send detailed analysis (missing keywords, etc.)
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    // Handle both "data: {...}" and raw "{...}" cases (just in case)
                    let jsonPart = trimmed;
                    if (trimmed.startsWith('data: ')) {
                        jsonPart = trimmed.slice(6).trim();
                    }

                    if (jsonPart === '[DONE]') continue;

                    try {
                        const data = JSON.parse(jsonPart);
                        if (data.response) {
                            fullContent += data.response;

                            // Split by delimiter to separate resume from summary
                            const parts = fullContent.split('[CHANGES_DONE]');
                            const cleanResume = parts[0].trim();
                            setImprovedContent(cleanResume);

                            if (parts[1]) {
                                const summaryLines = parts[1].split('\n')
                                    .map(l => l.trim())
                                    .filter(l => l.startsWith('-') || l.startsWith('*') || l.length > 5)
                                    .map(l => l.replace(/^[-*]\s*/, '').trim());
                                setImprovementsSummary(summaryLines);
                            }

                            if (!startedComparing && cleanResume.length > 5) {
                                setIsComparing(true);
                                startedComparing = true;
                            }
                        } else if (data.error) {
                            throw new Error(data.error);
                        }
                    } catch (e) {
                        // Silent catch for partial JSON or non-JSON lines
                    }
                }
            }

            if (!fullContent) {
                throw new Error('AI returned an empty response. Please try again or check your internet.');
            }
        } catch (err) {
            console.error('Improvement error:', err);
            alert(`Magic Improve Error: ${err.message}`);
            setIsComparing(false);
        } finally {
            setIsImproving(false);
        }
    };

    // ── Section rewrite (selected text) ─────────────────────────────────────────
    const handleRewrite = async () => {
        if (!selectedText || !rewriteInstructions || isRewriting) return;
        setIsRewriting(true);
        const originalContent = currentContent;
        let fullReplacement = '';
        let buffer = '';
        const placeholder = `[Optimizing...]`;
        const tempContent = originalContent.replace(selectedText, placeholder);
        setCurrentContent(tempContent);
        setSections(parseResumeIntoSections(tempContent));

        try {
            const response = await fetch('http://localhost:5000/api/resumes/rewrite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ sectionText: selectedText, instructions: rewriteInstructions, resumeId: id })
            });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        const raw = trimmed.slice(6).trim();
                        if (raw === '[DONE]') continue;
                        try {
                            const data = JSON.parse(raw);
                            if (data.response) {
                                fullReplacement += data.response;
                                const updated = tempContent.replace(placeholder, fullReplacement);
                                setCurrentContent(updated);
                                setSections(parseResumeIntoSections(updated));
                            }
                        } catch { }
                    }
                }
            }
            setSelectedText('');
            setRewriteInstructions('');
        } catch (err) {
            console.error('Rewrite error:', err);
            setCurrentContent(originalContent);
            setSections(parseResumeIntoSections(originalContent));
        } finally {
            setIsRewriting(false);
        }
    };

    if (!resume) return (
        <div style={{ minHeight: '100vh', backgroundColor: '#030014', color: '#fff', display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ color: '#94a3b8' }}>Loading editor...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    const saveStatusColor = saveStatus === 'saved' ? '#4ade80' : saveStatus === 'saving' ? '#fbbf24' : '#f87171';
    const saveStatusLabel = saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '⏳ Saving...' : '● Unsaved';

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#030014', color: '#f8fafc', overflow: 'hidden' }}>
            <Navbar />

            {/* Spacer for fixed floating navbar (~80px from top + navbar pill height) */}
            <div style={{ height: '88px', flexShrink: 0 }} />

            {/* Top toolbar — always visible, never scrolls */}
            <div style={{
                flexShrink: 0, zIndex: 50,
                background: 'rgba(3, 0, 20, 0.97)', backdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.6rem', padding: '0.5rem 1rem', color: '#f8fafc', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                >
                    <ArrowLeft size={15} /> Back
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {resume?.title || 'Resume Editor'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: saveStatusColor, fontWeight: '600' }}>{saveStatusLabel}</div>
                </div>

                {/* Template Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 1rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Template</span>
                    <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.4rem 0.75rem', color: '#f8fafc', fontSize: '0.8rem', fontWeight: '600', outline: 'none', cursor: 'pointer' }}
                    >
                        {Object.values(TEMPLATE_CONFIGS).map(t => (
                            <option key={t.id} value={t.id} style={{ background: '#030014' }}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* ATS Optimizer Button */}
                <button
                    onClick={() => setShowATS(true)}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)',
                        borderRadius: '0.6rem', padding: '0.5rem 1rem', color: '#a78bfa',
                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <BarChart3 size={15} /> ATS Match
                    {jobDescription && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />}
                </button>

                {/* Save manually */}
                <button
                    onClick={() => {
                        autoSave(currentContent);
                        // Brief visual feedback if already saved
                        if (saveStatus === 'saved') {
                            setSaveStatus('saving');
                            setTimeout(() => setSaveStatus('saved'), 500);
                        }
                    }}
                    disabled={saveStatus === 'saving'}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: saveStatus === 'unsaved' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${saveStatus === 'unsaved' ? '#22c55e' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '0.6rem',
                        padding: '0.5rem 1rem',
                        color: saveStatus === 'unsaved' ? '#4ade80' : '#94a3b8',
                        cursor: saveStatus === 'saving' ? 'default' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Save size={14} /> {saveStatus === 'saved' ? 'Saved' : 'Save'}
                </button>

                {/* Magic Improve */}
                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(245,158,11,0.5)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMagicImprove}
                    disabled={isImproving}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.65rem 1.5rem',
                        background: isImproving
                            ? 'rgba(245,158,11,0.1)'
                            : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                        color: isImproving ? '#fbbf24' : 'white',
                        borderRadius: '0.8rem',
                        border: isImproving ? '1px solid rgba(245,158,11,0.3)' : 'none',
                        fontWeight: '800',
                        cursor: isImproving ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        minWidth: '170px',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <motion.div
                        animate={{
                            rotate: isImproving ? 360 : [0, 10, -10, 0],
                            scale: isImproving ? 1.2 : 1
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: isImproving ? 2 : 5,
                            ease: "linear"
                        }}
                    >
                        <Sparkles size={18} color={isImproving ? "#f59e0b" : "white"} fill={isImproving ? "none" : "rgba(255,255,255,0.2)"} />
                    </motion.div>
                    <span>{isImproving ? 'Weaving Magic...' : 'Magic Improve'}</span>

                    {/* Subtle shine effect */}
                    {!isImproving && (
                        <motion.div
                            animate={{ left: ['-100%', '200%'] }}
                            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                            style={{
                                position: 'absolute', top: 0, width: '40px', height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                pointerEvents: 'none'
                            }}
                        />
                    )}
                </motion.button>

                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.25rem', background: isDownloading ? 'rgba(124,58,237,0.2)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: isDownloading ? '#a78bfa' : 'white', borderRadius: '0.6rem', border: 'none', fontWeight: '700', cursor: isDownloading ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
                >
                    <Download size={15} />
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                </button>
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
                <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>

                    {/* ── Resume Preview (A4-style white card) ─────────────────────────── */}
                    <main style={{ flex: 1, minWidth: 0 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: '#ffffff', color: '#000',
                                borderRadius: '0.75rem', padding: '2.5rem 3rem',
                                minHeight: '900px', maxWidth: '760px',
                                margin: '0 auto',
                                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
                                fontFamily: templateConfig.fontFamily,
                            }}
                            onMouseUp={() => {
                                const sel = window.getSelection()?.toString().trim();
                                if (sel) setSelectedText(sel);
                            }}
                        >
                            {sections.map((section, i) => (
                                <SectionCard
                                    key={i}
                                    section={section}
                                    templateConfig={templateConfig}
                                    onSave={(newBody) => handleSectionSave(i, newBody)}
                                />
                            ))}

                            {sections.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem 2rem' }}>
                                    <p style={{ fontSize: '1.1rem' }}>No resume content yet.</p>
                                    <p style={{ fontSize: '0.85rem' }}>Go back and run an analysis first, or use Magic Improve to generate content.</p>
                                </div>
                            )}
                        </motion.div>

                        {/* Selection rewrite bar */}
                        <AnimatePresence>
                            {selectedText && (
                                <motion.div
                                    initial={{ opacity: 0, y: 40, x: '-50%' }}
                                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                                    exit={{ opacity: 0, y: 40, x: '-50%' }}
                                    style={{
                                        position: 'fixed', bottom: '2rem', left: '50%',
                                        background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(124,58,237,0.4)', borderRadius: '1rem',
                                        padding: '1rem 1.5rem', width: '90%', maxWidth: '580px', zIndex: 200,
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                    }}
                                >
                                    <div style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: '700', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        ✨ Optimize Selected Text
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            value={rewriteInstructions}
                                            onChange={e => setRewriteInstructions(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleRewrite()}
                                            placeholder="E.g. Make it more professional, add metrics..."
                                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.6rem', padding: '0.6rem 1rem', color: 'white', outline: 'none', fontSize: '0.85rem' }}
                                        />
                                        <button
                                            onClick={handleRewrite}
                                            disabled={isRewriting || !rewriteInstructions}
                                            style={{ padding: '0.6rem 1.25rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                        >
                                            {isRewriting ? '...' : 'Rewrite'}
                                        </button>
                                        <button onClick={() => setSelectedText('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.25rem' }}>✕</button>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.4rem' }}>
                                        Selected: "<span style={{ color: '#94a3b8' }}>{selectedText.slice(0, 60)}{selectedText.length > 60 ? '...' : ''}</span>"
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>

                </div>

            </div> {/* end scrollable content area */}

            {/* ── Magic Improve Comparison Overlay ──────────────────────────────── */}
            <AnimatePresence>
                {isComparing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 5000,
                            background: '#030014', display: 'flex', flexDirection: 'column'
                        }}
                    >
                        <div style={{
                            flexShrink: 0, padding: '1.25rem 2.5rem',
                            background: 'rgba(3, 0, 20, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(10px)'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <Sparkles size={20} color="#f59e0b" /> Highlighted AI Improvements
                                </h2>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Review the proposed changes before applying them to your resume.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={handleRejectImprovement}
                                    style={{ padding: '0.7rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '0.6rem', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Reject All
                                </button>
                                <button
                                    onClick={handleAcceptImprovement}
                                    style={{ padding: '0.7rem 1.5rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', color: 'white', borderRadius: '0.6rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
                                >
                                    Accept Changes
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            {/* Left: Original */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '3rem', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ position: 'sticky', top: 0, marginBottom: '1.5rem', textAlign: 'center', zIndex: 10 }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.8rem', borderRadius: '1rem', backdropFilter: 'blur(10px)' }}>Original Version</span>
                                </div>
                                <div style={{
                                    background: '#ffffff', color: '#000', borderRadius: '0.5rem', padding: '3rem',
                                    maxWidth: '800px', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                    fontFamily: templateConfig.fontFamily
                                }}>
                                    {sections.map((s, i) => (
                                        <SectionCard
                                            key={i}
                                            section={s}
                                            templateConfig={templateConfig}
                                            readOnly={true}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Right: Improved */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '3rem', background: 'rgba(124,58,237,0.02)' }}>
                                <div style={{ position: 'sticky', top: 0, marginBottom: '1.5rem', textAlign: 'center', zIndex: 10 }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(124,58,237,0.1)', padding: '0.3rem 0.8rem', borderRadius: '1rem', backdropFilter: 'blur(10px)' }}>✨ Improved Version</span>
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
                                    fontFamily: templateConfig.fontFamily
                                }}>
                                    {parseResumeIntoSections(improvedContent).map((s, i) => (
                                        <SectionCard
                                            key={i}
                                            section={s}
                                            templateConfig={templateConfig}
                                            readOnly={true}
                                        />
                                    ))}
                                    {isImproving && (
                                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                            <div style={{
                                                display: 'inline-block',
                                                width: '24px', height: '24px',
                                                border: '3px solid #7c3aed', borderTopColor: 'transparent',
                                                borderRadius: '50%',
                                                animation: 'spin 1s linear infinite'
                                            }} />
                                            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                                                {improvementsSummary.length > 0 ? 'Polishing the highlights...' : 'AI is weaving magic...'}
                                            </p>
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
                        whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowChat(true)}
                        style={{
                            position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 1000,
                            width: '62px', height: '62px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                            border: 'none', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        }}
                    >
                        <MessageSquare size={26} />
                    </motion.button>
                ) : (
                    <motion.div
                        key="chat-window"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        style={{
                            position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 1000,
                            width: '420px', height: '580px',
                            background: 'rgba(10, 10, 20, 0.92)',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: '1.5rem',
                            border: '1px solid rgba(124,58,237,0.35)',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                        }}
                    >
                        <div style={{
                            padding: '1rem 1.5rem',
                            background: 'rgba(255,255,255,0.02)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#a78bfa', letterSpacing: '0.05em' }}>AI ASSISTANT</span>
                            <button
                                onClick={() => setShowChat(false)}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex' }}
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
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ width: '100%', maxWidth: '600px', position: 'relative' }}
                        >
                            <button
                                onClick={() => setShowATS(false)}
                                style={{
                                    position: 'absolute', top: '-1rem', right: '-1rem',
                                    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)'
                                }}
                            >
                                <X size={16} />
                            </button>
                            <ATSAnalysis
                                resumeId={id}
                                value={jobDescription}
                                onJobDescriptionChange={setJobDescription}
                                onAnalysisComplete={setAtsAnalysis} // Capture analysis results
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ResumeEditor;


