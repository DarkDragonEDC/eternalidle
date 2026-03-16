import React from 'react';
import { ShoppingBag, Coins, Hammer, Clock, Star } from 'lucide-react';
import { resolveItem } from '@shared/items';
import { formatSilver } from '@utils/format';

const MarketClaimTab = ({
    claims = [],
    onInspect,
    onClaim,
    onClaimAll
}) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 10;

    const totalPages = Math.ceil((claims?.length || 0) / itemsPerPage);
    const paginatedClaims = (claims || []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="scroll-container" style={{ flex: 1, paddingRight: '5px' }}>
            {(!claims || claims.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                    <ShoppingBag size={48} style={{ marginBottom: '15px', opacity: 0.3, margin: '0 auto' }} />
                    <p>Nothing to claim.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {claims.length > 1 && (
                        <div style={{ padding: '0 0 10px 0', borderBottom: '1px solid var(--border)', marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={onClaimAll}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: 'var(--accent)',
                                    color: '#000',
                                    fontWeight: '900',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    letterSpacing: '1px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.3)';
                                }}
                            >
                                <ShoppingBag size={18} /> CLAIM ALL
                            </button>
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>

                        {paginatedClaims.map(c => {
                            let isItem = c.type === 'BOUGHT_ITEM' || c.type === 'CANCELLED_LISTING' || c.type === 'SOLD_ITEM';
                            let name = c.type === 'MARKET_REFUND' ? (c.message || 'Market Refund') : (c.name || 'Item');
                            let icon = <Coins size={24} color="var(--accent)" />;

                            let itemData = null;
                            if (isItem && c.itemId) {
                                const resolved = resolveItem(c.itemId, c.metadata?.quality);
                                itemData = {
                                    ...(c.metadata || {}),
                                    ...resolved,
                                    craftedBy: c.metadata?.craftedBy || resolved?.craftedBy
                                };

                                if (itemData) {
                                    if (c.type === 'SOLD_ITEM') {
                                        name = `Sold: ${itemData.name}`;
                                    } else {
                                        name = itemData.name;
                                    }

                                    if (c.type !== 'SOLD_ITEM') {
                                        const iconUrl = itemData.icon || resolveItem(c.itemId, c.metadata?.quality)?.icon;
                                        if (iconUrl) {
                                            icon = <img src={iconUrl} alt={itemData.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
                                        } else {
                                            icon = <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{itemData.tier}</span>;
                                        }
                                    }
                                }
                            }

                            const itemRarityColor = itemData?.rarityColor || '#fff';
                            const hasGlow = itemRarityColor !== '#fff';

                            return (
                                <div key={`claim-${c.id}`} style={{
                                    background: 'var(--glass-bg)',
                                    border: '1px solid var(--border)',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    transition: '0.2s',
                                    position: 'relative',
                                    flexWrap: 'wrap',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        background: 'var(--slot-bg)',
                                        borderRadius: '8px',
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: isItem && itemData ? `1px solid ${itemRarityColor}` : '1px solid var(--accent)',
                                        boxShadow: hasGlow && itemData ? `0 0 10px ${itemRarityColor}44` : 'inset 0 2px 4px rgba(0,0,0,0.3)',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        {isItem && icon && typeof icon !== 'string' ? (
                                            React.cloneElement(icon, { style: { width: '130%', height: '130%', objectFit: 'contain' } })
                                        ) : (
                                            icon
                                        )}

                                        {itemData?.tier && (
                                            <div style={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                                                T{itemData.tier}
                                            </div>
                                        )}

                                        {itemData?.stars > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '1px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                display: 'flex',
                                                gap: '0px',
                                                background: 'rgba(0,0,0,0.6)',
                                                padding: '1px 3px',
                                                borderRadius: '4px',
                                                whiteSpace: 'nowrap',
                                                border: '1px solid rgba(255,215,0,0.3)',
                                                zIndex: 10
                                            }}>
                                                {Array.from({ length: itemData.stars }).map((_, i) => (
                                                    <Star key={`claim-star-${c.id || 'any'}-${i}`} size={7} fill="#FFD700" color="#FFD700" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: '2 1 0%', minWidth: '150px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span>{name}</span>
                                            {c.metadata?.craftedBy && (
                                                <span 
                                                    onClick={(e) => {
                                                        if (onInspect) {
                                                            e.stopPropagation();
                                                            onInspect(c.metadata.craftedBy);
                                                        }
                                                    }}
                                                    style={{ fontSize: '0.75rem', color: 'var(--accent)', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px', cursor: onInspect ? 'pointer' : 'default', fontWeight: '500' }}
                                                >
                                                    <Hammer size={12} /> {c.metadata.craftedBy}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', gap: '15px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> {new Date(c.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ flex: '1 1 0%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: '500' }}>
                                            {c.type === 'SOLD_ITEM' && `Quantity: ${(typeof c.amount === 'object' && c.amount !== null) ? (c.amount.amount || 0) : c.amount}`}
                                            {c.type === 'BOUGHT_ITEM' && `Bought x${(typeof c.amount === 'object' && c.amount !== null) ? (c.amount.amount || 0) : c.amount}`}
                                            {c.type === 'CANCELLED_LISTING' && `Retrieved x${(typeof c.amount === 'object' && c.amount !== null) ? (c.amount.amount || 0) : c.amount}`}
                                        </div>
                                        {c.silver ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                <Coins size={18} /> +{formatSilver(c.silver)}
                                            </div>
                                        ) : (
                                            <div style={{ height: '24px' }}></div>
                                        )}
                                    </div>

                                    <div style={{ marginLeft: '15px' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onClaim(c.id); }}
                                            style={{
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: 'rgba(76, 175, 80, 0.1)',
                                                color: '#4caf50',
                                                fontWeight: 'bold',
                                                fontSize: '0.85rem',
                                                minWidth: '110px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                border: '1px solid rgba(76, 175, 80, 0.2)',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(76, 175, 80, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                        >
                                            CLAIM
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            gap: '20px', 
                            padding: '10px 0',
                            borderTop: '1px solid var(--border)',
                            marginTop: '10px'
                        }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: currentPage === 1 ? 'transparent' : 'var(--accent-soft)',
                                    color: currentPage === 1 ? 'var(--text-dim)' : 'var(--accent)',
                                    border: '1px solid',
                                    borderColor: currentPage === 1 ? 'var(--border)' : 'var(--accent)',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Previous
                            </button>
                            
                            <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '500' }}>
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: currentPage === totalPages ? 'transparent' : 'var(--accent-soft)',
                                    color: currentPage === totalPages ? 'var(--text-dim)' : 'var(--accent)',
                                    border: '1px solid',
                                    borderColor: currentPage === totalPages ? 'var(--border)' : 'var(--accent)',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MarketClaimTab;
