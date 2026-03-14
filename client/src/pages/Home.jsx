import { useState, useContext, useEffect } from "react";
import { Lock, FileText, Upload, Briefcase, FileUp, Sparkles, ArrowRight, MessageSquare, X, CheckCircle, AlertCircle, Lightbulb, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeResume } from "../services/api";
import { AuthContext } from "../context/AuthContext";

import Navbar from "../components/Navbar";

/* ─────────────────────────────────────────────
   Helper: parse AI suggestion text
   ───────────────────────────────────────────── */
const parseAnalysis = (text) => {
  if (!text) return { strengths: [], weaknesses: [], tips: [] };
  const sections = { strengths: [], weaknesses: [], tips: [] };
  let currentSection = null;
  text.split('\n').forEach(line => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    if (lower.includes('strengths') || lower.includes('strength:')) currentSection = 'strengths';
    else if (lower.includes('weaknesses') || lower.includes('weakness:')) currentSection = 'weaknesses';
    else if (lower.includes('tips') || lower.includes('actionable')) currentSection = 'tips';
    else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.match(/^\d+\./)) {
      const content = trimmed.replace(/^[-•\d\.]\s*/, '').trim();
      if (content && currentSection) sections[currentSection].push(content);
    }
  });
  return sections;
};

/* ─────────────────────────────────────────────
   Animated Score Ring (for results panel)
   ───────────────────────────────────────────── */
const ScoreRing = ({ score }) => {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference - (score / 100) * circumference;
  const scoreColor = score >= 70 ? 'var(--success-light)' : score >= 50 ? 'var(--warning)' : 'var(--error-light)';

  return (
    <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth="9" />
        <motion.circle
          cx="60" cy="60" r={radius}
          fill="none" stroke={scoreColor} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: filled }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${scoreColor}66)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: '800', color: scoreColor, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{score}%</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600' }}>MATCH</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Home Page
   ───────────────────────────────────────────── */
