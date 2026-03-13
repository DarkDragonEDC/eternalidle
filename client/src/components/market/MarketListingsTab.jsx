import React, { useState } from 'react';
import { Tag, Clock, Coins, Trash2, Star } from 'lucide-react';
import { resolveItem } from '@shared/items';
import { formatSilver } from '@utils/format';

const MarketListingsTab = ({
    myOrders,
    currentListingsCount,
    maxListings,
    onCancelItem
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const totalPages = Math.ceil(myOrders.length / itemsPerPage);
    const paginatedOrders = myOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                marginBottom: '15px',
                border: '1px solid var(--border)'
            }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={16} /> Active Listings:
                </div>
                <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: currentListingsCount >= maxListings ? '#ff4444' : 'var(--accent)'
                }}>
                    {currentListingsCount} / {maxListings}
                </div>
            </div>
            <div className="scroll-container" style={{ flex: 1, paddingRight: '5px' }}>
                {myOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                        <Tag size={48} style={{ marginBottom: '15px', opacity: 0.3, margin: '0 auto' }} />
                        <p>You have no active listings.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                            {paginatedOrders.map(l => (
                            <div key={`my-${l.id}`} style={{
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
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${l.item_data?.rarityColor || 'var(--border)'}`,
                                    flexShrink: 0,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                                }}>
                                    {(() => {
                                        const resolved = resolveItem(l.itemId || l.item_id, l.item_data?.quality);
                                        const icon = resolved?.icon || l.item_data?.icon;
                                        const normalizedIcon = typeof icon === 'string' ? icon.replace(/\.(png|jpg|jpeg)$/, '.webp') : icon;
                                        return normalizedIcon ? (
                                            <img src={normalizedIcon} alt={l.item_data?.name} style={{ width: l.item_data?.scale || '130%', height: l.item_data?.scale || '130%', objectFit: 'contain', opacity: 1.0 }} />
                                        ) : (
                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{l.item_data?.tier}</span>
                                        );
                                    })()}
                                    <div style={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                                        T{l.item_data?.tier}
                                    </div>
                                    {/* Rune Stars */}
                                    {(l.item_data?.stars > 0) && (
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
                                            {Array.from({ length: l.item_data.stars }).map((_, i) => (
                                                <Star key={`my-star-${l.id || 'any'}-${i}`} size={7} fill="#FFD700" color="#FFD700" />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ flex: '2 1 0%', minWidth: '150px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span>{l.item_data?.qualityName && l.item_data?.qualityName !== 'Normal' ? `${l.item_data.qualityName} ` : ''}{resolveItem(l.itemId || l.item_id)?.name || l.item_data?.name}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', gap: '15px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} /> {new Date(l.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 0%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: '500' }}>
                                        {((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 0} unit(s)
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        <Coins size={18} /> {formatSilver(l.price)}
                                    </div>
                                </div>

                                <div style={{ marginLeft: '15px' }}>
                                    <button
                                        onClick={() => onCancelItem(l)}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            background: 'rgba(255, 68, 68, 0.1)',
                                            color: '#ff4444',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem',
                                            minWidth: '110px',
                                            border: '1px solid rgba(255, 68, 68, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)'; }}
                                    >
                                        <Trash2 size={16} /> CANCEL
                                    </button>
                                </div>
                            </div>
                        ))}
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
    </div>
    );
};

export default MarketListingsTab;
