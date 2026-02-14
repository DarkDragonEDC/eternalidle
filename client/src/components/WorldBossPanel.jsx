import React, { useState, useEffect } from 'react';
import { formatNumber } from '@utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Timer, Sword, Gift, Users, Shield, ScrollText, Info } from 'lucide-react';
import { WORLDBOSS_DROP_TABLE } from '@shared/chest_drops';

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

const WorldBossInfoModal = ({ onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(8px)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, #1e0505 0%, #0f0202 100%)',
                    border: '1px solid rgba(220, 38, 38, 0.4)',
                    borderRadius: '20px',
                    padding: '24px 20px',
                    maxWidth: '380px',
                    width: '100%',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    position: 'relative'
                }}
            >
                <h2 style={{
                    color: '#ff4d4d',
                    textAlign: 'center',
                    margin: '0 0 16px 0',
                    fontSize: '1rem',
                    fontWeight: '900',
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                }}>
                    World Boss Guide
                </h2>

                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: '1.4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                        <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>⏰</span>
                        <div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>EVENT SCHEDULE</strong>
                            The boss awakens at <span style={{ color: '#ff4d4d' }}>00:00 UTC</span> and leaves at <span style={{ color: '#ff4d4d' }}>23:50 UTC</span> daily.
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                        <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>⚔️</span>
                        <div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>CHALLENGE RULES</strong>
                            You have <span style={{ color: '#ff4d4d' }}>1 minute</span> to deal damage and consolidate your daily ranking.
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                        <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>🏆</span>
                        <div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>RANKING REWARDS</strong>
                            Prizes based on rank position. Claim rewards for <span style={{ color: '#d4af37' }}>World Boss Chests</span>.
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                        <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>💎</span>
                        <div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>CRAFTING SHARDS</strong>
                            Chests drop <span style={{ color: '#a855f7' }}>Special Shards</span> for crafting powerful Combat Runes.
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        marginTop: '16px',
                        width: '100%',
                        padding: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'var(--text-main)',
                        fontWeight: '800',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        letterSpacing: '1px'
                    }}
                >
                    UNDERSTOOD
                </button>
            </motion.div>
        </motion.div>
    );
};

