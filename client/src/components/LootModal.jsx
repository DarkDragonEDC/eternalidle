import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Box, Hammer } from 'lucide-react';
import { getTierColor, resolveItem, formatItemId } from '@shared/items';

const LootModal = ({ isOpen, onClose, rewards }) => {
    if (!isOpen || !rewards) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    zIndex: 3000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '20px',
                        padding: '30px',
                        width: '90%',
                        maxWidth: '400px',
                        boxShadow: 'var(--panel-shadow), 0 0 50px var(--accent-soft)',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Background Shine Effect */}
                    <div style={{
                        position: 'absolute',
                        top: -50,
                        left: -50,
                        right: -50,
                        height: '200px',
                        background: 'linear-gradient(180deg, var(--accent-soft) 0%, transparent 100%)',
                        zIndex: 0,
                        borderRadius: '50%'
                    }} />

                    <h2 style={{
                        color: 'var(--accent)',
                        fontWeight: '900',
                        fontSize: '1.8rem',
                        letterSpacing: '2px',
                        marginBottom: '30px',
                        position: 'relative',
                        zIndex: 1,
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                    }}>
                        CHEST OPENED!
                    </h2>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        position: 'relative',
                        zIndex: 1,
                        maxHeight: '60vh',
                        overflowY: 'auto',
                        paddingRight: '10px'
                    }} className="custom-scroll">
                        <style>{`
                            .custom-scroll::-webkit-scrollbar { width: 6px; }
                            .custom-scroll::-webkit-scrollbar-track { background: var(--slot-bg); border-radius: 4px; }
                            .custom-scroll::-webkit-scrollbar-thumb { background: var(--accent-soft); border-radius: 4px; }
                            .custom-scroll::-webkit-scrollbar-thumb:hover { background: var(--accent); }
                        `}</style>
                        {/* Silver Reward */}
                        {rewards.silver > 0 && (
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    background: 'var(--accent-soft)',
                                    padding: '15px 20px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-active)'
                                }}
                            >
                                <div style={{
                                    width: '40px', height: '40px',
                                    background: 'var(--accent)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                }}>
                                    <Coins size={20} color="var(--panel-bg)" />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>+{rewards.silver}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Silver Coins</div>
                                </div>
                            </motion.div>
                        )}

                        {/* Items Reward */}
                        {rewards.items && rewards.items.map((item, index) => {
                            const resolvedItem = resolveItem(item.id);
                            const tierColor = getTierColor(item.id.split('_')[0].replace('T', ''));

                            let specificBorderColor = `${tierColor}44`;
                            if (resolvedItem?.rarityColor) {
                                specificBorderColor = resolvedItem.rarityColor;
                            } else if (resolvedItem?.rarity && resolvedItem.rarity !== 'COMMON') {
                                switch (resolvedItem.rarity) {
                                    case 'UNCOMMON': specificBorderColor = '#10B981'; break;
                                    case 'RARE': specificBorderColor = '#3B82F6'; break;
                                    case 'EPIC': specificBorderColor = '#F59E0B'; break;
                                    case 'LEGENDARY': specificBorderColor = '#EF4444'; break;
                                    case 'MYTHIC': specificBorderColor = '#A855F7'; break;
                                }
                            }

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 + (index * 0.1) }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        background: 'var(--slot-bg)',
                                        padding: '10px 15px',
                                        borderRadius: '10px',
                                        border: `1px solid ${specificBorderColor}`,
                                        boxShadow: (resolvedItem?.rarity && resolvedItem.rarity !== 'COMMON') ? `0 0 8px ${specificBorderColor}40` : 'none'
                                    }}
                                >
                                    <div style={{
                                        width: '40px', height: '40px',
                                        background: `${tierColor}22`,
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${tierColor}66`,
                                        overflow: 'hidden',
                                        padding: '4px',
                                        flexShrink: 0
                                    }}>
                                        {resolvedItem?.icon ? (
                                            <img src={resolvedItem.icon} alt={item.id} style={{ width: resolvedItem.scale || '100%', height: resolvedItem.scale || '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <Box size={24} color={tierColor} />
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'left', flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.9rem', lineHeight: '1.2', fontWeight: 'bold', color: 'var(--text-main)', display: 'inline-block', width: '100%' }}>
                                            <span style={{ marginRight: '6px', color: 'var(--text-dim)' }}>{item.qty}x</span>
                                            <span style={{ color: resolvedItem?.rarityColor || tierColor }}>{resolvedItem ? ((resolvedItem.tier && !item.id.includes('RUNE_SHARD')) ? `T${resolvedItem.tier} ${resolvedItem.name}` : resolvedItem.name) : formatItemId(item.id)}</span>
                                            {item.id.includes('::') && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--accent)', opacity: 0.8, fontSize: '0.6rem', border: '1px solid var(--accent)', padding: '1px 4px', borderRadius: '4px', marginLeft: '6px', verticalAlign: 'middle' }}>
                                                    <Hammer size={10} />
                                                    {item.id.split('::')[1]}
                                                </span>
                                            )}
                                        </div>
                                        {resolvedItem?.type !== 'ENHANCEMENT_STONE' && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                                {resolvedItem?.type ? resolvedItem.type.replace(/_/g, ' ') : 'Resource'}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <motion.button
                        id="loot-claim-button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        style={{
                            marginTop: '30px',
                            background: 'var(--accent)',
                            color: 'var(--panel-bg)',
                            border: 'none',
                            padding: '12px 40px',
                            borderRadius: '10px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            letterSpacing: '1px',
                            boxShadow: '0 4px 15px var(--accent-soft)',
                            position: 'relative',
                            zIndex: 1
                        }}
                    >
                        CLAIM
                    </motion.button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LootModal;
