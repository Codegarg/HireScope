import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, ArrowLeft, Trash2, Clock, ChevronRight, Menu, X, PanelLeftClose, PanelLeft, Send } from 'lucide-react';
import API from '../services/api';

const AIAssistant = ({ context, hideHeader = false }) => {
    // UI State
    const [showSidebar, setShowSidebar] = useState(false);

    // Data State
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
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
        sidebarBg: 'rgba(15, 23, 42, 0.95)', // Darker background for sidebar
    };

    // Load chat list on mount
    useEffect(() => {
        loadChats();
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadChats = async () => {
        try {
            const res = await API.get('/chat');
            setChats(res.data.data);
        } catch (err) {
            console.error("Failed to load chats", err);
        }
    };

    const loadChatDetails = async (chatId) => {
        setIsLoading(true);
        try {
            const res = await API.get(`/chat/${chatId}`);
            setMessages(res.data.data.messages);
            setCurrentChatId(chatId);
            setShowSidebar(false); // Close sidebar on selection
        } catch (err) {
            console.error("Failed to load chat details", err);
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = () => {
        setCurrentChatId(null);
        setMessages([{ role: 'assistant', content: 'Hello! I am your HireScope Career Assistant. How can I help you today?' }]);
        setShowSidebar(false);
    };

    const deleteChat = async (e, chatId) => {
        e.stopPropagation();
        if (!window.confirm("Delete this conversation?")) return;
        try {
            await API.delete(`/chat/${chatId}`);
            setChats(prev => prev.filter(c => c._id !== chatId));
            if (currentChatId === chatId) {
                startNewChat();
            }
        } catch (err) {
            console.error("Failed to delete chat", err);
        }
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input;
        const userMsg = { role: 'user', content: userText };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Optimistic UI for assistant response
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            // Use fetch for streaming
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: userText,
                    chatId: currentChatId,
                    context
                })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                // The backend sends raw text chunks, potentially prefixed with "data: " or JSON if we kept SSE format.
                // Our updated service sends raw chunks via res.write(chunk). 
                // However, Cloudflare sends "data: {...json...}" so our service forwards that.
                // Wait, in ai.service.js we modified it to res.write(chunk) -- chunk is "data: ..." from Cloudflare.
                // The client side needs to parse these "data: " lines same as the service does.
                // OR we should have parsed it in the service and sent raw text?
                // The service implementation:
                /* 
                   const lines = chunk.split('\n');
                   ...
                   if (json.response) fullResponse += json.response;
                   ...
                   res.write(chunk); // WRITES RAW CLOUDFLARE CHUNK
                */
                // So frontend receives "data: {...}" strings. We must parse here too!

                const lines = text.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr.trim() === '[DONE]') continue;
                        try {
                            const json = JSON.parse(dataStr);

                            // Check if it's our initial metadata
                            if (json.chatId) {
                                setCurrentChatId(json.chatId);
                                continue;
                            }

                            if (json.response) {
                                accumulatedText += json.response;
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1].content = accumulatedText;
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            // ignore
                        }
                    }
                }
            }

            // Refresh list to update sidebar (title/timestamp)
            loadChats();

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = "Sorry, I encountered an error. Please try again.";
                return newMsgs;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent', position: 'relative', overflow: 'hidden' }}>

            {/* Header */}


            <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(0,0,0,0.2)',
                borderBottom: `1px solid ${theme.glassBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                zIndex: 20
            }}>
                <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
                    title={showSidebar ? "Close History" : "View History"}
                >
                    {showSidebar ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentChatId ? (chats.find(c => c._id === currentChatId)?.title || 'Conversation') : 'New Chat'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: theme.textMuted }}>AI Assistant</span>
                </div>

                {/* New Chat Action in Header */}
                <button
                    onClick={startNewChat}
                    style={{ background: theme.primary, border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)' }}
                    title="Start New Chat"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Main Content Area */}
            <div style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Sidebar Overlay */}
                <AnimatePresence>
                    {showSidebar && (
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '260px',
                                height: '100%',
                                background: theme.sidebarBg,
                                borderRight: `1px solid ${theme.glassBorder}`,
                                backdropFilter: 'blur(20px)',
                                zIndex: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '4px 0 15px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div style={{ padding: '1rem', borderBottom: `1px solid ${theme.glassBorder}`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
                                    className="hover:text-white"
                                >
                                    <PanelLeftClose size={20} />
                                </button>
                                <button
                                    onClick={startNewChat}
                                    style={{ flex: 1, padding: '0.6rem', background: theme.primary, border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    <Plus size={16} /> New Chat
                                </button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                                <h4 style={{ fontSize: '0.7rem', color: theme.textMuted, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', paddingLeft: '0.25rem' }}>History</h4>

                                {chats.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: theme.textMuted, marginTop: '2rem', fontSize: '0.8rem' }}>
                                        No history yet.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {chats.map(chat => (
                                            <div
                                                key={chat._id}
                                                onClick={() => loadChatDetails(chat._id)}
                                                style={{
                                                    padding: '0.6rem 0.75rem',
                                                    background: currentChatId === chat._id ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                                                    borderRadius: '0.5rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    transition: 'all 0.2s',
                                                    border: currentChatId === chat._id ? `1px solid ${theme.primary}44` : '1px solid transparent'
                                                }}
                                                className="hover:bg-white/5"
                                            >
                                                <div style={{ overflow: 'hidden', flex: 1, marginRight: '0.5rem' }}>
                                                    <div style={{ fontSize: '0.85rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {chat.title}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: theme.textMuted }}>
                                                        {new Date(chat.updatedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => deleteChat(e, chat._id)}
                                                    style={{ padding: '4px', background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', opacity: 0.5 }}
                                                    className="hover:text-red-400 hover:opacity-100"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Backdrop for mobile closing */}
                {showSidebar && (
                    <div
                        onClick={() => setShowSidebar(false)}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 90 }}
                    />
                )}

                {/* Messages Area */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
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
                                padding: '0.75rem 1rem',
                                borderRadius: '1rem',
                                fontSize: '0.9rem',
                                lineHeight: '1.5',
                                backgroundColor: msg.role === 'user' ? theme.primary : 'rgba(255,255,255,0.08)',
                                color: 'white',
                                border: msg.role === 'user' ? 'none' : `1px solid ${theme.glassBorder}`,
                                borderBottomRightRadius: msg.role === 'user' ? '0.2rem' : '1rem',
                                borderBottomLeftRadius: msg.role === 'user' ? '1rem' : '0.2rem',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {msg.content || (isLoading && idx === messages.length - 1 ? '...' : '')}
                            </div>
                        </motion.div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderTop: `1px solid ${theme.glassBorder}`, zIndex: 20 }}>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask for career advice..."
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${theme.glassBorder}`,
                            borderRadius: '0.75rem',
                            padding: '0.7rem 1rem',
                            color: 'white',
                            outline: 'none',
                            fontSize: '0.9rem'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            padding: '0 1.2rem',
                            background: theme.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            opacity: isLoading ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AIAssistant;
