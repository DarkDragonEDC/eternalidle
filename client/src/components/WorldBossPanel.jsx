import React, { useState, useEffect } from 'react';
import { formatNumber } from '@utils/format';
import { resolveItem } from '@shared/items';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Timer, Sword, Gift, Users, Shield, ScrollText, Info, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const HPBar = ({ current, max, color = '#ff4d4d' }) => {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    return (
        <div style={{ width: '100%', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: '700' }}>
                <span>BOSS HP</span>
                <span>{percentage.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    style={{ height: '100%', background: `linear-gradient(90deg, ${color} 0%, #ff8080 100%)`, boxShadow: `0 0 10px ${color}44` }}
                />
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                {formatNumber(current)} / {formatNumber(max)}
            </div>
        </div>
    );
};

const CountdownTimer = ({ targetDate, label = "Ends in" }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!targetDate) return;
        const calculateTimeLeft = () => {
            const difference = new Date(targetDate) - new Date();
            if (difference > 0) {
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            } else {
                setTimeLeft('ENDED');
            }
        };
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px 16px', background: 'var(--accent-soft)', borderRadius: '20px', border: '1px solid var(--border)', color: 'var(--text-dim)', minWidth: '100px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <Timer size={12} />
                <span>{label}</span>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums', lineHeight: '1' }}>{timeLeft}</span>
        </div>
    );
};

