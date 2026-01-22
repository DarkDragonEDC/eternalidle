import React from 'react';
import { Bell, X, Star, Info, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationCenter = ({ notifications, isOpen, onClose, onMarkAsRead, onClearAll, onClickTrigger }) => {
    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type) => {
        switch (type) {
            case 'LEVEL_UP': return <Star size={16} color="#ffd700" />;
            case 'SUCCESS': return <Check size={16} color="#4caf50" />;
            case 'COMBAT': return <Star size={16} color="#ff4444" />; // Use existing or add more case
            default: return <Info size={16} color="#4a90e2" />;
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={(e) => {
                    console.log('[NOTIF] Trigger clicked');
                    onClickTrigger(e);
                }}
                className="notification-trigger"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '8px',
                    borderRadius: '8px',
                    color: unreadCount > 0 ? '#ffd700' : '#fff',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: '0.2s'
                }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        background: '#ff4d4d',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        border: '2px solid #1a1a1a'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            onClick={onClose}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 999
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            style={{
                                position: 'absolute',
                                top: '45px',
                                right: 0,
                                width: '320px',
                                background: 'rgba(20, 20, 25, 0.95)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                zIndex: 1000,
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{
                                padding: '15px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>Notifications</h3>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={onClearAll}
                                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', cursor: 'pointer' }}
                                        >
                                            Clear All
                                        </button>
                                    )}
                                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="scroll-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                                        No new notifications
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => onMarkAsRead(notif.id)}
                                            style={{
                                                padding: '12px 15px',
                                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                background: notif.read ? 'transparent' : 'rgba(255, 215, 0, 0.03)',
                                                display: 'flex',
                                                gap: '12px',
                                                cursor: 'pointer',
                                                transition: '0.2s'
                                            }}
                                        >
                                            <div style={{ marginTop: '2px' }}>
                                                {getIcon(notif.type)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.85rem', color: '#fff', lineHeight: '1.4' }}>
                                                    {notif.message}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                                                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            {!notif.read && (
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffd700', marginTop: '6px' }} />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;
