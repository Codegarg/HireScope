import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Loader2, CheckCircle, Flame, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Step4Optimize = ({ data, updateData, setNextDisabled, onNext, onBack }) => {
    const [isImproving, setIsImproving] = useState(false);
    const [improveMode, setImproveMode] = useState('optimize');
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        // They can skip optimization if they want, but let's encourage them to click next
        setNextDisabled(isImproving);
    }, [isImproving, setNextDisabled]);

    const handleMagicImprove = async () => {
        const contentToUse = data.content || data.atsResult?.originalContent;

        if (!contentToUse || contentToUse.trim().length < 50) {
            alert("We couldn't extract enough text from your resume to improve it. Please ensure step 1 was successful.");
            return;
        }

        if (isImproving) return;
        setIsImproving(true);
        setCompleted(false);

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

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to start AI optimization stream');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";
            let newAnalysis = null;

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
                            } else if (parsed.type === 'metadata') {
                                if (parsed.newAnalysis) {
                                    newAnalysis = parsed.newAnalysis;
                                }
                            }
                        } catch (e) {
                            // Ignore partial JSON chunks
                        }
                    }
                }
            }

            // Save the optimized result back to the wizard state
            updateData({
                optimizedContent: accumulatedText,
                atsResult: newAnalysis || data.atsResult // Update the ATS score if the API provided it
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
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '0.4rem 1rem', background: 'rgba(124,58,237,0.1)', color: 'var(--primary-light)', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} /> MAGIC IMPROVE
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', fontFamily: "'Outfit', sans-serif" }}>
                AI Optimization
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
                Let HireScope rewrite your resume to naturally inject missing keywords and boost your ATS score.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start', textAlign: 'left' }}>
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border)',
                    height: '650px',
                }}>
                    {data._id ? (
                        <iframe
                            src={`http://localhost:5000/api/resumes/${data._id}/file?token=${localStorage.getItem('token')}`}
                            width="100%"
                            height="100%"
                            style={{ border: 'none' }}
                            title="Original Resume PDF"
                        />
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            PDF Preview Not Available
                        </div>
                    )}
                </div>

                <div>
                    {/* Mode selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div
                            onClick={() => !isImproving && setImproveMode('optimize')}
                            style={{
                                background: 'var(--bg-card)',
                                border: `2px solid ${improveMode === 'optimize' ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-lg)',
                                padding: '1.5rem',
                                cursor: isImproving ? 'not-allowed' : 'pointer',
                                textAlign: 'left',
                                opacity: isImproving && improveMode !== 'optimize' ? 0.5 : 1
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Target size={20} style={{ color: 'var(--primary-light)' }} />
                                <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Optimize</span>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                Surgical wording tweaks. Preserves your exact section structure, roles, and dates. Safest option.
                            </p>
                        </div>

                        <div
                            onClick={() => !isImproving && setImproveMode('regenerate')}
                            style={{
                                background: 'var(--bg-card)',
                                border: `2px solid ${improveMode === 'regenerate' ? 'var(--secondary)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-lg)',
                                padding: '1.5rem',
                                cursor: isImproving ? 'not-allowed' : 'pointer',
                                textAlign: 'left',
                                opacity: isImproving && improveMode !== 'regenerate' ? 0.5 : 1
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Flame size={20} style={{ color: 'var(--secondary)' }} />
                                <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Regenerate</span>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                Full structural rewrite. Reorganizes points by impact and completely rewrites the summary.
                            </p>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {!completed ? (
                            <motion.div key="action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <button
                                    onClick={handleMagicImprove}
                                    disabled={isImproving}
                                    className="glow-btn"
                                    style={{ width: '100%', fontSize: '1.1rem', padding: '1rem', background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
                                >
                                    {isImproving ? (
                                        <><Loader2 className="animate-spin" size={20} /> Optimizing...</>
                                    ) : (
                                        <><Sparkles size={20} /> Run {improveMode === 'optimize' ? 'Optimization' : 'Regeneration'}</>
                                    )}
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', padding: '2rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                                <CheckCircle size={48} style={{ color: 'var(--success-light)', margin: '0 auto 1rem' }} />
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--success-light)', marginBottom: '0.5rem' }}>Success!</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Resume updated for ATS.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Inline Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', maxWidth: '800px', margin: '3rem auto 0' }}>
                <button onClick={onBack} disabled={isImproving} className="ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isImproving ? 0.5 : 1 }}>
                    <ArrowLeft size={18} /> Back
                </button>
                <button
                    onClick={onNext}
                    disabled={isImproving}
                    className="glow-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', opacity: isImproving ? 0.5 : 1 }}
                >
                    {completed ? "Review Changes" : "Skip Optimization"} <ArrowRight size={18} />
                </button>
            </div>

        </div>
    );
};

export default Step4Optimize;
