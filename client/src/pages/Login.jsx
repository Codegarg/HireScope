import { useContext, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const Login = () => {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const theme = {
    primary: '#7c3aed',
    primaryLight: '#a78bfa',
    secondary: '#4f46e5',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    textMuted: '#94a3b8',
    radius: '1.25rem',
  };

  return (
    <div style={{ height: '100vh', backgroundColor: '#030014', color: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0,
        background: 'radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.12) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(79, 70, 229, 0.12) 0%, transparent 40%)'
      }}></div>

      <div style={{ position: 'relative', zIndex: 10 }}><Navbar /></div>

      <div style={{ position: 'relative', zIndex: 5, display: 'grid', placeItems: 'center', height: '100vh', padding: '10rem 2rem 2rem 2rem' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: theme.radius, width: '100%', maxWidth: '420px', padding: '2.5rem 2rem', background: 'rgba(255, 255, 255, 0.03)', border: `1px solid ${theme.glassBorder}`, backdropFilter: 'blur(10px)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '2.1rem', fontWeight: '800', marginBottom: '0.4rem' }}>Welcome Back</h2>
            <p style={{ color: theme.textMuted, fontSize: '0.85rem' }}>Continue your career journey</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '0.75rem', padding: '0.6rem 0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5', fontSize: '0.8rem' }}
              >
                <AlertCircle size={16} /> <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }} size={16} />
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.glassBorder}`, borderRadius: '0.85rem', padding: '0.85rem 2.75rem', color: 'white', outline: 'none' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }} size={16} />
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.glassBorder}`, borderRadius: '0.85rem', padding: '0.85rem 3rem 0.85rem 2.75rem', color: 'white', outline: 'none' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* --- FORGOT PASSWORD LINK ADDED HERE --- */}
            <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
              <Link to="/forgot-password" style={{ color: theme.primary, fontSize: '0.85rem', textDecoration: 'none', fontWeight: '500' }}>
                Forgot Password?
              </Link>
            </div>

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} disabled={isLoading} type="submit"
              style={{ padding: '0.9rem', borderRadius: '0.85rem', border: 'none', fontWeight: '700', cursor: isLoading ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`, color: 'white', opacity: isLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {isLoading ? "Authenticating..." : <><LogIn size={18} /> <span>Login to Account</span></>}
            </motion.button>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: theme.textMuted }}>
            Don't have an account? <Link to="/signup" style={{ color: 'white', fontWeight: '600', textDecoration: 'none', borderBottom: `2px solid ${theme.primary}` }}>Join Now</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;