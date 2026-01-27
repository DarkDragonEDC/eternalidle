import React from 'react';
import { X, Sword, Shield, Zap, Heart } from 'lucide-react';
import { resolveItem } from '@shared/items';

const StatBreakdownModal = ({ statType, statId, value, stats, equipment, onClose }) => {
    // Calculate breakdowns based on known formulas
    const getBreakdown = () => {
        const breakdown = [];

        if (statType === 'DAMAGE') {
            // Formula: (5 + STR + GearDmg + IPBonus) * (1 + DmgBonus)
            // Note: We reverse engineer or re-calculate since we have raw data
            const str = stats.str || 0;
            const agi = stats.agi || 0;
            const int = stats.int || 0;
            const gearDamage = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.damage || 0), 0);
            const weapon = equipment.mainHand;
            const ipBonus = weapon ? (weapon.ip || 0) / 10 : 0;
            const gearDmgBonus = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.dmgBonus || 0), 0);

            breakdown.push({ label: 'Base', value: 5 });
            if (str > 0) breakdown.push({ label: 'Strength Bonus', value: str, sub: '(+1 Dmg per STR)' });
            if (agi > 0) breakdown.push({ label: 'Agility Bonus', value: agi, sub: '(+1 Dmg per AGI)' });
            if (int > 0) breakdown.push({ label: 'Intelligence Bonus', value: int, sub: '(+1 Dmg per INT)' });

            breakdown.push({ label: 'Gear Damage', value: gearDamage });
            if (ipBonus > 0) breakdown.push({ label: 'Weapon IP Bonus', value: ipBonus.toFixed(1), sub: '(IP / 10)' });

            const rawTotal = 5 + str + agi + int + gearDamage + ipBonus;

            if (gearDmgBonus > 0) {
                breakdown.push({ label: 'Raw Total', value: rawTotal.toFixed(1), isTotal: true });
                breakdown.push({ label: 'Bonus Modifier', value: `+${(gearDmgBonus * 100).toFixed(0)}%` });
            }
        } else if (statType === 'DEFENSE') {
            // Formula: GearDefense
            const gearDefense = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.defense || 0), 0);
            breakdown.push({ label: 'Base', value: 0 });
            breakdown.push({ label: 'Gear Defense', value: gearDefense });

            // Percentage Reduction display
            // Use Total Defense (stats.defense) not just Gear Defense
            const totalDef = stats.defense || 0;
            const mitigation = totalDef / (totalDef + 800);
            const reductionPercent = (mitigation * 100).toFixed(1);
            breakdown.push({ label: 'Est. Dmg Reduction', value: `${reductionPercent}%`, sub: 'Based on Def / (Def + 800)', isTotal: true });
        } else if (statType === 'SPEED') {
            // Formula: GlobalBase(2000) - WeaponSpeed - (AGI * 0.4) - GearSpeed
            // Everything converted to seconds for display (2 decimal places)
            const agi = stats.agi || 0;
            const gearSpeed = Object.entries(equipment).reduce((acc, [slot, item]) => {
                if (!item || slot === 'mainHand') return acc;
                const fresh = resolveItem(item.id || item.item_id);
                return acc + (fresh?.stats?.speed || 0);
            }, 0);

            // Get Weapon Speed (Default 1000 if no weapon)
            const weapon = equipment.mainHand;
            const freshWeapon = weapon ? resolveItem(weapon.id || weapon.item_id) : null;
            const weaponSpeed = freshWeapon?.stats?.speed || 1000;

            breakdown.push({ label: 'Global Base', value: '2.00s', sub: '(Attack Cycle Start)' });

            breakdown.push({
                label: 'Weapon Speed',
                value: `-${(weaponSpeed / 1000).toFixed(2)}s`,
                sub: freshWeapon ? `${freshWeapon.name} Speed` : '(Default Punch Speed)'
            });

            if (agi > 0) {
                breakdown.push({
                    label: 'Agility Bonus',
                    value: `-${(agi * 0.4 / 1000).toFixed(2)}s`,
                    sub: '(0.4ms per AGI)'
                });
            }

            if (gearSpeed > 0) {
                breakdown.push({
                    label: 'Gear Bonus',
                    value: `-${(gearSpeed / 1000).toFixed(2)}s`,
                    sub: '(1ms per Speed)'
                });
            }

            const totalReduction = weaponSpeed + gearSpeed + (agi * 0.4);
            const calculatedRaw = 2000 - totalReduction;
            const finalInterval = Math.max(200, calculatedRaw);

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
            // Formula: 100 + (STR * 10) + GearHP
            const str = stats.str || 0;
            const gearHP = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.hp || 0), 0);
            breakdown.push({ label: 'Base', value: 100 });
            breakdown.push({ label: 'Strength Bonus', value: str * 10, sub: '(10 per STR)' });
            breakdown.push({ label: 'Gear HP', value: gearHP });
        } else if (statType === 'EFFICIENCY') {
            const effId = statId; // Skill context
            const globalEff = stats.efficiency?.GLOBAL || 0;
            const int = stats.int || 0;

            if (effId === 'GLOBAL') {
                if (globalEff > 0) {
                    breakdown.push({ label: 'Global Bonus (Cape)', value: `+${globalEff}%` });
                } else {
                    breakdown.push({ label: 'No Global Bonus', value: '+0%' });
                }
            } else {
                breakdown.push({ label: 'Skill Base', value: '100% Speed' });
                if (effId) {
                    // If we have a specific skill (e.g. WOOD), show tool vs skill level
                    const skillsMap = {
                        WOOD: 'LUMBERJACK', ORE: 'ORE_MINER', HIDE: 'ANIMAL_SKINNER', FIBER: 'FIBER_HARVESTER', FISH: 'FISHING',
                        PLANK: 'PLANK_REFINER', METAL: 'METAL_BAR_REFINER', LEATHER: 'LEATHER_REFINER', CLOTH: 'CLOTH_REFINER',
                        WARRIOR: 'WARRIOR_CRAFTER', HUNTER: 'HUNTER_CRAFTER', MAGE: 'MAGE_CRAFTER', COOKING: 'COOKING'
                    };
                    const skillName = skillsMap[effId];
                    if (skillName) {
                        const skillLvl = stats.skills?.[skillName]?.level || 1;
                        breakdown.push({ label: 'Skill Level Bonus', value: `+${(skillLvl * 0.3).toFixed(1)}%`, sub: `(0.3% per ${skillName} Lv)` });
                    }

                    // Tools
                    const toolMap = { WOOD: 'tool_axe', ORE: 'tool_pickaxe', HIDE: 'tool_knife', FIBER: 'tool_sickle', FISH: 'tool_rod' };
                    const toolKey = toolMap[effId];
                    if (toolKey && equipment[toolKey]) {
                        const freshTool = resolveItem(equipment[toolKey].id || equipment[toolKey].item_id);
                        const toolEff = freshTool?.stats?.efficiency || 0;
                        breakdown.push({ label: 'Tool Bonus', value: `+${toolEff}%` });
                    }
                }

                if (globalEff > 0) {
                    // Find which item provides global efficiency (usually the cape)
                    const globalSource = Object.values(equipment).find(item => {
                        if (!item) return false;
                        const fresh = resolveItem(item.id || item.item_id);
                        return fresh?.stats?.efficiency?.GLOBAL > 0;
                    });

                    if (globalSource) {
                        const freshGlobal = resolveItem(globalSource.id || globalSource.item_id);
                        const actualGlobalEff = freshGlobal?.stats?.efficiency?.GLOBAL || 0;
                        breakdown.push({ label: `Global Bonus (${freshGlobal.name.split(' ').pop()})`, value: `+${actualGlobalEff}%` });
                    } else {
                        breakdown.push({ label: 'Global Bonus', value: `+${globalEff}%` });
                    }
                }
            }


        }

        return breakdown;
    };

    const rows = getBreakdown();

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                background: '#1a1d26',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '20px',
                width: '90%',
                maxWidth: '350px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                color: '#fff'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {statType === 'DAMAGE' && <Sword size={18} color="#ff4444" />}
                        {statType === 'DEFENSE' && <Shield size={18} color="#4caf50" />}
                        {statType === 'SPEED' && <Zap size={18} color="#2196f3" />}
                        {statType === 'HP' && <Heart size={18} color="#ff4d4d" />}
                        {statType} SOURCE
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
                            borderBottom: row.isTotal ? '1px dashed rgba(255,255,255,0.1)' : 'none',
                            fontWeight: row.isTotal ? 'bold' : 'normal',
                            color: row.isTotal ? '#fff' : '#ccc'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.9rem' }}>{row.label}</div>
                                {row.sub && <div style={{ fontSize: '0.65rem', color: '#666' }}>{row.sub}</div>}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#fff' }}>{row.value}</div>
                        </div>
                    ))}

                    <div style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '2px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontWeight: 'bold', color: '#aaa', fontSize: '0.9rem' }}>TOTAL</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#fff' }}>{value}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatBreakdownModal;
