import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Dashboard', path: '/dashboard' },
    ];

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="no-print"
            style={{
                position: 'fixed',
                top: '1.5rem',
                left: '2.5%',
                width: '95%',
                maxWidth: '1200px',
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2.5rem',
                background: 'rgba(15, 10, 30, 0.8)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                margin: '0 auto',
                left: 0,
                right: 0
            }}
        >
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    color: 'white',
                    fontSize: '1.25rem',
                    boxShadow: '0 0 15px rgba(124, 58, 237, 0.5)'
                }}>H</div>
                <span className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.03em' }}>
                    HireScope
                </span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                {navLinks.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        style={{
                            color: location.pathname === link.path ? '#fff' : 'rgba(255,255,255,0.6)',
                            textDecoration: 'none',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}
                    >
                        {link.name}
                        {location.pathname === link.path && (
                            <motion.div
                                layoutId="nav-active"
                                style={{
                                    position: 'absolute',
                                    bottom: '-6px',
                                    left: 0,
                                    right: 0,
                                    height: '3px',
                                    background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
                                    borderRadius: '2px'
                                }}
                            />
                        )}
                    </Link>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                {user ? (
                    <>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', fontWeight: '500' }}>{user.name}</span>
                        <button
                            onClick={logout}
                            style={{
                                padding: '0.6rem 1.5rem',
                                fontSize: '0.9rem',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: 'white',
                                borderRadius: '999px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = '#7c3aed'; }}
                            onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={{ color: 'white', textDecoration: 'none', fontSize: '1rem', fontWeight: '500' }}>Login</Link>
                        <Link to="/signup" style={{
                            padding: '0.75rem 1.75rem',
                            fontSize: '0.95rem',
                            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                            color: 'white',
                            borderRadius: '999px',
                            textDecoration: 'none',
                            fontWeight: '700',
                            boxShadow: '0 10px 20px -5px rgba(124, 58, 237, 0.4)',
                            transition: 'transform 0.2s'
                        }}
                            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            Join HireScope
                        </Link>
                    </>
                )}
            </div>
        </motion.nav>
    );
};

export default Navbar;
