import React, { useState, useEffect } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import {
    Tag, ShoppingBag, Package, Search,
    Coins, ArrowRight, User, Info, Trash2,
    Shield, Zap, Apple, Box, Clock, Check, AlertTriangle, X, Star, Hammer, Lock
} from 'lucide-react';
import { resolveItem, getTierColor, formatItemId } from '@shared/items';

const MarketPanel = ({ socket, gameState, silver = 0, onShowInfo, onListOnMarket, isMobile, initialSearch = '', isAnonymous }) => {
    const [activeTab, setActiveTab] = useState('BUY'); // BUY, SELL, LISTINGS, CLAIM
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState(initialSearch || '');
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [selectedListing, setSelectedListing] = useState(null); // For buying
    const [buyModal, setBuyModal] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [marketListings, setMarketListings] = useState([]);
    const [notification, setNotification] = useState(null);
    const [selectedTier, setSelectedTier] = useState('ALL');
    const [selectedQuality, setSelectedQuality] = useState('ALL');
    const [selectedSortOrder, setSelectedSortOrder] = useState('NEWEST');
    const [sellSearchQuery, setSellSearchQuery] = useState('');


    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        // Fetch listings on mount
        socket.emit('get_market_listings');

        const handleUpdate = (newListings) => {
            setMarketListings(newListings || []);
        };

        const handleSuccess = (result) => {
            setNotification({ type: 'success', message: result.message || 'Action completed successfully!' });
            socket.emit('get_market_listings');
            setConfirmModal(null);
            setBuyModal(null);
        };

        const handleError = (err) => {
            setNotification({ type: 'error', message: err.message || 'An error occurred.' });
        };

        socket.on('market_listings_update', handleUpdate);
        socket.on('market_action_success', handleSuccess);
        socket.on('error', handleError);

        return () => {
            socket.off('market_listings_update', handleUpdate);
            socket.off('market_action_success', handleSuccess);
            socket.off('error', handleError);
        };
    }, [socket]);

    useEffect(() => {
        if (initialSearch) {
            setSearchQuery(initialSearch);
            setSelectedCategory('ALL'); // Reset category to ensure item is found
        }
    }, [initialSearch]);

    const handleBuy = (listing) => {
        if (listing.amount === 1) {
            // Direct buying for single items
            setConfirmModal({
                message: 'Are you sure you want to buy this item?',
                subtext: 'Silver will be deducted immediately.',
                onConfirm: () => {
                    socket.emit('buy_market_item', { listingId: listing.id, quantity: 1 });
                    setConfirmModal(null);
                }
            });
        } else {
            // Normalize potential object amount to a number
            const numericAmount = (typeof listing.amount === 'object' && listing.amount !== null)
                ? (listing.amount.amount || 0)
                : (Number(listing.amount) || 0);

            // Open partial buy modal
            setBuyModal({
                listing: listing,
                quantity: numericAmount, // Default to MAX
                max: numericAmount,
                pricePerUnit: listing.price / numericAmount
            });
        }
    };

    const handleCancel = (listing) => {
        const createdAt = new Date(listing.created_at).getTime();
        const elapsedMs = Date.now() - createdAt;
        const ONE_HOUR_MS = 3600 * 1000;
        const needsFee = elapsedMs < ONE_HOUR_MS;
        const fee = Math.floor(listing.price * 0.10);

        setConfirmModal({
            message: 'Cancel this listing?',
            subtext: needsFee
                ? `A 10% cancellation fee (${formatSilver(fee)}) will be charged because the listing is less than 1 hour old.`
                : 'The item will be returned to your Claim tab.',
            onConfirm: () => {
                socket.emit('cancel_listing', { listingId: listing.id });
                setConfirmModal(null);
            }
        });
    };

    const handleClaim = (claimId) => {
        socket.emit('claim_market_item', { claimId });
    };

    // Helper to check if a listing belongs to the current character
    const isOwnListing = (l) => {
        if (!gameState) return false;
        // Check by Character ID (New listings)
        if (l.seller_character_id && gameState.character_id) {
            if (String(l.seller_character_id) === String(gameState.character_id)) return true;
        }
        // Fallback: Check by Name AND User ID (Legacy listings or missing char ID)
        if (l.seller_name && gameState.name && l.seller_id && gameState.user_id) {
            if (l.seller_name === gameState.name && l.seller_id === gameState.user_id) return true;
        }
        return false;
    };

    // Derived State
    const myOrders = marketListings.filter(l => isOwnListing(l) && l.status !== 'SOLD' && l.status !== 'EXPIRED');
    // Assuming active are those not sold/expired. If server sends only active in updates, this filter might need adjustment.
    // However, usually market listings update implies active listings. 
    // Claims are usually separate. But let's check if the previous code logic implies separation.
    // Previous code: const myOrders = listings.filter(l => l.seller_id === gameState.user_id);
    // It implies everything is in one list. Use that for now.

    // Actually, looking at handleCancel subtext "returned to your Claim tab", implies meaningful status changes.
    // I'll stick to the old simple separation for now to avoid breaking if the server logic expects that.

    const activeListingsForValues = marketListings;


    // Filter Logic for BUY tab
    let activeBuyListings = activeListingsForValues.filter(l => {
        if (isOwnListing(l)) return false; // Hide current character's listings

        const currentItem = resolveItem(l.item_id);
        const itemName = (currentItem?.name || l.item_data?.name || formatItemId(l.item_id)).toLowerCase();
        const itemTier = currentItem?.tier || l.item_data?.tier;
        const itemQuality = currentItem?.quality ?? l.item_data?.quality ?? 0;

        // 1. Keyword search (Name/ID)
        const keywords = searchQuery.trim().toLowerCase().split(/\s+/);
        const matchesKeywords = keywords.every(word => {
            return itemName.includes(word) || l.item_id.toLowerCase().includes(word);
        });
        if (!matchesKeywords && searchQuery.trim() !== "") return false;

        // 2. Tier Filter
        if (selectedTier !== 'ALL' && itemTier !== parseInt(selectedTier)) return false;

        // 3. Quality Filter
        if (selectedQuality !== 'ALL' && itemQuality !== parseInt(selectedQuality)) return false;

        // 4. Category Filter
        if (selectedCategory !== 'ALL') {
            if (selectedCategory === 'EQUIPMENT') {
                if (!['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'OFF_HAND', 'GLOVES', 'CAPE', 'TOOL'].includes(l.item_data?.type)) return false;
            } else if (selectedCategory === 'RESOURCE') {
                if (!['RESOURCE', 'RAW', 'REFINED'].includes(l.item_data?.type)) return false;
            } else if (selectedCategory === 'REFINED') {
                if (l.item_data?.type !== 'REFINED') return false;
            } else if (selectedCategory === 'CONSUMABLE') {
                if (!['FOOD', 'POTION'].includes(l.item_data?.type)) return false;
            }
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


    const myActiveListings = activeListingsForValues.filter(l => isOwnListing(l));

    const isPremium = gameState?.state?.membership?.active && gameState?.state?.membership?.expiresAt > Date.now();
    const maxListings = isPremium ? 50 : 30;
    const currentListingsCount = myActiveListings.length;
    const isIronman = gameState?.state?.isIronman;


    if (isIronman || isAnonymous) {
        return (
            <div className="panel" style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                background: 'var(--panel-bg)',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: isIronman ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px',
                    border: isIronman ? '2px solid rgba(212, 175, 55, 0.2)' : '2px solid rgba(255, 68, 68, 0.2)'
                }}>
                    {isIronman ? <Shield size={40} color="var(--accent)" /> : <Lock size={40} color="#ff4444" />}
                </div>
                <h2 style={{ color: isIronman ? 'var(--accent)' : '#ff4444', margin: 0, fontSize: '1.8rem', letterSpacing: '2px' }}>
                    {isIronman ? 'IRONMAN MODE' : 'GUEST ACCOUNT'}
                </h2>
                <p style={{ color: 'var(--text-dim)', maxWidth: '400px', lineHeight: '1.6', fontSize: '1rem' }}>
                    {isIronman
                        ? "Ironman characters are self-sufficient and cannot use the Marketplace. All items must be gathered, crafted, or found through your own adventures!"
                        : "Marketplace is locked for Guest accounts to prevent abuse. Please link your account in the Profile tab to access the shared trade system."}
                </p>
                <div style={{
                    marginTop: '20px',
                    padding: '15px 25px',
                    background: 'var(--accent-soft)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    color: 'var(--accent)',
                    fontWeight: 'bold'
                }}>
                    {isIronman ? 'STRICT SELF-SUFFICIENCY ACTIVE' : 'ACCOUNT LINKING REQUIRED'}
                </div>
            </div>
        );
    }

    return (
        <div className="content-area" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="panel" style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                overflow: 'hidden',
                background: 'var(--panel-bg)',
                borderRadius: '12px',
                padding: isMobile ? '15px' : '24px' // Consistent padding
            }}>

                {/* HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                        <h2 style={{ color: 'var(--accent)', margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Tag size={isMobile ? 20 : 24} /> MARKETPLACE
                        </h2>
                        <p style={{ margin: '5px 0px 0px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>Shared world trade system</p>
                    </div>

                    {/* TOP TABS */}
                    <div style={{ display: 'flex', background: 'var(--glass-bg)', borderRadius: '12px', padding: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            onClick={() => setActiveTab('BUY')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                background: activeTab === 'BUY' ? 'var(--accent-soft)' : 'transparent',
                                color: activeTab === 'BUY' ? 'var(--accent)' : 'var(--text-dim)',
                                border: activeTab === 'BUY' ? '1px solid var(--accent)' : '1px solid transparent',
                                transition: '0.2s'
                            }}>
                            Browse
                        </button>
                        <button
                            onClick={() => setActiveTab('MY_ORDERS')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                background: activeTab === 'MY_ORDERS' ? 'var(--accent-soft)' : 'transparent',
                                color: activeTab === 'MY_ORDERS' ? 'var(--accent)' : 'var(--text-dim)',
                                border: activeTab === 'MY_ORDERS' ? '1px solid var(--accent)' : '1px solid transparent',
                                transition: '0.2s'
                            }}>
                            My Listings
                        </button>
                        <button
                            onClick={() => setActiveTab('SELL')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                background: activeTab === 'SELL' ? 'var(--accent-soft)' : 'transparent',
                                color: activeTab === 'SELL' ? 'var(--accent)' : 'var(--text-dim)',
                                border: activeTab === 'SELL' ? '1px solid var(--accent)' : '1px solid transparent',
                                transition: '0.2s'
                            }}>
                            Sell
                        </button>
                        <button
                            onClick={() => setActiveTab('CLAIM')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                position: 'relative',
                                background: activeTab === 'CLAIM' ? 'var(--accent-soft)' : 'transparent',
                                color: activeTab === 'CLAIM' ? 'var(--accent)' : 'var(--text-dim)',
                                border: activeTab === 'CLAIM' ? '1px solid var(--accent)' : '1px solid transparent',
                                transition: '0.2s'
                            }}>
                            Claim
                            {gameState?.state?.claims?.length > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-2px',
                                    right: '-2px',
                                    background: '#ff4444',
                                    color: '#fff',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    fontSize: '0.65rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>{gameState?.state?.claims?.length}</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* SEARCH AND FILTERS (Only visible in BUY tab) */}
                {
                    activeTab === 'BUY' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                            {/* Search Input */}
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    placeholder="Search items..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0, 0, 0, 0.3)',
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
                                    { id: 'CONSUMABLE', label: 'Consumables', icon: <Apple size={14} /> }
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
                        </div>
                    )
                }

                {/* CONTENT AREA */}
                <div className="scroll-container" style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>

                    {/* View: BUY */}
                    {activeTab === 'BUY' && (
                        <>
                            {activeBuyListings.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                    <ShoppingBag size={48} style={{ marginBottom: '15px', opacity: 0.3, margin: '0 auto' }} />
                                    <p>No listings found matching your criteria.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                    {activeBuyListings.map(l => (
                                        <div key={l.id} style={{
                                            background: 'var(--glass-bg)',
                                            borderColor: 'var(--border)',
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            padding: '12px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '15px',
                                            transition: '0.2s',
                                            position: 'relative',
                                            flexWrap: 'wrap',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                background: 'rgba(0, 0, 0, 0.4)',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `1px solid ${resolveItem(l.item_id)?.rarityColor || l.item_data.rarityColor || 'var(--border)'}`,
                                                flexShrink: 0,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                {l.item_data.icon ? (
                                                    <img src={l.item_data.icon} alt={l.item_data.name} style={{ width: '130%', height: '130%', objectFit: 'contain', opacity: 1.0 }} />
                                                ) : (
                                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{l.item_data.tier}</span>
                                                )}
                                                <div style={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                                    T{l.item_data.tier}
                                                </div>
                                                {/* Rune Stars */}
                                                {(l.item_data.stars > 0) && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '-2px',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        display: 'flex',
                                                        gap: '0px',
                                                        background: 'rgba(0,0,0,0.4)',
                                                        padding: '1px 2px',
                                                        borderRadius: '4px',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {Array.from({ length: l.item_data.stars }).map((_, i) => (
                                                            <Star key={i} size={6} fill="#FFD700" color="#FFD700" />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ flex: '2 1 0%', minWidth: '150px' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span>{resolveItem(l.item_id)?.name || l.item_data.name}</span>
                                                    <button onClick={() => onShowInfo(l.item_data)} style={{ background: 'none', border: 'none', padding: '0', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}>
                                                        <Info size={14} />
                                                    </button>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', gap: '15px' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <User size={12} /> {l.seller_name}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} /> {new Date(l.created_at).toLocaleString()}
                                                    </span>
                                                    {l.item_data.craftedBy && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', opacity: 0.9 }}>
                                                            <Hammer size={12} /> {l.item_data.craftedBy}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ flex: '1 1 0%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '2px' }}>
                                                    {((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 0}x units
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                    <Coins size={16} /> {
                                                        (() => {
                                                            const nAmt = ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 1;
                                                            const unitPrice = l.price / nAmt;
                                                            return unitPrice < 1 ? unitPrice.toFixed(2) : formatSilver(unitPrice);
                                                        })()
                                                    }
                                                </div>
                                            </div>

                                            <div style={{ marginLeft: '10px' }}>
                                                <button
                                                    onClick={() => handleBuy(l)}
                                                    disabled={silver < (l.price / l.amount)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        cursor: silver < (l.price / l.amount) ? 'not-allowed' : 'pointer',
                                                        background: silver < (() => {
                                                            const nAmt = ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 1;
                                                            return l.price / nAmt;
                                                        })() ? 'var(--accent-soft)' : 'rgba(76, 175, 80, 0.15)',
                                                        color: silver < (() => {
                                                            const nAmt = ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 1;
                                                            return l.price / nAmt;
                                                        })() ? 'var(--text-dim)' : '#4caf50',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.8rem',
                                                        minWidth: '100px',
                                                        border: `1px solid ${silver < (() => {
                                                            const nAmt = ((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 1;
                                                            return l.price / nAmt;
                                                        })() ? 'transparent' : 'rgba(76, 175, 80, 0.3)'}`
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
                            )}
                        </>
                    )}

                    {/* View: SELL */}
                    {activeTab === 'SELL' && (
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

                            {/* SEARCH FILTER FOR SELL TAB */}
                            <div style={{ position: 'relative', width: '100%', marginBottom: '15px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    placeholder="Search your inventory..."
                                    type="text"
                                    value={sellSearchQuery}
                                    onChange={(e) => setSellSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        padding: '10px 10px 10px 40px',
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
                            <div className="scroll-container" style={{ flex: 1, paddingRight: '5px' }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                                    gap: isMobile ? '8px' : '12px',
                                    paddingBottom: '20px'
                                }}>
                                    {Object.entries(gameState?.state?.inventory || {}).filter(([id, entry]) => {
                                        const qty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);
                                        if (qty <= 0) return false;

                                        const data = resolveItem(id);
                                        if (!data) return false;
                                        // Exclude Quest items or explicit non-tradable items if any
                                        if (data.type === 'QUEST') return false;

                                        // Apply Search Filter
                                        if (sellSearchQuery) {
                                            const searchLower = sellSearchQuery.toLowerCase();
                                            const itemName = data.name?.toLowerCase() || '';
                                            const itemId = id.toLowerCase();
                                            if (!itemName.includes(searchLower) && !itemId.includes(searchLower)) return false;
                                        }

                                        return true;
                                    }).map(([id, entry]) => {
                                        const qty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);
                                        const data = resolveItem(id);
                                        // Simple rarity check for border color if needed, similar to Inventory
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
                                                key={id}
                                                onClick={() => onListOnMarket({ itemId: id, max: qty })}
                                                style={{
                                                    background: 'rgba(0,0,0,0.2)',
                                                    border: `1px solid ${specificBorderColor}`,
                                                    boxShadow: (data.rarity && data.rarity !== 'COMMON') ? `0 0 4px ${specificBorderColor}40` : 'none',
                                                    borderRadius: '10px',
                                                    padding: '10px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    aspectRatio: '1/1',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    transition: '0.2s',
                                                    minHeight: '80px'
                                                }}
                                            >
                                                <div style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.6rem', color: 'var(--text-main)', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>T{data.tier}</div>
                                                <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 'bold' }}>x{qty}</div>

                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                                                    {data.icon ? (
                                                        <img src={data.icon} alt={data.name} style={{ width: '130%', height: '130%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <Package size={32} color="#666" style={{ opacity: 0.8 }} />
                                                    )}
                                                    {/* Rune Stars Overlay */}
                                                    {data.stars > 0 && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            display: 'flex',
                                                            gap: '0px',
                                                            zIndex: 10,
                                                            filter: 'drop-shadow(0px 0px 2px black)'
                                                        }}>
                                                            {Array.from({ length: data.stars }).map((_, i) => (
                                                                <Star key={i} size={8} fill="#FFD700" color="#FFD700" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {data.name}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View: MY LISTINGS */}
                    {activeTab === 'MY_ORDERS' && (
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
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                        {myOrders.map(l => (
                                            <div key={l.id} style={{
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                                padding: '12px 20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '15px',
                                                transition: '0.2s',
                                                position: 'relative',
                                                flexWrap: 'wrap',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    background: 'rgba(0, 0, 0, 0.4)',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: `1px solid ${l.item_data.rarityColor || 'var(--border)'}`,
                                                    flexShrink: 0,
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}>
                                                    {l.item_data.icon ? (
                                                        <img src={l.item_data.icon} alt={l.item_data.name} style={{ width: '130%', height: '130%', objectFit: 'contain', opacity: 1.0 }} />
                                                    ) : (
                                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{l.item_data.tier}</span>
                                                    )}
                                                    <div style={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                                        T{l.item_data.tier}
                                                    </div>
                                                    {/* Rune Stars */}
                                                    {(l.item_data.stars > 0) && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: '-2px',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            display: 'flex',
                                                            gap: '0px',
                                                            background: 'rgba(0,0,0,0.4)',
                                                            padding: '1px 2px',
                                                            borderRadius: '4px',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {Array.from({ length: l.item_data.stars }).map((_, i) => (
                                                                <Star key={i} size={6} fill="#FFD700" color="#FFD700" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ flex: '2 1 0%', minWidth: '150px' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span>{l.item_data.qualityName && l.item_data.qualityName !== 'Normal' ? `${l.item_data.qualityName} ` : ''}{resolveItem(l.item_id)?.name || l.item_data.name}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', gap: '15px' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Clock size={12} /> {new Date(l.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ flex: '1 1 0%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '2px' }}>
                                                        {((typeof l.amount === 'object' && l.amount !== null) ? l.amount.amount : l.amount) || 0}x units
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                        <Coins size={16} /> {formatSilver(l.price)}
                                                    </div>
                                                </div>

                                                <div style={{ marginLeft: '10px' }}>
                                                    <button
                                                        onClick={() => handleCancel(l)}
                                                        style={{
                                                            padding: '8px 16px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            background: 'rgba(255, 68, 68, 0.1)',
                                                            color: '#ff4444',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.8rem',
                                                            minWidth: '100px',
                                                            border: '1px solid rgba(255, 68, 68, 0.3)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '5px'
                                                        }}
                                                    >
                                                        <Trash2 size={12} /> CANCEL
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* View: CLAIM */}
                    {activeTab === 'CLAIM' && (
                        <div className="scroll-container" style={{ flex: 1, paddingRight: '5px' }}>
                            {(!gameState?.state?.claims || gameState.state.claims.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                    <ShoppingBag size={48} style={{ marginBottom: '15px', opacity: 0.3, margin: '0 auto' }} />
                                    <p>Nothing to claim.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                    {gameState?.state?.claims?.map(c => {
                                        let isItem = c.type === 'BOUGHT_ITEM' || c.type === 'CANCELLED_LISTING' || c.type === 'SOLD_ITEM';
                                        let name = c.name || 'Item';
                                        let icon = <Coins size={24} color="var(--accent)" />;
                                        let tierColor = '#fff';

                                        let itemData = null;
                                        if (isItem && c.itemId) {
                                            itemData = resolveItem(c.itemId);
                                            if (itemData) {
                                                tierColor = getTierColor(itemData.tier);
                                                if (c.type === 'SOLD_ITEM') {
                                                    name = `Sold: ${itemData.name}`;
                                                } else {
                                                    name = `${itemData.name}`;
                                                }

                                                if (c.type !== 'SOLD_ITEM') {
                                                    if (itemData.icon) {
                                                        icon = <img src={itemData.icon} alt={itemData.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
                                                    } else {
                                                        icon = <Package size={24} color="#666" style={{ opacity: 0.8 }} />;
                                                    }
                                                }
                                            }
                                        }

                                        return (
                                            <div key={c.id} style={{
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                                padding: '12px 20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '15px',
                                                transition: '0.2s',
                                                position: 'relative',
                                                flexWrap: 'wrap',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    background: 'rgba(0, 0, 0, 0.4)',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: isItem ? `1px solid ${tierColor}` : '1px solid var(--accent)',
                                                    flexShrink: 0,
                                                    overflow: 'hidden',
                                                    position: 'relative'
                                                }}>
                                                    {isItem && icon.props?.style ? React.cloneElement(icon, { style: { ...icon.props.style, width: '130%', height: '130%', objectFit: 'contain' } }) : icon}

                                                    {/* Rune Stars Overlay */}
                                                    {itemData?.stars > 0 && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: '-1px',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            display: 'flex',
                                                            gap: '0px',
                                                            background: 'rgba(0,0,0,0.4)',
                                                            padding: '1px 2px',
                                                            borderRadius: '4px',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {Array.from({ length: itemData.stars }).map((_, i) => (
                                                                <Star key={i} size={6} fill="#FFD700" color="#FFD700" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ flex: '2 1 0%', minWidth: '150px' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span>{name}</span>
                                                        {c.metadata?.craftedBy && (
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--accent)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Hammer size={10} /> {c.metadata.craftedBy}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', gap: '15px' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Clock size={12} /> {new Date(c.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ flex: '1 1 0%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '2px' }}>
                                                        {c.type === 'SOLD_ITEM' && `Quantity: ${(typeof c.amount === 'object' && c.amount !== null) ? (c.amount.amount || 0) : c.amount}`}
                                                        {c.type === 'BOUGHT_ITEM' && `Bought x${(typeof c.amount === 'object' && c.amount !== null) ? (c.amount.amount || 0) : c.amount}`}
                                                        {c.type === 'CANCELLED_LISTING' && `Retrieved x${(typeof c.amount === 'object' && c.amount !== null) ? (c.amount.amount || 0) : c.amount}`}
                                                    </div>
                                                    {c.silver ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                            <Coins size={16} /> +{formatSilver(c.silver)}
                                                        </div>
                                                    ) : (
                                                        <div style={{ height: '24px' }}></div>
                                                    )}
                                                </div>

                                                <div style={{ marginLeft: '10px' }}>
                                                    <button
                                                        onClick={() => {
                                                            // Direct claim without confirm as receiving items is always good
                                                            handleClaim(c.id);
                                                        }}
                                                        style={{
                                                            padding: '8px 16px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            background: 'rgba(76, 175, 80, 0.15)',
                                                            color: '#4caf50',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.8rem',
                                                            minWidth: '100px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '5px'
                                                        }}
                                                    >
                                                        CLAIM
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* NOTIFICATIONS */}
                {
                    notification && (
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: notification.type === 'error' ? 'rgba(255, 68, 68, 0.9)' : 'rgba(76, 175, 80, 0.9)',
                            color: 'var(--text-main)',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            zIndex: 100,
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            minWidth: '300px',
                            justifyContent: 'center'
                        }}>
                            {notification.type === 'error' ? <AlertTriangle size={20} /> : <Check size={20} />}
                            <span style={{ fontWeight: '500' }}>{notification.message}</span>
                        </div>
                    )
                }

                {/* CONFIRM MODAL (Simple) */}
                {
                    confirmModal && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3000,
                            backdropFilter: 'blur(2px)'
                        }} onClick={(e) => {
                            if (e.target === e.currentTarget) setConfirmModal(null);
                        }}>
                            <div style={{
                                background: '#1a1a1a',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '24px',
                                width: '90%',
                                maxWidth: '400px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#fff' }}>{confirmModal.message}</h3>
                                {confirmModal.subtext && <p style={{ margin: '0 0 20px 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>{confirmModal.subtext}</p>}

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setConfirmModal(null)}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            background: 'transparent',
                                            color: 'var(--text-dim)',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmModal.onConfirm}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'var(--accent)',
                                            color: '#000',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* BUY MODAL (Partial Quantity) */}
                {
                    buyModal && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3000,
                            backdropFilter: 'blur(2px)'
                        }} onClick={(e) => {
                            if (e.target === e.currentTarget) setBuyModal(null);
                        }}>
                            <div style={{
                                background: '#1a1a1a',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '24px',
                                width: '90%',
                                maxWidth: '450px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#fff' }}>
                                    Buy {buyModal.listing.item_data.qualityName && buyModal.listing.item_data.qualityName !== 'Normal' ? `${buyModal.listing.item_data.qualityName} ` : ''}{buyModal.listing.item_data.name}
                                </h3>
                                <p style={{ margin: '0 0 20px 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                                    Price per unit: <span style={{ color: 'var(--accent)' }}>
                                        {buyModal.pricePerUnit < 1 ? buyModal.pricePerUnit.toFixed(2) : formatNumber(Math.floor(buyModal.pricePerUnit))} silver
                                    </span>
                                </p>

                                {/* Quantity Selector */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <button
                                        onClick={() => setBuyModal(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                                        style={{
                                            width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border)',
                                            background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1.2rem'
                                        }}
                                    >-</button>

                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number"
                                            value={buyModal.quantity}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '') {
                                                    setBuyModal(prev => ({ ...prev, quantity: '' }));
                                                } else {
                                                    const parsed = parseInt(val);
                                                    if (!isNaN(parsed)) {
                                                        // Clamp between 1 and max
                                                        const clamped = Math.max(1, Math.min(buyModal.max, parsed));
                                                        setBuyModal(prev => ({ ...prev, quantity: clamped }));
                                                    }
                                                }
                                            }}
                                            onBlur={() => {
                                                if (buyModal.quantity === '' || buyModal.quantity === 0) {
                                                    setBuyModal(prev => ({ ...prev, quantity: 1 }));
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                textAlign: 'center',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                padding: '10px',
                                                color: '#fff',
                                                fontSize: '1.1rem',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </div>

                                    <button
                                        onClick={() => setBuyModal(prev => ({ ...prev, quantity: Math.min(prev.max, prev.quantity + 1) }))}
                                        style={{
                                            width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border)',
                                            background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1.2rem'
                                        }}
                                    >+</button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <button
                                        onClick={() => setBuyModal(prev => ({ ...prev, quantity: 1 }))}
                                        style={{ fontSize: '0.8rem', padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-dim)', cursor: 'pointer' }}
                                    >MIN (1)</button>

                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>
                                        {buyModal.max} available
                                    </span>

                                    <button
                                        onClick={() => {
                                            const affordable = Math.floor(silver / buyModal.pricePerUnit);
                                            const maxAmount = Math.max(1, Math.min(buyModal.max, affordable));
                                            setBuyModal(prev => ({ ...prev, quantity: maxAmount }));
                                        }}
                                        style={{ fontSize: '0.8rem', padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-dim)', cursor: 'pointer' }}
                                    >MAX ({buyModal.max})</button>
                                </div>

                                {/* Financial Summary */}
                                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                        <span>Current Silver:</span>
                                        <span style={{ color: '#fff' }}>{silver ? formatNumber(silver) : 0}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                        <span>Total Cost:</span>
                                        <span style={{ color: '#ff4444' }}>- {formatNumber(Math.floor(buyModal.pricePerUnit * buyModal.quantity))}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                        <span>Remaining:</span>
                                        <span style={{ color: (silver - Math.floor(buyModal.pricePerUnit * buyModal.quantity)) < 0 ? '#ff4444' : '#4caf50' }}>
                                            {formatNumber(silver - Math.floor(buyModal.pricePerUnit * buyModal.quantity))}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setBuyModal(null)}
                                        style={{
                                            padding: '12px 24px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            background: 'transparent',
                                            color: 'var(--text-dim)',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            const qtyToSend = Number(buyModal.quantity) || 1;
                                            if (silver >= Math.floor(buyModal.pricePerUnit * qtyToSend)) {
                                                socket.emit('buy_market_item', { listingId: buyModal.listing.id, quantity: qtyToSend });
                                            }
                                        }}
                                        disabled={silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1))}
                                        style={{
                                            padding: '12px 24px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1)) ? 'rgba(255,255,255,0.1)' : 'var(--accent)',
                                            color: silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1)) ? 'var(--text-dim)' : '#000',
                                            cursor: silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1)) ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Confirm Buy
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default MarketPanel;
