import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Stars, Gem, Menu, X, LayoutDashboard, Home } from 'lucide-react';

/* Theme icon map */
const THEME_ICONS = {
    dark: <Moon size={16} />,
    light: <Sun size={16} />,
    midnight: <Stars size={16} />,
    glass: <Gem size={16} />,
};

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const { theme, cycleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navLinks = [
        { name: 'Home', path: '/', icon: <Home size={16} /> },
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={16} /> },
    ];

    const isAuth = ['/login', '/signup', '/forgot-password'].some(p => location.pathname.startsWith(p));

    // Get user initials for avatar
    const initials = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <>
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    position: 'fixed',
                    top: '1rem',
                    left: 0,
                    right: 0,
                    margin: '0 auto',
                    width: 'min(96%, 1160px)',
                    zIndex: 1000,
                    background: 'var(--nav-bg)',
                    backdropFilter: 'var(--blur)',
                    WebkitBackdropFilter: 'var(--blur)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.625rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-md)',
                    boxSizing: 'border-box',
                    transition: 'background 0.35s ease, border-color 0.35s ease',
                }}
            >
                {/* LEFT: Logo + Nav Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                    {/* Logo */}
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                            width: '34px', height: '34px',
                            background: 'var(--gradient-primary)',
                            borderRadius: '9px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '800', color: 'white', fontSize: '1rem',
                            boxShadow: '0 4px 12px var(--primary-glow)',
                            fontFamily: "'Outfit', sans-serif",
                            flexShrink: 0,
                        }}>H</div>
                        <span style={{
                            fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.5px',
                            fontFamily: "'Outfit', sans-serif",
                            background: 'var(--gradient-text)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>HireScope</span>
                    </Link>

                    {/* Nav Links — hide on auth pages and mobile */}
                    {!isAuth && (
                        <div style={{ display: 'flex', gap: '0.25rem' }} className="nav-links-desktop">
                            {navLinks.map((link) => {
                                const isActive = location.pathname === link.path;
                                return (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                            color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                                            textDecoration: 'none',
                                            fontSize: '0.875rem', fontWeight: '600',
                                            padding: '0.45rem 0.9rem',
                                            borderRadius: 'var(--radius-sm)',
                                            background: isActive ? 'var(--bg-elevated)' : 'transparent',
                                            border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                                            transition: 'all 0.2s ease',
                                            position: 'relative',
                                        }}
                                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--bg-card)'; } }}
                                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; } }}
                                    >
                                        {link.icon}
                                        {link.name}
                                        {isActive && (
                                            <motion.div
                                                layoutId="nav-pill"
                                                style={{
                                                    position: 'absolute', inset: 0,
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: 'var(--bg-elevated)',
                                                    border: '1px solid var(--border)',
                                                    zIndex: -1,
                                                }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RIGHT: Theme Toggle + Auth */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Theme Toggle Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={cycleTheme}
                        title={`Current: ${theme.label} — click to switch`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.45rem 0.85rem',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.78rem', fontWeight: '600',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary-light)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={theme.id}
                                initial={{ opacity: 0, rotate: -45, scale: 0.5 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0, rotate: 45, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                                style={{ display: 'flex', alignItems: 'center' }}
                            >
                                {THEME_ICONS[theme.id]}
                            </motion.span>
                        </AnimatePresence>
                        <span className="hide-mobile">{theme.label}</span>
                    </motion.button>

                    {/* Auth section */}
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* User Avatar */}
                            <Link to="/profile" style={{ textDecoration: 'none' }}>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    style={{
                                        width: '34px', height: '34px',
                                        borderRadius: '50%',
                                        background: 'var(--gradient-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: '800', color: 'white',
                                        flexShrink: 0,
                                        boxShadow: '0 4px 12px var(--primary-glow)',
                                        cursor: 'pointer',
                                        title: user.name,
                                    }} title="Go to Profile">
                                    {initials}
                                </motion.div>
                            </Link>

                            {/* Logout button */}
                            <button
                                onClick={logout}
                                style={{
                                    padding: '0.45rem 1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-muted)',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '0.825rem',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        !isAuth && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '600', transition: 'color 0.2s' }}
                                    onMouseEnter={e => e.target.style.color = 'var(--text-main)'}
                                    onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                                >Login</Link>
                                <Link to="/signup" style={{
                                    padding: '0.5rem 1.1rem',
                                    background: 'var(--gradient-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'white', fontWeight: '700',
                                    textDecoration: 'none', fontSize: '0.875rem',
                                    boxShadow: '0 4px 15px var(--primary-glow)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px var(--primary-glow)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px var(--primary-glow)'; }}
                                >Join Free</Link>
                            </div>
                        )
                    )}

                    {/* Mobile hamburger */}
                    {!isAuth && (
                        <button
                            className="show-mobile"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.4rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'none' }}
                        >
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    )}
                </div>
            </motion.nav>

            {/* Mobile slide-down menu */}
            <AnimatePresence>
                {mobileOpen && !isAuth && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed',
                            top: '5rem', left: '1rem', right: '1rem',
                            zIndex: 999,
                            background: 'var(--nav-bg)',
                            backdropFilter: 'var(--blur)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.5rem',
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {navLinks.map(link => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileOpen(false)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.875rem 1rem',
                                        borderRadius: 'var(--radius-sm)',
                                        background: location.pathname === link.path ? 'var(--bg-elevated)' : 'transparent',
                                        color: location.pathname === link.path ? 'var(--text-main)' : 'var(--text-muted)',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        border: '1px solid transparent',
                                    }}
                                >
                                    {link.icon}{link.name}
                                </Link>
                            ))}
                            {user ? (
                                <button onClick={() => { logout(); setMobileOpen(false); }} style={{ marginTop: '0.5rem', padding: '0.875rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontWeight: '600', cursor: 'pointer' }}>
                                    Logout
                                </button>
                            ) : (
                                <Link to="/login" onClick={() => setMobileOpen(false)} style={{ marginTop: '0.5rem', display: 'block', padding: '0.875rem', borderRadius: 'var(--radius-sm)', background: 'var(--gradient-primary)', color: 'white', textDecoration: 'none', fontWeight: '700', textAlign: 'center' }}>
                                    Login
                                </Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inline responsive styles for Navbar only */}
            <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .show-mobile { display: flex !important; }
          .hide-mobile { display: none !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
        </>
    );
};

export default Navbar;
