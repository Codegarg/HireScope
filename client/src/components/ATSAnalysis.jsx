import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, BarChart3, Loader2, Upload } from 'lucide-react';
import API from '../services/api';

const ATSAnalysis = ({ resumeId, onJobDescriptionChange, value, initialData, resumeContent, onAnalysisComplete }) => {
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
      matchRate: 0 // Optional
    };
  };

  const [analysis, setAnalysis] = useState(normalizeData(initialData));
  // Initialize loading to true only if we have a JD but NO analysis yet
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

    // Trigger analysis if we have a valid JD, no analysis yet
    // REMOVED: !loading check to prevent deadlock if we initialized loading=true
    // Trigger analysis if we have a valid JD AND resume content, and no analysis yet
    if (value && value.trim().length > 20 && resumeContent && !analysis && !error && !initialData && !loading) {
      handleAnalyze(value);
    } else if (!value && !loading) {
      setLoading(false);
    }
  }, [value, resumeContent]); // Wait for both JD and Resume content

  const handleJdChange = (e) => {
    const newVal = e.target.value;
    setJobDescription(newVal);
    setValidationError(""); // Clear error when typing
    if (onJobDescriptionChange) onJobDescriptionChange(newVal);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setJdFile(file);
      setValidationError(""); // Clear error when uploading
    }
  };

  const handleRunAnalysis = async () => {
    setValidationError("");
    setError(null);

    // Validation checks
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
      setValidationError(serverMsg); // Sync server errors with validation UI
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (jdText = jobDescription) => {
    // Keep for auto-trigger if needed, but primary logic is handleRunAnalysis
    if (jdText.trim()) handleRunAnalysis();
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setError(null);
    setValidationError("");
    // Optional: Clear JD? No, keep it.
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 color="#7c3aed" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>ATS Optimizer</h3>
        </div>
        {analysis && (
          <button
            onClick={resetAnalysis}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', fontSize: '0.75rem', padding: '0.3rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            New Analysis
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', color: '#fca5a5', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {!analysis && !loading && (
        <>
          <textarea
            placeholder="Paste the Job Description here to analyze your match rate..."
            value={jobDescription}
            onChange={handleJdChange}
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

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input
              type="file"
              id="jd-file-upload"
              hidden
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt"
            />
            <button
              onClick={() => document.getElementById('jd-file-upload').click()}
              style={{
                flex: 1,
                padding: '0.6rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.75rem',
                color: '#94a3b8',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Upload size={14} />
              {jdFile ? jdFile.name : "Upload JD File"}
            </button>
          </div>

          {validationError && (
            <div style={{
              padding: '0.75rem 1rem',
              background: '#fee2e2', // Light red background
              border: '1px solid #f87171',
              borderRadius: '0.75rem',
              color: '#991b1b', // Dark red text
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <AlertTriangle size={16} />
              <span>{validationError}</span>
            </div>
          )}

          <button
            onClick={() => handleRunAnalysis()}
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
              transition: 'opacity 0.2s',
              opacity: loading ? 0.7 : 1
            }}
          >
            Run Analysis
          </button>
        </>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', color: '#94a3b8' }}>
          <Loader2 className="animate-spin" size={32} style={{ marginBottom: '1rem', color: '#7c3aed' }} />
          <p>Analyzing relevance...</p>
        </div>
      )}

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: '0' }}
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