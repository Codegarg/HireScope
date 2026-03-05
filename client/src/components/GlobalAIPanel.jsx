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

            {/* Slide-in AI Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="ai-panel"
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: 'min(420px, 100vw)',
                            background: 'var(--bg-surface)',
                            borderLeft: '1px solid var(--border)',
                            boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
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
                            gap: '0.75rem',
                            padding: '1rem 1.25rem',
                            background: 'var(--bg-elevated)',
                            borderBottom: '1px solid var(--border)',
                            flexShrink: 0,
                        }}>
                            {/* Bot icon with glow */}
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 0 12px var(--primary-glow)',
                                flexShrink: 0,
                            }}>
                                <Bot size={18} color="white" />
                            </div>

                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{
                                    fontWeight: '800',
                                    fontSize: '0.95rem',
                                    color: 'var(--text-main)',
                                    fontFamily: "'Outfit', sans-serif",
                                }}>
                                    AI Career Assistant
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    Resume · ATS · Job Advice
                                </div>
                            </div>

                            {/* Suggested prompts dropdown hint */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                }}
                                aria-label="Close AI panel"
                            >
                                <ChevronRight size={16} />
                            </motion.button>
                        </div>

                        {/* Suggested prompts quick-start */}
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                            flexShrink: 0,
                        }}>
                            {[
                                '💼 Improve my resume',
                                '📊 Explain my ATS score',
                                '🎯 Job search tips',
                            ].map((prompt) => (
                                <SuggestedPrompt key={prompt} label={prompt} />
                            ))}
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

/**
 * SuggestedPrompt chip — clicking dispatches a custom event that AIAssistant
 * can optionally listen to. For now it's purely visual; the user copies the idea.
 */
const SuggestedPrompt = ({ label }) => (
    <motion.button
        whileHover={{ scale: 1.03, borderColor: 'var(--primary)' }}
        whileTap={{ scale: 0.97 }}
        style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '9999px',
            padding: '0.3rem 0.8rem',
            fontSize: '0.75rem',
            color: 'var(--text-sub)',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
        }}
    >
        {label}
    </motion.button>
);

export default GlobalAIPanel;
