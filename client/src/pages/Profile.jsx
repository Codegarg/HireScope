import React, { useContext, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, Lock, Mail, Save, AlertCircle, CheckCircle, Trash2, Edit2, X } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import API from "../services/api";
import Navbar from "../components/Navbar";

const Profile = () => {
    const { user, setUser, logout } = useContext(AuthContext);

    // Username State
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // General State
    const [status, setStatus] = useState({ type: "", message: "", section: "" });
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (user && user.name) {
            setNewUsername(user.name);
        }
    }, [user]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setStatus({ type: "", message: "", section: "" });

        if (!newUsername.trim()) {
            return setStatus({ type: "error", message: "Username cannot be empty.", section: "profile" });
        }

        if (newUsername.trim() === user.name) {
            setIsEditingUsername(false);
            return;
        }

        setIsUpdatingProfile(true);
        try {
            const res = await API.post("/auth/update-profile", { username: newUsername });
            setUser(res.data.user); // Update context
            setStatus({ type: "success", message: "Profile updated successfully!", section: "profile" });
            setIsEditingUsername(false);

            // Clear status after 3 seconds
            setTimeout(() => setStatus({ type: "", message: "", section: "" }), 3000);
        } catch (error) {
            setStatus({
                type: "error",
                message: error.response?.data?.message || "Failed to update profile.",
                section: "profile"
            });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setStatus({ type: "", message: "", section: "password" });

        if (newPassword !== confirmPassword) {
            return setStatus({ type: "error", message: "New passwords do not match.", section: "password" });
        }

        if (newPassword.length < 6) {
            return setStatus({ type: "error", message: "Password must be at least 6 characters.", section: "password" });
        }

        setIsLoading(true);
        try {
            const res = await API.post("/auth/change-password", {
                currentPassword,
                newPassword
            });
            setStatus({ type: "success", message: res.data.message || "Password updated successfully!", section: "password" });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            // Clear status after 3 seconds
            setTimeout(() => setStatus({ type: "", message: "", section: "" }), 3000);
        } catch (error) {
            setStatus({
                type: "error",
                message: error.response?.data?.message || "Failed to update password.",
                section: "password"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await API.delete("/auth/delete-account");
            logout();
            navigate('/login'); // Log the user out after successful deletion
        } catch (error) {
            setStatus({
                type: "error",
                message: error.response?.data?.message || "Failed to delete account.",
                section: "danger"
            });
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (!user) return null;

    const StatusMessage = ({ section }) => (
        <AnimatePresence mode="wait">
            {status.message && status.section === section && (
                <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        background: status.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
                        border: `1px solid ${status.type === 'error' ? 'var(--error-border)' : 'var(--success-border)'}`,
                        borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        color: status.type === 'error' ? 'var(--error-light)' : 'var(--success-light)', fontSize: '0.875rem'
                    }}
                >
                    {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    <span>{status.message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="page-wrapper" style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            <div className="ambient-bg" />
            <Navbar />

            <main style={{ paddingTop: '7rem', maxWidth: '800px', margin: '0 auto', padding: '7rem 1.5rem 2rem 1.5rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                        <div style={{
                            width: '100px', height: '100px', borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2.5rem', fontWeight: '800', color: 'white',
                            boxShadow: '0 8px 30px var(--primary-glow)',
                            margin: '0 auto 1.5rem auto'
                        }}>
                            {user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
                        </div>
                        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '0.5rem', background: 'linear-gradient(to right, var(--text-main), var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Your Space
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage your personal information and security.</p>
                    </div>

                    <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr' }}>

                        {/* Profile Info Card */}
                        <motion.div
                            style={{
                                background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
                                border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                                padding: '2.5rem', position: 'relative', overflow: 'hidden'
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--primary)', opacity: '0.05', filter: 'blur(40px)', borderRadius: '50%' }} />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                <UserIcon size={20} className="text-primary" />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Personal Information</h3>
                            </div>

                            <StatusMessage section="profile" />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px' }}>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-sub)', marginBottom: '0.5rem' }}>Username</label>

                                    {!isEditingUsername ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: '500' }}>{user.name}</span>
                                            <button
                                                onClick={() => {
                                                    setNewUsername(user.name);
                                                    setIsEditingUsername(true);
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', transition: 'color 0.2s ease' }}
                                                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                            >
                                                <Edit2 size={16} /> Edit
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="text"
                                                className="premium-input"
                                                value={newUsername}
                                                onChange={(e) => setNewUsername(e.target.value)}
                                                autoFocus
                                                required
                                                style={{ flex: 1, margin: 0 }}
                                            />
                                            <motion.button
                                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                type="button"
                                                onClick={() => setIsEditingUsername(false)}
                                                style={{ background: 'var(--bg-card)', border: 'none', borderRadius: 'var(--radius-sm)', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', cursor: 'pointer' }}
                                            >
                                                <X size={18} />
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                type="submit"
                                                disabled={isUpdatingProfile}
                                                style={{ background: 'var(--gradient-primary)', border: 'none', borderRadius: 'var(--radius-sm)', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px var(--primary-glow)', opacity: isUpdatingProfile ? 0.7 : 1 }}
                                            >
                                                <CheckCircle size={18} />
                                            </motion.button>
                                        </form>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-sub)', marginBottom: '0.5rem' }}>
                                        Email Address
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                        <Mail size={16} style={{ marginRight: '0.5rem', opacity: 0.7 }} />
                                        {user.email}
                                        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'var(--bg-card)', borderRadius: '10px' }}>Read only</span>
                                    </div>
                                </div>

                            </div>
                        </motion.div>

                        {/* Security Card */}
                        <motion.div
                            style={{
                                background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
                                border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                                padding: '2.5rem', position: 'relative', overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                <Lock size={20} className="text-primary" />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Security Settings</h3>
                            </div>

                            <StatusMessage section="password" />

                            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '400px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-sub)', marginBottom: '0.5rem' }}>Current Password</label>
                                    <input
                                        type="password" className="premium-input" placeholder="Enter current password"
                                        value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                                        required
                                        style={{ margin: 0 }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-sub)', marginBottom: '0.5rem' }}>New Password</label>
                                        <input
                                            type="password" className="premium-input" placeholder="Min. 6 chars"
                                            value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                            required minLength={6}
                                            style={{ margin: 0 }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-sub)', marginBottom: '0.5rem' }}>Confirm</label>
                                        <input
                                            type="password" className="premium-input" placeholder="Re-enter"
                                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                            required minLength={6}
                                            style={{ margin: 0 }}
                                        />
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    type="submit" disabled={isLoading}
                                    style={{
                                        marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        padding: '0.875rem 1.5rem', borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-elevated)', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                                        transition: 'all 0.2s ease', opacity: isLoading ? 0.7 : 1
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--gradient-primary)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 4px 15px var(--primary-glow)' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                                >
                                    {isLoading ? "Updating..." : <><Save size={18} /><span>Update Password</span></>}
                                </motion.button>
                            </form>

                            <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, flex: 1, minWidth: '200px' }}>
                                    If you logged in using Google or GitHub and haven't set a password yet, we can send you an email to set one up.
                                </p>
                                <button
                                    onClick={async () => {
                                        setStatus({ type: "", message: "", section: "password" });
                                        setIsLoading(true);
                                        try {
                                            const res = await API.post("/auth/forgot-password", { email: user.email });
                                            setStatus({ type: "success", message: res.data.message || "Reset link sent!", section: "password" });
                                        } catch (error) {
                                            setStatus({
                                                type: "error",
                                                message: error.response?.data?.message || "Failed to send reset link.",
                                                section: "password"
                                            });
                                        } finally {
                                            setIsLoading(false);
                                            setTimeout(() => setStatus({ type: "", message: "", section: "" }), 5000);
                                        }
                                    }}
                                    disabled={isLoading}
                                    style={{
                                        padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-elevated)', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                                        transition: 'all 0.2s ease', opacity: isLoading ? 0.7 : 1, whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                                >
                                    Send Reset Link
                                </button>
                            </div>
                        </motion.div>

                        {/* Danger Zone Card */}
                        <motion.div
                            style={{
                                background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-lg)',
                                padding: '2.5rem', position: 'relative', overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                <Trash2 size={20} style={{ color: '#ef4444' }} />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ef4444' }}>Danger Zone</h3>
                            </div>

                            <StatusMessage section="danger" />

                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                                Permanently delete your account and all associated data. This action is terminal and cannot be reversed.
                            </p>

                            <AnimatePresence mode="wait">
                                {!showDeleteConfirm ? (
                                    <motion.button
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        onClick={() => setShowDeleteConfirm(true)}
                                        style={{
                                            padding: '0.875rem 1.5rem', borderRadius: 'var(--radius-sm)',
                                            background: 'transparent', color: '#ef4444', fontWeight: '600', cursor: 'pointer',
                                            border: '1px solid rgba(239, 68, 68, 0.5)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        Delete My Account
                                    </motion.button>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}
                                    >
                                        <p style={{ fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>Are you absolutely sure?</p>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                            This will permanently delete your account, saved resumes, ATS analyses, and chat history.
                                        </p>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                style={{
                                                    padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)',
                                                    background: 'var(--bg-elevated)', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer',
                                                    border: '1px solid rgba(255,255,255,0.1)', transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDeleteAccount}
                                                disabled={isDeleting}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                    padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)',
                                                    background: '#ef4444', color: 'white', fontWeight: '600', cursor: 'pointer',
                                                    border: 'none', opacity: isDeleting ? 0.7 : 1, boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                                                }}
                                            >
                                                {isDeleting ? "Deleting..." : "Yes, permanently delete"}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </motion.div>
                    </div>
                </motion.div >
            </main >
        </div >
    );
};

export default Profile;
