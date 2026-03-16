import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Minus } from 'lucide-react';

const ChatWidget = ({ socket, user, characterName, isMobile, onInspect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadTabs, setUnreadTabs] = useState({});
    const [cooldown, setCooldown] = useState(0);
    const messagesEndRef = useRef(null);
    const isOpenRef = useRef(isOpen);
    const [activeTab, setActiveTab] = useState('GLOBAL');
    const activeTabRef = useRef(activeTab);

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    const TABS = [
        { id: 'GLOBAL', label: 'Global' },
        { id: 'PTBR', label: 'PTBR' },
        { id: 'TRADE', label: 'Trade' },
        { id: 'SYSTEM', label: 'System' }
    ];

    // Add GUILD tab if the character is in a guild
    // The character profile stores the guild info in `user.state.guild_id` or similar depending on the props structure
    // Since we receive `user` and `characterName`, we need to inspect `user` to see if it holds `state.guild_id`.
    // We'll rely on the parent component potentially passing a `hasGuild` prop, but since we can't easily change all callers,
    // we'll attempt to derive it from `user` if extended, or default to showing it and letting the server reject it.
    // However, it's better UX to conditionally show it.
    // Usually `user` contains the generic user account, we might not have `char.state.guild_id` here.
    // Let's add the tab universally for now, as checking `user.state` might not work if it's the raw user account. 
    // Wait, the client usually has a `characterState` in Context or props.
    // For safety, let's keep it visible. The server rejects non-guild members anyway.

    // Actually, looking at the code, it's safe to just add it to TABS.
    TABS.splice(3, 0, { id: 'Guild', label: 'Guild' });

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
        
        // Clear unread for active tab when open
        if (isOpen && activeTab) {
            setUnreadTabs(prev => ({
                ...prev,
                [activeTab]: 0
            }));
            
            // Recalculate total unread
            const total = Object.entries(unreadTabs).reduce((acc, [id, count]) => {
                if (id === activeTab) return acc;
                return acc + count;
            }, 0);
            setUnreadCount(total);
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
                // Remove any duplicates that might have leaked from DB or race conditions
                const uniqueHistory = [];
                const seenIds = new Set();
                history.forEach(msg => {
                    if (msg.id && !seenIds.has(msg.id)) {
                        seenIds.add(msg.id);
                        uniqueHistory.push(msg);
                    }
                });
                setMessages(uniqueHistory);
            });

            socket.on('new_message', (msg) => {
                setMessages(prev => {
                    if (msg.id && prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });

                // Handle unread counts using Refs to avoid stale closures
                let channel = msg.channel || 'GLOBAL';
                if (msg.sender_name === '[SYSTEM]' || msg.sender_name === '[ERROR]' || msg.channel === 'SYSTEM') {
                    channel = 'SYSTEM';
                }

                if (!isOpenRef.current) {
                    setUnreadCount(prev => prev + 1);
                    setUnreadTabs(prev => ({
                        ...prev,
                        [channel]: (prev[channel] || 0) + 1
                    }));
                } else if (activeTabRef.current !== channel) {
                    setUnreadTabs(prev => ({
                        ...prev,
                        [channel]: (prev[channel] || 0) + 1
                    }));
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
        if (!message.trim() || !socket || (activeTab !== 'Guild' && cooldown > 0) || activeTab === 'SYSTEM') return;

        socket.emit('send_message', { content: message.trim(), channel: activeTab });
        setMessage('');
        if (activeTab !== 'Guild') {
            setCooldown(10);
        }
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
                    color: 'var(--bg-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--panel-shadow)',
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
                            border: '2px solid var(--panel-bg)',
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
                background: 'var(--panel-bg)',
                border: '2px solid var(--accent)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--panel-shadow)',
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
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '5px' }}
                    >
                        <Minus size={24} />
                    </button>
                </div>

                {/* Tabs Area */}
                <div style={{
                    display: 'flex',
                    background: 'var(--panel-bg-dark, rgba(0,0,0,0.3))',
                    borderBottom: '1px solid var(--border)',
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
                                transition: '0.2s',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                        >
                            {tab.label}
                            {unreadTabs[tab.id] > 0 && (
                                <span style={{
                                    background: '#ff4444',
                                    color: 'white',
                                    borderRadius: '50%',
                                    padding: '0 5px',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    minWidth: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {unreadTabs[tab.id]}
                                </span>
                            )}
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
                    background: 'var(--panel-bg-dark, rgba(0,0,0,0.2))'
                }}>
                    {filteredMessages.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '20px' }}>
                            No messages in {activeTab.toLowerCase()}...
                        </div>
                    )}
                    {filteredMessages.map((rawMsg) => {
                        // Normalize message properties for robustness
                        const msg = {
                            ...rawMsg,
                            content: rawMsg.content || rawMsg.message || '',
                            sender_name: rawMsg.sender_name || rawMsg.sender || 'Unknown',
                            sender_guild_tag: rawMsg.sender_guild_tag || null,
                            created_at: rawMsg.created_at || rawMsg.timestamp || new Date().toISOString()
                        };

                        return (
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
                                    {msg.sender_guild_tag && <span style={{ color: 'var(--accent)', opacity: 0.8, fontSize: '0.85em', marginRight: '4px', textDecoration: 'none', display: 'inline-block' }}>[{msg.sender_guild_tag}]</span>}
                                    {msg.sender_name}
                                </span>
                                <span style={{ opacity: 0.4 }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style={{
                                padding: '8px 12px',
                                background: msg.sender_name === characterName ? 'var(--accent-soft)' : 'var(--glass-bg)',
                                border: msg.sender_name === characterName ? '1px solid var(--border-active)' : '1px solid var(--border)',
                                borderRadius: '12px',
                                color: msg.sender_name === '[ERROR]' ? '#ff9999' : 'var(--text-main)',
                                fontSize: '0.85rem',
                                wordBreak: 'break-word',
                                fontStyle: (msg.sender_name === '[SYSTEM]' || msg.sender_name === '[ERROR]') ? 'italic' : 'normal'
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

                {/* Input Area */}
                {activeTab !== 'SYSTEM' && (
                    <form onSubmit={handleSend} style={{
                        padding: '15px',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        background: 'var(--panel-bg)'
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
                                    background: 'var(--slot-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    padding: '10px',
                                    color: 'var(--text-main)',
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
                                    color: 'var(--bg-main)',
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
