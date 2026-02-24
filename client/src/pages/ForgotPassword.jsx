import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import API from "../services/api";
import Navbar from "../components/Navbar";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const res = await API.post("/auth/forgot-password", { email });
      setStatus({ type: "success", message: res.data.message });
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="ambient-bg" />
      <Navbar />

      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '8rem 1.5rem 3rem' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="glass-card"
          style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}
        >
          {/* Icon */}
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(124,58,237,0.12)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Mail size={24} color="var(--primary-light)" />
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>Recover Password</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            We'll send a secure reset link to your email.
          </p>

          <AnimatePresence mode="wait">
            {status.message && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  background: status.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', marginBottom: '1.25rem',
                  color: status.type === 'success' ? 'var(--success-light)' : 'var(--error-light)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
                }}
              >
                {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{status.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-icon-wrap">
              <Mail className="input-icon" size={16} />
              <input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)} className="premium-input" />
            </div>
            <button
              type="submit" disabled={loading}
              className="glow-btn"
              style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;