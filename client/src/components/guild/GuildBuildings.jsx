import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronDown, Landmark, Building2, Lock, ArrowUp, Coins, 
    Users, BookOpen, Pickaxe, Hammer, Wrench, Trophy, 
    Sparkles, Zap, FlaskConical, Check, Shield, Info, ClipboardList,
    Link2, Plus
} from 'lucide-react';
import { 
    GUILD_BUILDINGS, 
    calculateMaterialNeeds, 
    UPGRADE_COSTS,
    STATION_BONUS_TABLE,
    GUILD_TASKS_CONFIG
} from '@shared/guilds.js';
import { formatSilver } from '@utils/format';

const getItemIcon = (itemId) => {
    if (!itemId) return '/items/placeholder.webp';
    return `/items/${itemId}.webp`;
};

export const GuildBuildings = ({ 
    guild, 
    selectedBuilding, 
    setSelectedBuilding, 
    showBuildingDropdown, 
    setShowBuildingDropdown,
    playerHasPermission,
    isMobile,
    getItemAmount,
    socket,
    setShowDonateModal
}) => {
    // Normalize bank items to UpperCase
    const bankTotals = useMemo(() => {
        const totals = {};
        if (guild.bank_items) {
            Object.entries(guild.bank_items).forEach(([id, qty]) => {
                const normalizedId = id.toUpperCase().replace(/::$/, '');
                totals[normalizedId] = (totals[normalizedId] || 0) + (qty || 0);
            });
        }
        return totals;
    }, [guild.bank_items]);

    const bankNeeds = useMemo(() => calculateMaterialNeeds(guild), [guild]);

    const buildingsList = [
        { id: 'BANK', label: 'Guild Bank', icon: Landmark, level: guild.bank_level || 0 },
        { id: 'GUILD_HALL', label: 'Guild Hall', icon: Building2, level: guild.guild_hall_level || 0 },
        { id: 'LIBRARY', label: 'Library', icon: BookOpen, level: guild.library_level || 0 },
        { id: 'GATHERING', label: 'Gathering Station', icon: Pickaxe, level: Math.max(guild.gathering_xp_level || 0, guild.gathering_duplic_level || 0, guild.gathering_auto_level || 0) },
        { id: 'REFINING', label: 'Refining Station', icon: FlaskConical, level: Math.max(guild.refining_xp_level || 0, guild.refining_duplic_level || 0, guild.refining_effic_level || 0) },
        { id: 'CRAFTING', label: 'Crafting Station', icon: Hammer, level: Math.max(guild.crafting_xp_level || 0, guild.crafting_duplic_level || 0, guild.crafting_effic_level || 0) }
    ];

    const currentBuildingData = buildingsList.find(b => b.id === selectedBuilding);

    const bankCards = useMemo(() => {
        const mats = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'];
        const tiers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const cards = [];

        tiers.forEach(t => {
            mats.forEach(m => {
                const itemId = `T${t}_${m}`;
                const needed = bankNeeds[itemId] || 0;
                if (needed > 0) {
                    const stored = bankTotals[itemId] || 0;
                    const isDone = stored >= needed;
                    
                    cards.push(
                        <div key={itemId} style={{ 
                            background: isDone ? 'rgba(68, 255, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)', 
                            padding: '8px', 
                            borderRadius: '12px', 
                            border: isDone ? '1px solid rgba(68, 255, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: 1
                        }}>
                            <div style={{ width: '18px', height: '18px' }}>
                                <img src={getItemIcon(itemId)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={itemId} />
                            </div>

                            <div style={{ flex: '1 1 0%', minWidth: 0 }}>
                                <div style={{ 
                                    color: isDone ? '#44ff44' : '#fff', 
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                }}>
                                    {stored.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, '.')}
                                    <span style={{ 
                                        fontSize: '0.6rem', 
                                        color: isDone ? 'rgba(68, 255, 68, 0.533)' : 'rgba(255, 255, 255, 0.3)',
                                        marginLeft: '4px'
                                    }}>/ {needed.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, '.')}</span>
                                </div>
                                <div style={{ 
                                    color: 'rgba(255, 255, 255, 0.3)', 
                                    fontSize: '0.55rem', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    T{t} {m.charAt(0) + m.slice(1).toLowerCase()}
                                    {isDone && <Check size={8} color="#44ff44" strokeWidth={2} />}
                                </div>
                            </div>
                        </div>
                    );
                }
            });
        });
        return cards;
    }, [bankNeeds, bankTotals]);

    const renderUpgradeRequirement = (type, cost, has, label, Icon, color = 'var(--accent)') => {
        const isMet = has >= cost;
        return (
            <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                padding: '10px', 
                borderRadius: '10px', 
                border: `1px solid ${isMet ? 'rgba(68, 255, 68, 0.1)' : 'rgba(255, 68, 68, 0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <Icon size={16} color={color} />
                <div>
                    <div style={{ color: isMet ? '#44ff44' : '#ff4444', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {typeof cost === 'number' && cost > 100000 ? formatSilver(cost) : cost.toLocaleString()}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>{label}</div>
                </div>
            </div>
        );
    };

    const guildHallUpgrade = useMemo(() => {
        const nextLvl = (guild.guild_hall_level || 0) + 1;
        if (nextLvl > 10) return <div style={{ textAlign: 'center', padding: '20px', color: '#44ff44', fontWeight: 'bold' }}>MAX LEVEL REACHED</div>;
        const costs = UPGRADE_COSTS[nextLvl];
        const silverCost = costs?.silver || 0;
        const gpCost = costs?.gp || 0;
        const matAmount = costs?.mats || 0;
        const reqGuildLevel = Math.max(1, (nextLvl - 1) * 10);
        const tier = Math.min(10, nextLvl);
        
        const materials = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'].map(m => `T${tier}_${m}`);
        const hasMats = materials.every(m => (bankTotals[m] || 0) >= matAmount);
        const hasSilver = (guild.bank_silver || 0) >= silverCost;
        const hasGP = (guild.guild_points || 0) >= gpCost;
        const hasGuildLvl = (guild.level || 1) >= reqGuildLevel;
        const canUpgrade = playerHasPermission('manage_upgrades') && hasMats && hasSilver && hasGP && hasGuildLvl;

        return (
            <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '15px' }}>UPGRADE TO LVL {nextLvl} (+5 Slots)</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                    {renderUpgradeRequirement('SILVER', silverCost, guild.bank_silver || 0, 'Bank Silver', Coins, '#ffd700')}
                    {renderUpgradeRequirement('GP', gpCost, guild.guild_points || 0, 'Guild Points', ClipboardList, 'var(--accent)')}
                    {renderUpgradeRequirement('GUILD_LVL', reqGuildLevel, guild.level || 1, 'Min. Guild Lvl', Trophy, '#4488ff')}
                    
                    <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '5px' }}>
                        {materials.map(m => (
                            <div key={m} style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '10px', border: (bankTotals[m] || 0) >= matAmount ? '1px solid rgba(68, 255, 68, 0.1)' : '1px solid rgba(255, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.45rem', fontWeight: 'bold' }}>{m.replace('_', ' ')}</div>
                                <img src={getItemIcon(m)} style={{ width: '16px', height: '16px' }} alt="" />
                                <div style={{ color: (bankTotals[m] || 0) >= matAmount ? '#44ff44' : '#ff4444', fontSize: '0.55rem', fontWeight: 'bold' }}>
                                    {(bankTotals[m] || 0) >= 1000 ? ((bankTotals[m] || 0) / 1000).toFixed(1) + 'K' : (bankTotals[m] || 0)}/{matAmount >= 1000 ? (matAmount / 1000).toFixed(0) + 'K' : matAmount}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <button 
                    disabled={!canUpgrade}
                    onClick={() => socket?.emit('upgrade_guild_building', { buildingType: 'GUILD_HALL' })}
                    style={{ 
                        width: '100%', marginTop: '20px', padding: '12px', borderRadius: '12px', 
                        background: canUpgrade ? 'var(--accent)' : 'rgba(255,255,255,0.05)', 
                        color: canUpgrade ? '#000' : 'rgba(255,255,255,0.2)', border: 'none', fontWeight: '900', fontSize: '0.8rem', 
                        cursor: canUpgrade ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' 
                    }}
                >
                    <ArrowUp size={16} /> {canUpgrade ? 'UPGRADE BUILDING' : 'MISSING REQUIREMENTS'}
                </button>
            </div>
        );
    }, [guild, bankTotals, playerHasPermission, isMobile]);

    const libraryUpgrade = useMemo(() => {
        const nextLvl = (guild.library_level || 0) + 1;
        if (nextLvl > 10) return <div style={{ textAlign: 'center', padding: '20px', color: '#44ff44', fontWeight: 'bold' }}>MAX LEVEL REACHED</div>;
        const costs = UPGRADE_COSTS[nextLvl];
        const silverCost = costs?.silver || 0;
        const gpCost = costs?.gp || 0;
        const matAmount = costs?.mats || 0;
        const reqGuildLevel = Math.max(1, (nextLvl - 1) * 10);
        const tier = Math.min(10, nextLvl);
        
        const materials = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'].map(m => `T${tier}_${m}`);
        const hasMats = materials.every(m => (bankTotals[m] || 0) >= matAmount);
        const hasSilver = (guild.bank_silver || 0) >= silverCost;
        const hasGP = (guild.guild_points || 0) >= gpCost;
        const hasGuildLvl = (guild.level || 1) >= reqGuildLevel;
        const canUpgrade = playerHasPermission('manage_upgrades') && hasMats && hasSilver && hasGP && hasGuildLvl;

        return (
            <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '15px' }}>UPGRADE TO LVL {nextLvl} (T{nextLvl} Tasks)</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                    {renderUpgradeRequirement('SILVER', silverCost, guild.bank_silver || 0, 'Bank Silver', Coins, '#ffd700')}
                    {renderUpgradeRequirement('GP', gpCost, guild.guild_points || 0, 'Guild Points', ClipboardList, 'var(--accent)')}
                    {renderUpgradeRequirement('GUILD_LVL', reqGuildLevel, guild.level || 1, 'Min. Guild Lvl', Trophy, '#4488ff')}
                    
                    <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '5px' }}>
                        {materials.map(m => (
                            <div key={m} style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '10px', border: (bankTotals[m] || 0) >= matAmount ? '1px solid rgba(68, 255, 68, 0.1)' : '1px solid rgba(255, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.45rem', fontWeight: 'bold' }}>{m.replace('_', ' ')}</div>
                                <img src={getItemIcon(m)} style={{ width: '16px', height: '16px' }} alt="" />
                                <div style={{ color: (bankTotals[m] || 0) >= matAmount ? '#44ff44' : '#ff4444', fontSize: '0.55rem', fontWeight: 'bold' }}>
                                    {(bankTotals[m] || 0) >= 1000 ? ((bankTotals[m] || 0) / 1000).toFixed(1) + 'K' : (bankTotals[m] || 0)}/{matAmount >= 1000 ? (matAmount / 1000).toFixed(0) + 'K' : matAmount}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <button 
                    disabled={!canUpgrade}
                    onClick={() => socket?.emit('upgrade_guild_building', { buildingType: 'LIBRARY' })}
                    style={{ 
                        width: '100%', marginTop: '20px', padding: '12px', borderRadius: '12px', 
                        background: canUpgrade ? 'var(--accent)' : 'rgba(255,255,255,0.05)', 
                    }}
                >
                    <ArrowUp size={16} /> {canUpgrade ? 'UPGRADE BUILDING' : 'MISSING REQUIREMENTS'}
                </button>
            </div>
        );
    }, [guild, bankTotals, playerHasPermission, isMobile]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Building Selector */}
            <div style={{ position: 'relative' }}>
                <div 
                    onClick={() => setShowBuildingDropdown(!showBuildingDropdown)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        padding: '12px 15px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: '0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {currentBuildingData && <currentBuildingData.icon size={20} color="var(--accent)" />}
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{currentBuildingData?.label}</div>
                            {currentBuildingData?.id !== 'BANK' && (
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>LVL {currentBuildingData?.level}</div>
                            )}
                        </div>
                    </div>
                    <ChevronDown size={18} color="rgba(255,255,255,0.4)" style={{ transform: showBuildingDropdown ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </div>

                <AnimatePresence>
                    {showBuildingDropdown && (
                        <>
                            <div onClick={() => setShowBuildingDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                                    background: '#1a1a1a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100, overflow: 'hidden'
                                }}
                            >
                                {buildingsList.map(b => (
                                    <div 
                                        key={b.id}
                                        onClick={() => { setSelectedBuilding(b.id); setShowBuildingDropdown(false); }}
                                        style={{
                                            padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px',
                                            cursor: 'pointer', background: selectedBuilding === b.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                            borderBottom: '1px solid rgba(255,255,255,0.03)'
                                        }}
                                    >
                                        <b.icon size={18} color={selectedBuilding === b.id ? 'var(--accent)' : 'rgba(255,255,255,0.4)'} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: selectedBuilding === b.id ? 'var(--accent)' : '#fff' }}>{b.label}</div>
                                            {b.id !== 'BANK' && <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>Level {b.level}</div>}
                                        </div>
                                        {selectedBuilding === b.id && <motion.div layoutId="activeDot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />}
                                    </div>
                                ))}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* TAB CONTENT: BANK */}
            {selectedBuilding === 'BANK' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
                        borderRadius: '20px', 
                        border: '1px solid rgba(212, 175, 55, 0.2)', 
                        padding: '15px'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start', 
                            marginBottom: '15px', 
                            gap: '10px' 
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3 style={{ 
                                    color: 'var(--accent)', 
                                    margin: 0, 
                                    fontSize: '1rem', 
                                    fontWeight: '900', 
                                    letterSpacing: '1px',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px'
                                }}>
                                    <Landmark size={20} /> GUILD BANK
                                </h3>
                                <button
                                    onClick={() => setShowDonateModal(true)}
                                    style={{ 
                                        padding: '4px 12px', 
                                        background: 'var(--accent)', 
                                        border: 'none', 
                                        borderRadius: '8px', 
                                        color: '#000', 
                                        fontSize: '0.65rem',
                                        fontWeight: '900', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: 'rgba(212, 175, 55, 0.3) 0px 4px 12px'
                                    }}
                                >
                                    <Plus size={14} /> DONATE
                                </button>
                            </div>
                            
                            <div style={{ 
                                color: '#fff', 
                                fontSize: '1rem', 
                                fontWeight: 'bold', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '15px' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Link2 size={16} color="#ffd700" />
                                    {(guild.bank_silver || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, '.')}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                                    <ClipboardList size={16} />
                                    <span>{(guild.guild_points || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, '.')} GP</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(2, 1fr)', 
                            gap: '8px',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            paddingRight: '5px',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'var(--accent) rgba(0,0,0,0)'
                        }}>
                            {bankCards}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: GUILD HALL */}
            {selectedBuilding === 'GUILD_HALL' && (
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '12px', borderRadius: '12px' }}>
                                <Building2 size={24} color="var(--accent)" />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '900' }}>GUILD HALL</h4>
                                <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Expand the maximum member capacity.</p>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                            LVL {guild.guild_hall_level || 0}
                        </div>
                    </div>

                    {guildHallUpgrade}
                </div>
            )}

            {/* TAB CONTENT: LIBRARY */}
            {selectedBuilding === 'LIBRARY' && (
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '12px', borderRadius: '12px' }}>
                                <BookOpen size={24} color="var(--accent)" />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '900' }}>LIBRARY</h4>
                                <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Expand task tiers and library rewards.</p>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                            LVL {guild.library_level || 0}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '15px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', letterSpacing: '1px' }}>CURRENT TASK REWARDS:</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Trophy size={14} color="var(--accent)" />
                                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '900' }}>+{(GUILD_TASKS_CONFIG.REWARDS.XP_TABLE[guild.library_level || 1] || 0).toLocaleString()} XP</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Coins size={14} color="#4488ff" />
                                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '900' }}>+{(GUILD_TASKS_CONFIG.REWARDS.GP_TABLE[guild.library_level || 1] || 0).toLocaleString()} GP</span>
                            </div>
                        </div>
                    </div>

                    {libraryUpgrade}
                </div>
            )}

            {/* TAB CONTENT: STATIONS (GATHERING, REFINING, CRAFTING) */}
            {['GATHERING', 'REFINING', 'CRAFTING'].includes(selectedBuilding) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {(() => {
                        const bId = selectedBuilding === 'GATHERING' ? 'GATHERING_STATION' :
                            selectedBuilding === 'REFINING' ? 'REFINING_STATION' : 'CRAFTING_STATION';
                        const config = GUILD_BUILDINGS[bId];
                        const color = selectedBuilding === 'GATHERING' ? '#a855f7' :
                            selectedBuilding === 'REFINING' ? '#10b981' : '#f59e0b';
                        const Icon = selectedBuilding === 'GATHERING' ? Pickaxe :
                            selectedBuilding === 'REFINING' ? FlaskConical : Hammer;

                        return (
                            <>
                                <div style={{
                                    background: `linear-gradient(135deg, ${color}11 0%, rgba(0,0,0,0) 100%)`,
                                    borderRadius: '20px', border: `1px solid ${color}33`, padding: '20px'
                                }}>
                                    <h3 style={{ color, margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Icon size={24} /> {config.name}
                                    </h3>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '5px 0 0 0' }}>{config.description}</p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '15px' }}>
                                    {Object.entries(config.paths).map(([path, pathConfig]) => {
                                        const currentLevel = guild[pathConfig.column] || 0;
                                        const nextLevel = currentLevel + 1;
                                        const isMax = currentLevel >= config.maxLevel;
                                        const costs = UPGRADE_COSTS[nextLevel];

                                        const silverCost = costs?.silver || 0;
                                        const gpCost = costs?.gp || 0;
                                        const matAmount = costs?.mats || 0;
                                        const tier = Math.min(10, nextLevel);
                                        const reqGuildLevel = Math.max(1, (nextLevel - 1) * 10);
                                        
                                        const isSyncBlocked = Object.values(config.paths).some(p => (guild[p.column] || 0) < currentLevel);
                                        
                                        const materials = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'].map(m => `T${tier}_${m}`);
                                        const hasMats = materials.every(m => (bankTotals[m] || 0) >= matAmount);
                                        const hasSilver = (guild.bank_silver || 0) >= silverCost;
                                        const hasGP = (guild.guild_points || 0) >= gpCost;
                                        const hasGuildLevel = (guild.level || 1) >= reqGuildLevel;
                                        const canUpgrade = playerHasPermission('manage_upgrades') && hasGuildLevel && hasSilver && hasGP && hasMats && !isSyncBlocked && !isMax;

                                        const pathColor = path === 'XP' ? '#4488ff' : path === 'DUPLIC' ? '#ffd700' : color;
                                        const PathIcon = path === 'XP' ? Trophy : path === 'DUPLIC' ? Sparkles : Zap;

                                        return (
                                            <div key={path} style={{
                                                background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
                                                padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px', opacity: isSyncBlocked && !isMax ? 0.6 : 1
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ background: `${pathColor}22`, padding: '8px', borderRadius: '10px' }}>
                                                        <PathIcon size={20} color={pathColor} />
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#fff' }}>LVL {currentLevel}</div>
                                                </div>

                                                <div>
                                                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '900' }}>{pathConfig.name}</div>
                                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginTop: '2px' }}>
                                                        Current: <span style={{ color: pathColor, fontWeight: 'bold' }}>+{STATION_BONUS_TABLE[currentLevel] || 0}{pathConfig.suffix}</span>
                                                        {!isMax && (
                                                            <>
                                                                {' '}- Next: <span style={{ color: 'var(--accent)' }}>+{STATION_BONUS_TABLE[nextLevel]}{pathConfig.suffix}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {!isMax ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {isSyncBlocked && (
                                                            <div style={{ background: 'rgba(255,68,68,0.1)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <Lock size={12} color="#ff4444" />
                                                                <span style={{ fontSize: '0.55rem', color: "#ff4444", fontWeight: 'bold' }}>SYNC REQUIRED</span>
                                                            </div>
                                                        )}
                                                        
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Coins size={12} color="#ffd700" />
                                                                <span style={{ fontSize: '0.6rem', color: hasSilver ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>{formatSilver(silverCost)}</span>
                                                            </div>
                                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <ClipboardList size={12} color="var(--accent)" />
                                                                <span style={{ fontSize: '0.6rem', color: hasGP ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>{gpCost.toLocaleString()}</span>
                                                            </div>
                                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Trophy size={12} color="#4488ff" />
                                                                <span style={{ fontSize: '0.6rem', color: hasGuildLevel ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>LVL {reqGuildLevel}</span>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                                            {materials.map(m => {
                                                                const cur = bankTotals[m] || 0;
                                                                const has = cur >= matAmount;
                                                                return (
                                                                    <div key={m} style={{ background: 'rgba(0,0,0,0.2)', padding: '5px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                        <img src={getItemIcon(m)} style={{ width: '16px', height: '16px' }} />
                                                                        <span style={{ fontSize: '0.55rem', color: has ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>{cur >= 1000 ? (cur / 1000).toFixed(0) + 'K' : cur}/{matAmount >= 1000 ? (matAmount / 1000).toFixed(0) + 'K' : matAmount}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <motion.button
                                                            whileHover={canUpgrade ? { scale: 1.02 } : {}} whileTap={canUpgrade ? { scale: 0.98 } : {}}
                                                            disabled={!canUpgrade}
                                                            onClick={() => socket?.emit('upgrade_guild_building', { buildingType: bId, path })}
                                                            style={{
                                                                width: '100%', padding: '8px', background: canUpgrade ? pathColor : 'rgba(255,255,255,0.05)',
                                                                border: 'none', borderRadius: '10px', color: canUpgrade ? '#000' : 'rgba(255,255,255,0.2)',
                                                                fontWeight: '900', fontSize: '0.7rem', cursor: canUpgrade ? 'pointer' : 'not-allowed'
                                                            }}
                                                        >
                                                            {isSyncBlocked ? 'LOCKED' : 'UPGRADE'}
                                                        </motion.button>
                                                    </div>
                                                ) : (
                                                    <div style={{ background: 'rgba(68, 255, 68, 0.05)', border: '1px solid rgba(68, 255, 68, 0.2)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                                                        <Check size={16} color="#44ff44" style={{ margin: '0 auto 4px' }} />
                                                        <div style={{ color: '#44ff44', fontSize: '0.65rem', fontWeight: '900' }}>MAX LEVEL</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
