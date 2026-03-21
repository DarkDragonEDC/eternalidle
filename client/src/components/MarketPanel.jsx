import React, { useState, useEffect } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import {
    Tag, ShoppingBag, Package, Search,
    Coins, ArrowRight, User, Info, Trash2,
    Shield, Zap, Apple, Box, Clock, Check, AlertTriangle, X, Star, Hammer, Lock, History, TrendingUp, TrendingDown,
    Gavel
} from 'lucide-react';
import { resolveItem, getTierColor, formatItemId, getRequiredProficiencyGroup, calculateItemSellPrice } from '@shared/items';

import MarketBuyOrdersTab from './market/MarketBuyOrdersTab';
import MarketSellTab from './market/MarketSellTab';
import MarketListingsTab from './market/MarketListingsTab';
import MarketClaimTab from './market/MarketClaimTab';
import MarketHistoryTab from './market/MarketHistoryTab';
import MarketBrowseTab from './market/MarketBrowseTab';

const QUALITIES = {
    0: { name: 'Normal', color: '#9ca3af' },
    1: { name: 'Good', color: '#10b981' },
    2: { name: 'Outstanding', color: '#3b82f6' },
    3: { name: 'Excellent', color: '#a855f7' },
    4: { name: 'Masterpiece', color: '#f59e0b' }
};

const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

import { useAppStore } from '../store/useAppStore';

