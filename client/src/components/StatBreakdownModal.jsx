import React from 'react';
import { X, Sword, Shield, Zap, Heart } from 'lucide-react';

const StatBreakdownModal = ({ statType, value, stats, equipment, onClose }) => {
    // Calculate breakdowns based on known formulas
    const getBreakdown = () => {
        const breakdown = [];

        if (statType === 'DAMAGE') {
            // Formula: (5 + STR + GearDmg + IPBonus) * (1 + DmgBonus)
            // Note: We reverse engineer or re-calculate since we have raw data
            const str = stats.str || 0;
            const gearDamage = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.damage || 0), 0);
            const weapon = equipment.mainHand;
            const ipBonus = weapon ? (weapon.ip || 0) / 10 : 0;
            const gearDmgBonus = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.dmgBonus || 0), 0);

            breakdown.push({ label: 'Base', value: 5 });
            breakdown.push({ label: 'Strength Bonus', value: str, sub: '(1 per STR)' });
            breakdown.push({ label: 'Gear Damage', value: gearDamage });
            breakdown.push({ label: 'Weapon IP Bonus', value: ipBonus.toFixed(1), sub: '(IP / 10)' });

            const rawTotal = 5 + str + gearDamage + ipBonus;

            if (gearDmgBonus > 0) {
                breakdown.push({ label: 'Raw Total', value: rawTotal.toFixed(1), isTotal: true });
                breakdown.push({ label: 'Bonus Modifier', value: `+${(gearDmgBonus * 100).toFixed(0)}%` });
            }
        } else if (statType === 'DEFENSE') {
            // Formula: GearDefense
            const gearDefense = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.defense || 0), 0);
            breakdown.push({ label: 'Base', value: 0 });
            breakdown.push({ label: 'Gear Defense', value: gearDefense });
        } else if (statType === 'SPEED') {
            // Formula: 1000 - (AGI * 5)
            // Lower is faster (attack interval), but maybe UI shows "Speed" as abstract?
            // The value passed is likely the Interval (e.g. 600ms).
            const agi = stats.agi || 0;
            breakdown.push({ label: 'Base Interval', value: '1000ms' });
            breakdown.push({ label: 'Agility Reduction', value: `-${agi * 5}ms`, sub: '(5ms per AGI)' });
        } else if (statType === 'HP') {
            // Formula: 100 + (STR * 10) + GearHP
            const str = stats.str || 0;
            const gearHP = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.hp || 0), 0);
            breakdown.push({ label: 'Base', value: 100 });
            breakdown.push({ label: 'Strength Bonus', value: str * 10, sub: '(10 per STR)' });
            breakdown.push({ label: 'Gear HP', value: gearHP });
        } else if (statType === 'EFFICIENCY') {
            const effId = value?.id; // Skill context
            const globalEff = stats.efficiency?.GLOBAL || 0;
            const int = stats.int || 0;

            breakdown.push({ label: 'Skill Base', value: '100% Speed' });
            if (effId) {
                // If we have a specific skill (e.g. WOOD), show tool vs skill level
                const skillsMap = {
                    WOOD: 'LUMBERJACK', ORE: 'ORE_MINER', HIDE: 'ANIMAL_SKINNER', FIBER: 'FIBER_HARVESTER', FISH: 'FISHING',
                    PLANK: 'PLANK_REFINER', METAL: 'METAL_BAR_REFINER', LEATHER: 'LEATHER_REFINER', CLOTH: 'CLOTH_REFINER',
                    WARRIOR: 'WARRIOR_CRAFTER', HUNTER: 'HUNTER_CRAFTER', MAGE: 'MAGE_CRAFTER', COOKING: 'COOKING'
                };
                const skillName = skillsMap[effId];
                const skillLvl = stats.skills?.[skillName]?.level || 1;
                breakdown.push({ label: 'Skill Level Bonus', value: `+${skillLvl}%`, sub: `(1% per ${skillName} Lv)` });

                // Tools
                const toolMap = { WOOD: 'tool_axe', ORE: 'tool_pickaxe', HIDE: 'tool_knife', FIBER: 'tool_sickle', FISH: 'tool_rod' };
                const toolKey = toolMap[effId];
                if (toolKey && equipment[toolKey]) {
                    const toolEff = equipment[toolKey].stats?.efficiency || 0;
                    breakdown.push({ label: 'Tool Bonus', value: `+${toolEff}%` });
                }
            }

            if (int > 0) {
                breakdown.push({ label: 'Intelligence Global Bonus', value: `+${Math.min(50, int)}%`, sub: '(1% per INT, max 50)' });
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
                padding: '25px',
                width: '90%',
                maxWidth: '350px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                color: '#fff'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {statType === 'DAMAGE' && <Sword size={20} color="#ff4444" />}
                        {statType === 'DEFENSE' && <Shield size={20} color="#4caf50" />}
                        {statType === 'SPEED' && <Zap size={20} color="#2196f3" />}
                        {statType === 'HP' && <Heart size={20} color="#ff4d4d" />}
                        {statType} SOURCE
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {rows.map((row, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: row.isTotal ? '1px dashed rgba(255,255,255,0.1)' : 'none',
                            fontWeight: row.isTotal ? 'bold' : 'normal',
                            color: row.isTotal ? '#fff' : '#ccc'
                        }}>
                            <div>
                                <div>{row.label}</div>
                                {row.sub && <div style={{ fontSize: '0.7rem', color: '#666' }}>{row.sub}</div>}
                            </div>
                            <div style={{ fontSize: '1rem', color: '#fff' }}>{row.value}</div>
                        </div>
                    ))}

                    <div style={{
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: '2px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontWeight: 'bold', color: '#aaa' }}>TOTAL</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff' }}>{value}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatBreakdownModal;
