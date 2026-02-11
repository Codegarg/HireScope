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
            style={{
                position: 'fixed',
                top: '1.25rem',
                left: 0,
                right: 0,
                margin: '0 auto',
                width: 'min(95%, 1200px)',
                zIndex: 1000,
                background: 'rgba(10, 10, 20, 0.75)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '1.25rem',
                padding: '0.75rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                boxSizing: 'border-box'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                        width: '32px', height: '32px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'white'
                    }}>H</div>
                    <span style={{
                        fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.5px',
                        background: 'linear-gradient(to right, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>HireScope</span>
                </Link>

                <div style={{ display: 'flex', gap: '2rem' }}>
                    {!(["/login", "/signup"].includes(location.pathname)) && navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            style={{
                                color: location.pathname === link.path ? '#fff' : '#94a3b8',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
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
                                        bottom: '-4px',
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
                                        borderRadius: '2px'
                                    }}
                                />
                            )}
                        </Link>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '500' }}>{user.name}</span>
                        <button
                            onClick={logout}
                            style={{
                                padding: '0.6rem 1.25rem',
                                borderRadius: '0.75rem',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >Logout</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <Link to="/login" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>Login</Link>
                        <Link to="/signup" style={{
                            padding: '0.7rem 1.4rem',
                            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                            borderRadius: '0.75rem',
                            color: 'white',
                            fontWeight: '700',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
                            transition: 'transform 0.2s'
                        }}
                            onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
                        >Join HireScope</Link>
                    </div>
                )}
            </div>
        </motion.nav>
    );
};

export default Navbar;
