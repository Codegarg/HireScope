import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, BarChart3, Loader2, Upload, RefreshCw, Target, X } from 'lucide-react';
import API from '../services/api';

/* ─────────────────────────────────────────────
   Animated Circular SVG Score Ring
   ───────────────────────────────────────────── */
const ScoreRing = ({ score }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference - (score / 100) * circumference;

  const scoreColor = score >= 70 ? 'var(--success)'
    : score >= 50 ? 'var(--warning)'
      : 'var(--error)';

  const glowColor = score >= 70 ? 'rgba(52,211,153,0.4)'
    : score >= 50 ? 'rgba(245,158,11,0.4)'
      : 'rgba(248,113,113,0.4)';

  return (
    <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto' }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
        {/* Filled arc */}
        <motion.circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: filled }}
          transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        />
      </svg>
      {/* Center label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{
            fontSize: '1.75rem', fontWeight: '800',
            color: scoreColor, lineHeight: 1,
            fontFamily: "'Outfit', sans-serif",
          }}
        >{score}%</motion.span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>MATCH</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Animated Progress Bar
   ───────────────────────────────────────────── */
const ProgressBar = ({ label, value, delay = 0 }) => {
  const color = value >= 80 ? 'var(--success)'
    : value >= 50 ? 'var(--warning)'
      : 'var(--error)';

  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>{label}</span>
        <span style={{ fontSize: '0.8rem', color, fontWeight: '700' }}>{value}%</span>
      </div>
      <div className="progress-bar-track">
        <motion.div
          className="progress-bar-fill"
          initial={{ width: '0%' }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay }}
          style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main ATSAnalysis Component
   ───────────────────────────────────────────── */
const ATSAnalysis = ({ resumeId, onJobDescriptionChange, value, initialData, resumeContent, onAnalysisComplete, onClose }) => {
  const [jobDescription, setJobDescription] = useState(value || "");

  // Helper to normalize data structure between "Simple" (Home) and "Advanced" (Editor) engines
  const normalizeData = (data) => {
    if (!data) return null;
    // If it has 'analysis' object (Advanced engine), return as is
    if (data.analysis && data.score !== undefined) return data;

    // Otherwise map Simple engine (Home page) to expected structure
    return {
      score: data.atsScore || 0,
      analysis: {
        formattingIssues: [],
        strengths: data.matchedSkills ? [`Matches ${data.matchedSkills.length} key skills`] : [],
        missingKeywords: data.missingSkills || []
      },
      matchRate: 0
    };
  };

  const [analysis, setAnalysis] = useState(normalizeData(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [jdFile, setJdFile] = useState(null);

  // Sync state with prop if initialData changes (e.g. late arrival)
  React.useEffect(() => {
    if (initialData) {
      setAnalysis(normalizeData(initialData));
      setLoading(false);
      setError(null);
    }
  }, [initialData]);

  // Auto-analyze when JD is provided (on mount or update)
  React.useEffect(() => {
    if (value && value !== jobDescription) {
      setJobDescription(value);
    }

    // Trigger analysis if we have a valid JD AND resume content, and no analysis yet
    if (value && value.trim().length > 20 && resumeContent && !analysis && !error && !initialData && !loading) {
      handleAnalyze(value);
    } else if (!value && !loading) {
      setLoading(false);
    }
  }, [value, resumeContent]);

  const handleJdChange = (e) => {
    const newVal = e.target.value;
    setJobDescription(newVal);
    setValidationError("");
    if (onJobDescriptionChange) onJobDescriptionChange(newVal);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setJdFile(file);
      setValidationError("");
    }
  };

  const handleRunAnalysis = async () => {
    setValidationError("");
    setError(null);

    if (!resumeContent) {
      setLoading(false);
      setValidationError("Resume content is missing. Please ensure your resume is loaded.");
      return;
    }

    if (!jobDescription.trim() && !jdFile) {
      setLoading(false);
      setValidationError("Please paste a Job Description or upload a JD file to proceed.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("jobDescription", jobDescription);
      formData.append("resumeContent", resumeContent);
      if (jdFile) formData.append("jdFile", jdFile);

      const res = await API.post(`/resumes/${resumeId}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data.data;
      setAnalysis(data);
      if (onAnalysisComplete) onAnalysisComplete(data);
    } catch (err) {
      console.error("Analysis failed:", err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || "Analysis failed. Please try again.";
      setValidationError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (jdText = jobDescription) => {
    if (jdText.trim()) handleRunAnalysis();
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setError(null);
    setValidationError("");
  };

  // Compute score breakdown for progress bars
  const getBreakdown = (score) => {
    const base = Math.max(0, score - 10);
    return [
      { label: 'Keyword Match', value: Math.min(100, base + 15), delay: 0.3 },
      { label: 'Skills Alignment', value: Math.min(100, base + 8), delay: 0.45 },
      { label: 'Format Score', value: Math.min(100, base + 12), delay: 0.6 },
    ];
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      backdropFilter: 'var(--blur)',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(124,58,237,0.15)' }}>
            <BarChart3 size={18} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>ATS Optimizer</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {analysis && (
            <button
              onClick={resetAnalysis}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600',
                padding: '0.3rem 0.7rem', borderRadius: '0.5rem', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-sub)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <RefreshCw size={12} /> New Analysis
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', padding: '0.4rem', borderRadius: '0.5rem',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '1.5rem' }}>
        {/* Error state */}
        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--error-light)', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />{error}
          </div>
        )}

        {/* Input Form */}
        {!analysis && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <textarea
              placeholder="Paste the job description here to analyze your match rate..."
              value={jobDescription}
              onChange={handleJdChange}
              className="premium-textarea"
              style={{ height: '150px', marginBottom: '0.875rem' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem' }}>
              <input type="file" id="jd-file-upload" hidden onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
              <button
                onClick={() => document.getElementById('jd-file-upload').click()}
                style={{
                  flex: 1, padding: '0.6rem', background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary-light)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Upload size={14} />
                {jdFile ? jdFile.name.slice(0, 20) + '…' : "Upload JD File"}
              </button>
            </div>

            {/* Validation error */}
            {validationError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '0.75rem 1rem', marginBottom: '0.875rem',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--error-light)',
                  fontSize: '0.85rem', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
              >
                <AlertTriangle size={15} /><span>{validationError}</span>
              </motion.div>
            )}

            <button
              onClick={() => handleRunAnalysis()}
              disabled={loading}
              className="glow-btn"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Target size={16} />
              Run ATS Analysis
            </button>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 0', color: 'var(--text-muted)', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: '600', color: 'var(--text-sub)' }}>Analyzing your fit...</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Comparing skills, keywords & structure</p>
            </div>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Circular Score */}
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <ScoreRing score={analysis.score} />
                <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {analysis.score >= 70 ? '🟢 Strong match!' : analysis.score >= 50 ? '🟡 Good potential' : '🔴 Needs improvement'}
                </p>
              </div>

              {/* Score Breakdown Progress Bars */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Score Breakdown</p>
                {getBreakdown(analysis.score).map(bar => (
                  <ProgressBar key={bar.label} {...bar} />
                ))}
              </div>

              {/* Formatting Issues */}
              {analysis.analysis.formattingIssues.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={14} /> Formatting Alerts
                  </h4>
                  {analysis.analysis.formattingIssues.map((issue, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.25rem', paddingLeft: '1.4rem' }}>• {issue}</div>
                  ))}
                </div>
              )}

              {/* Strengths */}
              {analysis.analysis.strengths.length > 0 && (
                <div style={{ padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <CheckCircle size={14} /> Profile Strengths
                  </h4>
                  {analysis.analysis.strengths.map((strength, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.25rem', paddingLeft: '1.4rem' }}>• {strength}</div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ATSAnalysis;