const BossCard = ({ data, type, onChallenge, isMobile, setShowInfo, rankingType, setRankingType, gameState, socket, onInspect, onShowItem }) => {

    const getMedalColor = (index) => {
        if (index === 0) return '#FFD700';
        if (index === 1) return '#E0E0E0';
        if (index === 2) return '#CD7F32';
        return 'var(--text-dim)';
    };

    const MedalIcon = ({ index, size = 20 }) => {
        if (index > 2) return <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>#{index + 1}</span>;
        return (
            <div className="medal-glow" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Medal size={size} style={{ filter: `drop-shadow(0 0 6px ${getMedalColor(index)}44)`, fill: index === 0 ? '#FFD700' : index === 1 ? '#E0E0E0' : '#CD7F32', stroke: 'rgba(0,0,0,0.3)', strokeWidth: 1.5 }} />
            </div>
        );
    };

    const DAMAGE_MILESTONES = [
        { id: 'T10_WORLDBOSS_CHEST_MASTERPIECE', dmg: 1100000 },
        { id: 'T10_WORLDBOSS_CHEST_EXCELLENT', dmg: 950000 },
        { id: 'T10_WORLDBOSS_CHEST_OUTSTANDING', dmg: 825000 },
        { id: 'T10_WORLDBOSS_CHEST_GOOD', dmg: 750000 },
        { id: 'T10_WORLDBOSS_CHEST_NORMAL', dmg: 670000 },
        { id: 'T9_WORLDBOSS_CHEST_MASTERPIECE', dmg: 605000 },
        { id: 'T9_WORLDBOSS_CHEST_EXCELLENT', dmg: 550000 },
        { id: 'T9_WORLDBOSS_CHEST_OUTSTANDING', dmg: 505000 },
        { id: 'T9_WORLDBOSS_CHEST_GOOD', dmg: 465000 },
        { id: 'T9_WORLDBOSS_CHEST_NORMAL', dmg: 430000 },
        { id: 'T8_WORLDBOSS_CHEST_MASTERPIECE', dmg: 400000 },
        { id: 'T8_WORLDBOSS_CHEST_EXCELLENT', dmg: 370000 },
        { id: 'T8_WORLDBOSS_CHEST_OUTSTANDING', dmg: 335000 },
        { id: 'T8_WORLDBOSS_CHEST_GOOD', dmg: 315000 },
        { id: 'T8_WORLDBOSS_CHEST_NORMAL', dmg: 290000 },
        { id: 'T7_WORLDBOSS_CHEST_MASTERPIECE', dmg: 272000 },
        { id: 'T7_WORLDBOSS_CHEST_EXCELLENT', dmg: 252000 },
        { id: 'T7_WORLDBOSS_CHEST_OUTSTANDING', dmg: 235000 },
        { id: 'T7_WORLDBOSS_CHEST_GOOD', dmg: 220000 },
        { id: 'T7_WORLDBOSS_CHEST_NORMAL', dmg: 205000 },
        { id: 'T6_WORLDBOSS_CHEST_MASTERPIECE', dmg: 192000 },
        { id: 'T6_WORLDBOSS_CHEST_EXCELLENT', dmg: 178000 },
        { id: 'T6_WORLDBOSS_CHEST_OUTSTANDING', dmg: 165000 },
        { id: 'T6_WORLDBOSS_CHEST_GOOD', dmg: 155000 },
        { id: 'T6_WORLDBOSS_CHEST_NORMAL', dmg: 145000 },
        { id: 'T5_WORLDBOSS_CHEST_MASTERPIECE', dmg: 134000 },
        { id: 'T5_WORLDBOSS_CHEST_EXCELLENT', dmg: 125000 },
        { id: 'T5_WORLDBOSS_CHEST_OUTSTANDING', dmg: 117000 },
        { id: 'T5_WORLDBOSS_CHEST_GOOD', dmg: 108000 },
        { id: 'T5_WORLDBOSS_CHEST_NORMAL', dmg: 100000 },
        { id: 'T4_WORLDBOSS_CHEST_MASTERPIECE', dmg: 93000 },
        { id: 'T4_WORLDBOSS_CHEST_EXCELLENT', dmg: 86000 },
        { id: 'T4_WORLDBOSS_CHEST_OUTSTANDING', dmg: 80000 },
        { id: 'T4_WORLDBOSS_CHEST_GOOD', dmg: 73000 },
        { id: 'T4_WORLDBOSS_CHEST_NORMAL', dmg: 68000 },
        { id: 'T3_WORLDBOSS_CHEST_MASTERPIECE', dmg: 63000 },
        { id: 'T3_WORLDBOSS_CHEST_EXCELLENT', dmg: 58000 },
        { id: 'T3_WORLDBOSS_CHEST_OUTSTANDING', dmg: 52000 },
        { id: 'T3_WORLDBOSS_CHEST_GOOD', dmg: 47000 },
        { id: 'T3_WORLDBOSS_CHEST_NORMAL', dmg: 42000 },
        { id: 'T2_WORLDBOSS_CHEST_MASTERPIECE', dmg: 38000 },
        { id: 'T2_WORLDBOSS_CHEST_EXCELLENT', dmg: 33000 },
        { id: 'T2_WORLDBOSS_CHEST_OUTSTANDING', dmg: 29000 },
        { id: 'T2_WORLDBOSS_CHEST_GOOD', dmg: 25000 },
        { id: 'T2_WORLDBOSS_CHEST_NORMAL', dmg: 22000 },
        { id: 'T1_WORLDBOSS_CHEST_MASTERPIECE', dmg: 18000 },
        { id: 'T1_WORLDBOSS_CHEST_EXCELLENT', dmg: 14000 },
        { id: 'T1_WORLDBOSS_CHEST_OUTSTANDING', dmg: 11000 },
        { id: 'T1_WORLDBOSS_CHEST_GOOD', dmg: 8000 },
        { id: 'T1_WORLDBOSS_CHEST_NORMAL', dmg: 1 }
    ];

    const calculatePotentialChest = (damage) => {
        if (damage <= 0) return { label: 'T1 WB Chest (Normal)', id: 'T1_WORLDBOSS_CHEST_NORMAL' };
        const milestone = DAMAGE_MILESTONES.find(m => damage >= m.dmg) || DAMAGE_MILESTONES[DAMAGE_MILESTONES.length - 1];
        const chestId = milestone.id;
        const parts = chestId.split('_');
        const tier = parts[0];
        const rarity = parts[parts.length - 1];
        const rarityFormatted = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();
        return {
            label: `${tier} WB Chest (${rarityFormatted})`,
            id: chestId
        };
    };

    const [activeTab, setActiveTab] = useState('BOSS'); // 'BOSS' | 'RANKING' or 'HISTORY'
    const [viewingHistory, setViewingHistory] = useState(false);
    const [historyRankings, setHistoryRankings] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historySessionId, setHistorySessionId] = useState(null);

    const { boss, myRank, rankings = [], ironmanRankings = [], normalRankings = [], totalChallengers = 0, history = [] } = data || {};
    const isDead = boss?.status === 'DEFEATED';
    
    let list = (rankingType === 'IRONMAN' ? ironmanRankings : (rankingType === 'NORMAL' ? normalRankings : rankings)) || [];
    
    if (viewingHistory) {
        list = Array.isArray(historyRankings) ? historyRankings : [];
        if (rankingType === 'NORMAL') list = list.filter(r => !r.isIronman);
        else if (rankingType === 'IRONMAN') list = list.filter(r => r.isIronman);
    }

    const fetchHistory = (dateStr, sessionId = null) => {
        setViewingHistory(true);
        setLoadingHistory(true);
        setHistorySessionId(sessionId);
        
        socket.emit('get_world_boss_ranking_history', { date: dateStr, sessionId });
        const handleHistory = (response) => {
            // Verify if this response is for the session we requested
            if (sessionId && response.sessionId !== sessionId) return;
            if (!sessionId && dateStr && response.date !== dateStr) return;

            setHistoryRankings(response.rankings || []);
            setLoadingHistory(false);
            socket.off('world_boss_ranking_history', handleHistory);
        };
        socket.on('world_boss_ranking_history', handleHistory);
    };

    const isResting = type === 'window' && (!boss?.isAlive || boss?.status === 'DEFEATED');

    return (
        <div style={{
            flex: 1, minHeight: isMobile ? '400px' : '500px', display: 'flex', flexDirection: 'column',
            background: 'var(--slot-bg)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden'
        }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${type === 'daily' ? '/backgrounds/dragon_boss_bg.png' : '/backgrounds/new_boss_bg.png'})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: type === 'daily' ? 0.6 : 0.4, pointerEvents: 'none', zIndex: 0 }} />
                            <div style={{ position: 'relative', flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: type === 'daily' ? 'rgba(0,0,0,0.5)' : 'transparent' }}>
                                <button onClick={() => setShowInfo(type)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', color: type === 'daily' ? 'rgba(255,77,77,0.7)' : 'rgba(77,148,255,0.7)', cursor: 'pointer' }}><Info size={16} /></button>
                                
                                {isResting ? (
                                    <>
                                        <div style={{ fontSize: '1rem', color: 'var(--text-dim)', letterSpacing: '2px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>NEW BOSS</div>
                                        <div style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>ARRIVING SOON</div>
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginBottom: '24px' }}>A new challenger approaches...</div>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
                                            <CountdownTimer targetDate={boss?.nextSpawnAt} label="Spawns in" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h1 style={{ margin: '0 0 2px 0', color: type === 'daily' ? '#ff4d4d' : '#4d94ff', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>{boss?.name || 'RESTING'}</h1>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '4px', fontWeight: '700', marginBottom: '16px', textTransform: 'uppercase' }}>{type === 'daily' ? 'THE LEGENDARY DRAGON' : `TIER ${boss?.tier} WORLD BOSS`}</div>
                                        
                                        {type === 'window' && boss?.isAlive && boss?.status === 'ACTIVE' && (
                                            <div style={{ width: '100%', maxWidth: '240px', marginBottom: '16px' }}>
                                                <HPBar current={boss.currentHP} max={boss.maxHP} color="#4d94ff" />
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
                                            <CountdownTimer targetDate={boss?.endsAt} label={type === 'daily' ? "Ends in" : "Leaves in"} />
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 20px', background: 'var(--accent-soft)', borderRadius: '20px', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                                                <Users size={16} />
                                                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>{totalChallengers}</span>
                                            </div>
                                        </div>

                                        {boss?.isAlive && (boss?.status === 'ACTIVE' || type === 'daily') && !myRank ? (
                                            <motion.button onClick={() => onChallenge(type)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ padding: '12px 36px', background: type === 'daily' ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'linear-gradient(135deg, #2563eb, #1e40af)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', fontSize: '0.85rem', textTransform: 'uppercase', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>Challenge</motion.button>
                                        ) : (
                                            <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: myRank ? '#22c55e' : 'var(--text-dim)', fontWeight: '700', fontSize: '0.8rem' }}>
                                                {myRank ? `RANKED #${myRank.pos}` : 'RESTING'}
                                            </div>
                                        )}
                                        
                                        <div style={{ marginTop: '20px' }}>
                                            <button onClick={() => { setActiveTab('RANKING'); if(type === 'daily') setViewingHistory(false); else { setViewingHistory(false); setHistorySessionId(null); } }} style={{ padding: '10px 28px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '800' }}>
                                                {type === 'daily' ? <Trophy size={16} color="#d4af37" /> : <Timer size={16} color="#d4af37" />}
                                                <span style={{ color: '#d4af37' }}>{type === 'daily' ? 'VIEW RANKINGS' : 'VIEW HISTORY & RANKINGS'}</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                    <AnimatePresence>
                    {activeTab === 'RANKING' && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : '20px' }} onClick={() => setActiveTab('BOSS')}>
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} style={{ background: 'var(--panel-bg)', borderRadius: isMobile ? 0 : '16px', border: isMobile ? 'none' : '1px solid var(--border)', width: '100%', maxWidth: '600px', height: isMobile ? '100%' : '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', color: type === 'daily' ? '#ff4d4d' : '#4d94ff', fontSize: '1.1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                        {type === 'daily' ? <Trophy size={20} /> : <Timer size={20} />} {type === 'daily' ? 'BOSS RANKING' : 'BOSS HISTORY & RANKING'}
                                    </div>
                                    <button onClick={() => setActiveTab('BOSS')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                                    {type === 'window' && !viewingHistory ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Recent Bosses</div>
                                            {history.map((session, idx) => (
                                                <motion.div 
                                                    key={session.id} 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => fetchHistory(null, session.id)}
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                    whileHover={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--accent-dim)' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ padding: '8px', background: session.status === 'DEFEATED' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', color: session.status === 'DEFEATED' ? '#22c55e' : 'var(--text-dim)' }}>
                                                            {session.status === 'DEFEATED' ? <Sword size={16} /> : <Timer size={16} />}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>{session.name} {session.id === boss?.sessionId && <span style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>(CURRENT)</span>}</div>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                                                                Tier {session.tier} • {session.status} • {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: '700' }}>VIEW RANKING</div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                                                {type === 'window' && viewingHistory && (
                                                    <button onClick={() => { setViewingHistory(false); setHistorySessionId(null); }} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        ← Back
                                                    </button>
                                                )}
                                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', flex: 1 }}>
                                                    {['NORMAL', 'IRONMAN'].map(mode => (
                                                        <button key={mode} onClick={() => setRankingType(mode)} style={{ flex: 1, padding: '6px', background: rankingType === mode ? 'var(--accent)' : 'transparent', border: 'none', borderRadius: '6px', color: rankingType === mode ? 'white' : 'var(--text-dim)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '700' }}>{mode}</button>
                                                    ))}
                                                </div>
                                                {type === 'daily' && (
                                                    <button onClick={viewingHistory ? () => setViewingHistory(false) : () => fetchHistory(new Date(Date.now() - 86400000).toISOString().split('T')[0])} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '700' }}>
                                                        {viewingHistory ? 'Today' : 'Yesterday'}
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {loadingHistory ? (
                                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>Loading ranking...</div>
                                                ) : list.length === 0 ? (
                                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>No challengers.</div>
                                                ) : (
                                                    list.map((rank, index) => {
                                                        const isMe = rank.character_id === gameState?.character?.id;
                                                        const isTop3 = index < 3;
                                                        return (
                                                            <motion.div
                                                                key={rank.character_id}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: index * 0.03 }}
                                                                className={`ranking-row ${isMe ? 'me' : ''} ${isTop3 ? 'top-3' : ''}`}
                                                                style={{ marginBottom: '6px' }}
                                                            >
                                                                <div className="ranking-position">
                                                                    <MedalIcon index={index} size={isMobile ? 22 : 26} />
                                                                </div>
                                                                <div style={{ flex: 1, marginLeft: isMobile ? '12px' : '16px', minWidth: 0, paddingBottom: '2px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span
                                                                            onClick={onInspect ? () => onInspect(rank.name) : undefined}
                                                                            className={`ranking-name ${isMe ? 'me' : ''}`}
                                                                            style={{ cursor: onInspect ? 'pointer' : 'default' }}
                                                                        >
                                                                            {rank.guild_tag && <span style={{ color: 'var(--accent)', opacity: 0.8, fontSize: '0.8rem', marginRight: '4px' }}>[{rank.guild_tag}]</span>}
                                                                            {rank.isIronman && <span title="Ironman" style={{ fontSize: '0.8rem' }}>🛡️</span>}
                                                                            {rank.name}
                                                                        </span>
                                                                        {isMe && <span style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>— yours</span>}
                                                                    </div>
                                                                    <div
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const isWindow = type === 'window';
                                                                            const chest = isWindow ? { label: 'Enhancement Chest', id: 'ENHANCEMENT_CHEST' } : calculatePotentialChest(rank.damage);
                                                                            if (onShowItem) onShowItem(resolveItem(chest.id));
                                                                        }}
                                                                        className="chest-label"
                                                                        style={{ fontSize: '0.65rem', color: type === 'window' ? '#d4af37' : '#ae00ff', cursor: 'pointer', marginTop: '2px', opacity: 0.9, letterSpacing: '0.5px' }}
                                                                    >
                                                                        {type === 'window' ? 'Enhancement Chest' : calculatePotentialChest(rank.damage).label}
                                                                    </div>
                                                                </div>
                                                                <div className="ranking-damage-container">
                                                                    <div className="ranking-damage-value">
                                                                        {formatNumber(rank.damage)}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const RewardsTab = ({ rewards, socket, onShowItem }) => {
    if (!rewards || rewards.length === 0) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-dim)', textAlign: 'center' }}>
                <Gift size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>No pending rewards.</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Fight World Bosses to earn more!</div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rewards.map((reward, index) => (
                <motion.div 
                    key={reward.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(212,175,55,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Gift color="#d4af37" size={20} />
                        </div>
                        <div>
                            <div 
                                onClick={() => onShowItem && onShowItem(resolveItem(reward.chestId))}
                                style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)', cursor: 'pointer', textDecoration: 'underline decoration-transparent hover:decoration-current' }}
                            >
                                {reward.chest}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>From: <span style={{ color: 'var(--accent)' }}>{reward.bossName}</span></div>
                            {reward.damage > 0 && <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', opacity: 0.7 }}>Damage: {formatNumber(reward.damage)}</div>}
                        </div>
                    </div>
                    <button 
                        onClick={() => socket.emit('claim_world_boss_reward', { attemptId: reward.id })}
                        style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '0.75rem', textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}
                    >
                        Claim
                    </button>
                </motion.div>
            ))}
        </div>
    );
};

const WorldBossPanel = ({ gameState, isMobile, socket, onChallenge, onInspect, onShowInfo }) => {
    const store = useAppStore();
    const { wbStatus, isLoadingWb: loading } = store;
    const [rankingType, setRankingType] = useState(gameState?.character?.state?.isIronman ? 'IRONMAN' : 'NORMAL');
    const [showInfo, setShowInfo] = useState(false);
    const [mainTab, setMainTab] = useState('BOSS'); // 'BOSS' | 'REWARDS'

    useEffect(() => {
        if (!socket) return;
        socket.emit('get_world_boss_status');
        const interval = setInterval(() => socket.emit('get_world_boss_status'), 5000);
        return () => clearInterval(interval);
    }, [socket]);

    if (loading || !wbStatus) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>Loading World Boss...</motion.div>
            </div>
        );
    }

    const { daily, window: windowBoss, pendingRewards = [] } = wbStatus;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--panel-bg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                <button onClick={() => setMainTab('BOSS')} style={{ flex: 1, padding: '14px', background: mainTab === 'BOSS' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', borderBottom: `2.5px solid ${mainTab === 'BOSS' ? 'var(--accent)' : 'transparent'}`, color: mainTab === 'BOSS' ? 'var(--text-main)' : 'var(--text-dim)', cursor: 'pointer', fontWeight: '900', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s ease' }}>
                    <Sword size={16} style={{ marginRight: '8px', verticalAlign: 'middle', marginTop: '-2px' }} /> World Boss
                </button>
                <button onClick={() => setMainTab('REWARDS')} style={{ flex: 1, padding: '14px', background: mainTab === 'REWARDS' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', borderBottom: `2.5px solid ${mainTab === 'REWARDS' ? '#d4af37' : 'transparent'}`, color: mainTab === 'REWARDS' ? '#d4af37' : 'var(--text-dim)', cursor: 'pointer', fontWeight: '900', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s ease', position: 'relative' }}>
                    <Gift size={16} style={{ marginRight: '8px', verticalAlign: 'middle', marginTop: '-2px' }} /> Rewards
                    {pendingRewards.length > 0 && (
                        <span style={{ position: 'absolute', top: '10px', right: '15%', background: '#ff4d4d', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', fontWeight: '900', boxShadow: '0 0 5px rgba(255,0,0,0.5)' }}>{pendingRewards.length}</span>
                    )}
                </button>
            </div>

            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                    {mainTab === 'BOSS' ? (
                        <motion.div key="wb-main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
                            <BossCard 
                                type="window" 
                                data={windowBoss} 
                                onChallenge={onChallenge} 
                                isMobile={isMobile} 
                                setShowInfo={() => setShowInfo('window')} 
                                rankingType={rankingType} 
                                setRankingType={setRankingType} 
                                gameState={gameState} 
                                socket={socket}
                                onInspect={onInspect}
                                onShowItem={onShowInfo}
                            />
                            <BossCard 
                                type="daily" 
                                data={daily} 
                                onChallenge={onChallenge} 
                                isMobile={isMobile} 
                                setShowInfo={() => setShowInfo('daily')} 
                                rankingType={rankingType} 
                                setRankingType={setRankingType} 
                                gameState={gameState} 
                                socket={socket}
                                onInspect={onInspect}
                                onShowItem={onShowInfo}
                            />
                        </motion.div>
                    ) : (
                        <motion.div key="wb-rewards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <RewardsTab 
                                rewards={pendingRewards}
                                socket={socket}
                                onShowItem={onShowInfo}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {showInfo && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInfo(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #1e0505 0%, #0f0202 100%)', border: `1px solid ${showInfo === 'daily' ? 'rgba(220, 38, 38, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`, borderRadius: '20px', padding: '24px 20px', maxWidth: '380px', width: '100%', position: 'relative' }}>
                        {showInfo === 'daily' ? (
                            <>
                                <h2 style={{ color: '#ff4d4d', textAlign: 'center', margin: '0 0 16px 0', fontSize: '1rem', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Celestial Ravager Guide</h2>
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: '1.4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--accent-soft)', padding: '10px', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>🗺️</span>
                                        <div><strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>EVENT SCHEDULE</strong>The boss awakens at <span style={{ color: '#ff4d4d' }}>00:00 UTC</span> and leaves at <span style={{ color: '#ff4d4d' }}>23:50 UTC</span> daily.</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--accent-soft)', padding: '10px', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>⚔️</span>
                                        <div><strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>CHALLENGE RULES</strong>You have <span style={{ color: '#ff4d4d' }}>1 minute</span> to deal damage and consolidate your daily ranking.</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--accent-soft)', padding: '10px', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>🏆</span>
                                        <div><strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>DAMAGE MILESTONES</strong>Prizes based on total damage dealt. Deal more damage to unlock better <span style={{ color: '#d4af37' }}>World Boss Chests</span>.</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--accent-soft)', padding: '10px', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>💎</span>
                                        <div><strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>CRAFTING SHARDS</strong>Chests drop <span style={{ color: '#a855f7' }}>Special Shards</span> for crafting powerful Combat Runes.</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 style={{ color: '#4d94ff', textAlign: 'center', margin: '0 0 16px 0', fontSize: '1rem', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Cycled Boss Guide</h2>
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: '1.4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--accent-soft)', padding: '10px', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '1.2rem', lineHeight: '1', flexShrink: 0 }}>🕒</span>
                                        <div><strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>SPAWN CYCLE</strong>A new boss shows up every <span style={{ color: '#4d94ff' }}>8 hours</span> (00:00, 08:00, 16:00 UTC) and sticks around for <span style={{ color: '#4d94ff' }}>7h 50m</span>.</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--accent-soft)', padding: '10px', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '1.2rem', lineHeight: '1', flexShrink: 0 }}>⚔️</span>
                                        <div><strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>COMBAT</strong>You get <span style={{ color: '#4d94ff' }}>1 minute</span> to deal damage. This boss has <span style={{ color: '#ff4d4d' }}>real HP</span> that everyone chips away at together. You can only fight <span style={{ color: '#4d94ff' }}>once</span> per session.</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--accent-soft)', padding: '10px', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '1.2rem', lineHeight: '1', flexShrink: 0 }}>🎁</span>
                                        <div><strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>REWARDS</strong>Kill the boss and everyone who fought gets an <span style={{ color: '#d4af37' }}>Enhancement Chest</span>. If it <span style={{ color: '#ff4d4d' }}>escapes</span>, nobody gets anything.</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--accent-soft)', padding: '10px', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '1.2rem', lineHeight: '1', flexShrink: 0 }}>⭐</span>
                                        <div><strong style={{ color: 'var(--text-main)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>TIER SCALING</strong>Goes from T1 to T10. Higher tier = way more HP, so you'll need more people to take it down.</div>
                                    </div>
                                </div>
                            </>
                        )}
                        <button onClick={() => setShowInfo(false)} style={{ marginTop: '16px', width: '100%', padding: '10px', background: 'var(--accent-soft)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '1px' }}>UNDERSTOOD</button>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default WorldBossPanel;
