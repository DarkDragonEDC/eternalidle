import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sword, Shield, Heart, Zap, Info, ChevronRight, Target, Flame, Star, Droplets, Leaf } from 'lucide-react';

const ProficiencyDetailsModal = ({ data, onClose }) => {
    if (!data) return null;

    const { title, color, icon: Icon, level, multipliers, stats, sources } = data;

    // Helper to format large numbers
    // Helper to format large numbers
    const formatNumber = (num) => {
        return num.toLocaleString('en-US');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)'
        }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                    background: 'rgba(18, 18, 24, 0.95)',
                    border: `1px solid ${color}40`,
                    borderRadius: '24px',
                    width: '90%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: `0 0 50px ${color}20, 0 10px 20px rgba(0,0,0,0.5)`,
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header Background Glow */}
                <div style={{
                    position: 'absolute',
                    top: '-100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '300px',
                    height: '200px',
                    background: color,
                    filter: 'blur(100px)',
                    opacity: 0.15,
                    pointerEvents: 'none'
                }} />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        cursor: 'pointer',
                        zIndex: 10,
                        transition: '0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                    <X size={18} />
                </button>

                {/* Header - Compact Row */}
                <div style={{ padding: '20px 60px 20px 25px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: `1px solid ${color}20` }}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        style={{
                            width: '48px',
                            height: '48px',
                            background: `linear-gradient(135deg, ${color}20, transparent)`,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${color}40`,
                            boxShadow: `0 0 15px ${color}20`
                        }}
                    >
                        <Icon size={24} color={color} />
                    </motion.div>

                    <div style={{ flex: 1 }}>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.3rem',
                            fontWeight: '900',
                            letterSpacing: '-0.5px',
                            background: `linear-gradient(90deg, #fff, ${color})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textTransform: 'uppercase',
                            lineHeight: 1
                        }}>
                            {title}
                        </h2>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        background: `${color}10`,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: `1px solid ${color}20`
                    }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>Level</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: '900', color: color, lineHeight: 1 }}>{Math.floor(level)}</span>
                    </div>
                </div>

                {/* Content Scroll Area */}
                <div style={{ padding: '0 30px 30px 30px', overflowY: 'auto', flex: 1 }}>

                    {/* Stats Grid */}
                    <div style={{ marginBottom: '30px', marginTop: '30px' }}>
                        <h4 style={{ color: '#888', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '15px' }}>
                            Combat Bonuses
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {stats.map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '16px',
                                        padding: '15px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '5px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        {stat.icon} {stat.label}
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff' }}>
                                        {stat.value}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: color, fontWeight: 'bold' }}>
                                        {stat.subtext}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Sources List */}
                    <div>
                        <h4 style={{ color: '#888', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '15px' }}>
                            Mastery Sources
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sources.map((source, i) => (
                                <motion.div
                                    key={source.label}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + (i * 0.05) }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.03)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '32px', height: '32px',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#aaa'
                                        }}>
                                            {/* We can infer icon based on label or pass it, for now generic logic or specific icons */}
                                            <ChevronRight size={16} />
                                        </div>
                                        <div>
                                            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{source.label}</div>
                                            <div style={{ color: '#666', fontSize: '0.65rem', fontWeight: 'bold' }}>Level {Math.floor(source.level)}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: color, fontSize: '0.9rem', fontWeight: '900' }}>+{source.points.toFixed(1)}</div>
                                        <div style={{ color: '#444', fontSize: '0.55rem', fontWeight: 'bold', textTransform: 'uppercase' }}>POINTS</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div style={{ marginTop: '30px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: `1px dashed ${color}30`, textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>
                            {multipliers}
                        </p>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default ProficiencyDetailsModal;
