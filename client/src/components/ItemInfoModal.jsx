import React from 'react';
import { X, Sword, Shield, Heart, Star, Zap, Award } from 'lucide-react';
import { QUALITIES, resolveItem, getSkillForItem, getLevelRequirement, getRequiredProficiencyGroup } from '@shared/items';
import { CHEST_DROP_TABLE, getChestRuneShardRange, WORLDBOSS_DROP_TABLE } from '@shared/chest_drops';

const ItemInfoModal = ({ item: rawItem, onClose }) => {
    if (!rawItem) return null;

    const resolved = resolveItem(rawItem.id || rawItem.item_id);

    // For tools/gear, we want to prioritize the resolved (authentic) stats over stale stored stats
    const mergedStats = { ...resolved?.stats };
    // If it's not a tool, we can allow some merging if needed, but for tools specifically 
    // we must ensure efficiency comes from the formula.
    const item = {
        ...resolved,
        ...rawItem,
        stats: mergedStats // Primary source for gear/tools
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const baseStats = item.stats || {};
    const statKeys = Object.keys(baseStats).filter(k =>
        (typeof baseStats[k] === 'number' && ['damage', 'defense', 'hp', 'str', 'agi', 'int', 'critChance'].includes(k)) ||
        (k === 'efficiency')
    );

    // For comparison, we need the AUTHENTIC base stats of the item (Quality 0)
    // otherwise we are scaling a scaled value.
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

        return {
            ...q,
            calculatedStats
        };
    });

    // Clean name: remove T{tier} from the name if we are going to append it manually
    // Base name cleanup is handled in the render for titles

    const getItemDescription = (itm) => {
        // Prioritize actual item description if it exists (for Runes, Chests, Potions)
        const desc = itm.description || itm.desc;
        if (desc && desc !== "A useful item for your journey.") {
            return desc;
        }

        if (['WEAPON'].includes(itm.type)) return "Offensive equipment. Increases your Damage.";
        if (['ARMOR', 'HELMET', 'BOOTS', 'GLOVES'].includes(itm.type)) return "Defensive equipment. Increases your Health and Defense.";
        if (['OFF_HAND'].includes(itm.type)) {
            if (itm.id.includes('SHIELD')) return "Secondary defensive equipment.";
            return "Secondary equipment. Offers various bonuses.";
        }
        if (itm.type === 'CAPE') return "Special cape. Offers passive bonuses and global efficiency.";
        if (itm.type.startsWith('TOOL')) return "Gathering tool. Required to gather higher TIER resources.";

        if (itm.type === 'FOOD') return itm.description || `Consumable. Restores ${itm.heal || (itm.healPercent ? `${itm.healPercent}% ` : '') || 'Health'} Health over time.`;
        if (itm.type === 'MAP') return "Dungeon Map. Use to access dangerous areas with valuable rewards.";
        if (itm.type === 'CRAFTING_MATERIAL' && itm.id.includes('CREST')) return "Rare boss material. Used to craft prestige items.";

        if (itm.type === 'RESOURCE' || itm.type === 'RAW' || itm.type === 'REFINED') {
            if (itm.type === 'REFINED' || itm.req) return "Refined material. Used to craft equipment and structures.";
            return "Raw material gathered in the world. Used to refine materials.";
        }

        if (itm.type === 'POTION') return itm.desc || "Consumable potion with special effects.";

        if (itm.type === 'RUNE') {
            // Calculate actual bonus for display
            // ID format: T{tier}_RUNE_{ACT}_{EFF}_{stars}STAR

            // Safer parsing logic using regex to separate Tier and Stars from the core Type
            // RUNE ID: T{t}_RUNE_{TYPE}_{stars}STAR
            const match = itm.id.match(/^T\d+_RUNE_(.+)_(\d+)STAR$/);
            if (match) {
                const typeStr = match[1];
                const typeParts = typeStr.split('_');
                const activity = typeParts[0];
                const effect = typeParts.slice(1).join('_');

                const bonus = calculateRuneBonus(itm.tier, itm.stars, effect);

                let bonusText = "";
                if (effect === 'XP') bonusText = `+${bonus} XP per action`;
                else if (effect === 'COPY') bonusText = `+${bonus}% Double Item Chance`;
                else if (effect === 'SPEED') bonusText = `+${bonus} Speed`;
                else if (effect === 'EFF') bonusText = `+${bonus}% Efficiency`;
                else if (effect === 'ATTACK') bonusText = `+${bonus.toFixed(1)}% Damage`;
                else if (effect === 'SAVE_FOOD') bonusText = `+${bonus}% Food Save Chance`;
                else if (effect === 'BURST') bonusText = `+${bonus}% Critical Strike Chance`;
                else if (effect === 'ATTACK_SPEED') bonusText = `+${bonus.toFixed(1)}% Attack Speed`;

                return `Rune of ${activity.charAt(0) + activity.slice(1).toLowerCase()}. Gives: ${bonusText}.`;
            }
            return itm.description || "A magical rune with special power.";
        }

        return itm.description || "A useful item for your journey.";
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 20000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            padding: '20px'
        }} onClick={handleBackdropClick}>
            <div style={{
                background: 'var(--panel-bg)',
                width: '95%',
                maxWidth: '450px',
                maxHeight: '90vh',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                gap: '20px',
                boxShadow: 'var(--panel-shadow)',
                color: 'var(--text-main)',
                overflow: 'hidden' // Fix overflow leaking
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '12px',
                    position: 'relative',
                    flexShrink: 0 // Prevent header shrinking
                }}>
                    <div style={{
                        position: 'absolute',
                        top: -20,
                        left: -20,
                        right: -20,
                        height: '4px',
                        background: item.rarityColor || 'var(--accent)',
                        borderRadius: '12px 12px 0 0'
                    }}></div>
                    <h3 style={{ margin: 0, color: item.rarityColor || 'var(--accent)', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.name}
                        {item.stars > 0 && (
                            <span style={{ display: 'inline-flex', gap: '2px', marginLeft: '4px' }}>
                                {Array.from({ length: item.stars }).map((_, i) => (
                                    <Star key={i} size={14} color="#fbbf24" fill="#fbbf24" strokeWidth={3} />
                                ))}
                            </span>
                        )}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', transition: '0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content Wrapper */}
                <div style={{
                    overflowY: 'auto',
                    paddingRight: '5px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    marginRight: '-10px', // Compensation for padding
                    paddingRight: '10px' // Space for scrollbar
                }}>

                    {/* Description Section */}
                    <div style={{
                        padding: '12px',
                        background: 'var(--accent-soft)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        fontSize: '0.9rem',
                        color: 'var(--text-main)',
                        fontStyle: 'italic',
                        lineHeight: '1.4',
                        textAlign: 'center'
                    }}>
                        "{getItemDescription(item)}"
                    </div>

                    {/* Signature Section */}
                    {item.craftedBy && (
                        <div style={{
                            fontSize: '0.7rem',
                            color: '#fbbf24', // Amber/Yellow
                            fontWeight: 'bold',
                            textAlign: 'center',
                            marginTop: '-10px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}>
                            <Award size={12} /> Crafted by {item.craftedBy}
                        </div>
                    )}

                    {/* Compact Info Badges */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        justifyContent: 'center'
                    }}>
                        <div style={{ padding: '4px 10px', background: 'var(--accent-soft)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid var(--border-active)' }}>
                            <span style={{ color: '#888', marginRight: '4px' }}>T</span>{item.tier}
                        </div>
                        <div style={{ padding: '4px 10px', background: 'var(--accent-soft)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid var(--border-active)', textTransform: 'uppercase' }}>
                            {item.type}
                        </div>
                        {(() => {
                            // FIX: Hide Requirement for Food and Potions
                            if (item.type === 'FOOD' || item.type === 'POTION') return null;

                            const reqLv = getLevelRequirement(item.tier);
                            const profGroup = getRequiredProficiencyGroup(item.id);

                            if (profGroup) {
                                const groupName = profGroup.charAt(0).toUpperCase() + profGroup.slice(1);
                                return (
                                    <div style={{ padding: '4px 10px', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid rgba(255, 68, 68, 0.2)', color: '#ff4444' }}>
                                        REQ: {groupName} Prof. Lv {reqLv}
                                    </div>
                                );
                            }

                            const skillKey = getSkillForItem(item.id, 'GATHERING') || getSkillForItem(item.id, 'CRAFTING');
                            if (skillKey) {
                                const skillName = skillKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                                return (
                                    <div style={{ padding: '4px 10px', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid rgba(255, 68, 68, 0.2)', color: '#ff4444' }}>
                                        REQ: {skillName} Lv {reqLv}
                                    </div>
                                );
                            }
                            return null;
                        })()}
                        {(item.type === 'FOOD' || (item.ip > 0 && !item.type.startsWith('TOOL'))) && (
                            <div style={{ padding: '4px 10px', background: 'var(--accent-soft)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid var(--border-active)' }}>
                                {item.type === 'FOOD' ? (
                                    <><span style={{ color: '#4caf50', marginRight: '4px' }}>HEAL</span>{item.healPercent ? `${item.healPercent}%` : (item.heal || 0)}</>
                                ) : (
                                    <><span style={{ color: '#888', marginRight: '4px' }}>IP</span>{item.ip}</>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Refined Attributes List */}
                    {statKeys.length > 0 && (
                        <div style={{
                            background: 'var(--slot-bg)',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}>
                            <div style={{ color: '#666', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px' }}>Attributes</div>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '12px 24px',
                                width: '100%',
                                padding: '4px 0'
                            }}>
                                {baseStats.damage && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4444', fontSize: '0.85rem', fontWeight: 'bold' }}><Sword size={14} /> {item.stats.damage} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>DMG</span></div>}
                                {baseStats.hp && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4d4d', fontSize: '0.85rem', fontWeight: 'bold' }}><Heart size={14} /> {item.stats.hp} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>HP</span></div>}
                                {baseStats.defense && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4caf50', fontSize: '0.85rem', fontWeight: 'bold' }}><Shield size={14} /> {item.stats.defense} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>DEF</span></div>}
                                {baseStats.critChance && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}><Star size={14} /> {item.stats.critChance.toFixed(2)}% <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>CRIT</span></div>}
                                {baseStats.attackSpeed && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 'bold' }}><Zap size={14} /> {(1000 / item.stats.attackSpeed).toFixed(1)} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>/s</span></div>}
                                {baseStats.speed && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 'bold' }}><Zap size={14} /> {item.stats.speed} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>SPD</span></div>}
                                {(baseStats.warriorProf || baseStats.str) && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff8888', fontSize: '0.85rem', fontWeight: 'bold' }}>War. Prof. <span style={{ marginLeft: '4px' }}>+{(item.stats.warriorProf || item.stats.str)}</span></div>}
                                {(baseStats.hunterProf || baseStats.agi) && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#88ff88', fontSize: '0.85rem', fontWeight: 'bold' }}>Hun. Prof. <span style={{ marginLeft: '4px' }}>+{(item.stats.hunterProf || item.stats.agi)}</span></div>}
                                {(baseStats.mageProf || baseStats.int) && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8888ff', fontSize: '0.85rem', fontWeight: 'bold' }}>Mag. Prof. <span style={{ marginLeft: '4px' }}>+{(item.stats.mageProf || item.stats.int)}</span></div>}
                                {item.heal && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4caf50', fontSize: '0.85rem', fontWeight: 'bold' }}><Heart size={14} /> <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>HEAL</span> {item.heal}</div>}
                                {item.type === 'POTION' && item.desc && <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', color: 'var(--accent)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center' }}>{item.desc}</div>}
                                {baseStats.efficiency && typeof baseStats.efficiency === 'number' && <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'center' }}>Efficiency +{item.stats.efficiency}%</div>}
                                {baseStats.efficiency && typeof baseStats.efficiency === 'object' && baseStats.efficiency.GLOBAL && <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'center' }}>Global Efficiency +{item.stats.efficiency.GLOBAL}%</div>}
                            </div>
                        </div>
                    )}

                    {/* Crafting Metadata (New) */}
                    {item.craftedBy && (
                        <div style={{
                            padding: '10px 15px',
                            background: 'rgba(255, 215, 0, 0.03)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 215, 0, 0.1)',
                            fontSize: '0.75rem',
                            color: '#aaa',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.65rem' }}>Crafted By</span>
                                <span style={{ color: 'var(--accent)', fontWeight: '900' }}>{item.craftedBy}</span>
                            </div>
                            {item.craftedAt && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#666' }}>Date</span>
                                    <span style={{ color: '#888' }}>{new Date(item.craftedAt).toLocaleDateString('pt-BR')}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chest Drop Table */}
                    {item.id.includes('CHEST') && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            background: 'var(--slot-bg)',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Possible Rewards</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {/* Rune Shards - Guaranteed */}
                                {(() => {
                                    const isWorldBoss = item.id.includes('WORLDBOSS');
                                    const shardName = isWorldBoss ? 'Battle Rune Shard' : `Rune Shard (T${item.tier})`;

                                    if (isWorldBoss) {
                                        const qty = WORLDBOSS_DROP_TABLE[item.id] || 0;
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                    <span style={{ color: '#9013fe', fontWeight: 'bold' }}>{shardName}</span>
                                                    <span style={{ color: '#9013fe', fontWeight: 'bold' }}>100%</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#888', textAlign: 'right' }}>
                                                    Quantity: {qty}
                                                </div>
                                            </div>
                                        );
                                    }

                                    const [min, max] = getChestRuneShardRange(item.tier, item.rarity);
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                <span style={{ color: '#ddd' }}>{shardName}</span>
                                                <span style={{ color: '#4a90e2', fontWeight: 'bold' }}>100%</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#888', textAlign: 'right' }}>
                                                {min} (80%) / {max} (20%)
                                            </div>
                                        </div>
                                    );
                                })()}

                                {!item.id.includes('WORLDBOSS') && CHEST_DROP_TABLE.RARITIES[item.rarity]?.crestChance > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '2px' }}>
                                        <span style={{ color: 'var(--accent)' }}>Boss Crest (T{item.tier})</span>
                                        <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{(CHEST_DROP_TABLE.RARITIES[item.rarity].crestChance * 100).toFixed(0)}%</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ marginTop: '5px', fontSize: '0.75rem', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
                                {item.id.includes('WORLDBOSS') ? '* Yields guaranteed Battle Rune Shards.' : '* Yields guaranteed Rune Shards and a chance for Boss Crests.'}
                            </div>
                        </div>
                    )}

                    {/* Rarity Comparison Section */}
                    {statKeys.length > 0 && !['FOOD', 'POTION'].includes(item.type) && !item.id.includes('FOOD') && !item.id.includes('POTION') && (
                        <div>
                            <h4 style={{
                                fontSize: '0.85rem',
                                color: '#888',
                                marginBottom: '10px',
                                marginTop: '5px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                Rarity Comparison <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>(Est. Stats)</span>
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {rarityComparison.map(q => (
                                    <div key={q.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        background: q.id === (item.quality || 0) ? 'var(--accent-soft)' : 'var(--slot-bg)',
                                        border: q.id === (item.quality || 0) ? `1px solid ${q.color}` : '1px solid var(--border)',
                                        transition: '0.2s',
                                        boxShadow: q.id === (item.quality || 0) ? `0 0 15px ${q.color}20` : 'none'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: q.color }}></div>
                                            <div style={{ fontWeight: 'bold', color: q.color, fontSize: '0.85rem' }}>{q.name}</div>
                                            {q.id === (item.quality || 0) && (
                                                <span style={{
                                                    fontSize: '0.55rem',
                                                    background: q.color,
                                                    color: '#000',
                                                    padding: '2px 5px',
                                                    borderRadius: '3px',
                                                    fontWeight: '900',
                                                    marginLeft: '5px'
                                                }}>
                                                    CURRENT
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: q.id === (item.quality || 0) ? 'var(--text-main)' : 'var(--text-dim)', display: 'flex', gap: '8px', textAlign: 'right' }}>
                                            {Object.entries(q.calculatedStats).map(([key, val]) => {
                                                let label = key.toUpperCase();
                                                if (key === 'damage') label = 'Dmg';
                                                if (key === 'defense') label = 'Def';
                                                if (key === 'critChance') label = 'Crit';
                                                if (key === 'globalEff') label = 'Global Eff';
                                                if (key === 'efficiency') label = 'Eff';
                                                return (
                                                    <span key={key}>
                                                        {label}: {['globalEff', 'efficiency', 'critChance'].includes(key) ? '+' : ''}{val}{['globalEff', 'efficiency', 'critChance'].includes(key) ? '%' : ''}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', color: '#555', fontSize: '0.75rem', marginTop: '5px' }}>
                        Click outside to close.
                    </div>
                </div> {/* End Scrollable Wrapper */}
            </div>
        </div>
    );
};

export default ItemInfoModal;
