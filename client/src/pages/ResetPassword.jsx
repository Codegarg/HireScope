import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import API from "../services/api";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError("");
    try {
      await API.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Link expired or invalid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem 1.5rem' }}>
      <div className="ambient-bg" />

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="glass-card"
        style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', textAlign: 'center', position: 'relative', zIndex: 1 }}
      >
        {success ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
          >
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={36} color="var(--success-light)" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif" }}>Password Reset!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Redirecting you to login…</p>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '0.5rem' }}>
              <motion.div style={{ height: '100%', background: 'var(--gradient-primary)', borderRadius: 'var(--radius-md)' }} initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 3, ease: 'linear' }} />
            </div>
          </motion.div>
        ) : (
          <>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(34,192,142,0.12)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Lock size={24} color="var(--primary-light)" />
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', fontFamily: "'Space Grotesk', sans-serif" }}>Set New Password</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>Choose a strong password for your account.</p>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--error-light)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div className="input-icon-wrap">
                <Lock className="input-icon" size={16} />
                <input
                  type={showPassword ? "text" : "password"} placeholder="New Password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="premium-input" style={{ paddingRight: '3rem' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="input-icon-wrap">
                <Lock className="input-icon" size={16} />
                <input
                  type="password" placeholder="Confirm Password" required
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="premium-input"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="glow-btn"
                style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;