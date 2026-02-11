import { useState, useContext } from "react";
import { Lock, FileText, Upload, Briefcase, FileUp, Sparkles, ArrowRight, MessageSquare, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeResume } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import AIAssistant from "../components/AIAssistant";
import Navbar from "../components/Navbar";

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Inline Styles Theme
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

  const handleAnalyze = async () => {
    setError("");
    setResult(null);
    if (!resume) { setError("Please upload a resume file."); return; }
    if (!jdText && !jdFile) { setError("Please provide a Job Description."); return; }

    const formData = new FormData();
    formData.append("resume", resume);
    if (jdFile) formData.append("jd", jdFile);
    if (jdText) formData.append("jdText", jdText);

    try {
      setLoading(true);
      const res = await analyzeResume(formData);
      setResult(res.data.data);
      setShowChat(true);
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030014', color: '#f8fafc', overflowX: 'hidden' }}>
      {/* Aurora Background */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1,
        background: 'radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.15) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(79, 70, 229, 0.15) 0%, transparent 40%)'
      }}></div>

      <Navbar />

      <main style={{ padding: '8rem 2rem 10rem 2rem' }}>
        {/* Hero Section */}
        {!result && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', maxWidth: '900px', margin: '4rem auto 6rem auto' }}
          >
            <h1 style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: '800', lineHeight: '1.1', marginBottom: '1.5rem', fontFamily: "'Outfit', sans-serif" }}>
              Elevate Your <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: '700', color: theme.primaryLight }}>Career</span> <br />
              with <span className="gradient-text">HireScope</span>
            </h1>
            <p style={{ fontSize: '1.25rem', color: theme.textMuted, lineHeight: '1.6', maxWidth: '700px', margin: '0 auto 3.5rem auto' }}>
              Streamline, Optimize, and Scale your job applications with our powerful SaaS solution.
              Experience precision ATS analysis and AI-driven career guidance.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <a href="#analyze" style={{
                padding: '1.25rem 3rem', fontSize: '1.1rem', background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                color: 'white', borderRadius: '9999px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 10px 20px rgba(124, 58, 237, 0.3)', transition: 'all 0.3s'
              }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Get Started Now
              </a>
            </div>
          </motion.section>
        )}

        {/* Analysis Section */}
        <section id="analyze" style={{ maxWidth: '1200px', margin: '0 auto', scrollMarginTop: '120px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '3rem', alignItems: 'start' }}>

            {/* Input Form */}
            <motion.div layout style={{ ...glassCardStyle, padding: '3.5rem' }}>
              <h2 style={{ fontSize: '2.25rem', marginBottom: '2.5rem', fontWeight: '800' }}>Analyze Your Fit</h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem', cursor: user ? 'default' : 'pointer' }} onClick={() => !user && navigate('/login')}>
                {/* Resume Upload */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '2rem', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.02)', transition: 'all 0.3s',
                    position: 'relative', overflow: 'hidden'
                  }}
                >
                  {!user && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(124, 58, 237, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: '700', color: theme.primaryLight, border: '1px solid rgba(124, 58, 237, 0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Lock size={12} /> LOCKED
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.primary }}>
                      <FileText size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Your Resume</h3>
                  </div>
                  <div
                    style={{
                      border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', textAlign: 'center',
                      background: 'rgba(255,255,255,0.01)', transition: 'all 0.2s', cursor: user ? 'pointer' : 'pointer'
                    }}
                    onMouseOver={(e) => user && (e.currentTarget.style.borderColor = theme.primary)}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    onClick={(e) => {
                      if (!user) return;
                      e.stopPropagation();
                      document.getElementById('resume-upload').click();
                    }}
                  >
                    <input
                      type="file"
                      id="resume-upload"
                      hidden
                      disabled={!user}
                      onChange={(e) => setResume(e.target.files[0])}
                      accept=".pdf,.doc,.docx"
                    />
                    <Upload size={32} style={{ color: theme.textMuted, marginBottom: '1rem', opacity: user ? 1 : 0.5 }} />
                    <p style={{ fontSize: '0.9rem', color: theme.textMuted }}>
                      {resume ? <span style={{ color: '#fff' }}>{resume.name}</span> : "Drop your PDF/Word here"}
                    </p>
                  </div>
                </div>

                {/* JD Upload */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '2rem', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.02)', position: 'relative'
                  }}
                >
                  {!user && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(124, 58, 237, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: '700', color: theme.primaryLight, border: '1px solid rgba(124, 58, 237, 0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Lock size={12} /> LOCKED
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.secondary }}>
                      <Briefcase size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Job Description</h3>
                  </div>
                  <div
                    style={{
                      border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', textAlign: 'center',
                      background: 'rgba(255,255,255,0.01)', cursor: 'pointer', marginBottom: '1.5rem'
                    }}
                    onMouseOver={(e) => user && (e.currentTarget.style.borderColor = theme.secondary)}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    onClick={(e) => {
                      if (!user) return;
                      e.stopPropagation();
                      document.getElementById('jd-upload').click();
                    }}
                  >
                    <input
                      type="file"
                      id="jd-upload"
                      hidden
                      disabled={!user}
                      onChange={(e) => setJdFile(e.target.files[0])}
                      accept=".pdf,.doc,.docx"
                    />
                    <FileUp size={32} style={{ color: theme.textMuted, marginBottom: '1rem', opacity: user ? 1 : 0.5 }} />
                    <p style={{ fontSize: '0.9rem', color: theme.textMuted }}>
                      {jdFile ? <span style={{ color: '#fff' }}>{jdFile.name}</span> : "Upload Target JD"}
                    </p>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: theme.textMuted, fontWeight: '600' }}>
                      <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></span>
                      OR PASTE TEXT
                      <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></span>
                    </div>
                    <textarea
                      placeholder="Paste job description here..."
                      disabled={!user}
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      style={{
                        width: '100%',
                        height: '120px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${theme.glassBorder}`,
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        color: 'white',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'none',
                        transition: 'all 0.2s',
                        cursor: user ? 'text' : 'pointer'
                      }}
                      onFocus={(e) => user && (e.target.style.borderColor = theme.secondary)}
                      onBlur={(e) => (e.target.style.borderColor = theme.glassBorder)}
                      onClick={(e) => !user && navigate('/login')}
                    />
                  </div>
                </div>
              </div>

              {/* CTA Section */}
              <div style={{ textAlign: 'center' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!user) {
                      navigate('/login');
                    } else {
                      handleAnalyze();
                    }
                  }}
                  disabled={user && (loading || !resume || (!jdFile && !jdText))}
                  style={{
                    padding: '1.25rem 3.5rem',
                    borderRadius: '1rem',
                    background: user ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)` : 'rgba(255,255,255,0.05)',
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    margin: '0 auto',
                    boxShadow: user ? '0 10px 30px -10px rgba(124, 58, 237, 0.5)' : 'none',
                    border: !user ? '1px solid rgba(255,255,255,0.1)' : 'none'
                  }}
                >
                  {loading ? "Analyzing..." : (
                    <>
                      {user ? "Run ATS Analysis" : "Login to Unlock Analysis"}
                      {user ? <Sparkles size={20} /> : <ArrowRight size={20} />}
                    </>
                  )}
                </motion.button>
                {error && <p style={{ color: '#f87171', fontSize: '0.9rem', marginTop: '1.5rem', fontWeight: '600' }}>{error}</p>}
                {!user && <p style={{ color: theme.textMuted, fontSize: '0.85rem', marginTop: '1.25rem' }}>Create a free account to get detailed matching scores and AI feedback.</p>}
              </div>
            </motion.div>

            {/* Results Section */}
            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ ...glassCardStyle, padding: '3.5rem', position: 'sticky', top: '140px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3.5rem' }}>
                    <div style={{
                      width: '110px', height: '110px', borderRadius: '50%', border: `5px solid ${theme.primary}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', fontWeight: '800',
                      color: theme.primaryLight, boxShadow: `0 0 30px rgba(124, 58, 237, 0.4)`
                    }}>
                      {result.atsScore}%
                    </div>
                    <div>
                      <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>ATS Analysis</h2>
                      <p style={{ color: theme.textMuted }}>Match score based on skills & structure</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>Matched Skills</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                        {result.matchedSkills.map(skill => (
                          <span key={skill} style={{ padding: '0.5rem 1rem', background: 'rgba(124, 58, 237, 0.15)', border: `1px solid ${theme.primaryLight}`, borderRadius: '9999px', fontSize: '0.9rem' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>Key Recommendations</h3>
                      <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '1.25rem', padding: '1.75rem', fontSize: '1rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', border: `1px solid ${theme.glassBorder}` }}>
                        {result.aiSuggestions}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1rem' }}>
                      <button
                        onClick={() => navigate(`/editor/${result.resumeId}?improve=true`, { state: { initialResume: { ...result, content: result.resumeText } } })}
                        style={{
                          padding: '1.25rem', borderRadius: '1rem', border: 'none', fontWeight: '700', cursor: 'pointer',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white'
                        }}
                      >
                        ✨ Magic AI Improve
                      </button>
                      <button
                        onClick={() => navigate(`/editor/${result.resumeId}`, { state: { initialResume: { ...result, content: result.resumeText } } })}
                        style={{
                          padding: '1.25rem', borderRadius: '1rem', border: 'none', fontWeight: '700', cursor: 'pointer',
                          background: theme.primary, color: 'white'
                        }}
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

      {/* Floating AI Assistant Trigger */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 1000 }}
          >
            <AnimatePresence mode="wait">
              {!showChat ? (
                <motion.button
                  key="chat-trigger"
                  initial={{ opacity: 0, rotate: -45 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 45 }}
                  whileHover={{ scale: 1.1, boxShadow: `0 0 20px ${theme.primary}66` }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowChat(true)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                >
                  <MessageSquare size={28} />
                </motion.button>
              ) : (
                <motion.div
                  key="chat-window"
                  initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  style={{
                    width: '420px',
                    height: '600px',
                    background: 'rgba(10, 10, 20, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '1.5rem',
                    border: `1px solid ${theme.primary}55`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                  }}
                >
                  <div style={{
                    padding: '1rem 1.5rem',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: theme.primaryLight }}>AI ASSISTANT</span>
                    <button
                      onClick={() => setShowChat(false)}
                      style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: '4px' }}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <AIAssistant context={{ resumeText: result?.resumeText, jdText: result?.jdText, atsResult: result }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default Home;
