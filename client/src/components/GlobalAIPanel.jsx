import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, ChevronRight } from 'lucide-react';
import AIAssistant from './AIAssistant';

/**
 * GlobalAIPanel
 * 
 * A floating AI sidebar visible on every page.
 * Renders the full AIAssistant (with streaming, chat history, new-chat, delete)
 * inside an animated slide-in panel triggered by a FAB (floating action button).
 * 
 * Mounted in App.jsx so it persists across all routes without unmounting.
 * Context is "general" since it's not tied to a specific resume.
 */
const GlobalAIPanel = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* FAB — fixed bottom-right trigger button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        key="fab"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        whileHover={{ scale: 1.1, boxShadow: '0 8px 30px var(--primary-glow)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        aria-label="Open AI Assistant"
                        style={{
                            position: 'fixed',
                            bottom: '2rem',
                            right: '2rem',
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            border: 'none',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 9998,
                            boxShadow: '0 4px 20px var(--primary-glow)',
                        }}
                    >
                        <Bot size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            zIndex: 9996,
                            backdropFilter: 'blur(2px)',
                        }}
                    />
                )}
            </AnimatePresence>
            {/* Compact Floating AI Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="ai-panel"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        style={{
                            position: 'fixed',
                            bottom: '5.5rem',
                            right: '2rem',
                            width: '420px',
                            height: 'min(640px, 80vh)',
                            background: 'var(--nav-bg)',
                            backdropFilter: 'var(--blur)',
                            WebkitBackdropFilter: 'var(--blur)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-lg)',
                            zIndex: 9997,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Panel Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.5rem',
                            background: 'var(--bg-card)',
                            borderBottom: '1px solid var(--border)',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-light)' }} />
                                <span style={{
                                    fontWeight: '800',
                                    fontSize: '0.85rem',
                                    color: 'var(--primary-light)',
                                    letterSpacing: '0.05em',
                                    fontFamily: "'Outfit', sans-serif"
                                }}>AI ASSISTANT</span>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    transition: 'color 0.2s'
                                }}
                                aria-label="Close AI panel"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* AIAssistant content — fills remaining space */}
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <AIAssistant context="global-assistant" hideHeader={true} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default GlobalAIPanel;
