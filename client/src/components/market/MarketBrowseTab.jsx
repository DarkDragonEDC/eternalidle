import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Shield, Zap, Apple, Box, Info, User, Clock, Hammer, Coins, Star, Package, Tag, Gem } from 'lucide-react';
import { resolveItem, formatItemId, getRequiredProficiencyGroup } from '@shared/items';
import { formatSilver, formatNumber } from '@utils/format';

const MarketBrowseTab = ({
    marketListings,
    gameState,
    silver,
    onShowInfo,
    onInspect,
    onBuyItem,
    isPreviewActive,
    onPreviewActionBlocked,
    initialSearch = ''
}) => {
    // Browse Tab Filters State
    const [searchQuery, setSearchQuery] = useState(initialSearch || '');
    const [selectedTier, setSelectedTier] = useState('ALL');
    const [selectedQuality, setSelectedQuality] = useState('ALL');
    const [selectedClass, setSelectedClass] = useState('ALL');
    const [selectedSortOrder, setSelectedSortOrder] = useState('PRICE_ASC');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (initialSearch) {
            setSearchQuery(initialSearch);
            setSelectedCategory('ALL');
            setCurrentPage(1);
        }
    }, [initialSearch]);

    // Reset page on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedTier, selectedQuality, selectedClass, selectedSortOrder, selectedCategory]);

    const isOwnListing = (l) => {
        const sellerId = l.seller_character_id || l.item_data?.seller_character_id;
        if (sellerId && gameState?.id) {
            return String(sellerId) === String(gameState.id);
        }
        if (l.seller_name && gameState?.name && l.seller_id && gameState?.user_id) {
            return l.seller_name === gameState.name && l.seller_id === gameState.user_id;
        }
        return false;
    };

    // Filter Logic
    let activeBuyListings = marketListings.filter(l => l.status !== 'SOLD' && l.status !== 'EXPIRED');
    activeBuyListings = activeBuyListings.filter(l => {
        if (isOwnListing(l)) return false; 

        const currentItem = resolveItem(l.item_id);
        const itemName = (currentItem?.name || l.item_data?.name || formatItemId(l.item_id)).toLowerCase();
        const itemTier = currentItem?.tier || l.item_data?.tier;
        const itemQuality = currentItem?.quality ?? l.item_data?.quality ?? 0;

        // 1. Keyword search (Name/ID)
        if (searchQuery.trim() !== "") {
            const words = searchQuery.trim().toLowerCase().split(/\s+/);
            const itemId = l.item_id.toLowerCase();

            const matchesKeywords = words.every(word => {
                if (word.includes(':')) {
                    const [key, value] = word.split(':');
                    if (!value) return true;
                    if (key === 't' || key === 'tier') return itemTier === parseInt(value);
                    if (key === 'c' || key === 'cat' || key === 'type') return l.item_data?.type?.toLowerCase().includes(value);
                    if (key === 'r' || key === 'rarity') return (currentItem?.rarity || l.item_data?.rarity)?.toLowerCase().includes(value);
                    if (key === 'q' || key === 'quality') return itemQuality === parseInt(value);
                    if (key === 'id') return itemId.includes(value);
                    return true;
                }
                return itemName.includes(word) || itemId.includes(word) || `t${itemTier}` === word;
            });

            if (!matchesKeywords) return false;
        }

        // 2. Tier Filter
        if (selectedTier !== 'ALL' && itemTier !== parseInt(selectedTier)) return false;

        // 3. Quality Filter
        if (selectedQuality !== 'ALL' && itemQuality !== parseInt(selectedQuality)) return false;

        // 4. Category Filter
        if (selectedCategory !== 'ALL') {
             if (selectedCategory === 'EQUIPMENT') {
                if (!['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'OFF_HAND', 'GLOVES', 'CAPE'].includes(l.item_data?.type) && !l.item_data?.type?.startsWith('TOOL')) return false;
            } else if (selectedCategory === 'RESOURCE') {
                if (l.item_data?.type === 'RAW') return true;
                if (l.item_data?.type === 'RESOURCE') {
                    const isRefined = l.item_id.includes('_BAR') || l.item_id.includes('_PLANK') || l.item_id.includes('_LEATHER') || l.item_id.includes('_CLOTH') || l.item_id.includes('_EXTRACT');
                    if (isRefined) return false;
                    return true;
                }
                return false;
            } else if (selectedCategory === 'REFINED') {
                if (l.item_data?.type === 'REFINED') return true;
                if (l.item_data?.type === 'RESOURCE') {
                    const isRefined = l.item_id.includes('_BAR') || l.item_id.includes('_PLANK') || l.item_id.includes('_LEATHER') || l.item_id.includes('_CLOTH') || l.item_id.includes('_EXTRACT');
                    if (isRefined) return true;
                }
                return false;
            } else if (selectedCategory === 'CONSUMABLE') {
                if (!['FOOD', 'POTION'].includes(l.item_data?.type)) return false;
            } else if (selectedCategory === 'RUNES') {
                const itemId = l.item_id.toUpperCase();
                if (!itemId.includes('_RUNE_') && !itemId.includes('_SHARD')) return false;
            }
        }

        // 5. Class Filter
        if (selectedClass !== 'ALL') {
            const requiredClass = getRequiredProficiencyGroup(l.item_id);
            if (requiredClass !== selectedClass.toLowerCase()) return false;
        }

        return true;
    });

    // Handle Sorting by UNIT PRICE
    const getUnitPrice = (l) => {
        const nAmt = ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 1;
        return l.price / nAmt;
    };

    if (selectedSortOrder === 'PRICE_ASC') {
        activeBuyListings.sort((a, b) => getUnitPrice(a) - getUnitPrice(b));
    } else if (selectedSortOrder === 'PRICE_DESC') {
        activeBuyListings.sort((a, b) => getUnitPrice(b) - getUnitPrice(a));
    } else if (selectedSortOrder === 'NEWEST') {
        activeBuyListings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Pagination Logic
    const totalPages = Math.ceil(activeBuyListings.length / itemsPerPage);
    const paginatedListings = activeBuyListings.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', marginBottom: '5px' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', opacity: 0.7 }} />
                <input
                    placeholder="Search items..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '12px 12px 12px 48px',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem',
                        transition: '0.2s',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 2px var(--accent-soft)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
                />
            </div>

            {/* Advanced Filters Row */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
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
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(e.target.value)}
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
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
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
                    value={selectedSortOrder}
                    onChange={(e) => setSelectedSortOrder(e.target.value)}
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
                    <option value="PRICE_ASC">Price: Low to High</option>
                    <option value="PRICE_DESC">Price: High to Low</option>
                    <option value="NEWEST">Newest Listings</option>
                </select>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', width: '100%' }}>
                {[
                    { id: 'ALL', label: 'All Items', icon: <ShoppingBag size={14} /> },
                    { id: 'EQUIPMENT', label: 'Equipment', icon: <Shield size={14} /> },
                    { id: 'RESOURCE', label: 'Resources', icon: <Package size={14} /> },
                    { id: 'REFINED', label: 'Refined', icon: <Zap size={14} /> },
                    { id: 'CONSUMABLE', label: 'Consumables', icon: <Apple size={14} /> },
                    { id: 'RUNES', label: 'Runes', icon: <Gem size={14} /> }
                ].map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: selectedCategory === cat.id ? 'var(--accent)' : 'var(--border)',
                            whiteSpace: 'nowrap',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            background: selectedCategory === cat.id ? 'var(--accent-soft)' : 'var(--glass-bg)',
                            color: selectedCategory === cat.id ? 'var(--accent)' : 'var(--text-dim)'
                        }}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            <div className="scroll-container" style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
                {activeBuyListings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                        <ShoppingBag size={48} style={{ marginBottom: '15px', opacity: 0.3, margin: '0 auto' }} />
                        <p>No listings found matching your criteria.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                            {paginatedListings.map(l => (
                            <div key={`buy-${l.id}`} style={{
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
                                    width: '52px',
                                    height: '52px',
                                    background: 'var(--slot-bg)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${resolveItem(l.item_id)?.rarityColor || l.item_data.rarityColor || 'var(--border)'}`,
                                    flexShrink: 0,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.4)'
                                }}>
                                    {(() => {
                                        const resolved = resolveItem(l.item_id, l.item_data?.quality);
                                        const icon = resolved?.icon || l.item_data?.icon;
                                        // Force .webp extension for icons
                                        const normalizedIcon = typeof icon === 'string' ? icon.replace(/\.(png|jpg|jpeg)$/, '.webp') : icon;
                                        
                                        return normalizedIcon ? (
                                            <img
                                                src={normalizedIcon}
                                                alt={l.item_data.name}
                                                style={{ width: '130%', height: '130%', objectFit: 'contain' }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#666' }}>T{l.item_data.tier}</span>
                                        );
                                    })()}
                                    <div style={{ position: 'absolute', top: 3, left: 3, fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '1px 1px 2px rgba(0,0,0,0.8)', zIndex: 1 }}>
                                        T{l.item_data.tier}
                                    </div>
                                    {/* Rune Stars */}
                                    {(l.item_data.stars > 0) && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '2px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            display: 'flex',
                                            gap: '0px',
                                            background: 'rgba(0,0,0,0.6)',
                                            padding: '1px 3px',
                                            borderRadius: '4px',
                                            whiteSpace: 'nowrap',
                                            border: '1px solid rgba(255,215,0,0.3)',
                                            zIndex: 2
                                        }}>
                                            {Array.from({ length: l.item_data.stars }).map((_, i) => (
                                                <Star key={`buy-star-${l.id || 'any'}-${i}`} size={8} fill="#FFD700" color="#FFD700" />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ flex: '2 1 0%', minWidth: '150px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span>{resolveItem(l.item_id)?.name || l.item_data.name}</span>
                                        <button 
                                            onClick={() => onShowInfo && onShowInfo(l.item_data)} 
                                            style={{ background: 'none', border: 'none', padding: '0', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', hover: { color: 'var(--accent)' } }}
                                        >
                                            <Info size={14} />
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', gap: '15px' }}>
                                        <span 
                                            onClick={() => onInspect && onInspect(l.seller_name)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: onInspect ? 'pointer' : 'default', color: onInspect ? 'var(--accent)' : 'inherit', fontWeight: '500' }}
                                        >
                                            <User size={12} /> {l.seller_name}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} /> {new Date(l.created_at).toLocaleDateString()}
                                        </span>
                                        {l.item_data.craftedBy && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', opacity: 0.9 }}>
                                                <Hammer size={12} /> {l.item_data.craftedBy}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 0%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: '500' }}>
                                        {((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 0} units
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        <Coins size={18} /> {
                                            (() => {
                                                const nAmt = ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 1;
                                                const unitPrice = l.price / nAmt;
                                                return unitPrice < 1 ? unitPrice.toFixed(2) : formatSilver(unitPrice);
                                            })()
                                        }
                                    </div>
                                </div>

                                <div style={{ marginLeft: '15px' }}>
                                    <button
                                        onClick={() => {
                                            if (isPreviewActive) return onPreviewActionBlocked();
                                            onBuyItem(l);
                                        }}
                                        disabled={silver < (l.price / ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount || 1))}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: silver < (l.price / ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount || 1)) ? 'not-allowed' : 'pointer',
                                            background: silver < (() => {
                                                const nAmt = ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 1;
                                                return l.price / nAmt;
                                            })() ? 'var(--accent-soft)' : 'rgba(76, 175, 80, 0.1)',
                                            color: silver < (() => {
                                                const nAmt = ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 1;
                                                return l.price / nAmt;
                                            })() ? 'var(--text-dim)' : '#4caf50',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem',
                                            minWidth: '110px',
                                            border: `1px solid ${silver < (() => {
                                                const nAmt = ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 1;
                                                return l.price / nAmt;
                                            })() ? 'transparent' : 'rgba(76, 175, 80, 0.2)'}`,
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (silver >= (l.price / ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount || 1))) {
                                                e.target.style.background = 'rgba(76, 175, 80, 0.2)';
                                                e.target.style.transform = 'translateY(-1px)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (silver >= (l.price / ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount || 1))) {
                                                e.target.style.background = 'rgba(76, 175, 80, 0.1)';
                                                e.target.style.transform = 'translateY(0)';
                                            }
                                        }}
                                    >
                                        {silver < (() => {
                                            const nAmt = ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 1;
                                            return l.price / nAmt;
                                        })() ? 'No Funds' : 'BUY'}
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

export default MarketBrowseTab;
