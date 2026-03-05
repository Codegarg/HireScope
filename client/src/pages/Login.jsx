
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, Github, Chrome, Sparkles } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const Login = () => {
  const { login, user, checkUserStatus } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Handle OAuth Redirect
  useEffect(() => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      checkUserStatus().then(() => { navigate("/"); });
    }
  }, [checkUserStatus, navigate]);

  useEffect(() => {
    if (user) navigate("/");
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

  const features = [
    "ATS score analysis",
    "Keyword optimization",
    "Job match insights",
    "Tailored resume suggestions",
  ];

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh' }}>
      <div className="ambient-bg" />
      <Navbar />

      <div className="auth-layout" style={{ paddingTop: '5rem' }}>
        {/* Brand Panel */}
        <div className="auth-brand-panel">
          {/* Decorative orb */}
          <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '420px' }}>
            {/* Brand mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
              <div style={{ width: '44px', height: '44px', background: 'var(--gradient-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '800', color: 'white', fontFamily: "'Outfit', sans-serif", boxShadow: '0 8px 20px var(--primary-glow)' }}>H</div>
              <span style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: "'Outfit', sans-serif", background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>HireScope</span>
            </div>

            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: '800', lineHeight: '1.15', marginBottom: '1.25rem', fontFamily: "'Outfit', sans-serif", color: 'var(--text-main)' }}>
              Refine your resume.<br />
              <span style={{ background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Land the interview.</span>
            </h2>

            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '2.5rem' }}>
              Use HireScope's ATS insights to help your profile stand out to recruiters.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {features.map((f, i) => (
                <motion.div
                  key={f}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'var(--success-light)', fontSize: '0.65rem' }}>✓</span>
                  </div>
                  <span style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>{f}</span>
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
                Welcome back
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Continue your career journey</p>
            </div>

            {/* Error */}
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

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-icon-wrap">
                <Mail className="input-icon" size={16} />
                <input
                  type="email" placeholder="Email Address"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="premium-input"
                />
              </div>

              <div className="input-icon-wrap">
                <Lock className="input-icon" size={16} />
                <input
                  type={showPassword ? "text" : "password"} placeholder="Password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="premium-input"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
                <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '500' }}>
                  Forgot Password?
                </Link>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                disabled={isLoading} type="submit"
                className="glow-btn"
                style={{ width: '100%', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? "Authenticating..." : <><LogIn size={18} /><span>Login to Account</span></>}
              </motion.button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
              <div className="divider" />
              <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>OR CONTINUE WITH</span>
              <div className="divider" />
            </div>

            {/* OAuth */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                { href: "http://localhost:5000/api/auth/google", icon: <Chrome size={18} />, label: "Google" },
                { href: "http://localhost:5000/api/auth/github", icon: <Github size={18} />, label: "GitHub" },
              ].map(({ href, icon, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  whileHover={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-sub)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '600', transition: 'all 0.2s' }}
                >
                  {icon}<span>{label}</span>
                </motion.a>
              ))}
            </div>

            <p style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: 'var(--primary-light)', fontWeight: '700', textDecoration: 'none' }}>
                Join HireScope →
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;