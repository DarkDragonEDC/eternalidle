import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sword, Shield, Heart, Zap, TrendingUp, Box } from 'lucide-react';
import { resolveItem, QUALITIES, BASE_QUALITY_CHANCES } from '@shared/items';

const CraftingOddsModal = ({ isOpen, onClose, item, stats, tierColor }) => {
    if (!isOpen || !item) return null;

    const tier = Number(item.tier) || 1;
    const resolvedItem = resolveItem(item.id) || item;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                style={{
                    width: '100%', maxWidth: '400px', background: 'var(--panel-bg)',
                    borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--panel-shadow)',
                    position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                }}>

                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '8px', background: 'var(--accent-soft)', borderRadius: '12px', color: 'var(--accent)' }}>
                            <Box size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Crafting Odds</h3>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', margin: 0 }}>Base stats for T{tier} {item.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--text-dim)', padding: '4px' }}><X size={20} /></button>
                </div>

                {/* Content */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '70vh', overflowY: 'auto' }}>
                    {Object.values(QUALITIES).map((q, idx) => {
                        const qualityBonus = stats.globals?.qualityChance || 0;
                        const mult = 1 + (qualityBonus / 100);
                        const chances = BASE_QUALITY_CHANCES[tier] || BASE_QUALITY_CHANCES[1];
                        let c = 0;
                        if (q.id === 4) c = chances.q4 * mult;
                        else if (q.id === 3) c = chances.q3 * mult;
                        else if (q.id === 2) c = chances.q2 * mult;
                        else if (q.id === 1) c = chances.q1 * mult;
                        else c = Math.max(0, 100 - (chances.q4 + chances.q3 + chances.q2 + chances.q1) * mult);

                        const qItem = resolveItem(resolvedItem.id, q.id);
                        const s = qItem?.stats || {};

                        return (
                            <div key={idx} style={{
                                background: 'var(--slot-bg)',
                                padding: '14px',
                                borderRadius: '16px',
                                border: `1px solid ${q.color}20`,
                                borderLeft: `4px solid ${q.color}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '900', color: q.color, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{q.name}</span>
                                    <div style={{ padding: '2px 8px', background: `${q.color}15`, borderRadius: '6px', fontSize: '0.75rem', fontWeight: '900', color: q.color }}>
                                        {c.toFixed(2)}%
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                    {s.damage && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
                                            <Sword size={12} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: '800' }}>{s.damage} DMG</span>
                                        </div>
                                    )}
                                    {s.defense && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80' }}>
                                            <Shield size={12} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: '800' }}>{s.defense} DEF</span>
                                        </div>
                                    )}
                                    {s.hp && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff4d4d' }}>
                                            <Heart size={12} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: '800' }}>{s.hp} HP</span>
                                        </div>
                                    )}
                                    {s.attackSpeed && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)' }}>
                                            <Zap size={12} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: '800' }}>{(s.attackSpeed / 1000).toFixed(2)}s</span>
                                        </div>
                                    )}
                                    {s.efficiency && typeof s.efficiency === 'number' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#90d5ff' }}>
                                            <TrendingUp size={12} /> <span style={{ fontSize: '0.7rem', fontWeight: '800' }}>{s.efficiency}% EFF</span>
                                        </div>
                                    )}
                                    {s.efficiency && typeof s.efficiency === 'object' && s.efficiency.GLOBAL && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#90d5ff' }}>
                                            <TrendingUp size={12} /> <span style={{ fontSize: '0.7rem', fontWeight: '800' }}>{s.efficiency.GLOBAL}% GLOBAL</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '10px', borderRadius: '12px', background: 'var(--accent-soft)',
                            color: 'var(--accent)', fontWeight: '900', fontSize: '0.8rem', textTransform: 'uppercase'
                        }}>
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CraftingOddsModal;
