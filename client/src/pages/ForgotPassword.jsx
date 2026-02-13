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
    <div style={{ height: '100vh', backgroundColor: '#030014', color: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, background: 'radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.1) 0%, transparent 40%)' }}></div>
      <div style={{ position: 'relative', zIndex: 10 }}><Navbar /></div>
      <div style={{ position: 'relative', zIndex: 5, display: 'grid', placeItems: 'center', height: '100vh' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ borderRadius: '1.25rem', width: '100%', maxWidth: '400px', padding: '2.5rem 2rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1rem' }}>Recover Password</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>We'll send a reset link to your email.</p>

          <AnimatePresence mode="wait">
            {status.message && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(248, 113, 113, 0.1)', border: `1px solid ${status.type === 'success' ? '#10b981' : '#f87171'}`, borderRadius: '0.75rem', padding: '0.8rem', marginBottom: '1rem', color: status.type === 'success' ? '#34d399' : '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{status.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
              <input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '0.8rem 1rem 0.8rem 2.75rem', color: 'white', outline: 'none' }} />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '0.85rem', borderRadius: '0.75rem', border: 'none', background: '#7c3aed', color: 'white', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link to="/login" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;