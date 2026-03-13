import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';

const GuildXPInfoModal = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 200000,
                    padding: '20px'
                }} onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'rgb(0, 0, 0)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '24px',
                            padding: '30px',
                            maxWidth: '400px',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            boxShadow: 'rgba(0, 0, 0, 0.8) 0px 30px 60px',
                            position: 'relative',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}
                    >
                        <button 
                            onClick={onClose}
                            style={{ 
                                position: 'absolute', 
                                top: '20px', 
                                right: '20px', 
                                background: 'none', 
                                border: 'none', 
                                color: 'rgba(255, 255, 255, 0.5)', 
                                cursor: 'pointer',
                                padding: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ 
                                width: '50px', 
                                height: '50px', 
                                borderRadius: '16px', 
                                background: 'rgba(212, 175, 55, 0.1)', 
                                border: '1px solid var(--accent)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: 'var(--accent)' 
                            }}>
                                <Info size={28} />
                            </div>
                            <div>
                                <h3 style={{ margin: '0px', color: 'rgb(255, 255, 255)', fontSize: '1.2rem' }}>About Guild XP</h3>
                                <p style={{ margin: '0px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>How does your guild grow?</p>
                            </div>
                        </div>

                        <div style={{ 
                            background: 'rgba(0, 0, 0, 0.3)', 
                            borderRadius: '12px', 
                            padding: '15px', 
                            border: '1px solid rgba(255, 255, 255, 0.05)', 
                            fontSize: '0.85rem', 
                            color: 'rgba(255, 255, 255, 0.8)', 
                            lineHeight: '1.5' 
                        }}>
                            <p style={{ margin: '0px 0px 10px' }}>
                                Whenever any member of the guild performs actions that grant experience, <strong>a 5% bonus</strong> of that XP is copied and granted directly to the Guild!
                            </p>
                            <ul style={{ paddingLeft: '20px', margin: '0px', color: 'var(--accent)', fontWeight: 'bold' }}>
                                <li>⚔️ Combat (Killing Mobs)</li>
                                <li>🏰 Dungeons</li>
                                <li>⛏️ Gathering (Wood, Ore, Fishing, etc.)</li>
                                <li>⚒️ Refining & Crafting</li>
                            </ul>
                            <p style={{ margin: '15px 0px 0px', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                Note: Offline XP gains are automatically credited to the guild when the member logs back in. Guild XP updates occur every 30 minutes in the background.
                            </p>
                        </div>

                        <button 
                            onClick={onClose}
                            tabIndex={0} 
                            style={{ 
                                padding: '12px', 
                                background: 'var(--accent)', 
                                color: 'rgb(0, 0, 0)', 
                                border: 'none', 
                                borderRadius: '12px', 
                                fontWeight: '900', 
                                cursor: 'pointer' 
                            }}
                        >
                            GOT IT
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GuildXPInfoModal;
