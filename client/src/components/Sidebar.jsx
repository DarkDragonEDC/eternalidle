import React, { useState, useEffect } from 'react';
import {
    Package, User, Pickaxe, Hammer, Sword,
    ChevronDown, ChevronRight, Coins, Castle,
    Trophy, Tag, Zap, Box, Axe, Shield, Users, MessageSquare, Sun, Moon, Gift, Skull, Lock,
    Check, Sparkles, Trees, PawPrint, Leaf, FlaskConical, Flame, Layers, Droplets, Target, CookingPot, Fish
} from 'lucide-react';
import DailySpinModal from './DailySpinModal';
import { calculateNextLevelXP } from '@shared/skills';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ gameState, activeTab, setActiveTab, onNavigate, activeCategory, setActiveCategory, isMobile, isOpen, onClose, onSwitchCharacter, socket, canSpin, onOpenDailySpin, hasActiveTrade, isAnonymous, onShowGuestModal, onTutorialComplete }) => {
    const [expanded, setExpanded] = useState({
        gathering: true,
        refining: false,
        crafting: false,
        merging: false,
        combat: false
    });
    const [activePlayers, setActivePlayers] = useState(0);

    // Removed internal Daily Spin logic (lifted to App.jsx)

    useEffect(() => {
        if (!isAnonymous && socket?.connected) {
            socket.emit('request_daily_status');
        }
    }, [isAnonymous, socket]);

    useEffect(() => {
        const fetchActivePlayers = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const res = await fetch(`${apiUrl}/api/active_players`);
                if (res.ok) {
                    const data = await res.json();
                    setActivePlayers(data.count || 0);
                }
            } catch (err) {
                console.warn('Could not fetch active players count in sidebar');
            }
        };

        fetchActivePlayers();
        const interval = setInterval(fetchActivePlayers, 15000);
        return () => clearInterval(interval);
    }, []);

    const toggleExpand = (id) => {
        setExpanded(prev => ({
            ...prev,
            gathering: false,
            refining: false,
            crafting: false,
            merging: false,
            combat: false,
            [id]: !prev[id]
        }));
    };

    const skills = gameState?.state?.skills || {};

    // Skill Level/Progress Component
    const SkillInfo = ({ skillKey }) => {
        if (skillKey === 'RUNE') return null;
        const skill = skills[skillKey] || { level: 1, xp: 0 };
        const level = skill.level || 1;
        const xp = skill.xp || 0;
        const nextLevelXp = calculateNextLevelXP(level);
        const progress = level >= 100 ? 100 : Math.min(100, (xp / nextLevelXp) * 100);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', minWidth: '50px' }}>
                <div style={{
                    fontSize: '0.65rem',
                    fontWeight: '900',
                    color: 'var(--text-main)',
                    display: 'flex',
                    gap: '2px',
                    alignItems: 'baseline',
                    textShadow: '0 0 10px var(--accent-soft)'
                }}>
                    <span style={{ fontSize: '0.45rem', opacity: 0.5, color: 'var(--accent)' }}>LV</span>
                    <span style={{ color: 'var(--accent)' }}>{level}</span>
                </div>
                <div style={{
                    width: '45px',
                    height: '3px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div
                        style={{
                            width: `${progress}%`,
                            transition: 'width 0.2s linear',
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-soft) 100%)',
                            boxShadow: '0 0 8px var(--accent-soft)'
                        }}
                    />
                </div>
            </div>
        );
    };

    const menuItems = [
        { id: 'profile', label: 'Profile', icon: <User size={18} /> },
        { id: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
        {
            id: 'gathering',
            label: 'Gathering',
            icon: <Pickaxe size={18} />,
            children: [
                { id: 'WOOD', label: 'Lumberjack', skill: 'LUMBERJACK', icon: <Trees size={14} /> },
                { id: 'ORE', label: 'Mining', skill: 'ORE_MINER', icon: <Pickaxe size={14} /> },
                { id: 'HIDE', label: 'Skinning', skill: 'ANIMAL_SKINNER', icon: <PawPrint size={14} /> },
                { id: 'FIBER', label: 'Harvesting', skill: 'FIBER_HARVESTER', icon: <Leaf size={14} /> },
                { id: 'FISH', label: 'Fishing', skill: 'FISHING', icon: <Fish size={14} /> },
                { id: 'HERB', label: 'Herbalism', skill: 'HERBALISM', icon: <FlaskConical size={14} /> },
            ]
        },
        {
            id: 'refining',
            label: 'Refining',
            icon: <Box size={18} />,
            children: [
                { id: 'PLANK', label: 'Lumber Mill', skill: 'PLANK_REFINER', icon: <Trees size={14} /> },
                { id: 'BAR', label: 'Smelting', skill: 'METAL_BAR_REFINER', icon: <Flame size={14} /> },
                { id: 'LEATHER', label: 'Tannery', skill: 'LEATHER_REFINER', icon: <Box size={14} /> },
                { id: 'CLOTH', label: 'Loom', skill: 'CLOTH_REFINER', icon: <Layers size={14} /> },
                { id: 'EXTRACT', label: 'Distillation', skill: 'DISTILLATION', icon: <Droplets size={14} /> },
            ]
        },
        {
            id: 'crafting',
            label: 'Crafting',
            icon: <Hammer size={18} />,
            children: [
                { id: 'WARRIORS_FORGE', label: "Warrior's Forge", skill: 'WARRIOR_CRAFTER', icon: <Shield size={14} /> },
                { id: 'HUNTERS_LODGE', label: "Hunter's Lodge", skill: 'HUNTER_CRAFTER', icon: <Target size={14} /> },
                { id: 'MAGES_TOWER', label: "Mage's Tower", skill: 'MAGE_CRAFTER', icon: <Zap size={14} /> },
                { id: 'TOOLMAKER', label: 'Toolmaker', skill: 'TOOL_CRAFTER', icon: <Hammer size={14} /> },
                { id: 'COOKING_STATION', label: 'Kitchen', skill: 'COOKING', icon: <CookingPot size={14} /> },
                { id: 'ALCHEMY_LAB', label: 'Alchemy Lab', skill: 'ALCHEMY', icon: <FlaskConical size={14} /> },
            ]
        },
        {
            id: 'merging',
            label: 'Merging',
            icon: <Zap size={18} />,
            children: [
                { id: 'RUNE', label: 'Rune', skill: 'RUNE', icon: <Sparkles size={14} /> },
            ]
        },
        { id: 'combat', label: 'Combat', icon: <Sword size={18} />, skill: 'COMBAT' },
        { id: 'dungeon', label: 'Dungeons', icon: <Castle size={18} />, skill: 'DUNGEONEERING' },
        { id: 'world_boss', label: 'World Boss', icon: <Skull size={18} /> },
        { id: 'ranking', label: 'Ranking', icon: <Trophy size={18} /> },
        { id: 'taxometer', label: 'Taxometer', icon: <Coins size={18} /> },
    ];

    return (
        <motion.div
            initial={isMobile ? { x: -300 } : { opacity: 0 }}
            animate={isMobile ? { x: isOpen ? 0 : -300 } : { opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{
                width: isMobile ? '75vw' : '330px',
                height: isMobile ? '100%' : '100vh',
                background: 'var(--panel-bg)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                position: isMobile ? 'fixed' : 'sticky',
                left: 0,
                top: 0,
                zIndex: (isMobile && isOpen) ? 10001 : 100,
                boxShadow: 'var(--panel-shadow)',
                backdropFilter: 'blur(20px)',
                flexShrink: 0,
                overflow: 'hidden'
            }}
        >
            {isMobile && (
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        color: 'var(--text-dim)',
                        background: 'transparent',
                        border: 'none',
                        zIndex: 1001
                    }}
                >
                    <ChevronRight size={20} />
                </button>
            )}

            {/* Active Players at Sidebar Top */}
            <div style={{ padding: '24px 16px 0 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <motion.div
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '10px 14px',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        color: 'var(--accent)',
                        flex: 1,
                        whiteSpace: 'nowrap',
                        boxShadow: 'inset 0 0 15px rgba(0,0,0,0.2)'
                    }}
                >
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            background: '#44ff44',
                            borderRadius: '50%',
                            boxShadow: '0 0 12px #44ff44'
                        }}></span>
                        <motion.span
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            style={{
                                position: 'absolute',
                                width: '12px',
                                height: '12px',
                                background: '#44ff44',
                                borderRadius: '50%',
                                zIndex: -1
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 }}>{activePlayers}</span>
                        <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: 'var(--text-dim)', letterSpacing: '1px', marginTop: '2px' }}>PLAYERS ONLINE</span>
                    </div>
                </motion.div>

                {/* Discord Button */}
                <motion.a
                    whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                    whileTap={{ scale: 0.9 }}
                    href="https://discord.gg/uVGYW2gJtB"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '44px',
                        height: '44px',
                        background: '#5865F2',
                        borderRadius: '16px',
                        color: 'white',
                        transition: '0.2s',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        boxShadow: '0 4px 15px rgba(88, 101, 242, 0.3)'
                    }}
                    title="Join our Discord"
                >
                    <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="currentColor">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.4,80.21a105.73,105.73,0,0,0,32.17,16.15,77.7,77.7,0,0,0,6.89-11.11,68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c3.39-28.32-5.42-52.09-23.75-72.13ZM42.45,65.69C36.18,65.69,31,60,31,53s5.07-12.72,11.41-12.72S54,46,53.86,53,48.81,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.72,11.44-12.72S96.11,46,96,53,91,65.69,84.69,65.69Z" />
                    </svg>
                </motion.a>
            </div>

            <div style={{ padding: '20px 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                        { id: 'profile', label: 'PROFILE', icon: <User size={18} /> },
                        { id: 'inventory', label: 'BAG', icon: <Package size={18} /> },
                        { id: 'market', label: 'MARKET', icon: <Tag size={18} />, restricted: isAnonymous }
                    ].map(item => (
                        <motion.button
                            key={item.id}
                            id={`tab-${item.id}`}
                            whileHover={item.restricted ? {} : { scale: 1.05, y: -2 }}
                            whileTap={item.restricted ? {} : { scale: 0.95 }}
                            onClick={() => {
                                if (item.restricted) {
                                    onShowGuestModal();
                                    return;
                                }
                                if (item.id === 'profile' && gameState?.state?.tutorialStep === 'EQUIP_RUNE_PROFILE') {
                                    onTutorialComplete?.('PROFILE_RUNE_TAB');
                                }
                                setActiveTab(item.id);
                                if (isMobile) onClose();
                            }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '12px 0',
                                borderRadius: '16px',
                                border: '1px solid',
                                borderColor: activeTab === item.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                background: activeTab === item.id ? 'var(--accent-soft)' : 'rgba(255,255,255,0.03)',
                                color: activeTab === item.id ? 'var(--accent)' : 'var(--text-dim)',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                cursor: item.restricted ? 'not-allowed' : 'pointer',
                                opacity: item.restricted ? 0.4 : 1,
                                position: 'relative',
                                boxShadow: activeTab === item.id ? '0 0 20px var(--accent-soft)' : 'none'
                            }}
                        >
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                {item.icon}
                                {item.restricted && (
                                    <div style={{ position: 'absolute', top: -6, right: -6 }}>
                                        <Lock size={12} color="#f87171" style={{ filter: 'drop-shadow(0 0 5px rgba(248, 113, 113, 0.5))' }} />
                                    </div>
                                )}
                                {item.id === 'market' && !item.restricted && gameState?.state?.claims?.length > 0 && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        style={{
                                            position: 'absolute',
                                            top: '-6px',
                                            right: '-6px',
                                            width: '8px',
                                            height: '8px',
                                            background: '#ff4444',
                                            borderRadius: '50%',
                                            border: '2px solid rgba(15,20,30,1)',
                                            boxShadow: '0 0 8px rgba(255, 68, 68, 0.8)'
                                        }}
                                    ></motion.div>
                                )}
                            </div>
                            <span style={{ fontSize: '0.6rem', fontWeight: '900', letterSpacing: '1px', opacity: activeTab === item.id ? 1 : 0.6 }}>{item.label}</span>
                        </motion.button>
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                        { id: 'trade', label: 'SOCIAL', icon: <Users size={18} />, restricted: isAnonymous, isTrade: true },
                        { id: 'rest_camp', label: 'CAMP', icon: <Flame size={18} />, color: '#ff9329' },
                        { id: 'guild', label: 'GUILD', icon: <Shield size={18} />, color: '#4ade80' }
                    ].map(item => (
                        <motion.button
                            key={item.id}
                            id={`tab-${item.id}`}
                            whileHover={item.restricted ? {} : { scale: 1.05, y: -2 }}
                            whileTap={item.restricted ? {} : { scale: 0.95 }}
                            onClick={() => {
                                if (item.restricted) {
                                    onShowGuestModal();
                                    return;
                                }
                                if (item.isTrade && onNavigate) {
                                    onNavigate('trade');
                                } else {
                                    setActiveTab(item.id);
                                }
                                if (isMobile) onClose();
                            }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '12px 0',
                                borderRadius: '16px',
                                border: '1px solid',
                                borderColor: activeTab === item.id ? (item.color || 'var(--accent)') : 'rgba(255,255,255,0.05)',
                                background: activeTab === item.id ? (item.color ? `${item.color}15` : 'var(--accent-soft)') : 'rgba(255,255,255,0.03)',
                                color: activeTab === item.id ? (item.color || 'var(--accent)') : 'var(--text-dim)',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                cursor: item.restricted ? 'not-allowed' : 'pointer',
                                opacity: item.restricted ? 0.4 : 1,
                                position: 'relative',
                                boxShadow: activeTab === item.id ? `0 0 20px ${item.color || 'var(--accent-soft)'}` : 'none'
                            }}
                        >
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                {item.icon}
                                {item.restricted && (
                                    <div style={{ position: 'absolute', top: -6, right: -6 }}>
                                        <Lock size={12} color="#f87171" style={{ filter: 'drop-shadow(0 0 5px rgba(248, 113, 113, 0.5))' }} />
                                    </div>
                                )}
                                {item.id === 'trade' && hasActiveTrade && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        style={{
                                            position: 'absolute',
                                            top: '-6px',
                                            right: '-6px',
                                            width: '8px',
                                            height: '8px',
                                            background: '#ff4444',
                                            borderRadius: '50%',
                                            border: '2px solid rgba(15,20,30,1)',
                                            boxShadow: '0 0 8px rgba(255, 68, 68, 0.8)'
                                        }}
                                    ></motion.div>
                                )}
                            </div>
                            <span style={{ fontSize: '0.6rem', fontWeight: '900', letterSpacing: '1px', opacity: activeTab === item.id ? 1 : 0.6 }}>{item.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {!gameState?.state?.isIronman && (isAnonymous || canSpin) && (
                <div style={{ padding: '0 16px 12px 16px' }}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            if (isAnonymous) {
                                onShowGuestModal();
                                return;
                            }
                            if (canSpin) {
                                onOpenDailySpin();
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            background: isAnonymous
                                ? 'linear-gradient(135deg, #444 0%, #222 100%)'
                                : 'linear-gradient(135deg, var(--accent) 0%, #b8860b 100%)',
                            borderRadius: '16px',
                            border: isAnonymous ? '1px solid #666' : '1px solid #ffd700',
                            color: isAnonymous ? '#fff' : '#000',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: isAnonymous ? 'none' : '0 10px 30px rgba(212, 175, 55, 0.4)',
                            fontSize: '0.85rem',
                            position: 'relative',
                            opacity: isAnonymous ? 0.6 : 1,
                            letterSpacing: '1px',
                            textTransform: 'uppercase'
                        }}
                    >
                        {canSpin && (
                            <motion.div
                                animate={{ opacity: [0, 1, 0], scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '16px'
                                }}
                            />
                        )}
                        {isAnonymous ? <Lock size={20} /> : <Gift size={20} />}
                        <span>{isAnonymous ? 'SAVE TO SPIN' : 'CLAIM REWARD'}</span>
                    </motion.button>
                </div>
            )}

            <div className="scroll-container" style={{ padding: '0 16px', flex: 1 }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '2px', padding: '20px 0 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px', opacity: 0.6 }}>ACTIVITIES</div>

                {menuItems.slice(2).map(item => {
                    const isMainItemActive = activeTab === item.id;
                    const isGroupHeader = !!item.children;
                    const showAdventureHeader = item.id === 'combat';
                    const isExpanded = expanded[item.id];

                    return (
                        <React.Fragment key={item.id}>
                            {showAdventureHeader && (
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '2px', padding: '30px 0 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px', opacity: 0.6 }}>WORLD</div>
                            )}

                            <div style={{ marginBottom: '6px' }}>
                                <motion.button
                                    id={`sidebar-item-${item.id}`}
                                    whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.03)' }}
                                    onClick={() => {
                                        if (isGroupHeader) {
                                            toggleExpand(item.id);
                                            if (item.id === 'merging' && gameState?.state?.tutorialStep === 'MERGE_RUNES_1') {
                                                onTutorialComplete?.('OPEN_RUNE_FORGE');
                                            }
                                        } else {
                                            setActiveTab(item.id);
                                            if (isMobile) onClose();
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        background: isMainItemActive ? 'linear-gradient(90deg, var(--accent-soft), transparent)' : 'transparent',
                                        borderRadius: '12px',
                                        color: isMainItemActive ? 'var(--text-main)' : 'var(--text-dim)',
                                        textAlign: 'left',
                                        border: '1px solid',
                                        borderColor: isMainItemActive ? 'var(--accent)' : 'transparent',
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {isMainItemActive && (
                                        <motion.div
                                            layoutId="active-glow"
                                            style={{
                                                position: 'absolute',
                                                left: 0, top: 0, bottom: 0,
                                                width: '4px',
                                                background: 'var(--accent)',
                                                boxShadow: '0 0 15px var(--accent)'
                                            }}
                                        />
                                    )}
                                    <span style={{ color: isMainItemActive ? 'var(--accent)' : 'var(--text-dim)', transition: '0.2s', display: 'flex' }}>
                                        {React.cloneElement(item.icon, { size: 18, strokeWidth: isMainItemActive ? 2.5 : 2 })}
                                    </span>
                                    <span style={{ flex: 1, fontWeight: isMainItemActive ? '800' : '500', fontSize: '0.9rem', letterSpacing: '0.4px', textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>{item.label}</span>

                                    {item.skill && !item.children && <SkillInfo skillKey={item.skill} />}
                                    {isGroupHeader && (
                                        <motion.span
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            style={{ opacity: 0.3, display: 'flex' }}
                                        >
                                            <ChevronDown size={16} />
                                        </motion.span>
                                    )}
                                </motion.button>

                                <AnimatePresence>
                                    {isGroupHeader && isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden', paddingLeft: '32px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.05)', marginLeft: '22px' }}
                                        >
                                            {item.children.map(child => {
                                                const isChildActive = activeTab === item.id && activeCategory === child.id;
                                                return (
                                                    <motion.button
                                                        key={child.id}
                                                        id={`sidebar-child-${child.id}`}
                                                        whileHover={{ x: 4, color: 'var(--text-main)' }}
                                                        onClick={() => {
                                                            setActiveTab(item.id);
                                                            setActiveCategory(child.id);
                                                            if (isMobile) onClose();
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            background: isChildActive ? 'var(--accent-soft)' : 'transparent',
                                                            borderRadius: '8px',
                                                            color: isChildActive ? 'var(--accent)' : 'var(--text-dim)',
                                                            fontSize: '0.85rem',
                                                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            textAlign: 'left'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {child.icon && <span style={{ opacity: isChildActive ? 1 : 0.6, color: isChildActive ? 'var(--accent)' : 'inherit' }}>{child.icon}</span>}
                                                            <span style={{ fontWeight: isChildActive ? '800' : '400', letterSpacing: '0.3px' }}>{child.label}</span>
                                                        </div>
                                                        {child.skill && <SkillInfo skillKey={child.skill} />}
                                                    </motion.button>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            <div style={{ padding: '20px 16px' }}>
                {gameState?.state?.membership?.active && gameState?.state?.membership?.expiresAt > Date.now() && (
                    <motion.div
                        whileHover={{ y: -2 }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%)',
                            borderRadius: '16px',
                            padding: '16px',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px'
                        }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#4ade80', letterSpacing: '0.5px' }}>PREMIUM MEMBER</span>
                            <Sparkles size={16} color="#4ade80" />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', opacity: 0.8 }}>
                            Valid until: {new Date(gameState.state.membership.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default Sidebar;
