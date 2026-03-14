import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, FileUp, AlertCircle, Loader2 } from 'lucide-react';
import { analyzeResume } from '../../services/api';

const Step2JD = ({ data, updateData, setNextDisabled, onAnalyze, triggerAction }) => {
    const [error, setError] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        // Only disable if we haven't analyzed yet
        setNextDisabled(isAnalyzing || (!data.jdText?.trim() && !data.jdFile));
    }, [isAnalyzing, data.jdText, data.jdFile, setNextDisabled]);

    useEffect(() => {
        if (triggerAction > 0) {
            handleRunAnalysis();
        }
    }, [triggerAction]);

    const handleJdFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            updateData({ jdFile: file, jdText: '' });
            setError('');
        }
    };

    const handleTextChange = (e) => {
        updateData({ jdText: e.target.value, jdFile: null });
        setError('');
    };

    const handleRunAnalysis = async () => {
        if (!data.jdText?.trim() && !data.jdFile) {
            setError("Please provide a Job Description (paste text or upload file).");
            return;
        }

        setIsAnalyzing(true);
        setError('');

        try {
            const formData = new FormData();

            // Priority: Send only the resumeId if we already uploaded it in Step 1
            if (data._id) {
                formData.append("resumeId", data._id);
            } else if (data.file) {
                formData.append("resume", data.file);
            } else {
                setError("Resume file is missing. Please go back to step 1.");
                setIsAnalyzing(false);
                return;
            }

            if (data.jdFile) formData.append("jd", data.jdFile);
            if (data.jdText) formData.append("jdText", data.jdText);

            const res = await analyzeResume(formData);

            // Save ID to state if we just created it
            const newId = res.data.data?._id || data._id;

            updateData({
                atsResult: res.data.data,
                _id: newId,
                content: res.data.data?.originalContent || ''
            });

            // If we want auto-advance after internal button click:
            onAnalyze();
        } catch (err) {
            console.error("Analysis Error:", err);
            setError(err.response?.data?.message || err.response?.data?.error || "Analysis failed. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const zoneHover = (e, on) => {
        e.currentTarget.style.borderColor = on ? 'var(--secondary)' : 'var(--border)';
        e.currentTarget.style.background = on ? 'rgba(79,70,229,0.05)' : 'var(--bg-card)';
        e.currentTarget.style.boxShadow = on ? '0 0 20px rgba(79,70,229,0.15)' : 'none';
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', fontFamily: "'Outfit', sans-serif" }}>
                Target Job Description
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem' }}>
                Paste the job description or upload a file to analyze your match rate.
            </p>

            <div
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2.5rem',
                    position: 'relative',
                    maxWidth: '500px',
                    margin: '0 auto',
                    textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '42px', height: '42px', background: 'rgba(79,70,229,0.12)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
                        <Briefcase size={20} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>Job Description</h3>
                </div>

                <div
                    className="upload-zone"
                    style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'center' }}
                    onMouseOver={(e) => zoneHover(e, true)}
                    onMouseOut={(e) => zoneHover(e, false)}
                    onClick={(e) => { e.stopPropagation(); document.getElementById('jd-wizard-upload').click(); }}
                >
                    <input type="file" id="jd-wizard-upload" hidden onChange={handleJdFileChange} accept=".pdf,.doc,.docx" />
                    <FileUp size={28} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 0.75rem' }} />
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {data.jdFile ? (
                            <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{data.jdFile.name}</span>
                        ) : (
                            "Upload Target JD File"
                        )}
                    </p>
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontWeight: '700', letterSpacing: '0.08em' }}>OR PASTE TEXT</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                <textarea
                    placeholder="Paste job description here..."
                    value={data.jdText}
                    onChange={handleTextChange}
                    className="premium-textarea"
                    style={{ height: '160px' }}
                />

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                        style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', color: 'var(--error-light)', marginTop: '1.5rem', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                    >
                        <AlertCircle size={18} /><span>{error}</span>
                    </motion.div>
                )}

            </div>
        </div>
    );
};

export default Step2JD;
