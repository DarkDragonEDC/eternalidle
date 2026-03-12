import React from 'react';
import { X, Sword, Shield, Zap, Heart, Star } from 'lucide-react';
import { resolveItem, calculateRuneBonus } from '@shared/items';
import { getProficiencyStats } from '@shared/proficiency_stats';

const StatBreakdownModal = ({ statType, statId, value, stats, equipment, membership, guildBonuses, onClose }) => {
    // Rounding helper to avoid 0.9999999999995 artifacts
    const fmt = (val) => {
        if (typeof val !== 'number') return val;
        return parseFloat(val.toFixed(1));
    };

    // Calculate breakdowns based on known formulas
    const getBreakdown = () => {
        const breakdown = [];

        if (statType === 'DAMAGE') {
            const activeProf = stats.activeProf;
            const profData = activeProf ? getProficiencyStats(activeProf, stats[`${activeProf}Prof`]) : { dmg: 0, hp: 0 };
            const activeProfDmg = profData.dmg;

            const activeProfLabel = activeProf === 'warrior' ? 'Warrior'
                : activeProf === 'hunter' ? 'Hunter'
                    : activeProf === 'mage' ? 'Mage' : null;

            const gearDamage = Object.values(equipment).reduce((acc, item) => {
                const fresh = item ? resolveItem(item.id || item.item_id) : null;
                return acc + (fresh?.stats?.damage || 0);
            }, 0);

            const gearDmgBonus = Object.values(equipment).reduce((acc, item) => {
                const fresh = item ? resolveItem(item.id || item.item_id) : null;
                return acc + (fresh?.stats?.dmgBonus || 0);
            }, 0);

            const damageRuneBonus = Object.entries(equipment).reduce((acc, [slot, item]) => {
                if (slot.startsWith('rune_') && item) {
                    const parts = slot.split('_');
                    const act = parts[1];
                    const eff = parts.slice(2).join('_');
                    if (act === 'ATTACK' && eff === 'ATTACK') {
                        const freshRune = resolveItem(item.id || item.item_id);
                        return acc + calculateRuneBonus(freshRune.tier, freshRune.stars, eff);
                    }
                }
                return acc;
            }, 0);


            if (activeProfLabel && activeProfDmg > 0) {
                breakdown.push({ label: `${activeProfLabel} Prof. Bonus`, value: fmt(activeProfDmg), sub: `(Total from Level)` });
            } else if (!activeProf) {
                breakdown.push({ label: 'No Weapon Equipped', value: 0, sub: '(Equip a weapon to activate)' });
            }

            breakdown.push({ label: 'Gear Damage', value: fmt(gearDamage) });

            const potionDmgBonus = stats.potionDmgBonus || 0;
            if (damageRuneBonus > 0) {
                breakdown.push({ label: 'Rune Bonus', value: `+${fmt(damageRuneBonus)}`, sub: '(Flat Damage)' });
            }
            if (potionDmgBonus > 0) {
                breakdown.push({ label: 'Potion Bonus', value: `+${fmt(potionDmgBonus * 100)}%`, sub: '(Multiplier)' });
            }
        } else if (statType === 'DEFENSE') {
            const activeProf = stats.activeProf;
            const profData = activeProf ? getProficiencyStats(activeProf, stats[`${activeProf}Prof`]) : { def: 0 };
            const activeProfDefense = profData.def || 0;
            const gearDefense = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.defense || 0), 0);


            if (activeProfDefense > 0) {
                const label = activeProf === 'hunter' ? 'Hunter' : activeProf === 'mage' ? 'Mage' : 'Warrior';
                breakdown.push({ label: `${label} Prof. Bonus`, value: fmt(activeProfDefense), sub: `(Total from Level)` });
            }
            breakdown.push({ label: 'Gear Defense', value: fmt(gearDefense) });

            const totalDef = stats.defense || 0;
            const mitigation = Math.min(0.75, totalDef / 10000);
            const reductionPercent = (mitigation * 100).toFixed(1);
            breakdown.push({ label: 'Est. Dmg Reduction', value: `${reductionPercent}%`, sub: 'Max 75% Reduction', isTotal: true });
        } else if (statType === 'SPEED') {
            const activeProf = stats.activeProf;
            const profData = activeProf ? getProficiencyStats(activeProf, stats[`${activeProf}Prof`]) : { speedBonus: 0 };
            const activeSpeedBonus = profData.speedBonus || 0;
            const gearSpeed = Object.entries(equipment).reduce((acc, [slot, item]) => {
                if (!item) return acc;
                const fresh = resolveItem(item.id || item.item_id);
                return acc + (fresh?.stats?.speed || fresh?.stats?.attackSpeed || 0);
            }, 0);

            const runeSpeedBonus = Object.entries(equipment).reduce((acc, [slot, item]) => {
                if (slot.startsWith('rune_') && item) {
                    const parts = slot.split('_');
                    if (parts.length >= 3) {
                        const eff = parts.slice(2).join('_');
                        if (eff === 'ATTACK_SPEED') {
                            const fresh = resolveItem(item.id || item.item_id);
                            return acc + calculateRuneBonus(fresh.tier, fresh.stars, eff);
                        }
                    }
                }
                return acc;
            }, 0);

            breakdown.push({ label: 'Global Base', value: '0.50 H/S', sub: '(Starting Rate)' });
            
            let totalBonus = 0;

            if (activeSpeedBonus > 0) {
                const label = activeProf === 'hunter' ? 'Hunter' : activeProf === 'mage' ? 'Mage' : 'Warrior';
                breakdown.push({
                    label: `${label} Proficiency`,
                    value: `+${activeSpeedBonus.toFixed(1)}%`,
                    sub: `(Level Growth)`
                });
                totalBonus += activeSpeedBonus;
            }

            if (gearSpeed > 0) {
                breakdown.push({
                    label: 'Gear Bonus',
                    value: `+${gearSpeed.toFixed(1)}%`,
                    sub: '(Equipment Stats)'
                });
                totalBonus += gearSpeed;
            }

            if (runeSpeedBonus > 0) {
                breakdown.push({
                    label: 'Haste Rune',
                    value: `+${runeSpeedBonus.toFixed(1)}%`,
                    sub: '(Bonus Multiplier)'
                });
                totalBonus += runeSpeedBonus;
            }

            const finalHPS = 0.5 * (1 + (totalBonus / 100));
            const finalInterval = Math.max(200, Math.floor(1000 / finalHPS));

            breakdown.push({
                label: 'Final HPS',
                value: `${finalHPS.toFixed(2)} hits/s`,
                isTotal: true
            });

            breakdown.push({
                label: 'Final Interval',
                value: `${(finalInterval / 1000).toFixed(2)}s`,
                sub: '(Attack Frequency)'
            });

            value = `${finalHPS.toFixed(2)} h/s`;
        } else if (statType === 'HP') {
            const activeProf = stats.activeProf;
            const profData = activeProf ? getProficiencyStats(activeProf, stats[`${activeProf}Prof`]) : { dmg: 0, hp: 0 };
            const activeHP = profData.hp;
            const gearHP = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.hp || 0), 0);

            breakdown.push({ label: 'Base', value: 100 });
            if (activeHP > 0) {
                const label = activeProf === 'warrior' ? 'Warrior' : 'Mage';
                breakdown.push({ label: `${label} Prof. Bonus`, value: fmt(activeHP), sub: `(Total from Level)` });
            }
            breakdown.push({ label: 'Gear HP', value: fmt(gearHP) });
        } else if (statType === 'EFFICIENCY') {
            const effId = statId;
            if (effId === 'GLOBAL') {
                const isPremium = membership?.active && membership?.expiresAt > Date.now();
                if (isPremium) breakdown.push({ label: 'Premium Membership', value: '+10%' });

                const globalSource = Object.values(equipment).find(item => {
                    if (!item) return false;
                    const fresh = resolveItem(item.id || item.item_id);
                    return fresh?.stats?.efficiency?.GLOBAL > 0;
                });

                if (globalSource) {
                    const freshGlobal = resolveItem(globalSource.id || globalSource.item_id);
                    breakdown.push({ label: `Global Item (${freshGlobal.name.split(' ').pop()})`, value: `+${freshGlobal?.stats?.efficiency?.GLOBAL}%` });
                }
            } else {
                breakdown.push({ label: 'Skill Base', value: '100% Speed' });
                const skillsMap = {
                    WOOD: 'LUMBERJACK', ORE: 'ORE_MINER', HIDE: 'ANIMAL_SKINNER', FIBER: 'FIBER_HARVESTER', FISH: 'FISHING', HERB: 'HERBALISM',
                    PLANK: 'PLANK_REFINER', METAL: 'METAL_BAR_REFINER', LEATHER: 'LEATHER_REFINER', CLOTH: 'CLOTH_REFINER', EXTRACT: 'DISTILLATION',
                    WARRIOR: 'WARRIOR_CRAFTER', HUNTER: 'HUNTER_CRAFTER', MAGE: 'MAGE_CRAFTER',
                    COOKING: 'COOKING', ALCHEMY: 'ALCHEMY', TOOLS: 'TOOL_CRAFTER'
                };
                const skillName = skillsMap[effId];
                if (skillName) {
                    const skillLvl = stats.skills?.[skillName]?.level || 1;
                    breakdown.push({ label: 'Skill Level Bonus', value: `+${(skillLvl * 0.2).toFixed(1)}%`, sub: `(0.2% per Lv)` });
                }

                const toolMap = { WOOD: 'tool_axe', ORE: 'tool_pickaxe', HIDE: 'tool_knife', FIBER: 'tool_sickle', FISH: 'tool_rod', HERB: 'tool_pouch' };
                const toolKey = toolMap[effId];
                if (toolKey && equipment[toolKey]) {
                    const freshTool = resolveItem(equipment[toolKey].id || equipment[toolKey].item_id);
                    breakdown.push({ label: 'Tool Bonus', value: `+${freshTool?.stats?.efficiency || 0}%` });
                }

                Object.entries(equipment).forEach(([slot, item]) => {
                    if (slot.startsWith('rune_') && item) {
                        const parts = slot.split('_');
                        const act = parts[1];
                        const eff = parts.slice(2).join('_');
                        if (act === effId && eff === 'EFF') {
                            const freshRune = resolveItem(item.id || item.item_id);
                            const bonus = calculateRuneBonus(freshRune.tier, freshRune.stars, eff);
                            breakdown.push({ label: 'Rune Bonus', value: `+${bonus}%`, sub: freshRune.name });
                        }
                    }
                });

                const isPremium = membership?.active && membership?.expiresAt > Date.now();
                if (isPremium) breakdown.push({ label: 'Premium Membership', value: '+10%' });

                // Guild Bonus
                const guildBuffs = guildBonuses || stats.guild_bonuses || {};
                const gatheringSkills = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'];
                const refiningSkills = ['PLANK', 'METAL', 'LEATHER', 'CLOTH', 'EXTRACT'];
                const craftingSkills = ['WARRIOR', 'HUNTER', 'MAGE', 'ALCHEMY', 'TOOLS', 'COOKING'];

                let guildVal = 0;
                if (gatheringSkills.includes(effId)) guildVal = guildBuffs.gathering_effic || 0;
                else if (refiningSkills.includes(effId)) guildVal = guildBuffs.refining_effic || 0;
                else if (craftingSkills.includes(effId)) guildVal = guildBuffs.crafting_effic || 0;

                if (guildVal > 0) {
                    breakdown.push({ label: 'Guild Bonus', value: `+${guildVal}%` });
                }
            }
        } else if (statType === 'CRIT') {
            const gearCritChance = Object.values(equipment).reduce((acc, item) => {
                const fresh = item ? resolveItem(item.id || item.item_id) : null;
                return acc + (fresh?.stats?.critChance || 0);
            }, 0);
            const burstRuneBonus = Object.entries(equipment).reduce((acc, [slot, item]) => {
                if (slot.startsWith('rune_') && item) {
                    const parts = slot.split('_');
                    if (parts[1] === 'ATTACK' && parts.slice(2).join('_') === 'BURST') {
                        const freshRune = resolveItem(item.id || item.item_id);
                        return acc + calculateRuneBonus(freshRune.tier, freshRune.stars, 'BURST');
                    }
                }
                return acc;
            }, 0);


            if (gearCritChance > 0) breakdown.push({ label: 'Gear Crit Chance', value: `+${gearCritChance.toFixed(2)}%` });
            if (burstRuneBonus > 0) breakdown.push({ label: 'Burst Rune Bonus', value: `+${burstRuneBonus.toFixed(2)}%` });
            if (stats.potionCritChance > 0) breakdown.push({ label: 'Potion Bonus', value: `+${stats.potionCritChance.toFixed(2)}%` });
            value = `${(gearCritChance + burstRuneBonus + (stats.potionCritChance || 0)).toFixed(2)}%`;
        }

        // Recalculate Total for Efficiency to ensure consistency
        if (statType === 'EFFICIENCY') {
            const calculatedTotal = breakdown.reduce((acc, row) => {
                if (typeof row.value === 'string' && row.value.includes('%')) {
                    const val = parseFloat(row.value.replace('+', '').replace('%', ''));
                    if (!isNaN(val)) return acc + val;
                }
                return acc;
            }, 0);

            // If the calculated total differs significantly (likely due to global bonuses not being in the passed prop), use the calculated one
            // We ignore "Speed" 100% base
            // breakdown.filter(r => r.label !== 'Skill Base')

            // Actually, for Efficiency we just want to sum everything except "Skill Base" which is a text label "100% Speed"
            const numericTotal = breakdown.reduce((acc, row) => {
                if (row.label === 'Skill Base') return acc;
                if (typeof row.value === 'string' && row.value.includes('%')) {
                    const val = parseFloat(row.value.replace('+', '').replace('%', ''));
                    // Only sum positive bonuses
                    if (!isNaN(val)) return acc + val;
                }
                return acc;
            }, 0);

            value = `+${numericTotal.toFixed(1)}%`;
        }

        return breakdown;
    };


    const rows = getBreakdown();

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(12px)',
            padding: '20px'
        }} onClick={onClose}>
            <style>
                {`
                    @keyframes slideUpFade {
                        from { transform: translateY(20px) scale(0.95); opacity: 0; }
                        to { transform: translateY(0) scale(1); opacity: 1; }
                    }
                    .aaa-modal {
                        animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                `}
            </style>
            <div
                className="aaa-modal"
                style={{
                    background: 'var(--panel-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px',
                    padding: '28px',
                    width: '100%',
                    maxWidth: '380px',
                    boxShadow: 'var(--panel-shadow)',
                    color: 'var(--text-main)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Decorative background glow */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    left: '-50px',
                    width: '150px',
                    height: '150px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontWeight: '800',
                        letterSpacing: '1px',
                        color: 'var(--text-main)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{
                            padding: '8px',
                            background: 'var(--slot-bg)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {statType === 'DAMAGE' && <Sword size={20} color="#ef4444" />}
                            {statType === 'DEFENSE' && <Shield size={20} color="#22c55e" />}
                            {statType === 'SPEED' && <Zap size={20} color="#0ea5e9" />}
                            {statType === 'HP' && <Heart size={20} color="#f43f5e" />}
                            {statType === 'CRIT' && <Star size={20} color="#f59e0b" />}
                            {statType === 'EFFICIENCY' && <Zap size={20} color="#8b5cf6" />}
                        </div>
                        {statType === 'EFFICIENCY' ? (
                            statId === 'GLOBAL' ? 'GLOBAL EFFICIENCY' : (
                                {
                                    WOOD: 'WOODCUTTING', ORE: 'MINING', HIDE: 'SKINNING', FIBER: 'FIBER', FISH: 'FISHING', HERB: 'HERBALISM',
                                    PLANK: 'PLANKS', METAL: 'BARS', LEATHER: 'LEATHERS', CLOTH: 'CLOTH', EXTRACT: 'DISTILLATION',
                                    WARRIOR: 'WARRIOR GEAR', MAGE: 'MAGE GEAR', COOKING: 'COOKING',
                                    ALCHEMY: 'ALCHEMY', TOOLS: 'TOOLS'
                                }[statId] || statId
                            )
                        ) : `${statType} SOURCE`}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--accent-soft)',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: '0.2s'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rows.map((row, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 14px',
                            background: row.isTotal ? 'rgba(255,255,255,0.03)' : 'transparent',
                            borderRadius: '12px',
                            border: row.isTotal ? '1px dashed rgba(255,255,255,0.1)' : 'none',
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: row.isTotal ? '700' : '500', color: row.isTotal ? 'var(--text-main)' : 'var(--text-dim)' }}>{row.label}</div>
                                {row.sub && <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', opacity: 0.7, marginTop: '2px' }}>{row.sub}</div>}
                            </div>
                            <div style={{
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                color: row.isTotal ? 'var(--text-main)' : 'var(--text-dim)',
                                textAlign: 'right'
                            }}>
                                {row.value}
                            </div>
                        </div>
                    ))}

                    <div style={{
                        marginTop: '16px',
                        padding: '20px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ fontWeight: '800', color: 'var(--text-dim)', fontSize: '0.75rem', letterSpacing: '2px' }}>FINAL TOTAL</div>
                        <div style={{
                            fontSize: '1.75rem',
                            fontWeight: '900',
                            color: 'var(--text-main)',
                            textShadow: '0 0 15px rgba(255,255,255,0.1)'
                        }}>{value}</div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default StatBreakdownModal;
