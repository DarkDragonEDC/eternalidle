import React, { useState, useEffect } from 'react';
import { formatNumber } from '@utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Timer, Sword, Gift, Users, Shield, ScrollText } from 'lucide-react';

const CountdownTimer = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!targetDate) return;

        const calculateTimeLeft = () => {
            const difference = new Date(targetDate) - new Date();
            if (difference > 0) {
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);

                setTimeLeft(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            } else {
                setTimeLeft('ENDED');
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: '6px 16px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'var(--text-dim)',
            minWidth: '100px',
            justifyContent: 'center'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <Timer size={12} />
                <span>Ends in</span>
            </div>
            <span style={{
                fontSize: '1rem',
                fontWeight: '800',
                color: 'var(--text-main)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: '1'
            }}>
                {timeLeft}
            </span>
        </div>
    );
};

const WorldBossPanel = ({ gameState, isMobile, socket, onChallenge }) => {
    const [wbStatus, setWbStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('BOSS'); // 'BOSS' | 'RANKING'

    useEffect(() => {
        if (!socket) return;
        const handleStatus = (status) => {
            setWbStatus(status);
            setLoading(false);
        };
        socket.on('world_boss_status', handleStatus);
        socket.emit('get_world_boss_status');
        return () => {
            socket.off('world_boss_status', handleStatus);
        };
    }, [socket]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    Loading World Boss...
                </motion.div>
            </div>
        );
    }

    const boss = wbStatus?.boss;
    const rankings = wbStatus?.rankings || [];
    const myRank = wbStatus?.myRank;
    const pendingReward = wbStatus?.pendingReward;

    const TabButton = ({ active, onClick, icon: Icon, label }) => (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                padding: '12px',
                background: active ? 'rgba(255, 77, 77, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${active ? '#ff4d4d' : 'transparent'}`,
                color: active ? '#ff4d4d' : 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: active ? '800' : '600',
                transition: 'all 0.2s ease',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    const getMedalColor = (index) => {
        if (index === 0) return '#FFD700';
        if (index === 1) return '#C0C0C0';
        if (index === 2) return '#CD7F32';
        return 'var(--text-dim)';
    };

    const getMedalEmoji = (index) => {
        if (index === 0) return '👑';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return null;
    };



    return (
        <div className="glass-panel" style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--panel-bg)',
            overflow: 'hidden',
            borderRadius: '16px'
        }}>
            {/* Tab Header */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(0,0,0,0.2)'
            }}>
                <TabButton
                    active={activeTab === 'BOSS'}
                    onClick={() => setActiveTab('BOSS')}
                    icon={ScrollText}
                    label="Boss Info"
                />
                <TabButton
                    active={activeTab === 'RANKING'}
                    onClick={() => setActiveTab('RANKING')}
                    icon={Trophy}
                    label="Ranking"
                />
            </div>

            <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px' }}>

                <AnimatePresence mode="wait">
                    {activeTab === 'BOSS' && (
                        <motion.div
                            key="tab-boss"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* -- Boss Hero Section -- */}
                            <div style={{
                                position: 'relative',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                marginBottom: '20px'
                            }}>
                                {/* Animated Background Glow */}
                                <motion.div
                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                                    style={{
                                        position: 'absolute', inset: 0,
                                        background: 'radial-gradient(ellipse at 50% 30%, rgba(220, 38, 38, 0.25) 0%, transparent 70%)',
                                        pointerEvents: 'none'
                                    }}
                                />
                                <div style={{
                                    position: 'relative',
                                    padding: isMobile ? '24px 16px' : '32px 24px',
                                    background: 'linear-gradient(180deg, rgba(30, 5, 5, 0.9) 0%, rgba(15, 2, 2, 0.95) 100%)',
                                    border: '1px solid rgba(220, 38, 38, 0.2)',
                                    borderRadius: '16px',
                                    textAlign: 'center'
                                }}>
                                    {/* Dragon Icon */}
                                    <motion.div
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                                        style={{ fontSize: isMobile ? '3rem' : '4rem', marginBottom: '16px', filter: 'drop-shadow(0 0 12px rgba(255,80,80,0.5))' }}
                                    >
                                        🐲
                                    </motion.div>

                                    {/* Boss Name */}
                                    <h1 style={{
                                        margin: '0 0 4px 0',
                                        color: '#ff4d4d',
                                        fontSize: isMobile ? '1.4rem' : '2rem',
                                        fontWeight: '900',
                                        letterSpacing: '3px',
                                        textShadow: '0 0 20px rgba(255, 77, 77, 0.4), 0 2px 4px rgba(0,0,0,0.5)',
                                        textTransform: 'uppercase'
                                    }}>
                                        {boss?.name || 'RESTING'}
                                    </h1>
                                    <div style={{
                                        fontSize: '0.7rem',
                                        color: 'rgba(255,77,77,0.5)',
                                        letterSpacing: '6px',
                                        fontWeight: '700',
                                        marginBottom: '24px',
                                        textTransform: 'uppercase'
                                    }}>
                                        WORLD BOSS
                                    </div>

                                    {/* Info Chips */}
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'nowrap', marginBottom: '24px' }}>
                                        <CountdownTimer targetDate={boss?.endsAt} />
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 16px',
                                            background: 'rgba(255,255,255,0.04)',
                                            borderRadius: '20px',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            color: 'var(--text-dim)',
                                            fontSize: '0.8rem',
                                            fontWeight: '600'
                                        }}>
                                            <Users size={14} style={{ opacity: 0.7 }} />
                                            <span>{rankings.length} Challenger{rankings.length !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>

                                    {/* Challenge Button */}
                                    {boss?.isAlive && !myRank && (
                                        <motion.button
                                            onClick={onChallenge}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            className="premium-button"
                                            style={{
                                                padding: isMobile ? '16px 40px' : '18px 56px',
                                                fontSize: isMobile ? '1.1rem' : '1.2rem',
                                                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                                                color: 'white',
                                                border: '1px solid rgba(255,100,100,0.3)',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                fontWeight: '800',
                                                letterSpacing: '2px',
                                                boxShadow: '0 4px 24px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            <Sword size={22} />
                                            Challenge Now
                                        </motion.button>
                                    )}

                                    {/* Already Challenged */}
                                    {myRank && (
                                        <div style={{
                                            padding: '12px 24px',
                                            background: 'rgba(34, 197, 94, 0.08)',
                                            border: '1px solid rgba(34, 197, 94, 0.2)',
                                            borderRadius: '10px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '10px'
                                        }}>
                                            <Shield size={18} color="#22c55e" />
                                            <span style={{ color: '#22c55e', fontWeight: '700', fontSize: '0.9rem', letterSpacing: '1px' }}>
                                                CHALLENGED TODAY — RANK #{myRank.rank}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* -- Pending Reward Section -- */}
                            <AnimatePresence>
                                {pendingReward && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div style={{
                                            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.02) 100%)',
                                            border: '1px solid rgba(212, 175, 55, 0.25)',
                                            borderRadius: '14px',
                                            padding: '18px 20px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <motion.div
                                                    animate={{ rotate: [0, -10, 10, 0] }}
                                                    transition={{ repeat: Infinity, duration: 2 }}
                                                    style={{
                                                        width: '42px', height: '42px',
                                                        borderRadius: '10px',
                                                        background: 'linear-gradient(135deg, #d4af37, #b8860b)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        boxShadow: '0 2px 12px rgba(212, 175, 55, 0.3)'
                                                    }}
                                                >
                                                    <Gift size={20} color="#1a1a1a" />
                                                </motion.div>
                                                <div>
                                                    <div style={{ fontWeight: '800', color: '#d4af37', fontSize: '0.9rem', letterSpacing: '1px' }}>
                                                        UNCLAIMED REWARD
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                                        From {new Date(pendingReward.date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => socket.emit('claim_world_boss_reward')}
                                                style={{
                                                    padding: '10px 24px',
                                                    background: 'linear-gradient(135deg, #d4af37, #b8860b)',
                                                    color: '#1a1a1a',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    letterSpacing: '1px',
                                                    boxShadow: '0 2px 12px rgba(212, 175, 55, 0.3)'
                                                }}
                                            >
                                                CLAIM
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {activeTab === 'RANKING' && (
                        <motion.div
                            key="tab-ranking"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            style={{ flex: 1 }}
                        >
                            {/* Section Header */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '14px',
                                paddingLeft: '4px'
                            }}>
                                <Trophy size={16} color="#d4af37" />
                                <span style={{
                                    color: 'var(--text-main)',
                                    fontWeight: '800',
                                    fontSize: '0.85rem',
                                    letterSpacing: '2px',
                                    textTransform: 'uppercase'
                                }}>
                                    Daily Ranking
                                </span>
                                <div style={{
                                    marginLeft: 'auto',
                                    padding: '3px 10px',
                                    background: 'rgba(255,255,255,0.04)',
                                    borderRadius: '12px',
                                    fontSize: '0.7rem',
                                    color: 'var(--text-dim)',
                                    fontWeight: '600'
                                }}>
                                    {rankings.length} player{rankings.length !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {/* Rankings List */}
                            {rankings.length === 0 ? (
                                <div style={{
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                    color: 'var(--text-dim)',
                                    fontSize: '0.85rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '12px',
                                    border: '1px dashed rgba(255,255,255,0.06)'
                                }}>
                                    <Sword size={28} style={{ opacity: 0.2, marginBottom: '10px' }} />
                                    <div>No challengers yet today.</div>
                                    <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.5 }}>Be the first to fight!</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {rankings.map((rank, index) => {
                                        const isMe = rank.character_id === gameState?.character?.id;
                                        const isTop3 = index < 3;
                                        return (
                                            <motion.div
                                                key={rank.character_id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: isMobile ? '12px 14px' : '14px 18px',
                                                    background: isMe
                                                        ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)'
                                                        : isTop3
                                                            ? 'linear-gradient(90deg, rgba(212, 175, 55, 0.05) 0%, transparent 100%)'
                                                            : 'rgba(255,255,255,0.02)',
                                                    border: '1px solid',
                                                    borderColor: isMe ? 'rgba(34, 197, 94, 0.2)' : isTop3 ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.04)',
                                                    borderRadius: '12px',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {/* Position */}
                                                <div style={{
                                                    width: '36px',
                                                    textAlign: 'center',
                                                    fontWeight: '900',
                                                    fontSize: isTop3 ? '1.1rem' : '0.9rem',
                                                    color: getMedalColor(index),
                                                    flexShrink: 0
                                                }}>
                                                    {getMedalEmoji(index) || `#${index + 1}`}
                                                </div>

                                                {/* Name */}
                                                <div style={{
                                                    flex: 1,
                                                    fontWeight: isMe ? '800' : '600',
                                                    color: isMe ? '#22c55e' : 'var(--text-main)',
                                                    fontSize: '0.9rem',
                                                    marginLeft: '8px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {rank.name}
                                                    {isMe && <span style={{ marginLeft: '6px', fontSize: '0.7rem', opacity: 0.7 }}>(you)</span>}
                                                </div>

                                                {/* Damage */}
                                                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                                                    <div style={{
                                                        fontWeight: '800',
                                                        color: isTop3 ? '#d4af37' : 'var(--accent)',
                                                        fontSize: isMobile ? '0.85rem' : '0.95rem',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {formatNumber(rank.damage)}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.6rem',
                                                        color: 'var(--text-dim)',
                                                        fontWeight: '600',
                                                        letterSpacing: '1px',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        damage
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

export default WorldBossPanel;
