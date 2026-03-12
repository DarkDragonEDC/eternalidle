import React, { useState, useEffect, useCallback } from 'react';
import { formatNumber } from '@utils/format';
import {
    Trophy, Sword, Skull, X, Pickaxe, Trees, Activity,
    Zap, Ghost, GraduationCap, ChevronDown, Filter,
    Anchor, Flame, Hammer, FlaskConical, Target, Shield,
    User, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
    { id: 'COMBAT', name: 'Combat', icon: Activity, color: '#f87171' },
    { id: 'DUNGEONEERING', name: 'Dungeoneering', icon: Skull, color: '#a855f7' },
    { id: 'LEVEL', name: 'Total Level', icon: GraduationCap, color: '#fbbf24' },
    { id: 'TOTAL_XP', name: 'Total XP', icon: Zap, color: '#60a5fa' },
    { id: 'LUMBERJACK', name: 'Woodcutting', icon: Trees, color: '#4ade80' },
    { id: 'ORE_MINER', name: 'Mining', icon: Pickaxe, color: '#a0a0a0' },
    { id: 'ANIMAL_SKINNER', name: 'Skinning', icon: Ghost, color: '#fca5a5' },
    { id: 'FIBER_HARVESTER', name: 'Harvesting', icon: Ghost, color: '#86efac' },
    { id: 'FISHING', name: 'Fishing', icon: Anchor, color: '#60a5fa' },
    { id: 'COOKING', name: 'Cooking', icon: Hammer, color: '#fbbf24' },
    { id: 'ALCHEMY', name: 'Alchemy', icon: FlaskConical, color: '#d8b4fe' },
    { id: 'WARRIOR_CRAFTER', name: 'Smithing', icon: Hammer, color: '#f0f0f0' },
    { id: 'MAGE_CRAFTER', name: 'Arcane Craft', icon: Flame, color: '#d8b4fe' },
    { id: 'HUNTER_CRAFTER', name: 'Leatherwork', icon: Target, color: '#c9a84c' },
];

import { useAppStore } from '../store/useAppStore';

