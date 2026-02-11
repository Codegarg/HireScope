import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, UserPlus, AlertCircle, Github, Chrome, Eye, EyeOff } from "lucide-react";
import API from "../services/api";
import Navbar from "../components/Navbar";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const theme = {
    primary: '#7c3aed',
    primaryLight: '#a78bfa',
    secondary: '#4f46e5',
    glassBg: 'rgba(255, 255, 255, 0.03)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    textMuted: '#94a3b8',
    radius: '1.25rem',
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/auth/signup", { name, email, password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const socialButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.875rem',
    borderRadius: '1rem',
    border: `1px solid ${theme.glassBorder}`,
    background: 'rgba(255,255,255,0.02)',
    color: 'white',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer'
  };

  return (
    <div style={{ height: '100vh', backgroundColor: '#030014', color: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0,
        background: 'radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.12) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(79, 70, 229, 0.12) 0%, transparent 40%)'
      }}></div>

      <div style={{ position: 'relative', zIndex: 10 }}>
        <Navbar />
      </div>

      <div style={{ position: 'relative', zIndex: 5, display: 'grid', placeItems: 'center', height: '100vh', padding: '8rem 2rem 2rem 2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-panel"
          style={{
            borderRadius: theme.radius,
            width: '100%', maxWidth: '420px', padding: '2.25rem 2rem'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <motion.h2
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              style={{ fontSize: '2.1rem', fontWeight: '800', marginBottom: '0.4rem' }}
              className="gradient-text"
            >
              Join HireScope
            </motion.h2>
            <p style={{ color: theme.textMuted, fontSize: '0.85rem' }}>Start optimizing your career today</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: 'rgba(248, 113, 113, 0.1)',
                  border: '1px solid rgba(248, 113, 113, 0.2)',
                  borderRadius: '0.75rem',
                  padding: '0.6rem 0.8rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#fca5a5',
                  fontSize: '0.8rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ position: 'relative' }}>
              <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }} size={16} />
              <input
                placeholder="Full Name"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.glassBorder}`,
                  borderRadius: '0.85rem', padding: '0.85rem 0.85rem 0.85rem 2.75rem', color: 'white', outline: 'none', transition: 'all 0.2s',
                  fontSize: '0.9rem'
                }}
                onFocus={(e) => {
                  e.target.style.border = `1px solid ${theme.primary}`;
                  e.target.style.background = 'rgba(255,255,255,0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.border = `1px solid ${theme.glassBorder}`;
                  e.target.style.background = 'rgba(255,255,255,0.03)';
                }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }} size={16} />
              <input
                type="email"
                placeholder="Email Address"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.glassBorder}`,
                  borderRadius: '0.85rem', padding: '0.85rem 0.85rem 0.85rem 2.75rem', color: 'white', outline: 'none', transition: 'all 0.2s',
                  fontSize: '0.9rem'
                }}
                onFocus={(e) => {
                  e.target.style.border = `1px solid ${theme.primary}`;
                  e.target.style.background = 'rgba(255,255,255,0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.border = `1px solid ${theme.glassBorder}`;
                  e.target.style.background = 'rgba(255,255,255,0.03)';
                }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }} size={16} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create Password"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.glassBorder}`,
                  borderRadius: '0.85rem', padding: '0.85rem 3rem 0.85rem 2.75rem', color: 'white', outline: 'none', transition: 'all 0.2s',
                  fontSize: '0.9rem'
                }}
                onFocus={(e) => {
                  e.target.style.border = `1px solid ${theme.primary}`;
                  e.target.style.background = 'rgba(255,255,255,0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.border = `1px solid ${theme.glassBorder}`;
                  e.target.style.background = 'rgba(255,255,255,0.03)';
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: theme.textMuted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              type="submit"
              style={{
                padding: '0.9rem', borderRadius: '0.85rem', border: 'none', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`, color: 'white', fontSize: '0.95rem', marginTop: '0.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Creating..." : (
                <>
                  <span>Create Account</span>
                  <UserPlus size={18} />
                </>
              )}
            </motion.button>
          </form>

          <div style={{ margin: '1.25rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
            <span style={{ color: theme.textMuted, fontSize: '0.75rem', fontWeight: '600' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <motion.a
              whileHover={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' }}
              href="http://localhost:5000/api/auth/google"
              style={{ ...socialButtonStyle, padding: '0.75rem', fontSize: '0.85rem' }}
            >
              <Chrome size={18} />
              <span>Google</span>
            </motion.a>
            <motion.a
              whileHover={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' }}
              href="http://localhost:5000/api/auth/github"
              style={{ ...socialButtonStyle, padding: '0.75rem', fontSize: '0.85rem' }}
            >
              <Github size={18} />
              <span>GitHub</span>
            </motion.a>
          </div>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: theme.textMuted }}>
            Already have an account?
            <Link to="/login" style={{
              color: 'white',
              fontWeight: '600',
              textDecoration: 'none',
              marginLeft: '0.4rem',
              borderBottom: `2px solid ${theme.primary}`
            }}>Login</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
