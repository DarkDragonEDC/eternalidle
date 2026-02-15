import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Coins, Tag, Trash2, ArrowRight, Zap } from 'lucide-react';
import { getTierColor, calculateItemSellPrice, resolveItem } from '@shared/items';

const ItemActionModal = ({ item: rawItem, onClose, onEquip, onSell, onList, onUse, onDismantle, customAction, isIronman }) => {
    if (!rawItem) return null;

    // Robust resolution: ensure we have full details including qualityName
    const resolved = resolveItem(rawItem.id);
    const item = { ...rawItem, ...resolved, id: rawItem.id };


    const tierColor = getTierColor(item.tier);
    const borderColor = item.rarityColor || tierColor;

    // Clean name: remove T{tier} from the name if we are going to append it manually
    const cleanBaseName = (item.name || '').replace(new RegExp(` T${item.tier}$`), '');

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.4)',
                    zIndex: 20000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'var(--panel-bg)',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '16px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '350px',
                        boxShadow: 'var(--panel-shadow)',
                        position: 'relative'
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={20} />
                    </button>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <div style={{
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            color: item.rarityColor || 'var(--text-main)',
                            marginBottom: '4px'
                        }}>
                            {cleanBaseName}
                        </div>
                        <div style={{
                            fontSize: '0.8rem',
                            color: tierColor,
                            fontWeight: 'bold',
                            border: `1px solid ${tierColor}`,
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px'
                        }}>
                            TIER {item.tier}
                        </div>
                    </div>

                    {/* Stats Display */}
                    {item.stats && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                            background: 'var(--slot-bg)',
                            padding: '15px',
                            borderRadius: '10px',
                            marginBottom: '20px',
                            border: '1px solid var(--border)'
                        }}>
                            {/* Primary Stats */}
                            {item.stats.damage > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Damage</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ff4444' }}>{item.stats.damage}</span>
                                </div>
                            )}
                            {item.stats.defense > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Defense</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#44ff44' }}>{item.stats.defense}</span>
                                </div>
                            )}
                            {item.stats.hp > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Health</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#44ff44' }}>+{item.stats.hp}</span>
                                </div>
                            )}
                            {item.stats.attackSpeed > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Speed</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ffd700' }}>
                                        {(1000 / item.stats.attackSpeed).toFixed(1)} <span style={{ fontSize: '0.7rem' }}>/s</span>
                                    </span>
                                </div>
                            )}

                            {/* Attributes */}
                            {(item.stats.str > 0 || item.stats.agi > 0 || item.stats.int > 0) && (
                                <div style={{ gridColumn: '1 / -1', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around' }}>
                                    {item.stats.str > 0 && <span style={{ color: '#ff8888', fontWeight: 'bold', fontSize: '0.9rem' }}>+{item.stats.str} STR</span>}
                                    {item.stats.agi > 0 && <span style={{ color: '#88ff88', fontWeight: 'bold', fontSize: '0.9rem' }}>+{item.stats.agi} AGI</span>}
                                    {item.stats.int > 0 && <span style={{ color: '#8888ff', fontWeight: 'bold', fontSize: '0.9rem' }}>+{item.stats.int} INT</span>}
                                </div>
                            )}

                            {/* Efficiency */}
                            {item.stats.efficiency && (
                                <div style={{ gridColumn: '1 / -1', marginTop: '5px', textAlign: 'center' }}>
                                    <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        Efficiency: {typeof item.stats.efficiency === 'object' ? 'Global Bonus' : item.stats.efficiency}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {customAction && (
                            <button
                                onClick={() => { customAction.onClick(item); onClose(); }}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--accent)',
                                    color: 'var(--panel-bg)',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                {customAction.icon || <Zap size={18} />} {customAction.label}
                            </button>
                        )}
                        {(['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'FOOD'].includes(item.type) || item.type.startsWith('TOOL')) && (
                            <button
                                onClick={() => { onEquip(item.id); onClose(); }}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--accent)',
                                    color: 'var(--panel-bg)',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Shield size={18} /> EQUIP
                            </button>
                        )}

                        {((['POTION', 'CONSUMABLE', 'CHEST'].includes(item.type)) || (item.id && item.id.includes('CHEST'))) && (
                            <button
                                onClick={() => { onUse(item.id); onClose(); }}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--accent)',
                                    color: 'var(--panel-bg)',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Zap size={18} /> {item.type === 'POTION' ? 'DRINK' : (item.id.includes('CHEST') ? 'OPEN' : 'USE')}
                            </button>
                        )}

                        {(['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND'].includes(item.type) || item.type.startsWith('TOOL_')) && (
                            <button
                                onClick={() => { onDismantle(item.id); onClose(); }}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)'
                                }}
                            >
                                <Trash2 size={18} /> DISMANTLE
                            </button>
                        )}

                        {!isIronman && (
                            <button
                                onClick={() => { onList(item.id, item); onClose(); }}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--accent)',
                                    background: 'transparent',
                                    color: 'var(--accent)',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Tag size={18} /> LIST ON MARKET
                            </button>
                        )}

                        <button
                            onClick={() => { onSell(item.id); onClose(); }}
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--accent-soft)',
                                color: 'var(--text-main)',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <Coins size={18} /> SELL QUICKLY ({calculateItemSellPrice(item, item.id)})
                        </button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ItemActionModal;
