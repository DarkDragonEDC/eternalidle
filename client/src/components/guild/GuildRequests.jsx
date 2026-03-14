import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Check, X, Shield, Clock } from 'lucide-react';

export const GuildRequests = ({ requests, isLoading, onHandleRequest, isMobile }) => {
    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="spinner-small" style={{ width: '30px', height: '30px' }} />
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                <Users size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '15px' }} />
                <div style={{ fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' }}>No pending requests</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)' }}>When players apply to your guild, they'll appear here.</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AnimatePresence>
                {requests.map((req, idx) => (
                    <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: isMobile ? '12px' : '0'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: isMobile ? '100%' : 'auto' }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    width: '46px', height: '46px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {req.avatar ? (
                                        <img src={req.avatar.replace(/\.(png|jpg|jpeg)$/, '.webp')} alt={req.name} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover', objectPosition: 'center 20%' }} />
                                    ) : (
                                        <Users size={20} color="var(--accent)" />
                                    )}
                                </div>
                                {req.isIronman && (
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, transform: 'translate(-50%, -50%)', zIndex: 2,
                                        background: '#000', borderRadius: '50%', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ff980044'
                                    }}>
                                        <Shield size={12} color="#ff9800" style={{ filter: 'drop-shadow(0 0 5px #ff980088)' }} title="Ironman" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>{req.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Shield size={10} color="var(--accent)" /> LVL {req.level || 1} • <Clock size={10} /> Applied {new Date(req.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onHandleRequest(req.id, 'reject')}
                                style={{
                                    flex: isMobile ? 1 : 'none',
                                    padding: '8px 16px',
                                    background: 'rgba(255, 68, 68, 0.1)',
                                    border: '1px solid rgba(255, 68, 68, 0.2)',
                                    borderRadius: '10px',
                                    color: '#ff4444',
                                    fontSize: '0.75rem',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <X size={14} /> REJECT
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(76, 175, 80, 0.2)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onHandleRequest(req.id, 'accept')}
                                style={{
                                    flex: isMobile ? 1 : 'none',
                                    padding: '8px 16px',
                                    background: 'var(--accent)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#000',
                                    fontSize: '0.75rem',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Check size={14} /> ACCEPT
                            </motion.button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
