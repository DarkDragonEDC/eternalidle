import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Minus } from 'lucide-react';

const ChatWidget = ({ socket, user, characterName, isMobile, onInspect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [cooldown, setCooldown] = useState(0);
    const messagesEndRef = useRef(null);
    const isOpenRef = useRef(isOpen);

    const [activeTab, setActiveTab] = useState('GLOBAL');
    const TABS = [
        { id: 'GLOBAL', label: 'Global' },
        { id: 'PTBR', label: 'PTBR' },
        { id: 'TRADE', label: 'Trade' },
        { id: 'SYSTEM', label: 'System' }
    ];

    useEffect(() => {
        let interval;
        if (cooldown > 0) {
            interval = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [cooldown]);

    useEffect(() => {
        isOpenRef.current = isOpen;
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen, activeTab]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (socket) {
            socket.emit('get_chat_history');

            socket.on('chat_history', (history) => {
                setMessages(history);
            });

            socket.on('new_message', (msg) => {
                setMessages(prev => [...prev, msg]);
                if (!isOpenRef.current) {
                    setUnreadCount(prev => prev + 1);
                }
            });

            return () => {
                socket.off('chat_history');
                socket.off('new_message');
            };
        }
    }, [socket]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!message.trim() || !socket || cooldown > 0 || activeTab === 'SYSTEM') return;

        socket.emit('send_message', { content: message.trim(), channel: activeTab });
        setMessage('');
        setCooldown(10);
    };

    const filteredMessages = messages.filter(msg => {
        if (activeTab === 'SYSTEM') {
            return msg.sender_name === '[SYSTEM]' || msg.sender_name === '[ERROR]' || msg.channel === 'SYSTEM';
        }
        if (activeTab === 'GLOBAL') {
            return (!msg.channel || msg.channel === 'GLOBAL') && msg.sender_name !== '[SYSTEM]' && msg.sender_name !== '[ERROR]';
        }
        return msg.channel === activeTab;
    });

    if (!isOpen) {
        return (
            <button
                onClick={() => {
                    setIsOpen(true);
                    setUnreadCount(0);
                }}
                style={{
                    position: 'fixed',
                    bottom: isMobile ? '80px' : '30px',
                    left: isMobile ? '20px' : '360px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    opacity: 0.5,
                    border: 'none',
                    color: '#000',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <div style={{ position: 'relative' }}>
                    <MessageSquare size={30} />
                    {unreadCount > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            background: '#ff4444',
                            color: 'white',
                            borderRadius: '10px',
                            padding: '2px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            border: '2px solid #0f0f1a',
                            minWidth: '20px',
                            textAlign: 'center'
                        }}>
                            {unreadCount}
                        </div>
                    )}
                </div>
            </button>
        );
    }

    return (
        <>
            <div
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
                onClick={() => setIsOpen(false)}
            />
            <div style={{
                position: 'fixed',
                bottom: isMobile ? '0' : '100px',
                left: isMobile ? '50%' : '360px',
                right: 'auto',
                transform: isMobile ? 'translateX(-50%)' : 'none',
                width: isMobile ? '90vw' : '320px',
                height: '450px',
                background: '#1a1a2e',
                border: '2px solid var(--accent)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                zIndex: 10000,
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '12px 20px',
                    background: 'var(--accent-soft)',
                    borderBottom: '1px solid var(--border-active)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MessageSquare size={18} color="var(--accent)" />
                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent)' }}>Chat</span>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '5px' }}
                    >
                        <Minus size={24} />
                    </button>
                </div>

                {/* Tabs Area */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(0,0,0,0.3)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    padding: '0 5px'
                }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-dim)',
                                fontSize: '0.75rem',
                                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Messages Area */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    {filteredMessages.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#555', fontSize: '0.85rem', marginTop: '20px' }}>
                            No messages in {activeTab.toLowerCase()}...
                        </div>
                    )}
                    {filteredMessages.map((msg) => (
                        <div key={msg.id} style={{
                            alignSelf: msg.sender_name === characterName ? 'flex-end' : 'flex-start',
                            maxWidth: '85%'
                        }}>
                            <div style={{
                                fontSize: '0.7rem',
                                color: msg.sender_name === '[SYSTEM]' ? '#ffaa00' :
                                    msg.sender_name === '[ERROR]' ? '#ff4444' :
                                        msg.sender_name === characterName ? 'var(--accent)' : '#4caf50',
                                display: 'flex',
                                justifyContent: msg.sender_name === characterName ? 'flex-end' : 'flex-start',
                                marginBottom: '4px',
                                gap: '5px'
                            }}>
                                <span
                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                    onClick={() => onInspect && onInspect(msg.sender_name)}
                                >
                                    {msg.sender_name}
                                </span>
                                <span style={{ opacity: 0.4 }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style={{
                                padding: '8px 12px',
                                background: msg.sender_name === characterName ? 'var(--accent-soft)' : 'rgba(255,255,255,0.05)',
                                border: msg.sender_name === characterName ? '1px solid var(--border-active)' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: msg.sender_name === '[SYSTEM]' ? '#ffaa00' :
                                    msg.sender_name === '[ERROR]' ? '#ff9999' : '#fff',
                                fontSize: '0.85rem',
                                wordBreak: 'break-word',
                                fontStyle: (msg.sender_name === '[SYSTEM]' || msg.sender_name === '[ERROR]') ? 'italic' : 'normal'
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {activeTab !== 'SYSTEM' && (
                    <form onSubmit={handleSend} style={{
                        padding: '15px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        background: '#0f0f1a'
                    }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={user?.is_anonymous ? "Register to chat..." : `Message on ${activeTab.toLowerCase()}...`}
                                maxLength={100}
                                disabled={user?.is_anonymous}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid #333',
                                    borderRadius: '6px',
                                    padding: '10px',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    opacity: user?.is_anonymous ? 0.5 : 1
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!message.trim() || cooldown > 0 || user?.is_anonymous}
                                style={{
                                    background: (message.trim() && cooldown === 0 && !user?.is_anonymous) ? 'var(--accent)' : 'var(--accent-soft)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    width: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: (message.trim() && cooldown === 0 && !user?.is_anonymous) ? 'pointer' : 'default',
                                    color: '#000',
                                    transition: '0.2s',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    opacity: user?.is_anonymous ? 0.5 : 1
                                }}
                            >
                                {cooldown > 0 ? cooldown : <Send size={18} />}
                            </button>
                        </div>
                        {user?.is_anonymous && (
                            <div style={{
                                fontSize: '0.7rem',
                                color: 'var(--accent)',
                                textAlign: 'center',
                                fontStyle: 'italic'
                            }}>
                                Link your account to start chatting!
                            </div>
                        )}
                    </form>
                )}
            </div>
        </>
    );
};

export default ChatWidget;
