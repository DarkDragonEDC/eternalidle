import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Shield, Zap, Sparkles, Coins, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { resolveItem, getTierColor, formatItemId } from '@shared/items';
import { formatSilver } from '@utils/format';

const EnhanceItemModal = ({ item: initialItem, inventory, character, socket, onClose }) => {
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [result, setResult] = useState(null);

    // Resolve current item and next level item from inventory to stay "live"
    const liveItem = useMemo(() => {
        const storageKey = initialItem.storageKey || Object.keys(inventory).find(k => k.split('::')[0] === initialItem.id);
        const invItem = inventory[storageKey];
        if (!invItem) return initialItem;
        return { ...invItem, id: initialItem.id, storageKey };
    }, [inventory, initialItem]);

    const currentItem = useMemo(() => resolveItem(liveItem), [liveItem]);
    const nextItem = useMemo(() => {
        if (!currentItem) return null;
        return resolveItem({ ...liveItem, enhancement: (currentItem.enhancement || 0) + 1 });
    }, [liveItem, currentItem]);


    const tier = currentItem?.tier || 1;
    const currentEnhancement = currentItem?.enhancement || 0;
    
    // Limits
    let maxEnhancement = 15;
    if (tier <= 3) maxEnhancement = 5;
    else if (tier <= 6) maxEnhancement = 10;
    else if (tier === 10) maxEnhancement = 20;

    const isMaxed = currentEnhancement >= maxEnhancement;

    // Stone Logic
    const itemClass = initialItem.id.includes('SWORD') || initialItem.id.includes('PLATE') || initialItem.id.includes('SHEATH') || initialItem.id.includes('WARRIOR_CAPE') ? 'WARRIOR' :
                     initialItem.id.includes('BOW') || initialItem.id.includes('LEATHER') || initialItem.id.includes('TORCH') || initialItem.id.includes('HUNTER_CAPE') ? 'HUNTER' : 'MAGE';
    
    const slotMap = {
        'WEAPON': 'WEAPON', 'OFF_HAND': 'OFFHAND', 'ARMOR': 'ARMOR',
        'HELMET': 'HELMET', 'BOOTS': 'BOOTS', 'GLOVES': 'GLOVES', 'CAPE': 'CAPE'
    };
    const itemSlot = slotMap[currentItem?.type];
    const stoneId = `ENHANCEMENT_STONE_${itemClass}_${itemSlot}`;
    const stoneDef = resolveItem(stoneId);

    // Stone Requirements based on Tier
    let requiredStones = 1;
    if (tier >= 7 && tier <= 9) requiredStones = 2;
    else if (tier >= 10) requiredStones = 3;

    // Find stone in inventory
    const stoneEntryKey = Object.keys(inventory).find(key => key.split('::')[0] === stoneId);
    const stoneQty = stoneEntryKey ? (typeof inventory[stoneEntryKey] === 'object' ? inventory[stoneEntryKey].amount : inventory[stoneEntryKey]) : 0;
    const hasStone = stoneQty >= requiredStones;

    // Cost Logic
    const silverCost = tier * 3000 * (currentEnhancement + 1);
    const hasSilver = (character?.state?.silver || 0) >= silverCost;

    const canEnhance = !isMaxed && hasStone && hasSilver && !isEnhancing;

    const handleEnhance = () => {
        if (!canEnhance) return;
        setIsEnhancing(true);

        socket.emit('enhance_item', { 
            itemStorageKey: liveItem.storageKey || liveItem.id, 
            stoneStorageKey: stoneEntryKey 
        });


        const handleResult = (res) => {
            if (res.success) {
                setResult({ success: true, message: res.message });
                // We don't close immediately to show the "Success" state
            } else {
                setResult({ success: false, message: res.error || 'Enhancement failed' });
                setIsEnhancing(false);
            }
            socket.off('item_enhanced', handleResult);
        };

        socket.on('item_enhanced', handleResult);
        
        // Timeout safety
        setTimeout(() => {
            if (isEnhancing) {
                setIsEnhancing(false);
                socket.off('item_enhanced', handleResult);
            }
        }, 5000);
    };

    const tierColor = getTierColor(tier);
    const rarityColor = currentItem?.rarityColor || '#fff';

    return createPortal(
        <AnimatePresence>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    style={{ position: 'absolute', inset: 0, background: 'rgba(5, 7, 10, 0.9)', backdropFilter: 'blur(10px)' }} />

                <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: '420px', background: 'var(--panel-bg)',
                        borderRadius: '28px', border: '1px solid var(--border)', boxShadow: 'var(--panel-shadow)',
                        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        backdropFilter: 'blur(20px)'
                    }}>
                    
                    {/* Header with animated glow */}
                    <div style={{
                        height: '110px', background: `linear-gradient(to bottom, ${tierColor}15, transparent)`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative'
                    }}>

                        <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '50%', padding: '8px', color: 'var(--text-dim)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '80px', height: '80px', background: 'var(--slot-bg)', borderRadius: '22px', border: `2px solid ${rarityColor}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${rarityColor}30`
                            }}>
                                <img src={currentItem?.icon} style={{ width: '80%', height: '80%', objectFit: 'contain' }} alt="" />
                            </div>
                            <div style={{
                                position: 'absolute', bottom: '-8px', right: '-8px', background: 'var(--accent)', color: 'var(--panel-bg)',
                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '900', border: '2px solid var(--panel-bg)'
                            }}>
                                +{currentEnhancement}
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>
                                {currentItem?.name}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: tierColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Tier {tier}
                                </span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>•</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                                    {isMaxed ? 'MAX LEVEL' : `Goal: +${currentEnhancement + 1}`}
                                </span>
                            </div>
                        </div>

                        {!result ? (
                            <>
                                {/* Stats Comparison */}
                                {!isMaxed && (
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '20px', padding: '16px' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-dim)', marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                            Attribute Scaling (+2% per level)
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {Object.entries(currentItem?.stats || {}).map(([key, val]) => {
                                                if (typeof val !== 'number') return null;
                                                const nextVal = nextItem?.stats[key];
                                                if (nextVal === undefined) return null;

                                                return (
                                                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '700' }}>{val}</span>
                                                            <ArrowRight size={14} style={{ color: 'var(--text-dim)', opacity: 0.5 }} />
                                                            <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: '900' }}>{nextVal}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Requirements */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${hasStone ? 'var(--border)' : '#ef444450'}`, borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--slot-bg)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <img src={stoneDef?.icon || '/items/ORB.webp'} style={{ width: '80%', height: '80%' }} alt="" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: '800' }}>STONE</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '900', color: hasStone ? 'var(--text-main)' : '#ef4444' }}>
                                                {stoneQty} / {requiredStones}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${hasSilver ? 'var(--border)' : '#ef444450'}`, borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--slot-bg)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffd700' }}>
                                            <Coins size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: '800' }}>COST</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '900', color: hasSilver ? '#ffd700' : '#ef4444' }}>
                                                {formatSilver(silverCost)}
                                            </div>
                                        </div>
                                    </div>
                                </div>



                                <motion.button
                                    whileHover={canEnhance ? { scale: 1.02 } : {}}
                                    whileTap={canEnhance ? { scale: 0.98 } : {}}
                                    disabled={!canEnhance}
                                    onClick={handleEnhance}
                                    style={{
                                        width: '100%', padding: '16px', borderRadius: '16px',
                                        background: canEnhance ? 'linear-gradient(135deg, var(--accent) 0%, #3b82f6 100%)' : 'var(--slot-bg)',
                                        color: canEnhance ? 'var(--panel-bg)' : 'var(--text-dim)',
                                        border: 'none', fontWeight: '900', fontSize: '1rem', cursor: canEnhance ? 'pointer' : 'not-allowed',
                                        boxShadow: canEnhance ? '0 8px 25px rgba(144,213,255,0.2)' : 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        transition: '0.2s opacity'
                                    }}
                                >
                                    {isEnhancing ? (
                                        <div className="loading-spinner-small" />
                                    ) : (
                                        <>
                                            <Zap size={20} />
                                            ENHANCE GEAR
                                        </>
                                    )}
                                </motion.button>
                            </>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                style={{
                                    textAlign: 'center', padding: '20px', borderRadius: '24px',
                                    background: result.success ? 'rgba(74, 222, 128, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                    border: `1px solid ${result.success ? '#4ade8050' : '#ef444450'}`
                                }}>
                                {result.success ? (
                                    <CheckCircle2 size={48} style={{ color: '#4ade80', marginBottom: '16px' }} />
                                ) : (
                                    <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
                                )}
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>
                                    {result.success ? 'Success!' : 'Failed!'}
                                </h3>
                                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '24px' }}>
                                    {result.message}
                                </p>
                                <button
                                    onClick={() => {
                                        setResult(null);
                                        setIsEnhancing(false);
                                    }}

                                    style={{
                                        padding: '12px 32px', borderRadius: '12px', background: 'var(--accent)',
                                        color: 'var(--panel-bg)', border: 'none', fontWeight: '900', cursor: 'pointer'
                                    }}
                                >
                                    {result.success ? 'CONTINUE' : 'TRY AGAIN'}
                                </button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default EnhanceItemModal;
