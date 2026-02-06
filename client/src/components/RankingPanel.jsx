import React, { useState, useEffect } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Star, Coins, Circle, ChevronDown } from 'lucide-react';

const CATEGORIES = {
    GENERAL: {
        label: 'GENERAL',
        options: [
            { key: 'LEVEL', label: 'Total Level' },
            { key: 'SILVER', label: 'Total Silver' }
        ]
    },
    COMBAT: {
        label: 'COMBAT',
        options: [
            { key: 'COMBAT', label: 'Combat Level' }
        ]
    },
    DUNGEON: {
        label: 'DUNGEON',
        options: [
            { key: 'DUNGEONEERING', label: 'Dungeoneering Level' }
        ]
    },
    GATHERING: {
        label: 'GATHERING',
        options: [
            { key: 'LUMBERJACK', label: 'Lumberjack' },
            { key: 'ORE_MINER', label: 'Mining' },
            { key: 'ANIMAL_SKINNER', label: 'Skinning' },
            { key: 'FIBER_HARVESTER', label: 'Harvesting' },
            { key: 'FISHING', label: 'Fishing' },
            { key: 'HERBALISM', label: 'Herbalism' }
        ]
    },
    REFINING: {
        label: 'REFINING',
        options: [
            { key: 'PLANK_REFINER', label: 'Plank Refining' },
            { key: 'METAL_BAR_REFINER', label: 'Smelting' },
            { key: 'LEATHER_REFINER', label: 'Leather Refining' },
            { key: 'CLOTH_REFINER', label: 'Cloth Refining' },
            { key: 'DISTILLATION', label: 'Distillation' }
        ]
    },
    CRAFTING: {
        label: 'CRAFTING',
        options: [
            { key: 'WARRIOR_CRAFTER', label: 'Warrior' },
            { key: 'HUNTER_CRAFTER', label: 'Hunter' },
            { key: 'MAGE_CRAFTER', label: 'Mage' },
            { key: 'TOOL_CRAFTER', label: 'Toolmaker' },
            { key: 'COOKING', label: 'Cooking' },
            { key: 'ALCHEMY', label: 'Alchemy' }
        ]
    }
};

