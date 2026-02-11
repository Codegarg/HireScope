import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AIAssistant = ({ context, hideHeader = false }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your HireScope Career Assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);

    const theme = {
        primary: '#7c3aed',
        primaryLight: '#a78bfa',
        secondary: '#4f46e5',
        glassBg: 'rgba(255, 255, 255, 0.05)',
        glassBorder: 'rgba(255, 255, 255, 0.1)',
        textMuted: '#94a3b8',
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            const history = messages.slice(0, -1).filter(m => m.content && m.content.trim() !== '');
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ message: input, context, history })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(line.indexOf('{')));
                            if (data.response) {
                                fullContent += data.response;
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1].content = fullContent;
                                    return newMsgs;
                                });
                            }
                        } catch (e) { }
                    }
                }
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'transparent'
        }}>
            {!hideHeader && (
                <div
                    style={{
                        padding: '1.25rem 1.5rem',
                        background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})`,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontWeight: '800',
                        color: 'white',
                        fontSize: '1rem',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                    }}
                >
                    AI Career Assistant
                </div>
            )}

            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: 'rgba(0,0,0,0.2)'
            }}>
                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                    >
                        <div style={{
                            maxWidth: '85%',
                            padding: '0.8rem 1.25rem',
                            borderRadius: '1rem',
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            backgroundColor: msg.role === 'user' ? theme.primary : 'rgba(255,255,255,0.08)',
                            color: 'white',
                            border: msg.role === 'user' ? 'none' : `1px solid ${theme.glassBorder}`,
                            borderBottomRightRadius: msg.role === 'user' ? '0.2rem' : '1rem',
                            borderBottomLeftRadius: msg.role === 'user' ? '1rem' : '0.2rem',
                        }}>
                            {msg.content || (isLoading && idx === messages.length - 1 ? '...' : '')}
                        </div>
                    </motion.div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.3)', borderTop: `1px solid ${theme.glassBorder}` }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your resume..."
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${theme.glassBorder}`,
                            borderRadius: '0.75rem',
                            padding: '0.75rem 1.25rem',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: theme.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            opacity: isLoading ? 0.5 : 1
                        }}
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AIAssistant;
