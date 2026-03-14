import React, { useState, useEffect } from 'react';
import {
    Package, User, Pickaxe, Hammer, Sword,
    ChevronDown, ChevronRight, Coins, Castle,
    Trophy, Tag, Zap, Box, Axe, Shield, Users, MessageSquare, Sun, Moon, Gift, Skull, Lock,
    Check, Sparkles, Trees, PawPrint, Leaf, FlaskConical, Flame, Layers, Droplets, Target, CookingPot, Fish, LogOut
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import DailySpinModal from './DailySpinModal';
import { calculateNextLevelXP } from '@shared/skills';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';

const Sidebar = ({ gameState, activeTab, setActiveTab, onNavigate, activeCategory, setActiveCategory, isMobile, isOpen, onClose, onSwitchCharacter, onLogout, socket, canSpin, onOpenDailySpin, hasActiveTrade, isAnonymous, onShowGuestModal, onTutorialComplete, hasMarketNotification }) => {
    const [expanded, setExpanded] = useState({
        gathering: true,
        refining: false,
        crafting: false,
        merging: false,
        combat: false
    });
    const { activePlayers, characters, isCharactersLoading, fetchCharacters } = useAppStore();
    const loadingChars = isCharactersLoading && characters.length === 0;

    useEffect(() => {
        if (!isAnonymous) {
            fetchCharacters(supabase);
        }
    }, [isAnonymous, fetchCharacters]);

    useEffect(() => {
        if (!isAnonymous && socket?.connected) {
            socket.emit('request_daily_status');
        }
    }, [isAnonymous, socket]);


    const toggleExpand = (id) => {
        setExpanded(prev => ({
            ...prev,
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', minWidth: '45px' }}>
                <div style={{
                    fontSize: '0.6rem',
                    fontWeight: '900',
                    color: 'var(--text-main)',
                    display: 'flex',
                    gap: '2px',
                    alignItems: 'baseline',
                    textShadow: '0 0 10px var(--accent-soft)'
                }}>
                    <span style={{ fontSize: '0.4rem', opacity: 0.5, color: 'var(--accent)' }}>LV</span>
                    <span style={{ color: 'var(--accent)' }}>{level}</span>
                </div>
                <div style={{
                    width: '40px',
                    height: '2px',
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

    const sections = [
        {
            title: 'YOU',
            items: [
                { id: 'profile', label: 'Profile', icon: <User size={20} /> },
                { id: 'inventory', label: 'Inventory', icon: <Package size={20} /> },
                { id: 'market', label: 'Market', icon: <Tag size={20} />, restricted: isAnonymous },
                { id: 'ranking', label: 'Ranking', icon: <Trophy size={20} /> },
                { id: 'rest_camp', label: 'Camp', icon: <Flame size={20} /> },
                { id: 'guild', label: 'Guild', icon: <Shield size={20} /> },
            ]
        },
        {
            title: 'SKILLS',
            items: [
                {
                    id: 'gathering',
                    label: 'Gathering',
                    icon: <Pickaxe size={20} />,
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
                    icon: <Box size={20} />,
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
                    icon: <Hammer size={20} />,
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
                    icon: <Zap size={20} />,
                    children: [
                        { id: 'RUNE', label: 'Rune', skill: 'RUNE', icon: <Sparkles size={14} /> },
                    ]
                },
            ]
        },
        {
            title: 'COMBAT',
            items: [
                { id: 'combat', label: 'Combat', icon: <Sword size={20} /> },
                { id: 'dungeon', label: 'Dungeons', icon: <Castle size={20} /> },
                { id: 'world_boss', label: 'World Boss', icon: <Skull size={20} /> },
                { id: 'taxometer', label: 'Taxometer', icon: <Coins size={20} /> },
            ]
        }
    ];

    return (
        <motion.div
            initial={isMobile ? { x: -300 } : { opacity: 0 }}
            animate={isMobile ? { x: isOpen ? 0 : -300 } : { opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="dual-sidebar"
            style={{
                width: isMobile ? '75vw' : '300px',
                height: isMobile ? '100%' : '100vh',
                position: isMobile ? 'fixed' : 'sticky',
                left: 0,
                top: 0,
                zIndex: (isMobile && isOpen) ? 10001 : 100,
            }}
        >
            {/* Mobile Close Button */}
            {isMobile && (
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: 15, right: 15, color: 'var(--text-dim)', zIndex: 1001 }}
                >
                    <ChevronRight size={24} />
                </button>
            )}

            {/* Left Sidebar - Character Switching */}
            {!isMobile && (
                <div className="sidebar-left">
                    {loadingChars ? (
                        <div className="char-portrait loading" />
                    ) : (
                        characters.map(char => (
                            <motion.div
                                key={char.id}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className={`char-portrait ${gameState?.id === char.id ? 'active' : ''}`}
                                onClick={() => onSwitchCharacter(char.id)}
                                title={char.name}
                            >
                                {(() => {
                                    let avatarPath = char.avatar || char.state?.avatar;
                                    
                                    // Handle double-nested state if necessary
                                    if (!avatarPath && char.state?.state?.avatar) {
                                        avatarPath = char.state.state.avatar;
                                    }

                                    if (avatarPath) {
                                        const cleanPath = avatarPath.startsWith('/profile/') ? avatarPath : `/profile/${avatarPath}`;
                                        const webpPath = cleanPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
                                        return <img src={webpPath} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />;
                                    }
                                    return <User size={24} color="var(--text-dim)" />;
                                })()}
                                {char.state?.isIronman && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        bottom: -2, 
                                        right: -2, 
                                        background: 'var(--accent)', 
                                        border: '1px solid var(--bg-dark)', 
                                        borderRadius: '50%', 
                                        width: 12, 
                                        height: 12, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center' 
                                    }}>
                                        <Lock size={8} color="var(--bg-dark)" />
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                    
                    {/* Spacer/Center for Social Button */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.button
                            whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.1)' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                if (isAnonymous) onShowGuestModal();
                                else onNavigate('trade');
                            }}
                            className={`sidebar-left-action-btn ${activeTab === 'trade' ? 'active' : ''}`}
                            title="Social"
                            style={{ position: 'relative' }}
                        >
                            <Users size={22} />
                            {hasActiveTrade && (
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    width: '8px',
                                    height: '8px',
                                    background: '#ef4444',
                                    borderRadius: '50%',
                                    border: '1px solid var(--sidebar-bg)',
                                    boxShadow: '0 0 5px rgba(239, 68, 68, 0.5)'
                                }} />
                            )}
                        </motion.button>
                    </div>

                    {/* Bottom Logout */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', paddingBottom: '20px' }}>
                        <motion.button
                            whileHover={{ scale: 1.1, color: '#f87171' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onLogout}
                            className="sidebar-left-action-btn logout"
                            title="Logout"
                        >
                            <LogOut size={22} />
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Right Sidebar - Main Navigation */}
            <div className="sidebar-right scroll-container">
                <div style={{ padding: '8px 4px 12px 4px' }}>
                    {/* Players Online Badge */}
                    <div className="online-players-badge">
                        <div className="online-dot" />
                        <span>{activePlayers} players idling</span>
                    </div>


                    {/* Daily Spin / Claim Reward */}
                    {!gameState?.state?.isIronman && (isAnonymous || canSpin) && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => isAnonymous ? onShowGuestModal() : onOpenDailySpin()}
                            style={{
                                width: '100%',
                                padding: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: isAnonymous ? 'var(--slot-bg)' : 'linear-gradient(135deg, var(--sidebar-accent) 0%, var(--accent-soft) 100%)',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                marginBottom: '20px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                        >
                            {isAnonymous ? <Lock size={16} /> : <Gift size={16} />}
                            <span>{isAnonymous ? 'Save to Spin' : 'Claim Reward'}</span>
                        </motion.button>
                    )}

                    {/* Navigation Sections */}
                    {sections.map(section => (
                        <div key={section.title} className="sidebar-nav-section">
                            {section.title !== 'YOU' && <div className="sidebar-nav-title">{section.title}</div>}
                            {section.title === 'YOU' ? (
                                <div className="sidebar-nav-grid">
                                    {section.items.map(item => {
                                        const isActive = activeTab === item.id;
                                        return (
                                            <motion.div
                                                key={item.id}
                                                whileHover={{ y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={`sidebar-nav-grid-item ${isActive ? 'active' : ''}`}
                                                onClick={() => {
                                                    if (item.restricted) {
                                                        onShowGuestModal();
                                                        return;
                                                    }
                                                    onNavigate(item.id);
                                                    if (isMobile) onClose();
                                                }}
                                            >
                                                <div className="sidebar-nav-item-icon" style={{ position: 'relative' }}>
                                                    {React.cloneElement(item.icon, { size: 22 })}
                                                    {item.id === 'market' && hasMarketNotification && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '-2px',
                                                            right: '-2px',
                                                            width: '8px',
                                                            height: '8px',
                                                            background: '#ef4444',
                                                            borderRadius: '50%',
                                                            border: '2px solid var(--sidebar-bg)',
                                                            boxShadow: '0 0 5px rgba(239, 68, 68, 0.5)'
                                                        }} />
                                                    )}
                                                </div>
                                                <span>{item.label}</span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                section.items.map(item => {
                                    const isActive = activeTab === item.id;
                                    const isExpanded = expanded[item.id];
                                    
                                    return (
                                        <React.Fragment key={item.id}>
                                            <div
                                                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                                                onClick={() => {
                                                    if (item.restricted) {
                                                        onShowGuestModal();
                                                        return;
                                                    }
                                                    if (item.children) {
                                                        toggleExpand(item.id);
                                                    } else {
                                                        onNavigate(item.id);
                                                        if (isMobile) onClose();
                                                    }
                                                }}
                                            >
                                                <div className="sidebar-nav-item-icon">
                                                    {item.icon}
                                                </div>
                                                <span style={{ flex: 1 }}>{item.label}</span>
                                                {item.children && (
                                                    <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} style={{ opacity: 0.3, display: 'flex' }}>
                                                        <ChevronDown size={14} />
                                                    </motion.span>
                                                )}
                                            </div>

                                            <AnimatePresence>
                                                {item.children && isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        style={{ overflow: 'hidden', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px', borderLeft: '1px solid var(--border)', marginLeft: '12px' }}
                                                    >
                                                        {item.children.map(child => {
                                                            const isChildActive = activeTab === item.id && activeCategory === child.id;
                                                            return (
                                                                <div
                                                                    key={child.id}
                                                                    className={`sidebar-nav-item ${isChildActive ? 'active' : ''}`}
                                                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                                    onClick={() => {
                                                                        onNavigate(item.id, child.id);
                                                                        if (isMobile) onClose();
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                                        {child.icon}
                                                                        <span>{child.label}</span>
                                                                    </div>
                                                                    {child.skill && <SkillInfo skillKey={child.skill} />}
                                                                </div>
                                                            );
                                                        })}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </div>
                    ))}
                </div>

                {/* Membership Status */}
                {gameState?.state?.membership?.active && gameState?.state?.membership?.expiresAt > Date.now() && (
                    <div style={{ padding: '8px 16px', marginTop: 'auto' }}>
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.05)',
                            borderRadius: '12px',
                            padding: '16px',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#4ade80' }}>PREMIUM ACTIVE</span>
                                <Sparkles size={14} color="#4ade80" />
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                                Expires: {new Date(gameState.state.membership.expiresAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Sidebar;
