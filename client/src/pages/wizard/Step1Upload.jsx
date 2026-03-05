import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Lock, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import API from '../../services/api';

const Step1Upload = ({ data, updateData, setNextDisabled, onNext, onBack }) => {
    const [uploading, setUploading] = React.useState(false);
    const [error, setError] = React.useState('');

    useEffect(() => {
        // Disable Next if no resume is selected or if uploading
        setNextDisabled(!data._id || uploading);
    }, [data._id, uploading, setNextDisabled]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append("resume", file);

            // Trigger the new standalone upload pipeline
            const res = await API.post('/resumes/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const uploadedResume = res.data.data;
            updateData({
                file,
                fileName: file.name,
                _id: uploadedResume._id,
                content: uploadedResume.parsedText || ''
            });
        } catch (err) {
            console.error("Upload failed:", err);
            setError(err.response?.data?.message || err.response?.data?.error || "Failed to upload resume. Please ensure it is a valid PDF.");
        } finally {
            setUploading(false);
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
                    onMouseOver={(e) => !uploading && zoneHover(e, true)}
                    onMouseOut={(e) => !uploading && zoneHover(e, false)}
                    onClick={(e) => {
                        if (uploading) return;
                        e.stopPropagation();
                        document.getElementById('resume-wizard-upload').click();
                    }}
                    style={{
                        padding: '3rem 2rem',
                        border: '2px dashed var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: uploading ? 0.7 : 1,
                        background: uploading ? 'rgba(124,58,237,0.02)' : 'var(--bg-card)'
                    }}
                >
                    <input type="file" id="resume-wizard-upload" hidden onChange={handleFileChange} accept=".pdf" />

                    {uploading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary)' }} />
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600' }}>Processing & Extracting Text...</p>
                        </div>
                    ) : (
                        <>
                            <Upload size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                            <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                                {data._id ? (
                                    <span style={{ color: 'var(--success-light)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <FileText size={18} /> {data.fileName} (Uploaded)
                                    </span>
                                ) : (
                                    "Click to upload your Resume (PDF only)"
                                )}
                            </p>
                        </>
                    )}
                </div>

                {error && (
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '0.75rem',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--error-light)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        textAlign: 'left'
                    }}>
                        <Lock size={14} /> {error}
                    </div>
                )}
            </div>

            {/* Inline Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', maxWidth: '500px', margin: '2rem auto 0' }}>
                <button onClick={onBack} disabled={uploading} className="ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: uploading ? 0.5 : 1 }}>
                    <ArrowLeft size={18} /> Cancel
                </button>
                <button
                    onClick={onNext}
                    disabled={!data._id || uploading}
                    className="glow-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', opacity: (!data._id || uploading) ? 0.5 : 1 }}
                >
                    {uploading ? 'Processing...' : <>Next Step <ArrowRight size={18} /></>}
                </button>
            </div>
        </div>
    );
};

export default Step1Upload;
