import React, { useState } from 'react';
import { ShoppingBag, Package, Shield, Zap, Apple, X, Star } from 'lucide-react';
import { resolveItem, getRequiredProficiencyGroup } from '@shared/items';

const MarketSellTab = ({
    gameState,
    isMobile,
    currentListingsCount,
    maxListings,
    onListOnMarket,
    isPreviewActive,
    onPreviewActionBlocked
}) => {
    // Sell Tab States
    const [sellSearchQuery, setSellSearchQuery] = useState('');
    const [sellSelectedTier, setSellSelectedTier] = useState('ALL');
    const [sellSelectedQuality, setSellSelectedQuality] = useState('ALL');
    const [sellSelectedClass, setSellSelectedClass] = useState('ALL');
    const [sellSelectedSortOrder, setSellSelectedSortOrder] = useState('NEWEST');
    const [sellSelectedCategory, setSellSelectedCategory] = useState('ALL');

    const totalSilver = gameState?.state?.currency?.silver || 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                background: 'var(--slot-bg)',
                borderRadius: '8px',
                marginBottom: '15px',
                border: '1px solid var(--border)'
            }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingBag size={16} /> Market Slots:
                </div>
                <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: currentListingsCount >= maxListings ? '#ff4444' : 'var(--accent)'
                }}>
                    {currentListingsCount} / {maxListings}
                </div>
            </div>

            {/* SEARCH AND FILTERS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '15px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                    <input
                        placeholder="Search items..."
                        type="text"
                        value={sellSearchQuery}
                        onChange={(e) => setSellSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '10px 10px 10px 15px',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem'
                        }}
                    />
                    {sellSearchQuery && (
                        <X
                            size={16}
                            onClick={() => setSellSearchQuery('')}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', cursor: 'pointer' }}
                        />
                    )}
                </div>

                {/* Advanced Filters Row */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <select
                        value={sellSelectedTier}
                        onChange={(e) => setSellSelectedTier(e.target.value)}
                        style={{
                            flex: '1',
                            minWidth: '100px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            color: 'var(--text-main)',
                            fontSize: '0.8rem'
                        }}
                    >
                        <option value="ALL">All Tiers</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(t => (
                            <option key={t} value={t}>Tier {t}</option>
                        ))}
                    </select>

                    <select
                        value={sellSelectedQuality}
                        onChange={(e) => setSellSelectedQuality(e.target.value)}
                        style={{
                            flex: '1',
                            minWidth: '100px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            color: 'var(--text-main)',
                            fontSize: '0.8rem'
                        }}
                    >
                        <option value="ALL">All Qualities</option>
                        <option value="0">Normal</option>
                        <option value="1">Good</option>
                        <option value="2">Outstanding</option>
                        <option value="3">Excellent</option>
                        <option value="4">Masterpiece</option>
                    </select>

                    <select
                        value={sellSelectedClass}
                        onChange={(e) => setSellSelectedClass(e.target.value)}
                        style={{
                            flex: '1',
                            minWidth: '100px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            color: 'var(--text-main)',
                            fontSize: '0.8rem'
                        }}
                    >
                        <option value="ALL">All Classes</option>
                        <option value="WARRIOR">Warrior</option>
                        <option value="HUNTER">Hunter</option>
                        <option value="MAGE">Mage</option>
                    </select>

                    <select
                        value={sellSelectedSortOrder}
                        onChange={(e) => setSellSelectedSortOrder(e.target.value)}
                        style={{
                            flex: '1',
                            minWidth: '120px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            color: 'var(--text-main)',
                            fontSize: '0.8rem'
                        }}
                    >
                        <option value="NEWEST">Newest First</option>
                        <option value="OLDEST">Oldest First</option>
                        <option value="TIER_DESC">Tier: High to Low</option>
                        <option value="TIER_ASC">Tier: Low to High</option>
                    </select>
                </div>

                {/* Filter Buttons */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', width: '100%' }}>
                    {[
                        { id: 'ALL', label: 'All Items', icon: <ShoppingBag size={14} /> },
                        { id: 'EQUIPMENT', label: 'Equipment', icon: <Shield size={14} /> },
                        { id: 'RESOURCE', label: 'Resources', icon: <Package size={14} /> },
                        { id: 'REFINED', label: 'Refined', icon: <Zap size={14} /> },
                        { id: 'CONSUMABLE', label: 'Consumables', icon: <Apple size={14} /> }
                    ].map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSellSelectedCategory(cat.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: sellSelectedCategory === cat.id ? 'var(--accent)' : 'var(--border)',
                                whiteSpace: 'nowrap',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                background: sellSelectedCategory === cat.id ? 'var(--accent-soft)' : 'var(--glass-bg)',
                                color: sellSelectedCategory === cat.id ? 'var(--accent)' : 'var(--text-dim)'
                            }}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="scroll-container" style={{ flex: 1, paddingRight: '5px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                    gap: isMobile ? '8px' : '12px',
                    paddingBottom: '20px'
                }}>
                    {(() => {
                        const inventoryItems = Object.entries(gameState?.state?.inventory || {}).map(([id, entry]) => {
                            const qty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);
                            const data = resolveItem(id);
                            const mergedData = (entry && typeof entry === 'object') ? { ...data, ...entry } : data;
                            return { id, qty, data: mergedData };
                        }).filter(item => {
                            if (item.qty <= 0) return false;
                            if (!item.data) return false;
                            if (item.data.type === 'QUEST') return false;

                            if (sellSearchQuery) {
                                const searchLower = sellSearchQuery.toLowerCase();
                                const itemName = item.data.name?.toLowerCase() || '';
                                const itemId = item.id.toLowerCase();
                                if (!itemName.includes(searchLower) && !itemId.includes(searchLower)) return false;
                            }

                            if (sellSelectedTier !== 'ALL' && item.data.tier !== parseInt(sellSelectedTier)) return false;

                            const itemQuality = item.data.quality ?? 0;
                            if (sellSelectedQuality !== 'ALL' && itemQuality !== parseInt(sellSelectedQuality)) return false;

                            if (sellSelectedCategory !== 'ALL') {
                                const type = item.data.type;
                                if (sellSelectedCategory === 'EQUIPMENT') {
                                    if (!['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'OFF_HAND', 'GLOVES', 'CAPE'].includes(type) && !type?.startsWith('TOOL')) return false;
                                } else if (sellSelectedCategory === 'RESOURCE') {
                                    if (type !== 'RAW' && type !== 'RESOURCE') return false;
                                    const isRefined = item.id.includes('_BAR') || item.id.includes('_PLANK') || item.id.includes('_LEATHER') || item.id.includes('_CLOTH') || item.id.includes('_EXTRACT');
                                    if (isRefined) return false;
                                } else if (sellSelectedCategory === 'REFINED') {
                                    if (type !== 'REFINED') {
                                        const isRefined = item.id.includes('_BAR') || item.id.includes('_PLANK') || item.id.includes('_LEATHER') || item.id.includes('_CLOTH') || item.id.includes('_EXTRACT');
                                        if (!isRefined) return false;
                                    }
                                } else if (sellSelectedCategory === 'CONSUMABLE') {
                                    if (!['FOOD', 'POTION'].includes(type)) return false;
                                }
                            }

                            if (sellSelectedClass !== 'ALL') {
                                const requiredClass = getRequiredProficiencyGroup(item.id);
                                if (requiredClass !== sellSelectedClass.toLowerCase()) return false;
                            }

                            return true;
                        });

                        inventoryItems.sort((a, b) => {
                            if (sellSelectedSortOrder === 'NEWEST') return 0;
                            if (sellSelectedSortOrder === 'OLDEST') return 0;
                            if (sellSelectedSortOrder === 'TIER_DESC') return b.data.tier - a.data.tier;
                            if (sellSelectedSortOrder === 'TIER_ASC') return a.data.tier - b.data.tier;
                            return 0;
                        });

                        return inventoryItems.map(({ id, qty, data }) => {
                            let specificBorderColor = 'var(--border)';
                            if (data.rarityColor) {
                                specificBorderColor = data.rarityColor;
                            } else if (data.rarity) {
                                switch (data.rarity) {
                                    case 'COMMON': specificBorderColor = '#9CA3AF'; break;
                                    case 'UNCOMMON': specificBorderColor = '#10B981'; break;
                                    case 'RARE': specificBorderColor = '#3B82F6'; break;
                                    case 'EPIC': specificBorderColor = '#F59E0B'; break;
                                    case 'LEGENDARY': specificBorderColor = '#EF4444'; break;
                                    case 'MYTHIC': specificBorderColor = '#A855F7'; break;
                                    default: specificBorderColor = 'var(--border)';
                                }
                            }

                            return (
                                <button
                                    key={`sell-${id}`}
                                    onClick={() => {
                                        if (isPreviewActive) return onPreviewActionBlocked();
                                        onListOnMarket({ itemId: id, max: qty });
                                    }}
                                    style={{
                                        background: 'var(--slot-bg)',
                                        border: `1px solid ${specificBorderColor}`,
                                        boxShadow: (data.rarity && data.rarity !== 'COMMON') ? `0 0 10px ${specificBorderColor}22` : 'inset 0 2px 4px rgba(0,0,0,0.3)',
                                        borderRadius: '12px',
                                        padding: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        aspectRatio: '1/1',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        minHeight: '85px',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = specificBorderColor; }}
                                >
                                    <div style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.6rem', color: 'var(--text-main)', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 10 }}>T{data.tier}</div>
                                    <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 'bold', zIndex: 10 }}>x{qty}</div>

                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                                        {data.icon ? (
                                            <img src={typeof data.icon === 'string' ? data.icon.replace(/\.(png|jpg|jpeg)$/, '.webp') : data.icon} alt={data.name} style={{ width: data.scale || '130%', height: data.scale || '130%', objectFit: 'contain' }} />
                                        ) : (
                                            <Package size={32} color="#666" style={{ opacity: 0.8 }} />
                                        )}
                                        {data.stars > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 2,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                display: 'flex',
                                                gap: '0px',
                                                zIndex: 10,
                                                background: 'rgba(0,0,0,0.6)',
                                                padding: '1px 3px',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(255,215,0,0.3)'
                                            }}>
                                                {Array.from({ length: data.stars }).map((_, i) => (
                                                    <Star key={`sell-star-${id || 'any'}-${i}`} size={7} fill="#FFD700" color="#FFD700" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 'bold', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px' }}>
                                        {data.name}
                                    </div>
                                </button>
                            );
                        })
                    })()}
                </div>
            </div>
        </div>
    );
};

export default MarketSellTab;
