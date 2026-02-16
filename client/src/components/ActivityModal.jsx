import React, { useState, useEffect } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import { X, Clock, Zap, Target, Star, ChevronRight, Package, Box, Sword, Shield, Heart, Lock, TrendingUp, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveItem, formatItemId, QUALITIES, getSkillForItem, getLevelRequirement } from '@shared/items';

const ActivityModal = ({ isOpen, onClose, item, type, gameState, onStart, onNavigate, onSearchInMarket, isMobile }) => {
    const [quantity, setQuantity] = useState(1);
    const [showProbabilities, setShowProbabilities] = useState(false);

    // Initial item loading
    useEffect(() => {
        if (item?.id) {
            setQuantity(maxQuantity || 1);
        }
    }, [item?.id]);

    if (!item || !isOpen) return null;

    // --- REFACTORED SHARED LOGIC ---
    const resolvedItem = resolveItem(item.id) || item;
    const stats = gameState?.calculatedStats || {};
    const skillKey = getSkillForItem(item.id, type);
    const tier = Number(item.tier) || 1;
    const requiredLevel = getLevelRequirement(tier);
    const userLevel = gameState?.state?.skills?.[skillKey]?.level || 1;
    const locked = userLevel < requiredLevel;

    // Tier Color Mapping
    const TIER_COLORS = {
        1: '#a0a0a0', 2: '#4ade80', 3: '#60a5fa', 4: '#a855f7',
        5: '#fbbf24', 6: '#f87171', 7: '#f0f0f0', 8: '#d4af37',
    };
    const tierColor = TIER_COLORS[tier] || '#90d5ff';

    // Efficiency & Time Calculation
    const getEfficiencyKey = (id, type) => {
        if (!id) return 'GLOBAL';
        const keywords = {
            GATHERING: { WOOD: 'WOOD', ORE: 'ORE', HIDE: 'HIDE', FIBER: 'FIBER', FISH: 'FISH', HERB: 'HERB' },
            REFINING: { PLANK: 'PLANK', BAR: 'METAL', LEATHER: 'LEATHER', CLOTH: 'CLOTH', EXTRACT: 'EXTRACT' },
            CRAFTING: {
                PICKAXE: 'TOOLS', AXE: 'TOOLS', KNIFE: 'TOOLS', SICKLE: 'TOOLS', ROD: 'TOOLS', POUCH: 'TOOLS',
                SWORD: 'WARRIOR', PLATE: 'WARRIOR', SHIELD: 'WARRIOR', BOW: 'HUNTER', LEATHER: 'HUNTER',
                TORCH: 'HUNTER', STAFF: 'MAGE', CLOTH: 'MAGE', TOME: 'MAGE', CAPE: 'WARRIOR', FOOD: 'COOKING', POTION: 'ALCHEMY'
            }
        };
        const searchPool = keywords[type] || {};
        for (const [k, v] of Object.entries(searchPool)) { if (id.includes(k)) return v; }
        return 'GLOBAL';
    };

    const effKey = getEfficiencyKey(item.id, type);
    const efficiency = parseFloat(gameState?.calculatedStats?.efficiency?.[effKey] || 0);
    const baseTime = item.time || (type === 'GATHERING' ? 3.0 : type === 'REFINING' ? 1.5 : 4.0);
    const finalTime = Math.max(0.5, baseTime * Math.max(0.1, 1 - (efficiency / 100)));

    // XP Calculation
    const baseXp = item.xp || (type === 'GATHERING' ? 5 : type === 'REFINING' ? 10 : 50);
    const yieldBonus = (stats.globals?.xpYield || 0);
    const specificBonus = (stats.xpBonus?.[type] || 0);
    const runeBonus = (stats.xpBonus?.[effKey] || 0);
    const totalBonusPc = yieldBonus + specificBonus + runeBonus;
    const xpPerAction = parseFloat((baseXp * (1 + totalBonusPc / 100)).toFixed(1));

    // Limit & Max Logic
    const isPremium = gameState?.state?.isPremium || gameState?.state?.membership?.active;
    const idleLimitHours = isPremium ? 12 : 8;
    const timeLimitMax = Math.floor((idleLimitHours * 3600) / finalTime);

    // Materials Check
    const reqs = resolvedItem.req || {};
    let maxByMaterials = Infinity;
    const materialStatus = Object.entries(reqs).map(([reqId, reqQty]) => {
        const inv = gameState?.state?.inventory?.[reqId];
        const userQty = (inv && typeof inv === 'object') ? (inv.amount || 0) : (Number(inv) || 0);
        const possible = Math.floor(userQty / reqQty);
        if (possible < maxByMaterials) maxByMaterials = possible;
        return { reqId, reqQty, userQty, displayName: resolveItem(reqId) ? `T${resolveItem(reqId).tier} ${resolveItem(reqId).name}` : formatItemId(reqId) };
    });

    const maxQuantity = Math.min(timeLimitMax, Object.keys(reqs).length > 0 ? maxByMaterials : timeLimitMax);
    const currentQty = Math.max(1, Math.min(Number(quantity) || 1, maxQuantity));
    const totalDuration = finalTime * currentQty;
    const totalXP = formatNumber(xpPerAction * currentQty);
    const totalCost = formatNumber((resolvedItem.cost || 0) * currentQty);
    const hasEnoughMaterials = materialStatus.every(m => m.userQty >= m.reqQty * currentQty);

    const formatDuration = (s) => {
        if (s < 60) return `${s.toFixed(1)}s`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m ${(s % 60).toFixed(0)}s`;
        return `${Math.floor(m / 60)}h ${m % 60}m`;
    };

    // --- RENDER HELPERS ---
    const StatRow = ({ icon: Icon, label, value, subValue, color = 'var(--text-dim)', valColor = 'var(--text-main)' }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color }}>
                <Icon size={13} strokeWidth={2.5} />
                <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: valColor }}>{value}</span>
                {subValue && <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>{subValue}</span>}
            </div>
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                style={{ position: 'absolute', inset: 0, background: 'rgba(5, 7, 10, 0.9)', backdropFilter: 'blur(8px)' }} />

            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                style={{
                    width: '100%', maxWidth: '380px', background: 'linear-gradient(145deg, rgba(25, 30, 40, 0.95), rgba(10, 15, 20, 0.95))',
                    borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(144,213,255,0.05)',
                    position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                }}>

                {/* Glass Glow Header */}
                <div style={{
                    position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '200px',
                    background: `radial-gradient(circle, ${tierColor}20 0%, transparent 70%)`, pointerEvents: 'none'
                }} />

                <div style={{ padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--text-dim)' }}><X size={20} /></button>

                    <div style={{
                        width: '56px', height: '56px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', boxShadow: `0 0 15px ${tierColor}15`
                    }}>
                        <img src={item.icon} style={{ width: item.scale || '65%', height: item.scale || '65%', objectFit: 'contain', filter: `drop-shadow(0 0 8px ${tierColor}40)` }} alt="" />
                    </div>

                    <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: tierColor, letterSpacing: '-0.5px', marginBottom: '2px' }}>{item.name}</h2>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: '800', border: `1px solid ${tierColor}40`, padding: '1px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>
                        T{tier} {type}
                    </div>
                </div>

                <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Quantity Section */}
                    <div className="glass-panel" style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-dim)' }}>PLAN QUANTITY</span>
                            <span style={{ fontSize: '0.6rem', fontWeight: '800', color: tierColor }}>REMAINTING: {formatNumber(maxQuantity)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="number" value={quantity} onChange={e => setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || '')))}
                                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 8px', color: '#fff', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }} />
                            <button onClick={() => setQuantity(maxQuantity)} style={{ padding: '0 10px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '8px', fontWeight: '900', fontSize: '0.65rem' }}>MAX</button>
                        </div>
                    </div>

                    {/* Materials Section */}
                    {materialStatus.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--text-dim)' }}>REQUIRED RESOURCES</span>
                            <div style={{ display: 'grid', gridTemplateColumns: materialStatus.length > 2 ? '1fr 1fr 1fr' : '1fr 1fr', gap: '6px' }}>
                                {materialStatus.map(m => {
                                    const needed = m.reqQty * currentQty;
                                    const ok = m.userQty >= needed;
                                    return (
                                        <div key={m.reqId} style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '8px', border: `1px solid ${ok ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)'}`, cursor: 'pointer', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
                                                <div onClick={() => onNavigate?.(m.reqId)} style={{ fontSize: '0.55rem', color: tierColor, fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{m.displayName}</div>
                                                <button onClick={(e) => { e.stopPropagation(); onSearchInMarket?.(m.displayName); }} style={{ background: 'rgba(144,213,255,0.05)', border: '1px solid rgba(144,213,255,0.1)', borderRadius: '3px', padding: '1px', display: 'flex', color: 'var(--accent)' }}>
                                                    <Package size={9} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.5rem', color: 'var(--text-dim)' }}>{needed}</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: ok ? '#4ade80' : '#f87171' }}>{m.userQty}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Description Section (Consumables only) */}
                    {(['FOOD', 'POTION'].includes(resolvedItem.type) || resolvedItem.id.includes('FOOD') || resolvedItem.id.includes('POTION')) && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ color: tierColor, fontSize: '0.65rem', fontWeight: '900', marginBottom: '6px', letterSpacing: '0.5px' }}>ITEM DESCRIPTION & EFFECTS</div>
                            <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: '1.4', fontStyle: 'italic', opacity: 0.9 }}>
                                "{resolvedItem.desc || resolvedItem.description || "No description available."}"
                            </div>
                        </div>
                    )}

                    {/* Probability Section (Crafting only) */}
                    {type === 'CRAFTING' && !['FOOD', 'POTION'].includes(resolvedItem.type) && (
                        <div style={{ marginTop: '4px' }}>
                            <button onClick={() => setShowProbabilities(!showProbabilities)}
                                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: '800' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Box size={14} /> <span>CRAFTING ODDS & BASE STATS</span></div>
                                <ChevronRight size={16} style={{ transform: showProbabilities ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                            </button>
                            <AnimatePresence>
                                {showProbabilities && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                        <div style={{ marginTop: '8px', padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {Object.values(QUALITIES).map((q, idx) => {
                                                const qualityBonus = stats.globals?.qualityChance || 0;
                                                const mult = 1 + (qualityBonus / 100);
                                                const BASE_CHANCES = {
                                                    1: { q4: 1.40, q3: 9.80, q2: 14.40, q1: 30.00 }, 10: { q4: 0.05, q3: 0.45, q2: 4.50, q1: 20.00 }
                                                };
                                                const chances = BASE_CHANCES[tier] || BASE_CHANCES[1];
                                                let c = 0;
                                                if (q.id === 4) c = chances.q4 * mult;
                                                else if (q.id === 3) c = chances.q3 * mult;
                                                else if (q.id === 2) c = chances.q2 * mult;
                                                else if (q.id === 1) c = chances.q1 * mult;
                                                else c = Math.max(0, 100 - (chances.q4 + chances.q3 + chances.q2 + chances.q1) * mult);

                                                const qItem = resolveItem(resolvedItem.id, q.id);
                                                const s = qItem?.stats || {};

                                                return (
                                                    <div key={idx} style={{ background: 'rgba(5,7,10,0.3)', padding: '10px', borderRadius: '10px', borderLeft: `4px solid ${q.color}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                                                            <span style={{ fontWeight: '900', color: q.color }}>{q.name}</span>
                                                            <span style={{ fontWeight: '900', color: '#fff' }}>{c.toFixed(2)}%</span>
                                                        </div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', opacity: 0.8 }}>
                                                            {s.damage && <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f87171' }}><Sword size={10} /> <span style={{ fontSize: '0.6rem', fontWeight: '800' }}>{s.damage} DMG</span></div>}
                                                            {s.defense && <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#4ade80' }}><Shield size={10} /> <span style={{ fontSize: '0.6rem', fontWeight: '800' }}>{s.defense} DEF</span></div>}
                                                            {s.hp && <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#ff4d4d' }}><Heart size={10} /> <span style={{ fontSize: '0.6rem', fontWeight: '800' }}>{s.hp} HP</span></div>}
                                                            {s.attackSpeed && <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--accent)' }}><Zap size={10} /> <span style={{ fontSize: '0.6rem', fontWeight: '800' }}>{(s.attackSpeed / 1000).toFixed(2)}s</span></div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Stats Panel */}
                    <div className="glass-panel" style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <StatRow icon={TrendingUp} label="Efficiency" value={`+${efficiency}%`} valColor="#90d5ff" />
                        <StatRow icon={Star} label="XP Multiplier" value={`+${totalBonusPc.toFixed(1)}%`} valColor="#fbbf24" />
                        <StatRow icon={Timer} label="Time per action" value={`${finalTime.toFixed(1)}s`} subValue={finalTime < baseTime ? `${baseTime}s` : null} />
                        <StatRow icon={Zap} label="XP per action" value={xpPerAction} subValue={xpPerAction > baseXp ? baseXp : null} valColor="var(--accent)" />
                        {resolvedItem.cost > 0 && <StatRow icon={Target} label="Total Silver" value={totalCost} valColor="#fbbf24" />}
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#fff' }}>PROJECTED XP</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#4ade80' }}>{totalXP}</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div style={{ marginTop: '2px' }}>
                        {locked ? (
                            <div style={{ background: '#f8717115', border: '1px solid #f8717140', borderRadius: '14px', padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ color: '#f87171', fontWeight: '900', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <Lock size={14} /> {skillKey.replace('_', ' ')} LV {requiredLevel} REQ
                                </div>
                                <div style={{ fontSize: '0.55rem', color: '#f87171', opacity: 0.7, marginTop: '2px' }}>CURRENT LEVEL: {userLevel}</div>
                            </div>
                        ) : (
                            <button onClick={hasEnoughMaterials ? () => onStart(type, item.id, currentQty) : null} disabled={!hasEnoughMaterials}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '14px', background: hasEnoughMaterials ? tierColor : 'rgba(255,255,255,0.05)',
                                    color: hasEnoughMaterials ? '#05070a' : 'rgba(255,255,255,0.2)', fontWeight: '900', fontSize: '0.85rem',
                                    boxShadow: hasEnoughMaterials ? `0 6px 20px ${tierColor}30` : 'none', textTransform: 'uppercase', letterSpacing: '1px'
                                }}>
                                {hasEnoughMaterials ? `BEGIN (${formatDuration(totalDuration)})` : 'INSUFFICIENT RESOURCES'}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ActivityModal;
