import React from 'react';
import { X, Sword, Shield, Zap, Heart, Star } from 'lucide-react';
import { resolveItem, calculateRuneBonus } from '@shared/items';

const StatBreakdownModal = ({ statType, statId, value, stats, equipment, membership, onClose }) => {
    // Calculate breakdowns based on known formulas
    const getBreakdown = () => {
        const breakdown = [];

        if (statType === 'DAMAGE') {
            // Formula: (5 + ActiveProfDmg + GearDmg) * (1 + DmgBonus) * (1 + RuneBonus)
            // Only the proficiency matching the equipped weapon contributes
            const warriorProf = stats.warriorProf || 0;
            const hunterProf = stats.hunterProf || 0;
            const mageProf = stats.mageProf || 0;
            const activeProf = stats.activeProf; // 'warrior' | 'hunter' | 'mage' | null
            const activeProfDmg = activeProf === 'warrior' ? warriorProf * 1200
                : activeProf === 'hunter' ? hunterProf * 1200
                    : activeProf === 'mage' ? mageProf * 2600 : 0;
            const activeProfLabel = activeProf === 'warrior' ? 'Warrior'
                : activeProf === 'hunter' ? 'Hunter'
                    : activeProf === 'mage' ? 'Mage' : null;
            const activeProfPerPt = activeProf === 'warrior' ? 1200
                : activeProf === 'hunter' ? 1200
                    : activeProf === 'mage' ? 2600 : 0;
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

            breakdown.push({ label: 'Base', value: 5 });
            if (activeProfLabel && activeProfDmg > 0) {
                breakdown.push({ label: `${activeProfLabel} Prof. Bonus`, value: activeProfDmg.toFixed(1), sub: `(+${activeProfPerPt} DMG per ${activeProfLabel} Prof.)` });
            } else if (!activeProf) {
                breakdown.push({ label: 'No Weapon Equipped', value: 0, sub: '(Equip a weapon to activate a proficiency)' });
            }

            breakdown.push({ label: 'Gear Damage', value: gearDamage });

            const rawTotal = 5 + activeProfDmg + gearDamage;

            if (gearDmgBonus > 0 || damageRuneBonus > 0) {
                breakdown.push({ label: 'Raw Total', value: rawTotal.toFixed(1), isTotal: true });
                if (gearDmgBonus > 0) breakdown.push({ label: 'Gear Modifier', value: `+${(gearDmgBonus * 100).toFixed(0)}%` });
                if (damageRuneBonus > 0) breakdown.push({ label: 'Rune Modifier', value: `+${damageRuneBonus.toFixed(1)}%` });
            }
        } else if (statType === 'DEFENSE') {
            // Formula: GearDefense
            const warriorProf = stats.warriorProf || 0;
            const hunterProf = stats.hunterProf || 0;
            const mageProf = stats.mageProf || 0;
            const activeProf = stats.activeProf;

            const activeProfDefense = activeProf === 'hunter' ? hunterProf * 25
                : activeProf === 'mage' ? mageProf * 12.5
                    : activeProf === 'warrior' ? warriorProf * 37.5 : 0;
            const gearDefense = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.defense || 0), 0);

            breakdown.push({ label: 'Base', value: 0 });
            if (activeProfDefense > 0) {
                const label = activeProf === 'hunter' ? 'Hunter' : activeProf === 'mage' ? 'Mage' : 'Warrior';
                const perPt = activeProf === 'hunter' ? 25 : activeProf === 'mage' ? 12.5 : 37.5;
                breakdown.push({ label: `${label} Prof. Bonus`, value: activeProfDefense, sub: `(+${perPt} per ${label} Prof.)` });
            }
            breakdown.push({ label: 'Gear Defense', value: gearDefense });

            // Percentage Reduction display
            // Use Total Defense (stats.defense) not just Gear Defense
            const totalDef = stats.defense || 0;
            const mitigation = Math.min(0.75, totalDef / 10000);
            const reductionPercent = (mitigation * 100).toFixed(1);
            breakdown.push({ label: 'Est. Dmg Reduction', value: `${reductionPercent}%`, sub: '1% Reduction per 100 DEF (Max 75%)', isTotal: true });
        } else if (statType === 'SPEED') {
            // Formula: GlobalBase(2000) - WeaponSpeed - ActiveSpeedBonus - GearSpeed
            // Speed bonus only applies if a Bow is equipped
            const hunterProf = stats.hunterProf || 0;
            const mageProf = stats.mageProf || 0;
            const activeProf = stats.activeProf;
            const activeSpeedBonus = activeProf === 'hunter' ? hunterProf * 3.6
                : activeProf === 'mage' ? mageProf * 3.33
                    : activeProf === 'warrior' ? warriorProf * 3.33 : 0;
            const gearSpeed = Object.entries(equipment).reduce((acc, [slot, item]) => {
                if (!item || slot === 'mainHand') return acc;
                const fresh = resolveItem(item.id || item.item_id);
                return acc + (fresh?.stats?.speed || 0);
            }, 0);

            // Calculate Attack Speed Rune
            const runeSpeedBonus = Object.entries(equipment).reduce((acc, [slot, item]) => {
                if (slot.startsWith('rune_') && item) {
                    // slot format: rune_{ACT}_{EFF}
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

            // Get Weapon Speed (0 if no weapon - unarmed has no speed bonus)
            const weapon = equipment.mainHand;
            const freshWeapon = weapon ? resolveItem(weapon.id || weapon.item_id) : null;
            const weaponSpeed = freshWeapon?.stats?.speed || 0; // No weapon = no speed bonus

            breakdown.push({ label: 'Global Base', value: '2.00s', sub: '(Attack Cycle Start)' });

            // Only show weapon speed if a weapon is equipped
            if (freshWeapon && weaponSpeed > 0) {
                breakdown.push({
                    label: 'Weapon Speed',
                    value: `-${(weaponSpeed / 1000).toFixed(2)}s`,
                    sub: `${freshWeapon.name}`
                });
            }

            if (activeSpeedBonus > 0) {
                const label = activeProf === 'hunter' ? 'Hunter' : activeProf === 'mage' ? 'Mage' : 'Warrior';
                const perPt = activeProf === 'hunter' ? 3.6 : activeProf === 'mage' ? 3.33 : 3.33;
                breakdown.push({
                    label: `${label} Proficiency Bonus`,
                    value: `-${(activeSpeedBonus / 1000).toFixed(2)}s`,
                    sub: `(${perPt}ms per ${label} Prof.)`
                });
            } else if (activeProf && activeProf !== 'hunter' && hunterProf > 0) {
                breakdown.push({
                    label: 'Hunter Prof. (Inactive)',
                    value: '0s',
                    sub: '(Requires Bow to activate)'
                });
            }

            if (gearSpeed > 0) {
                breakdown.push({
                    label: 'Gear Bonus',
                    value: `-${(gearSpeed / 1000).toFixed(2)}s`,
                    sub: '(1ms per Speed)'
                });
            }

            const totalReduction = weaponSpeed + gearSpeed + activeSpeedBonus;
            const calculatedRaw = 2000 - totalReduction;
            let finalInterval = Math.max(200, calculatedRaw);

            if (runeSpeedBonus > 0 && finalInterval > 200) {
                breakdown.push({
                    label: 'Att. Speed Rune',
                    value: `+${runeSpeedBonus.toFixed(1)}%`,
                    sub: 'Multiplies attack rate'
                });

                finalInterval = finalInterval / (1 + (runeSpeedBonus / 100));
                // Re-apply cap
                finalInterval = Math.max(200, finalInterval);
            }

            if (calculatedRaw < 200) {
                breakdown.push({
                    label: 'Cap Correction',
                    value: `+${((200 - calculatedRaw) / 1000).toFixed(2)}s`,
                    sub: '(Min 0.20s limit)'
                });
            }

            breakdown.push({
                label: 'Final Interval',
                value: `${(finalInterval / 1000).toFixed(2)}s`,
                isTotal: true
            });

            // Override the "Total" display at the bottom to show hits/second
            value = `${(1000 / finalInterval).toFixed(1)} h/s`;
        } else if (statType === 'HP') {
            // Formula: 100 + ActiveHP + GearHP
            // HP bonus only applies if a Sword is equipped
            const warriorProf = stats.warriorProf || 0;
            const mageProf = stats.mageProf || 0;
            const activeProf = stats.activeProf;
            const activeHP = activeProf === 'warrior' ? warriorProf * 10000
                : activeProf === 'mage' ? mageProf * 7500 : 0;
            const gearHP = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.hp || 0), 0);
            breakdown.push({ label: 'Base', value: 100 });
            if (activeHP > 0) {
                const label = activeProf === 'warrior' ? 'Warrior' : 'Mage';
                const perPt = activeProf === 'warrior' ? 10000 : 7500;
                breakdown.push({ label: `${label} Prof. Bonus`, value: activeHP, sub: `(+${perPt} per ${label} Prof.)` });
            } else if (activeProf && activeProf !== 'warrior' && activeProf !== 'mage' && (warriorProf > 0 || mageProf > 0)) {
                breakdown.push({ label: 'Proficiency (Inactive)', value: 0, sub: '(Requires specific weapon to activate)' });
            }
            breakdown.push({ label: 'Gear HP', value: gearHP });
        } else if (statType === 'EFFICIENCY') {
            const effId = statId; // Skill context
            const globalEffVal = stats.efficiency?.GLOBAL || 0;

            if (effId === 'GLOBAL') {
                const isPremium = membership?.active && membership?.expiresAt > Date.now();
                if (isPremium) {
                    breakdown.push({ label: 'Premium Membership', value: '+10%' });
                }

                // Global items (usually cape)
                const globalSource = Object.values(equipment).find(item => {
                    if (!item) return false;
                    const fresh = resolveItem(item.id || item.item_id);
                    return fresh?.stats?.efficiency?.GLOBAL > 0;
                });

                if (globalSource) {
                    const freshGlobal = resolveItem(globalSource.id || globalSource.item_id);
                    const actualGlobalEff = freshGlobal?.stats?.efficiency?.GLOBAL || 0;
                    breakdown.push({ label: `Global Item (${freshGlobal.name.split(' ').pop()})`, value: `+${actualGlobalEff}%` });
                }
            } else {
                breakdown.push({ label: 'Skill Base', value: '100% Speed' });
                if (effId) {
                    const skillsMap = {
                        WOOD: 'LUMBERJACK', ORE: 'ORE_MINER', HIDE: 'ANIMAL_SKINNER', FIBER: 'FIBER_HARVESTER', FISH: 'FISHING',
                        PLANK: 'PLANK_REFINER', METAL: 'METAL_BAR_REFINER', LEATHER: 'LEATHER_REFINER', CLOTH: 'CLOTH_REFINER',
                        WARRIOR: 'WARRIOR_CRAFTER', MAGE: 'MAGE_CRAFTER', COOKING: 'COOKING'
                    };
                    const skillName = skillsMap[effId];
                    if (skillName) {
                        const skillLvl = stats.skills?.[skillName]?.level || 1;
                        breakdown.push({ label: 'Skill Level Bonus', value: `+${(skillLvl * 0.2).toFixed(1)}%`, sub: `(0.2% per ${skillName} Lv)` });
                    }

                    const toolMap = { WOOD: 'tool_axe', ORE: 'tool_pickaxe', HIDE: 'tool_knife', FIBER: 'tool_sickle', FISH: 'tool_rod' };
                    const toolKey = toolMap[effId];
                    if (toolKey && equipment[toolKey]) {
                        const freshTool = resolveItem(equipment[toolKey].id || equipment[toolKey].item_id);
                        const toolEff = freshTool?.stats?.efficiency || 0;
                        breakdown.push({ label: 'Tool Bonus', value: `+${toolEff}%` });
                    }

                    // Rune Bonus
                    Object.entries(equipment).forEach(([slot, item]) => {
                        if (slot.startsWith('rune_') && item) {
                            const parts = slot.split('_');
                            const act = parts[1];
                            const eff = parts.slice(2).join('_');

                            if (act === effId && eff === 'EFF') {
                                const freshRune = resolveItem(item.id || item.item_id);
                                if (freshRune) {
                                    const bonus = calculateRuneBonus(freshRune.tier, freshRune.stars, eff);
                                    breakdown.push({ label: 'Rune Bonus', value: `+${bonus}%`, sub: `${freshRune.name}` });
                                }
                            }
                        }
                    });
                }

                // Global Bonuses (Membership + Items)
                const isPremium = membership?.active && membership?.expiresAt > Date.now();
                if (isPremium) {
                    breakdown.push({ label: 'Premium Membership', value: '+10%' });
                }

                const globalSource = Object.values(equipment).find(item => {
                    if (!item) return false;
                    const fresh = resolveItem(item.id || item.item_id);
                    return fresh?.stats?.efficiency?.GLOBAL > 0;
                });

                if (globalSource) {
                    const freshGlobal = resolveItem(globalSource.id || globalSource.item_id);
                    const actualGlobalEff = freshGlobal?.stats?.efficiency?.GLOBAL || 0;
                    breakdown.push({ label: `Global Bonus (${freshGlobal.name.split(' ').pop()})`, value: `+${actualGlobalEff}%` });
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
                    const act = parts[1];
                    const eff = parts.slice(2).join('_');
                    if (act === 'ATTACK' && eff === 'BURST') {
                        const freshRune = resolveItem(item.id || item.item_id);
                        return acc + calculateRuneBonus(freshRune.tier, freshRune.stars, eff);
                    }
                }
                return acc;
            }, 0);

            breakdown.push({ label: 'Base Crit Rate', value: '0%' });
            if (gearCritChance > 0) breakdown.push({ label: 'Gear Crit Chance', value: `+${gearCritChance.toFixed(2)}%` });
            if (burstRuneBonus > 0) breakdown.push({ label: 'Burst Rune Bonus', value: `+${burstRuneBonus.toFixed(2)}%` });

            value = `${(gearCritChance + burstRuneBonus).toFixed(2)}%`;


        }

        return breakdown;
    };

    const rows = getBreakdown();

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '20px',
                width: '90%',
                maxWidth: '350px',
                boxShadow: 'var(--panel-shadow)',
                color: 'var(--text-main)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
                        {statType === 'DAMAGE' && <Sword size={18} color="#ff4444" />}
                        {statType === 'DEFENSE' && <Shield size={18} color="#4caf50" />}
                        {statType === 'SPEED' && <Zap size={18} color="#2196f3" />}
                        {statType === 'HP' && <Heart size={18} color="#ff4d4d" />}
                        {statType === 'CRIT' && <Star size={18} color="#f59e0b" />}
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
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {rows.map((row, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 0',
                            borderBottom: row.isTotal ? '1px dashed var(--border)' : 'none',
                            fontWeight: row.isTotal ? 'bold' : 'normal',
                            color: row.isTotal ? 'var(--text-main)' : 'var(--text-dim)'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.9rem' }}>{row.label}</div>
                                {row.sub && <div style={{ fontSize: '0.65rem', color: '#666' }}>{row.sub}</div>}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{row.value}</div>
                        </div>
                    ))}

                    <div style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '2px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-dim)', fontSize: '0.9rem' }}>TOTAL</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--text-main)' }}>{value}</div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default StatBreakdownModal;
