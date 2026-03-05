import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const GlobalNav = () => {
    const navigate = useNavigate();

    const btnStyle = {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        color: 'var(--text-main)',
        width: '45px',
        height: '45px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        transition: 'all 0.2s ease',
    };

    return (
        <div className="global-nav-wrapper">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(-1)}
                style={btnStyle}
                title="Go Back"
                aria-label="Navigate back"
            >
                <ChevronLeft size={22} />
            </motion.button>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(1)}
                style={btnStyle}
                title="Go Forward"
                aria-label="Navigate forward"
            >
                <ChevronRight size={22} />
            </motion.button>
        </div>
    );
};

export default GlobalNav;
