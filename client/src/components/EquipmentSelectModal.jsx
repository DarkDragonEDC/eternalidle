
import React from 'react';
import { X, Sword, Shield, Heart, Zap, Play, Layers, User, Pickaxe, Target, Apple, Star, Info } from 'lucide-react';
import { resolveItem, getTierColor, calculateRuneBonus } from '@shared/items';
import { getBestItemForSlot, isBetterItem } from '../utils/equipment';

const EquipmentSelectModal = ({ slot, onClose, currentItem, onEquip, onUnequip, inventory, onShowInfo }) => {

    // Filter candidates from inventory based on slot
    const { candidates, bestCandidate } = React.useMemo(() => {
        const itemArray = [];
        Object.entries(inventory).forEach(([itemId, qty]) => {
            if (qty <= 0) return;
            const item = resolveItem(itemId);
            if (!item) return;

            let matches = false;
            if (slot.startsWith('rune_')) {
                const parts = slot.split('_');
                const targetAct = parts[1];
                const targetEff = parts[2];

                if (item.type === 'RUNE') {
                    const itemMatch = itemId.match(/^T\d+_RUNE_(.+)_(\d+)STAR$/);
                    if (itemMatch) {
                        const runeKey = itemMatch[1];
                        const runeParts = runeKey.split('_');
                        if (runeParts[0] === targetAct && runeParts[1] === targetEff) {
                            matches = true;
                        }
                    }
                }
            } else {
                switch (slot) {
                    case 'cape': matches = item.type === 'CAPE'; break;
                    case 'helmet': case 'head': matches = item.type === 'HELMET'; break;
                    case 'tool_axe': matches = item.type === 'TOOL_AXE'; break;
                    case 'tool_pickaxe': matches = item.type === 'TOOL_PICKAXE'; break;
                    case 'tool_knife': matches = item.type === 'TOOL_KNIFE'; break;
                    case 'tool_sickle': matches = item.type === 'TOOL_SICKLE'; break;
                    case 'tool_rod': matches = item.type === 'TOOL_ROD'; break;
                    case 'gloves': matches = item.type === 'GLOVES'; break;
                    case 'chest': matches = item.type === 'ARMOR'; break;
                    case 'offHand': matches = item.type === 'OFF_HAND'; break;
                    case 'mainHand': matches = item.type === 'WEAPON'; break;
                    case 'boots': case 'shoes': matches = item.type === 'BOOTS'; break;
                    case 'food': matches = item.type === 'FOOD'; break;
                    default: matches = false;
                }
            }

            if (matches) {
                itemArray.push({ ...item, id: itemId, qty });
            }
        });

        // Use same sorting as utility
        // Use same sorting as utility
        itemArray.sort((a, b) => {
            // Special sort for Runes using calculated bonus
            if (a.type === 'RUNE' && b.type === 'RUNE') {
                const bVal = calculateRuneBonus(b.tier || 1, b.stars || 1);
                const aVal = calculateRuneBonus(a.tier || 1, a.stars || 1);
                if (bVal !== aVal) return bVal - aVal;
                // If bonus is same, prefer tier
                return (b.tier || 0) - (a.tier || 0);
            }

            if ((b.ip || 0) !== (a.ip || 0)) return (b.ip || 0) - (a.ip || 0);
            const bQual = b.quality || b.stars || 0;
            const aQual = a.quality || a.stars || 0;
            if (bQual !== aQual) return bQual - aQual;
            return (b.tier || 0) - (a.tier || 0);
        });

        const best = itemArray.length > 0 ? itemArray[0] : null;
        return { candidates: itemArray, bestCandidate: best };
    }, [slot, inventory]);

    // Resolve current item for comparison
    const resolvedCurrent = React.useMemo(() => {
        if (!currentItem) return null;
        return { ...resolveItem(currentItem.id), ...currentItem };
    }, [currentItem]);

    // Check if the best candidate is actually better than current
    const isRecommended = React.useCallback((candidate) => {
        return isBetterItem(candidate, currentItem);
    }, [currentItem]);

    const showRecommendation = bestCandidate && isRecommended(bestCandidate);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={handleBackdropClick}>
            <div style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '500px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--panel-shadow)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--accent-soft)',
                    flexShrink: 0
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Select {slot}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '5px' }}>
                        <X size={24} />
                    </button>
                </div>
                <div style={{
                    flex: 1,
                    padding: '20px',
                    paddingBottom: '20px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    minHeight: 0
                }}>

                    {/* Recommendation Section */}
                    {showRecommendation && (
                        <div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.75rem',
                                color: 'var(--accent)',
                                textTransform: 'uppercase',
                                marginBottom: '10px',
                                fontWeight: '900',
                                letterSpacing: '1px'
                            }}>
                                <Zap size={14} fill="var(--accent)" /> Recommended Item
                            </div>
                            <div
                                onClick={() => { onEquip(bestCandidate.id); onClose(); }}
                                style={{
                                    background: 'var(--slot-bg)',
                                    border: '1px solid var(--accent)',
                                    borderRadius: '12px',
                                    padding: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    boxShadow: '0 0 20px rgba(212, 175, 55, 0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: 'rgba(0,0,0,0.4)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${bestCandidate.rarityColor || (bestCandidate.quality > 0 ? bestCandidate.rarityColor : 'var(--accent)')}`,
                                        boxShadow: bestCandidate.rarityColor ? `0 0 10px ${bestCandidate.rarityColor}55` : (bestCandidate.quality > 0 ? `0 0 10px ${bestCandidate.rarityColor}55` : 'none'),
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        {bestCandidate.icon ? (
                                            <img src={bestCandidate.icon} style={{ width: '80%', height: '80%', objectFit: 'contain' }} alt="" />
                                        ) : (
                                            <Star size={24} color={bestCandidate.rarityColor || (bestCandidate.quality > 0 ? bestCandidate.rarityColor : 'var(--accent)')} />
                                        )}
                                        {bestCandidate.type === 'RUNE' && bestCandidate.stars && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 2,
                                                left: 0,
                                                right: 0,
                                                display: 'flex',
                                                justifyContent: 'center',
                                                gap: '1px'
                                            }}>
                                                {Array.from({ length: bestCandidate.stars }).map((_, i) => (
                                                    <Star key={i} size={6} fill="#FFD700" color="#FFD700" strokeWidth={1} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                            {bestCandidate.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: bestCandidate.rarityColor || 'var(--accent)' }}>
                                            {bestCandidate.type === 'RUNE' ? `Tier ${bestCandidate.tier} • ${bestCandidate.stars} Stars` : `IP ${bestCandidate.ip || 0} • Tier ${bestCandidate.tier}`}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ background: 'var(--accent)', color: 'var(--panel-bg)', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                    EQUIP BEST
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Item Section */}
                    {currentItem && (
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 'bold' }}>
                                Currently Equipped
                            </div>
                            <div style={{
                                background: 'rgba(76, 175, 80, 0.05)',
                                border: '1px solid rgba(76, 175, 80, 0.2)',
                                borderRadius: '12px',
                                padding: '15px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${resolvedCurrent?.rarityColor || 'rgba(255,255,255,0.1)'}`,
                                        boxShadow: resolvedCurrent?.rarityColor ? `0 0 10px ${resolvedCurrent.rarityColor}33` : 'none',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        {resolvedCurrent?.icon ? (
                                            <img src={resolvedCurrent.icon} style={{ width: '80%', height: '80%', objectFit: 'contain' }} alt="" />
                                        ) : (
                                            <Star size={24} color={resolvedCurrent?.rarityColor || "#666"} />
                                        )}
                                        {resolvedCurrent?.type === 'RUNE' && resolvedCurrent.stars && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 2,
                                                left: 0,
                                                right: 0,
                                                display: 'flex',
                                                justifyContent: 'center',
                                                gap: '1px'
                                            }}>
                                                {Array.from({ length: resolvedCurrent.stars }).map((_, i) => (
                                                    <Star key={i} size={6} fill="#FFD700" color="#FFD700" strokeWidth={1} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {resolvedCurrent?.name || currentItem.name || currentItem.id}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onShowInfo(currentItem); }}
                                                style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5 }}
                                            >
                                                <Info size={14} color="var(--text-main)" />
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: resolvedCurrent?.rarityColor || '#888' }}>
                                            {resolvedCurrent?.type === 'RUNE' ? `Tier ${currentItem.tier} • ${resolvedCurrent.stars} Stars` : `Tier ${currentItem.tier} • IP ${currentItem.ip || 0}`}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { onUnequip(slot); onClose(); }}
                                    style={{
                                        background: 'rgba(255, 68, 68, 0.15)',
                                        color: '#ff4444',
                                        border: '1px solid rgba(255, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem',
                                        transition: '0.2s'
                                    }}
                                >
                                    UNEQUIP
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Inventory List */}
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 'bold' }}>
                            All Inventory
                        </div>
                        {candidates.length === 0 ? (
                            <div style={{
                                padding: '30px',
                                textAlign: 'center',
                                color: '#555',
                                background: 'var(--slot-bg)',
                                borderRadius: '12px',
                                fontSize: '0.9rem'
                            }}>
                                No compatible items found.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {candidates.map((item, idx) => {
                                    const isItemRecommended = isRecommended(item);
                                    return (
                                        <div
                                            key={`${item.id}-${idx}`}
                                            onClick={() => { onEquip(item.id); onClose(); }}
                                            style={{
                                                background: 'var(--slot-bg)',
                                                border: `1px solid ${isItemRecommended ? 'var(--accent)' : (item.quality > 0 ? item.rarityColor : 'var(--border)')}`,
                                                borderRadius: '12px',
                                                padding: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: '0.2s',
                                                boxShadow: isItemRecommended ? '0 0 10px rgba(212, 175, 55, 0.05)' : (item.quality > 0 ? `0 0 10px ${item.rarityColor}10` : 'none')
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--slot-bg)'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{
                                                    width: '42px',
                                                    height: '42px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#aaa',
                                                    position: 'relative',
                                                    border: `1px solid ${item.rarityColor || (item.quality > 0 ? item.rarityColor : 'var(--border)')}`,
                                                    boxShadow: item.rarityColor ? `0 0 10px ${item.rarityColor}33` : (item.quality > 0 ? `0 0 10px ${item.rarityColor}10` : 'none'),
                                                    overflow: 'hidden'
                                                }}>
                                                    {item.icon ? (
                                                        <img src={item.icon} style={{ width: '80%', height: '80%', objectFit: 'contain' }} alt="" />
                                                    ) : (
                                                        <Star size={20} color={item.rarityColor || '#aaa'} />
                                                    )}
                                                    {item.type === 'RUNE' && item.stars && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            left: 0,
                                                            right: 0,
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            gap: '1px',
                                                            background: 'rgba(0,0,0,0.4)',
                                                            padding: '1px 0'
                                                        }}>
                                                            {Array.from({ length: item.stars }).map((_, i) => (
                                                                <Star key={i} size={5} fill="#FFD700" color="#FFD700" strokeWidth={1} />
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: -2,
                                                        right: -2,
                                                        background: '#333',
                                                        borderRadius: '50%',
                                                        width: '16px',
                                                        height: '16px',
                                                        fontSize: '0.55rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '1px solid #555',
                                                        color: '#fff',
                                                        fontWeight: 'bold',
                                                        zIndex: 2
                                                    }}>{item.qty}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {item.name}
                                                        {isItemRecommended && (
                                                            <span style={{ fontSize: '0.6rem', background: 'var(--accent)', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>BEST</span>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onShowInfo(item); }}
                                                            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5 }}
                                                        >
                                                            <Info size={14} color="#fff" />
                                                        </button>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: item.rarityColor || '#888' }}>
                                                        {item.type === 'RUNE' ? `Tier ${item.tier} • ${item.stars} Stars` : `Tier ${item.tier} ${item.ip ? `• IP ${item.ip}` : ''}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ color: isItemRecommended ? 'var(--accent)' : '#4caf50', fontSize: '0.8rem', fontWeight: 'bold' }}>EQUIP</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {/* SPACER ELEMENT TO FIX SCROLL CUTOFF */}
                    <div style={{ minHeight: '40px', flexShrink: 0 }}></div>
                </div>
            </div>
        </div>
    );
};

export default EquipmentSelectModal;
