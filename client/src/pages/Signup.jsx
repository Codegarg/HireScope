import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, Mail, Lock, UserPlus, AlertCircle, Github, Chrome, Eye, EyeOff, FileCheck, Search, Zap } from "lucide-react";
import API from "../services/api";
import Navbar from "../components/Navbar";

const Signup = () => {
  // Use "username" to match the Backend Schema requirements
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Sending "username" instead of "name" to satisfy backend validation
      await API.post("/auth/signup", { username, email, password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: <FileCheck size={24} />, label: 'Smart ATS Check' },
    { icon: <Search size={24} />, label: 'Keyword Analysis' },
    { icon: <Zap size={24} />, label: 'Instant Feedback' },
  ];

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh' }}>
      <div className="ambient-bg" />
      <Navbar />

      <div className="auth-layout" style={{ paddingTop: '5rem' }}>
        {/* Brand Panel */}
        <div className="auth-brand-panel">
          <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
              <div style={{ width: '44px', height: '44px', background: 'var(--gradient-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '800', color: 'white', fontFamily: "'Outfit', sans-serif", boxShadow: '0 8px 20px var(--primary-glow)' }}>H</div>
              <span style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: "'Outfit', sans-serif", background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>HireScope</span>
            </div>

            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: '800', lineHeight: '1.15', marginBottom: '1.25rem', fontFamily: "'Outfit', sans-serif" }}>
              Build a<br />
              <span style={{ background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>better resume.</span>
            </h2>

            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '3rem' }}>
              Optimize your profile against job descriptions and improve your visibility to employers.
            </p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              {benefits.map(({ icon, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  style={{ padding: '1.25rem 1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
                >
                  <div style={{ color: 'var(--primary)', background: 'rgba(124,58,237,0.1)', padding: '0.5rem', borderRadius: '0.75rem', display: 'flex' }}>
                    {icon}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', lineHeight: '1.3' }}>{label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="auth-form-panel">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: '100%', maxWidth: '400px' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.9rem', fontWeight: '800', marginBottom: '0.4rem', fontFamily: "'Outfit', sans-serif" }}>
                Create your account
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Start optimizing your career today</p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error-light)', fontSize: '0.875rem' }}
                >
                  <AlertCircle size={16} /><span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-icon-wrap">
                <UserIcon className="input-icon" size={16} />
                <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="premium-input" />
              </div>

              <div className="input-icon-wrap">
                <Mail className="input-icon" size={16} />
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="premium-input" />
              </div>

              <div className="input-icon-wrap">
                <Lock className="input-icon" size={16} />
                <input
                  type={showPassword ? "text" : "password"} placeholder="Create Password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="premium-input" style={{ paddingRight: '3rem' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                disabled={loading} type="submit"
                className="glow-btn"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Creating account..." : <><span>Create Account</span><UserPlus size={18} /></>}
              </motion.button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
              <div className="divider" />
              <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>OR CONTINUE WITH</span>
              <div className="divider" />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                { href: "http://localhost:5000/api/auth/google", icon: <Chrome size={18} />, label: "Google" },
                { href: "http://localhost:5000/api/auth/github", icon: <Github size={18} />, label: "GitHub" },
              ].map(({ href, icon, label }) => (
                <motion.a
                  key={label} href={href}
                  whileHover={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-sub)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '600', transition: 'all 0.2s' }}
                >
                  {icon}<span>{label}</span>
                </motion.a>
              ))}
            </div>

            <p style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: '700', textDecoration: 'none' }}>
                Login →
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Signup;