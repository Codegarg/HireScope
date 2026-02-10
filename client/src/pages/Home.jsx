import { useState, useContext } from "react";
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: theme.textMuted, marginBottom: '1rem', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.05em' }}>RESUME (PDF, DOCX)</label>
                  <label style={{
                    display: 'block', padding: '2.5rem', textAlign: 'center', cursor: 'pointer', borderRadius: '1rem',
                    border: `2px dashed ${resume ? theme.primary : 'rgba(255,255,255,0.1)'}`, background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s'
                  }}>
                    <input type="file" style={{ display: 'none' }} accept=".pdf,.docx,.doc" onChange={(e) => setResume(e.target.files[0])} />
                    <div style={{ color: resume ? '#fff' : theme.textMuted, fontSize: '1.1rem' }}>
                      {resume ? `📄 ${resume.name}` : "Click or drop your resume here"}
                    </div>
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', color: theme.textMuted, marginBottom: '1rem', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.05em' }}>JOB DESCRIPTION</label>
                  <textarea
                    rows="6"
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.glassBorder}`, borderRadius: '1rem',
                      padding: '1.25rem', color: 'white', fontSize: '1rem', outline: 'none', transition: 'all 0.2s'
                    }}
                    placeholder="Paste the job description here..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = theme.primary}
                    onBlur={(e) => e.target.style.borderColor = theme.glassBorder}
                  />
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '1.5rem', fontSize: '1.1rem', fontWeight: '700', borderRadius: '1rem', border: 'none',
                    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`, color: 'white', cursor: 'pointer', transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  {loading ? "AI Processing..." : "Run ATS Analysis"}
                </button>
                {error && <p style={{ color: '#f87171', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
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
                        onClick={() => navigate(`/editor/${result.resumeId}?improve=true`)}
                        style={{
                          padding: '1.25rem', borderRadius: '1rem', border: 'none', fontWeight: '700', cursor: 'pointer',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white'
                        }}
                      >
                        ✨ Magic AI Improve
                      </button>
                      <button
                        onClick={() => navigate(`/editor/${result.resumeId}`)}
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

      {/* Floating Chat */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
            style={{ position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 1000, width: '420px' }}
          >
            <div style={{ ...glassCardStyle, height: '550px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${theme.primaryLight}` }}>
              <div style={{ padding: '1.25rem 2rem', background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})`, fontWeight: '800', fontSize: '1.1rem' }}>
                HireScope AI Assistant
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <AIAssistant context={{ resumeText: result?.resumeText, jdText: result?.jdText, atsResult: result }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
