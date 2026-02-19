import React, { useMemo, useState } from 'react';
import EquipmentSelectModal from './EquipmentSelectModal';
import { motion } from 'framer-motion';
import {
    Heart, Shield, Sword, Zap,
    User, Target, Star, Layers,
    Axe, Pickaxe, Scissors, Anchor, Apple, Info, ShoppingBag, Edit, Droplets,
    Hammer, Zap as EfficiencyIcon
} from 'lucide-react';
import { calculateNextLevelXP } from '../utils/xpTable';
import { resolveItem, getTierColor, calculateRuneBonus, getRequiredProficiencyGroup } from '@shared/items';
import { getProficiencyStats } from '@shared/proficiency_stats';
import { getBestItemForSlot, isBetterItem } from '../utils/equipment';
import { ChevronUp, ChevronDown } from 'lucide-react';
import StatBreakdownModal from './StatBreakdownModal';
import { supabase } from '../supabase';
import ProficiencyDetailsModal from './ProficiencyDetailsModal';


const ProfilePanel = ({ gameState, session, socket, onShowInfo, isMobile, onOpenRenameModal, theme, toggleTheme }) => {
    const isPremium = gameState?.state?.membership?.active && gameState?.state?.membership?.expiresAt > (gameState?._clientTime || Date.now());
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [infoModal, setInfoModal] = useState(null);
    const [breakdownModal, setBreakdownModal] = useState(null);
    const [activePlayers, setActivePlayers] = useState(0);
    const [activeProfileTab, setActiveProfileTab] = useState('EQUIPMENT'); // 'EQUIPMENT' or 'RUNES'
    const [selectedTitle, setSelectedTitle] = useState(gameState?.state?.selectedTitle || 'Lands Explorer');
    const [activeRuneTab, setActiveRuneTab] = useState('GATHERING'); // 'GATHERING', 'REFINING', 'CRAFTING', 'COMBAT'
    const [proficiencyModal, setProficiencyModal] = useState(null);

    // Guest Linking State
    const [showEmailLink, setShowEmailLink] = useState(false);
    const [linkEmail, setLinkEmail] = useState('');
    const [linkPassword, setLinkPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [linkError, setLinkError] = useState('');
    const [linkSuccess, setLinkSuccess] = useState('');

    // Sync title from gameState when it updates
    React.useEffect(() => {
        if (gameState?.state?.selectedTitle) {
            setSelectedTitle(gameState.state.selectedTitle);
        }
    }, [gameState?.state?.selectedTitle]);

    const handleTitleChange = (newTitle) => {
        setSelectedTitle(newTitle);
        socket.emit('change_title', { title: newTitle });
    };

    const isGoogleLinked = session?.user?.app_metadata?.providers?.includes('google') ||
        session?.user?.identities?.some(id => id.provider === 'google');

    // Fetch Active Players logic (duplicated from Sidebar for Mobile Profile)
    React.useEffect(() => {
        if (!isMobile) return; // Only needed on mobile here

        const fetchActivePlayers = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const res = await fetch(`${apiUrl}/api/active_players`);
                if (res.ok) {
                    const data = await res.json();
                    setActivePlayers(data.count || 0);
                }
            } catch (err) {
                console.warn('Could not fetch active players count in profile');
            }
        };

        fetchActivePlayers();
        const interval = setInterval(fetchActivePlayers, 15000);
        return () => clearInterval(interval);
    }, [isMobile]);

    const handleEquip = (itemId) => {
        socket.emit('equip_item', { itemId });
    };

    const handleUnequip = (slot) => {
        socket.emit('unequip_item', { slot });
    };

    const name = gameState?.name || 'Explorer';
    const state = gameState?.state || {};
    const { skills = {}, silver = 0, health, maxHealth = 100, equipment = {} } = state;
    const charStats = state.stats || { warriorProf: 0, hunterProf: 0, mageProf: 0 };
    const hasWeapon = !!equipment.mainHand;
    const currentWeaponClass = equipment.mainHand ? getRequiredProficiencyGroup(equipment.mainHand.id) : null;

    const calculatedStats = useMemo(() => {
        // Base stats iniciam em 0
        let warriorProf = 0;
        let hunterProf = 0;
        let mageProf = 0;

        // Helper para pegar nível de forma segura
        const getLvl = (key) => (skills[key]?.level || 1);

        // New Logic: Direct Proficiency Skills
        warriorProf = getLvl('WARRIOR_PROFICIENCY');
        hunterProf = getLvl('HUNTER_PROFICIENCY');
        mageProf = getLvl('MAGE_PROFICIENCY');

        // Apply Multipliers & Cap (Logic changed: it is now just the level, not * 0.2)
        // The * 0.2 was to convert sum of skills (max 500) to percentage (max 100).
        // Now the level IS the proficiency level (1-100).
        // So we don't need to multiply by 0.2 anymore, UNLESS the UI expects a percentage and the level is just an integer?
        // In the old logic: `warriorProf = Math.min(100, warriorProf * 0.2)`
        // If sum was 500 -> 100.
        // Now `nativeProf` is 1-100. So it is already 1:1.
        // However, we still need to add gear bonuses below.

        // Gear Bonuses
        Object.values(equipment).forEach(item => {
            if (item) {
                const fresh = resolveItem(item.id || item.item_id);
                const statsToUse = fresh?.stats || item.stats;
                if (statsToUse) {
                    if (statsToUse.str) warriorProf += statsToUse.str;
                    if (statsToUse.warriorProf) warriorProf += statsToUse.warriorProf;
                    if (statsToUse.agi) hunterProf += statsToUse.agi;
                    if (statsToUse.hunterProf) hunterProf += statsToUse.hunterProf;
                    if (statsToUse.int) mageProf += statsToUse.int;
                    if (statsToUse.mageProf) mageProf += statsToUse.mageProf;
                }
            }
        });

        return { warriorProf, hunterProf, mageProf };
    }, [skills, equipment]);

    const activeRuneBuffs = useMemo(() => {
        const summary = {};
        Object.entries(equipment).forEach(([slot, item]) => {
            if (slot.startsWith('rune_') && item) {
                const parts = slot.split('_');
                const act = parts[1];
                const eff = parts.slice(2).join('_');

                const freshItem = resolveItem(item.id || item.item_id);
                if (freshItem) {
                    const bonusValue = calculateRuneBonus(freshItem.tier, freshItem.stars, eff);
                    if (!summary[act]) summary[act] = {};
                    summary[act][eff] = (summary[act][eff] || 0) + bonusValue;
                }
            }
        });
        return summary;
    }, [equipment]);

    const stats = useMemo(() => {
        const combatSlots = ['helmet', 'chest', 'boots', 'gloves', 'cape', 'offHand'];
        const hasWeapon = !!equipment.mainHand;

        // Fallback para cálculo local (útil para updates otimistas antes do servidor responder)
        const gearDamage = Object.entries(equipment).reduce((acc, [slot, item]) => {
            if (!item || (!hasWeapon && combatSlots.includes(slot))) return acc;
            const fresh = resolveItem(item.id || item.item_id);
            return acc + (fresh?.stats?.damage || 0);
        }, 0);
        const gearDefense = Object.entries(equipment).reduce((acc, [slot, item]) => {
            if (!item || (!hasWeapon && combatSlots.includes(slot))) return acc;
            const fresh = resolveItem(item.id || item.item_id);
            return acc + (fresh?.stats?.defense || 0);
        }, 0);
        const gearHP = Object.entries(equipment).reduce((acc, [slot, item]) => {
            if (!item || (!hasWeapon && combatSlots.includes(slot))) return acc;
            const fresh = resolveItem(item.id || item.item_id);
            return acc + (fresh?.stats?.hp || 0);
        }, 0);
        const gearDmgBonus = Object.entries(equipment).reduce((acc, [slot, item]) => {
            if (!item || (!hasWeapon && combatSlots.includes(slot))) return acc;
            const fresh = resolveItem(item.id || item.item_id);
            return acc + (fresh?.stats?.dmgBonus || 0);
        }, 0);
        const gearCritChance = Object.entries(equipment).reduce((acc, [slot, item]) => {
            if (!item || (!hasWeapon && combatSlots.includes(slot))) return acc;
            const fresh = resolveItem(item.id || item.item_id);
            return acc + (fresh?.stats?.critChance || 0);
        }, 0);

        // Resolve Weapon Speed
        const weapon = equipment.mainHand;
        const freshWeapon = weapon ? resolveItem(weapon.id || weapon.item_id) : null;
        const weaponId = (freshWeapon?.id || weapon?.id || '').toUpperCase();

        let activeProf = null;
        if (weaponId.includes('SWORD')) activeProf = 'warrior';
        else if (weaponId.includes('BOW')) activeProf = 'hunter';
        else if (weaponId.includes('STAFF')) activeProf = 'mage';

        // Match Server Logic for Base Speed (2000ms)
        const weaponSpeed = freshWeapon?.stats?.speed || freshWeapon?.stats?.attackSpeed || 0;

        // Resolve Gear Speed (including weapon)
        const gearSpeedBonus = Object.entries(equipment).reduce((acc, [slot, item]) => {
            if (!item) return acc;
            const fresh = resolveItem(item.id || item.item_id);
            return acc + (fresh?.stats?.speed || fresh?.stats?.attackSpeed || 0);
        }, 0);

        // Match Server Logic for Active Stats - ABSOLUTE TABLE
        const profData = activeProf ? getProficiencyStats(activeProf, calculatedStats[`${activeProf}Prof`]) : { dmg: 0, hp: 0, def: 0, speedBonus: 0 };
        const activeProfDmg = profData.dmg || 0;
        const activeHP = profData.hp || 0;

        // Hunter at 100 needs approx 360ms reduction from 2000ms.
        // Mage at 100 needs 333ms interval. 2000 - 1667 = 333.
        // Active Prof Bonuses (DEF and Speed) - NOW FROM ABSOLUTE TABLE
        const activeProfDefense = profData.def || 0;
        const activeSpeedBonus = profData.speedBonus || 0;

        const totalBaseReduction = gearSpeedBonus + activeSpeedBonus;

        const atkSpdRune = activeRuneBuffs.ATTACK?.ATTACK_SPEED || 0;
        const totalBonusMultiplier = 1 + (atkSpdRune / 100);
        const finalReduction = totalBaseReduction * totalBonusMultiplier;

        let finalAttackSpeed = Math.max(200, 2000 - finalReduction);

        // Helper para ferramentas
        const getToolEff = (toolSlot) => {
            const tool = equipment[toolSlot];
            if (!tool) return 0;
            const fresh = resolveItem(tool.id || tool.item_id);
            return fresh?.stats?.efficiency || 0;
        };

        let globalEff = Object.entries(equipment).reduce((acc, [slot, item]) => {
            if (!item || (!hasWeapon && combatSlots.includes(slot))) return acc;
            const fresh = resolveItem(item.id || item.item_id);
            const statsToUse = fresh?.stats || item.stats;
            const effVal = typeof statsToUse?.efficiency === 'object' ? (statsToUse.efficiency.GLOBAL || 0) : 0;
            return acc + effVal;
        }, 0);

        if (isPremium) {
            globalEff += 10; // Add 10% (or 10 points, assuming 10 means 10%)
        }

        // ... (efficiency map remains same, just ensuring scope remains valid) ...
        const efficiency = {
            WOOD: (skills.LUMBERJACK?.level || 1) * 0.2 + getToolEff('tool_axe') + globalEff + (activeRuneBuffs.WOOD?.EFF || 0),
            ORE: (skills.ORE_MINER?.level || 1) * 0.2 + getToolEff('tool_pickaxe') + globalEff + (activeRuneBuffs.ORE?.EFF || 0),
            HIDE: (skills.ANIMAL_SKINNER?.level || 1) * 0.2 + getToolEff('tool_knife') + globalEff + (activeRuneBuffs.HIDE?.EFF || 0),
            FIBER: (skills.FIBER_HARVESTER?.level || 1) * 0.2 + getToolEff('tool_sickle') + globalEff + (activeRuneBuffs.FIBER?.EFF || 0),
            HERB: (skills.HERBALISM?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.HERB?.EFF || 0),
            FISH: (skills.FISHING?.level || 1) * 0.2 + getToolEff('tool_rod') + globalEff + (activeRuneBuffs.FISH?.EFF || 0),
            PLANK: (skills.PLANK_REFINER?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.PLANK?.EFF || 0),
            METAL: (skills.METAL_BAR_REFINER?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.METAL?.EFF || 0),
            LEATHER: (skills.LEATHER_REFINER?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.LEATHER?.EFF || 0),
            CLOTH: (skills.CLOTH_REFINER?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.CLOTH?.EFF || 0),
            EXTRACT: (skills.DISTILLATION?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.EXTRACT?.EFF || 0),
            WARRIOR: (skills.WARRIOR_CRAFTER?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.WARRIOR?.EFF || 0),
            HUNTER: (skills.HUNTER_CRAFTER?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.HUNTER?.EFF || 0),
            MAGE: (skills.MAGE_CRAFTER?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.MAGE?.EFF || 0),
            ALCHEMY: (skills.ALCHEMY?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.ALCHEMY?.EFF || 0),
            TOOLS: (skills.TOOL_CRAFTER?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.TOOLS?.EFF || 0),
            COOKING: (skills.COOKING?.level || 1) * 0.2 + globalEff + (activeRuneBuffs.COOKING?.EFF || 0),
            GLOBAL: globalEff
        };

        const damageRuneBonus = activeRuneBuffs.ATTACK?.ATTACK || 0;
        const foodSaver = activeRuneBuffs.ATTACK?.SAVE_FOOD || 0;

        return {
            hp: health !== undefined ? health : (100 + activeHP + gearHP),
            maxHp: 100 + activeHP + gearHP,
            damage: Math.floor((5 + activeProfDmg + gearDamage) * (1 + (gearDmgBonus || 0)) * (1 + (damageRuneBonus / 100))),
            defense: gearDefense + activeProfDefense,
            attackSpeed: finalAttackSpeed,
            warriorProf: calculatedStats.warriorProf,
            hunterProf: calculatedStats.hunterProf,
            mageProf: calculatedStats.mageProf,
            activeProf,
            efficiency,
            runeAttackBonus: damageRuneBonus,
            foodSaver,
            burstChance: (activeRuneBuffs.ATTACK?.BURST || 0) + gearCritChance,
            silverMultiplier: 1.0 + (isPremium ? 0.10 : 0)
        };
    }, [gameState?.calculatedStats, calculatedStats, health, skills, equipment, isPremium, activeRuneBuffs]);

    const avgIP = useMemo(() => {
        const combatSlots = ['helmet', 'chest', 'boots', 'gloves', 'cape', 'mainHand', 'offHand'];
        let totalIP = 0;

        const hasWeapon = !!equipment.mainHand;

        combatSlots.forEach(slot => {
            const rawItem = equipment[slot];
            if (rawItem) {
                // Return early if no weapon and it's a combat gear slot
                if (!hasWeapon && slot !== 'mainHand') return;

                // Resolve item to ensure we have the 'ip' field even if it's missing in the cached raw state
                const item = { ...rawItem, ...resolveItem(rawItem.id || rawItem.item_id) };
                totalIP += item.ip || 0;
            }
        });

        // Always divide by 7 (the number of combat slots) to ensure removing items lowers the score
        return Math.floor(totalIP / 7);
    }, [equipment]);

    const EquipmentSlot = ({ slot, icon, label, item: rawItem, onClick, onShowInfo, isLocked = false, weaponClass = null }) => {
        // Resolve item to ensure we have latest stats and rarity color (even for Normal items if logic changes, but mostly for _Q items)
        const item = rawItem ? { ...resolveItem(rawItem.id || rawItem.item_id), ...rawItem } : null;

        const tierColor = item ? '#666' : 'var(--glass-bg)';

        // Logic: STRICTLY use rarity color. Tier color does NOT affect border.
        // Normal items (Quality 0) will use their defined rarity color (usually White/#fff).
        const borderColor = item && item.rarityColor ? item.rarityColor : 'var(--border)';
        const hasQuality = (item && item.quality > 0) || (item && item.stars > 0);

        // Upgrade Detection
        const hasUpgrade = useMemo(() => {
            if (isLocked) return false;
            const best = getBestItemForSlot(slot, state.inventory || {}, weaponClass, skills);
            return isBetterItem(best, item);
        }, [slot, state.inventory, item, isLocked, weaponClass, skills]);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'rgba(0,0,0,0.3)',
                    border: `2px solid ${borderColor}`,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    transition: '0.2s',
                    boxShadow: hasQuality ? `0 0 10px ${borderColor}66` : 'none',
                    filter: isLocked ? 'grayscale(0.8) brightness(0.7)' : 'none'
                }}
                    onClick={isLocked ? null : onClick}
                >
                    {isLocked && !item && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: '10px',
                            zIndex: 2
                        }}>
                            <Sword size={20} color="#ff4444" style={{ opacity: 0.6 }} />
                        </div>
                    )}
                    {/* Upgrade Indicator */}
                    {hasUpgrade && (
                        <div style={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            background: '#22c55e', // Green-500
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--panel-bg)',
                            boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                            zIndex: 10,
                            animation: 'pulse 1.5s infinite'
                        }}>
                            <ChevronUp size={14} color="#fff" strokeWidth={3} />
                        </div>
                    )}
                    {item ? (
                        <div style={{ color: tierColor, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 'bold', position: 'absolute', top: 2, left: 4 }}>T{item.tier}</span>
                            {/* Quantidade (especialmente para food) */}
                            {((typeof item.amount === 'object' ? item.amount.amount : item.amount) > 1) && (
                                <span style={{
                                    position: 'absolute',
                                    bottom: 2,
                                    left: 4,
                                    fontSize: '0.7rem',
                                    color: '#fff',
                                    fontWeight: '900',
                                    textShadow: '0 1px 3px rgba(0,0,0,1)'
                                }}>
                                    {typeof item.amount === 'object' ? item.amount.amount : item.amount}
                                </span>
                            )}
                            {/* Se tiver qualidade ou estrelas, mostrar indicadores */}
                            {hasQuality && (
                                <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: '1px' }}>
                                    {Array.from({ length: item.stars || 1 }).map((_, i) => (
                                        <Star key={i} size={10} color={borderColor} fill={borderColor} />
                                    ))}
                                </div>
                            )}
                            {/* Botão de Info (i) */}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 2,
                                    right: 4,
                                    opacity: 0.6,
                                    cursor: 'help'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onShowInfo(item);
                                }}
                            >
                                <Info size={12} color="var(--text-dim)" />
                            </div>
                            <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.icon ? (
                                    <img src={item.icon} style={{ width: item.scale || '100%', height: item.scale || '100%', objectFit: 'contain' }} alt="" />
                                ) : (
                                    <PackageIcon type={item.type} size={24} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ opacity: 0.3, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {icon}
                            <span style={{ fontSize: '0.5rem', fontWeight: 'bold', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                        </div>
                    )}
                </div>
                {item && (
                    <span style={{
                        fontSize: '0.55rem',
                        color: '#bbb',
                        textAlign: 'center',
                        maxWidth: '80px',
                        lineHeight: '1.1',
                        minHeight: '2em', // Reserve space for 2 lines
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}>
                        {item.name}
                    </span>
                )}
            </div>
        );
    };



    const PackageIcon = ({ type, size }) => {
        if (type === 'WEAPON') return <Sword size={size} />;
        if (type === 'ARMOR') return <Shield size={size} />;
        if (type === 'HELMET') return <User size={size} />;
        if (type === 'BOOTS') return <Target size={size} />;
        if (type === 'CAPE') return <Layers size={size} />;
        if (type === 'TOOL_AXE') return <Axe size={size} />;
        if (type === 'TOOL_PICKAXE') return <Pickaxe size={size} />;
        return <Star size={size} />;
    };



    const formatNumber = (num) => {
        return num.toLocaleString('en-US');
    };

    const hunterStats = getProficiencyStats('hunter', calculatedStats.hunterProf);
    const hunterBreakdown = {
        title: 'Hunter Proficiency',
        color: '#22c55e',
        icon: Target,
        level: calculatedStats.hunterProf,
        multipliers: 'Based on Level - Requires BOW',
        stats: [
            { label: 'Damage', value: `+${formatNumber(hunterStats.dmg)}`, subtext: 'Exact Value', icon: <Sword size={18} /> },
            { label: 'Health', value: `+${formatNumber(hunterStats.hp)}`, subtext: 'Exact Value', icon: <Heart size={18} /> },
            { label: 'Defense', value: `+${formatNumber(hunterStats.def || 0)}`, subtext: 'Exact Value', icon: <Shield size={18} /> },
            { label: 'Attack Speed', value: `-${(hunterStats.speedBonus || 0).toFixed(1)}ms`, subtext: 'Exact Value', icon: <Zap size={18} /> }
        ],
        sources: []
    };

    const warriorStats = getProficiencyStats('warrior', calculatedStats.warriorProf);
    const warriorBreakdown = {
        title: 'Warrior Proficiency',
        color: '#ef4444',
        icon: Sword,
        level: calculatedStats.warriorProf,
        multipliers: 'Based on Level - Requires SWORD',
        stats: [
            { label: 'Damage', value: `+${formatNumber(warriorStats.dmg)}`, subtext: 'Exact Value', icon: <Sword size={18} /> },
            { label: 'Health', value: `+${formatNumber(warriorStats.hp)}`, subtext: 'Exact Value', icon: <Heart size={18} /> },
            { label: 'Defense', value: `+${formatNumber(warriorStats.def || 0)}`, subtext: 'Exact Value', icon: <Shield size={18} /> },
            { label: 'Attack Speed', value: `-${(warriorStats.speedBonus || 0).toFixed(1)}ms`, subtext: 'Exact Value', icon: <Zap size={18} /> }
        ],
        sources: []
    };

    const mageStats = getProficiencyStats('mage', calculatedStats.mageProf);
    const mageBreakdown = {
        title: 'Mage Proficiency',
        color: '#3b82f6',
        icon: Star,
        level: calculatedStats.mageProf,
        multipliers: 'Based on Level - Requires STAFF',
        stats: [
            { label: 'Damage', value: `+${formatNumber(mageStats.dmg)}`, subtext: 'Exact Value', icon: <Sword size={18} /> },
            { label: 'Health', value: `+${formatNumber(mageStats.hp)}`, subtext: 'Exact Value', icon: <Heart size={18} /> },
            { label: 'Defense', value: `+${formatNumber(mageStats.def || 0)}`, subtext: 'Exact Value', icon: <Shield size={18} /> },
            { label: 'Attack Speed', value: `-${(mageStats.speedBonus || 0).toFixed(1)}ms`, subtext: 'Exact Value', icon: <Zap size={18} /> }
        ],
        sources: []
    };

    if (!gameState) return <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>Loading data...</div>;

    return (
        <>
            <div className="glass-panel" style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden', // Keeps rounded corners
                borderRadius: '16px',
                background: 'var(--panel-bg)',
                minHeight: 0 // Crucial for nested flex scrolling
            }}>
                <div className="scroll-container" style={{
                    padding: isMobile ? '20px' : '30px',
                    paddingBottom: '130px',
                    overflowY: 'auto',
                    flex: 1
                }}>

                    {/* MOBILE MENU SECTION */}
                    {isMobile && (
                        <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>


                                {/* Theme Toggle */}
                                <button onClick={toggleTheme} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    flex: 1, height: '40px', background: 'var(--accent-soft)',
                                    borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--accent)',
                                    fontSize: '0.75rem', fontWeight: 'bold'
                                }}>
                                    {theme === 'dark' ? (
                                        <><React.Fragment>☀️</React.Fragment> Switch to Light Mode</>
                                    ) : (
                                        <><React.Fragment>🌙</React.Fragment> Switch to Dark Mode</>
                                    )}
                                </button>

                                {/* Discord */}
                                <a href="https://discord.gg/mMrBuBHW5q" target="_blank" rel="noopener noreferrer" style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '40px', height: '40px', background: '#5865F2',
                                    borderRadius: '12px', color: '#fff'
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor">
                                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.4,80.21a105.73,105.73,0,0,0,32.17,16.15,77.7,77.7,0,0,0,6.89-11.11,68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c3.39-28.32-5.42-52.09-23.75-72.13ZM42.45,65.69C36.18,65.69,31,60,31,53s5.07-12.72,11.41-12.72S54,46,53.86,53,48.81,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.72,11.44-12.72S96.11,46,96,53,91,65.69,84.69,65.69Z" />
                                    </svg>
                                </a>
                            </div>



                            {/* Membership Status for Mobile */}
                            {gameState?.state?.membership?.active && gameState?.state?.membership?.expiresAt > Date.now() && (
                                <div style={{
                                    marginTop: '15px',
                                    background: 'var(--panel-bg)',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    border: '1px solid rgba(34, 197, 94, 0.2)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#4ade80' }}>Premium</span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                                            Expires: {new Date(gameState.state.membership.expiresAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.65rem', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>ACTIVE</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Header com IP - HUB Style */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '20px',
                        marginBottom: '30px'
                    }}>
                        <div>
                            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {name}
                                {state.pendingNameChange && (
                                    <button
                                        onClick={() => onOpenRenameModal && onOpenRenameModal()}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#fbbf24', // Yellow-400
                                            padding: 0,
                                            display: 'flex'
                                        }}
                                        title="Rename Character"
                                    >
                                        <Edit size={18} />
                                    </button>
                                )}
                            </h2>
                            {/* Title Dropdown with Auto-Width */}
                            <div style={{
                                display: 'grid',
                                alignItems: 'center',
                                marginTop: '4px',
                                position: 'relative',
                                width: 'fit-content'
                            }}>
                                {/* Ghost element to force width */}
                                <div style={{
                                    gridArea: '1 / 1',
                                    visibility: 'hidden',
                                    fontSize: '0.65rem',
                                    fontWeight: '900',
                                    letterSpacing: '1.5px',
                                    paddingRight: '20px', // Space for Chevron
                                    whiteSpace: 'nowrap'
                                }}>
                                    {selectedTitle || 'No Title'}
                                </div>

                                <select
                                    value={selectedTitle || 'None'}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                    style={{
                                        gridArea: '1 / 1',
                                        fontSize: '0.65rem',
                                        fontWeight: '900',
                                        letterSpacing: '1.5px',
                                        background: !selectedTitle || selectedTitle === 'None'
                                            ? 'var(--text-dim)'
                                            : selectedTitle === 'Eternal Legend'
                                                ? 'linear-gradient(90deg, #ffd700, #ff8c00)'
                                                : selectedTitle === 'Dungeon Master'
                                                    ? 'linear-gradient(90deg, #a855f7, #6366f1)'
                                                    : selectedTitle === 'Resource Tycoon'
                                                        ? 'linear-gradient(90deg, #22c55e, #10b981)'
                                                        : 'linear-gradient(90deg, #60a5fa, #3b82f6)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        border: 'none',
                                        padding: '4px 20px 4px 0px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        appearance: 'none',
                                        width: '100%',
                                        textAlign: 'left',
                                        opacity: (!selectedTitle || selectedTitle === 'None') ? 0.5 : 1,
                                        zIndex: 2
                                    }}
                                >
                                    <option value="None">No Title</option>
                                    {(gameState?.state?.unlockedTitles || []).map(title => (
                                        <option key={title} value={title}>
                                            {title}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} style={{
                                    gridArea: '1 / 1',
                                    justifySelf: 'end',
                                    pointerEvents: 'none',
                                    color: 'var(--text-dim)',
                                    opacity: 0.5,
                                    zIndex: 1
                                }} />
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            {/* Item Power */}
                            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#d4af37', textShadow: '0 0 15px rgba(212, 175, 55, 0.2)' }}>{avgIP}</div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: '900', letterSpacing: '1px' }}>ITEM POWER</div>
                        </div>
                    </div>

                    {/* Guest Account Linking Banner */}
                    {(session?.user?.is_anonymous || showEmailLink || showOtpInput) && (
                        <div style={{
                            marginBottom: '25px',
                            padding: '15px',
                            background: 'rgba(212, 175, 55, 0.05)',
                            border: '1px solid rgba(212, 175, 55, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Info size={18} color="#d4af37" />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#d4af37' }}>Guest Account</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Link your account with Google to never lose your progress!</span>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    const { error } = await supabase.auth.linkIdentity({
                                        provider: 'google',
                                        options: {
                                            redirectTo: window.location.origin
                                        }
                                    });
                                    if (error) {
                                        console.error('Linking error:', error.message);
                                        alert('Failed to link account: ' + error.message);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    transition: '0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                                onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18">
                                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.248h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.248c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                                    <path fill="#FBBC05" d="M3.964 10.719c-.18-.54-.282-1.117-.282-1.719s.102-1.179.282-1.719V4.949H.957C.347 6.169 0 7.548 0 9s.347 2.831.957 4.051l3.007-2.332z" />
                                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.949L3.964 7.28c.708-2.127 2.692-3.711 5.036-3.711z" />
                                </svg>
                                LINK WITH GOOGLE
                            </button>

                            {/* Email Linking Toggle */}
                            {!showEmailLink && session?.user?.is_anonymous && (
                                <button
                                    onClick={() => setShowEmailLink(true)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: '0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                >
                                    <Edit size={16} />
                                    LINK WITH EMAIL
                                </button>
                            )}

                            {/* Email Linking Form */}
                            {showEmailLink && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}
                                >
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={linkEmail}
                                        onChange={(e) => { setLinkEmail(e.target.value); setLinkError(''); }}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            background: 'rgba(0,0,0,0.3)',
                                            color: '#fff',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                    <input
                                        type="password"
                                        placeholder="Choose a password"
                                        value={linkPassword}
                                        onChange={(e) => setLinkPassword(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            background: 'rgba(0,0,0,0.3)',
                                            color: '#fff',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => setShowEmailLink(false)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: 'transparent',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                color: 'var(--text-dim)',
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            CANCEL
                                        </button>
                                        <button
                                            disabled={isLinking || !linkEmail || !linkPassword}
                                            onClick={async () => {
                                                const emailToLink = linkEmail.trim().toLowerCase();
                                                const passwordToLink = linkPassword.trim();

                                                if (!emailToLink) {
                                                    setLinkError("Please enter a valid email.");
                                                    return;
                                                }
                                                if (passwordToLink.length < 6) {
                                                    setLinkError("Password must be at least 6 characters.");
                                                    return;
                                                }

                                                setIsLinking(true);
                                                // 1. Update user with email/password (triggers email change verification)
                                                console.log("Attempting to link with:", emailToLink);
                                                const { data, error } = await supabase.auth.updateUser({
                                                    email: emailToLink,
                                                    password: passwordToLink
                                                });

                                                if (error) {
                                                    console.error("Link error:", error);
                                                    if (error.message.includes("rate limit")) {
                                                        setLinkError("Too many attempts. Please wait a minute before trying again.");
                                                    } else {
                                                        setLinkError('Error initiating link: ' + error.message);
                                                    }
                                                    setIsLinking(false);
                                                } else {
                                                    // Check if email was updated immediately (no confirmation required)
                                                    if (data?.user?.email === linkEmail) {
                                                        setLinkSuccess('Account linked successfully! (Instant verified)');
                                                        setLinkError('');
                                                        setTimeout(() => {
                                                            setShowEmailLink(false);
                                                            setShowOtpInput(false);
                                                            setLinkEmail('');
                                                            setLinkPassword('');
                                                            setOtpCode('');
                                                            setLinkSuccess('');
                                                            setIsLinking(false);
                                                        }, 2500);
                                                    } else {
                                                        // 2. Show OTP Input
                                                        setLinkError('');
                                                        setShowOtpInput(true);
                                                        setIsLinking(false);
                                                    }
                                                }
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: 'var(--accent)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: '#000',
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem',
                                                cursor: isLinking ? 'wait' : 'pointer',
                                                opacity: (isLinking || !linkEmail || !linkPassword) ? 0.6 : 1,
                                                display: showOtpInput ? 'none' : 'block'
                                            }}
                                        >
                                            {isLinking ? 'SENDING CODE...' : 'SEND CODE'}
                                        </button>
                                    </div>

                                    {/* Feedback Messages */}
                                    {linkError && (
                                        <div style={{ color: '#ff6b6b', fontSize: '0.8rem', textAlign: 'center', marginTop: '10px', background: 'rgba(255, 107, 107, 0.1)', padding: '8px', borderRadius: '8px' }}>
                                            {linkError}
                                        </div>
                                    )}
                                    {linkSuccess && (
                                        <div style={{ color: '#4ade80', fontSize: '0.8rem', textAlign: 'center', marginTop: '10px', background: 'rgba(74, 222, 128, 0.1)', padding: '8px', borderRadius: '8px' }}>
                                            {linkSuccess}
                                        </div>
                                    )}

                                    {/* OTP Input Section */}
                                    {showOtpInput && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent)' }}>
                                                Confirmation code sent to <b>{linkEmail}</b>.<br />Please enter it below.
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="123456"
                                                value={otpCode}
                                                maxLength={6}
                                                onChange={(e) => setOtpCode(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--accent)',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    color: '#fff',
                                                    fontSize: '1.2rem',
                                                    textAlign: 'center',
                                                    letterSpacing: '5px',
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                            <button
                                                disabled={isLinking || otpCode.length < 6}
                                                onClick={async () => {
                                                    setIsLinking(true);
                                                    // 3. Verify OTP for email change
                                                    const { data, error } = await supabase.auth.verifyOtp({
                                                        email: linkEmail,
                                                        token: otpCode,
                                                        type: 'email_change'
                                                    });

                                                    if (error) {
                                                        setLinkError('Verification failed: ' + error.message);
                                                        setIsLinking(false);
                                                    } else {
                                                        setLinkSuccess('Account linked successfully! Your guest account is now permanent.');
                                                        setLinkError('');
                                                        // Delay close to show success message
                                                        setTimeout(() => {
                                                            setShowEmailLink(false);
                                                            setShowOtpInput(false);
                                                            setLinkEmail('');
                                                            setLinkPassword('');
                                                            setOtpCode('');
                                                            setLinkSuccess('');
                                                            setIsLinking(false);
                                                        }, 2000);
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: '#4ade80',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    color: '#000',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.9rem',
                                                    cursor: isLinking ? 'wait' : 'pointer',
                                                    opacity: (isLinking || otpCode.length < 6) ? 0.6 : 1,
                                                    boxShadow: '0 0 15px rgba(74, 222, 128, 0.3)'
                                                }}
                                            >
                                                {isLinking ? 'VERIFYING...' : 'VERIFY & LINK'}
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        marginBottom: '25px',
                        padding: '4px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)'
                    }}>
                        <button
                            onClick={() => setActiveProfileTab('EQUIPMENT')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeProfileTab === 'EQUIPMENT' ? 'var(--accent-soft)' : 'transparent',
                                color: activeProfileTab === 'EQUIPMENT' ? 'var(--accent)' : 'var(--text-dim)',
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: '0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Sword size={16} /> EQUIPMENT
                        </button>
                        <button
                            onClick={() => setActiveProfileTab('RUNES')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeProfileTab === 'RUNES' ? 'var(--accent-soft)' : 'transparent',
                                color: activeProfileTab === 'RUNES' ? 'var(--accent)' : 'var(--text-dim)',
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: '0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Zap size={16} /> RUNES
                        </button>
                    </div>

                    {activeProfileTab === 'EQUIPMENT' ? (
                        <>

                            {/* Barra de Vida - Sophisticated */}
                            <div style={{ marginBottom: '35px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '8px', fontWeight: '900', letterSpacing: '1px', color: '#888' }}>
                                    <span>VITALITY</span>
                                    <span style={{ color: 'var(--text-main)' }}>{Math.floor(stats.hp)} / {Math.floor(stats.maxHp)} HP</span>
                                </div>
                                <div style={{ background: 'rgba(255, 0, 0, 0.05)', height: '6px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 0, 0, 0.1)' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}
                                        style={{ height: '100%', background: 'linear-gradient(90deg, #ff4d4d, #b30000)' }}
                                    />
                                </div>
                            </div>

                            {/* Grid de Equipamentos - Compact Layout */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, auto)',
                                gap: isMobile ? '10px' : '15px',
                                marginBottom: '40px',
                                justifyContent: 'center',
                                padding: isMobile ? '10px 5px' : '25px',
                            }}>
                                <EquipmentSlot slot="cape" icon={<Layers size={20} />} label="CAPE" item={equipment.cape} onClick={() => setSelectedSlot('cape')} onShowInfo={onShowInfo} isLocked={!hasWeapon} weaponClass={currentWeaponClass} />
                                <EquipmentSlot slot="helmet" icon={<User size={20} />} label="HEAD" item={equipment.helmet} onClick={() => setSelectedSlot('helmet')} onShowInfo={onShowInfo} isLocked={!hasWeapon} weaponClass={currentWeaponClass} />
                                <EquipmentSlot slot="food" icon={<Apple size={20} />} label="FOOD" item={equipment.food} onClick={() => setSelectedSlot('food')} onShowInfo={onShowInfo} />

                                <EquipmentSlot slot="gloves" icon={<Shield size={20} />} label="HANDS" item={equipment.gloves} onClick={() => setSelectedSlot('gloves')} onShowInfo={onShowInfo} isLocked={!hasWeapon} weaponClass={currentWeaponClass} />
                                <EquipmentSlot slot="chest" icon={<Shield size={20} />} label="CHEST" item={equipment.chest} onClick={() => setSelectedSlot('chest')} onShowInfo={onShowInfo} isLocked={!hasWeapon} weaponClass={currentWeaponClass} />
                                <EquipmentSlot slot="offHand" icon={<Target size={20} />} label="OFF-HAND" item={equipment.offHand} onClick={() => setSelectedSlot('offHand')} onShowInfo={onShowInfo} isLocked={!hasWeapon} weaponClass={currentWeaponClass} />

                                <EquipmentSlot slot="mainHand" icon={<Sword size={20} />} label="WEAPON" item={equipment.mainHand} onClick={() => setSelectedSlot('mainHand')} onShowInfo={onShowInfo} weaponClass={currentWeaponClass} />
                                <EquipmentSlot slot="boots" icon={<Target size={20} />} label="FEET" item={equipment.boots} onClick={() => setSelectedSlot('boots')} onShowInfo={onShowInfo} isLocked={!hasWeapon} weaponClass={currentWeaponClass} />
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '12px',
                                    background: 'var(--bg-dark)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.15)',
                                    cursor: 'not-allowed'
                                }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>LOCKED</div>
                                </div>
                            </div>

                            {/* Gathering Tools - New Section */}
                            <div style={{ marginBottom: '40px' }}>
                                <h4 style={{ color: 'var(--accent, #d4af37)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem', textAlign: 'center', letterSpacing: '1px' }}>Gathering Tools</h4>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    flexWrap: 'wrap'
                                }}>
                                    <EquipmentSlot slot="tool_axe" icon={<Axe size={20} />} label="AXE" item={equipment.tool_axe} onClick={() => setSelectedSlot('tool_axe')} onShowInfo={onShowInfo} />
                                    <EquipmentSlot slot="tool_pickaxe" icon={<Pickaxe size={20} />} label="PICKAXE" item={equipment.tool_pickaxe} onClick={() => setSelectedSlot('tool_pickaxe')} onShowInfo={onShowInfo} />
                                    <EquipmentSlot slot="tool_sickle" icon={<Scissors size={20} />} label="SICKLE" item={equipment.tool_sickle} onClick={() => setSelectedSlot('tool_sickle')} onShowInfo={onShowInfo} />
                                    <EquipmentSlot slot="tool_knife" icon={<Sword size={20} style={{ transform: 'rotate(45deg)' }} />} label="KNIFE" item={equipment.tool_knife} onClick={() => setSelectedSlot('tool_knife')} onShowInfo={onShowInfo} />
                                    <EquipmentSlot slot="tool_rod" icon={<Anchor size={20} />} label="ROD" item={equipment.tool_rod} onClick={() => setSelectedSlot('tool_rod')} onShowInfo={onShowInfo} />
                                    <EquipmentSlot slot="tool_pouch" icon={<ShoppingBag size={20} />} label="POUCH" item={equipment.tool_pouch} onClick={() => setSelectedSlot('tool_pouch')} onShowInfo={onShowInfo} />
                                </div>
                            </div>



                            {/* Attributes - Clean HUB Style */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-around',
                                background: 'var(--accent-soft)',
                                padding: '20px',
                                borderRadius: '12px',
                                marginBottom: '30px',
                                border: '1px solid var(--border)'
                            }}>
                                {[
                                    { label: 'Warrior Prof.', value: stats.warriorProf, color: '#ff4444', desc: warriorBreakdown, key: 'warrior', weapon: 'Sword' },
                                    { label: 'Hunter Prof.', value: stats.hunterProf, color: '#4caf50', desc: hunterBreakdown, key: 'hunter', weapon: 'Bow' },
                                    { label: 'Mage Prof.', value: stats.mageProf, color: '#2196f3', desc: mageBreakdown, key: 'mage', weapon: 'Staff' }
                                ].map(stat => {
                                    const isActive = stats.activeProf === stat.key;

                                    // Calculate XP Progress
                                    const skillKey = stat.key === 'warrior' ? 'WARRIOR_PROFICIENCY'
                                        : stat.key === 'hunter' ? 'HUNTER_PROFICIENCY'
                                            : 'MAGE_PROFICIENCY';

                                    const rawSkill = skills[skillKey] || { xp: 0, nextLevelXp: 100, level: 1 };

                                    // Fallback if nextLevelXp is missing (old data)
                                    const nextLvlXp = rawSkill.nextLevelXp || calculateNextLevelXP(rawSkill.level);

                                    const skillData = {
                                        ...rawSkill,
                                        nextLevelXp: nextLvlXp
                                    };

                                    const progress = Math.min(100, Math.max(0, (skillData.xp / skillData.nextLevelXp) * 100)) || 0;

                                    return (
                                        <div key={stat.label} style={{
                                            textAlign: 'center',
                                            opacity: isActive ? 1 : 0.4,
                                            transition: 'all 0.3s ease',
                                            padding: isMobile ? '8px 4px' : '10px 14px',
                                            borderRadius: '10px',
                                            background: isActive ? `${stat.color}15` : 'transparent',
                                            border: isActive ? `2px solid ${stat.color}` : '2px solid transparent',
                                            boxShadow: isActive ? `0 0 12px ${stat.color}40, inset 0 0 8px ${stat.color}10` : 'none',
                                            transform: isActive ? (isMobile ? 'scale(1.02)' : 'scale(1.08)') : (isMobile ? 'scale(0.95)' : 'scale(0.92)'),
                                            flex: 1,
                                            minWidth: 0, // Prevent flex item overflow
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div
                                                onClick={() => setProficiencyModal(stat.desc)}
                                                style={{
                                                    fontSize: isMobile ? '0.5rem' : '0.55rem',
                                                    color: isActive ? stat.color : '#555',
                                                    fontWeight: '900',
                                                    letterSpacing: '1px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap' // Prevent label wrapping
                                                }}
                                            >
                                                {stat.label.replace(' Prof.', '')} {/* Shorten label on mobile logic if needed, but CSS nowrap helps */}
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <Info size={isMobile ? 8 : 10} color={isActive ? stat.color : '#555'} />
                                                </div>
                                            </div>
                                            <div style={{
                                                fontSize: isActive ? (isMobile ? '1.4rem' : '1.8rem') : (isMobile ? '1.1rem' : '1.4rem'),
                                                fontWeight: '900',
                                                color: isActive ? stat.color : '#555',
                                                transition: 'all 0.3s',
                                                zIndex: 2,
                                                position: 'relative'
                                            }}>
                                                {parseFloat(Number(stat.value).toFixed(2))}
                                            </div>


                                            {/* XP Bar Background */}
                                            <div style={{
                                                marginTop: '4px',
                                                marginBottom: '2px', // Reduced margin
                                                height: '4px',
                                                background: 'rgba(0,0,0,0.2)',
                                                borderRadius: '2px',
                                                overflow: 'hidden',
                                                width: '80%',
                                                margin: '4px auto'
                                            }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ duration: 0.5 }}
                                                    style={{
                                                        height: '100%',
                                                        background: stat.color,
                                                        borderRadius: '2px'
                                                    }}
                                                />
                                            </div>

                                            {/* XP Text */}
                                            {/* XP Text */}
                                            <div style={{
                                                fontSize: '0.65rem',
                                                color: isActive ? stat.color : '#888',
                                                fontWeight: '900',
                                                marginTop: '2px',
                                                marginBottom: '6px',
                                                textShadow: isMobile ? 'none' : '0 1px 2px rgba(0,0,0,0.8)',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {formatNumber(Math.floor(skillData.xp))} / {formatNumber(Math.floor(skillData.nextLevelXp))} XP
                                            </div>

                                            {
                                                isActive && (
                                                    <div style={{
                                                        fontSize: isMobile ? '0.45rem' : '0.5rem',
                                                        color: stat.color,
                                                        fontWeight: '700',
                                                        letterSpacing: '1px'
                                                    }}>
                                                        {isMobile ? 'ACTIVE' : '⚔ ACTIVE'}
                                                    </div>
                                                )
                                            }
                                            {
                                                !isActive && (
                                                    <div style={{
                                                        fontSize: isMobile ? '0.4rem' : '0.45rem',
                                                        color: '#444',
                                                        /* marginTop: '3px', removed for space */
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        Equip {stat.weapon}
                                                    </div>
                                                )
                                            }
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Combat & Action Stats - New Section */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '15px',
                                background: 'rgba(0,0,0,0.2)',
                                padding: '12px',
                                borderRadius: '12px',
                                marginBottom: '30px',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setBreakdownModal({ type: 'DAMAGE', value: Math.floor(stats.damage) })}>
                                    <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                        <Sword size={10} color="#ff4444" /> DMG
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)' }}>{Math.floor(stats.damage)}</div>
                                </div>
                                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setBreakdownModal({ type: 'DEFENSE', value: Math.floor(stats.defense) })}>
                                    <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                        <Shield size={10} color="#4caf50" /> DEF
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                                        {Math.floor(stats.defense)}
                                        <span style={{ fontSize: '0.65rem', color: '#4caf50', fontWeight: '700' }}>({Math.min(75, stats.defense / 100).toFixed(1)}%)</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setBreakdownModal({ type: 'SPEED', value: Math.floor(stats.attackSpeed) })}>
                                    <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                        <Zap size={10} color="#2196f3" /> SPEED
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)' }}>
                                        {(1000 / stats.attackSpeed).toFixed(1)} h/s
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setBreakdownModal({ type: 'CRIT', value: stats.burstChance })}>
                                    <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                        <Star size={10} color="#f59e0b" /> CRIT
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)' }}>
                                        {(stats.burstChance || 0).toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '30px' }}>
                                <h4 style={{ color: 'var(--text-main)', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '2px', opacity: 0.8, textAlign: 'center' }}>Skill Efficiency</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '15px' }}>
                                        <EfficiencyCard
                                            title="Gathering"
                                            icon={<Pickaxe size={14} color="#fcd34d" />}
                                            color="rgba(252, 211, 77, 0.1)"
                                            items={[
                                                { id: 'WOOD', label: 'Woodcutting' },
                                                { id: 'ORE', label: 'Mining' },
                                                { id: 'HIDE', label: 'Skinning' },
                                                { id: 'FIBER', label: 'Fiber' },
                                                { id: 'FISH', label: 'Fishing' },
                                                { id: 'HERB', label: 'Herbalism' }
                                            ]}
                                            stats={stats}
                                            onShowBreakdown={(id, total) => setBreakdownModal({ type: 'EFFICIENCY', value: { id, total } })}
                                        />
                                        <EfficiencyCard
                                            title="Refining"
                                            icon={<Hammer size={14} color="#38bdf8" />}
                                            color="rgba(56, 189, 248, 0.1)"
                                            items={[
                                                { id: 'PLANK', label: 'Planks' },
                                                { id: 'METAL', label: 'Bars' },
                                                { id: 'LEATHER', label: 'Leathers' },
                                                { id: 'CLOTH', label: 'Cloth' },
                                                { id: 'EXTRACT', label: 'Distillation' }
                                            ]}
                                            stats={stats}
                                            onShowBreakdown={(id, total) => setBreakdownModal({ type: 'EFFICIENCY', value: { id, total } })}
                                        />
                                        <EfficiencyCard
                                            title="Crafting"
                                            icon={<EfficiencyIcon size={14} color="#a78bfa" />}
                                            color="rgba(167, 139, 250, 0.1)"
                                            items={[
                                                { id: 'WARRIOR', label: 'Warrior Gear' },
                                                { id: 'HUNTER', label: 'Hunter Gear' },
                                                { id: 'MAGE', label: 'Mage Gear' },
                                                { id: 'COOKING', label: 'Cooking' },
                                                { id: 'ALCHEMY', label: 'Alchemy' },
                                                { id: 'TOOLS', label: 'Tools' }
                                            ]}
                                            stats={stats}
                                            onShowBreakdown={(id, total) => setBreakdownModal({ type: 'EFFICIENCY', value: { id, total } })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Account Management Section */}
                            <div style={{ borderTop: '1px solid var(--border)', marginTop: '40px', paddingTop: '30px' }}>
                                <h4 style={{ color: 'var(--text-main)', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '2px', opacity: 0.8 }}>Account Settings</h4>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '15px', lineHeight: '1.4' }}>
                                        {isGoogleLinked
                                            ? "Your account is successfully linked to Google. You can use one-click login anytime."
                                            : "Link your Google account to enable one-click login and secure your progress. This is recommended if you registered with an email/password."}
                                    </p>

                                    {isGoogleLinked ? (
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 20px',
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                            borderRadius: '8px',
                                            color: '#4ade80',
                                            fontSize: '0.85rem',
                                            fontWeight: '600'
                                        }}>
                                            <svg width="18" height="18" viewBox="0 0 18 18">
                                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.248h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.248c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                                                <path fill="#FBBC05" d="M3.964 10.719c-.18-.54-.282-1.117-.282-1.719s.102-1.179.282-1.719V4.949H.957C.347 6.169 0 7.548 0 9s.347 2.831.957 4.051l3.007-2.332z" />
                                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.949L3.964 7.28c.708-2.127 2.692-3.711 5.036-3.711z" />
                                            </svg>
                                            GOOGLE ACCOUNT LINKED
                                        </div>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase.auth.linkIdentity({
                                                    provider: 'google',
                                                    options: { redirectTo: window.location.origin }
                                                });
                                                if (error) alert(error.message);
                                                else alert('Verification email sent or linking process started. Follow the instructions to complete.');
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 20px',
                                                background: 'var(--bg-dark)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                color: 'var(--text-main)',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: '0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 18 18">
                                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.248h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.248c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                                                <path fill="#FBBC05" d="M3.964 10.719c-.18-.54-.282-1.117-.282-1.719s.102-1.179.282-1.719V4.949H.957C.347 6.169 0 7.548 0 9s.347 2.831.957 4.051l3.007-2.332z" />
                                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.949L3.964 7.28c.708-2.127 2.692-3.711 5.036-3.711z" />
                                            </svg>
                                            LINK GOOGLE ACCOUNT
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ width: '100%' }}>
                            {/* Rune Sub-Tabs */}
                            <div style={{
                                display: 'flex',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '12px',
                                padding: '4px',
                                marginBottom: '25px',
                                border: '1px solid var(--border)'
                            }}>
                                {['GATHERING', 'REFINING', 'CRAFTING', 'COMBAT'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setActiveRuneTab(t)}
                                        style={{
                                            flex: 1,
                                            padding: '10px 5px',
                                            border: 'none',
                                            background: activeRuneTab === t ? 'var(--accent)' : 'transparent',
                                            color: activeRuneTab === t ? '#000' : '#888',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '0.65rem',
                                            fontWeight: '900',
                                            transition: '0.2s',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px'
                                        }}
                                    >
                                        {t.replace('GATHERING', 'GATHER')}
                                    </button>
                                ))}
                            </div>

                            {activeRuneTab === 'GATHERING' ? (
                                <>
                                    <h3 style={{
                                        color: 'var(--accent)',
                                        fontSize: '1.2rem',
                                        fontWeight: '900',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase',
                                        marginBottom: '25px',
                                        textAlign: 'center',
                                        borderBottom: '1px solid var(--border)',
                                        paddingBottom: '10px'
                                    }}>
                                        Gathering Runes
                                    </h3>

                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '30px'
                                    }}>
                                        {[
                                            { id: 'WOOD', label: 'Woodcutting', icon: <Axe size={16} /> },
                                            { id: 'ORE', label: 'Mining', icon: <Pickaxe size={16} /> },
                                            { id: 'HIDE', label: 'Skinning', icon: <Sword size={16} style={{ transform: 'rotate(45deg)' }} /> },
                                            { id: 'FIBER', label: 'Fiber', icon: <Scissors size={16} /> },
                                            { id: 'HERB', label: 'Herbalism', icon: <Apple size={16} /> },
                                            { id: 'FISH', label: 'Fishing', icon: <Anchor size={16} /> }
                                        ].map(category => (
                                            <div key={category.id} style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: '16px',
                                                padding: '20px',
                                                border: '1px solid var(--border)'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    marginBottom: '15px',
                                                    color: '#888',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px'
                                                }}>
                                                    {category.icon} {category.label}
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                                    gap: '15px'
                                                }}>
                                                    <EquipmentSlot
                                                        slot={`rune_${category.id}_XP`}
                                                        icon={<Zap size={20} />}
                                                        label="XP"
                                                        item={equipment[`rune_${category.id}_XP`]}
                                                        onClick={() => setSelectedSlot(`rune_${category.id}_XP`)}
                                                        onShowInfo={onShowInfo}
                                                    />
                                                    <EquipmentSlot
                                                        slot={`rune_${category.id}_COPY`}
                                                        icon={<Layers size={20} />}
                                                        label="DUPLIC."
                                                        item={equipment[`rune_${category.id}_COPY`]}
                                                        onClick={() => setSelectedSlot(`rune_${category.id}_COPY`)}
                                                        onShowInfo={onShowInfo}
                                                    />
                                                    <EquipmentSlot
                                                        slot={`rune_${category.id}_SPEED`}
                                                        icon={<Zap size={20} />}
                                                        label="AUTO-REF"
                                                        item={equipment[`rune_${category.id}_SPEED`]}
                                                        onClick={() => setSelectedSlot(`rune_${category.id}_SPEED`)}
                                                        onShowInfo={onShowInfo}
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        {/* Rune Buff Summary */}
                                        <RuneBuffSummary activeRuneBuffs={Object.fromEntries(
                                            Object.entries(activeRuneBuffs).filter(([act]) =>
                                                ['WOOD', 'ORE', 'HIDE', 'FIBER', 'HERB', 'FISH'].includes(act)
                                            )
                                        )} />
                                    </div>
                                </>
                            ) : activeRuneTab === 'REFINING' ? (
                                <>
                                    <h3 style={{
                                        color: 'var(--accent)',
                                        fontSize: '1.2rem',
                                        fontWeight: '900',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase',
                                        marginBottom: '25px',
                                        textAlign: 'center',
                                        borderBottom: '1px solid var(--border)',
                                        paddingBottom: '10px'
                                    }}>
                                        Refining Runes
                                    </h3>

                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '30px'
                                    }}>
                                        {[
                                            { id: 'METAL', label: 'Bars', icon: <Layers size={16} /> },
                                            { id: 'PLANK', label: 'Planks', icon: <Axe size={16} /> },
                                            { id: 'LEATHER', label: 'Leather', icon: <Sword size={16} style={{ transform: 'rotate(45deg)' }} /> },
                                            { id: 'CLOTH', label: 'Cloth', icon: <Scissors size={16} /> },
                                            { id: 'EXTRACT', label: 'Extracts', icon: <Apple size={16} /> }
                                        ].map(category => (
                                            <div key={category.id} style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: '16px',
                                                padding: '20px',
                                                border: '1px solid var(--border)'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    marginBottom: '15px',
                                                    color: '#888',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px'
                                                }}>
                                                    {category.icon} {category.label}
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                                    gap: '15px'
                                                }}>
                                                    <EquipmentSlot
                                                        slot={`rune_${category.id}_XP`}
                                                        icon={<Zap size={20} />}
                                                        label="XP"
                                                        item={equipment[`rune_${category.id}_XP`]}
                                                        onClick={() => setSelectedSlot(`rune_${category.id}_XP`)}
                                                        onShowInfo={onShowInfo}
                                                    />
                                                    <EquipmentSlot
                                                        slot={`rune_${category.id}_COPY`}
                                                        icon={<Layers size={20} />}
                                                        label="DUPLIC."
                                                        item={equipment[`rune_${category.id}_COPY`]}
                                                        onClick={() => setSelectedSlot(`rune_${category.id}_COPY`)}
                                                        onShowInfo={onShowInfo}
                                                    />
                                                    <EquipmentSlot
                                                        slot={`rune_${category.id}_EFF`}
                                                        icon={<Zap size={20} />}
                                                        label="EFFICIENCY"
                                                        item={equipment[`rune_${category.id}_EFF`]}
                                                        onClick={() => setSelectedSlot(`rune_${category.id}_EFF`)}
                                                        onShowInfo={onShowInfo}
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        {/* Rune Buff Summary */}
                                        <RuneBuffSummary activeRuneBuffs={Object.fromEntries(
                                            Object.entries(activeRuneBuffs).filter(([act]) =>
                                                ['METAL', 'PLANK', 'LEATHER', 'CLOTH', 'EXTRACT'].includes(act)
                                            )
                                        )} />
                                    </div>
                                </>
                            ) : activeRuneTab === 'CRAFTING' ? (
                                <>
                                    <h3 style={{
                                        color: 'var(--accent)',
                                        fontSize: '1.2rem',
                                        fontWeight: '900',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase',
                                        marginBottom: '25px',
                                        textAlign: 'center',
                                        borderBottom: '1px solid var(--border)',
                                        paddingBottom: '10px'
                                    }}>
                                        Crafting Runes
                                    </h3>

                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '30px'
                                    }}>
                                        {[
                                            { id: 'WARRIOR', label: 'Warrior', icon: <Sword size={16} /> },
                                            { id: 'HUNTER', label: 'Hunter', icon: <Target size={16} /> },
                                            { id: 'MAGE', label: 'Mage', icon: <Star size={16} /> },
                                            { id: 'TOOLS', label: 'Tools', icon: <Pickaxe size={16} /> },
                                            { id: 'COOKING', label: 'Cooking', icon: <Apple size={16} /> },
                                            { id: 'ALCHEMY', label: 'Alchemy', icon: <Zap size={16} /> }
                                        ].map(category => (
                                            <div key={category.id} style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: '16px',
                                                padding: '20px',
                                                border: '1px solid var(--border)'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    marginBottom: '15px',
                                                    color: '#888',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px'
                                                }}>
                                                    {category.icon} {category.label}
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                                    gap: '15px'
                                                }}>
                                                    <EquipmentSlot
                                                        slot={`rune_${category.id}_XP`}
                                                        icon={<Zap size={20} />}
                                                        label="XP"
                                                        item={equipment[`rune_${category.id}_XP`]}
                                                        onClick={() => setSelectedSlot(`rune_${category.id}_XP`)}
                                                        onShowInfo={onShowInfo}
                                                    />
                                                    <EquipmentSlot
                                                        slot={`rune_${category.id}_COPY`}
                                                        icon={<Layers size={20} />}
                                                        label="DUPLIC."
                                                        item={equipment[`rune_${category.id}_COPY`]}
                                                        onClick={() => setSelectedSlot(`rune_${category.id}_COPY`)}
                                                        onShowInfo={onShowInfo}
                                                    />
                                                    <EquipmentSlot
                                                        slot={`rune_${category.id}_EFF`}
                                                        icon={<Zap size={20} />}
                                                        label="EFFICIENCY"
                                                        item={equipment[`rune_${category.id}_EFF`]}
                                                        onClick={() => setSelectedSlot(`rune_${category.id}_EFF`)}
                                                        onShowInfo={onShowInfo}
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        {/* Rune Buff Summary */}
                                        <RuneBuffSummary activeRuneBuffs={Object.fromEntries(
                                            Object.entries(activeRuneBuffs).filter(([act]) =>
                                                ['WARRIOR', 'HUNTER', 'MAGE', 'TOOLS', 'COOKING', 'ALCHEMY'].includes(act)
                                            )
                                        )} />
                                    </div>
                                </>
                            ) : activeRuneTab === 'COMBAT' ? (
                                <>
                                    <h3 style={{
                                        color: 'var(--accent)',
                                        fontSize: '1.2rem',
                                        fontWeight: '900',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase',
                                        marginBottom: '25px',
                                        textAlign: 'center',
                                        borderBottom: '1px solid var(--border)',
                                        paddingBottom: '10px'
                                    }}>
                                        Combat Runes
                                    </h3>

                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '30px'
                                    }}>
                                        <div style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '16px',
                                            padding: '20px',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                marginBottom: '15px',
                                                color: '#888',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px'
                                            }}>
                                                <Sword size={16} /> Attack
                                            </div>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(4, 1fr)',
                                                gap: '10px'
                                            }}>
                                                {[
                                                    { slot: 'rune_ATTACK_ATTACK', label: 'DAMAGE', icon: <Sword size={20} /> },
                                                    { slot: 'rune_ATTACK_ATTACK_SPEED', label: 'SPEED', icon: <Zap size={20} /> },
                                                    { slot: 'rune_ATTACK_SAVE_FOOD', label: 'CONSERV.', icon: <Heart size={20} /> },
                                                    { slot: 'rune_ATTACK_BURST', label: 'BURST', icon: <Zap size={20} /> }
                                                ].map(({ slot, label, icon }) => {
                                                    const isEquipped = !!equipment[slot];
                                                    const activeCombatRunes = Object.keys(equipment).filter(k => k.startsWith('rune_ATTACK_') && equipment[k]).length;
                                                    const isMaxRunes = !isEquipped && activeCombatRunes >= 3;
                                                    const isLocked = isMaxRunes;
                                                    const isLockedByWeapon = false;

                                                    return (
                                                        <div key={slot} style={{ opacity: isLocked ? 0.5 : 1, position: 'relative' }}>
                                                            <EquipmentSlot
                                                                slot={slot}
                                                                icon={icon}
                                                                label={label}
                                                                item={equipment[slot]}
                                                                onClick={() => !isLocked && setSelectedSlot(slot)}
                                                                onShowInfo={onShowInfo}
                                                                isLocked={isLocked}
                                                            />
                                                            {isMaxRunes && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: 0, left: 0, right: 0, bottom: 0,
                                                                    background: 'rgba(0,0,0,0.5)',
                                                                    borderRadius: '10px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '0.6rem',
                                                                    fontWeight: 'bold',
                                                                    color: '#ff4444',
                                                                    pointerEvents: 'none'
                                                                }}>
                                                                    MAX 3
                                                                </div>
                                                            )}
                                                            {isLockedByWeapon && !isMaxRunes && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: 0, left: 0, right: 0, bottom: 0,
                                                                    background: 'rgba(0,0,0,0.6)',
                                                                    borderRadius: '10px',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '0.5rem',
                                                                    fontWeight: 'bold',
                                                                    color: '#ff4444',
                                                                    pointerEvents: 'none'
                                                                }}>
                                                                    <Sword size={12} />
                                                                    WEAPON REQ.
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Rune Buff Summary */}
                                        <RuneBuffSummary activeRuneBuffs={Object.fromEntries(
                                            Object.entries(activeRuneBuffs).filter(([act]) =>
                                                ['ATTACK'].includes(act)
                                            )
                                        )} />
                                    </div>
                                </>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '60px 20px',
                                    textAlign: 'center',
                                    opacity: 0.6
                                }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '15px',
                                        border: '1px dashed var(--border)'
                                    }}>
                                        <Zap size={30} color="var(--accent)" />
                                    </div>
                                    <h4 style={{ color: 'var(--text-main)', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        {activeRuneTab} Runes
                                    </h4>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: 0 }}>
                                        Coming soon!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div >

            {selectedSlot && (
                <EquipmentSelectModal
                    slot={selectedSlot}
                    onClose={() => setSelectedSlot(null)}
                    currentItem={equipment[selectedSlot]}
                    inventory={gameState.state.inventory || {}}
                    onEquip={handleEquip}
                    onUnequip={handleUnequip}
                    onShowInfo={onShowInfo}
                    charStats={stats}
                    weaponClass={currentWeaponClass}
                />
            )
            }

            {
                breakdownModal && (
                    <StatBreakdownModal
                        statType={breakdownModal.type}
                        value={typeof breakdownModal.value === 'object' ? breakdownModal.value.total : breakdownModal.value}
                        statId={typeof breakdownModal.value === 'object' ? breakdownModal.value.id : null}
                        stats={{ ...stats, skills }} // Pass skills for efficiency breakdown
                        equipment={gameState?.state?.equipment || {}}
                        membership={gameState?.state?.membership}
                        onClose={() => setBreakdownModal(null)}
                    />
                )
            }

            {
                proficiencyModal && (
                    <ProficiencyDetailsModal
                        data={proficiencyModal}
                        onClose={() => setProficiencyModal(null)}
                    />
                )
            }

            {
                infoModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(2px)'
                    }} onClick={() => setInfoModal(null)}>
                        <div style={{
                            background: 'var(--bg-dark)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: '20px',
                            maxWidth: '80%',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ color: 'var(--accent)', marginTop: 0 }}>{infoModal.title}</h3>
                            <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{infoModal.desc}</p>
                            <button
                                onClick={() => setInfoModal(null)}
                                style={{
                                    marginTop: '10px',
                                    width: '100%',
                                    padding: '8px',
                                    background: 'var(--accent)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                )
            }
        </>
    );
};

