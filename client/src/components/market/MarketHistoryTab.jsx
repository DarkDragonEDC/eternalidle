import React, { useState } from 'react';
import { ShoppingBag, User, Clock, History, Coins } from 'lucide-react';
import { resolveItem, getTierColor, formatItemId } from '@shared/items';
import { formatNumber } from '@utils/format';

const MarketHistoryTab = ({
    isLoadingHistory,
    marketHistory,
    myMarketHistory,
    getTimeAgo,
    historySubTab,
    setHistorySubTab,
    onInspect
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Sub-tabs: Global / My History */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <button
                    onClick={() => setHistorySubTab('GLOBAL')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: historySubTab === 'GLOBAL' ? 'var(--accent)' : 'var(--border)',
                        background: historySubTab === 'GLOBAL' ? 'var(--accent-soft)' : 'var(--glass-bg)',
                        color: historySubTab === 'GLOBAL' ? 'var(--accent)' : 'var(--text-dim)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <ShoppingBag size={14} /> Global
                </button>
                <button
                    onClick={() => setHistorySubTab('PERSONAL')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: historySubTab === 'PERSONAL' ? 'var(--accent)' : 'var(--border)',
                        background: historySubTab === 'PERSONAL' ? 'var(--accent-soft)' : 'var(--glass-bg)',
                        color: historySubTab === 'PERSONAL' ? 'var(--accent)' : 'var(--text-dim)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <User size={14} /> My History
                </button>
            </div>

            {/* Loading State */}
            {isLoadingHistory && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
                    <Clock size={32} style={{ marginBottom: '10px', opacity: 0.4 }} className="animate-spin" />
                    <p>Loading history...</p>
                </div>
            )}

            {/* Global History Content */}
            {!isLoadingHistory && historySubTab === 'GLOBAL' && (
                <>
                    {marketHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
                            <History size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                            <p>No market transactions recorded yet.</p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Transactions will appear here as players buy items.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {marketHistory.map((tx, idx) => {
                                const itemInfo = tx.item_data || resolveItem(tx.item_id, tx.quality) || {};
                                const tierColor = getTierColor(itemInfo.tier || 1);
                                const timeAgo = getTimeAgo(tx.created_at);

                                return (
                                    <div key={`hist-global-${tx.id || idx}`} style={{
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: '0.2s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                        {/* Item icon */}
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: 'var(--slot-bg)',
                                            border: `1px solid ${tx.item_data?.rarityColor || itemInfo.rarityColor || tierColor || 'var(--border)'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            overflow: 'hidden',
                                            position: 'relative',
                                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
                                        }}>
                                            {(() => {
                                                const resolved = resolveItem(tx.item_id, tx.quality);
                                                const icon = resolved?.icon || itemInfo.icon;
                                                const normalizedIcon = typeof icon === 'string' ? icon.replace(/\.(png|jpg|jpeg)$/, '.webp') : icon;
                                                return normalizedIcon ? (
                                                    <img src={normalizedIcon} alt={itemInfo.name || ''} style={{ width: '130%', height: '130%', objectFit: 'contain' }} />
                                                ) : (
                                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{itemInfo.tier || '?'}</span>
                                                );
                                            })()}
                                        </div>

                                        {/* Item info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{ color: tx.item_data?.rarityColor || itemInfo.rarityColor || tierColor }}>
                                                    {(() => {
                                                        const displayName = itemInfo.name || formatItemId(tx.item_id);
                                                        const tierPrefix = `T${itemInfo.tier}`;
                                                        const hasTierPrefix = displayName.trim().startsWith(tierPrefix);
                                                        return (
                                                            <>
                                                                {itemInfo.tier && !hasTierPrefix ? `${tierPrefix} ` : ''}
                                                                {itemInfo.qualityName && itemInfo.qualityName !== 'Normal' ? `${itemInfo.qualityName} ` : ''}
                                                                {displayName}
                                                            </>
                                                        );
                                                    })()}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                <span>Qty: <b>{tx.quantity}</b></span>
                                                <span style={{ opacity: 0.5 }}>·</span>
                                                <User size={12} /> <span onClick={() => onInspect && onInspect(tx.buyer_name)} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '500' }}>{tx.buyer_name}</span>
                                            </div>
                                        </div>

                                        {/* Price + time */}
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                <Coins size={16} /> {formatNumber(tx.price_total)}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                {tx.quantity > 1 && <span>{formatNumber(tx.price_per_unit)} ea</span>}
                                                <span style={{ opacity: 0.5 }}>·</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} /> {timeAgo}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Personal History Content */}
            {!isLoadingHistory && historySubTab === 'PERSONAL' && (
                <>
                    {myMarketHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
                            <User size={48} style={{ marginBottom: '15px', opacity: 0.3, margin: '0 auto' }} />
                            <p>You have no market transactions yet.</p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Your buys and sales will appear here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {myMarketHistory.map((tx, idx) => {
                                const itemInfo = tx.item_data || resolveItem(tx.item_id, tx.quality) || {};
                                const tierColor = getTierColor(itemInfo.tier || 1);
                                const timeAgo = getTimeAgo(tx.created_at);
                                const isBuyer = tx.role === 'BOUGHT';
                                const actionLabel = isBuyer ? 'BOUGHT' : 'SOLD';
                                const actionColor = isBuyer ? '#ff4d4d' : '#4caf50';

                                return (
                                    <div key={`hist-personal-${tx.id || idx}`} style={{
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--border)',
                                        borderLeft: `4px solid ${actionColor}`,
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: '0.2s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                        {/* Item icon */}
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: 'var(--slot-bg)',
                                            border: `1px solid ${tx.item_data?.rarityColor || itemInfo.rarityColor || tierColor || 'var(--border)'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            overflow: 'hidden',
                                            position: 'relative',
                                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
                                        }}>
                                            {(() => {
                                                const resolved = resolveItem(tx.item_id, tx.quality);
                                                const icon = resolved?.icon || itemInfo.icon;
                                                const normalizedIcon = typeof icon === 'string' ? icon.replace(/\.(png|jpg|jpeg)$/, '.webp') : icon;
                                                return normalizedIcon ? (
                                                    <img src={normalizedIcon} alt={itemInfo.name || ''} style={{ width: '130%', height: '130%', objectFit: 'contain' }} />
                                                ) : (
                                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{itemInfo.tier || '?'}</span>
                                                );
                                            })()}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{ color: tx.item_data?.rarityColor || itemInfo.rarityColor || tierColor }}>
                                                    {itemInfo.qualityName && itemInfo.qualityName !== 'Normal' ? `${itemInfo.qualityName} ` : ''}
                                                    {itemInfo.name || formatItemId(tx.item_id)}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '6px' }}>T{itemInfo.tier}</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
                                                <span style={{
                                                    background: `${actionColor}20`,
                                                    color: actionColor,
                                                    padding: '1px 8px',
                                                    borderRadius: '4px',
                                                    fontWeight: '900',
                                                    fontSize: '0.65rem',
                                                    letterSpacing: '0.5px'
                                                }}>{actionLabel}</span>
                                                <span>Qty: <b>{tx.quantity}</b></span>
                                            </div>
                                        </div>

                                        {/* Price + time */}
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: actionColor, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                <Coins size={16} />
                                                {isBuyer ? '-' : '+'}{formatNumber(isBuyer ? tx.price_total : (tx.price_total - (tx.tax_paid || 0)))}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                                                {tx.quantity > 1 && <span>{formatNumber(tx.price_per_unit)} ea</span>}
                                                <span style={{ opacity: 0.5 }}>·</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} /> {timeAgo}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MarketHistoryTab;
