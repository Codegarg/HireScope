import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Loader2, CheckCircle, Flame, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Step4Optimize = ({ data, updateData, setNextDisabled, onNext, triggerAction }) => {
    const [isImproving, setIsImproving] = useState(false);
    const [improveMode, setImproveMode] = useState('optimize');
    const [completed, setCompleted] = useState(false);
    const [displayedLines, setDisplayedLines] = useState([]);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);

    const [currentLineText, setCurrentLineText] = useState("");

    useEffect(() => {
        setNextDisabled(isImproving);
    }, [isImproving, setNextDisabled]);

    useEffect(() => {
        if (triggerAction > 0 && !isImproving && !completed) {
            handleMagicImprove();
        }
    }, [triggerAction]);

    const handleMagicImprove = async () => {
        const contentToUse = data.content || data.atsResult?.originalContent;

        if (!contentToUse || contentToUse.trim().length < 50) {
            alert("We couldn't extract enough text from your resume to improve it.");
            return;
        }

        if (isImproving) return;
        setIsImproving(true);
        setCompleted(false);
        setDisplayedLines([]);
        setCurrentLineText("");
        setCurrentLineIndex(0);

        try {
            const token = localStorage.getItem('token');
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            const response = await fetch(`${apiBase}/resumes/${data._id}/improve-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: contentToUse,
                    jobDescription: data.jdText || data.atsResult?.jdText || '',
                    mode: improveMode,
                    previousScore: data.atsResult?.atsScore || null
                })
            });

            if (!response.ok) throw new Error('Failed to start AI optimization stream');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";
            let newAnalysis = null;
            let lineBuffer = "";

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
                            const parsed = JSON.parse(dataStr);
                            if (parsed.response) {
                                accumulatedText += parsed.response;
                                lineBuffer += parsed.response;

                                if (lineBuffer.includes('\n')) {
                                    const parts = lineBuffer.split('\n');
                                    const completed = parts.slice(0, -1);
                                    setDisplayedLines(prev => [...prev, ...completed]);
                                    setCurrentLineIndex(prev => prev + completed.length);
                                    lineBuffer = parts[parts.length - 1];
                                }
                                setCurrentLineText(lineBuffer);
                            } else if (parsed.type === 'metadata') {
                                if (parsed.newAnalysis) newAnalysis = parsed.newAnalysis;
                            }
                        } catch (e) { }
                    }
                }
            }

            if (lineBuffer.trim()) {
                setDisplayedLines(prev => [...prev, lineBuffer]);
            }
            setCurrentLineText("");

            updateData({
                optimizedContent: accumulatedText,
                atsResult: newAnalysis || data.atsResult
            });
            setCompleted(true);
        } catch (err) {
            console.error('Improvement error:', err);
            alert(`Optimization failed: ${err.message}`);
        } finally {
            setIsImproving(false);
        }
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '0.4rem 1rem', background: 'rgba(124,58,237,0.1)', color: 'var(--primary-light)', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} /> MAGIC WEAVER
            </div>

            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', fontFamily: "'Outfit', sans-serif" }}>
                Surgical Optimization
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
                Watch in real-time as HireScope weaves missing skills into your resume bullets without changing your layout.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem', alignItems: 'start', textAlign: 'left' }}>
                {/* Control Panel */}
                <div style={{ position: 'sticky', top: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        <div
                            onClick={() => !isImproving && setImproveMode('optimize')}
                            style={{
                                background: 'var(--bg-card)',
                                border: `2px solid ${improveMode === 'optimize' ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-lg)',
                                padding: '1.5rem',
                                cursor: isImproving ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Target size={20} style={{ color: 'var(--primary-light)' }} />
                                <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Surgical Weave</span>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                Precise keyword injection. Preserves every header, date, and margin exactly.
                            </p>
                        </div>
                    </div>

                    {!completed ? (
                        <button
                            onClick={handleMagicImprove}
                            disabled={isImproving}
                            className="glow-btn"
                            style={{ width: '100%', fontSize: '1.1rem', padding: '1.2rem', background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
                        >
                            {isImproving ? (
                                <><Loader2 className="animate-spin" size={20} /> Weaving Magic...</>
                            ) : (
                                <><Sparkles size={20} /> Start Magic Writing</>
                            )}
                        </button>
                    ) : (
                        <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                            <CheckCircle size={32} style={{ color: 'var(--success-light)', margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--success-light)' }}>Optimization Complete</h3>
                        </div>
                    )}
                </div>

                {/* Magic Output Area */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                    padding: '3rem',
                    minHeight: '600px',
                    maxHeight: '800px',
                    overflowY: 'auto',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    color: '#334155',
                    position: 'relative'
                }}>
                    {!isImproving && displayedLines.length === 0 && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.5 }}>
                            <Sparkles size={48} style={{ marginBottom: '1rem' }} />
                            <p>Ready to weave your resume...</p>
                        </div>
                    )}

                    <AnimatePresence>
                        {displayedLines.map((line, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    whiteSpace: 'pre-wrap',
                                    minHeight: '1.6em',
                                    position: 'relative',
                                    padding: '2px 0'
                                }}
                            >
                                {line}

                                {isImproving && idx === currentLineIndex - 1 && (
                                    <motion.div
                                        layoutId="lineHighlight"
                                        style={{
                                            position: 'absolute',
                                            left: '-1rem',
                                            right: '-1rem',
                                            top: 0,
                                            bottom: 0,
                                            background: 'rgba(124, 58, 237, 0.08)',
                                            borderLeft: '3px solid var(--primary)',
                                            zIndex: -1,
                                            borderRadius: '4px'
                                        }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.1 }}
                                    />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Cursor/Next line being typed */}
                    {isImproving && currentLineText && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                whiteSpace: 'pre-wrap',
                                minHeight: '1.6em',
                                position: 'relative',
                                padding: '2px 0',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                            }}
                        >
                            {currentLineText}
                            <motion.span
                                animate={{ opacity: [1, 0] }}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                                style={{
                                    display: 'inline-block',
                                    width: '8px',
                                    height: '1.2em',
                                    background: 'var(--primary)',
                                    verticalAlign: 'middle'
                                }}
                            />
                        </motion.div>
                    )}

                    {isImproving && !currentLineText && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginTop: '0.5rem' }}>
                            <Loader2 size={16} className="animate-spin" />
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Thinking...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Step4Optimize;