const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [resume, setResume] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState(null);
  const [storedNames, setStoredNames] = useState({ resumeName: "", jdName: "" });
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [loading, setLoading] = useState(false);


  // Save analysis results to sessionStorage whenever they change
  useEffect(() => {
    if (result) {
      const dataToSave = {
        result,
        resumeName: resume?.name || storedNames.resumeName,
        jdName: jdFile?.name || storedNames.jdName,
        jdText: jdText
      };
      sessionStorage.setItem('hireScope_analysisResults', JSON.stringify(dataToSave));
    }
  }, [result, resume, jdFile, jdText, storedNames]);

  // Restore analysis results from sessionStorage on mount
  useEffect(() => {
    const savedData = sessionStorage.getItem('hireScope_analysisResults');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.result) {
          setResult(parsed.result);
          setStoredNames({ resumeName: parsed.resumeName || "", jdName: parsed.jdName || "" });
          if (parsed.jdText) setJdText(parsed.jdText);
        } else if (parsed.atsScore !== undefined) {
          // Fallback for older session structure
          setResult(parsed);
        }
      }
      catch { sessionStorage.removeItem('hireScope_analysisResults'); }
    }
  }, []);

  const handleAnalyze = async () => {
    setValidationError(""); setError(""); setResult(null);
    if (!resume) { setValidationError("Please re-upload your Resume file to run a new analysis."); return; }
    if (!jdText.trim() && !jdFile) { setValidationError("Please provide a Job Description (paste text or upload file)."); return; }
    const formData = new FormData();
    formData.append("resume", resume);
    if (jdFile) formData.append("jd", jdFile);
    if (jdText) formData.append("jdText", jdText);
    try {
      setLoading(true);
      const res = await analyzeResume(formData);
      setResult(res.data.data);
    } catch (err) {
      console.error("Home Analysis Error:", err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || "Analysis failed. Please try again.";
      setValidationError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const analysisSections = result ? parseAnalysis(result.aiSuggestions) : null;

  /* upload zone hover handler */
  const zoneHover = (el, on) => {
    el.currentTarget.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
    el.currentTarget.style.background = on ? 'rgba(124,58,237,0.05)' : 'var(--bg-card)';
    el.currentTarget.style.boxShadow = on ? '0 0 20px var(--primary-glow)' : 'none';
  };

  return (
    <div className="page-wrapper">
      {/* Ambient glow */}
      <div className="ambient-bg" />

      <Navbar />

      <main style={{ padding: '8.5rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        {/* ── Hero ── */}
        {!result && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            style={{ textAlign: 'center', maxWidth: '860px', margin: '2rem auto 5rem' }}
          >

            <h1 style={{ fontSize: 'clamp(2.75rem, 7vw, 4.75rem)', fontWeight: '800', lineHeight: '1.08', marginBottom: '1.5rem', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.04em' }}>
              Elevate Your{' '}
              <span style={{ background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Career</span>
              <br />with HireScope
            </h1>

            <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: '1.7', maxWidth: '640px', margin: '0 auto 2.5rem' }}>
              Instantly analyze your resume against any job description. Get AI-powered ATS scores, keyword insights, and targeted improvements.
            </p>

            <a href="#analyze" className="glow-btn" style={{ fontSize: '1rem', padding: '1rem 2.5rem', borderRadius: '9999px', textDecoration: 'none' }}>
              Analyze My Resume <ArrowRight size={18} />
            </a>
          </motion.section>
        )}

        {/* ── Back Button ── */}
        {result && (
          <div style={{ maxWidth: '1200px', margin: '0 auto 1.5rem' }}>
            <button
              onClick={() => { setResult(null); setShowChat(false); sessionStorage.removeItem('hireScope_analysisResults'); setStoredNames({ resumeName: "", jdName: "" }); setJdText(""); setResume(null); setJdFile(null); }}
              className="ghost-btn"
              style={{ marginBottom: '0.5rem' }}
            >
              ← New Analysis
            </button>
          </div>
        )}

        {/* ── Analysis Section ── */}
        <section id="analyze" style={{ maxWidth: '1200px', margin: '0 auto', scrollMarginTop: '7rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: result ? '1fr 1fr' : '1fr',
            gap: '2rem',
            alignItems: 'start',
          }}>

            {/* Input Form Card */}
            <motion.div layout className="glass-card" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '2rem', fontFamily: "'Outfit', sans-serif", color: 'var(--text-main)' }}>
                Analyze Your Fit
              </h2>

              {/* Upload Grid */}
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem', cursor: user ? 'default' : 'pointer' }}
                onClick={() => !user && navigate('/login')}
              >
                {/* Resume Upload */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', position: 'relative' }}>
                  {!user && (
                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }} className="badge badge-primary">
                      <Lock size={10} /> LOCKED
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: '42px', height: '42px', background: 'rgba(124,58,237,0.12)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <FileText size={20} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>Your Resume</h3>
                  </div>
                  <div
                    className="upload-zone"
                    onMouseOver={(e) => user && zoneHover(e, true)}
                    onMouseOut={(e) => zoneHover(e, false)}
                    onClick={(e) => { if (!user) return; e.stopPropagation(); document.getElementById('resume-upload').click(); }}
                  >
                    <input type="file" id="resume-upload" hidden disabled={!user} onClick={(e) => { e.target.value = null; }} onChange={(e) => setResume(e.target.files[0])} accept=".pdf,.doc,.docx" />
                    <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem', opacity: user ? 1 : 0.4 }} />
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {resume ? <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{resume.name}</span>
                        : storedNames.resumeName ? <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{storedNames.resumeName}</span>
                          : "Drop your PDF / Word here"}
                    </p>
                  </div>
                </div>

                {/* JD Upload */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', position: 'relative' }}>
                  {!user && (
                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }} className="badge badge-primary">
                      <Lock size={10} /> LOCKED
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: '42px', height: '42px', background: 'rgba(79,70,229,0.12)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
                      <Briefcase size={20} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>Job Description</h3>
                  </div>

                  <div
                    className="upload-zone"
                    style={{ marginBottom: '1rem' }}
                    onMouseOver={(e) => user && zoneHover(e, true)}
                    onMouseOut={(e) => zoneHover(e, false)}
                    onClick={(e) => { if (!user) return; e.stopPropagation(); document.getElementById('jd-upload').click(); }}
                  >
                    <input type="file" id="jd-upload" hidden disabled={!user} onClick={(e) => { e.target.value = null; }} onChange={(e) => setJdFile(e.target.files[0])} accept=".pdf,.doc,.docx" />
                    <FileUp size={24} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 0.5rem', opacity: user ? 1 : 0.4 }} />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {jdFile ? <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{jdFile.name}</span>
                        : storedNames.jdName ? <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{storedNames.jdName}</span>
                          : "Upload Target JD"}
                    </p>
                  </div>

                  {/* Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: '700', letterSpacing: '0.08em' }}>OR PASTE TEXT</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  </div>

                  <textarea
                    placeholder="Paste job description here..."
                    disabled={!user}
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="premium-textarea"
                    style={{ height: '100px', cursor: user ? 'text' : 'pointer' }}
                    onFocus={e => user && (e.target.style.borderColor = 'var(--secondary)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    onClick={() => !user && navigate('/login')}
                  />
                </div>
              </div>

              {/* Validation Error */}
              {validationError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', color: 'var(--error-light)', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                  <AlertCircle size={18} /><span>{validationError}</span>
                </motion.div>
              )}

              {/* CTA */}
              <div style={{ textAlign: 'center' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); if (!user) { navigate('/login'); } else { handleAnalyze(); } }}
                  disabled={user && loading}
                  className="glow-btn"
                  style={{
                    fontSize: '1.05rem', padding: '1rem 2.75rem',
                    background: user ? 'var(--gradient-primary)' : 'var(--bg-elevated)',
                    border: !user ? '1px solid var(--border)' : 'none',
                    boxShadow: user ? '0 10px 30px -8px var(--primary-glow)' : 'none',
                    opacity: user && loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Analyzing..." : (
                    <>{user ? "Run ATS Analysis" : "Login to Unlock"}{user ? <Sparkles size={18} /> : <ArrowRight size={18} />}</>
                  )}
                </motion.button>
                {!user && (
                  <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', marginTop: '1rem' }}>
                    Create a free account to unlock full analysis.
                  </p>
                )}
              </div>
            </motion.div>

            {/* Results Panel */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                  className="glass-card"
                  style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', position: 'sticky', top: '7rem' }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <ScoreRing score={result.atsScore} />
                    <div>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: "'Outfit', sans-serif", marginBottom: '0.25rem' }}>ATS Analysis</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Match score · skills · structure</p>
                      <div style={{ marginTop: '0.5rem' }}>
                        <span className={`badge ${result.atsScore >= 70 ? 'badge-success' : result.atsScore >= 50 ? 'badge-warning' : 'badge-error'}`}>
                          {result.atsScore >= 70 ? '🟢 Strong Match' : result.atsScore >= 50 ? '🟡 Good Potential' : '🔴 Needs Work'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Matched Skills */}
                    <div>
                      <h3 style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Matched Skills</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                        {result.matchedSkills.map(skill => (
                          <span key={skill} className="skill-chip">{skill}</span>
                        ))}
                      </div>
                    </div>

                    {/* Analysis sections */}
                    {analysisSections && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                        {analysisSections.strengths.length > 0 && (
                          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.875rem', color: 'var(--success)' }}>
                              <TrendingUp size={16} /><h3 style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Strengths</h3>
                            </div>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                              {analysisSections.strengths.map((item, i) => (
                                <li key={i} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-sub)', lineHeight: '1.5' }}>
                                  <CheckCircle size={14} style={{ marginTop: '0.15rem', flexShrink: 0, color: 'var(--success)' }} /><span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {analysisSections.weaknesses.length > 0 && (
                          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.875rem', color: 'var(--error)' }}>
                              <TrendingDown size={16} /><h3 style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Improvements</h3>
                            </div>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                              {analysisSections.weaknesses.map((item, i) => (
                                <li key={i} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-sub)', lineHeight: '1.5' }}>
                                  <AlertCircle size={14} style={{ marginTop: '0.15rem', flexShrink: 0, color: 'var(--error)' }} /><span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tips */}
                    {analysisSections && analysisSections.tips.length > 0 && (
                      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.875rem', color: 'var(--primary-light)' }}>
                          <Lightbulb size={16} /><h3 style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actionable Tips</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {analysisSections.tips.map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.6rem', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.6rem', fontSize: '0.875rem', color: 'var(--text-sub)', lineHeight: '1.5' }}>
                              <span style={{ fontWeight: '700', color: 'var(--primary-light)', flexShrink: 0 }}>{i + 1}.</span><span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <button
                        onClick={() => navigate(`/editor/${result.resumeId}?improve=true`, { state: { initialResume: { ...result, _id: result.resumeId, content: result.resumeText }, analysisResults: result } })}
                        className="glow-btn"
                        style={{ justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent), #d97706)' }}
                      >
                        ✨ Magic AI Improve
                      </button>
                      <button
                        onClick={() => navigate(`/editor/${result.resumeId}`, { state: { initialResume: { ...result, _id: result.resumeId, content: result.resumeText }, analysisResults: result } })}
                        className="glow-btn"
                        style={{ justifyContent: 'center' }}
                      >
                        🚀 Open Editor
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Responsive styles for Home */}
      <style>{`
        @media (max-width: 768px) {
          #analyze > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default Home;
