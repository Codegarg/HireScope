import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AIAssistant from '../components/AIAssistant';
import Navbar from '../components/Navbar';

const ResumeEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);
    const shouldImprove = queryParams.get('improve');

    const [resume, setResume] = useState(null);
    const [currentContent, setCurrentContent] = useState('');
    const [activeVersion, setActiveVersion] = useState(0);
    const [isRewriting, setIsRewriting] = useState(false);
    const [isImproving, setIsImproving] = useState(false);
    const [rewriteInstructions, setRewriteInstructions] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [lastSavedContent, setLastSavedContent] = useState('');
    const saveTimeoutRef = useRef(null);

    const theme = {
        primary: '#7c3aed',
        primaryLight: '#a78bfa',
        secondary: '#4f46e5',
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
        const fetchResume = async () => {
            // Priority: Check if state was passed from Home.jsx
            if (location.state?.initialResume) {
                const initial = location.state.initialResume;
                setResume(initial);
                setCurrentContent(initial.content);
                setLastSavedContent(initial.content);
                setActiveVersion(initial.currentVersionIndex || 0);
                return; // Skip loading if we have the data
            }

            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`http://localhost:5000/api/resumes/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const found = res.data.data;
                if (found) {
                    setResume(found);
                    const content = found.versions[found.currentVersionIndex].content;
                    setCurrentContent(content);
                    setLastSavedContent(content);
                    setActiveVersion(found.currentVersionIndex);
                }
            } catch (err) { console.error("Error fetching", err); }
        };
        fetchResume();
    }, [id, location.state]);

    useEffect(() => {
        if (shouldImprove === 'true' && resume && !isImproving && currentContent === lastSavedContent) {
            handleMagicImprove();
            navigate(`/editor/${id}`, { replace: true });
        }
    }, [resume, shouldImprove, isImproving, currentContent, lastSavedContent, id, navigate]);

    useEffect(() => {
        if (currentContent && currentContent !== lastSavedContent) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => { autoSave(); }, 3000);
        }
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [currentContent, lastSavedContent]);

    const autoSave = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/resumes/version', {
                resumeId: id,
                content: currentContent,
                feedback: "Auto-saved"
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                setLastSavedContent(currentContent);
                setResume(res.data.data);
            }
        } catch (err) { console.error("Auto-save error", err); }
    };

    const handleRewrite = async () => {
        if (!selectedText || !rewriteInstructions || isRewriting) return;
        setIsRewriting(true);
        const originalContent = currentContent;

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
            let fullContent = '';
            let buffer = '';

            const placeholder = ` [Optimization in progress...] `;
            const tempContent = originalContent.replace(selectedText, placeholder);
            setCurrentContent(tempContent);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(line.indexOf('{')));
                            if (data.response) {
                                fullContent += data.response;
                                setCurrentContent(tempContent.replace(placeholder, fullContent));
                            }
                        } catch (e) { }
                    }
                }
            }
            setSelectedText('');
            setRewriteInstructions('');
        } catch (err) {
            console.error("Rewrite error", err);
            setCurrentContent(originalContent);
        } finally {
            setIsRewriting(false);
        }
    };

    const handleMagicImprove = async () => {
        if (isImproving) return;
        setIsImproving(true);

        try {
            const response = await fetch('http://localhost:5000/api/resumes/improve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ resumeId: id, content: currentContent })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(line.indexOf('{')));
                            if (data.response) {
                                fullContent += data.response;
                                setCurrentContent(fullContent);
                            }
                        } catch (e) { }
                    }
                }
            }
        } catch (err) {
            console.error("Improvement error", err);
        } finally {
            setIsImproving(false);
        }
    };

    if (!resume) return <div style={{ minHeight: '100vh', backgroundColor: '#030014', color: '#fff', display: 'grid', placeItems: 'center' }}>Loading Premium Editor...</div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#030014', color: '#f8fafc' }}>
            <Navbar />

            <div style={{ display: 'flex', height: '100vh', paddingTop: '6rem' }}>
                <main style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
                    <header style={{ margin: '0 auto 3rem auto', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.4rem' }}>{resume.title}</h1>
                            <p style={{ color: theme.textMuted, fontSize: '1rem', fontWeight: '500' }}>
                                Version {activeVersion + 1} of {resume.versions.length} • {currentContent === lastSavedContent ? 'Saved' : 'Editing...'}
                            </p>
                        </div>
                        <div className="no-print" style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={handleMagicImprove}
                                disabled={isImproving}
                                style={{
                                    padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white',
                                    borderRadius: '999px', border: 'none', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s'
                                }}
                            >
                                {isImproving ? 'Improving...' : '✨ Magic Improve'}
                            </button>
                            <button
                                onClick={() => window.print()}
                                style={{
                                    padding: '0.75rem 1.5rem', background: theme.primary, color: 'white',
                                    borderRadius: '999px', border: 'none', fontWeight: '700', cursor: 'pointer'
                                }}
                            >
                                Download PDF
                            </button>
                        </div>
                    </header>

                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{
                        background: '#fff', color: '#1e293b', borderRadius: '0.5rem', padding: '4rem 5rem',
                        minHeight: '1000px', margin: '0 auto', maxWidth: '800px', boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6)'
                    }}>
                        <div
                            style={{ fontSize: '1.1rem', lineHeight: '1.7', outline: 'none', whiteSpace: 'pre-wrap' }}
                            onMouseUp={() => setSelectedText(window.getSelection().toString())}
                            contentEditable
                            onInput={(e) => setCurrentContent(e.currentTarget.textContent)}
                            suppressContentEditableWarning={true}
                        >
                            {currentContent}
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {selectedText && (
                            <motion.div initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 50, x: '-50%' }}
                                style={{
                                    ...glassCardStyle, position: 'fixed', bottom: '4rem', left: '50%', padding: '2rem', width: '90%', maxWidth: '600px',
                                    zIndex: 100, border: `1px solid ${theme.primaryLight}`
                                }}
                            >
                                <h4 style={{ fontWeight: '800', marginBottom: '1.25rem', fontSize: '1.1rem' }}>Optimize Selection</h4>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <input
                                        type="text"
                                        value={rewriteInstructions}
                                        onChange={(e) => setRewriteInstructions(e.target.value)}
                                        placeholder="E.g. Make it more professional..."
                                        style={{
                                            flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.glassBorder}`,
                                            borderRadius: '0.75rem', padding: '0.75rem 1.25rem', color: 'white', outline: 'none'
                                        }}
                                    />
                                    <button onClick={handleRewrite} disabled={isRewriting} style={{
                                        padding: '0.75rem 1.75rem', background: theme.primary, color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: '700', cursor: 'pointer'
                                    }}>
                                        {isRewriting ? '...' : 'Rewrite'}
                                    </button>
                                    <button onClick={() => setSelectedText('')} style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                <aside className="no-print" style={{ width: '450px', padding: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
                    <div style={{ ...glassCardStyle, padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem' }}>AI Career Guide</h3>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <AIAssistant context={{ resumeText: currentContent }} hideHeader={true} />
                        </div>
                    </div>

                    <div style={{ padding: '2rem', background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`, borderRadius: theme.radius, color: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>Interview Prep</h3>
                        <p style={{ fontSize: '0.9rem', opacity: 0.85, marginBottom: '1.5rem' }}>Generate custom questions for a specific role.</p>
                        <input
                            type="text"
                            id="companyNameInput"
                            placeholder="Target Company Name..."
                            style={{
                                width: '100%', background: 'rgba(255, 255, 255, 0.12)', border: 'none', color: 'white',
                                borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem', outline: 'none'
                            }}
                        />
                        <button
                            onClick={async () => {
                                const company = document.getElementById('companyNameInput').value;
                                if (!company) return alert("Please enter a company name.");
                                const token = localStorage.getItem('token');
                                const res = await axios.post('http://localhost:5000/api/resumes/interview-prep',
                                    { resumeText: currentContent, companyName: company },
                                    { headers: { Authorization: `Bearer ${token}` } }
                                );
                                alert(res.data.data);
                            }}
                            style={{
                                width: '100%', padding: '1rem', background: 'white', color: theme.primary, border: 'none',
                                borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            Generate Prep
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default ResumeEditor;
