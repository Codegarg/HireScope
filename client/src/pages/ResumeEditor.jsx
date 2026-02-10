import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AIAssistant from '../components/AIAssistant';

const ResumeEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [resume, setResume] = useState(null);
    const [currentContent, setCurrentContent] = useState('');
    const [activeVersion, setActiveVersion] = useState(0);
    const [isRewriting, setIsRewriting] = useState(false);
    const [rewriteInstructions, setRewriteInstructions] = useState('');
    const [selectedText, setSelectedText] = useState('');

    // Fetch resume on load
    useEffect(() => {
        const fetchResume = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`http://localhost:5000/api/resumes`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // For demo simplicity, find by ID from the list
                const found = res.data.data.find(r => r._id === id);
                if (found) {
                    setResume(found);
                    setCurrentContent(found.versions[found.currentVersionIndex].content);
                    setActiveVersion(found.currentVersionIndex);
                }
            } catch (err) {
                console.error("Error fetching resume", err);
            }
        };
        fetchResume();
    }, [id]);

    const handleRewrite = async () => {
        if (!selectedText || !rewriteInstructions) return;
        setIsRewriting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/resumes/rewrite', {
                sectionText: selectedText,
                instructions: rewriteInstructions
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                const newContent = currentContent.replace(selectedText, res.data.data);
                setCurrentContent(newContent);
                setIsRewriting(false);
                setRewriteInstructions('');
                setSelectedText('');
            }
        } catch (err) {
            console.error("Rewrite error", err);
            setIsRewriting(false);
        }
    };

    const saveNewVersion = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/resumes/version', {
                resumeId: id,
                content: currentContent,
                feedback: "Improved by AI"
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                alert("New version saved successfully!");
                setResume(res.data.data);
                setActiveVersion(res.data.data.versions.length - 1);
            }
        } catch (err) {
            console.error("Save error", err);
        }
    };

    const handleTextSelection = () => {
        const selection = window.getSelection().toString();
        if (selection) {
            setSelectedText(selection);
        }
    };

    if (!resume) return <div className="p-20 text-center dark:text-white">Loading Editor...</div>;

    return (
        <div className="editor-layout">
            {/* Editor Main Area */}
            <div className="editor-main">
                <header className="dashboard-header">
                    <div>
                        <h1>{resume.title}</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Version {activeVersion + 1} of {resume.versions.length}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={saveNewVersion}
                            className="premium-btn"
                            style={{ backgroundColor: '#16a34a', color: 'white' }}
                        >
                            Save Version
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="premium-btn btn-blue no-print"
                        >
                            Download PDF
                        </button>
                    </div>
                </header>

                <div className="editor-paper">
                    <div
                        className="focus:outline-none whitespace-pre-wrap"
                        style={{ fontSize: '1.125rem', lineHeight: '1.75', outline: 'none', color: 'inherit' }}
                        onMouseUp={handleTextSelection}
                        contentEditable
                        onInput={(e) => setCurrentContent(e.currentTarget.textContent)}
                        suppressContentEditableWarning={true}
                    >
                        {currentContent}
                    </div>

                    <AnimatePresence>
                        {selectedText && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                style={{
                                    position: 'fixed',
                                    bottom: '2.5rem',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'var(--bg-card)',
                                    padding: '1.5rem',
                                    borderRadius: '1.5rem',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                    border: '1px solid #3b82f6',
                                    width: '100%',
                                    maxWidth: '32rem',
                                    zIndex: 50
                                }}
                            >
                                <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Rewrite Selection?</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                                    "{selectedText.substring(0, 100)}..."
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={rewriteInstructions}
                                        onChange={(e) => setRewriteInstructions(e.target.value)}
                                        placeholder="E.g. Make it more professional..."
                                        className="premium-input"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        onClick={handleRewrite}
                                        disabled={isRewriting}
                                        className="premium-btn btn-blue"
                                        style={{ fontSize: '0.875rem' }}
                                    >
                                        {isRewriting ? 'Rewriting...' : 'Rewrite'}
                                    </button>
                                    <button
                                        onClick={() => setSelectedText('')}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Sidebar Area */}
            <div className="sidebar-right">
                <div style={{ background: 'var(--bg-page)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Career Assistant</h3>
                    <AIAssistant context={{ resumeText: currentContent }} />
                </div>

                <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '1.5rem', borderRadius: '1.5rem', color: 'white' }}>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Interview Prep</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '1rem' }}>Get tailored questions for any company based on this resume.</p>
                    <input
                        type="text"
                        id="companyNameInput"
                        placeholder="Enter Company Name..."
                        className="premium-input"
                        style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', marginBottom: '0.75rem' }}
                    />
                    <button
                        onClick={async () => {
                            const company = document.getElementById('companyNameInput').value;
                            if (!company) return alert("Please enter a company name");
                            const token = localStorage.getItem('token');
                            try {
                                const res = await axios.post('http://localhost:5000/api/resumes/interview-prep',
                                    { resumeText: currentContent, companyName: company },
                                    { headers: { Authorization: `Bearer ${token}` } }
                                );
                                alert(res.data.data);
                            } catch (err) {
                                console.error(err);
                            }
                        }}
                        className="premium-btn"
                        style={{ width: '100%', backgroundColor: 'white', color: '#4f46e5' }}
                    >
                        Generate Prep
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResumeEditor;
