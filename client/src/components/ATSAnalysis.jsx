import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertTriangle, CheckCircle, BarChart3, Loader2 } from 'lucide-react';
import API from '../services/api';

const ATSAnalysis = ({ resumeId }) => {
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return;
    setLoading(true);
    try {
      const res = await API.post(`/resumes/${resumeId}/analyze`, { jobDescription });
      setAnalysis(res.data.data);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '1.25rem',
      padding: '1.5rem',
      color: '#f8fafc',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <BarChart3 color="#7c3aed" />
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>ATS Optimizer</h3>
      </div>

      <textarea
        placeholder="Paste the Job Description here to analyze your match rate..."
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        style={{
          width: '100%',
          height: '150px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '0.75rem',
          padding: '1rem',
          color: 'white',
          fontSize: '0.9rem',
          resize: 'none',
          marginBottom: '1rem',
          outline: 'none'
        }}
      />

      <button
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.8rem',
          background: '#7c3aed',
          border: 'none',
          borderRadius: '0.75rem',
          color: 'white',
          fontWeight: '700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'opacity 0.2s'
        }}
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : "Run Analysis"}
      </button>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: '2rem' }}
          >
            {/* Score Circle */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                position: 'relative',
                width: '100px',
                height: '100px',
                margin: '0 auto',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: '4px solid rgba(124, 58, 237, 0.2)',
                borderTopColor: '#7c3aed'
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>{analysis.score}%</span>
              </div>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Match Score</p>
            </div>

            {/* Formatting Issues */}
            {analysis.analysis.formattingIssues.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={16} /> Formatting Alerts
                </h4>
                {analysis.analysis.formattingIssues.map((issue, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.25rem', paddingLeft: '1.4rem' }}>• {issue}</div>
                ))}
              </div>
            )}

            {/* Strengths */}
            {analysis.analysis.strengths.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <CheckCircle size={16} /> Profile Strengths
                </h4>
                {analysis.analysis.strengths.map((strength, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.25rem', paddingLeft: '1.4rem' }}>• {strength}</div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ATSAnalysis;