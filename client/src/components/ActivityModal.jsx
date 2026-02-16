import React, { useState, useEffect } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import { X, Clock, Zap, Target, Star, ChevronRight, Package, Box, Sword, Shield, Heart, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveItem, formatItemId, QUALITIES, getSkillForItem, getLevelRequirement } from '@shared/items';

const ActivityModal = ({ isOpen, onClose, item, type, gameState, onStart, onNavigate, onSearchInMarket, isMobile }) => {
    const [quantity, setQuantity] = useState(1);
    const [showProbabilities, setShowProbabilities] = useState(false);

    useEffect(() => {
        if (item?.id) {
            setQuantity(maxQuantity);
        }
    }, [item?.id]);

    // Fallback se não houver item (Moved after hooks)
    if (!item) return null;

    const charStats = gameState?.state?.stats || { str: 0, agi: 0, int: 0 };

    const checkLocked = () => {
        if (!gameState?.state) return { locked: false, req: 0, skill: '' };

        // Defensive tier extraction
        const tier = Number(item.tier) || 1;
        const skillKey = getSkillForItem(item.id, type);
        const userLevel = gameState.state.skills[skillKey]?.level || 1;
        const requiredLevel = getLevelRequirement(tier);

        const isLockedStatus = userLevel < requiredLevel;



        return {
            locked: isLockedStatus,
            req: requiredLevel,
            skill: skillKey ? skillKey.replace('_', ' ') : 'SKILL',
            userLevel,
            skillKey
        };
    };

    const { locked, req, skill: skillName, userLevel } = checkLocked();

    // Cálculos
    const qtyNum = Number(quantity) || 0;

    // Determine Efficiency Key based on Item Type/ID
    const getEfficiencyKey = (itemId, type) => {
        if (!itemId) return 'GLOBAL';
        if (type === 'GATHERING') {
            if (itemId.includes('WOOD')) return 'WOOD';
            if (itemId.includes('ORE')) return 'ORE';
            if (itemId.includes('HIDE')) return 'HIDE';
            if (itemId.includes('FIBER')) return 'FIBER';
            if (itemId.includes('FISH')) return 'FISH';
            if (itemId.includes('HERB')) return 'HERB';
        } else if (type === 'REFINING') {
            if (itemId.includes('PLANK')) return 'PLANK';
            if (itemId.includes('BAR')) return 'METAL';
            if (itemId.includes('LEATHER')) return 'LEATHER';
            if (itemId.includes('CLOTH')) return 'CLOTH';
            if (itemId.includes('EXTRACT')) return 'EXTRACT';
        } else if (type === 'CRAFTING') {
            if (itemId.includes('PICKAXE') || itemId.includes('AXE') || itemId.includes('KNIFE') || itemId.includes('SICKLE') || itemId.includes('ROD') || itemId.includes('POUCH')) return 'TOOLS';

            if (itemId.includes('SWORD') || itemId.includes('PLATE') || itemId.includes('SHIELD')) return 'WARRIOR';
            if (itemId.includes('BOW') || itemId.includes('LEATHER') || itemId.includes('TORCH')) return 'HUNTER';
            if (itemId.includes('STAFF') || itemId.includes('CLOTH') || itemId.includes('TOME') || itemId.includes('MAGE_CAPE')) return 'MAGE';
            if (itemId.includes('FOOD')) return 'COOKING';
            if (itemId.includes('POTION')) return 'ALCHEMY';
            if (itemId.includes('CAPE')) return 'WARRIOR';
        }
        return 'GLOBAL';
    };

    const effKey = getEfficiencyKey(item.id, type);
    const efficiency = (gameState?.calculatedStats?.efficiency?.[effKey] || 0).toFixed(1);

    // XP
    const stats = gameState?.calculatedStats || {};
    const baseXp = item.xp || (type === 'GATHERING' ? 5 : (type === 'REFINING' ? 10 : 50));
    const yieldBonus = (stats.globals?.xpYield || 0);

    let specificKey = '';
    if (type === 'GATHERING') specificKey = 'GATHERING';
    else if (type === 'REFINING') specificKey = 'REFINING';
    else if (type === 'CRAFTING') specificKey = 'CRAFTING';

    const specificBonus = (stats.xpBonus?.[specificKey] || 0);
    const runeBonus = (stats.xpBonus?.[effKey] || 0);

    // Additive Formula: Base * (1 + (Global + Specific + Rune)/100)
    const totalBonusPc = yieldBonus + specificBonus + runeBonus;
    const xpPerAction = parseFloat((baseXp * (1 + totalBonusPc / 100)).toFixed(1));
    const totalXP = formatNumber(xpPerAction * qtyNum);

    // Tempo base & Redução
    const baseTime = item.time || (type === 'GATHERING' ? 3.0 : (type === 'REFINING' ? 1.5 : (type === 'CRAFTING' ? 4.0 : 3.0)));
    // Efficiency reduces time: 10% eff = time * 0.9
    const reductionFactor = Math.max(0.1, 1 - (parseFloat(efficiency) / 100));
    const finalTime = Math.max(0.5, baseTime * reductionFactor);

    // Limite Dinâmico de Idle (8h normal / 12h Membership)
    const isPremium = gameState?.state?.isPremium || gameState?.state?.membership?.active;
    const idleLimitHours = isPremium ? 12 : 8;
    const idleLimitSeconds = idleLimitHours * 60 * 60;

    // Máximo limitado por tempo ou materiais
    const timeLimitMax = Math.floor(idleLimitSeconds / finalTime);
    let maxQuantity = timeLimitMax;

    if (type === 'CRAFTING' || type === 'REFINING') {
        const reqs = item.req || {};
        let maxByMaterials = Infinity;
        let hasReqs = false;

        Object.entries(reqs).forEach(([reqId, reqQty]) => {
            hasReqs = true;
            const entry = gameState?.state?.inventory?.[reqId];
            const userQty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);
            const possible = Math.floor(userQty / reqQty);
            if (possible < maxByMaterials) {
                maxByMaterials = possible;
            }
        });

        if (hasReqs && maxByMaterials !== Infinity) {
            maxQuantity = Math.min(timeLimitMax, maxByMaterials);
        }
    }
    const totalDuration = finalTime * qtyNum;



    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        if (seconds < 60) return `${seconds.toFixed(1).replace(/\.0$/, '')} s`;
        const m = Math.floor(seconds / 60);
        const s = (seconds % 60).toFixed(0);
        if (m < 60) return `${m}m ${s > 0 ? s + 's' : ''} `;
        const h = Math.floor(m / 60);
        const remM = m % 60;
        return `${h}h ${remM > 0 ? remM + 'm' : ''} `;
    };

    const handleMax = () => {
        setQuantity(maxQuantity);
    };

    const handleStart = () => {
        onStart(type, item.id, Number(quantity) || 1);
        onClose();
    };

    if (type === 'REFINING') {
        const reqs = item.req || {};
        const costPerAction = item.cost || 0; // Se houver custo em silver
        const totalCost = formatNumber(costPerAction * qtyNum);
        const userSilver = gameState?.state?.silver || 0;

        return (
            <AnimatePresence>
                {isOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px',
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(4px)'
                    }} onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="modal-content"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '1.25rem',
                                background: 'var(--panel-bg)',
                                borderRadius: '16px',
                                boxShadow: 'var(--panel-shadow)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.75rem', width: '100%', position: 'relative' }}>
                                {item.icon && (
                                    <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                        <img src={item.icon} style={{ maxWidth: '100%', maxHeight: '100%', width: item.scale || '64px', height: item.scale || '64px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }} alt={item.name} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                                    <h3 style={{ color: 'var(--accent)', margin: '0px', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>{item.name}</h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', position: 'absolute', right: '-10px', top: '-10px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '0.85rem', width: '100%' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>Quantity</div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        min="1"
                                        max={maxQuantity}
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setQuantity('');
                                            } else {
                                                const num = parseInt(val);
                                                if (!isNaN(num)) {
                                                    setQuantity(Math.min(maxQuantity, Math.max(1, num)));
                                                }
                                            }
                                        }}
                                        style={{
                                            flex: '1 1 0%',
                                            padding: '6px 8px',
                                            fontSize: '0.85rem',
                                            background: 'var(--glass-bg)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '4px',
                                            color: 'var(--text-main)',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={handleMax}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'var(--accent-soft)',
                                            border: '1px solid var(--border-active)',
                                            color: 'var(--accent)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        MAX ({formatDuration(maxQuantity * finalTime)})
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '3px' }}>Max: {formatNumber(maxQuantity)}</div>
                            </div>

                            <div style={{ marginBottom: '0.85rem', width: '100%' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>Required Materials</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                    {Object.entries(reqs).map(([reqId, reqQty]) => {
                                        const entry = gameState?.state?.inventory?.[reqId];
                                        const userQty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);
                                        const totalReq = reqQty * qtyNum;
                                        const hasEnough = userQty >= totalReq;
                                        // Resolver nome
                                        const resolvedFn = resolveItem(reqId);
                                        const displayName = resolvedFn ? `T${resolvedFn.tier} ${resolvedFn.name}` : formatItemId(reqId);
                                        const isSingle = Object.keys(reqs).length === 1;

                                        return (
                                            <div onClick={() => onNavigate && onNavigate(reqId)} key={reqId} style={{
                                                flex: isSingle ? '1 1 100%' : '1 1 calc(50% - 6px)',
                                                minWidth: '140px',
                                                background: 'var(--slot-bg)',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 68, 68, 0.3)'} `,
                                                cursor: 'pointer'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: '700' }}>{displayName}</div>
                                                    <button
                                                        title="Search in Market"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSearchInMarket(displayName);
                                                        }}
                                                        style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-active)', borderRadius: '4px', padding: '2px', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Package size={14} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Required: {totalReq}</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: '900', color: hasEnough ? '#4caf50' : '#ff4444' }}>{userQty}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ marginBottom: '0.85rem', padding: '12px', background: 'var(--slot-bg)', borderRadius: '12px', border: '1px solid var(--border)', width: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Efficiency</span>
                                        <span style={{ color: 'var(--t2)', fontWeight: '800', paddingRight: '4px' }}>+{efficiency}%</span>
                                    </div>
                                    {totalBonusPc > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>XP Bonus</span>
                                            <span style={{ color: 'var(--t2)', fontWeight: '800', paddingRight: '4px' }}>+{totalBonusPc.toFixed(1)}%</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Time per action</span>
                                        <span style={{ color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'baseline', gap: '6px', paddingRight: '4px' }}>
                                            {finalTime.toFixed(1)}s
                                            {finalTime < baseTime && <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>{baseTime}s</span>}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>XP per action</span>
                                        <span style={{ color: 'var(--accent)', fontWeight: '800', display: 'flex', alignItems: 'baseline', gap: '6px', paddingRight: '4px' }}>
                                            {xpPerAction}
                                            {xpPerAction > baseXp && <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>{baseXp}</span>}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Total Cost</span>
                                        <span style={{ color: 'var(--accent)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '4px' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid currentColor' }}></div>
                                            {totalCost}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-main)', fontWeight: '900', fontSize: '0.85rem' }}>TOTAL XP</span>
                                        <span style={{ color: 'var(--t2)', fontWeight: '900', fontSize: '1rem', paddingRight: '4px' }}>{totalXP}</span>
                                    </div>
                                </div>
                            </div>

                            {locked ? (
                                <div style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255, 68, 68, 0.1)',
                                    color: '#ff4444',
                                    border: '1px solid rgba(255, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: '900',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Lock size={16} />
                                        <span>{skillName} LV {req} REQUIRED</span>
                                    </div>
                                    <div style={{ opacity: 0.5, fontSize: '0.65rem' }}>
                                        CURRENT LV: {userLevel}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleStart}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'var(--accent)',
                                        color: 'var(--bg-dark)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1.5px',
                                        boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    START ACTIVITY ({formatDuration(totalDuration)})
                                </button>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    if (type === 'CRAFTING') {
        // Resolve item to ensure we have stats (Damage/Armor/etc)
        // We use the ID to get the full static definition including stats
        const resolvedItem = resolveItem(item.id) || item;

        const reqs = resolvedItem.req || {};
        const costPerAction = resolvedItem.cost || 0;
        const totalCost = formatNumber(costPerAction * qtyNum);
        const userSilver = gameState?.state?.silver || 0;

        // Verificar se tem materiais suficientes para a quantidade atual
        let hasAllMaterials = true;
        Object.entries(reqs).forEach(([reqId, reqQty]) => {
            const entry = gameState?.state?.inventory?.[reqId];
            const userQty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);
            if (userQty < (reqQty * qtyNum)) hasAllMaterials = false;
        });

        // Toggle para accordion


        // Qualidades baseadas no QUALITIES real do shared/items.js
        // Qualidades baseadas no QUALITIES real do shared/items.js
        const qualityBonus = stats.globals?.qualityChance || 0;
        const mult = 1 + (qualityBonus / 100);

        const BASE_QUALITY_CHANCES = {
            1: { q4: 1.40, q3: 9.80, q2: 14.40, q1: 30.00 },
            2: { q4: 1.25, q3: 8.76, q2: 13.30, q1: 28.89 },
            3: { q4: 1.10, q3: 7.72, q2: 12.20, q1: 27.78 },
            4: { q4: 0.95, q3: 6.68, q2: 11.10, q1: 26.67 },
            5: { q4: 0.80, q3: 5.64, q2: 10.00, q1: 25.56 },
            6: { q4: 0.65, q3: 4.61, q2: 8.90, q1: 24.44 },
            7: { q4: 0.50, q3: 3.57, q2: 7.80, q1: 23.33 },
            8: { q4: 0.35, q3: 2.53, q2: 6.70, q1: 22.22 },
            9: { q4: 0.20, q3: 1.49, q2: 5.60, q1: 21.11 },
            10: { q4: 0.05, q3: 0.45, q2: 4.50, q1: 20.00 }
        };

        const tierStats = BASE_QUALITY_CHANCES[resolvedItem.tier] || BASE_QUALITY_CHANCES[1];

        const CRAFT_QUALITIES = Object.values(QUALITIES).map(q => {
            let displayChance = 0;

            // Map generic IDs to our specific keys
            if (q.id === 4) displayChance = tierStats.q4 * mult;
            else if (q.id === 3) displayChance = tierStats.q3 * mult;
            else if (q.id === 2) displayChance = tierStats.q2 * mult;
            else if (q.id === 1) displayChance = tierStats.q1 * mult;

            if (q.id === 0) {
                // Normal chance = 100 - sum of others
                const otherSum = (tierStats.q4 + tierStats.q3 + tierStats.q2 + tierStats.q1) * mult;
                displayChance = Math.max(0, 100 - otherSum);
            }

            return {
                id: q.id,
                name: q.name,
                chance: displayChance.toFixed(2) + '%',
                color: q.color,
                ipBonus: q.ipBonus
            };
        });

        // Determinar stat principal para mostrar (Damage, Armor ou Efficiency)
        const mainStatKey = resolvedItem.stats?.damage ? 'Damage' :
            resolvedItem.stats?.defense ? 'Defense' :
                resolvedItem.stats?.hp ? 'Health' :
                    resolvedItem.stats?.speed ? 'Speed' :
                        resolvedItem.stats?.efficiency ? 'Efficiency' : 'Power';

        let rawEff = resolvedItem.stats?.efficiency;
        if (typeof rawEff === 'object') rawEff = rawEff.GLOBAL || 0;

        const mainStatVal = resolvedItem.stats?.damage ||
            resolvedItem.stats?.defense ||
            resolvedItem.stats?.hp ||
            resolvedItem.stats?.speed ||
            rawEff || 0;

        return (
            <AnimatePresence>
                {isOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px',
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(4px)'
                    }} onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="modal-content"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '1.25rem',
                                background: 'var(--panel-bg)',
                                borderRadius: '16px',
                                boxShadow: 'var(--panel-shadow)',
                                border: '1px solid var(--border)',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.75rem', width: '100%', position: 'relative' }}>
                                {item.icon && (
                                    <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                        <img src={item.icon} style={{ maxWidth: '100%', maxHeight: '100%', width: item.scale || '64px', height: item.scale || '64px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }} alt={item.name} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                                    <h3 style={{ color: 'var(--accent)', margin: '0px', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>{item.name}</h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', position: 'absolute', right: '-10px', top: '-10px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '0.85rem', width: '100%' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>Quantity</div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        min="1"
                                        max={maxQuantity}
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setQuantity('');
                                            } else {
                                                const num = parseInt(val);
                                                if (!isNaN(num)) {
                                                    setQuantity(Math.min(maxQuantity, Math.max(1, num)));
                                                }
                                            }
                                        }}
                                        style={{
                                            flex: '1 1 0%',
                                            padding: '6px 8px',
                                            fontSize: '0.85rem',
                                            background: 'var(--slot-bg)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '4px',
                                            color: 'var(--text-main)',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={handleMax}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'var(--accent-soft)',
                                            border: '1px solid var(--border-active)',
                                            color: 'var(--accent)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        MAX ({formatDuration(maxQuantity * finalTime)})
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '3px' }}>Max: {formatNumber(maxQuantity)}</div>
                            </div>

                            <div style={{ marginBottom: '0.75rem', width: '100%' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Required Materials</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {Object.entries(reqs).map(([reqId, reqQty]) => {
                                        const entry = gameState?.state?.inventory?.[reqId];
                                        const userQty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);
                                        const totalReq = reqQty * qtyNum;
                                        const hasEnough = userQty >= totalReq;
                                        // Resolver nome
                                        const resolvedFn = resolveItem(reqId);
                                        const displayName = resolvedFn ? `T${resolvedFn.tier} ${resolvedFn.name}` : formatItemId(reqId);

                                        return (
                                            <div onClick={() => onNavigate && onNavigate(reqId)} key={reqId} style={{ flex: '1 1 calc(50% - 3px)', minWidth: '120px', background: 'var(--slot-bg)', padding: '8px', borderRadius: '4px', border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 68, 68, 0.3)'} `, cursor: 'pointer', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '2px', fontWeight: '600' }}>{displayName}</div>
                                                    <button
                                                        title="Search in Market"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSearchInMarket(displayName);
                                                        }}
                                                        style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-active)', borderRadius: '4px', padding: '2px', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Package size={10} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>x{totalReq}</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: hasEnough ? '#4caf50' : '#ff4444' }}>{userQty}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ marginBottom: '0.85rem', padding: '12px', background: 'var(--slot-bg)', borderRadius: '12px', border: '1px solid var(--border)', width: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Efficiency</span>
                                        <span style={{ color: 'var(--t2)', fontWeight: '800', paddingRight: '4px' }}>+{efficiency}%</span>
                                    </div>
                                    {totalBonusPc > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>XP Bonus</span>
                                            <span style={{ color: 'var(--t2)', fontWeight: '800', paddingRight: '4px' }}>+{totalBonusPc.toFixed(1)}%</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Time per action</span>
                                        <span style={{ color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'baseline', gap: '6px', paddingRight: '4px' }}>
                                            {finalTime.toFixed(1)}s
                                            {finalTime < baseTime && <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>{baseTime}s</span>}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>XP per action</span>
                                        <span style={{ color: 'var(--accent)', fontWeight: '800', display: 'flex', alignItems: 'baseline', gap: '6px', paddingRight: '4px' }}>
                                            {xpPerAction}
                                            {xpPerAction > baseXp && <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>{baseXp}</span>}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Total Cost</span>
                                        <span style={{ color: 'var(--accent)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '4px' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid currentColor' }}></div>
                                            {totalCost}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-main)', fontWeight: '900', fontSize: '0.85rem' }}>TOTAL XP</span>
                                        <span style={{ color: 'var(--t2)', fontWeight: '900', fontSize: '1rem', paddingRight: '4px' }}>{totalXP}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Description for Potions/Food */}
                            {(['FOOD', 'POTION'].includes(resolvedItem.type) || resolvedItem.id.includes('FOOD') || resolvedItem.id.includes('POTION')) && (
                                <div style={{ marginBottom: '0.85rem', padding: '12px', background: 'var(--slot-bg)', borderRadius: '12px', border: '1px solid var(--border)', width: '100%' }}>
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>EFFECT</div>
                                    <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                        {resolvedItem.desc || resolvedItem.description || "No description available."}
                                    </div>
                                </div>
                            )}

                            {/* Probabilities Section */}
                            {!['FOOD', 'POTION'].includes(resolvedItem.type) && !resolvedItem.id.includes('FOOD') && !resolvedItem.id.includes('POTION') && (
                                <div style={{ marginBottom: '0.75rem', width: '100%' }}>
                                    <button
                                        onClick={() => setShowProbabilities(!showProbabilities)}
                                        style={{ width: '100%', background: 'var(--accent-soft)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-active)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Box size={14} />
                                            <span>PROBABILITIES (T{resolvedItem.tier}) & RESULTS</span>
                                        </div>
                                        <ChevronRight size={16} style={{ transform: showProbabilities ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                                    </button>

                                    <AnimatePresence>
                                        {showProbabilities && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div style={{ marginTop: '8px', background: 'rgba(0, 0, 0, 0.15)', padding: '4px', borderRadius: '6px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {CRAFT_QUALITIES.map((q, idx) => {
                                                            const qItem = resolveItem(resolvedItem.id, q.id);
                                                            const stats = qItem?.stats || {};

                                                            // Define stats to show
                                                            const showStats = [];
                                                            if (stats.damage) showStats.push({ label: 'Dmg', val: stats.damage, icon: <Sword size={11} />, color: '#ff4444' });
                                                            if (stats.defense) showStats.push({ label: 'Def', val: stats.defense, icon: <Shield size={11} />, color: '#4caf50' });
                                                            if (stats.hp) showStats.push({ label: 'HP', val: stats.hp, icon: <Heart size={11} />, color: '#ff4d4d' });
                                                            if (stats.speed) showStats.push({ label: 'Spd', val: '-' + (stats.speed / 1000).toFixed(2) + 's', icon: <Zap size={11} />, color: 'var(--accent)' });
                                                            if (stats.attackSpeed) showStats.push({ label: 'Base', val: (stats.attackSpeed / 1000).toFixed(2) + 's', icon: <Zap size={11} />, color: 'var(--accent)' });

                                                            // Handle Efficiency
                                                            if (stats.efficiency) {
                                                                const effVal = typeof stats.efficiency === 'object' ? stats.efficiency.GLOBAL : stats.efficiency;
                                                                if (effVal) showStats.push({ label: 'Eff', val: effVal + '%', icon: <Star size={11} />, color: '#90d5ff' });
                                                            }

                                                            return (
                                                                <div key={idx} style={{ fontSize: '0.7rem', padding: '8px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: `3px solid ${q.color} `, borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span style={{ fontWeight: '600', color: q.color, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.6rem' }}>{q.name}</span>
                                                                        <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.75rem' }}>{q.chance}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', opacity: 0.9, borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '6px' }}>
                                                                        {showStats.length > 0 ? showStats.map((s, i) => (
                                                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: s.color }}>
                                                                                {s.icon}
                                                                                <span style={{ fontWeight: '600' }}>{s.val} {s.label}</span>
                                                                            </div>
                                                                        )) : (
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#666' }}>
                                                                                <Target size={11} />
                                                                                <span style={{ fontWeight: '600' }}>No Stats</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {locked ? (
                                <div style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255, 68, 68, 0.1)',
                                    color: '#ff4444',
                                    border: '1px solid rgba(255, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: '900',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Lock size={16} />
                                        <span>{skillName} LV {req} REQUIRED</span>
                                    </div>
                                    <div style={{ opacity: 0.5, fontSize: '0.65rem' }}>
                                        CURRENT LV: {userLevel}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={hasAllMaterials ? handleStart : null}
                                    disabled={!hasAllMaterials}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: hasAllMaterials ? 'var(--accent)' : 'rgba(100, 100, 100, 0.3)',
                                        color: hasAllMaterials ? (hasAllMaterials ? '#000' : '#444') : 'var(--text-dim)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '900',
                                        cursor: hasAllMaterials ? 'pointer' : 'not-allowed',
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1.5px',
                                        boxShadow: hasAllMaterials ? '0 4px 15px rgba(212, 175, 55, 0.2)' : 'none'
                                    }}
                                >
                                    {hasAllMaterials ? `START ACTIVITY(${formatDuration(totalDuration)})` : 'INSUFFICIENT MATERIALS'}
                                </button>
                            )}
                        </motion.div>
                    </div >
                )}
            </AnimatePresence >
        );
    }

    if (type === 'GATHERING') {
        return (
            <AnimatePresence>
                {isOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 11000,
                        padding: '20px',
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(4px)'
                    }} onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="modal-content"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '1.25rem',
                                background: 'var(--panel-bg)',
                                borderRadius: '16px',
                                boxShadow: 'var(--panel-shadow)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.75rem', width: '100%', position: 'relative' }}>
                                {item.icon && (
                                    <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                        <img src={item.icon} style={{ maxWidth: '100%', maxHeight: '100%', width: item.scale || '64px', height: item.scale || '64px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }} alt={item.name} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                                    <h3 style={{ color: 'var(--accent)', margin: '0px', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>{item.name}</h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', position: 'absolute', right: '-10px', top: '-10px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '0.85rem', width: '100%' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>Quantity</div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        min="1"
                                        max={maxQuantity}
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setQuantity('');
                                            } else {
                                                const num = parseInt(val);
                                                if (!isNaN(num)) {
                                                    setQuantity(Math.min(maxQuantity, Math.max(1, num)));
                                                }
                                            }
                                        }}
                                        style={{
                                            flex: '1 1 0%',
                                            padding: '6px 8px',
                                            fontSize: '0.85rem',
                                            background: 'var(--slot-bg)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '4px',
                                            color: 'var(--text-main)',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={handleMax}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'var(--accent-soft)',
                                            border: '1px solid var(--border-active)',
                                            color: 'var(--accent)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        MAX ({formatDuration(maxQuantity * finalTime)})
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '3px' }}>Max: {formatNumber(maxQuantity)}</div>
                            </div>

                            <div style={{ marginBottom: '0.85rem', padding: '12px', background: 'var(--slot-bg)', borderRadius: '12px', border: '1px solid var(--border)', width: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Efficiency</span>
                                        <span style={{ color: 'var(--t2)', fontWeight: '800', paddingRight: '4px' }}>+{efficiency}%</span>
                                    </div>
                                    {totalBonusPc > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>XP Bonus</span>
                                            <span style={{ color: 'var(--t2)', fontWeight: '800', paddingRight: '4px' }}>+{totalBonusPc.toFixed(1)}%</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Time per action</span>
                                        <span style={{ color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'baseline', gap: '6px', paddingRight: '4px' }}>
                                            {finalTime.toFixed(1)}s
                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>{baseTime}s</span>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>XP per action</span>
                                        <span style={{ color: 'var(--accent)', fontWeight: '800', display: 'flex', alignItems: 'baseline', gap: '6px', paddingRight: '4px' }}>
                                            {xpPerAction}
                                            {xpPerAction > baseXp && <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>{baseXp}</span>}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-main)', fontWeight: '900', fontSize: '0.85rem' }}>TOTAL XP</span>
                                        <span style={{ color: 'var(--t2)', fontWeight: '900', fontSize: '1rem', paddingRight: '4px' }}>{totalXP}</span>
                                    </div>
                                </div>
                            </div>

                            {locked ? (
                                <div style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255, 68, 68, 0.1)',
                                    color: '#ff4444',
                                    border: '1px solid rgba(255, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: '900',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Lock size={16} />
                                        <span>{skillName} LV {req} REQUIRED</span>
                                    </div>
                                    <div style={{ opacity: 0.5, fontSize: '0.65rem' }}>
                                        CURRENT LV: {userLevel}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleStart}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'var(--accent)',
                                        color: 'var(--bg-dark)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1.5px',
                                        boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    START ACTIVITY ({formatDuration(totalDuration)})
                                </button>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '20px'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(8px)'
                        }}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="glass-panel"
                        style={{
                            width: '95%',
                            maxWidth: '480px',
                            background: 'var(--panel-bg)',
                            padding: isMobile ? '20px' : '30px',
                            position: 'relative',
                            borderRadius: '24px',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--panel-shadow)',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}
                    >
                        {/* Header Moderno */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    background: 'var(--accent-soft)',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(212, 175, 55, 0.2)',
                                    color: 'var(--accent)'
                                }}>
                                    {item.icon ? (
                                        <img src={item.icon} style={{ width: item.scale || '130%', height: item.scale || '130%', objectFit: 'contain' }} alt="" />
                                    ) : (
                                        type === 'GATHERING' || type === 'REFINING' ? <Box size={24} /> : <Target size={24} />
                                    )}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                                        {item.name}
                                    </h2>
                                    <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4caf50' }}></div>
                                        {type === 'GATHERING' ? 'GATHERING' : 'REFINING'} ACTIVITY
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    color: '#888',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    transition: '0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#888'; }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Quantity Card */}
                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '16px',
                            padding: '20px',
                            marginBottom: '20px',
                            border: '1px solid rgba(255,255,255,0.03)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>
                                    QUANTITY
                                </label>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>MAX: {formatNumber(maxQuantity)}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                        type="number"
                                        min="1"
                                        max={maxQuantity}
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 1;
                                            setQuantity(Math.min(maxQuantity, Math.max(1, val)));
                                        }}
                                        style={{
                                            width: '100%',
                                            background: 'var(--slot-bg)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px',
                                            padding: '12px 15px',
                                            color: 'var(--text-main)',
                                            fontSize: '1.2rem',
                                            fontWeight: 'bold',
                                            outline: 'none',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleMax}
                                    style={{
                                        background: 'var(--accent-soft)',
                                        border: '1px solid rgba(212, 175, 55, 0.3)',
                                        color: 'var(--accent)',
                                        padding: '0 20px',
                                        height: '46px',
                                        borderRadius: '10px',
                                        fontSize: '0.8rem',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        transition: '0.2s',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                                >
                                    MAX
                                </button>
                            </div>
                        </div>

                        {/* Stats Info */}
                        <div style={{ marginBottom: '1.25rem', padding: '16px', background: 'var(--slot-bg)', borderRadius: '12px', border: '1px solid var(--border)', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>EFFICIENCY</span>
                                    <span style={{ color: 'var(--t2)', fontWeight: '800' }}>+{efficiency}%</span>
                                </div>
                                {totalBonusPc > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>XP BONUS</span>
                                        <span style={{ color: 'var(--t2)', fontWeight: '800' }}>+{totalBonusPc.toFixed(1)}%</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>TOTAL XP</span>
                                    <span style={{ color: 'var(--accent)', fontWeight: '800' }}>{totalXP}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {locked ? (
                            <div style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255, 68, 68, 0.1)',
                                color: '#ff4444',
                                border: '1px solid rgba(255, 68, 68, 0.3)',
                                borderRadius: '8px',
                                textAlign: 'center',
                                fontSize: '0.8rem',
                                fontWeight: '900',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                letterSpacing: '1px',
                                textTransform: 'uppercase'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Lock size={16} />
                                    <span>{skillName} LV {req} REQUIRED</span>
                                </div>
                                <div style={{ opacity: 0.5, fontSize: '0.65rem' }}>
                                    CURRENT LV: {userLevel}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleStart}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'var(--accent)',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '0.9rem',
                                    fontWeight: '800',
                                    letterSpacing: '1px',
                                    cursor: 'pointer',
                                    transition: '0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    textTransform: 'uppercase',
                                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(212, 175, 55, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.3)';
                                }}
                            >
                                <Target size={18} strokeWidth={3} />
                                INICIAR ({finalTime.toFixed(1)}s)
                            </button>
                        )}

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ActivityModal;
