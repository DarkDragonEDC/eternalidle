import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Coins, Tag, Trash2, ArrowRight, Zap, Award, Info, Heart, Sword, Star, Sparkles } from 'lucide-react';
import { getTierColor, calculateItemSellPrice, resolveItem } from '@shared/items';

const ItemActionModal = ({ item: rawItem, onClose, onEquip, onSell, onList, onUse, onDismantle, customAction, isIronman }) => {
    if (!rawItem) return null;

    // Robust resolution: ensure we have full details
    const resolved = resolveItem(rawItem.id);
    const item = { ...rawItem, ...resolved, id: rawItem.id };

    const tierColor = item.rarityColor || getTierColor(item.tier);
    const cleanBaseName = (item.name || '').replace(new RegExp(` T${item.tier}$`), '');

    const hasMeaningfulStats = item.stats && (
        (item.stats.damage || 0) > 0 ||
        (item.stats.defense || 0) > 0 ||
        (item.stats.hp || 0) > 0 ||
        (item.stats.attackSpeed || 0) > 0 ||
        (item.stats.str || 0) > 0 ||
        (item.stats.agi || 0) > 0 ||
        (item.stats.int || 0) > 0 ||
        ((typeof item.stats.efficiency === 'number' && item.stats.efficiency > 0) || (typeof item.stats.efficiency === 'object' && item.stats.efficiency !== null))
    );

    const StatRow = ({ icon: Icon, label, value, color = 'var(--text-dim)', valColor = 'var(--text-main)' }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color }}>
                <Icon size={13} strokeWidth={2.5} />
                <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: valColor }}>{value}</span>
        </div>
    );

    const ActionButton = ({ onClick, icon: Icon, label, variant = 'primary', subLabel, id }) => {
        const variants = {
            primary: {
                bg: 'var(--accent)',
                color: 'var(--panel-bg)',
                border: 'none',
                shadow: '0 4px 15px rgba(144,213,255,0.2)'
            },
            outline: {
                bg: 'rgba(144,213,255,0.05)',
                color: 'var(--accent)',
                border: '1px solid rgba(144,213,255,0.3)',
                shadow: 'none'
            },
            soft: {
                bg: 'rgba(255,255,255,0.03)',
                color: 'var(--text-main)',
                border: '1px solid rgba(255,255,255,0.08)',
                shadow: 'none'
            },
            dismantle: {
                bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                color: '#fff',
                border: 'none',
                shadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
            }
        };

        const v = variants[variant] || variants.primary;

        return (
            <motion.button
                id={id}
                whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={onClick}
                style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: v.bg,
                    color: v.color,
                    border: v.border,
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                    boxShadow: v.shadow,
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={18} strokeWidth={2.5} />
                    <span>{label}</span>
                </div>
                {subLabel && <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: '800' }}>{subLabel}</span>}
            </motion.button>
        );
    };

    return (
        <AnimatePresence>
            <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    style={{ position: 'absolute', inset: 0, background: 'rgba(5, 7, 10, 0.85)', backdropFilter: 'blur(8px)' }} />

                <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: '380px', background: 'linear-gradient(145deg, rgba(25, 30, 40, 0.95), rgba(10, 15, 20, 0.95))',
                        borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(144,213,255,0.05)',
                        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                    }}>

                    {/* Glass Glow Header */}
                    <div style={{
                        position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '200px',
                        background: `radial-gradient(circle, ${tierColor}20 0%, transparent 70%)`, pointerEvents: 'none'
                    }} />

                    <div style={{ padding: '24px 24px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--text-dim)', border: 'none', background: 'none', cursor: 'pointer' }}><X size={22} /></button>

                        <div style={{
                            width: '70px', height: '70px', background: 'rgba(255,255,255,0.03)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: `0 0 20px ${tierColor}15`
                        }}>
                            <img src={item.icon} style={{ width: item.scale || '130%', height: item.scale || '130%', objectFit: 'contain', filter: `drop-shadow(0 0 8px ${tierColor}40)` }} alt="" />
                        </div>

                        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: tierColor, letterSpacing: '-0.5px', marginBottom: '4px', textAlign: 'center' }}>{cleanBaseName}</h2>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '800', border: `1px solid ${tierColor}40`, padding: '2px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            T{item.tier} Item
                        </div>
                    </div>

                    <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Stats Display */}
                        {hasMeaningfulStats && (
                            <div className="glass-panel" style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '1px' }}>ITEM ATTRIBUTES</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {item.stats.damage > 0 && <StatRow icon={Sword} label="Damage" value={item.stats.damage} valColor="#f87171" />}
                                    {item.stats.defense > 0 && <StatRow icon={Shield} label="Defense" value={item.stats.defense} valColor="#4ade80" />}
                                    {item.stats.hp > 0 && <StatRow icon={Heart} label="Health" value={`+${item.stats.hp}`} valColor="#fb7185" />}
                                    {item.stats.attackSpeed > 0 && <StatRow icon={Zap} label="Attack Speed" value={`${(1000 / item.stats.attackSpeed).toFixed(1)} /s`} valColor="#ffd700" />}

                                    {(item.stats.str > 0 || item.stats.agi > 0 || item.stats.int > 0) && (
                                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-around', gap: '8px' }}>
                                            {item.stats.str > 0 && <div style={{ color: '#ff8888', fontWeight: '900', fontSize: '0.75rem' }}>+{item.stats.str} STR</div>}
                                            {item.stats.agi > 0 && <div style={{ color: '#88ff88', fontWeight: '900', fontSize: '0.75rem' }}>+{item.stats.agi} AGI</div>}
                                            {item.stats.int > 0 && <div style={{ color: '#8888ff', fontWeight: '900', fontSize: '0.75rem' }}>+{item.stats.int} INT</div>}
                                        </div>
                                    )}

                                    {item.stats.efficiency && (
                                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                            <span style={{ color: '#d4af37', fontWeight: '900', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                                Efficiency: {typeof item.stats.efficiency === 'object' ? 'Global Bonus' : `+${item.stats.efficiency}%`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Actions Grid */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {customAction && (
                                <ActionButton id={customAction.id} onClick={() => { customAction.onClick(item); onClose(); }} icon={customAction.id === 'tutorial-rune-use-merge' ? Sparkles : (customAction.icon ? () => customAction.icon : Zap)} label={customAction.label} />
                            )}
                            {(['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'FOOD'].includes(item.type) || item.type.startsWith('TOOL')) && (
                                <ActionButton onClick={() => { onEquip(item.id); onClose(); }} icon={Shield} label="Equip Item" />
                            )}

                            {((['POTION', 'CONSUMABLE', 'CHEST'].includes(item.type)) || (item.id && item.id.includes('CHEST'))) && (
                                <ActionButton id="open-chest-button" onClick={() => { onUse(item.id); onClose(); }} icon={Zap} label={item.type === 'POTION' ? 'Drink Potion' : (item.id.includes('CHEST') ? 'Open Chest' : 'Use Item')} />
                            )}

                            {(['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND'].includes(item.type) || item.type.startsWith('TOOL_')) && (
                                <ActionButton onClick={() => { onDismantle(item.id); onClose(); }} icon={Trash2} label="Dismantle" variant="dismantle" />
                            )}

                            {!isIronman && item.id !== 'NOOB_CHEST' && (
                                <ActionButton onClick={() => { onList(item.id, item); onClose(); }} icon={Tag} label="List on Market" variant="outline" />
                            )}

                            {item.id !== 'NOOB_CHEST' && (
                                <ActionButton onClick={() => { onSell(item.id); onClose(); }} icon={Coins} label="Sell Quickly" variant="soft" subLabel={calculateItemSellPrice(item, item.id)} />
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ItemActionModal;