const RankingPanel = ({ gameState, isMobile, socket }) => {
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mainCategory, setMainCategory] = useState('GENERAL');
    const [subCategory, setSubCategory] = useState('LEVEL');

    useEffect(() => {
        if (!socket) return;

        // Use subCategory as the primary sort key (e.g., 'FISHING', 'COMBAT', 'SILVER')
        // mainCategory is just for UI grouping now
        const type = subCategory;

        setLoading(true);
        socket.emit('get_leaderboard', type);

        const handleLeaderboard = (response) => {
            const data = Array.isArray(response) ? response : (response.data || []);
            setCharacters(data);
            setLoading(false);
        };

        socket.on('leaderboard_update', handleLeaderboard);
        return () => socket.off('leaderboard_update', handleLeaderboard);
    }, [socket, mainCategory, subCategory]);

    const handleMainCategoryChange = (key) => {
        setMainCategory(key);
        setSubCategory(CATEGORIES[key].options[0].key);
    };

    const getSortedData = () => {
        if (!characters.length) return [];

        return [...characters].map(char => {
            const state = char.state || {};
            let value = 0;
            let subValue = 0;
            let label = 'LEVEL';

            if (subCategory === 'SILVER') {
                value = state.silver || 0;
                label = 'SILVER';
            } else if (subCategory === 'LEVEL') {
                const skills = state.skills || {};
                value = Object.values(skills).reduce((acc, s) => acc + (s.level || 1), 0);
                subValue = Object.values(skills).reduce((acc, s) => acc + (s.xp || 0), 0);
                label = 'TOTAL LEVEL';
            } else {
                // Generic Skill Handler
                const skill = (state.skills || {})[subCategory] || { level: 1, xp: 0 };
                value = skill.level;
                subValue = skill.xp;
                label = subCategory.replace(/_/g, ' ') + ' LEVEL';
            }

            return { ...char, value, subValue, label };
        }).sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return b.subValue - a.subValue;
        }).slice(0, 50);
    };

    const sortedData = getSortedData();

    return (
        <div className="glass-panel" style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            background: 'var(--panel-bg)',
            minHeight: 0,
            overflow: 'hidden'
        }}>
            <div style={{ padding: isMobile ? '20px' : '30px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '2px' }}>HALL OF FAME</h2>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>The best of Eternal Lands</div>
                    </div>
                    <div style={{ padding: '10px 20px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Trophy size={18} color="var(--accent)" />
                        <span style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '0.8rem' }}>RANKINGS</span>
                    </div>
                </div>

                {/* Filtros */}
                {/* Filtros */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                    {/* Horizontal Scrollable Tabs */}
                    <div className="ranking-tabs-scroll" style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        paddingBottom: '8px',
                        WebkitOverflowScrolling: 'touch'
                    }}>
                        <style>{`
                            .ranking-tabs-scroll::-webkit-scrollbar {
                                height: 6px;
                            }
                            .ranking-tabs-scroll::-webkit-scrollbar-track {
                                background: rgba(0,0,0,0.2);
                                border-radius: 3px;
                            }
                            .ranking-tabs-scroll::-webkit-scrollbar-thumb {
                                background: var(--accent);
                                border-radius: 3px;
                            }
                            .ranking-tabs-scroll::-webkit-scrollbar-thumb:hover {
                                background: #fff;
                            }
                        `}</style>
                        {Object.keys(CATEGORIES).map(key => (
                            <button
                                key={key}
                                onClick={() => handleMainCategoryChange(key)}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: mainCategory === key ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                                    background: mainCategory === key ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0,0,0,0.2)',
                                    color: mainCategory === key ? 'var(--accent)' : 'var(--text-dim)',
                                    fontSize: '0.75rem',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: '0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    flexShrink: 0 // Prevent shrinking
                                }}
                            >
                                {key === 'COMBAT' && <Star size={14} />}
                                {key === 'DUNGEON' && <Circle size={14} />}
                                {CATEGORIES[key].label}
                            </button>
                        ))}
                    </div>

                    <div style={{ position: 'relative', width: 'fit-content' }}>
                        <select
                            value={subCategory}
                            onChange={(e) => setSubCategory(e.target.value)}
                            style={{
                                appearance: 'none',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                padding: '8px 30px 8px 15px',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {CATEGORIES[mainCategory].options.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} color="#555" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                </div>

                {/* Lista */}
                <div className="scroll-container" style={{ flex: 1, paddingRight: '10px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.3 }}>
                            <div className="loading-spinner" />
                            <p style={{ marginTop: '20px', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' }}>SEARCHING FOR LEGENDS...</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sortedData.map((char, index) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    key={char.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '15px 20px',
                                        background: index === 0 ? 'linear-gradient(90deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.02) 100%)' : 'rgba(255,255,255,0.01)',
                                        borderRadius: '10px',
                                        border: '1px solid',
                                        borderColor: index === 0 ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.02)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Medalha / Numero */}
                                    <div style={{ width: '40px', fontSize: '1.2rem', fontWeight: '900', color: index === 0 ? '#d4af37' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#222' }}>
                                        {index === 0 ? <Circle size={20} /> : index + 1}
                                    </div>

                                    {/* Player Info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '0.9rem',
                                            fontWeight: '900',
                                            color: char.state?.membership?.active && char.state?.membership?.expiresAt > Date.now()
                                                ? 'var(--accent)'
                                                : (index < 3 ? 'var(--text-main)' : 'var(--text-dim)')
                                        }}>
                                            {char.name}
                                        </div>
                                        {char.state?.selectedTitle && (
                                            <div style={{
                                                fontSize: '0.65rem',
                                                fontWeight: '900',
                                                letterSpacing: '1.5px',
                                                marginTop: '2px',
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                background: char.state.selectedTitle === 'Eternal Legend'
                                                    ? 'linear-gradient(90deg, #ffd700, #ff8c00)'
                                                    : char.state.selectedTitle === 'Dungeon Master'
                                                        ? 'linear-gradient(90deg, #a855f7, #6366f1)'
                                                        : char.state.selectedTitle === 'Resource Tycoon'
                                                            ? 'linear-gradient(90deg, #22c55e, #10b981)'
                                                            : 'linear-gradient(90deg, #60a5fa, #3b82f6)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                textShadow: char.state.selectedTitle === 'Eternal Legend'
                                                    ? '0 0 10px rgba(255, 215, 0, 0.5)'
                                                    : '0 0 8px rgba(255, 255, 255, 0.2)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                backgroundColor: 'rgba(0,0,0,0.3)'
                                            }}>
                                                {char.state.selectedTitle}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px', opacity: 0.5 }}>
                                            {char.label}
                                        </div>
                                    </div>

                                    {/* Valor */}
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: index === 0 ? 'var(--accent)' : 'var(--text-main)' }}>
                                            {subCategory === 'SILVER' ? formatSilver(char.value) : formatNumber(char.value)}
                                        </div>
                                        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>
                                            {char.label}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RankingPanel;
