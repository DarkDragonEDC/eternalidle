import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Box } from 'lucide-react';
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
                    background: 'rgba(0,0,0,0.7)',
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
                        border: '1px solid var(--accent)',
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
                            .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
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
                                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Silver Coins</div>
                                </div>
                            </motion.div>
                        )}

                        {/* Items Reward */}
                        {rewards.items && rewards.items.map((item, index) => {
                            const resolvedItem = resolveItem(item.id);
                            const tierColor = getTierColor(item.id.split('_')[0].replace('T', ''));

                            // Determine Icon
                            let IconComponent = Box;
                            if (item.id.includes('PLANK') || item.id.includes('LOG')) IconComponent = 'LOG';
                            if (item.id.includes('BAR') || item.id.includes('ORE')) IconComponent = 'ORE';
                            if (item.id.includes('LEATHER') || item.id.includes('HIDE')) IconComponent = 'HIDE';
                            if (item.id.includes('CLOTH') || item.id.includes('FIBER')) IconComponent = 'FIBER';
                            if (item.id.includes('CREST')) IconComponent = 'CREST';

                            // Map custom strings to Lucide (for now, or SVG paths)
                            // Better: Just use generic Box if no image, but color it well.
                            // BUT wait, does resolvedItem have .icon?
                            const iconUrl = resolvedItem?.icon;

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 + (index * 0.1) }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        background: 'var(--slot-bg)',
                                        padding: '15px 20px',
                                        borderRadius: '12px',
                                        border: `1px solid ${tierColor}44`
                                    }}
                                >
                                    <div style={{
                                        width: '48px', height: '48px',
                                        background: `${tierColor}22`,
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${tierColor}66`,
                                        overflow: 'hidden',
                                        padding: '5px'
                                    }}>
                                        {iconUrl ? (
                                            <img src={iconUrl} alt={item.id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <Box size={24} color={tierColor} />
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                            {item.qty}x <span style={{ color: tierColor }}>{resolvedItem ? (resolvedItem.tier ? `T${resolvedItem.tier} ${resolvedItem.name}` : resolvedItem.name) : formatItemId(item.id)}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{resolvedItem?.type || 'Resource'}</div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <motion.button
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
