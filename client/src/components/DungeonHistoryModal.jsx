import React from 'react';
import { X, Skull, Award, Clock, Coins, ChevronRight, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatItemId, resolveItem } from '@shared/items';

const DungeonHistoryModal = ({ isOpen, onClose, history }) => {
    if (!isOpen) return null;

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}m ${s}s`;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3000,
                padding: '20px',
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)'
            }} onClick={(e) => e.target === e.currentTarget && onClose()}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    style={{
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '80vh',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border-active)',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: 'var(--panel-shadow)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--accent-soft)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <History size={24} color="var(--accent)" />
                            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 'bold' }}>Dungeon History</h2>
                        </div>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                        {history.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                                <History size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                <p>No completed runs yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {history.map((run) => (
                                    <div key={run.id} style={{
                                        background: 'var(--slot-bg)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        borderLeft: `4px solid ${run.outcome === 'COMPLETED' ? '#4caf50' : '#ff4444'}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                {run.dungeon_name || 'Dungeon'} (T{run.tier})
                                                {run.runs_completed && run.total_runs && (
                                                    <span style={{ marginLeft: '8px', color: 'var(--accent)', fontSize: '0.8rem' }}>
                                                        (Run {run.runs_completed}/{run.total_runs})
                                                    </span>
                                                )}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: '#888' }}>{formatDate(run.occurred_at)}</span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#aaa' }}>
                                                <Award size={14} color="#4caf50" />
                                                <span>{run.xp_gained} XP</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#aaa' }}>
                                                <Clock size={14} color="#42a5f5" />
                                                <span>{formatTime(run.duration_seconds)}</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                                            <span style={{ color: run.outcome === 'COMPLETED' ? '#4caf50' : '#ff4444', fontWeight: 'bold' }}>
                                                {run.outcome} • Wave {run.wave_reached}/{run.max_waves}
                                            </span>
                                        </div>

                                        {run.loot_gained && run.loot_gained.length > 0 && (
                                            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                {run.loot_gained.map((lootStr, idx) => {
                                                    const match = lootStr.match(/^(\d+)x\s+(.+)$/);
                                                    let displayStr = lootStr;
                                                    let itemId = lootStr;

                                                    if (match) {
                                                        itemId = match[2];
                                                    }

                                                    const item = resolveItem(itemId);

                                                    return (
                                                        <span key={idx} style={{
                                                            fontSize: '0.65rem',
                                                            background: 'var(--panel-bg)',
                                                            color: 'var(--text-dim)',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            border: '1px solid var(--border)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            {item?.icon && (
                                                                <img src={item.icon} alt="" style={{ width: item.scale || '1.2em', height: item.scale || '1.2em', objectFit: 'contain' }} />
                                                            )}
                                                            {displayStr}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DungeonHistoryModal;
