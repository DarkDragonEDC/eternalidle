import React, { useState, useEffect } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import {
    Tag, ShoppingBag, Package, Search,
    Coins, ArrowRight, User, Info, Trash2,
    Shield, Zap, Apple, Box, Clock, Check, AlertTriangle, X, Star, Hammer, Lock, History, TrendingUp, TrendingDown,
    Gavel
} from 'lucide-react';
import { resolveItem, getTierColor, formatItemId, getRequiredProficiencyGroup, calculateItemSellPrice } from '@shared/items';

const MarketBuyOrdersTab = ({
    socket,
    gameState,
    buyOrders,
    isMobile,
    onInspect,
    isPreviewActive,
    onPreviewActionBlocked,
    setConfirmModal,
    fillOrderModal,
    setFillOrderModal,
    fillQuantity,
    setFillQuantity,
    setCreateBuyOrderModal,
    setItemSuggestions,
    setLowestSellPrice,
    searchableItems,
    itemSuggestions,
    createBuyOrderModal
}) => {
    const [buyOrdersSubTab, setBuyOrdersSubTab] = useState('BROWSE'); // BROWSE, MY_ORDERS
    const [buyOrdersSearchQuery, setBuyOrdersSearchQuery] = useState('');
    const [buyOrdersSelectedTier, setBuyOrdersSelectedTier] = useState('ALL');
    const [buyOrdersSelectedQuality, setBuyOrdersSelectedQuality] = useState('ALL');
    const [buyOrdersSelectedClass, setBuyOrdersSelectedClass] = useState('ALL');
    const [buyOrdersSelectedCategory, setBuyOrdersSelectedCategory] = useState('ALL');
    const [buyOrdersSelectedSortOrder, setBuyOrdersSelectedSortOrder] = useState('NEWEST');
    const [buyOrdersFilterInventory, setBuyOrdersFilterInventory] = useState(false);

    const isMyOrder = (o) => {
        if (!o || !gameState) return false;
        return String(o.buyer_character_id) === String(gameState.id) ||
            (o.buyer_name && gameState.name && o.buyer_name.toLowerCase() === gameState.name.toLowerCase());
    };

    const myOrders = buyOrders.filter(o => isMyOrder(o));
    const inventory = gameState?.state?.inventory || {};
    const otherOrders = buyOrders.filter(o => !isMyOrder(o)).filter(order => {
        const itemInfo = resolveItem(order.item_id);
        if (!itemInfo) return false;

        const itemName = itemInfo.name.toLowerCase();
        const itemId = order.item_id.toLowerCase();
        const itemTier = itemInfo.tier;
        const itemQuality = itemInfo.quality || 0;

        // 0. Inventory Filter
        if (buyOrdersFilterInventory) {
            let hasItem = false;
            const orderId = order.item_id;

            const qMatch = orderId.match(/^(.+?)_Q(\d)$/);
            const sMatch = orderId.match(/^(.+?)_(\d)STAR$/);
            const orderBaseId = qMatch ? qMatch[1] : (sMatch ? sMatch[1] : orderId);
            const orderQuality = qMatch ? parseInt(qMatch[2]) : null;
            const orderStars = sMatch ? parseInt(sMatch[2]) : null;

            for (const [key, entry] of Object.entries(inventory)) {
                const keyBase = key.split('::')[0];
                const qty = typeof entry === 'object' ? (entry?.amount || 0) : (Number(entry) || 0);
                if (qty <= 0) continue;

                if (keyBase === orderId || key === orderId) {
                    hasItem = true;
                    break;
                }

                if (orderQuality !== null && keyBase === orderBaseId && typeof entry === 'object') {
                    const entryQuality = entry.quality !== undefined ? entry.quality : 0;
                    if (entryQuality === orderQuality) {
                        hasItem = true;
                        break;
                    }
                }

                if (orderStars !== null && keyBase === orderBaseId && typeof entry === 'object') {
                    const entryStars = entry.stars !== undefined ? entry.stars : 0;
                    if (entryStars === orderStars) {
                        hasItem = true;
                        break;
                    }
                }
            }

            if (!hasItem) return false;
        }

        // 1. Keyword Search
        if (buyOrdersSearchQuery.trim() !== "") {
            const words = buyOrdersSearchQuery.trim().toLowerCase().split(/\s+/);
            const matchesKeywords = words.every(word => {
                if (word.includes(':')) {
                    const [key, value] = word.split(':');
                    if (!value) return true;
                    if (key === 't' || key === 'tier') return itemTier === parseInt(value);
                    if (key === 'c' || key === 'cat' || key === 'type') return itemInfo.category?.toLowerCase().includes(value.toLowerCase()) || itemInfo.type?.toLowerCase().includes(value.toLowerCase());
                    if (key === 'r' || key === 'rarity') return itemInfo.rarity?.toLowerCase().includes(value.toLowerCase());
                    if (key === 'q' || key === 'quality') return itemQuality === parseInt(value);
                    if (key === 'id') return itemId.includes(value);
                    return true;
                }
                return itemName.includes(word) || itemId.includes(word) || `t${itemTier}` === word;
            });
            if (!matchesKeywords) return false;
        }

        // 2. Tier Filter
        if (buyOrdersSelectedTier !== 'ALL' && itemTier !== parseInt(buyOrdersSelectedTier)) return false;

        // 3. Quality Filter
        if (buyOrdersSelectedQuality !== 'ALL' && itemQuality !== parseInt(buyOrdersSelectedQuality)) return false;

        // 4. Category Filter
        if (buyOrdersSelectedCategory !== 'ALL') {
            const type = itemInfo.type || '';
            const cat = itemInfo.category || '';
            if (buyOrdersSelectedCategory === 'EQUIPMENT') {
                if (!['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'OFF_HAND', 'GLOVES', 'CAPE'].includes(type) && !type?.startsWith('TOOL')) return false;
            } else if (buyOrdersSelectedCategory === 'RESOURCE') {
                if (type !== 'RAW' && type !== 'RESOURCE' && cat !== 'RESOURCE') return false;
                const isRefined = itemId.includes('_bar') || itemId.includes('_plank') || itemId.includes('_leather') || itemId.includes('_cloth') || itemId.includes('_extract');
                if (isRefined) return false;
            } else if (buyOrdersSelectedCategory === 'REFINED') {
                if (type !== 'REFINED' && cat !== 'REFINED') {
                    const isRefined = itemId.includes('_bar') || itemId.includes('_plank') || itemId.includes('_leather') || itemId.includes('_cloth') || itemId.includes('_extract');
                    if (!isRefined) return false;
                }
            } else if (buyOrdersSelectedCategory === 'CONSUMABLE') {
                if (!['FOOD', 'POTION'].includes(type) && !['FOOD', 'POTION'].includes(cat)) return false;
            }
        }

        // 5. Class Filter
        if (buyOrdersSelectedClass !== 'ALL') {
            const requiredClass = getRequiredProficiencyGroup(order.item_id);
            if (requiredClass !== buyOrdersSelectedClass.toLowerCase()) return false;
        }

        return true;
    });

    // Sorting
    otherOrders.sort((a, b) => {
        if (buyOrdersSelectedSortOrder === 'PRICE_ASC') return a.price_per_unit - b.price_per_unit;
        if (buyOrdersSelectedSortOrder === 'PRICE_DESC') return b.price_per_unit - a.price_per_unit;
        if (buyOrdersSelectedSortOrder === 'NEWEST') return new Date(b.created_at) - new Date(a.created_at);
        return 0;
    });

    const onCreateBuyOrder = () => {
        if (isPreviewActive) return onPreviewActionBlocked();
        setCreateBuyOrderModal({
            itemId: '',
            amount: 1,
            pricePerUnit: 1,
            searchText: '',
            quality: 0,
            stars: 1,
            canHaveQuality: false,
            canHaveStars: false
        });
        setItemSuggestions([]);
        setLowestSellPrice(null);
    };

    const renderBuyOrderRow = (order, isOwn = false) => {
        const itemInfo = resolveItem(order.item_id);
        const remaining = order.amount - order.filled;
        const tierColor = getTierColor(itemInfo?.tier || 1);

        return (
            <div key={`bo-${order.id}`} style={{
                background: 'var(--glass-bg)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                border: '1px solid var(--border)',
                transition: '0.2s',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                {/* ITEM ICON */}
                <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'var(--slot-bg)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${itemInfo?.rarityColor || tierColor || 'var(--border)'}`,
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                }}>
                    {(() => {
                        const icon = itemInfo?.icon || 'unknown.png';
                        // Force .webp extension for icons
                        const normalizedIcon = typeof icon === 'string' ? icon.replace(/\.(png|jpg|jpeg)$/, '.webp') : icon;
                        const iconPath = normalizedIcon?.startsWith('/') ? normalizedIcon : `/items/${normalizedIcon || 'unknown.webp'}`;
                        
                        return <img src={iconPath} alt="" style={{ width: '130%', height: '130%', objectFit: 'contain' }} />;
                    })()}
                    <div style={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        T{itemInfo?.tier}
                    </div>
                    {/* Rune Stars */}
                    {itemInfo?.stars > 0 && (
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
                            {Array.from({ length: itemInfo.stars }).map((_, i) => (
                                <Star key={`bo-star-${order.id || 'any'}-${i}`} size={7} fill="#FFD700" color="#FFD700" />
                            ))}
                        </div>
                    )}
                </div>

                {/* DETAILS */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-main)' }}>
                            {itemInfo?.qualityName && itemInfo?.qualityName !== 'Normal' ? `${itemInfo.qualityName} ` : ''}
                            {itemInfo?.name}
                        </span>
                        <button 
                            onClick={() => socket.emit('get_item_info', { itemId: order.item_id })} 
                            style={{ background: 'none', border: 'none', padding: '0', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}
                        >
                            <Info size={14} />
                        </button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span>Qty: <b style={{ color: 'var(--text-main)' }}>{order.amount}</b></span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            Progress: <b style={{ color: '#4caf50' }}>{order.filled}</b> / {order.amount}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} /> <span 
                            onClick={() => onInspect && onInspect(order.buyer_name)}
                            style={{ color: 'var(--accent)', cursor: onInspect ? 'pointer' : 'default', fontWeight: '500' }}
                        >{order.buyer_name}</span>
                    </div>
                </div>

                {/* PRICE */}
                <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: '140px', display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: '500' }}>Price per unit</div>
                    <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Coins size={18} /> {formatNumber(order.price_per_unit)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Total: {formatNumber(remaining * order.price_per_unit)} Silver
                    </div>
                </div>

                {/* ACTION */}
                <div style={{ marginLeft: isMobile ? '0' : '15px', width: isMobile ? '100%' : 'auto' }}>
                    {isOwn ? (
                        <button
                            onClick={() => {
                                const fee = (Date.now() - new Date(order.created_at).getTime()) < (3600 * 1000) ? Math.floor(remaining * order.price_per_unit * 0.10) : 0;
                                setConfirmModal({
                                    message: `Cancel this Buy Order?`,
                                    subtext: `The remaining ${remaining}x items will be cancelled. ${fee > 0 ? `A 10% cancellation fee (${formatNumber(fee)} Silver) applies as the order is less than 1h old.` : 'No cancellation fee applies.'}`,
                                    onConfirm: () => socket.emit('cancel_buy_order', { orderId: order.id })
                                });
                            }}
                            style={{
                                width: isMobile ? '100%' : 'auto',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                background: 'rgba(255, 68, 68, 0.1)',
                                color: '#ff4444',
                                border: '1px solid rgba(255, 68, 68, 0.2)',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.target.style.background = 'rgba(255, 68, 68, 0.2)'; }}
                            onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 68, 68, 0.1)'; }}
                        >
                            <Trash2 size={16} /> CANCEL
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                if (isPreviewActive) return onPreviewActionBlocked();
                                setFillOrderModal(order);
                                setFillQuantity(1);
                            }}
                            style={{
                                width: isMobile ? '100%' : '110px',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                background: 'var(--accent)',
                                color: '#000',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.filter = 'brightness(1.1)'; }}
                            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.filter = 'brightness(1)'; }}
                        >
                            FILL
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: 'var(--glass-bg)', borderRadius: '10px', padding: '3px' }}>
                    <button
                        onClick={() => setBuyOrdersSubTab('BROWSE')}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            background: buyOrdersSubTab === 'BROWSE' ? 'var(--accent-soft)' : 'transparent',
                            color: buyOrdersSubTab === 'BROWSE' ? 'var(--accent)' : 'var(--text-dim)',
                            transition: '0.2s'
                        }}>
                        Browse Orders
                    </button>
                    <button
                        onClick={() => setBuyOrdersSubTab('MY_ORDERS')}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            background: buyOrdersSubTab === 'MY_ORDERS' ? 'var(--accent-soft)' : 'transparent',
                            color: buyOrdersSubTab === 'MY_ORDERS' ? 'var(--accent)' : 'var(--text-dim)',
                            transition: '0.2s'
                        }}>
                        My Buy Orders
                    </button>
                </div>

                <button
                    onClick={onCreateBuyOrder}
                    style={{
                        marginLeft: isMobile ? '0' : 'auto',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: '1px solid var(--accent)',
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: '0.2s'
                    }}>
                    <Gavel size={18} /> CREATE BUY ORDER
                </button>
            </div>

            {/* BROWSE ORDERS FILTERS */}
            {buyOrdersSubTab === 'BROWSE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            placeholder="Search items..."
                            type="text"
                            value={buyOrdersSearchQuery}
                            onChange={(e) => setBuyOrdersSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'var(--slot-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '10px 10px 10px 40px',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    {/* Advanced Filters Row */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <select
                            value={buyOrdersSelectedTier}
                            onChange={(e) => setBuyOrdersSelectedTier(e.target.value)}
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
                            value={buyOrdersSelectedQuality}
                            onChange={(e) => setBuyOrdersSelectedQuality(e.target.value)}
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
                            value={buyOrdersSelectedClass}
                            onChange={(e) => setBuyOrdersSelectedClass(e.target.value)}
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
                            value={buyOrdersSelectedSortOrder}
                            onChange={(e) => setBuyOrdersSelectedSortOrder(e.target.value)}
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
                            <option value="PRICE_DESC">Price: High to Low</option>
                            <option value="PRICE_ASC">Price: Low to High</option>
                            <option value="NEWEST">Newest Orders</option>
                        </select>
                    </div>

                    {/* Filter Buttons */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', width: '100%', alignItems: 'center' }}>
                        {/* My Inventory Toggle */}

                        {/* All Items button */}
                        <button
                            onClick={() => setBuyOrdersSelectedCategory('ALL')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px',
                                border: '1px solid', borderColor: buyOrdersSelectedCategory === 'ALL' ? 'var(--accent)' : 'var(--border)',
                                whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
                                background: buyOrdersSelectedCategory === 'ALL' ? 'var(--accent-soft)' : 'var(--glass-bg)',
                                color: buyOrdersSelectedCategory === 'ALL' ? 'var(--accent)' : 'var(--text-dim)'
                            }}
                        >
                            <ShoppingBag size={14} /> All Items
                        </button>

                        {/* Inventory Filter Toggle */}
                        <button
                            onClick={() => setBuyOrdersFilterInventory(prev => !prev)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px',
                                border: '1px solid', borderColor: buyOrdersFilterInventory ? '#4caf50' : 'var(--border)',
                                whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
                                background: buyOrdersFilterInventory ? 'rgba(76, 175, 80, 0.15)' : 'var(--glass-bg)',
                                color: buyOrdersFilterInventory ? '#4caf50' : 'var(--text-dim)',
                                transition: '0.2s'
                            }}
                        >
                            <Package size={14} /> My Inventory
                        </button>

                        {[
                            { id: 'EQUIPMENT', label: 'Equipment', icon: <Shield size={14} /> },
                            { id: 'RESOURCE', label: 'Resources', icon: <Package size={14} /> },
                            { id: 'REFINED', label: 'Refined', icon: <Zap size={14} /> },
                            { id: 'CONSUMABLE', label: 'Consumables', icon: <Apple size={14} /> }
                        ].map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setBuyOrdersSelectedCategory(cat.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: buyOrdersSelectedCategory === cat.id ? 'var(--accent)' : 'var(--border)',
                                    whiteSpace: 'nowrap',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    background: buyOrdersSelectedCategory === cat.id ? 'var(--accent-soft)' : 'var(--glass-bg)',
                                    color: buyOrdersSelectedCategory === cat.id ? 'var(--accent)' : 'var(--text-dim)'
                                }}
                            >
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="scroll-container" style={{ flex: 1, paddingRight: '5px' }}>
                {buyOrdersSubTab === 'BROWSE' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {otherOrders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px dashed var(--border)' }}>
                                <Box size={40} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                <p>No active buy orders found.</p>
                            </div>
                        ) : (
                            otherOrders.map(order => renderBuyOrderRow(order))
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {myOrders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px dashed var(--border)' }}>
                                <ShoppingBag size={40} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                <p>You have no active buy orders.</p>
                            </div>
                        ) : (
                            myOrders.map(order => renderBuyOrderRow(order, true))
                        )}
                    </div>
                )}
            </div>

            {/* CREATE BUY ORDER MODAL */}
            {createBuyOrderModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, backdropFilter: 'blur(5px)' }} onClick={(e) => { if (e.target === e.currentTarget) setCreateBuyOrderModal(null); }}>
                    <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', width: '90%', maxWidth: '440px', boxShadow: 'var(--panel-shadow)', position: 'relative' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '900', letterSpacing: '1px' }}><Gavel size={20} /> CREATE BUY ORDER</h3>
                            <button onClick={() => setCreateBuyOrderModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', display: 'flex' }}><X size={20} /></button>
                        </div>

                        {/* Item field */}
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: '500' }}>Item</label>
                            
                            {/* Selected Item Card */}
                            {createBuyOrderModal.itemId ? (() => {
                                const selectedItem = resolveItem(createBuyOrderModal.itemId);
                                const icon = selectedItem?.icon || '';
                                const normalizedIcon = typeof icon === 'string' ? icon.replace(/\.(png|jpg|jpeg)$/, '.webp') : icon;
                                const tierColor = getTierColor(selectedItem?.tier || 1);
                                return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
                                        <div style={{ width: '38px', height: '38px', background: 'var(--slot-bg)', borderRadius: '6px', border: `1px solid ${selectedItem?.rarityColor || tierColor || 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                            {normalizedIcon && <img src={normalizedIcon} alt="" style={{ width: '130%', height: '130%', objectFit: 'contain' }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#4caf50' }}>{selectedItem?.name || createBuyOrderModal.searchText}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '1px' }}>Tier {selectedItem?.tier || '?'} • {selectedItem?.type?.replace(/_/g, ' ') || 'Item'}</div>
                                        </div>
                                        <button onClick={() => setCreateBuyOrderModal(prev => ({ ...prev, itemId: '', searchText: '', canHaveQuality: false, canHaveStars: false, pricePerUnit: 1 }))} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '5px', borderRadius: '50%', display: 'flex', flexShrink: 0 }}><X size={14} /></button>
                                    </div>
                                );
                            })() : (
                                /* Search Input */
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="Enter item name."
                                        value={createBuyOrderModal.searchText}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCreateBuyOrderModal(prev => ({ ...prev, searchText: val, itemId: '' }));
                                            if (val.length >= 2) {
                                                const search = val.toLowerCase();
                                                const words = search.trim().split(/\s+/);
                                                const filters = { tier: null, type: null, rarity: null, id: null, terms: [] };
                                                
                                                words.forEach(word => {
                                                    if (word.includes(':')) {
                                                        const [key, value] = word.split(':');
                                                        if (!value) return;
                                                        if (key === 't' || key === 'tier') filters.tier = parseInt(value);
                                                        else if (key === 'c' || key === 'cat' || key === 'type') filters.type = value;
                                                        else if (key === 'r' || key === 'rarity') filters.rarity = value;
                                                        else if (key === 'id') filters.id = value;
                                                    } else filters.terms.push(word);
                                                });

                                                const suggestions = searchableItems.filter(item => {
                                                    if (filters.tier && item.tier !== filters.tier) return false;
                                                    if (filters.type && !item.type?.includes(filters.type)) return false;
                                                    if (filters.rarity && !item.rarity?.includes(filters.rarity)) return false;
                                                    if (filters.id && !item.id.toLowerCase().includes(filters.id)) return false;
                                                    
                                                    if (filters.terms.length > 0) {
                                                        return filters.terms.every(term => {
                                                            const t = term.toLowerCase();
                                                            if (t === 'hunter' && item.class === 'hunter') return true;
                                                            if (t === 'warrior' && item.class === 'warrior') return true;
                                                            if ((t === 'mage' || t === 'game') && item.class === 'mage') return true;
                                                            if (t === 'armor' && item.isArmor) return true;
                                                            return item.name.toLowerCase().includes(t) || item.id.toLowerCase().includes(t) || (`t${item.tier}` === t);
                                                        });
                                                    }
                                                    return true;
                                                });
                                                setItemSuggestions(suggestions.slice(0, 10));
                                            } else {
                                                setItemSuggestions([]);
                                            }
                                        }}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '11px 14px', color: 'var(--text-main)', fontSize: '0.9rem' }}
                                    />
                                    {/* Suggestions list */}
                                    {itemSuggestions.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '10px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 100, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)' }}>
                                            {itemSuggestions.map(item => (
                                                <div
                                                    key={`sug-${item.id}`}
                                                    onClick={() => {
                                                        const resolved = resolveItem(item.id);
                                                        const autoPrice = calculateItemSellPrice(resolved || item, item.id) || 1;
                                                        setCreateBuyOrderModal(prev => ({ ...prev, itemId: item.id, searchText: item.name, canHaveQuality: item.canHaveQuality, canHaveStars: item.canHaveStars, pricePerUnit: autoPrice }));
                                                        setItemSuggestions([]);
                                                    }}
                                                    style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: '0.15s' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-soft)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                                >
                                                    <div style={{ width: '30px', height: '30px', background: 'var(--slot-bg)', borderRadius: '5px', border: `1px solid ${item.rarityColor || 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                        <img src={item.icon?.replace(/\.(png|jpg|jpeg)$/, '.webp')} alt="" style={{ width: '130%', height: '130%', objectFit: 'contain' }} />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{item.name}</span>
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Tier {item.tier}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Quality / Stars (conditional) */}
                        {createBuyOrderModal.itemId && (createBuyOrderModal.canHaveQuality || createBuyOrderModal.canHaveStars) && (
                            <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                                {createBuyOrderModal.canHaveQuality && (
                                    <div>
                                        <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: '500' }}>Select Quality</label>
                                        <select
                                            value={createBuyOrderModal.quality}
                                            onChange={(e) => {
                                                const newQuality = parseInt(e.target.value);
                                                const qualitySuffix = newQuality > 0 ? `_Q${newQuality}` : '';
                                                const fullItemId = createBuyOrderModal.itemId.replace(/_Q\d$/, '') + qualitySuffix;
                                                const resolved = resolveItem(fullItemId);
                                                const autoPrice = calculateItemSellPrice(resolved || resolveItem(createBuyOrderModal.itemId), fullItemId) || 1;
                                                setCreateBuyOrderModal(prev => ({ ...prev, quality: newQuality, pricePerUnit: autoPrice }));
                                            }}
                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: ['#fff', '#4caf50', '#4a90e2', '#9013fe', '#f5a623'][createBuyOrderModal.quality] || 'var(--text-main)', fontSize: '0.9rem', fontWeight: 'bold' }}
                                        >
                                            <option value="0" style={{ color: '#fff', background: '#1a1a2e' }}>Normal</option>
                                            <option value="1" style={{ color: '#4caf50', background: '#1a1a2e' }}>Good</option>
                                            <option value="2" style={{ color: '#4a90e2', background: '#1a1a2e' }}>Outstanding</option>
                                            <option value="3" style={{ color: '#9013fe', background: '#1a1a2e' }}>Excellent</option>
                                            <option value="4" style={{ color: '#f5a623', background: '#1a1a2e' }}>Masterpiece</option>
                                        </select>
                                    </div>
                                )}
                                {createBuyOrderModal.canHaveStars && (
                                    <div style={{ marginTop: createBuyOrderModal.canHaveQuality ? '10px' : '0' }}>
                                        <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: '500' }}>Select Stars</label>
                                        <select
                                            value={createBuyOrderModal.stars}
                                            onChange={(e) => setCreateBuyOrderModal(prev => ({ ...prev, stars: parseInt(e.target.value) }))}
                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-main)', fontSize: '0.9rem' }}
                                        >
                                            {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>{s} Stars</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quantity + Price per Unit */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: '500' }}>Quantity</label>
                                <input
                                    type="number" min="1" max="999"
                                    value={createBuyOrderModal.amount}
                                    onChange={(e) => setCreateBuyOrderModal(prev => ({ ...prev, amount: Math.max(1, parseInt(e.target.value) || 0) }))}
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-main)', fontSize: '0.9rem' }}
                                />
                            </div>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: '500' }}>Price per Unit</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number" min="1"
                                        value={createBuyOrderModal.pricePerUnit}
                                        onChange={(e) => setCreateBuyOrderModal(prev => ({ ...prev, pricePerUnit: Math.max(1, parseInt(e.target.value) || 0) }))}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', paddingRight: '36px', color: 'var(--text-main)', fontSize: '0.9rem' }}
                                    />
                                    <Coins size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', opacity: 0.6 }} />
                                </div>
                            </div>
                        </div>

                        {/* Total Escrow */}
                        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px 14px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '600' }}>Total Escrow:</span>
                                <span style={{ fontWeight: 'bold', color: 'var(--accent)', fontSize: '1rem' }}>{formatNumber(createBuyOrderModal.amount * createBuyOrderModal.pricePerUnit)} Silver</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <Info size={13} style={{ color: 'var(--text-dim)', flexShrink: 0, marginTop: '1px' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                                    This silver will be locked in escrow. If the order is filled, the items will appear in your Claims tab. 20% tax applies to the seller.
                                </span>
                            </div>
                        </div>
                        
                        {/* POST BUY ORDER button */}
                        <button
                            onClick={() => {
                                socket.emit('create_buy_order', {
                                    itemId: createBuyOrderModal.itemId,
                                    amount: createBuyOrderModal.amount,
                                    pricePerUnit: createBuyOrderModal.pricePerUnit,
                                    quality: createBuyOrderModal.quality,
                                    stars: createBuyOrderModal.stars
                                });
                            }}
                            disabled={!createBuyOrderModal.itemId}
                            style={{
                                width: '100%',
                                padding: '13px',
                                borderRadius: '10px',
                                border: 'none',
                                background: !createBuyOrderModal.itemId ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
                                color: !createBuyOrderModal.itemId ? 'var(--text-dim)' : '#000',
                                fontWeight: '900',
                                cursor: !createBuyOrderModal.itemId ? 'not-allowed' : 'pointer',
                                fontSize: '0.95rem',
                                letterSpacing: '1px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { if (createBuyOrderModal.itemId) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
                        >
                            POST BUY ORDER
                        </button>
                    </div>
                </div>
            )}

            {/* FILL BUY ORDER MODAL */}
            {typeof fillOrderModal === 'object' && fillOrderModal !== null && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, backdropFilter: 'blur(5px)' }} onClick={(e) => { if (e.target === e.currentTarget) setFillOrderModal(null); }}>
                    <div style={{ background: 'rgb(26, 26, 26)', border: '1px solid var(--border)', borderRadius: '15px', padding: '30px', width: '95%', maxWidth: '450px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fff', fontWeight: '900' }}>Fill Buy Order</h3>
                            <button onClick={() => setFillOrderModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', display: 'flex' }}><X size={24} /></button>
                        </div>

                        {(() => {
                            const orderItem = resolveItem(fillOrderModal.item_id);
                            const tierColor = getTierColor(orderItem?.tier || 1);
                            const remaining = fillOrderModal.amount - fillOrderModal.filled;
                            const owned = Object.entries(inventory).reduce((acc, [key, val]) => {
                                const keyBase = key.split('::')[0];
                                if (keyBase === fillOrderModal.item_id) {
                                    return acc + (typeof val === 'object' ? (val.amount || 0) : (Number(val) || 0));
                                }
                                return acc;
                            }, 0);
                            const maxFill = Math.min(owned, remaining);
                            const grossSilver = fillQuantity * fillOrderModal.price_per_unit;
                            const tax = Math.floor(grossSilver * 0.2);
                            const profit = grossSilver - tax;
                            const normalizedIcon = orderItem?.icon?.replace(/\.(png|jpg|jpeg)$/, '.webp');

                            return (
                                <>
                                    {/* Item Card */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255, 255, 255, 0.02)', padding: '15px', borderRadius: '10px', marginBottom: '25px' }}>
                                        <img src={normalizedIcon} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{orderItem?.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Buyer: {fillOrderModal.buyer_name}</div>
                                        </div>
                                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                            <div style={{ color: 'rgb(255, 215, 0)', fontWeight: 'bold' }}>{formatNumber(fillOrderModal.price_per_unit)} <Coins size={14} /></div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>per unit</div>
                                        </div>
                                    </div>

                                    {/* Quantity to Sell */}
                                    <div style={{ marginBottom: '25px' }}>
                                        <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '10px' }}>Quantity to Sell</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button onClick={() => setFillQuantity(prev => Math.max(1, prev - 1))} style={{ width: '36px', minWidth: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                                            <input
                                                type="number"
                                                value={fillQuantity}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 1;
                                                    setFillQuantity(Math.max(1, Math.min(val, maxFill)));
                                                }}
                                                style={{ flex: 1, minWidth: 0, background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', color: '#fff', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}
                                            />
                                            <button onClick={() => setFillQuantity(prev => Math.min(prev + 1, maxFill))} style={{ width: '36px', minWidth: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                                            <span>Max needed: {remaining}</span>
                                            <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setFillQuantity(maxFill)}>USE MAX INVENTORY</span>
                                        </div>
                                    </div>

                                    {/* Gross / Tax / Profit Breakdown */}
                                    <div style={{ background: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: '12px', padding: '20px', marginBottom: '25px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem' }}>
                                            <span style={{ color: 'var(--text-dim)' }}>Gross Silver:</span>
                                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{formatNumber(grossSilver)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem' }}>
                                            <span style={{ color: 'var(--text-dim)' }}>Market Tax (20%):</span>
                                            <span style={{ color: 'rgb(255, 107, 107)' }}>-{formatNumber(tax)}</span>
                                        </div>
                                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            <span style={{ color: 'var(--text-main)' }}>Your Profit:</span>
                                            <span style={{ color: 'rgb(76, 175, 80)' }}>{formatNumber(profit)} Silver</span>
                                        </div>
                                    </div>

                                    {/* CONFIRM FILL button */}
                                    <button
                                        onClick={() => {
                                            if (owned < fillQuantity) return;
                                            socket.emit('fill_buy_order', { orderId: fillOrderModal.id, quantity: fillQuantity });
                                            setFillOrderModal(null);
                                        }}
                                        disabled={owned < fillQuantity || fillQuantity <= 0}
                                        style={{
                                            width: '100%',
                                            padding: '15px',
                                            borderRadius: '10px',
                                            background: (owned < fillQuantity || fillQuantity <= 0) ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
                                            color: (owned < fillQuantity || fillQuantity <= 0) ? 'var(--text-dim)' : '#000',
                                            border: 'none',
                                            cursor: (owned < fillQuantity || fillQuantity <= 0) ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '1.1rem'
                                        }}
                                    >
                                        CONFIRM FILL
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketBuyOrdersTab;
