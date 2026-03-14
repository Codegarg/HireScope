import React from 'react';
import { motion } from 'framer-motion';

/**
 * StreamingResumeView
 * 
 * Renders raw text in a high-fidelity "A4" container to simulate 
 * a resume being written line-by-line during AI Magic Improve.
 */
const StreamingResumeView = ({ content }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                width: '794px', // A4 width at 96 DPI
                minHeight: '1123px', // A4 height
                background: 'white',
                padding: '40px 60px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                borderRadius: '4px',
                color: '#1e293b',
                fontFamily: '"Inter", "Inter var", sans-serif',
                fontSize: '11pt',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                position: 'relative',
                textAlign: 'left'
            }}
        >
            {/* Simulation of a resume header - if we have content, try to make the first line look like a name */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                {content ? (
                    content.split('\n')
                        .filter((line, idx, allLines) => {
                            // Filter out common preamble patterns in the first few lines
                            if (idx < 5) {
                                const clean = line.trim().toLowerCase();
                                const isPreamble =
                                    clean.includes('here is') ||
                                    clean.includes('revised resume') ||
                                    clean.includes('improved resume') ||
                                    clean.includes('certainly') ||
                                    clean.includes('sure,') ||
                                    clean.startsWith('target:') ||
                                    clean.startsWith('location:') ||
                                    clean.startsWith('role:') ||
                                    clean.startsWith('optimized for:') ||
                                    (clean.length > 0 && clean.length < 100 && clean.endsWith(':') && !allLines[idx + 1]?.startsWith('•') && !allLines[idx + 1]?.startsWith('-'));

                                if (isPreamble) return false;
                            }
                            return true;
                        })
                        .map((line, idx) => {
                            // First line of the FILTERED list is usually name
                            if (idx === 0) {
                                return (
                                    <div key={idx} style={{
                                        fontSize: '24pt',
                                        fontWeight: '800',
                                        textAlign: 'center',
                                        marginBottom: '10px',
                                        color: '#0f172a',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        {line}
                                    </div>
                                );
                            }

                            // Detect potential section headers (all caps or bold markers)
                            const isHeader = /^[A-Z\s]{3,}$/.test(line.trim()) || line.startsWith('**');
                            const cleanLine = line.replace(/^\*\*|\*\*$/g, '');

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        marginBottom: idx === 1 ? '20px' : '4px',
                                        paddingBottom: isHeader ? '2px' : '0',
                                        borderBottom: isHeader ? '1px solid #e2e8f0' : 'none',
                                        fontWeight: isHeader ? '700' : '400',
                                        fontSize: isHeader ? '12pt' : '10.5pt',
                                        marginTop: isHeader ? '15px' : '0',
                                        color: isHeader ? '#1e293b' : '#334155',
                                        textTransform: isHeader ? 'uppercase' : 'none',
                                        letterSpacing: isHeader ? '0.05em' : 'normal'
                                    }}
                                >
                                    {cleanLine}
                                </div>
                            );
                        })
                ) : (
                    <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '100px' }}>
                        Waiting for AI to weave magic...
                    </div>
                )}
            </div>

            {/* Subtle "Streaming" animation overlay */}
            <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
                    zIndex: 2
                }}
            />
        </motion.div>
    );
};

export default StreamingResumeView;
