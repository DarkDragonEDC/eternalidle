import React, { useState, useEffect } from 'react';
import { resolveItem } from '@shared/items';
import { XP_TABLE } from '../../../shared/skills.js';
import { GUILD_XP_TABLE } from '../../../shared/guilds.js';
import { formatNumber, formatSilver } from '@utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { COUNTRIES } from '../../../shared/countries';
import { Trophy, Users, Star, Coins, Circle, ChevronDown, Sword, Shield, Swords, Sparkles, Settings } from 'lucide-react';

const CountryFlag = ({ code, name, size = '1.2rem', style = {} }) => {
    if (!code) return <span style={{ fontSize: size, ...style }}>🌐</span>;
    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            alt={name || code}
            title={name || code}
            style={{
                height: isNaN(size) ? size : `${size}px`,
                width: 'auto',
                borderRadius: '2px',
                display: 'inline-block',
                verticalAlign: 'middle',
                ...style
            }}
        />
    );
};

const CATEGORIES = {
    GENERAL: {
        label: 'GENERAL',
        options: [
            { key: 'LEVEL', label: 'Total Level' },
            { key: 'TOTAL_XP', label: 'Total XP' }
        ]
    },
    PROFICIENCIES: {
        label: 'PROFICIENCIES',
        options: [
            { key: 'WARRIOR_PROFICIENCY', label: 'Warrior' },
            { key: 'HUNTER_PROFICIENCY', label: 'Hunter' },
            { key: 'MAGE_PROFICIENCY', label: 'Mage' }
        ]
    },
    EQUIPMENT: {
        label: 'EQUIPMENT',
        options: [
            { key: 'ITEM_POWER', label: 'Item Power' }
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

const GUILD_ICONS = {
    Shield: Shield,
    Sword: Sword,
    Sword2: Swords,
    Trophy: Trophy,
    Sparkles: Sparkles,
    Users: Users,
    Settings: Settings,
    Coins: Coins
};

const RankingPanel = ({ gameState, isMobile, socket, onInspect }) => {
    const [characters, setCharacters] = useState([]);
    const [userRankData, setUserRankData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mainCategory, setMainCategory] = useState('GENERAL');
    const [subCategory, setSubCategory] = useState('LEVEL');
    const [rankMode, setRankMode] = useState(gameState?.state?.isIronman ? 'IRONMAN' : 'NORMAL');

    useEffect(() => {
        if (!socket || !gameState) return;

        // Use subCategory as the primary sort key (e.g., 'FISHING', 'COMBAT', 'SILVER')
        // mainCategory is just for UI grouping now
        const type = rankMode === 'GUILDS' ? 'GUILDS' : subCategory;
        const mode = rankMode === 'GUILDS' ? 'NORMAL' : rankMode;

        setLoading(true);
        // Pass object with type and mode
        socket.emit('get_leaderboard', { type, mode });

        const handleLeaderboard = (response) => {
            const data = response.top100 || [];
            setCharacters(data);
            setUserRankData(response.userRank || null);
            setLoading(false);
        };

        socket.on('leaderboard_update', handleLeaderboard);
        return () => socket.off('leaderboard_update', handleLeaderboard);
    }, [socket, mainCategory, subCategory, rankMode]);

    const handleMainCategoryChange = (key) => {
        setMainCategory(key);
        setSubCategory(CATEGORIES[key].options[0].key);
    };

    // Helper to get total accumulated XP
    const getTotalSkillXP = (skill) => {
        if (!skill) return 0;
        const level = skill.level || 1;
        const currentXP = skill.xp || 0;
        const xpFromPreviousLevels = XP_TABLE[level - 1] || 0;
        return xpFromPreviousLevels + currentXP;
    };

    const getSortedData = () => {
        if (!characters.length) return [];

        if (rankMode === 'GUILDS') {
            return [...characters].map(guild => ({
                ...guild,
                value: guild.level || 1,
                subValue: (GUILD_XP_TABLE[(guild.level || 1) - 1] || 0) + (guild.xp || 0),
                label: ''
            })).sort((a, b) => {
                if (b.value !== a.value) return b.value - a.value;
                return b.subValue - a.subValue;
            });
        }

        return [...characters].map(char => {
            const state = char.state || {};
            let value = 0;
            let subValue = 0;
            let label = 'LEVEL';

            if (subCategory === 'LEVEL') {
                const skills = state.skills || {};
                value = Object.values(skills).reduce((acc, s) => acc + (s.level || 1), 0);
                subValue = Object.values(skills).reduce((acc, s) => acc + getTotalSkillXP(s), 0);
                label = 'TOTAL LEVEL';
            } else if (subCategory === 'TOTAL_XP') {
                const skills = state.skills || {};
                // Value is Total Accumulated XP
                value = Object.values(skills).reduce((acc, s) => acc + getTotalSkillXP(s), 0);
                // SubValue is Total Level (tiebreaker)
                subValue = Object.values(skills).reduce((acc, s) => acc + (s.level || 1), 0);
                label = 'TOTAL XP';
            } else if (subCategory === 'ITEM_POWER') {
                const equipment = state.equipment || {};
                const hasWeapon = !!equipment.mainHand;
                const combatSlots = ['helmet', 'chest', 'boots', 'gloves', 'cape', 'mainHand', 'offHand'];
                let totalIP = 0;
                combatSlots.forEach(slot => {
                    const rawItem = equipment[slot];
                    if (rawItem) {
                        if (!hasWeapon && slot !== 'mainHand') return;
                        const resolved = resolveItem(rawItem.id || rawItem.item_id);
                        if (resolved) totalIP += resolved.ip || 0;
                    }
                });
                value = Math.floor(totalIP / 7);
                subValue = 0;
                label = 'ITEM POWER';
            } else {
                // Generic Skill Handler
                const skill = (state.skills || {})[subCategory] || { level: 1, xp: 0 };
                value = skill.level;
                subValue = getTotalSkillXP(skill);
                label = subCategory.replace(/_/g, ' ') + ' LEVEL';
            }

            return { ...char, value, subValue, label };
        }).sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return b.subValue - a.subValue;
        });
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '2px' }}>HALL OF FAME</h2>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>The best of Eternal Lands</div>
                    </div>
                    <div style={{
                        fontSize: '0.6rem',
                        color: 'var(--text-dim)',
                        fontWeight: 'bold',
                        textAlign: 'right',
                        opacity: 0.7
                    }}>
                        Updates every 30 min
                    </div>
                </div>

                {/* Mode Toggles */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    {['NORMAL', 'IRONMAN', 'GUILDS'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setRankMode(mode)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: rankMode === mode ? 'var(--accent)' : 'var(--border)',
                                background: rankMode === mode ? 'var(--accent)' : 'var(--glass-bg)',
                                color: rankMode === mode ? 'var(--panel-bg)' : 'var(--text-dim)',
                                fontSize: '0.8rem',
                                fontWeight: '900',
                                cursor: 'pointer',
                                transition: '0.2s',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                        >
                            {mode}
                        </button>
                    ))}
                </div>

                {/* Filtros */}
                {rankMode !== 'GUILDS' && (
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
                                background: var(--slot-bg);
                                border-radius: 3px;
                            }
                            .ranking-tabs-scroll::-webkit-scrollbar-thumb {
                                background: var(--accent);
                                border-radius: 3px;
                            }
                            .ranking-tabs-scroll::-webkit-scrollbar-thumb:hover {
                                background: var(--text-main);
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
                                    borderColor: mainCategory === key ? 'var(--accent)' : 'var(--border)',
                                    background: mainCategory === key ? 'var(--accent)' : 'var(--glass-bg)',
                                    color: mainCategory === key ? 'var(--panel-bg)' : 'var(--text-dim)',
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
                                {key === 'PROFICIENCIES' && <Sword size={14} />}
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
                                background: 'var(--slot-bg)',
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
                        <ChevronDown size={12} color="var(--text-dim)" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                </div>
                )}

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
                                        background: index === 0 ? 'linear-gradient(90deg, var(--accent-soft) 0%, transparent 100%)' : 'var(--glass-bg)',
                                        borderRadius: '10px',
                                        border: '1px solid',
                                        borderColor: index === 0 ? 'var(--accent)' : 'var(--border)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        cursor: rankMode === 'GUILDS' ? 'default' : 'pointer'
                                    }}
                                    onClick={() => {
                                        if (rankMode === 'GUILDS') return;
                                        if (onInspect) onInspect(char.name);
                                    }}
                                >
                                    {/* Medalha / Numero */}
                                    <div style={{ width: '40px', fontSize: '1.2rem', fontWeight: '900', color: index === 0 ? '#d4af37' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : 'var(--text-dim)' }}>
                                        {index === 0 ? <Circle size={20} /> : index + 1}
                                    </div>

                                    {/* Player Info */}
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {rankMode === 'GUILDS' && (
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '6px',
                                                background: char.bg_color || 'var(--slot-bg)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '1px solid var(--border)',
                                                flexShrink: 0,
                                                position: 'relative'
                                            }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '0',
                                                    left: '0',
                                                    transform: 'translate(-50%, -50%)',
                                                    background: 'rgba(0,0,0,0.8)',
                                                    padding: '1px 3px',
                                                    borderRadius: '4px',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    zIndex: 10,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backdropFilter: 'blur(2px)'
                                                }}>
                                                    <CountryFlag code={char.country_code} name={COUNTRIES.find(c => c.code === char.country_code)?.name} size="0.65rem" />
                                                </div>
                                                {(() => {
                                                    const IconComp = GUILD_ICONS[char.icon] || Shield;
                                                    return <IconComp size={16} color={char.icon_color || 'var(--accent)'} />;
                                                })()}
                                            </div>
                                        )}
                                        <div>
                                            <div style={{
                                                fontSize: '0.9rem',
                                                fontWeight: '900',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: (rankMode !== 'GUILDS' && char.state?.membership?.active && char.state?.membership?.expiresAt > Date.now())
                                                    ? 'var(--accent)'
                                                    : (index < 3 ? 'var(--text-main)' : 'var(--text-dim)')
                                            }}>
                                                {rankMode === 'GUILDS' && <span style={{ color: 'var(--accent)', opacity: 0.8 }}>[{char.tag}]</span>}
                                                {char.name}
                                                {rankMode === 'GUILDS' && (
                                                    <span style={{ 
                                                        fontSize: '0.65rem', 
                                                        color: 'var(--text-dim)', 
                                                        opacity: 0.6,
                                                        background: 'var(--slot-bg)',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                        border: '1px solid var(--border)',
                                                        marginLeft: '4px'
                                                    }}>
                                                        {char.memberCount || 0}/{char.maxMembers || 10}
                                                    </span>
                                                )}
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
                                                border: '1px solid var(--border)',
                                                backgroundColor: 'var(--slot-bg)'
                                            }}>
                                                {char.state.selectedTitle}
                                            </div>
                                        )}
                                        {char.label && (
                                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px', opacity: 0.5 }}>
                                                {char.label}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                    {/* Valor */}
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: index === 0 ? 'var(--accent)' : 'var(--text-main)', lineHeight: 1 }}>
                                            {formatNumber(char.value)}
                                        </div>
                                        {rankMode !== 'GUILDS' && subCategory !== 'ITEM_POWER' ? (
                                            <div style={{ fontSize: '0.65rem', color: index === 0 ? 'var(--accent)' : 'var(--text-dim)', fontWeight: 'bold', opacity: 0.8, marginTop: '2px' }}>
                                                {subCategory === 'TOTAL_XP' ? `LVL ${formatNumber(char.subValue)}` : `${formatNumber(char.subValue)} XP`}
                                            </div>
                                        ) : rankMode === 'GUILDS' && (
                                            <div style={{ fontSize: '0.65rem', color: index === 0 ? 'var(--accent)' : 'var(--text-dim)', fontWeight: 'bold', opacity: 0.8, marginTop: '2px' }}>
                                                {formatNumber(char.subValue)} XP
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '4px', opacity: 0.5, textTransform: 'uppercase' }}>
                                            {rankMode === 'GUILDS' ? '' : char.label}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* User Position if not in Top 100 */}
                            {!loading && userRankData && !sortedData.some(item => item.id === (rankMode === 'GUILDS' ? userRankData.guild?.id : userRankData.character?.id)) && (
                                <>
                                    <div style={{ padding: '10px 0', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        ...
                                    </div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '15px 20px',
                                            background: 'var(--accent-soft)',
                                            borderRadius: '10px',
                                            border: '1px solid var(--accent)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            marginTop: '8px',
                                            boxShadow: 'var(--panel-shadow)'
                                        }}
                                    >
                                        <div style={{ width: '40px', fontSize: '1.2rem', fontWeight: '900', color: 'var(--accent)' }}>
                                            {userRankData.rank}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--accent)' }}>
                                                {rankMode === 'GUILDS' ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ color: 'var(--accent)', opacity: 0.8 }}>[{userRankData.guild?.tag}]</span>
                                                        {userRankData.guild?.name} (YOUR)
                                                        <span style={{ 
                                                            fontSize: '0.65rem', 
                                                            color: 'var(--accent)', 
                                                            opacity: 0.7,
                                                            background: 'rgba(0,0,0,0.2)',
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                            border: '1px solid rgba(255,255,255,0.1)'
                                                        }}>
                                                            {userRankData.guild?.memberCount || 0}/{userRankData.guild?.maxMembers || 10}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>{userRankData.character?.name} (YOU)</>
                                                )}
                                            </div>
                                            {rankMode !== 'GUILDS' && userRankData.character?.state?.selectedTitle && (
                                                <div style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: '900',
                                                    letterSpacing: '1.5px',
                                                    marginTop: '2px',
                                                    display: 'inline-block',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    color: 'var(--text-main)'
                                                }}>
                                                    {userRankData.character?.state?.selectedTitle}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent)', lineHeight: 1 }}>
                                                {(() => {
                                                    if (rankMode === 'GUILDS') return formatNumber(userRankData.guild?.level || 1);
                                                    const char = userRankData.character;
                                                    if (!char || !char.state) return 0;
                                                    let val = 0;
                                                    if (subCategory === 'LEVEL') val = Object.values(char.state.skills || {}).reduce((acc, s) => acc + (s.level || 1), 0);
                                                    else if (subCategory === 'TOTAL_XP') {
                                                        const skills = char.state.skills || {};
                                                        val = Object.values(skills).reduce((acc, s) => acc + getTotalSkillXP(s), 0);
                                                    }
                                                    else if (subCategory === 'ITEM_POWER') {
                                                        const equipment = char.state.equipment || {};
                                                        const hasWeapon = !!equipment.mainHand;
                                                        const combatSlots = ['helmet', 'chest', 'boots', 'gloves', 'cape', 'mainHand', 'offHand'];
                                                        let totalIP = 0;
                                                        combatSlots.forEach(slot => {
                                                            const rawItem = equipment[slot];
                                                            if (rawItem) {
                                                                if (!hasWeapon && slot !== 'mainHand') return;
                                                                const resolved = resolveItem(rawItem.id || rawItem.item_id);
                                                                if (resolved) totalIP += resolved.ip || 0;
                                                            }
                                                        });
                                                        val = Math.floor(totalIP / 7);
                                                    }
                                                    else val = (char.state.skills?.[subCategory]?.level || 1);

                                                    return formatNumber(val);
                                                })()}
                                            </div>
                                            {(rankMode === 'GUILDS' || subCategory !== 'ITEM_POWER') && (
                                                <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 'bold', opacity: 0.8, marginTop: '2px' }}>
                                                    {(() => {
                                                        if (rankMode === 'GUILDS') return `${formatNumber(userRankData.guild?.xp || 0)} XP`;
                                                        const char = userRankData.character;
                                                        if (!char || !char.state) return "0 XP";
                                                        let subVal = 0;
                                                        if (subCategory === 'LEVEL') subVal = Object.values(char.state.skills || {}).reduce((acc, s) => acc + getTotalSkillXP(s), 0);
                                                        else if (subCategory === 'TOTAL_XP') subVal = Object.values(char.state.skills || {}).reduce((acc, s) => acc + (s.level || 1), 0);
                                                        else subVal = getTotalSkillXP(char.state.skills?.[subCategory] || { level: 1, xp: 0 });

                                                        return subCategory === 'TOTAL_XP' ? `LVL ${formatNumber(subVal)}` : `${formatNumber(subVal)} XP`;
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RankingPanel;
