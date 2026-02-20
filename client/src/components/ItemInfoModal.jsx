import React from 'react';
import { X, Sword, Shield, Heart, Star, Zap, Award, Package, Clock, ShieldAlert, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QUALITIES, resolveItem, getSkillForItem, getLevelRequirement, getRequiredProficiencyGroup } from '@shared/items';
import { CHEST_DROP_TABLE, getChestRuneShardRange, WORLDBOSS_DROP_TABLE } from '@shared/chest_drops';

const ItemInfoModal = ({ item: rawItem, onClose }) => {
    if (!rawItem) return null;

    const resolved = resolveItem(rawItem.id || rawItem.item_id);
    const item = {
        ...resolved,
        ...rawItem,
        stats: { ...resolved?.stats, ...rawItem.stats }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const baseStats = item.stats || {};
    const statKeys = Object.keys(baseStats).filter(k => {
        const val = baseStats[k];
        if (['damage', 'defense', 'hp', 'str', 'agi', 'int', 'critChance', 'speed'].includes(k)) {
            return typeof val === 'number' && val > 0;
        }
        if (k === 'efficiency') {
            if (typeof val === 'number') return val > 0;
            if (typeof val === 'object' && val !== null) return Object.values(val).some(v => v > 0);
        }
        return false;
    });

    const baseItemResult = resolveItem(item.originalId || item.id);
    const comparisonBaseStats = baseItemResult?.stats || {};
    const comparisonStatKeys = Object.keys(comparisonBaseStats).filter(k =>
        (typeof comparisonBaseStats[k] === 'number' || typeof comparisonBaseStats[k] === 'object') &&
        ['damage', 'defense', 'hp', 'str', 'agi', 'int', 'efficiency', 'critChance'].includes(k)
    );

    const rarityComparison = Object.values(QUALITIES).map(q => {
        const qResolved = resolveItem(item.originalId || item.id, q.id);
        const qStats = qResolved?.stats || {};
        const calculatedStats = {};
        comparisonStatKeys.forEach(key => {
            if (key === 'efficiency') {
                if (typeof qStats[key] === 'number') calculatedStats.efficiency = qStats[key];
                else if (typeof qStats[key] === 'object' && qStats[key].GLOBAL) calculatedStats.globalEff = qStats[key].GLOBAL;
            } else {
                calculatedStats[key] = qStats[key];
            }
        });
        return { ...q, calculatedStats };
    });

    const tier = item.tier || 1;
    const TIER_COLORS = {
        1: '#a0a0a0', 2: '#4ade80', 3: '#60a5fa', 4: '#a855f7',
        5: '#fbbf24', 6: '#f87171', 7: '#f0f0f0', 8: '#d4af37',
    };
    const tierColor = item.rarityColor || TIER_COLORS[tier] || '#90d5ff';

    const getItemDescription = (itm) => {
        const desc = itm.description || itm.desc;
        if (desc && desc !== "A useful item for your journey.") return desc;
        if (['WEAPON'].includes(itm.type)) return "Offensive equipment. Increases your Damage.";
        if (['ARMOR', 'HELMET', 'BOOTS', 'GLOVES'].includes(itm.type)) return "Defensive equipment. Increases your Health and Defense.";
        if (['OFF_HAND'].includes(itm.type)) return itm.id.includes('SHEATH') ? "Secondary defensive equipment." : "Secondary equipment. Offers various bonuses.";
        if (itm.type === 'CAPE') return "Special cape. Offers passive bonuses and global efficiency.";
        if (itm.type.startsWith('TOOL')) return "Gathering tool. Required to gather higher TIER resources.";
        if (itm.type === 'FOOD') return itm.description || `Consumable. Restores ${itm.heal || (itm.healPercent ? `${itm.healPercent}% ` : '') || 'Health'} Health over time.`;
        if (itm.type === 'MAP') return "Dungeon Map. Use to access dangerous areas.";
        if (itm.type === 'POTION') return itm.desc || "Consumable potion with special effects.";
        if (itm.type === 'RUNE') return itm.description || "A magical rune with special power.";
        return itm.description || "A useful item for your journey.";
    };

    const StatRow = ({ icon: Icon, label, value, color = 'var(--text-dim)', valColor = 'var(--text-main)' }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color }}>
                <Icon size={13} strokeWidth={2.5} />
                <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: valColor }}>{value}</span>
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={handleBackdropClick}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(5, 7, 10, 0.85)', backdropFilter: 'blur(8px)' }} />

            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                style={{
                    width: '100%', maxWidth: '380px', background: 'linear-gradient(145deg, rgba(25, 30, 40, 0.95), rgba(10, 15, 20, 0.95))',
                    borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(144,213,255,0.05)',
                    position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
                }}>

                {/* Glass Glow Header */}
                <div style={{
                    position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '200px',
                    background: `radial-gradient(circle, ${tierColor}20 0%, transparent 70%)`, pointerEvents: 'none'
                }} />

                <div style={{ padding: '20px 20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--text-dim)', border: 'none', background: 'none', cursor: 'pointer' }}><X size={22} /></button>

                    <div style={{
                        width: '70px', height: '70px', background: 'rgba(255,255,255,0.03)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: `0 0 20px ${tierColor}15`
                    }}>
                        <img src={item.icon} style={{ width: item.scale || '130%', height: item.scale || '130%', objectFit: 'contain', filter: `drop-shadow(0 0 8px ${tierColor}40)` }} alt="" />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: tierColor, letterSpacing: '-0.5px', marginBottom: '4px' }}>{item.name}</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
                            {item.stars > 0 && Array.from({ length: item.stars }).map((_, i) => (
                                <Star key={i} size={14} color="#fbbf24" fill="#fbbf24" strokeWidth={3} />
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: '800', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>T{item.tier}</div>
                        <div style={{ fontSize: '0.6rem', color: tierColor, fontWeight: '800', border: `1px solid ${tierColor}40`, padding: '2px 10px', borderRadius: '100px', textTransform: 'uppercase' }}>{item.type}</div>
                        {item.ip > 0 && <div style={{ fontSize: '0.6rem', color: '#fbbf24', fontWeight: '800', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '2px 8px', borderRadius: '100px' }}>IP {item.ip}</div>}
                    </div>
                </div>

                <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '16px', margin: '0 4px 20px 0' }} className="custom-scrollbar">

                    {/* Description Section */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.5', display: 'block' }}>"{getItemDescription(item)}"</span>
                    </div>

                    {/* Requirement Alert */}
                    {(() => {
                        if (item.type === 'FOOD' || item.type === 'POTION' || item.type === 'RUNE') return null;
                        const reqLv = getLevelRequirement(item.tier);
                        const profGroup = getRequiredProficiencyGroup(item.id);
                        let reqText = '';
                        if (profGroup) reqText = `${profGroup.charAt(0).toUpperCase() + profGroup.slice(1)} Prof. Lv ${reqLv}`;
                        else {
                            const TOOL_TYPE_TO_SKILL = {
                                'TOOL_AXE': 'LUMBERJACK', 'TOOL_PICKAXE': 'ORE_MINER',
                                'TOOL_KNIFE': 'ANIMAL_SKINNER', 'TOOL_SICKLE': 'FIBER_HARVESTER',
                                'TOOL_ROD': 'FISHING', 'TOOL_POUCH': 'HERBALISM'
                            };
                            const skillKey = TOOL_TYPE_TO_SKILL[item.type] || getSkillForItem(item.id, 'GATHERING') || getSkillForItem(item.id, 'REFINING') || getSkillForItem(item.id, 'CRAFTING');
                            if (skillKey) reqText = `${skillKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Lv ${reqLv}`;
                        }
                        if (!reqText) return null;
                        return (
                            <div style={{ background: 'rgba(248, 113, 113, 0.05)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldAlert size={14} color="#f87171" />
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#f87171', textTransform: 'uppercase' }}>Requires: {reqText}</span>
                            </div>
                        );
                    })()}

                    {/* Attributes Section */}
                    {statKeys.length > 0 && (
                        <div className="glass-panel" style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '1px' }}>ITEM ATTRIBUTES</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {baseStats.damage && <StatRow icon={Sword} label="Damage" value={item.stats.damage} valColor="#f87171" />}
                                {baseStats.hp && <StatRow icon={Heart} label="Health" value={item.stats.hp} valColor="#fb7185" />}
                                {baseStats.defense && <StatRow icon={Shield} label="Defense" value={item.stats.defense} valColor="#4ade80" />}
                                {baseStats.critChance && <StatRow icon={Star} label="Crit Chance" value={`${item.stats.critChance.toFixed(2)}%`} valColor="#fbbf24" />}
                                {baseStats.attackSpeed && <StatRow icon={Zap} label="Attack Speed" value={(1000 / item.stats.attackSpeed).toFixed(1)} valColor="#90d5ff" />}
                                {baseStats.speed && <StatRow icon={Zap} label="Speed" value={item.stats.speed} valColor="#90d5ff" />}
                                {(baseStats.warriorProf || baseStats.str) && <StatRow icon={Award} label="War. Prof." value={`+${item.stats.warriorProf || item.stats.str}`} valColor="#ff8888" />}
                                {(baseStats.hunterProf || baseStats.agi) && <StatRow icon={Award} label="Hun. Prof." value={`+${item.stats.hunterProf || item.stats.agi}`} valColor="#88ff88" />}
                                {(baseStats.mageProf || baseStats.int) && <StatRow icon={Award} label="Mag. Prof." value={`+${item.stats.mageProf || item.stats.int}`} valColor="#8888ff" />}
                                {item.heal && <StatRow icon={Heart} label="Heal" value={item.heal} valColor="#4ade80" />}
                                {baseStats.efficiency && typeof baseStats.efficiency === 'number' && <StatRow icon={Info} label="Efficiency" value={`+${item.stats.efficiency}%`} valColor="#90d5ff" />}
                                {baseStats.efficiency && typeof baseStats.efficiency === 'object' && baseStats.efficiency.GLOBAL && <StatRow icon={Info} label="Global Eff." value={`+${item.stats.efficiency.GLOBAL}%`} valColor="#90d5ff" />}
                            </div>
                        </div>
                    )}

                    {/* Crafted By */}
                    {item.craftedBy && (
                        <div style={{ background: 'rgba(251, 191, 36, 0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Award size={14} color="#fbbf24" />
                                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase' }}>Crafted By</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#fff' }}>{item.craftedBy}</span>
                        </div>
                    )}

                    {/* Chest Drops */}
                    {item.id.includes('CHEST') && (
                        <div className="glass-panel" style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '1px' }}>POSSIBLE REWARDS</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(() => {
                                    if (item.id === 'NOOB_CHEST') {
                                        return (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fff' }}>200x T1 Food</span>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#4ade80' }}>100%</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fff' }}>1x T1 Sword</span>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#4ade80' }}>100%</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fff' }}>1x T1 Bow</span>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#4ade80' }}>100%</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fff' }}>1x T1 Staff</span>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#4ade80' }}>100%</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fff' }}>50x T1 Rune Shards</span>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#4ade80' }}>100%</span>
                                                </div>
                                            </>
                                        );
                                    }

                                    const isWorldBoss = item.id.includes('WORLDBOSS');
                                    const shardName = isWorldBoss ? 'Battle Rune Shard' : `Rune Shard (T${item.tier})`;
                                    if (isWorldBoss) {
                                        const qty = WORLDBOSS_DROP_TABLE[item.id] || 0;
                                        return (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#9013fe' }}>{shardName} x{qty}</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#4ade80' }}>100%</span>
                                            </div>
                                        );
                                    }
                                    const [min, max] = getChestRuneShardRange(item.tier, item.rarity);
                                    return (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fff' }}>{shardName}</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: '900', color: tierColor }}>100%</span>
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textAlign: 'right', marginTop: '-4px' }}>{min} (80%) / {max} (20%)</div>
                                        </>
                                    );
                                })()}
                                {!item.id.includes('WORLDBOSS') && item.id !== 'NOOB_CHEST' && CHEST_DROP_TABLE.RARITIES[item.rarity]?.crestChance > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: tierColor }}>Boss Crest (T{item.tier})</span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: '900', color: tierColor }}>{(CHEST_DROP_TABLE.RARITIES[item.rarity].crestChance * 100).toFixed(0)}%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quality Comparison */}
                    {statKeys.length > 0 && !['FOOD', 'POTION'].includes(item.type) && !item.id.includes('CHEST') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-dim)', letterSpacing: '1px' }}>SCALING BY QUALITY</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {rarityComparison.map(q => {
                                    const isCurrent = q.id === (item.quality || 0);
                                    return (
                                        <div key={q.id} style={{
                                            background: isCurrent ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                                            padding: '8px 12px', borderRadius: '10px',
                                            border: `1px solid ${isCurrent ? q.color + '40' : 'rgba(255,255,255,0.05)'}`,
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: q.color }} />
                                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: q.color }}>{q.name}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', fontWeight: '900', color: isCurrent ? '#fff' : 'var(--text-dim)' }}>
                                                {Object.entries(q.calculatedStats).map(([k, v]) => (
                                                    <span key={k}>{k.slice(0, 3).toUpperCase()}: {v}</span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
            </motion.div>
        </div>
    );
};

export default ItemInfoModal;
