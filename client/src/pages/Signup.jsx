import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import API from "../services/api";
import Navbar from "../components/Navbar";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    radius: '1.5rem',
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/auth/signup", { name, email, password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
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
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '2rem', textAlign: 'center', lineHeight: '1.2' }} className="gradient-text">Join HireScope</h2>

          {error && <p style={{ color: "#f87171", textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem', fontWeight: '600' }}>{error}</p>}

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <input
              placeholder="Full Name"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.glassBorder}`,
                borderRadius: '1rem', padding: '1.25rem', color: 'white', outline: 'none'
              }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.glassBorder}`,
                borderRadius: '1rem', padding: '1.25rem', color: 'white', outline: 'none'
              }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Create Password"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.glassBorder}`,
                borderRadius: '1rem', padding: '1.25rem', color: 'white', outline: 'none'
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading} style={{
              padding: '1.25rem', borderRadius: '1rem', border: 'none', fontWeight: '700', cursor: 'pointer',
              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`, color: 'white', fontSize: '1.1rem', marginTop: '1rem'
            }}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '1rem', color: theme.textMuted }}>
            Already have an account? <Link to="/login" style={{ color: theme.primaryLight, fontWeight: '700', textDecoration: 'none', marginLeft: '0.5rem' }}>Login</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
