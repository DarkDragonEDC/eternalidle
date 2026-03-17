import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, Target, Star, ChevronRight, Package, Box, Timer, Activity, Info } from 'lucide-react';
import { resolveItem, formatItemId, getSkillForItem, getLevelRequirement } from '@shared/items';
import { formatNumber } from '@utils/format';
import { useAppStore } from '../store/useAppStore';

const ActionQueueModal = ({ isOpen, onClose, item, type, gameState }) => {
    const [quantity, setQuantity] = useState(1);
    
    if (!item || !isOpen) return null;

    const resolvedItem = resolveItem(item.id) || item;
    const stats = gameState?.calculatedStats || {};
    const skillKey = getSkillForItem(item.id, type);
    const tier = Number(item.tier) || 1;
    
    // Efficiency & Time Calculation
    const getEfficiencyKey = (id, type) => {
        if (!id) return 'GLOBAL';
        const keywords = {
            GATHERING: { WOOD: 'WOOD', ORE: 'ORE', HIDE: 'HIDE', FIBER: 'FIBER', FISH: 'FISH', HERB: 'HERB' },
            REFINING: { PLANK: 'PLANK', BAR: 'METAL', LEATHER: 'LEATHER', CLOTH: 'CLOTH', EXTRACT: 'EXTRACT' },
            CRAFTING: {
                PICKAXE: 'TOOLS', AXE: 'TOOLS', KNIFE: 'TOOLS', SICKLE: 'TOOLS', ROD: 'TOOLS', POUCH: 'TOOLS',
                SWORD: 'WARRIOR', PLATE: 'WARRIOR', SHEATH: 'WARRIOR', BOW: 'HUNTER', LEATHER: 'HUNTER',
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

    // Idle Limits
    const isPremium = gameState?.state?.isPremium || gameState?.state?.membership?.active;
    const maxIdleSeconds = (isPremium ? 12 : 8) * 3600;
    
    // Calculate current busy time (Current activity + Queue)
    let currentBusySeconds = 0;
    if (gameState?.current_activity) {
        currentBusySeconds += gameState.current_activity.actions_remaining * (gameState.current_activity.time_per_action || 3);
    }
    if (gameState?.state?.actionQueue) {
        gameState.state.actionQueue.forEach(q => {
            // Priority 1: Use time_per_action sent by server
            // Priority 2: Recalculate based on current efficiency
            const qItem = resolveItem(q.item_id);
            let timeToUse = q.time_per_action;
            
            if (!timeToUse && qItem) {
                const qEffKey = getEfficiencyKey(q.item_id, q.type);
                const qEffValue = parseFloat(gameState?.calculatedStats?.efficiency?.[qEffKey] || 0);
                const qBaseTime = qItem.time || (q.type === 'GATHERING' ? 3.0 : q.type === 'REFINING' ? 1.5 : 4.0);
                timeToUse = Math.max(0.5, qBaseTime * Math.max(0.1, 1 - (qEffValue / 100)));
            }
            
            currentBusySeconds += q.quantity * (timeToUse || 3); 
        });
    }

    const remainingIdleSeconds = Math.max(0, maxIdleSeconds - currentBusySeconds);
    const maxQueueQuantity = Math.floor(remainingIdleSeconds / finalTime);

    // Materials Check
    const reqs = resolvedItem.req || {};
    let maxByMaterials = Infinity;
    Object.entries(reqs).forEach(([reqId, reqQty]) => {
        const inv = gameState?.state?.inventory?.[reqId];
        const userQty = (inv && typeof inv === 'object') ? (inv.amount || 0) : (Number(inv) || 0);
        const possible = Math.floor(userQty / reqQty);
        if (possible < maxByMaterials) maxByMaterials = possible;
    });

    const finalMax = Math.max(0, Math.min(maxQueueQuantity, Object.keys(reqs).length > 0 ? maxByMaterials : maxQueueQuantity));
    const currentQtyAllowed = Math.max(1, Math.min(quantity, finalMax));

    const formatDuration = (s) => {
        if (s < 60) return `${s.toFixed(1)}s`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m ${(s % 60).toFixed(0)}s`;
        const h = Math.floor(m / 60);
        return `${h}h ${m % 60}m`;
    };

    const handleConfirm = () => {
        const { enqueueActivity } = useAppStore.getState();
        enqueueActivity(type, item.id, currentQtyAllowed);
        onClose();
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }} />

            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                style={{
                    width: '100%', maxWidth: '360px', background: 'var(--panel-bg)',
                    borderRadius: '20px', border: '1px solid var(--accent)', boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                    position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                }}>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '40px', height: '40px', background: 'var(--accent-soft)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Clock size={20} color="var(--accent)" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>ENQUEUE ACTION</h2>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>PLAN YOUR NEXT MOVE</span>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                    </div>

                    {/* Busy Time breakdown */}
                    <div style={{ background: 'var(--slot-bg)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.7rem' }}>
                            <span style={{ color: 'var(--text-dim)', fontWeight: 'bold' }}>LIMIT ({isPremium ? '12h' : '8h'})</span>
                            <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{formatDuration(maxIdleSeconds)}</span>
                        </div>
                        
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                            {/* Currently busy bar */}
                            <div style={{ 
                                position: 'absolute', left: 0, top: 0, height: '100%', 
                                width: `${(currentBusySeconds / maxIdleSeconds) * 100}%`,
                                background: 'var(--text-dim)', opacity: 0.5
                            }} />
                            {/* New action projection bar */}
                            <div style={{ 
                                position: 'absolute', 
                                left: `${(currentBusySeconds / maxIdleSeconds) * 100}%`, 
                                top: 0, height: '100%', 
                                width: `${((currentQtyAllowed * finalTime) / maxIdleSeconds) * 100}%`,
                                background: 'var(--accent)',
                                boxShadow: '0 0 10px var(--accent-soft)'
                            }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Busy: {formatDuration(currentBusySeconds)}</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Available: {formatDuration(remainingIdleSeconds)}</span>
                        </div>
                    </div>

                    {/* Item Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--accent-soft)', padding: '10px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <img src={resolvedItem.icon} style={{ width: '40px', height: '40px', objectFit: 'contain' }} alt="" />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{resolvedItem.name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>T{tier} {type} • {finalTime.toFixed(1)}s / action</div>
                        </div>
                    </div>

                    {/* Quantity Adjustment */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>QUANTITY TO ENQUEUE</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Max: {finalMax}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="number" 
                                value={quantity} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '') {
                                        setQuantity('');
                                    } else {
                                        const num = parseInt(val);
                                        if (!isNaN(num)) {
                                            setQuantity(Math.min(finalMax, num));
                                        }
                                    }
                                }}
                                onBlur={() => {
                                    if (quantity === '' || quantity < 1) setQuantity(1);
                                }}
                                style={{ flex: 1, background: 'var(--slot-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'white', fontWeight: 'bold', textAlign: 'center' }}
                            />
                            <button 
                                onClick={() => setQuantity(finalMax)}
                                style={{ padding: '0 15px', background: 'var(--accent-soft)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--accent)', fontWeight: '900', fontSize: '0.7rem' }}
                            >
                                MAX
                            </button>
                        </div>
                    </div>

                    {/* Summary Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Total Duration</span>
                            <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{formatDuration(currentQtyAllowed * finalTime)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Projected XP</span>
                            <span style={{ color: '#4ade80', fontWeight: 'bold' }}>+{formatNumber(xpPerAction * currentQtyAllowed)}</span>
                        </div>
                    </div>

                    {/* Confirm Button */}
                    {(() => {
                        const queueLength = gameState?.state?.actionQueue?.length || 0;
                        const extraSlots = gameState?.state?.upgrades?.extraQueueSlots || 0;
                        const maxQueueSlots = 2 + extraSlots;
                        const isQueueFull = queueLength >= maxQueueSlots;
                        return (
                            <button 
                                onClick={handleConfirm}
                                disabled={finalMax <= 0 || isQueueFull || !isPremium}
                                style={{ 
                                    width: '100%', padding: '14px', borderRadius: '12px', 
                                    background: (finalMax > 0 && !isQueueFull && isPremium) ? 'var(--accent)' : 'var(--text-dim)', 
                                    color: '#000', fontWeight: '900', fontSize: '0.9rem', 
                                    cursor: (finalMax > 0 && !isQueueFull && isPremium) ? 'pointer' : 'not-allowed',
                                    transition: '0.2s',
                                    boxShadow: (finalMax > 0 && !isQueueFull && isPremium) ? '0 5px 15px var(--accent-soft)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                {!isPremium && <Lock size={16} />}
                                {isQueueFull ? `QUEUE FULL (MAX ${maxQueueSlots})` : !isPremium ? 'MEMBER ONLY' : finalMax > 0 ? `ADD TO QUEUE (${formatDuration(currentQtyAllowed * finalTime)})` : 'NOT ENOUGH IDLE TIME'}
                            </button>
                        );
                    })()}
                    
                    <button 
                        onClick={onClose}
                        style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        CANCEL
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ActionQueueModal;
