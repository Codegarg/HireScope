import { useContext, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const theme = {
    primary: '#7c3aed',
    primaryLight: '#a78bfa',
    secondary: '#4f46e5',
    glassBg: 'rgba(255, 255, 255, 0.03)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    textMuted: '#94a3b8',
    radius: '1.5rem',
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      window.location.href = "/";
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030014', color: '#f8fafc' }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1,
        background: 'radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.15) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(79, 70, 229, 0.15) 0%, transparent 40%)'
      }}></div>
      <Navbar />

      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '2rem' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{
          background: theme.glassBg, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${theme.glassBorder}`, borderRadius: theme.radius, boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          width: '100%', maxWidth: '420px', padding: '4rem'
        }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '2rem', textAlign: 'center', lineHeight: '1.2' }} className="gradient-text">Welcome Back</h2>

          {error && <p style={{ color: "#f87171", textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem', fontWeight: '600' }}>{error}</p>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <input
              type="email"
              placeholder="Email Address"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.glassBorder}`,
                borderRadius: '1rem', padding: '1.25rem', color: 'white', outline: 'none', transition: 'all 0.2s'
              }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.glassBorder}`,
                borderRadius: '1rem', padding: '1.25rem', color: 'white', outline: 'none', transition: 'all 0.2s'
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" style={{
              padding: '1.25rem', borderRadius: '1rem', border: 'none', fontWeight: '700', cursor: 'pointer',
              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`, color: 'white', fontSize: '1.1rem', marginTop: '1rem'
            }}>Login</button>
          </form>

          <div style={{ margin: '2.5rem 0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            <span style={{ color: theme.textMuted, fontSize: '0.9rem', fontWeight: '600' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <a href="http://localhost:5000/api/auth/google" style={{
              display: 'block', textAlign: 'center', padding: '1rem', borderRadius: '1rem', border: `1px solid ${theme.glassBorder}`,
              color: 'white', textDecoration: 'none', fontSize: '1rem', fontWeight: '600', transition: 'all 0.2s'
            }}>
              Continue with Google
            </a>
            <a href="http://localhost:5000/api/auth/github" style={{
              display: 'block', textAlign: 'center', padding: '1rem', borderRadius: '1rem', border: `1px solid ${theme.glassBorder}`,
              color: 'white', textDecoration: 'none', fontSize: '1rem', fontWeight: '600', transition: 'all 0.2s'
            }}>
              Continue with GitHub
            </a>
          </div>

          <p style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '1rem', color: theme.textMuted }}>
            Don’t have an account? <Link to="/signup" style={{ color: theme.primaryLight, fontWeight: '700', textDecoration: 'none', marginLeft: '0.5rem' }}>Signup</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