const MarketPanel = ({ socket, gameState, silver = 0, onShowInfo, onListOnMarket, onInspect, isMobile, initialSearch = '', isAnonymous, isPreviewActive, onPreviewActionBlocked }) => {
    const store = useAppStore();
    const [activeTab, setActiveTab] = useState('BUY');
    const {
        marketListings, setMarketListings,
        marketNotification: notification, setMarketNotification: setNotification,
        marketHistory, setMarketHistory,
        myMarketHistory, setMyMarketHistory,
        buyOrders, setBuyOrders,
        lowestSellPrice, setLowestSellPrice,
        isLoadingMarketHistory: isLoadingHistory, setIsLoadingMarketHistory: setIsLoadingHistory
    } = store;

    const [buyModal, setBuyModal] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [createBuyOrderModal, setCreateBuyOrderModal] = useState(null);
    const [fillOrderModal, setFillOrderModal] = useState(null);

    const [fillQuantity, setFillQuantity] = useState(1);
    const [itemSuggestions, setItemSuggestions] = useState([]);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [historySubTab, setHistorySubTab] = useState('GLOBAL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedTier, setSelectedTier] = useState('ALL');
    const [selectedQuality, setSelectedQuality] = useState('ALL');
    const [selectedClass, setSelectedClass] = useState('ALL');
    const [selectedSort, setSelectedSort] = useState('NEWEST');
    const [currentPage, setCurrentPage] = useState(1);

    const searchableItems = React.useMemo(() => {
        const list = [];
        const tiers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const raw = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'];
        const refined = ['PLANK', 'BAR', 'LEATHER', 'CLOTH', 'EXTRACT'];
        const gear = [
            'SWORD', 'SHEATH', 'PLATE_ARMOR', 'PLATE_HELMET', 'PLATE_BOOTS', 'PLATE_GLOVES', 'PLATE_CAPE',
            'BOW', 'TORCH', 'LEATHER_ARMOR', 'LEATHER_HELMET', 'LEATHER_BOOTS', 'LEATHER_GLOVES', 'LEATHER_CAPE',
            'FIRE_STAFF', 'TOME', 'CLOTH_ARMOR', 'CLOTH_HELMET', 'CLOTH_BOOTS', 'CLOTH_GLOVES', 'CLOTH_CAPE',
            'PICKAXE', 'AXE', 'SKINNING_KNIFE', 'SICKLE', 'FISHING_ROD'
        ];
        const special = [
            'DUNGEON_MAP', 'CREST', 'SHARD', 'DUNGEON_CHEST', 'FOOD',
            'POTION_GATHER', 'POTION_REFINE', 'POTION_CRAFT', 'POTION_SILVER', 'POTION_QUALITY', 'POTION_LUCK', 'POTION_XP',
            'POTION_CRIT', 'POTION_DAMAGE'
        ];

        const chestQualities = ['NORMAL', 'GOOD', 'OUTSTANDING', 'EXCELLENT', 'MASTERPIECE', 'COMMON', 'RARE', 'GOLD', 'MYTHIC'];
        const wbQualities = ['NORMAL', 'GOOD', 'OUTSTANDING', 'EXCELLENT', 'MASTERPIECE'];
        const gearTypes = ['WEAPON', 'OFF_HAND', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'TOOL', 'TOOL_AXE', 'TOOL_PICKAXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'TOOL_POUCH'];

        const runeActs = [
            'WOOD', 'ORE', 'HIDE', 'FIBER', 'HERB', 'FISH',
            'METAL', 'PLANK', 'LEATHER', 'CLOTH', 'EXTRACT',
            'WARRIOR', 'HUNTER', 'MAGE', 'TOOLS', 'COOKING', 'ALCHEMY',
            'ATTACK'
        ];
        const runeEffs = ['XP', 'COPY', 'SPEED', 'EFF', 'ATTACK', 'SAVE_FOOD', 'BURST', 'ATTACK_SPEED'];

        tiers.forEach(t => {
            raw.forEach(r => list.push(`T${t}_${r}`));
            refined.forEach(r => list.push(`T${t}_${r}`));
            gear.forEach(g => list.push(`T${t}_${g}`));
            special.forEach(s => list.push(`T${t}_${s}`));

            chestQualities.forEach(q => list.push(`T${t}_CHEST_${q}`));
            wbQualities.forEach(q => list.push(`T${t}_WORLDBOSS_CHEST_${q}`));

            if (t === 1) {
                list.push('T1_RUNE_SHARD');
                list.push('T1_BATTLE_RUNE_SHARD');
            }

            runeActs.forEach(act => {
                runeEffs.forEach(eff => {
                    list.push(`T${t}_RUNE_${act}_${eff}`);
                });
            });
        });

        // Add Enhancement Stones (Fixed IDs, not tiered)
        const stoneClasses = ['WARRIOR', 'HUNTER', 'MAGE'];
        const stoneSlots = ['WEAPON', 'OFFHAND', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE'];
        stoneClasses.forEach(cls => {
            stoneSlots.forEach(slot => {
                list.push(`ENHANCEMENT_STONE_${cls}_${slot}`);
            });
        });

        return list.map(id => {
            const resolved = resolveItem(id);
            if (!resolved) return null;

            let itemClass = '';
            if (id.includes('PLATE_') || id.includes('SWORD') || id.includes('SHEATH')) itemClass = 'warrior';
            else if (id.includes('LEATHER_') || id.includes('BOW') || id.includes('TORCH')) itemClass = 'hunter';
            else if (id.includes('CLOTH_') || id.includes('STAFF') || id.includes('TOME')) itemClass = 'mage';

            const isArmor = id.includes('_ARMOR') || id.includes('_HELMET') || id.includes('_BOOTS') || id.includes('_GLOVES') || id.includes('_CAPE');
            const canHaveQuality = gearTypes.includes(resolved.type);
            const canHaveStars = id.includes('_RUNE_') && !id.includes('_SHARD');

            return {
                id,
                name: resolved.name,
                tier: resolved.tier,
                icon: resolved.icon,
                type: resolved.type?.toLowerCase(),
                rarity: resolved.rarity?.toLowerCase(),
                class: itemClass,
                isArmor,
                canHaveQuality,
                canHaveStars
            };
        }).filter(Boolean);
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification, setNotification]);

    useEffect(() => {
        if (!socket) return;
        
        console.log('[MARKET] Fetching listings with filters:', {
            category: selectedCategory,
            tier: selectedTier,
            quality: selectedQuality,
            itemClass: selectedClass,
            search: searchQuery,
            sort: selectedSort,
            page: currentPage
        });

        socket.emit('get_market_listings', {
            category: selectedCategory,
            tier: selectedTier,
            quality: selectedQuality,
            itemClass: selectedClass,
            search: searchQuery,
            sort: selectedSort,
            page: currentPage,
            limit: 10,
            exclude_seller_id: store.user?.id || undefined
        });
    }, [socket, selectedCategory, selectedTier, selectedQuality, selectedClass, searchQuery, selectedSort, currentPage, store.user?.id]);

    useEffect(() => {
        if (!socket) return;
        const charId = gameState?.id || store.selectedCharacter;
        if (!charId) {
            console.warn('[MARKET] No character ID available for fetching user listings');
            return;
        }

        if (activeTab === 'SELL' || activeTab === 'MY_ORDERS') {
            socket.emit('get_market_listings', {
                seller_character_id: charId,
                limit: 100
            });
        }
    }, [activeTab, gameState?.id, store.selectedCharacter, socket]);

    useEffect(() => {
        if (!socket) return;
        
        const handleActionSuccess = () => {
            socket.emit('get_market_listings', {
                category: selectedCategory,
                tier: selectedTier,
                quality: selectedQuality,
                itemClass: selectedClass,
                search: searchQuery,
                sort: selectedSort,
                page: currentPage,
                limit: 10,
                exclude_seller_id: store.user?.id || undefined
            });
        };

        socket.on('market_action_success', handleActionSuccess);
        return () => socket.off('market_action_success', handleActionSuccess);
    }, [socket, selectedCategory, selectedTier, selectedQuality, selectedClass, searchQuery, selectedSort, currentPage, store.user?.id]);

    useEffect(() => {
        if (!socket) return;

        if (activeTab === 'HISTORY') {
            setIsLoadingHistory(true);
            if (historySubTab === 'GLOBAL') {
                socket.emit('get_market_history');
            } else {
                socket.emit('get_my_market_history');
            }
        }
        if (activeTab === 'BUY_ORDERS') {
            socket.emit('get_buy_orders');
        }
    }, [activeTab, historySubTab, socket, setIsLoadingHistory]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory, selectedTier, selectedQuality, selectedClass, searchQuery, selectedSort]);

    useEffect(() => {
        if (initialSearch) {
            setSearchQuery(initialSearch);
            setSelectedCategory('ALL');
        }
    }, [initialSearch]);


    const handleBuy = (listing) => {
        if (isPreviewActive) return onPreviewActionBlocked();

        const numericAmount = (typeof listing.amount === 'object' && listing.amount !== null)
            ? (listing.amount.amount || 0)
            : (Number(listing.amount) || 0);

        if (numericAmount === 1) {
            setConfirmModal({
                message: 'Are you sure you want to buy this item?',
                subtext: 'Silver will be deducted immediately.',
                onConfirm: () => {
                    if (silver < listing.price) {
                        setNotification({ type: 'error', message: 'Not enough silver!' });
                        return;
                    }
                    socket.emit('buy_market_item', { listingId: listing.id, quantity: 1 });
                    setConfirmModal(null);
                }
            });
        } else {
            setBuyModal({
                listing: listing,
                quantity: 1,
                max: numericAmount,
                pricePerUnit: listing.price / numericAmount
            });
        }
    };

    const handleCancel = (listing) => {
        if (isPreviewActive) return onPreviewActionBlocked();

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

    const handleFillOrder = (order) => {
        setFillOrderModal(order);
        setFillQuantity(1);
    };

    const handleClaim = (claimId) => {
        if (isPreviewActive) return onPreviewActionBlocked();
        socket.emit('claim_market_item', { claimId });
    };

    const isOwnListing = (listing) => {
        if (!listing || !gameState) return false;
        return String(listing.seller_character_id) === String(gameState.id) ||
            (listing.seller_name && gameState.name && listing.seller_name.toLowerCase() === gameState.name.toLowerCase());
    };

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

    const isPremium = gameState?.state?.membership?.active && gameState?.state?.membership?.expiresAt > Date.now();
    const maxListings = isPremium ? 50 : 30;

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
                padding: isMobile ? '15px' : '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                        <h2 style={{ color: 'var(--accent)', margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Tag size={isMobile ? 20 : 24} /> MARKETPLACE
                        </h2>
                        <p style={{ margin: '5px 0px 0px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>Shared world trade system</p>
                    </div>

                    <div style={{ display: 'flex', background: 'var(--glass-bg)', borderRadius: '12px', padding: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button onClick={() => setActiveTab('BUY')} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', background: activeTab === 'BUY' ? 'var(--accent-soft)' : 'transparent', color: activeTab === 'BUY' ? 'var(--accent)' : 'var(--text-dim)', border: activeTab === 'BUY' ? '1px solid var(--accent)' : '1px solid transparent', transition: '0.2s' }}>Sell Orders</button>
                        <button onClick={() => setActiveTab('BUY_ORDERS')} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', background: activeTab === 'BUY_ORDERS' ? 'var(--accent-soft)' : 'transparent', color: activeTab === 'BUY_ORDERS' ? 'var(--accent)' : 'var(--text-dim)', border: activeTab === 'BUY_ORDERS' ? '1px solid var(--accent)' : '1px solid transparent', transition: '0.2s' }}>Buy Orders</button>
                        <button onClick={() => setActiveTab('MY_ORDERS')} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', background: activeTab === 'MY_ORDERS' ? 'var(--accent-soft)' : 'transparent', color: activeTab === 'MY_ORDERS' ? 'var(--accent)' : 'var(--text-dim)', border: activeTab === 'MY_ORDERS' ? '1px solid var(--accent)' : '1px solid transparent', transition: '0.2s' }}>My Listings</button>
                        <button onClick={() => setActiveTab('SELL')} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', background: activeTab === 'SELL' ? 'var(--accent-soft)' : 'transparent', color: activeTab === 'SELL' ? 'var(--accent)' : 'var(--text-dim)', border: activeTab === 'SELL' ? '1px solid var(--accent)' : '1px solid transparent', transition: '0.2s' }}>Sell</button>
                        <button onClick={() => setActiveTab('CLAIM')} style={{ position: 'relative', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', background: activeTab === 'CLAIM' ? 'var(--accent-soft)' : 'transparent', color: activeTab === 'CLAIM' ? 'var(--accent)' : 'var(--text-dim)', border: activeTab === 'CLAIM' ? '1px solid var(--accent)' : '1px solid transparent', transition: '0.2s' }}>Claim {gameState?.state?.claims?.length > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ff4444', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{gameState?.state?.claims?.length}</span>}</button>
                        <button onClick={() => setActiveTab('HISTORY')} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', background: activeTab === 'HISTORY' ? 'var(--accent-soft)' : 'transparent', color: activeTab === 'HISTORY' ? 'var(--accent)' : 'var(--text-dim)', border: activeTab === 'HISTORY' ? '1px solid var(--accent)' : '1px solid transparent', transition: '0.2s' }}>History</button>
                    </div>
                </div>

                <div className="scroll-container" style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
                    {activeTab === 'BUY' && (
                        <MarketBrowseTab
                            marketListings={marketListings}
                            gameState={gameState}
                            silver={silver}
                            onShowInfo={onShowInfo}
                            onInspect={onInspect}
                            initialSearch={initialSearch}
                            onBuyItem={handleBuy}
                            isPreviewActive={isPreviewActive}
                            onPreviewActionBlocked={onPreviewActionBlocked}
                            
                            // Server-side filter/pagination props
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                            selectedTier={selectedTier}
                            setSelectedTier={setSelectedTier}
                            selectedQuality={selectedQuality}
                            setSelectedQuality={setSelectedQuality}
                            selectedClass={selectedClass}
                            setSelectedClass={setSelectedClass}
                            selectedSort={selectedSort}
                            setSelectedSort={setSelectedSort}
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            pagination={store.marketPagination}
                        />
                    )}
                    {activeTab === 'SELL' && (
                        <MarketSellTab 
                            gameState={gameState} 
                            socket={socket} 
                            onListOnMarket={onListOnMarket} 
                            maxListings={maxListings} 
                            currentListingsCount={store.myMarketListings.length} 
                            onShowInfo={onShowInfo} 
                            isPreviewActive={isPreviewActive} 
                            onPreviewActionBlocked={onPreviewActionBlocked} 
                        />
                    )}
                    {activeTab === 'MY_ORDERS' && (
                        <MarketListingsTab 
                            myOrders={store.myMarketListings} 
                            currentListingsCount={store.myMarketListings.length}
                            maxListings={maxListings} 
                            onCancelItem={handleCancel} 
                        />
                    )}
                    {activeTab === 'BUY_ORDERS' && (
                        <MarketBuyOrdersTab
                            buyOrders={buyOrders}
                            gameState={gameState}
                            socket={socket}
                            onShowInfo={onShowInfo}
                            onInspect={onInspect}
                            isMobile={isMobile}
                            isPreviewActive={isPreviewActive}
                            onPreviewActionBlocked={onPreviewActionBlocked}
                            setConfirmModal={setConfirmModal}
                            fillOrderModal={fillOrderModal}
                            setFillOrderModal={setFillOrderModal}
                            fillQuantity={fillQuantity}
                            setFillQuantity={setFillQuantity}
                            setCreateBuyOrderModal={setCreateBuyOrderModal}
                            setItemSuggestions={setItemSuggestions}
                            setLowestSellPrice={setLowestSellPrice}
                            searchableItems={searchableItems}
                            itemSuggestions={itemSuggestions}
                            createBuyOrderModal={createBuyOrderModal}
                        />
                    )}
                    {activeTab === 'CLAIM' && (
                        <MarketClaimTab
                            claims={gameState?.state?.claims || []}
                            onClaim={handleClaim}
                            onClaimAll={() => {
                                if (isPreviewActive) return onPreviewActionBlocked();
                                socket.emit('claim_all_market_items');
                            }}
                            onShowInfo={onShowInfo}
                            onInspect={onInspect}
                            isPreviewActive={isPreviewActive}
                            onPreviewActionBlocked={onPreviewActionBlocked}
                        />
                    )}

                    {activeTab === 'HISTORY' && (
                        <MarketHistoryTab
                            isLoadingHistory={isLoadingHistory}
                            marketHistory={marketHistory}
                            myMarketHistory={myMarketHistory}
                            getTimeAgo={getTimeAgo}
                            historySubTab={historySubTab}
                            setHistorySubTab={setHistorySubTab}
                            onInspect={onInspect}
                        />
                    )}
                </div>

                {notification && (
                    <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: notification.type === 'error' ? 'rgba(255, 68, 68, 0.9)' : 'rgba(76, 175, 80, 0.9)', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: 'var(--panel-shadow)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 100, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)', minWidth: '300px', justifyContent: 'center' }}>
                        {notification.type === 'error' ? <AlertTriangle size={20} /> : <Check size={20} />}
                        <span style={{ fontWeight: '500' }}>{notification.message}</span>
                    </div>
                )}

                {/* CONFIRM MODAL */}
                {confirmModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, backdropFilter: 'blur(5px)' }} onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal(null); }}>
                        <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '400px', boxShadow: 'var(--panel-shadow)', position: 'relative' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertTriangle size={20} color="var(--accent)" />
                                {confirmModal.message}
                            </h3>
                            {confirmModal.subtext && <p style={{ margin: '0 0 24px 0', color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: '1.5' }}>{confirmModal.subtext}</p>}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setConfirmModal(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Cancel</button>
                                <button onClick={confirmModal.onConfirm} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#000', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Confirm</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* BUY MODAL */}
                {buyModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, backdropFilter: 'blur(5px)' }} onClick={(e) => { if (e.target === e.currentTarget) setBuyModal(null); }}>
                        <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '450px', boxShadow: 'var(--panel-shadow)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                                    Buy {buyModal.listing.item_data.qualityName && buyModal.listing.item_data.qualityName !== 'Normal' ? `${buyModal.listing.item_data.qualityName} ` : ''}{buyModal.listing.item_data.name}
                                </h3>
                                <button onClick={() => setBuyModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            
                            <p style={{ margin: '0 0 20px 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                                Price per unit: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{formatSilver(buyModal.pricePerUnit)}</span>
                            </p>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <button onClick={() => setBuyModal(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))} style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem' }}>-</button>
                                <div style={{ flex: 1 }}>
                                    <input type="number" value={buyModal.quantity} onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setBuyModal(prev => ({ ...prev, quantity: '' }));
                                        else {
                                            const parsed = parseInt(val);
                                            if (!isNaN(parsed)) setBuyModal(prev => ({ ...prev, quantity: Math.min(buyModal.max, parsed) }));
                                        }
                                    }} onBlur={() => { if (buyModal.quantity === '' || buyModal.quantity === 0) setBuyModal(prev => ({ ...prev, quantity: 1 })); }} style={{ width: '100%', textAlign: 'center', background: 'var(--slot-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 'bold' }} />
                                </div>
                                <button onClick={() => setBuyModal(prev => ({ ...prev, quantity: Math.min(prev.max, prev.quantity + 1) }))} style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <button onClick={() => setBuyModal(prev => ({ ...prev, quantity: 1 }))} style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold' }}>MIN (1)</button>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>{buyModal.max} available</span>
                                <button onClick={() => {
                                    const affordable = Math.floor(silver / buyModal.pricePerUnit);
                                    setBuyModal(prev => ({ ...prev, quantity: Math.max(1, Math.min(buyModal.max, affordable)) }));
                                }} style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold' }}>MAX ({buyModal.max})</button>
                            </div>
                            
                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '15px', marginBottom: '25px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                    <span>Current Silver:</span>
                                    <span style={{ color: 'var(--text-main)' }}>{formatSilver(silver)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                    <span>Total Cost:</span>
                                    <span style={{ color: '#ff4444', fontWeight: 'bold' }}>- {formatSilver(Math.floor(buyModal.pricePerUnit * buyModal.quantity))}</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem' }}>
                                    <span>Remaining:</span>
                                    <span style={{ color: (silver - Math.floor(buyModal.pricePerUnit * buyModal.quantity)) < 0 ? '#ff4444' : '#4caf50' }}>{formatSilver(silver - Math.floor(buyModal.pricePerUnit * buyModal.quantity))}</span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setBuyModal(null)} style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                                <button onClick={() => {
                                    const qtyToSend = Number(buyModal.quantity) || 1;
                                    if (silver >= Math.floor(buyModal.pricePerUnit * qtyToSend)) {
                                        socket.emit('buy_market_item', { listingId: buyModal.listing.id, quantity: qtyToSend });
                                        setBuyModal(null);
                                    }
                                }} disabled={silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1))} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1)) ? 'rgba(255,255,255,0.05)' : 'var(--accent)', color: silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1)) ? 'var(--text-dim)' : '#000', cursor: silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1)) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Confirm Buy</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default MarketPanel;