const LeaderboardModal = ({ isOpen, onClose, socket, isMobile, onInspect, isPublic = false }) => {
    const store = useAppStore();
    const {
        leaderboardRankings: data, setLeaderboardRankings: setData,
        isLoadingLeaderboard: loading, setIsLoadingLeaderboard: setLoading
    } = store;

    const [activeTab, setActiveTab] = useState('COMBAT');
    const [mode, setMode] = useState('NORMAL'); // NORMAL | IRONMAN
    const [showSelector, setShowSelector] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        if (isPublic) {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const res = await fetch(`${apiUrl}/api/leaderboard?type=${activeTab}&mode=${mode}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json.data || []);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Public Leaderboard Error:", err);
                setLoading(false);
            }
        } else if (socket) {
            socket.emit('get_leaderboard', { type: activeTab, mode });
        }
    }, [activeTab, mode, isPublic, socket, setData, setLoading]);

    useEffect(() => {
        if (!isOpen) return;
        fetchData();
    }, [isOpen, fetchData]);

    // Socket listeners are now centralized in useSocketEvents.js

    if (!isOpen) return null;

    const activeCategory = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0];

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
                zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: isMobile ? '0' : '20px'
            }} onClick={onClose}>
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'var(--panel-bg)',
                        border: isMobile ? 'none' : '1px solid var(--border-active)',
                        borderRadius: isMobile ? '0' : '20px',
                        width: '100%', maxWidth: '600px',
                        height: isMobile ? '100%' : '85vh',
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden', boxShadow: 'var(--panel-shadow)',
                        position: 'relative'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '20px', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Trophy color="var(--accent)" size={24} />
                            <div>
                                <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Ranking Geral
                                </h2>
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                                    {isPublic ? 'VISUALIZAÇÃO PÚBLICA' : 'SISTEMA DE LIGA'}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: '#fff',
                            width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Controls */}
                    <div style={{ padding: '15px 20px', display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                        {/* Tab Selector */}
                        <div style={{ position: 'relative', flex: 1 }}>
                            <button
                                onClick={() => setShowSelector(!showSelector)}
                                style={{
                                    width: '100%', padding: '10px 15px', background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '12px', border: '1px solid var(--border)', color: '#f0f0f0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    fontSize: '0.85rem', fontWeight: 'bold'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <activeCategory.icon size={18} color={activeCategory.color} />
                                    {activeCategory.name}
                                </div>
                                <ChevronDown size={16} />
                            </button>

                            {showSelector && (
                                <div style={{
                                    position: 'absolute', top: '110%', left: 0, right: 0,
                                    background: '#1a1d23', borderRadius: '12px', border: '1px solid var(--border-active)',
                                    zIndex: 50, maxHeight: '300px', overflowY: 'auto', padding: '8px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                }}>
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => { setActiveTab(cat.id); setShowSelector(false); }}
                                            style={{
                                                width: '100%', padding: '10px', borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                color: activeTab === cat.id ? 'var(--accent)' : '#fff',
                                                background: activeTab === cat.id ? 'var(--accent-soft)' : 'transparent',
                                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                                fontSize: '0.8rem', fontWeight: activeTab === cat.id ? '800' : '500'
                                            }}
                                        >
                                            <cat.icon size={16} color={cat.color} />
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Mode Toggle */}
                        <button
                            onClick={() => setMode(mode === 'NORMAL' ? 'IRONMAN' : 'NORMAL')}
                            style={{
                                padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)',
                                background: mode === 'IRONMAN' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)',
                                color: mode === 'IRONMAN' ? '#a855f7' : '#f0f0f0',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                fontSize: '0.8rem', fontWeight: 'bold', transition: '0.2s'
                            }}
                        >
                            {mode === 'IRONMAN' ? <Shield size={16} /> : <User size={16} />}
                            {mode}
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px' }}>
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                    <Activity size={32} color="var(--accent)" />
                                </motion.div>
                                <div style={{ marginTop: '15px', color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: '700' }}>
                                    Carregando Ranking...
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {data.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
                                        <Filter size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
                                        <div>Nenhum registro encontrado nesta categoria.</div>
                                    </div>
                                ) : (
                                    data.map((char, index) => {
                                        const isTop3 = index < 3;
                                        // Specific score formatting
                                        let score = 0;
                                        if (activeTab === 'LEVEL') {
                                            score = Object.values(char.state?.skills || {}).reduce((acc, s) => acc + (s.level || 1), 0);
                                        } else if (activeTab === 'TOTAL_XP') {
                                            // Approximation since we don't have cumulative total on client easily without shared constant
                                            score = Object.values(char.state?.skills || {}).reduce((acc, s) => acc + (s.xp || 0), 0);
                                        } else {
                                            score = char.state?.skills?.[activeTab]?.level || 1;
                                        }

                                        return (
                                            <motion.div
                                                key={char.id}
                                                initial={{ x: -10, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: index * 0.03 }}
                                                onClick={() => onInspect && onInspect(char.name)}
                                                style={{
                                                    background: isTop3 ? 'var(--accent-soft)' : 'rgba(255,255,255,0.02)',
                                                    borderRadius: '12px', padding: '15px',
                                                    display: 'flex', alignItems: 'center',
                                                    border: isTop3 ? `1px solid var(--accent)` : '1px solid var(--border)',
                                                    cursor: 'pointer', transition: '0.2s'
                                                }}
                                                whileHover={{ x: 5, background: 'rgba(255,255,255,0.05)' }}
                                            >
                                                <div style={{
                                                    width: '35px', fontWeight: '900',
                                                    color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'rgba(255,255,255,0.2)',
                                                    fontSize: isTop3 ? '1.4rem' : '1rem'
                                                }}>
                                                    {index + 1}
                                                </div>
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {char.state?.isIronman ? <Shield size={16} color="#a855f7" /> : <User size={16} color="var(--accent)" />}
                                                        </div>
                                                        {char.state?.membership && (
                                                            <div style={{ position: 'absolute', bottom: -4, right: -4, width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24', border: '2px solid #1a1d23' }} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '800', color: isTop3 ? '#fff' : 'var(--text-main)', fontSize: '0.9rem' }}>{char.name}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                            {char.state?.isIronman ? 'IRONMAN' : 'NORMAL'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent)', fontFamily: 'monospace' }}>
                                                        {formatNumber(score)}
                                                    </div>
                                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
                                                        {activeTab === 'TOTAL_XP' ? 'XP' : 'LEVEL'}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer hint */}
                    <div style={{ padding: '15px', textAlign: 'center', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: '600', letterSpacing: '1px' }}>
                        ATUALIZAÇÃO EM TEMPO REAL • ETERNAL IDLE
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LeaderboardModal;
