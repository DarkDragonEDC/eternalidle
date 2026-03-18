import React, { useState, useEffect, useCallback } from 'react';
import { formatNumber } from '@utils/format';
import {
    Trophy, Sword, Skull, X, Pickaxe, Trees, Activity,
    Zap, Ghost, GraduationCap, ChevronDown, Filter,
    Anchor, Flame, Hammer, FlaskConical, Target, Shield,
    User, UserCheck, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
    { 
        id: 'GENERAL', name: 'Geral', icon: Trophy, color: '#fbbf24',
        subTabs: [
            { id: 'LEVEL', name: 'Total Level', icon: GraduationCap },
            { id: 'TOTAL_XP', name: 'Total XP', icon: Zap }
        ]
    },
    {
        id: 'PROFICIENCY', name: 'Proficiência', icon: Shield, color: '#d8b4fe',
        subTabs: [
            { id: 'WARRIOR_PROFICIENCY', name: 'Warrior', icon: Sword },
            { id: 'HUNTER_PROFICIENCY', name: 'Hunter', icon: Target },
            { id: 'MAGE_PROFICIENCY', name: 'Mage', icon: Zap }
        ]
    },
    { id: 'EQUIPMENT', name: 'Equipamento', icon: Shield, color: '#60a5fa', subTabs: [{ id: 'ITEM_POWER', name: 'Item Power', icon: Zap }] },
    { id: 'COMBAT', name: 'Combate', icon: Activity, color: '#f87171', subTabs: [{ id: 'COMBAT', name: 'Combat Lvl', icon: Activity }] },
    { id: 'DUNGEONEERING', name: 'Dungeon', icon: Skull, color: '#a855f7', subTabs: [{ id: 'DUNGEONEERING', name: 'Dungeon Lvl', icon: Skull }] },
    {
        id: 'GATHERING', name: 'Coleta', icon: Trees, color: '#4ade80',
        subTabs: [
            { id: 'LUMBERJACK', name: 'Woodcutting', icon: Trees },
            { id: 'ORE_MINER', name: 'Mining', icon: Pickaxe },
            { id: 'ANIMAL_SKINNER', name: 'Skinning', icon: Ghost },
            { id: 'FIBER_HARVESTER', name: 'Harvesting', icon: Ghost },
            { id: 'FISHING', name: 'Fishing', icon: Anchor }
        ]
    },
    {
        id: 'REFINING', name: 'Refino', icon: Flame, color: '#fbbf24',
        subTabs: [
            { id: 'PLANK_REFINER', name: 'Plank', icon: Hammer },
            { id: 'METAL_BAR_REFINER', name: 'Metal', icon: Hammer },
            { id: 'LEATHER_REFINER', name: 'Leather', icon: Hammer },
            { id: 'CLOTH_REFINER', name: 'Cloth', icon: Hammer }
        ]
    },
    {
        id: 'CRAFTING', name: 'Crafting', icon: Hammer, color: '#f0f0f0',
        subTabs: [
            { id: 'WARRIOR_CRAFTER', name: 'Blacksmith', icon: Hammer },
            { id: 'MAGE_CRAFTER', name: 'Arcane', icon: Flame },
            { id: 'HUNTER_CRAFTER', name: 'Leatherwork', icon: Target },
            { id: 'TOOL_CRAFTER', name: 'Tools', icon: Hammer },
            { id: 'ALCHEMY', name: 'Alchemy', icon: FlaskConical },
            { id: 'COOKING', name: 'Cooking', icon: Flame }
        ]
    }
];

import { useAppStore } from '../store/useAppStore';

const LeaderboardModal = ({ isOpen, onClose, socket, isMobile, onInspect, isPublic = false }) => {
    const store = useAppStore();
    const {
        leaderboardRankings: data, setLeaderboardRankings: setData,
        isLoadingLeaderboard: loading, setIsLoadingLeaderboard: setLoading
    } = store;

    const [activeTab, setActiveTab] = useState('GENERAL');
    const [activeSubTab, setActiveSubTab] = useState('LEVEL');
    const [mode, setMode] = useState('NORMAL'); // NORMAL | IRONMAN
    const [showSelector, setShowSelector] = useState(false);

    const fetchData = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        if (isPublic) {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const res = await fetch(`${apiUrl}/api/leaderboard?type=${activeSubTab}&mode=${mode}${forceRefresh ? '&forceRefresh=true' : ''}`);
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
            socket.emit('get_leaderboard', { type: activeSubTab, mode, forceRefresh });
        }
    }, [activeSubTab, mode, isPublic, socket, setData, setLoading]);

    const handleRefresh = () => {
        if (loading) return;
        fetchData(true);
    };

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
                                            onClick={() => { 
                                                setActiveTab(cat.id); 
                                                setActiveSubTab(cat.subTabs[0].id);
                                                setShowSelector(false); 
                                            }}
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

                        {/* Admin Refresh Button */}
                        {store.gameState?.isAdmin && (
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                style={{
                                    padding: '10px', borderRadius: '12px', border: '1px solid var(--border)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'var(--accent)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: '0.2s', cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                                title="Force Refresh (Admin)"
                            >
                                <motion.div animate={loading ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                    <RefreshCw size={18} />
                                </motion.div>
                            </button>
                        )}
                    </div>

                    {/* SubTabs row if more than 1 subtab */}
                    {activeCategory.subTabs?.length > 1 && (
                        <div style={{ padding: '0 20px 15px 20px', display: 'flex', gap: '8px', overflowX: 'auto', background: 'rgba(0,0,0,0.2)' }}>
                            {activeCategory.subTabs.map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => setActiveSubTab(sub.id)}
                                    style={{
                                        padding: '6px 12px', borderRadius: '8px', whiteSpace: 'nowrap',
                                        background: activeSubTab === sub.id ? 'var(--accent-soft)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${activeSubTab === sub.id ? 'var(--accent)' : 'var(--border)'}`,
                                        color: activeSubTab === sub.id ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                                        fontSize: '0.7rem', fontWeight: '800', transition: '0.2s',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <sub.icon size={12} />
                                    {sub.name}
                                </button>
                            ))}
                        </div>
                    )}

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
                                    Array.isArray(data) && data.map((char, index) => {
                                        const isTop3 = index < 3;
                                        // Specific score formatting
                                        let score = 0;
                                        if (activeSubTab === 'LEVEL') {
                                            score = Object.values(char.state?.skills || {}).reduce((acc, s) => acc + (s.level || 1), 0);
                                        } else if (activeSubTab === 'TOTAL_XP') {
                                            // Approximation since we don't have cumulative total on client easily without shared constant
                                            // But wait, the server now sends ranking_total_xp! Let's use it.
                                            score = char.ranking_total_xp || 0;
                                        } else if (activeSubTab === 'ITEM_POWER') {
                                            score = char.ranking_total_level || 0; // Temp use level as proxy if IP not sent, but server should send it
                                            if ('ranking_item_power' in char) score = char.ranking_item_power;
                                        } else {
                                            score = char.state?.skills?.[activeSubTab]?.level || 1;
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
                                                        {activeSubTab === 'TOTAL_XP' ? 'XP' : activeSubTab === 'ITEM_POWER' ? 'IP' : 'LEVEL'}
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