const EfficiencyCard = ({ title, items, stats, onShowBreakdown, icon, color }) => (
    <div style={{
        background: 'rgba(15, 23, 42, 0.4)', // Glass Slate 900
        padding: '18px',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden'
    }}>
        {/* Glow behind icon */}
        <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '60px',
            height: '60px',
            background: color,
            filter: 'blur(30px)',
            opacity: 0.5,
            pointerEvents: 'none'
        }} />

        <div style={{
            fontSize: '0.75rem',
            color: '#f8fafc',
            fontWeight: '800',
            marginBottom: '15px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        }}>
            <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {icon}
            </div>
            {title}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map(item => {
                const val = stats.efficiency[item.id] || 0;
                const progressWidth = Math.min(100, (val / 150) * 100); // 150% as a normalization target

                return (
                    <div key={item.id}
                        style={{ cursor: 'pointer', transition: '0.2s' }}
                        onClick={() => onShowBreakdown && onShowBreakdown(item.id, `+${val.toFixed(1)}%`)}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>{item.label}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                +{val.toFixed(1)}%
                                <Info size={10} color="#64748b" />
                            </span>
                        </div>
                        {/* Potency Bar */}
                        <div style={{
                            width: '100%',
                            height: '3px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${progressWidth}%`,
                                height: '100%',
                                background: color.replace('0.1', '0.6'),
                                borderRadius: '2px',
                                boxShadow: `0 0 8px ${color.replace('0.1', '0.4')}`
                            }} />
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);



const RuneBuffSummary = ({ activeRuneBuffs }) => {
    if (Object.entries(activeRuneBuffs).length === 0) return null;

    return (
        <div style={{
            marginTop: '40px',
            padding: '20px',
            background: 'rgba(212, 175, 55, 0.05)',
            borderRadius: '16px',
            border: '1px solid rgba(212, 175, 55, 0.2)'
        }}>
            <h4 style={{
                color: 'var(--accent)',
                fontSize: '0.9rem',
                fontWeight: '900',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                margin: '0 0 15px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <Zap size={16} fill="var(--accent)" /> Active Rune Bonus Summary
            </h4>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '12px'
            }}>
                {Object.entries(activeRuneBuffs).map(([act, buffs]) => (
                    <div key={act} style={{
                        padding: '12px',
                        background: 'rgba(0,0,0,0.4)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{
                            fontSize: '0.7rem',
                            color: '#888',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            textTransform: 'uppercase'
                        }}>
                            {act.replace('HERB', 'Herbalism')
                                .replace('HIDE', 'Skinning')
                                .replace('WOOD', 'Wood')
                                .replace('ORE', 'Ore')
                                .replace('FIBER', 'Fiber')
                                .replace('FISH', 'Fish')
                                .replace('METAL', 'Bars')
                                .replace('PLANK', 'Planks')
                                .replace('LEATHER', 'Leather')
                                .replace('CLOTH', 'Cloth')
                                .replace('EXTRACT', 'Extracts')
                                .replace('WARRIOR', 'Warrior Gear')
                                .replace('HUNTER', 'Hunter Gear')
                                .replace('MAGE', 'Mage Gear')
                                .replace('TOOLS', 'Tools')
                                .replace('COOKING', 'Cooking')
                                .replace('ALCHEMY', 'Alchemy')
                                .replace('ATTACK', 'Combat')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {buffs.XP && (
                                <div style={{ fontSize: '0.75rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#aaa' }}>XP:</span>
                                    <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>+{buffs.XP}%</span>
                                </div>
                            )}
                            {buffs.COPY && (
                                <div style={{ fontSize: '0.75rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#aaa' }}>Duplication:</span>
                                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>+{buffs.COPY}%</span>
                                </div>
                            )}
                            {buffs.SPEED && (
                                <div style={{ fontSize: '0.75rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#aaa' }}>{act === 'FISH' ? 'Auto-Cooking:' : 'Auto-Refine:'}</span>
                                    <span style={{ color: '#2196f3', fontWeight: 'bold' }}>+{buffs.SPEED}%</span>
                                </div>
                            )}
                            {buffs.EFF && (
                                <div style={{ fontSize: '0.75rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#aaa' }}>Efficiency:</span>
                                    <span style={{ color: '#2196f3', fontWeight: 'bold' }}>+{buffs.EFF}%</span>
                                </div>
                            )}
                            {buffs.ATTACK && (
                                <div style={{ fontSize: '0.75rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#aaa' }}>Attack:</span>
                                    <span style={{ color: '#ff4444', fontWeight: 'bold' }}>+{buffs.ATTACK}%</span>
                                </div>
                            )}
                            {buffs.SAVE_FOOD && (
                                <div style={{ fontSize: '0.75rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#aaa' }}>Food Saving:</span>
                                    <span style={{ color: '#ff4444', fontWeight: 'bold' }}>+{buffs.SAVE_FOOD}%</span>
                                </div>
                            )}
                            {buffs.BURST && (
                                <div style={{ fontSize: '0.75rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#aaa' }}>Burst:</span>
                                    <span style={{ color: '#ffd700', fontWeight: 'bold' }}>+{buffs.BURST}%</span>
                                </div>
                            )}
                            {buffs.ATTACK_SPEED && (
                                <div style={{ fontSize: '0.75rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#aaa' }}>Attack Speed:</span>
                                    <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>+{buffs.ATTACK_SPEED}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProfilePanel;
