import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

const Step1Upload = ({ data, updateData, setNextDisabled, onNext, onBack }) => {
    useEffect(() => {
        // Disable Next if no resume is selected
        setNextDisabled(!data.file && !data.fileName);
    }, [data.file, data.fileName, setNextDisabled]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            updateData({ file, fileName: file.name });
        }
    };

    const zoneHover = (e, on) => {
        e.currentTarget.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
        e.currentTarget.style.background = on ? 'rgba(124,58,237,0.05)' : 'var(--bg-card)';
        e.currentTarget.style.boxShadow = on ? '0 0 20px var(--primary-glow)' : 'none';
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', fontFamily: "'Outfit', sans-serif" }}>
                Upload Your Resume
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem' }}>
                Start by uploading your current resume. We support PDF and Word documents.
            </p>

            <div
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2.5rem',
                    position: 'relative',
                    maxWidth: '500px',
                    margin: '0 auto'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(124,58,237,0.12)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <FileText size={24} />
                    </div>
                </div>

                <div
                    className="upload-zone"
                    onMouseOver={(e) => zoneHover(e, true)}
                    onMouseOut={(e) => zoneHover(e, false)}
                    onClick={(e) => { e.stopPropagation(); document.getElementById('resume-wizard-upload').click(); }}
                    style={{ padding: '3rem 2rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    <input type="file" id="resume-wizard-upload" hidden onChange={handleFileChange} accept=".pdf,.doc,.docx" />
                    <Upload size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                        {data.file ? (
                            <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{data.file.name}</span>
                        ) : data.fileName ? (
                            <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{data.fileName}</span>
                        ) : (
                            "Click or drag your PDF / Word here"
                        )}
                    </p>
                </div>
            </div>

            {/* Inline Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', maxWidth: '500px', margin: '2rem auto 0' }}>
                <button onClick={onBack} className="ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={18} /> Cancel
                </button>
                <button
                    onClick={onNext}
                    disabled={!data.file && !data.fileName}
                    className="glow-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', opacity: (!data.file && !data.fileName) ? 0.5 : 1 }}
                >
                    Next Step <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default Step1Upload;
