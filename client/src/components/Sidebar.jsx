import React, { useState, useEffect } from 'react';
import {
    Package, User, Pickaxe, Hammer, Sword,
    ChevronDown, ChevronRight, Coins, Castle,
    Trophy, Tag, Zap, Box, Axe, Shield, Users, MessageSquare, Sun, Moon
} from 'lucide-react';

const Sidebar = ({ gameState, activeTab, setActiveTab, activeCategory, setActiveCategory, isMobile, isOpen, onClose, onSwitchCharacter, theme, toggleTheme }) => {
    const [expanded, setExpanded] = useState({
        gathering: true,
        refining: false,
        crafting: false,
        merging: false,
        combat: false
    });
    const [activePlayers, setActivePlayers] = useState(0);

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
            gathering: false,
            refining: false,
            crafting: false,
            merging: false,
            combat: false,
            [id]: !prev[id]
        }));
    };

    const skills = gameState?.state?.skills || {};
    const silver = gameState?.state?.silver || 0;

    const skillMap = {
        'WOOD': 'LUMBERJACK',
        'ORE': 'ORE_MINER',
        'HIDE': 'ANIMAL_SKINNER',
        'FIBER': 'FIBER_HARVESTER',
        'FISH': 'FISHING',
        'PLANK': 'PLANK_REFINER',
        'BAR': 'METAL_BAR_REFINER',
        'LEATHER': 'LEATHER_REFINER',
        'CLOTH': 'CLOTH_REFINER',
        'WARRIORS_FORGE': 'WARRIOR_CRAFTER',
        'HUNTERS_LODGE': 'HUNTER_CRAFTER',
        'MAGES_TOWER': 'MAGE_CRAFTER',
        'TOOLMAKER': 'TOOL_CRAFTER',
        'COOKING_STATION': 'COOKING'
    };

    const SkillInfo = ({ skillKey }) => {
        if (skillKey === 'RUNE') return null;
        const skill = skills[skillKey] || { level: 1, xp: 0 };
        const level = skill.level || 1;
        const xp = skill.xp || 0;
        const nextLevelXp = Math.floor(100 * Math.pow(1.15, level - 1));
        const progress = Math.min(100, (xp / nextLevelXp) * 100);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', minWidth: '45px' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--accent)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ opacity: 0.6, fontSize: '0.45rem' }}>LV</span>
                    {level}
                </div>
                <div style={{ width: '40px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--t2))', boxShadow: '0 0 5px rgba(212, 175, 55, 0.3)' }} />
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
                { id: 'WOOD', label: 'Lumberjack', skill: 'LUMBERJACK' },
                { id: 'ORE', label: 'Mining', skill: 'ORE_MINER' },
                { id: 'HIDE', label: 'Skinning', skill: 'ANIMAL_SKINNER' },
                { id: 'FIBER', label: 'Harvesting', skill: 'FIBER_HARVESTER' },
                { id: 'FISH', label: 'Fishing', skill: 'FISHING' },
                { id: 'HERB', label: 'Herbalism', skill: 'HERBALISM' },
            ]
        },
        {
            id: 'refining',
            label: 'Refining',
            icon: <Box size={18} />,
            children: [
                { id: 'PLANK', label: 'Lumber Mill', skill: 'PLANK_REFINER' },
                { id: 'BAR', label: 'Smelting', skill: 'METAL_BAR_REFINER' },
                { id: 'LEATHER', label: 'Tannery', skill: 'LEATHER_REFINER' },
                { id: 'CLOTH', label: 'Loom', skill: 'CLOTH_REFINER' },
                { id: 'EXTRACT', label: 'Distillation', skill: 'DISTILLATION' },
            ]
        },
        {
            id: 'crafting',
            label: 'Crafting',
            icon: <Hammer size={18} />,
            children: [
                { id: 'WARRIORS_FORGE', label: "Warrior's Forge", skill: 'WARRIOR_CRAFTER' },
                { id: 'HUNTERS_LODGE', label: "Hunter's Lodge", skill: 'HUNTER_CRAFTER' },
                { id: 'MAGES_TOWER', label: "Mage's Tower", skill: 'MAGE_CRAFTER' },
                { id: 'TOOLMAKER', label: 'Toolmaker', skill: 'TOOL_CRAFTER' },
                { id: 'COOKING_STATION', label: 'Kitchen', skill: 'COOKING' },
                { id: 'ALCHEMY_LAB', label: 'Alchemy Lab', skill: 'ALCHEMY' },
            ]
        },
        {
            id: 'merging',
            label: 'Merging',
            icon: <Zap size={18} />,
            children: [
                { id: 'RUNE', label: 'Rune', skill: 'RUNE' },
            ]
        },
        { id: 'combat', label: 'Combat', icon: <Sword size={18} />, skill: 'COMBAT' },
        { id: 'dungeon', label: 'Dungeons', icon: <Castle size={18} />, skill: 'DUNGEONEERING' },
        { id: 'ranking', label: 'Ranking', icon: <Trophy size={18} /> },
    ];

    return (
        <div
            style={{
                width: isMobile ? '75vw' : '330px',
                height: isMobile ? '100%' : '100vh',
                background: theme === 'light' ? '#ffffff' : 'var(--panel-bg)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                position: isMobile ? 'fixed' : 'relative',
                left: isMobile && !isOpen ? '-100%' : '0',
                top: 0,
                zIndex: (isMobile && isOpen) ? 10001 : 100,
                boxShadow: theme === 'light' ? '4px 0 15px rgba(0,0,0,0.05)' : 'var(--panel-shadow)',
                flexShrink: 0
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
            <div style={{ padding: '20px 10px 0 10px', display: 'flex', gap: '6px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(144, 213, 255, 0.05)',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    color: 'var(--accent)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    flex: 1
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        background: '#44ff44',
                        borderRadius: '50%',
                        boxShadow: '0 0 8px #44ff44',
                        flexShrink: 0
                    }}></span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.5px', color: 'var(--accent)' }}>{activePlayers}</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', opacity: 0.8, letterSpacing: '1px' }}>ACTIVE PLAYERS</span>
                    </div>
                </div>

                {/* Discord Button */}
                <a
                    href="https://discord.gg/wgcEvkfCt2"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        background: '#5865F2',
                        borderRadius: '12px',
                        color: 'var(--text-main)',
                        transition: '0.2s',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                    }}
                    title="Join our Discord"
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#4752C4'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#5865F2'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 127.14 96.36"
                        fill="currentColor"
                    >
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.4,80.21a105.73,105.73,0,0,0,32.17,16.15,77.7,77.7,0,0,0,6.89-11.11,68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c3.39-28.32-5.42-52.09-23.75-72.13ZM42.45,65.69C36.18,65.69,31,60,31,53s5.07-12.72,11.41-12.72S54,46,53.86,53,48.81,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.72,11.44-12.72S96.11,46,96,53,91,65.69,84.69,65.69Z" />
                    </svg>
                </a>


                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        color: 'var(--accent)',
                        transition: '0.2s',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                    }}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            <div style={{ padding: '20px 10px 10px 10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[
                        { id: 'profile', label: 'PROFILE', icon: <User size={14} /> },
                        { id: 'inventory', label: 'BAG', icon: <Package size={14} /> },
                        { id: 'market', label: 'MARKET', icon: <Tag size={14} /> }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (isMobile) onClose();
                            }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '10px 0',
                                borderRadius: '10px',
                                border: '1px solid',
                                borderColor: activeTab === item.id ? 'rgba(144, 213, 255, 0.3)' : 'rgba(240, 240, 240, 0.05)',
                                background: activeTab === item.id ? 'rgba(144, 213, 255, 0.1)' : 'rgba(240, 240, 240, 0.02)',
                                color: activeTab === item.id ? 'var(--accent)' : 'var(--text-dim)',
                                transition: '0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                cursor: 'pointer'
                            }}
                        >
                            {item.icon}
                            <span style={{ fontSize: '0.55rem', fontWeight: '900', marginTop: '4px', letterSpacing: '1px' }}>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="scroll-container" style={{ padding: '0 10px', flex: 1 }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.55rem', fontWeight: '900', letterSpacing: '2px', padding: '15px 0 8px 10px', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>ACTIVITIES</div>

                {menuItems.slice(2).map(item => {
                    const isMainItemActive = activeTab === item.id;
                    const isGroupHeader = !!item.children;

                    // Header para separar o Combate/Adventure do resto se necessário
                    const showAdventureHeader = item.id === 'combat';

                    return (
                        <React.Fragment key={item.id}>
                            {showAdventureHeader && (
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.55rem', fontWeight: '900', letterSpacing: '2px', padding: '25px 0 8px 10px', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>WORLD</div>
                            )}

                            <div style={{ marginBottom: '4px' }}>
                                <button
                                    onClick={() => {
                                        if (isGroupHeader) {
                                            toggleExpand(item.id);
                                        } else {
                                            setActiveTab(item.id);
                                            if (isMobile) onClose();
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        background: isMainItemActive ? 'linear-gradient(90deg, rgba(144, 213, 255, 0.1), transparent)' : 'transparent',
                                        borderRadius: '8px',
                                        color: isMainItemActive ? 'var(--text-main)' : 'var(--text-dim)',
                                        textAlign: 'left',
                                        border: '1px solid',
                                        borderColor: isMainItemActive ? 'rgba(144, 213, 255, 0.2)' : 'transparent',
                                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }}
                                >
                                    <span style={{ color: isMainItemActive ? 'var(--accent)' : 'var(--text-dim)', transition: '0.2s' }}>{item.icon}</span>
                                    <span style={{ flex: 1, fontWeight: isMainItemActive ? '700' : '500', fontSize: '0.85rem', letterSpacing: '0.3px' }}>{item.label}</span>

                                    {item.skill && !item.children && <SkillInfo skillKey={item.skill} />}
                                    {isGroupHeader && (
                                        <span style={{ opacity: 0.3, transform: expanded[item.id] ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}>
                                            <ChevronDown size={14} />
                                        </span>
                                    )}
                                </button>

                                {isGroupHeader && expanded[item.id] && (
                                    <div style={{ paddingLeft: '28px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid var(--border-active)', marginLeft: '20px' }}>
                                        {item.children.map(child => {
                                            const isChildActive = activeTab === item.id && activeCategory === child.id;
                                            return (
                                                <button
                                                    key={child.id}
                                                    onClick={() => {
                                                        setActiveTab(item.id);
                                                        setActiveCategory(child.id);
                                                        if (isMobile) onClose();
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px 10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        background: isChildActive ? 'rgba(144, 213, 255, 0.05)' : 'transparent',
                                                        borderRadius: '6px',
                                                        color: isChildActive ? 'var(--accent)' : 'var(--text-dim)',
                                                        fontSize: '0.8rem',
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: isChildActive ? '700' : '400' }}>{child.label}</span>
                                                    {child.skill && <SkillInfo skillKey={child.skill} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}

                {/* Membership Status */}

            </div>

            {/* Footer Buttons */}
            <div style={{ padding: '15px 10px', borderTop: '1px solid var(--border)' }}>
                {/* Membership Status - Moved to Footer */}
                {gameState?.state?.membership?.active && gameState?.state?.membership?.expiresAt > Date.now() && (
                    <div style={{
                        marginBottom: '15px',
                        background: 'var(--panel-bg)',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px'
                        }}>
                            <span style={{
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                color: '#4ade80'
                            }}>Premium Member</span>
                            <span style={{
                                fontSize: '0.65rem',
                                background: 'rgba(34, 197, 94, 0.2)',
                                color: '#4ade80',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                            }}>Active</span>
                        </div>
                        <div style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-dim)'
                        }}>
                            Expires: {new Date(gameState.state.membership.expiresAt).toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                )}


            </div>
        </div>
    );
};

export default Sidebar;
