import React, { useEffect, useState } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sword, Skull, Shield, Coins, Star } from 'lucide-react';
import { resolveItem } from '@shared/items';

const CombatHistoryModal = ({ isOpen, onClose, socket }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && socket) {
            setLoading(true);
            socket.emit('get_combat_history');

            const handleUpdate = (data) => {
                setHistory(data);
                setLoading(false);
            };

            socket.on('combat_history_update', handleUpdate);
            return () => {
                socket.off('combat_history_update', handleUpdate);
            };
        }
    }, [isOpen, socket]);

    if (!isOpen) return null;

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(0,0,0,0.7)', zIndex: 10000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(5px)'
            }}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    style={{
                        width: '600px', maxWidth: '95vw',
                        maxHeight: '80vh',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: 'var(--panel-shadow)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '16px', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'var(--accent-soft)'
                    }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Sword size={20} color="#ff4444" />
                            Combat Sessions
                        </h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>


                        {loading ? (
                            <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>Loading...</div>
                        ) : history.length === 0 ? (
                            <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No combat history recorded yet.</div>
                        ) : (
                            history.map((log) => {
                                const duration = Math.max(1, log.duration_seconds || 1);
                                const dps = (log.damage_dealt || 0) / duration;
                                const xph = ((log.xp_gained || 0) / duration) * 3600;
                                const silverh = ((log.silver_gained || 0) / duration) * 3600;

                                return (
                                    <div key={log.id} style={{
                                        background: 'var(--slot-bg)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: `1px solid ${log.outcome === 'VICTORY' ? 'rgba(76, 175, 80, 0.3)' : log.outcome === 'FLEE' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
                                        marginBottom: '8px'
                                    }}>
                                        {/* Session Header */}
                                        <div style={{
                                            padding: '12px',
                                            background: 'var(--panel-bg)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderBottom: '1px solid var(--border)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {log.mob_name || 'Unknown Enemy'}
                                                    <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'normal' }}>
                                                        ({formatDuration(log.duration_seconds)})
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
                                                    {new Date(log.occurred_at).toLocaleString()}
                                                </div>
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem', fontWeight: 'bold',
                                                padding: '4px 10px', borderRadius: '4px',
                                                background: log.outcome === 'VICTORY' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                                color: log.outcome === 'VICTORY' ? '#4caf50' : log.outcome === 'FLEE' ? '#ff9800' : '#f44336',
                                                textTransform: 'uppercase', letterSpacing: '1px'
                                            }}>
                                                {log.outcome === 'FLEE' ? 'STOPPED' : log.outcome}
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border)' }}>
                                            <StatBox label="KILLS" value={formatNumber(log.kills || 0)} color="var(--text-main)" />
                                            <StatBox label="DPS" value={dps.toFixed(1)} color="#ff4444" />
                                            <StatBox label="XP/H" value={formatNumber(Math.floor(xph))} color="#4caf50" />
                                            <StatBox label="SILVER/H" value={formatNumber(Math.floor(silverh))} color="var(--accent)" />
                                        </div>

                                        {/* Rewards Footer */}
                                        {(log.xp_gained > 0 || log.silver_gained > 0 || (log.loot_gained && log.loot_gained.length > 0)) && (
                                            <div style={{ padding: '12px', background: 'var(--slot-bg)' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>Session Rewards</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {log.xp_gained > 0 && (
                                                        <RewardBadge icon={<Star size={12} />} text={`${formatNumber(log.xp_gained)} XP`} color="#ffeb3b" />
                                                    )}
                                                    {log.silver_gained > 0 && (
                                                        <RewardBadge icon={<Coins size={12} />} text={`${formatNumber(log.silver_gained)} Silver`} color="#00bcd4" />
                                                    )}
                                                    {log.loot_gained && log.loot_gained.map((item, idx) => (
                                                        <RewardBadge key={idx} text={item} color="#ae00ff" bg="rgba(174, 0, 255, 0.1)" />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const StatBox = ({ label, value, color }) => (
    <div style={{ background: 'var(--panel-bg)', padding: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.6rem', color: '#777', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontWeight: 'bold', color: color, fontSize: '0.9rem' }}>{value}</div>
    </div>
);

const RewardBadge = ({ icon, text, color, bg }) => (
    <span style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        background: bg || `${color}20`,
        color: color,
        padding: '4px 8px', borderRadius: '4px',
        fontSize: '0.75rem', fontWeight: 'bold',
        border: `1px solid ${color}40`
    }}>
        {icon} {text}
    </span>
);

export default CombatHistoryModal;
