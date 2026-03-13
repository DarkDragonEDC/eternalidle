import React, { useState, useEffect } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import {
    Tag, ShoppingBag, Package, Search,
    Coins, ArrowRight, User, Info, Trash2,
    Shield, Zap, Apple, Box, Clock, Check, AlertTriangle, X, Star, Hammer, Lock, History, TrendingUp, TrendingDown,
    Gavel
} from 'lucide-react';
import { resolveItem, getTierColor, formatItemId, getRequiredProficiencyGroup, calculateItemSellPrice } from '@shared/items';

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

const MarketPanel = ({ socket, gameState, silver = 0, onShowInfo, onListOnMarket, onInspect, isMobile, initialSearch = '', isAnonymous, isPreviewActive, onPreviewActionBlocked }) => {
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
    const [selectedClass, setSelectedClass] = useState('ALL');
    const [sellSearchQuery, setSellSearchQuery] = useState('');
    const [marketHistory, setMarketHistory] = useState([]);
    const [myMarketHistory, setMyMarketHistory] = useState([]);
    const [historySubTab, setHistorySubTab] = useState('GLOBAL'); // GLOBAL, PERSONAL
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Buy Orders Tab States
    const [buyOrders, setBuyOrders] = useState([]);
    const [buyOrdersSubTab, setBuyOrdersSubTab] = useState('BROWSE'); // BROWSE, MY_ORDERS
    const [createBuyOrderModal, setCreateBuyOrderModal] = useState(null);
    const [itemSuggestions, setItemSuggestions] = useState([]);
    const [fillOrderModal, setFillOrderModal] = useState(null);
    const [fillQuantity, setFillQuantity] = useState(1);
    const [lowestSellPrice, setLowestSellPrice] = useState(null);
    const [loadingPrice, setLoadingPrice] = useState(false);

    // Browse Buy Orders Filters
    const [buyOrdersSearchQuery, setBuyOrdersSearchQuery] = useState('');
    const [buyOrdersSelectedTier, setBuyOrdersSelectedTier] = useState('ALL');
    const [buyOrdersSelectedQuality, setBuyOrdersSelectedQuality] = useState('ALL');
    const [buyOrdersSelectedClass, setBuyOrdersSelectedClass] = useState('ALL');
    const [buyOrdersSelectedCategory, setBuyOrdersSelectedCategory] = useState('ALL');
    const [buyOrdersSelectedSortOrder, setBuyOrdersSelectedSortOrder] = useState('NEWEST');
    const [buyOrdersFilterInventory, setBuyOrdersFilterInventory] = useState(false);

    // Flat list of all searchable items for autocomplete
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

            // Chest Qualities
            chestQualities.forEach(q => list.push(`T${t}_CHEST_${q}`));
            wbQualities.forEach(q => list.push(`T${t}_WORLDBOSS_CHEST_${q}`));

            // Shards legacy support
            if (t === 1) {
                list.push('T1_RUNE_SHARD');
                list.push('T1_BATTLE_RUNE_SHARD');
            }

            // Runes: Base RUNE ID (Stars will be selected in a sub-menu)
            runeActs.forEach(act => {
                runeEffs.forEach(eff => {
                    list.push(`T${t}_RUNE_${act}_${eff}`);
                });
            });
        });

        // Resolve all to get names and icons
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

    // Sell Tab States
    const [sellSelectedCategory, setSellSelectedCategory] = useState('ALL');
    const [sellSelectedTier, setSellSelectedTier] = useState('ALL');
    const [sellSelectedQuality, setSellSelectedQuality] = useState('ALL');
    const [sellSelectedSortOrder, setSellSelectedSortOrder] = useState('NEWEST');
    const [sellSelectedClass, setSellSelectedClass] = useState('ALL');


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

        const handleMarketHistory = (history) => {
            setMarketHistory(history || []);
            setIsLoadingHistory(false);
        };

        const handleMyMarketHistory = (history) => {
            setMyMarketHistory(history || []);
            setIsLoadingHistory(false);
        };

        const handleBuyOrdersUpdate = (newOrders) => {
            setBuyOrders(newOrders || []);
        };

        const handleMarketPrice = (data) => {
            setLoadingPrice(false);
            const price = data.lowestPrice || null;
            setLowestSellPrice(price);
            // Auto-update pricePerUnit to the lowest sell price (or keep minPrice if none)
            if (price) {
                setCreateBuyOrderModal(prev => prev ? ({ ...prev, pricePerUnit: price }) : prev);
            } else {
                // No listings found ÔÇö set to minPrice
                setCreateBuyOrderModal(prev => prev ? ({ ...prev, pricePerUnit: prev.minPrice || 1 }) : prev);
            }
        };

        socket.on('market_listings_update', handleUpdate);
        socket.on('market_action_success', handleSuccess);
        socket.on('market_history_update', handleMarketHistory);
        socket.on('my_market_history_update', handleMyMarketHistory);
        socket.on('buy_orders_update', handleBuyOrdersUpdate);
        socket.on('item_market_price', handleMarketPrice);
        socket.on('error', handleError);

        return () => {
            socket.off('market_listings_update', handleUpdate);
            socket.off('market_action_success', handleSuccess);
            socket.off('market_history_update', handleMarketHistory);
            socket.off('my_market_history_update', handleMyMarketHistory);
            socket.off('buy_orders_update', handleBuyOrdersUpdate);
            socket.off('item_market_price', handleMarketPrice);
            socket.off('error', handleError);
        };
    }, [socket]);

    useEffect(() => {
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
    }, [activeTab, historySubTab, socket]);

    useEffect(() => {
        if (initialSearch) {
            setSearchQuery(initialSearch);
            setSelectedCategory('ALL'); // Reset category to ensure item is found
        }
    }, [initialSearch]);

    const handleBuy = (listing) => {
        if (isPreviewActive) return onPreviewActionBlocked();

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
                quantity: 1, // Default to 1
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

    const handleClaim = (claimId) => {
        if (isPreviewActive) return onPreviewActionBlocked();

        socket.emit('claim_market_item', { claimId });
    };

    // Helper to check if a listing belongs to the current character
    const isOwnListing = (l) => {
        const sellerId = l.seller_character_id || l.item_data?.seller_character_id;
        if (sellerId && gameState.id) {
            return String(sellerId) === String(gameState.id);
        }
        if (l.seller_name && gameState.name && l.seller_id && gameState.user_id) {
            return l.seller_name === gameState.name && l.seller_id === gameState.user_id;
        }
        return false;
    };

    const renderBuyOrdersTab = () => {
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
                // Buy orders encode quality in item_id (e.g. T1_FISHING_ROD_Q3)
                // but inventory stores items as base ID with quality metadata (e.g. T1_FISHING_ROD { quality: 3 })
                // or with signatures (e.g. T1_FISHING_ROD_Q3::PlayerName)
                let hasItem = false;
                const orderId = order.item_id;

                // Parse quality/stars from order item_id
                const qMatch = orderId.match(/^(.+?)_Q(\d)$/);
                const sMatch = orderId.match(/^(.+?)_(\d)STAR$/);
                const orderBaseId = qMatch ? qMatch[1] : (sMatch ? sMatch[1] : orderId);
                const orderQuality = qMatch ? parseInt(qMatch[2]) : null;
                const orderStars = sMatch ? parseInt(sMatch[2]) : null;

                for (const [key, entry] of Object.entries(inventory)) {
                    const keyBase = key.split('::')[0]; // Strip signature
                    const qty = typeof entry === 'object' ? (entry?.amount || 0) : (Number(entry) || 0);
                    if (qty <= 0) continue;

                    // Direct match (exact key or signature-stripped key matches order item_id)
                    if (keyBase === orderId || key === orderId) {
                        hasItem = true;
                        break;
                    }

                    // Quality match: order is T1_FISHING_ROD_Q3, inventory has T1_FISHING_ROD with quality=3
                    if (orderQuality !== null && keyBase === orderBaseId && typeof entry === 'object') {
                        const entryQuality = entry.quality !== undefined ? entry.quality : 0;
                        if (entryQuality === orderQuality) {
                            hasItem = true;
                            break;
                        }
                    }

                    // Stars match: order is RUNE_XP_WOOD_2STAR, inventory has RUNE_XP_WOOD with stars=2
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
                        onClick={() => {
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
                        }}
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
                                placeholder="Search buy orders..."
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
            </div>
        );
    };

    const renderBuyOrderRow = (order, isOwn = false) => {
        const itemInfo = resolveItem(order.item_id);
        const remaining = order.amount - order.filled;
        const tierColor = getTierColor(itemInfo?.tier || 1);

        return (
            <div key={`bo-${order.id}`} style={{
                background: 'var(--glass-bg)',
                borderRadius: '12px',
                padding: '15px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                border: '1px solid var(--border)',
                transition: '0.2s',
                flexWrap: isMobile ? 'wrap' : 'nowrap'
            }}>
                {/* ITEM ICON */}
                <div style={{
                    width: '56px',
                    height: '56px',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${itemInfo?.rarityColor || tierColor}`,
                    flexShrink: 0,
                    position: 'relative'
                }}>
                    {(() => {
                        const icon = itemInfo?.icon || 'unknown.png';
                        const normalizedIcon = icon.startsWith('/') ? icon : `/items/${icon}`;
                        return <img src={normalizedIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
                    })()}
                    {/* Rune Stars */}
                    {itemInfo?.stars > 0 && (
                        <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '0px',
                            zIndex: 10,
                            filter: 'drop-shadow(0px 0px 2px black)'
                        }}>
                            {Array.from({ length: itemInfo.stars }).map((_, i) => (
                                <Star key={`bo-star-${order.id || 'any'}-${i}`} size={8} fill="#FFD700" color="#FFD700" />
                            ))}
                        </div>
                    )}
                </div>

                {/* DETAILS */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: itemInfo?.rarityColor || tierColor }}>
                            {itemInfo?.qualityName && itemInfo?.qualityName !== 'Normal' ? `${itemInfo.qualityName} ` : ''}
                            {itemInfo?.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                            T{itemInfo?.tier}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span>Quantity: <b style={{ color: 'var(--text-main)' }}>{order.amount}</b></span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            Progress: <b style={{ color: '#4caf50' }}>{order.filled}</b> / {order.amount}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Buyer: <span 
                            onClick={() => onInspect && onInspect(order.buyer_name)}
                            style={{ color: 'var(--accent)', cursor: onInspect ? 'pointer' : 'default' }}
                        >{order.buyer_name}</span>
                    </div>
                </div>

                {/* PRICE */}
                <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: '140px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>Price per unit</div>
                    <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: '6px' }}>
                        <Coins size={18} /> {formatNumber(order.price_per_unit)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Total: {formatNumber(remaining * order.price_per_unit)} silver
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
                                border: '1px solid rgba(255, 68, 68, 0.3)',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
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
                                width: isMobile ? '100%' : '100px',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                background: 'var(--accent)',
                                color: '#000',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                transition: '0.2s'
                            }}
                        >
                            FILL
                        </button>
                    )}
                </div>
            </div>
        );
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
                // Show only raw materials/resources, excluding refined ones
                if (l.item_data?.type === 'RAW') return true;
                if (l.item_data?.type === 'RESOURCE') {
                    // Legacy support: check if it's a refined item by ID
                    const isRefined = l.item_id.includes('_BAR') || l.item_id.includes('_PLANK') || l.item_id.includes('_LEATHER') || l.item_id.includes('_CLOTH') || l.item_id.includes('_EXTRACT');
                    if (isRefined) return false;
                    return true;
                }
                return false;
            } else if (selectedCategory === 'REFINED') {
                if (l.item_data?.type === 'REFINED') return true;
                if (l.item_data?.type === 'RESOURCE') {
                    // Legacy support: check if it's a refined item by ID
                    const isRefined = l.item_id.includes('_BAR') || l.item_id.includes('_PLANK') || l.item_id.includes('_LEATHER') || l.item_id.includes('_CLOTH') || l.item_id.includes('_EXTRACT');
                    if (isRefined) return true;
                }
                return false;
            } else if (selectedCategory === 'CONSUMABLE') {
                if (!['FOOD', 'POTION'].includes(l.item_data?.type)) return false;
            }
        }

        // 5. Class Filter (New)
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
                            Sell Orders
                        </button>
                        <button
                            onClick={() => setActiveTab('BUY_ORDERS')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                background: activeTab === 'BUY_ORDERS' ? 'var(--accent-soft)' : 'transparent',
                                color: activeTab === 'BUY_ORDERS' ? 'var(--accent)' : 'var(--text-dim)',
                                border: activeTab === 'BUY_ORDERS' ? '1px solid var(--accent)' : '1px solid transparent',
                                transition: '0.2s'
                            }}>
                            Buy Orders
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
                        <button
                            onClick={() => setActiveTab('HISTORY')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                background: activeTab === 'HISTORY' ? 'var(--accent-soft)' : 'transparent',
                                color: activeTab === 'HISTORY' ? 'var(--accent)' : 'var(--text-dim)',
                                border: activeTab === 'HISTORY' ? '1px solid var(--accent)' : '1px solid transparent',
                                transition: '0.2s'
                            }}>
                            History
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
                                        <div key={`buy-${l.id}`} style={{
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
                                                background: 'var(--slot-bg)',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `1px solid ${resolveItem(l.item_id)?.rarityColor || l.item_data.rarityColor || 'var(--border)'}`,
                                                flexShrink: 0,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                {(() => {
                                                    const resolved = resolveItem(l.item_id, l.item_data?.quality);
                                                    const icon = resolved?.icon || l.item_data?.icon;
                                                    const normalizedIcon = typeof icon === 'string' ? icon.replace('.png', '.webp') : icon;
                                                    return normalizedIcon ? (
                                                        <img
                                                            src={normalizedIcon}
                                                            alt={l.item_data.name}
                                                            style={{ width: l.item_data.scale || '130%', height: l.item_data.scale || '130%', objectFit: 'contain', opacity: 1.0 }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{l.item_data.tier}</span>
                                                    );
                                                })()}
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
                                                            <Star key={`buy-star-${l.id || 'any'}-${i}`} size={6} fill="#FFD700" color="#FFD700" />
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
                                                    <span 
                                                        onClick={() => onInspect && onInspect(l.seller_name)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: onInspect ? 'pointer' : 'default', color: onInspect ? 'var(--accent)' : 'inherit' }}
                                                    >
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

                            {/* SEARCH AND FILTERS (Sell Tab) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '15px' }}>
                                {/* Search Input */}
                                <div style={{ position: 'relative', width: '100%' }}>
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
                                            // Merge metadata for quality/stars consistency
                                            const mergedData = (entry && typeof entry === 'object') ? { ...data, ...entry } : data;
                                            return { id, qty, data: mergedData };
                                        }).filter(item => {
                                            if (item.qty <= 0) return false;
                                            if (!item.data) return false;
                                            if (item.data.type === 'QUEST') return false;

                                            // 1. Keyword Search
                                            if (sellSearchQuery) {
                                                const searchLower = sellSearchQuery.toLowerCase();
                                                const itemName = item.data.name?.toLowerCase() || '';
                                                const itemId = item.id.toLowerCase();
                                                if (!itemName.includes(searchLower) && !itemId.includes(searchLower)) return false;
                                            }

                                            // 2. Tier Filter
                                            if (sellSelectedTier !== 'ALL' && item.data.tier !== parseInt(sellSelectedTier)) return false;

                                            // 3. Quality Filter
                                            const itemQuality = item.data.quality ?? 0;
                                            if (sellSelectedQuality !== 'ALL' && itemQuality !== parseInt(sellSelectedQuality)) return false;

                                            // 4. Category Filter
                                            if (sellSelectedCategory !== 'ALL') {
                                                const type = item.data.type;
                                                if (sellSelectedCategory === 'EQUIPMENT') {
                                                    if (!['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'OFF_HAND', 'GLOVES', 'CAPE'].includes(type) && !type?.startsWith('TOOL')) return false;
                                                } else if (sellSelectedCategory === 'RESOURCE') {
                                                    if (type !== 'RAW' && type !== 'RESOURCE') return false;
                                                    // Exclude refined items from basic resources if they are tagged as refined
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

                                            // 5. Class Filter
                                            if (sellSelectedClass !== 'ALL') {
                                                const requiredClass = getRequiredProficiencyGroup(item.id);
                                                if (requiredClass !== sellSelectedClass.toLowerCase()) return false;
                                            }

                                            return true;
                                        });

                                        // Sorting Logic
                                        inventoryItems.sort((a, b) => {
                                            if (sellSelectedSortOrder === 'NEWEST') return 0; // Default order
                                            if (sellSelectedSortOrder === 'OLDEST') return 0; // Not easily trackable in inventory state

                                            if (sellSelectedSortOrder === 'TIER_DESC') return b.data.tier - a.data.tier;
                                            if (sellSelectedSortOrder === 'TIER_ASC') return a.data.tier - b.data.tier;

                                            return 0;
                                        });

                                        return inventoryItems.map(({ id, qty, data }) => {
                                            const itemRarityColor = data.rarityColor || '#fff';
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
                                                    key={`sell-${id}`}
                                                    onClick={() => {
                                                        if (isPreviewActive) return onPreviewActionBlocked();
                                                        onListOnMarket({ itemId: id, max: qty });
                                                    }}
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
                                                    <div style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.6rem', color: 'var(--text-main)', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 10 }}>T{data.tier}</div>
                                                    <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 'bold', zIndex: 10 }}>x{qty}</div>

                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                                                        {data.icon ? (
                                                            <img src={data.icon} alt={data.name} style={{ width: data.scale || '130%', height: data.scale || '130%', objectFit: 'contain' }} />
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
                                                                    <Star key={`sell-star-${id || 'any'}-${i}`} size={8} fill="#FFD700" color="#FFD700" />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {data.name}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    })()}
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
                                            <div key={`my-${l.id}`} style={{
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
                                                    {(() => {
                                                        const resolved = resolveItem(l.itemId, l.item_data?.quality);
                                                        const icon = resolved?.icon || l.item_data?.icon;
                                                        return icon ? (
                                                            <img src={icon} alt={l.item_data.name} style={{ width: l.item_data.scale || '130%', height: l.item_data.scale || '130%', objectFit: 'contain', opacity: 1.0 }} />
                                                        ) : (
                                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{l.item_data.tier}</span>
                                                        );
                                                    })()}
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
                                                                <Star key={`my-star-${l.id || 'any'}-${i}`} size={6} fill="#FFD700" color="#FFD700" />
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

                    {/* View: BUY_ORDERS */}
                    {activeTab === 'BUY_ORDERS' && renderBuyOrdersTab()}

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
                                    {gameState.state.claims.map(c => {
                                        let isItem = c.type === 'BOUGHT_ITEM' || c.type === 'CANCELLED_LISTING' || c.type === 'SOLD_ITEM';
                                        let name = c.type === 'MARKET_REFUND' ? (c.message || 'Market Refund') : (c.name || 'Item');
                                        let icon = <Coins size={24} color="var(--accent)" />;

                                        let itemData = null;
                                        if (isItem && c.itemId) {
                                            const resolved = resolveItem(c.itemId, c.metadata?.quality);
                                            // Prioritize resolved item data for name, icon, and rarityColor
                                            itemData = {
                                                ...(c.metadata || {}),
                                                ...resolved,
                                                // If metadata has specific runtime info like craftedBy, keep it
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
                                                        // Fallback to Tier text if NO icon exists (matching Buy tab behavior)
                                                        icon = <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{itemData.tier}</span>;
                                                    }
                                                }
                                            }
                                        }

                                        const itemRarityColor = itemData?.rarityColor || '#fff';
                                        const hasGlow = itemRarityColor !== '#fff';

                                        return (
                                            <div key={`claim-${c.id}`} style={{
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
                                                    border: isItem ? `2px solid ${itemRarityColor}` : '1px solid var(--accent)',
                                                    boxShadow: hasGlow ? `0 0 10px ${itemRarityColor}88` : 'none',
                                                    flexShrink: 0,
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                    zIndex: 1
                                                }}>
                                                    {icon}

                                                    {/* Small Tier Label (Top Left) */}
                                                    {itemData?.tier && (
                                                        <div style={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                                            T{itemData.tier}
                                                        </div>
                                                    )}

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
                                                                <Star key={`claim-star-${c.id || 'any'}-${i}`} size={6} fill="#FFD700" color="#FFD700" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ flex: '2 1 0%', minWidth: '150px' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span>{name}</span>
                                                        {c.metadata?.craftedBy && (
                                                            <span 
                                                                onClick={(e) => {
                                                                    if (onInspect) {
                                                                        e.stopPropagation();
                                                                        onInspect(c.metadata.craftedBy);
                                                                    }
                                                                }}
                                                                style={{ fontSize: '0.7rem', color: 'var(--accent)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px', cursor: onInspect ? 'pointer' : 'default' }}
                                                            >
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

                    {/* View: HISTORY */}
                    {activeTab === 'HISTORY' && (
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
                                    <Clock size={32} style={{ marginBottom: '10px', opacity: 0.4 }} />
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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {marketHistory.map((tx, idx) => {
                                                const itemInfo = tx.item_data || {};
                                                const tierColor = getTierColor(itemInfo.tier || 1);
                                                const timeAgo = getTimeAgo(tx.created_at);

                                                return (
                                                    <div key={`hist-global-${tx.id || idx}`} style={{
                                                        background: 'var(--glass-bg)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '10px',
                                                        padding: '10px 14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        transition: '0.2s'
                                                    }}>
                                                        {/* Item icon */}
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '8px',
                                                            background: 'rgba(0, 0, 0, 0.4)',
                                                            border: `1px solid ${tierColor}40`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            overflow: 'hidden',
                                                            position: 'relative'
                                                        }}>
                                                            {(() => {
                                                                const resolved = resolveItem(tx.item_id, itemInfo.quality);
                                                                const icon = resolved?.icon || itemInfo.icon;
                                                                return icon ? (
                                                                    <img src={icon} alt={itemInfo.name || ''} style={{ width: '130%', height: '130%', objectFit: 'contain' }} />
                                                                ) : (
                                                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{itemInfo.tier || '?'}</span>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Item info */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: tierColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                                                x{tx.quantity}
                                                            </div>
                                                        </div>

                                                        {/* Price + time */}
                                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                                <Coins size={14} /> {formatNumber(tx.price_total)}
                                                            </div>
                                                            {tx.quantity > 1 && (
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                                                    {formatNumber(tx.price_per_unit)} ea
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                                                {timeAgo}
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
                                            <User size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                                            <p>You have no market transactions yet.</p>
                                            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Your buys and sales will appear here.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {myMarketHistory.map((tx, idx) => {
                                                const itemInfo = tx.item_data || {};
                                                const tierColor = getTierColor(itemInfo.tier || 1);
                                                const timeAgo = getTimeAgo(tx.created_at);
                                                const isBuyer = tx.role === 'BOUGHT';
                                                const actionLabel = isBuyer ? 'BOUGHT' : 'SOLD';
                                                const actionColor = isBuyer ? '#ff6b6b' : '#4caf50';
                                                const otherParty = isBuyer ? (tx.seller_name || 'Unknown') : (tx.buyer_name || 'Unknown');

                                                return (
                                                    <div key={`hist-personal-${tx.id || idx}`} style={{
                                                        background: 'var(--glass-bg)',
                                                        border: '1px solid var(--border)',
                                                        borderLeft: `3px solid ${actionColor}`,
                                                        borderRadius: '10px',
                                                        padding: '10px 14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px'
                                                    }}>
                                                        {/* Item icon */}
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '8px',
                                                            background: 'rgba(0, 0, 0, 0.4)',
                                                            border: `1px solid ${tierColor}40`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            overflow: 'hidden',
                                                            position: 'relative'
                                                        }}>
                                                            {(() => {
                                                                const resolved = resolveItem(tx.item_id, itemInfo.quality);
                                                                const icon = resolved?.icon || itemInfo.icon;
                                                                return icon ? (
                                                                    <img src={icon} alt={itemInfo.name || ''} style={{ width: '130%', height: '130%', objectFit: 'contain' }} />
                                                                ) : (
                                                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{itemInfo.tier || '?'}</span>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Info */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: tierColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <span style={{
                                                                    background: `${actionColor}20`,
                                                                    color: actionColor,
                                                                    padding: '1px 6px',
                                                                    borderRadius: '4px',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '0.7rem'
                                                                }}>{actionLabel}</span>
                                                                <span>x{tx.quantity}</span>
                                                            </div>
                                                        </div>

                                                        {/* Price + time */}
                                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: actionColor, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                                <Coins size={14} />
                                                                {isBuyer ? '-' : '+'}{formatNumber(isBuyer ? tx.price_total : (tx.price_total - tx.tax_paid))}
                                                            </div>
                                                            {tx.quantity > 1 && (
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                                                    {formatNumber(tx.price_per_unit)} ea
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                                                {timeAgo}
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
                            boxShadow: 'var(--panel-shadow)',
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
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '24px',
                                width: '90%',
                                maxWidth: '400px',
                                boxShadow: 'var(--panel-shadow)'
                            }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>{confirmModal.message}</h3>
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
                                            color: 'var(--bg-main)',
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
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '24px',
                                width: '90%',
                                maxWidth: '450px',
                                boxShadow: 'var(--panel-shadow)'
                            }}>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
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
                                            background: 'var(--glass-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem'
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
                                                        const clamped = Math.min(buyModal.max, parsed);
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
                                                background: 'var(--slot-bg)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                padding: '10px',
                                                color: 'var(--text-main)',
                                                fontSize: '1.1rem',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </div>

                                    <button
                                        onClick={() => setBuyModal(prev => ({ ...prev, quantity: Math.min(prev.max, prev.quantity + 1) }))}
                                        style={{
                                            width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border)',
                                            background: 'var(--glass-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem'
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
                                <div style={{ background: 'var(--slot-bg)', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                        <span>Current Silver:</span>
                                        <span style={{ color: 'var(--text-main)' }}>{silver ? formatNumber(silver) : 0}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                        <span>Total Cost:</span>
                                        <span style={{ color: '#ff4444' }}>- {formatNumber(Math.floor(buyModal.pricePerUnit * buyModal.quantity))}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
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

                {/* CREATE BUY ORDER MODAL */}
                {createBuyOrderModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 3000, backdropFilter: 'blur(5px)'
                    }} onClick={(e) => { if (e.target === e.currentTarget) setCreateBuyOrderModal(null); }}>
                        <div style={{
                            background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: '15px',
                            padding: '30px', width: '95%', maxWidth: '500px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Gavel size={24} /> CREATE BUY ORDER
                                </h3>
                                <button onClick={() => setCreateBuyOrderModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Item Selection with Autocomplete */}
                                <div style={{ position: 'relative' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px' }}>Item</label>
                                    {createBuyOrderModal.itemId ? (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '15px',
                                            background: 'rgba(255,255,255,0.05)', padding: '12px',
                                            borderRadius: '8px', border: '1px solid var(--accent-light)',
                                            position: 'relative'
                                        }}>
                                            {(() => {
                                                const item = resolveItem(createBuyOrderModal.itemId);
                                                const tierColor = getTierColor(item?.tier || 1);
                                                return (
                                                    <>
                                                        <div style={{
                                                            width: '45px', height: '45px', background: 'rgba(0,0,0,0.3)',
                                                            borderRadius: '6px', display: 'flex', alignItems: 'center',
                                                            justifyContent: 'center', border: `1px solid ${tierColor}40`
                                                        }}>
                                                            <img
                                                                src={item?.icon?.startsWith('/') ? item.icon : `/items/${item?.icon || 'unknown.png'}`}
                                                                style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                                                                alt=""
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: tierColor }}>{item?.name || createBuyOrderModal.itemId}</div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Tier {item?.tier || '?'} ÔÇó {item?.category || 'Item'}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setCreateBuyOrderModal(prev => ({
                                                                    ...prev,
                                                                    itemId: '',
                                                                    searchText: '',
                                                                    canHaveQuality: false,
                                                                    canHaveStars: false
                                                                }));
                                                            }}
                                                            style={{
                                                                background: 'rgba(255,255,255,0.1)', border: 'none',
                                                                borderRadius: '50%', width: '30px', height: '30px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                color: 'var(--text-dim)', cursor: 'pointer', transition: '0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,68,68,0.2)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="Enter Item name."
                                            value={createBuyOrderModal.searchText || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCreateBuyOrderModal(prev => ({ ...prev, searchText: val }));

                                                if (val.length >= 2) {
                                                    const search = val.toLowerCase();
                                                    const words = search.trim().split(/\s+/);

                                                    const filters = {
                                                        tier: null,
                                                        type: null,
                                                        rarity: null,
                                                        id: null,
                                                        terms: []
                                                    };

                                                    words.forEach(word => {
                                                        if (word.includes(':')) {
                                                            const [key, value] = word.split(':');
                                                            if (!value) return;
                                                            if (key === 't' || key === 'tier') filters.tier = parseInt(value);
                                                            else if (key === 'c' || key === 'cat' || key === 'type') filters.type = value;
                                                            else if (key === 'r' || key === 'rarity') filters.rarity = value;
                                                            else if (key === 'id') filters.id = value;
                                                        } else {
                                                            filters.terms.push(word);
                                                        }
                                                    });

                                                    const suggestions = searchableItems.filter(item => {
                                                        if (filters.tier && item.tier !== filters.tier) return false;
                                                        if (filters.type && !item.type?.includes(filters.type)) return false;
                                                        if (filters.rarity && !item.rarity?.includes(filters.rarity)) return false;
                                                        if (filters.id && !item.id.toLowerCase().includes(filters.id)) return false;

                                                        if (filters.terms.length > 0) {
                                                            return filters.terms.every(term => {
                                                                const t = term.toLowerCase();
                                                                // Class aliases
                                                                if (t === 'hunter' && item.class === 'hunter') return true;
                                                                if (t === 'warrior' && item.class === 'warrior') return true;
                                                                if ((t === 'mage' || t === 'game') && item.class === 'mage') return true;
                                                                if (t === 'armor' && item.isArmor) return true;

                                                                return item.name.toLowerCase().includes(t) ||
                                                                    item.id.toLowerCase().includes(t) ||
                                                                    (`t${item.tier}` === t)
                                                            });
                                                        }
                                                        return true;
                                                    });
                                                    setItemSuggestions(suggestions.slice(0, 10));
                                                } else {
                                                    setItemSuggestions([]);
                                                }
                                            }}
                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '1rem' }}
                                        />
                                    )}

                                    {/* Suggestion Dropdown */}
                                    {itemSuggestions.length > 0 && (
                                        <div style={{
                                            position: 'absolute', width: '100%', background: '#222',
                                            border: '1px solid var(--border)', borderRadius: '8px',
                                            marginTop: '5px', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                            maxHeight: '200px', overflowY: 'auto'
                                        }}>
                                            {itemSuggestions.map(item => (
                                                <div
                                                    key={`suggest-${item.id}`}
                                                    onClick={() => {
                                                        const tempItem = { ...item };
                                                        const minP = calculateItemSellPrice(tempItem, item.id) || 1;

                                                        setCreateBuyOrderModal(prev => ({
                                                            ...prev,
                                                            itemId: item.id,
                                                            searchText: item.name,
                                                            canHaveQuality: item.canHaveQuality,
                                                            canHaveStars: item.canHaveStars,
                                                            quality: 0,
                                                            stars: 1,
                                                            pricePerUnit: minP,
                                                            minPrice: minP
                                                        }));
                                                        setItemSuggestions([]);
                                                        setLowestSellPrice(null);
                                                        setLoadingPrice(true);
                                                        socket.emit('get_item_market_price', { itemId: item.id });
                                                    }}
                                                    style={{
                                                        padding: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                                                        cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        background: 'transparent', transition: '0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                >
                                                    <div style={{ width: '32px', height: '32px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                                        <img src={item.icon?.startsWith('/') ? item.icon : `/items/${item.icon || 'unknown.png'}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{item.name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Tier {item.tier}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Sub-Category Selection (Rarity / Stars) */}
                                {createBuyOrderModal.itemId && (createBuyOrderModal.canHaveQuality || createBuyOrderModal.canHaveStars) && (
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '10px' }}>
                                            {createBuyOrderModal.canHaveQuality ? 'Select Quality' : 'Select Stars'}
                                        </label>
                                        
                                        {createBuyOrderModal.canHaveQuality ? (
                                            <select
                                                value={createBuyOrderModal.quality}
                                                onChange={(e) => {
                                                    const q = parseInt(e.target.value);
                                                    const baseId = createBuyOrderModal.itemId.replace(/_Q\d+$/, '');
                                                    const finalId = q > 0 ? `${baseId}_Q${q}` : baseId;
                                                    const tempItem = resolveItem(baseId, q);
                                                    const minP = tempItem ? calculateItemSellPrice(tempItem, finalId) || 1 : 1;

                                                    setCreateBuyOrderModal(prev => ({ 
                                                        ...prev, 
                                                        quality: q, 
                                                        minPrice: minP, 
                                                        pricePerUnit: minP 
                                                    }));
                                                    setLowestSellPrice(null);
                                                    setLoadingPrice(true);
                                                    socket.emit('get_item_market_price', { itemId: finalId });
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                    color: (QUALITIES[createBuyOrderModal.quality]?.color || '#fff'),
                                                    fontSize: '0.9rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    outline: 'none'
                                                }}
                                            >
                                                {[0, 1, 2, 3, 4].map(q => (
                                                    <option key={`opt-q-${q}`} value={q} style={{ background: '#1a1a1a', color: QUALITIES[q]?.color }}>
                                                        {QUALITIES[q]?.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <select
                                                value={createBuyOrderModal.stars}
                                                onChange={(e) => {
                                                    const s = parseInt(e.target.value);
                                                    const baseId = createBuyOrderModal.itemId.replace(/_\dSTAR$/, '');
                                                    const finalId = `${baseId}_${s}STAR`;
                                                    const tempItem = resolveItem(baseId, 0);
                                                    if (tempItem) tempItem.stars = s;
                                                    const minP = tempItem ? calculateItemSellPrice(tempItem, finalId) || 1 : 1;

                                                    setCreateBuyOrderModal(prev => ({ 
                                                        ...prev, 
                                                        stars: s, 
                                                        minPrice: minP, 
                                                        pricePerUnit: minP 
                                                    }));
                                                    setLowestSellPrice(null);
                                                    setLoadingPrice(true);
                                                    socket.emit('get_item_market_price', { itemId: finalId });
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                    color: '#FFD700',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    outline: 'none'
                                                }}
                                            >
                                                {[1, 2, 3].map(s => (
                                                    <option key={`opt-s-${s}`} value={s} style={{ background: '#1a1a1a' }}>
                                                        {s} Star{s > 1 ? 's' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px' }}>Quantity</label>
                                        <input
                                            type="number"
                                            value={createBuyOrderModal.amount}
                                            onChange={(e) => setCreateBuyOrderModal(prev => ({ ...prev, amount: e.target.value }))}
                                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '1rem' }}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Price per Unit</label>
                                            {lowestSellPrice && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setCreateBuyOrderModal(prev => ({ ...prev, pricePerUnit: lowestSellPrice }))}>
                                                    Lowest: {formatNumber(lowestSellPrice)} <Coins size={12} />
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number"
                                                value={createBuyOrderModal.pricePerUnit}
                                                onChange={(e) => setCreateBuyOrderModal(prev => ({ ...prev, pricePerUnit: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: `1px solid ${lowestSellPrice && parseInt(createBuyOrderModal.pricePerUnit) >= lowestSellPrice ? 'var(--accent)' : 'var(--border)'}`,
                                                    borderRadius: '8px',
                                                    padding: '12px',
                                                    color: '#fff',
                                                    fontSize: '1rem',
                                                    paddingRight: '40px'
                                                }}
                                            />
                                            <Coins size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
                                        </div>
                                        {lowestSellPrice && parseInt(createBuyOrderModal.pricePerUnit) >= lowestSellPrice && (
                                            <div style={{
                                                marginTop: '8px',
                                                padding: '8px 12px',
                                                background: 'rgba(76, 175, 80, 0.1)',
                                                borderRadius: '6px',
                                                border: '1px solid rgba(76, 175, 80, 0.3)',
                                                fontSize: '0.75rem',
                                                color: '#4caf50',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <Zap size={14} fill="#4caf50" />
                                                <span><b>Instant Buy!</b> Match found in current listings.</span>
                                            </div>
                                        )}
                                        {createBuyOrderModal.minPrice && parseInt(createBuyOrderModal.pricePerUnit || 0) < createBuyOrderModal.minPrice && (
                                            <div style={{
                                                marginTop: '8px', padding: '8px 12px', background: 'rgba(255, 68, 68, 0.1)',
                                                borderRadius: '6px', border: '1px solid rgba(255, 68, 68, 0.3)',
                                                fontSize: '0.75rem', color: '#ff4444', display: 'flex', alignItems: 'center', gap: '8px'
                                            }}>
                                                <AlertTriangle size={14} />
                                                <span>Minimum price allowed is {formatNumber(createBuyOrderModal.minPrice)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                        <span>Total Escrow:</span>
                                        <span style={{ color: '#fff', fontWeight: 'bold' }}>{formatNumber((parseInt(createBuyOrderModal.amount) || 0) * (parseInt(createBuyOrderModal.pricePerUnit) || 0))} Silver</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                                        <Info size={12} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                                        This silver will be locked in escrow. If the order is filled, the items will appear in your Claims tab. 20% tax applies to the seller.
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (!createBuyOrderModal.itemId) return setNotification({ type: 'error', message: 'Please enter an Item ID.' });
                                        if (createBuyOrderModal.minPrice && parseInt(createBuyOrderModal.pricePerUnit || 0) < createBuyOrderModal.minPrice) {
                                            return setNotification({ type: 'error', message: `Price must be at least ${createBuyOrderModal.minPrice}.` });
                                        }

                                        // Finalize Item ID with Quality or Stars
                                        let finalId = createBuyOrderModal.itemId;
                                        if (createBuyOrderModal.canHaveQuality && createBuyOrderModal.quality > 0) {
                                            finalId = `${createBuyOrderModal.itemId}_Q${createBuyOrderModal.quality}`;
                                        } else if (createBuyOrderModal.canHaveStars) {
                                            finalId = `${createBuyOrderModal.itemId}_${createBuyOrderModal.stars}STAR`;
                                        }

                                        socket.emit('create_buy_order', {
                                            ...createBuyOrderModal,
                                            itemId: finalId,
                                            amount: Math.max(1, parseInt(createBuyOrderModal.amount) || 1),
                                            pricePerUnit: Math.max(1, parseInt(createBuyOrderModal.pricePerUnit) || 1)
                                        });
                                        setCreateBuyOrderModal(null);
                                    }}
                                    disabled={createBuyOrderModal.minPrice && parseInt(createBuyOrderModal.pricePerUnit || 0) < createBuyOrderModal.minPrice}
                                    style={{
                                        width: '100%', padding: '15px', borderRadius: '10px', background: 'var(--accent)', color: '#000',
                                        border: 'none',
                                        cursor: (createBuyOrderModal.minPrice && parseInt(createBuyOrderModal.pricePerUnit || 0) < createBuyOrderModal.minPrice) ? 'not-allowed' : 'pointer',
                                        opacity: (createBuyOrderModal.minPrice && parseInt(createBuyOrderModal.pricePerUnit || 0) < createBuyOrderModal.minPrice) ? 0.5 : 1,
                                        fontWeight: 'bold', fontSize: '1.1rem', marginTop: '10px'
                                    }}
                                >
                                    POST BUY ORDER
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FILL BUY ORDER MODAL */}
                {fillOrderModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 3000, backdropFilter: 'blur(5px)'
                    }} onClick={(e) => { if (e.target === e.currentTarget) setFillOrderModal(null); }}>
                        <div style={{
                            background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: '15px',
                            padding: '30px', width: '95%', maxWidth: '450px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>Fill Buy Order</h3>
                                <button onClick={() => setFillOrderModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', marginBottom: '25px' }}>
                                <img src={resolveItem(fillOrderModal.item_id)?.icon || '/items/unknown.png'} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                                <div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{resolveItem(fillOrderModal.item_id)?.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Buyer: {fillOrderModal.buyer_name}</div>
                                </div>
                                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                    <div style={{ color: '#ffd700', fontWeight: 'bold' }}>{formatNumber(fillOrderModal.price_per_unit)} <Coins size={14} /></div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>per unit</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '10px' }}>Quantity to Sell</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => setFillQuantity(Math.max(1, fillQuantity - 1))}
                                        style={{ width: '36px', minWidth: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >-</button>
                                    <input
                                        type="number"
                                        value={fillQuantity}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setFillQuantity('');
                                            } else {
                                                const parsed = parseInt(val);
                                                if (!isNaN(parsed)) {
                                                    const max = fillOrderModal.amount - fillOrderModal.filled;
                                                    const clamped = Math.max(1, Math.min(max, parsed));
                                                    setFillQuantity(clamped);
                                                }
                                            }
                                        }}
                                        onBlur={() => {
                                            if (fillQuantity === '' || fillQuantity < 1) {
                                                setFillQuantity(1);
                                            }
                                        }}
                                        style={{ flex: 1, minWidth: 0, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', color: '#fff', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}
                                    />
                                    <button
                                        onClick={() => setFillQuantity(Math.min(fillOrderModal.amount - fillOrderModal.filled, fillQuantity + 1))}
                                        style={{ width: '36px', minWidth: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >+</button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                                    <span>Max needed: {fillOrderModal.amount - fillOrderModal.filled}</span>
                                    <span
                                        onClick={() => {
                                            // Parse base item ID (strip _Q# and _#STAR suffixes)
                                            let baseId = fillOrderModal.item_id;
                                            const qMatch = baseId.match(/^(.+?)_Q(\d)$/);
                                            if (qMatch) baseId = qMatch[1];
                                            const sMatch = baseId.match(/^(.+?)_(\d)STAR$/);
                                            if (sMatch) baseId = sMatch[1];

                                            // Try exact match first, then base ID
                                            const inv = gameState.state.inventory;
                                            const entry = inv[fillOrderModal.item_id] || inv[baseId];
                                            const inventoryQty = typeof entry === 'object'
                                                ? (entry?.amount || 0)
                                                : (Number(entry) || 0);
                                            setFillQuantity(Math.min(fillOrderModal.amount - fillOrderModal.filled, inventoryQty));
                                        }}
                                        style={{ color: 'var(--accent)', cursor: 'pointer' }}
                                    >USE MAX INVENTORY</span>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: '12px', padding: '20px', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>Gross Silver:</span>
                                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{formatNumber(fillQuantity * fillOrderModal.price_per_unit)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>Market Tax (20%):</span>
                                    <span style={{ color: '#ff6b6b' }}>-{formatNumber(Math.floor(fillQuantity * fillOrderModal.price_per_unit * 0.20))}</span>
                                </div>
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                    <span style={{ color: 'var(--text-main)' }}>Your Profit:</span>
                                    <span style={{ color: '#4caf50' }}>{formatNumber(Math.floor(fillQuantity * fillOrderModal.price_per_unit * 0.80))} Silver</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    socket.emit('fill_buy_order', { orderId: fillOrderModal.id, quantity: fillQuantity });
                                    setFillOrderModal(null);
                                }}
                                style={{
                                    width: '100%', padding: '15px', borderRadius: '10px', background: 'var(--accent)', color: '#000',
                                    border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem'
                                }}
                            >
                                CONFIRM FILL
                            </button>
                        </div>
                    </div>
                )}
            </div >
        </div >
    );
};

export default MarketPanel;
