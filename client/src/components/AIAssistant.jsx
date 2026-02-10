import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AIAssistant = ({ context }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your HireScope Career Assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const chatEndRef = useRef(null);

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

        // Initial assistant message placeholder for streaming
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            // Send existing messages as history (exclude current user msg and placeholder)
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
                // Keep the last partial line in the buffer
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
                        } catch (e) {
                            // Incomplete or non-JSON
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`ai-assistant-card ${isCollapsed ? 'collapsed' : ''}`}
            style={{ height: isCollapsed ? 'auto' : '500px' }}>
            <div className="ai-header" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }} onClick={() => setIsCollapsed(!isCollapsed)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%' }}></div>
                    HireScope AI Assistant
                </div>
                <button
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {isCollapsed ? '+' : '—'}
                </button>
            </div>

            {!isCollapsed && (
                <>
                    <div className="ai-messages">
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="msg-wrapper"
                                style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                            >
                                <div className={`msg-bubble ${msg.role === 'user' ? 'msg-user' : 'msg-assistant'}`}>
                                    {msg.content || (isLoading && idx === messages.length - 1 ? '...' : '')}
                                </div>
                            </motion.div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="ai-input-form">
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask anything..."
                                className="premium-input"
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="premium-btn btn-blue"
                                style={{ opacity: isLoading ? 0.5 : 1 }}
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
};

export default AIAssistant;