const WorldBossPanel = ({ gameState, isMobile, socket, onChallenge, onInspect }) => {
    const [wbStatus, setWbStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('BOSS'); // 'BOSS' | 'RANKING'
    const [showInfo, setShowInfo] = useState(false);

    // History State
    const [viewingHistory, setViewingHistory] = useState(false);
    const [historyRankings, setHistoryRankings] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!socket) return;
        const handleStatus = (status) => {
            setWbStatus(status);
            setLoading(false);
        };
        const handleHistory = ({ date, rankings }) => {
            setHistoryRankings(rankings);
            setLoadingHistory(false);
        };

        socket.on('world_boss_status', handleStatus);
        socket.on('world_boss_ranking_history', handleHistory);

        // Listen for reward claim updates to refresh UI immediately
        const handleRewardClaimed = (result) => {
            if (result.success) {
                setWbStatus(prev => ({
                    ...prev,
                    pendingReward: null // clear reward locally
                }));
                // Also fetch fresh status to be sure
                socket.emit('get_world_boss_status');
            }
        };
        socket.on('world_boss_reward_claimed', handleRewardClaimed);

        // Initial fetch
        socket.emit('get_world_boss_status');

        // Auto-refresh every 5 seconds for live rankings
        const interval = setInterval(() => {
            if (activeTab === 'RANKING' && !viewingHistory) {
                socket.emit('get_world_boss_status');
            }
        }, 5000);

        return () => {
            socket.off('world_boss_status', handleStatus);
            socket.off('world_boss_ranking_history', handleHistory);
            socket.off('world_boss_reward_claimed', handleRewardClaimed);
            clearInterval(interval);
        };
    }, [socket, activeTab, viewingHistory]);

    const fetchHistory = () => {
        setViewingHistory(true);
        setLoadingHistory(true);
        setHistoryRankings([]); // Clear prev

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        socket.emit('get_world_boss_ranking_history', { date: dateStr });
    };

    const clearHistory = () => {
        setViewingHistory(false);
        setHistoryRankings([]);
    };

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
    const currentRankings = wbStatus?.rankings || [];
    const rankings = viewingHistory ? historyRankings : currentRankings;
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

    const calculatePotentialChest = (pos, totalParticipants) => {
        if (!totalParticipants || pos <= 0) return null;

        const availableChests = Object.keys(WORLDBOSS_DROP_TABLE);
        const maxIndex = availableChests.length - 1;

        const score = totalParticipants - pos;
        let index = 0;

        if (totalParticipants <= availableChests.length) {
            index = score;
        } else {
            const maxScore = Math.max(1, totalParticipants - 1);
            const ratio = score / maxScore;
            index = Math.floor(ratio * maxIndex);
        }

        index = Math.max(0, Math.min(maxIndex, index));
        const chestId = availableChests[index];

        const parts = chestId.split('_');
        const tier = parts[0];
        const rarity = parts[parts.length - 1];
        const rarityFormatted = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();

        return `${tier} WB Chest (${rarityFormatted})`;
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

            <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '8px' : '24px' }}>

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
                                marginBottom: isMobile ? '12px' : '20px'
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
                                    padding: isMobile ? '16px 12px' : '32px 24px',
                                    background: 'linear-gradient(180deg, rgba(30, 5, 5, 0.9) 0%, rgba(15, 2, 2, 0.95) 100%)',
                                    border: '1px solid rgba(220, 38, 38, 0.2)',
                                    borderRadius: '16px',
                                    textAlign: 'center'
                                }}>
                                    {/* Info Icon */}
                                    <button
                                        onClick={() => setShowInfo(true)}
                                        style={{
                                            position: 'absolute',
                                            top: isMobile ? '8px' : '12px',
                                            right: isMobile ? '8px' : '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '50%',
                                            width: isMobile ? '24px' : '28px',
                                            height: isMobile ? '24px' : '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'rgba(255,77,77,0.7)',
                                            cursor: 'pointer',
                                            transition: '0.2s',
                                            zIndex: 2
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#ff4d4d'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,77,77,0.7)'}
                                    >
                                        <Info size={isMobile ? 14 : 16} />
                                    </button>

                                    {/* Dragon Icon */}
                                    <motion.div
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                                        style={{
                                            fontSize: isMobile ? '2.5rem' : '4rem',
                                            marginBottom: isMobile ? '8px' : '16px',
                                            filter: 'drop-shadow(0 0 12px rgba(255,80,80,0.5))'
                                        }}
                                    >
                                        🐲
                                    </motion.div>

                                    {/* Boss Name */}
                                    <h1 style={{
                                        margin: '0 0 2px 0',
                                        color: '#ff4d4d',
                                        fontSize: isMobile ? '1.2rem' : '2rem',
                                        fontWeight: '900',
                                        letterSpacing: isMobile ? '2px' : '3px',
                                        textShadow: '0 0 20px rgba(255, 77, 77, 0.4), 0 2px 4px rgba(0,0,0,0.5)',
                                        textTransform: 'uppercase'
                                    }}>
                                        {boss?.name || 'RESTING'}
                                    </h1>
                                    <div style={{
                                        fontSize: isMobile ? '0.6rem' : '0.7rem',
                                        color: 'rgba(255,77,77,0.5)',
                                        letterSpacing: '6px',
                                        fontWeight: '700',
                                        marginBottom: isMobile ? '16px' : '24px',
                                        textTransform: 'uppercase'
                                    }}>
                                        WORLD BOSS
                                    </div>

                                    {/* Info Chips */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: isMobile ? '8px' : '12px',
                                        flexWrap: 'nowrap',
                                        marginBottom: isMobile ? '16px' : '24px'
                                    }}>
                                        <CountdownTimer targetDate={boss?.endsAt} />
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: isMobile ? '4px 12px' : '8px 16px',
                                            background: 'rgba(255,255,255,0.04)',
                                            borderRadius: '20px',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            color: 'var(--text-dim)',
                                            fontSize: isMobile ? '0.75rem' : '0.8rem',
                                            fontWeight: '600'
                                        }}>
                                            <Users size={isMobile ? 12 : 14} style={{ opacity: 0.7 }} />
                                            <span>{rankings.length} {isMobile ? '' : 'Challenger'}{rankings.length !== 1 && !isMobile ? 's' : ''}</span>
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
                                                padding: isMobile ? '12px 32px' : '14px 44px',
                                                fontSize: isMobile ? '0.9rem' : '1rem',
                                                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                                                color: 'white',
                                                border: '1px solid rgba(255,100,100,0.3)',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                fontWeight: '800',
                                                letterSpacing: '1px',
                                                boxShadow: '0 4px 20px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            <Sword size={18} />
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
                                                CHALLENGED TODAY — RANK #{myRank.pos}
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
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span>From {new Date(pendingReward.date).toLocaleDateString()} • <span style={{ color: '#fff' }}>Rank #{pendingReward.rank}</span></span>
                                                        <span style={{ color: '#ae00ff' }}>{pendingReward.chest}</span>
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
                                    {viewingHistory ? 'Yesterday\'s Ranking' : 'Daily Ranking'}
                                </span>

                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        onClick={viewingHistory ? clearHistory : fetchHistory}
                                        style={{
                                            padding: '4px 10px',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            borderRadius: '8px',
                                            color: 'var(--text-main)',
                                            fontSize: '0.7rem',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        {viewingHistory ? 'View Today' : 'View Yesterday'}
                                    </button>

                                    <div style={{
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
                            </div>

                            {/* Rankings List */}
                            {loadingHistory ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading history...</div>
                            ) : rankings.length === 0 ? (
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
                                    <div>{viewingHistory ? 'No data for yesterday.' : 'No challengers yet today.'}</div>
                                    <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.5 }}>
                                        {viewingHistory ? 'The Boss was peaceful.' : 'Be the first to fight!'}
                                    </div>
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

                                                <div
                                                    onClick={() => onInspect && onInspect(rank.name)}
                                                    style={{
                                                        flex: 1,
                                                        fontWeight: isMe ? '800' : '600',
                                                        color: isMe ? '#22c55e' : 'var(--text-main)',
                                                        fontSize: '0.9rem',
                                                        marginLeft: '8px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline'
                                                    }}
                                                >
                                                    {rank.name}
                                                    {isMe && <span style={{ marginLeft: '6px', fontSize: '0.7rem', opacity: 0.7 }}>(you)</span>}
                                                    <div style={{
                                                        fontSize: '0.65rem',
                                                        color: '#d4af37',
                                                        opacity: 0.8,
                                                        fontWeight: '600',
                                                        marginTop: '2px'
                                                    }}>
                                                        {calculatePotentialChest(index + 1, rankings.length)}
                                                    </div>
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
            {/* Info Modal */}
            <AnimatePresence>
                {showInfo && <WorldBossInfoModal onClose={() => setShowInfo(false)} />}
            </AnimatePresence>
        </div>
    );
};

export default WorldBossPanel;
