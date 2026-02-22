import React, { useState } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import { resolveItem, getTierColor, calculateItemSellPrice } from '@shared/items';
import { Package, Shield, Coins, Tag, Trash2, Info, ChevronDown, ChevronUp, ArrowUpAZ, ArrowDownZA, Search, Hammer, Zap } from 'lucide-react';
import ItemActionModal from './ItemActionModal';

const InventoryPanel = ({ gameState, socket, onEquip, onListOnMarket, onShowInfo, onUse, isMobile, onSelectItem }) => {
    const [selectedItemForModal, setSelectedItemForModal] = useState(null);
    const [sellModal, setSellModal] = useState(null);
    const [filter, setFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('NAME'); // NAME, QUALITY, QUANTITY, TYPE, VALUE, DATE
    const [sortDir, setSortDir] = useState('asc');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [usePotionModal, setUsePotionModal] = useState(null);
    const [dismantleModal, setDismantleModal] = useState(null);

    const handleItemClick = (item) => {
        setSelectedItemForModal(item);
        if (onSelectItem) onSelectItem(item);
    };

    const handleQuickSell = (itemId) => {
        const item = resolveItem(itemId);
        if (!item) return;

        const unitPrice = calculateItemSellPrice(item, itemId);

        const entry = gameState?.state?.inventory?.[itemId];
        const qty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);

        setSellModal({
            itemId,
            item,
            max: qty || 0,
            quantity: qty || 1,
            unitPrice
        });
    };

    const handleDismantle = (itemId) => {
        const item = resolveItem(itemId);
        if (!item) return;

        const entry = gameState?.state?.inventory?.[itemId];
        const qty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);

        setDismantleModal({
            itemId,
            item,
            max: qty || 0,
            quantity: qty || 1
        });
    };

    const inventoryItems = Object.entries(gameState?.state?.inventory || {}).map(([id, entry]) => {
        const item = resolveItem(id);
        if (!item) {
            console.warn(`[INVENTORY] Failed to resolve item: ${id}`);
            return null;
        }

        const qty = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);
        if (qty <= 0) return null;
        if (item.noInventorySpace) return null; // Filter out items that don't take space

        // Merge metadata if entry is an object (for craftedBy, craftedAt, stars, etc.)
        const metadata = (entry && typeof entry === 'object') ? entry : {};
        return { ...item, ...metadata, qty, id }; // id is key
    }).filter(Boolean);

    const filteredItems = inventoryItems.filter(item => {
        // Category Filter
        if (filter !== 'ALL') {
            const isGear = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'OFF_HAND', 'CAPE'].includes(item.type) || item.type.startsWith('TOOL');
            const isRaw = ['RESOURCE', 'RAW', 'REFINED', 'CRAFTING_MATERIAL'].includes(item.type) || item.id.includes('_ORE') || item.id.includes('_WOOD');
            const isConsumable = ['FOOD', 'POTION', 'MAP', 'CONSUMABLE', 'CHEST'].includes(item.type);

            if (filter === 'EQUIPMENT' && !isGear) return false;
            if (filter === 'RESOURCE' && !isRaw) return false;
            if (filter === 'CONSUMABLE' && !isConsumable) return false;
        }

        // Search Filter
        if (searchQuery.trim() !== "") {
            const keywords = searchQuery.trim().toLowerCase().split(/\s+/);
            const itemName = item.name.toLowerCase();
            const itemId = item.id.toLowerCase();
            const itemTier = `t${item.tier}`;

            const matchesKeywords = keywords.every(word => {
                return itemName.includes(word) || itemId.includes(word) || itemTier === word;
            });

            if (!matchesKeywords) return false;
        }
        return true;
    });

    // Sorting Logic
    const sortedItems = [...filteredItems].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'NAME':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'QUALITY':
                comparison = (a.quality || 0) - (b.quality || 0);
                break;
            case 'QUANTITY':
                comparison = a.qty - b.qty;
                break;
            case 'TYPE':
                comparison = a.type.localeCompare(b.type);
                break;
            case 'VALUE':
                const valA = calculateItemSellPrice(a, a.id);
                const valB = calculateItemSellPrice(b, b.id);
                comparison = valA - valB;
                break;
            case 'DATE':
                // Using index in the original inventory as a proxy for acquisition date if not stored
                const indexA = Object.keys(gameState?.state?.inventory || {}).indexOf(a.id);
                const indexB = Object.keys(gameState?.state?.inventory || {}).indexOf(b.id);
                comparison = indexA - indexB;
                break;
            case 'TIER':
                comparison = (a.tier || 0) - (b.tier || 0);
                break;
        }
        return sortDir === 'asc' ? comparison : -comparison;
    });

    const isPremium = gameState?.state?.membership?.active && gameState?.state?.membership?.expiresAt > Date.now();
    const baseSlots = isPremium ? 50 : 30;
    const extraSlots = parseInt(gameState?.state?.extraInventorySlots) || 0;
    const totalSlots = baseSlots + extraSlots;

    const itemsToRender = [...sortedItems];
    while (itemsToRender.length < totalSlots) {
        itemsToRender.push(null);
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                marginBottom: '10px'
            }}>
                {/* Row 1: Categories */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                    {['ALL', 'EQUIPMENT', 'RESOURCE', 'CONSUMABLE'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: filter === f ? 'var(--accent-soft)' : 'var(--glass-bg)',
                                color: filter === f ? 'var(--accent)' : 'var(--text-dim)',
                                border: filter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                transition: '0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Row 2: Search & Sort */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', opacity: 0.6 }} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '8px 10px 8px 32px',
                                color: 'var(--text-main)',
                                fontSize: '0.8rem',
                                outline: 'none',
                                transition: '0.2s'
                            }}
                        />
                    </div>

                    {/* Sort Dropdown */}
                    <div style={{ position: 'relative', width: isMobile ? '100px' : '120px', flexShrink: 0 }}>
                        <button
                            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                color: 'var(--text-main)',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ color: 'var(--text-dim)', marginRight: '4px' }}>By:</span>
                            <span style={{ fontWeight: 'bold' }}>{sortBy.charAt(0) + sortBy.slice(1).toLowerCase()}</span>
                            <ChevronDown size={12} style={{ marginLeft: 'auto', opacity: 0.6, transform: isSortMenuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </button>

                        {isSortMenuOpen && (
                            <>
                                <div
                                    onClick={() => setIsSortMenuOpen(false)}
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 5px)',
                                    right: 0,
                                    width: '120px',
                                    background: 'var(--panel-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '5px',
                                    zIndex: 101,
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                }}>
                                    {['DATE', 'QUALITY', 'QUANTITY', 'TYPE', 'VALUE', 'NAME', 'TIER'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => { setSortBy(opt); setIsSortMenuOpen(false); }}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                textAlign: 'left',
                                                background: sortBy === opt ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                border: 'none',
                                                color: sortBy === opt ? 'var(--accent)' : 'var(--text-main)',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                borderRadius: '4px'
                                            }}
                                        >
                                            {opt.charAt(0) + opt.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sort Direction Toggle */}
                    <button
                        onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                        style={{
                            padding: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                        title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortDir === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.75rem', color: 'var(--text-dim)', padding: '0 5px' }}>
                <span>Slots Used:</span>
                <span style={{ color: 'var(--accent)', opacity: 0.8, fontWeight: 'bold' }}>{inventoryItems.length} / {totalSlots}</span>
            </div>




            <div className="scroll-container" style={{ flex: 1, paddingRight: '5px', overflowY: 'auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                    gap: isMobile ? '8px' : '15px',
                    paddingBottom: '80px'
                }}>
                    {itemsToRender.map((item, index) => {
                        // RE-APPLYING FORCED ICON FIX (Bypassing persistent browser cache for items.js)
                        if (item && item.id && item.id.toUpperCase().includes('AXE')) {
                            const tier = item.tier || 1;
                            if (!item.icon) item.icon = `/items/T${tier}_AXE.webp`;
                            if (!item.scale) item.scale = '110%';
                        }

                        // GLOBAL MIGRATION FIX: Force .webp for all icons (Legacy DB data)
                        if (item && item.icon && typeof item.icon === 'string' && item.icon.endsWith('.png')) {
                            item.icon = item.icon.replace('.png', '.webp');
                        }


                        if (!item) {
                            return (
                                <div key={`empty-${index}`} style={{
                                    background: 'var(--slot-bg)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    aspectRatio: '1/1',
                                    minHeight: '80px'
                                }} />
                            );
                        }

                        const tierColor = getTierColor(item.tier);

                        // Specific border color logic

                        // Rarity Color Logic
                        let specificBorderColor = 'var(--border)';
                        if (item.rarityColor) {
                            specificBorderColor = item.rarityColor;
                        } else if (item.rarity) {
                            switch (item.rarity) {
                                case 'COMMON': specificBorderColor = '#9CA3AF'; break; // Gray
                                case 'UNCOMMON': specificBorderColor = '#10B981'; break; // Green
                                case 'RARE': specificBorderColor = '#3B82F6'; break; // Blue
                                case 'EPIC': specificBorderColor = '#F59E0B'; break; // Gold/Orange
                                case 'LEGENDARY': specificBorderColor = '#EF4444'; break; // Red
                                case 'MYTHIC': specificBorderColor = '#A855F7'; break; // Purple
                                default: specificBorderColor = 'var(--border)';
                            }
                        }

                        // If it's a high rarity, add a slight glow or thicker border? 
                        // User asked for "border in color".

                        return (
                            <div
                                key={item.id}
                                id={`item-${item.id}`}
                                onClick={() => handleItemClick(item)}
                                style={{
                                    background: 'var(--slot-bg)',
                                    border: `1px solid ${specificBorderColor}`,
                                    boxShadow: (item.rarity && item.rarity !== 'COMMON') ? `0 0 4px ${specificBorderColor}40` : 'none', // Subtle glow
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
                                <div style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.6rem', color: 'var(--text-main)', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 10 }}>T{item.tier}</div>
                                <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 'bold', zIndex: 10 }}>
                                    x{(item.qty && typeof item.qty === 'object') ? (item.qty.amount || 0) : (item.qty || 0)}
                                </div>
                                <div
                                    onClick={(e) => { e.stopPropagation(); if (gameState?.state?.tutorialStep && gameState.state.tutorialStep !== 'COMPLETED') return; onShowInfo(item); }}
                                    style={{
                                        position: 'absolute',
                                        bottom: 22,
                                        right: 6,
                                        color: 'var(--text-main)',
                                        opacity: 0.7,
                                        cursor: 'pointer',
                                        background: 'var(--accent-soft)',
                                        borderRadius: '50%',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Info"
                                >
                                    <Info size={12} />
                                </div>

                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden' }}>
                                    {!item.noIcon && (item.icon ? (
                                        <img src={item.icon} alt={item.name} style={{ width: item.scale || '130%', height: item.scale || '130%', objectFit: 'contain' }} />
                                    ) : (
                                        <Package size={32} color="#666" style={{ opacity: 0.8 }} />
                                    ))}
                                </div>

                                <div style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--text-dim)',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    width: '100%',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: '1.2',
                                    height: '1.55rem' // Ensure fixed height for 2 lines to keep grid consistent
                                }}>
                                    {item.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Modal */}
            {
                selectedItemForModal && (
                    <ItemActionModal
                        item={selectedItemForModal}
                        isIronman={gameState?.state?.isIronman}
                        onClose={() => setSelectedItemForModal(null)}
                        onEquip={onEquip}
                        onUse={(id) => {
                            setSelectedItemForModal(null);
                            const item = resolveItem(id);

                            if (id === 'NOOB_CHEST') {
                                onUse(id);
                                return;
                            }

                            if (item?.type === 'POTION' || item?.type === 'CHEST' || id.includes('CHEST') || item?.type === 'CONSUMABLE') {
                                setUsePotionModal({
                                    itemId: id,
                                    item: item,
                                    max: inventoryItems.find(i => i.id === id)?.qty || 1,
                                    quantity: 1
                                });
                            } else {
                                onUse(id);
                            }
                        }}
                        onSell={(id) => { setSelectedItemForModal(null); handleQuickSell(id); }}
                        onList={(id, item) => { setSelectedItemForModal(null); onListOnMarket({ itemId: id, max: item.qty }); }}
                        onDismantle={(id) => { setSelectedItemForModal(null); handleDismantle(id); }}
                    />
                )
            }

            {/* Quick Sell Confirmation Modal */}
            {
                sellModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.4)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(8px)'
                    }} onClick={() => setSellModal(null)}>
                        <div style={{
                            background: 'var(--panel-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '24px',
                            width: '90%',
                            maxWidth: '320px',
                            boxShadow: '0 0 30px rgba(0,0,0,0.5)'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Sell {sellModal.item.name}</h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                    Unit Price: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{sellModal.unitPrice} Silver</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>Quantity:</span>
                                    <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>Max: {sellModal.max}</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => setSellModal({ ...sellModal, quantity: 1 })}
                                        style={{ padding: '8px 12px', background: 'var(--accent-soft)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}
                                    >
                                        MIN
                                    </button>

                                    <button
                                        onClick={() => setSellModal({ ...sellModal, quantity: Math.max(1, sellModal.quantity - 1) })}
                                        style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        -
                                    </button>

                                    <input
                                        type="number"
                                        min="1"
                                        max={sellModal.max}
                                        value={sellModal.quantity}
                                        onChange={(e) => {
                                            const rawVal = e.target.value;
                                            if (rawVal === '') {
                                                setSellModal({ ...sellModal, quantity: '' });
                                                return;
                                            }
                                            let val = parseInt(rawVal);
                                            if (isNaN(val)) return;
                                            if (val < 1) val = 1;
                                            if (val > sellModal.max) val = sellModal.max;
                                            setSellModal({ ...sellModal, quantity: val });
                                        }}
                                        onBlur={() => {
                                            if (sellModal.quantity === '' || sellModal.quantity < 1) {
                                                setSellModal({ ...sellModal, quantity: 1 });
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                            color: 'var(--text-main)',
                                            padding: '8px',
                                            textAlign: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '1rem',
                                            outline: 'none'
                                        }}
                                    />

                                    <button
                                        onClick={() => setSellModal({ ...sellModal, quantity: Math.min(sellModal.max, sellModal.quantity + 1) })}
                                        style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        +
                                    </button>

                                    <button
                                        onClick={() => setSellModal({ ...sellModal, quantity: sellModal.max })}
                                        style={{ padding: '8px 12px', background: 'var(--accent-soft)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}
                                    >
                                        MAX
                                    </button>
                                </div>

                                <input
                                    type="range"
                                    min="1"
                                    max={sellModal.max}
                                    value={sellModal.quantity}
                                    onChange={(e) => setSellModal({ ...sellModal, quantity: parseInt(e.target.value) })}
                                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', marginTop: '15px' }}
                                />
                            </div>

                            <div style={{
                                background: 'rgba(255, 215, 0, 0.05)',
                                border: '1px solid rgba(255, 215, 0, 0.1)',
                                borderRadius: '8px',
                                padding: '12px',
                                textAlign: 'center',
                                marginBottom: '20px'
                            }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Profit</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffd700' }}>
                                    <Coins size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                    {formatNumber(sellModal.unitPrice * sellModal.quantity)}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setSellModal(null)}
                                    style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888', borderRadius: '8px', fontWeight: 'bold' }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={() => {
                                        const qty = parseInt(sellModal.quantity) || 1;
                                        socket.emit('sell_item', { itemId: sellModal.itemId, quantity: qty });
                                        setSellModal(null);
                                    }}
                                    style={{ flex: 1, padding: '12px', background: 'var(--accent)', border: 'none', color: 'var(--bg-dark)', borderRadius: '8px', fontWeight: 'bold' }}
                                >
                                    SELL NOW
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Potion Use Modal */}
            {
                usePotionModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 3000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                    }} onClick={() => setUsePotionModal(null)}>
                        <div style={{
                            background: 'var(--panel-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '20px',
                            padding: '24px',
                            width: '90%',
                            maxWidth: '340px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                            position: 'relative',
                            overflow: 'hidden'
                        }} onClick={e => e.stopPropagation()}>
                            {/* Decorative Background */}
                            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%)', zIndex: 0 }} />

                            <div style={{ textAlign: 'center', marginBottom: '25px', position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    margin: '0 auto 15px',
                                    background: 'rgba(212, 175, 55, 0.1)',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid var(--border)'
                                }}>
                                    {!usePotionModal.item.noIcon && (usePotionModal.item.icon ? (
                                        <img src={usePotionModal.item.icon} alt="" style={{ width: usePotionModal.item.scale || '80px', height: usePotionModal.item.scale || '80px', objectFit: 'contain' }} />
                                    ) : (
                                        <Package size={32} color="#d4af37" />
                                    ))}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: '900', letterSpacing: '1px' }}>
                                    {usePotionModal.item.type === 'POTION' ? 'Drink' : usePotionModal.item.type === 'CHEST' || usePotionModal.itemId.includes('CHEST') ? 'Open' : 'Use'} {usePotionModal.item.name}
                                </h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                    Available: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{usePotionModal.max}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px', position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <button
                                        onClick={() => setUsePotionModal({ ...usePotionModal, quantity: 1 })}
                                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem', transition: '0.2s' }}
                                    >MIN</button>

                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--slot-bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '4px' }}>
                                        <button
                                            onClick={() => setUsePotionModal({ ...usePotionModal, quantity: Math.max(1, usePotionModal.quantity - 1) })}
                                            style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem' }}
                                        >-</button>
                                        <input
                                            type="number"
                                            value={usePotionModal.quantity}
                                            onChange={(e) => {
                                                const rawVal = e.target.value;
                                                if (rawVal === '') {
                                                    setUsePotionModal({ ...usePotionModal, quantity: '' });
                                                    return;
                                                }
                                                let val = parseInt(rawVal);
                                                if (isNaN(val)) return;
                                                if (val < 1) val = 1;
                                                if (val > usePotionModal.max) val = usePotionModal.max;
                                                setUsePotionModal({ ...usePotionModal, quantity: val });
                                            }}
                                            onBlur={() => {
                                                if (usePotionModal.quantity === '' || usePotionModal.quantity < 1) {
                                                    setUsePotionModal({ ...usePotionModal, quantity: 1 });
                                                }
                                            }}
                                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', textAlign: 'center', fontSize: '1.1rem', fontWeight: '900', outline: 'none', width: '40px' }}
                                        />
                                        <button
                                            onClick={() => setUsePotionModal({ ...usePotionModal, quantity: Math.min(usePotionModal.max, usePotionModal.quantity + 1) })}
                                            style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem' }}
                                        >+</button>
                                    </div>

                                    <button
                                        onClick={() => setUsePotionModal({ ...usePotionModal, quantity: usePotionModal.max })}
                                        style={{ padding: '8px 12px', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#d4af37', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem', transition: '0.2s' }}
                                    >MAX</button>
                                </div>

                                {/* Info Block (Conditional) */}
                                {usePotionModal.item.type === 'POTION' && (
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '12px',
                                        padding: '15px',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Duration per potion:</span>
                                            <span style={{ color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 'bold' }}>{Math.round((usePotionModal.item.duration || 3600) / 60)} min</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Total Added Time:</span>
                                            <span style={{ color: '#4caf50', fontSize: '0.9rem', fontWeight: '900' }}>
                                                {Math.floor(((usePotionModal.item.duration || 3600) * usePotionModal.quantity) / 3600)}h {Math.round((((usePotionModal.item.duration || 3600) * usePotionModal.quantity) % 3600) / 60)}m
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Chest Info Hint */}
                                {(usePotionModal.item.type === 'CHEST' || usePotionModal.itemId?.includes('CHEST')) && (
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '12px',
                                        padding: '15px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        textAlign: 'center',
                                        color: '#ccc',
                                        fontSize: '0.8rem'
                                    }}>
                                        Contains random resources.<br />
                                        Opening multiple aggregates all rewards.
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 1 }}>
                                <button
                                    onClick={() => setUsePotionModal(null)}
                                    style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#888', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                                >CANCEL</button>
                                <button
                                    onClick={() => {
                                        const qty = parseInt(usePotionModal.quantity) || 1;
                                        onUse(usePotionModal.itemId, qty);
                                        setUsePotionModal(null);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                                        border: 'none',
                                        color: '#000',
                                        borderRadius: '12px',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                                        transition: '0.2s'
                                    }}
                                >CONFIRM</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Dismantle Confirmation Modal */}
            {
                dismantleModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 3000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                    }} onClick={() => setDismantleModal(null)}>
                        <div style={{
                            background: 'var(--panel-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '20px',
                            padding: '24px',
                            width: '90%',
                            maxWidth: '340px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                            position: 'relative',
                            overflow: 'hidden'
                        }} onClick={e => e.stopPropagation()}>
                            {/* Decorative Background */}
                            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)', zIndex: 0 }} />

                            <div style={{ textAlign: 'center', marginBottom: '25px', position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    margin: '0 auto 15px',
                                    background: 'rgba(139, 92, 246, 0.1)',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid var(--border)'
                                }}>
                                    {dismantleModal.item.icon ? (
                                        <img src={dismantleModal.item.icon} alt="" style={{ width: dismantleModal.item.scale || '40px', height: dismantleModal.item.scale || '40px', objectFit: 'contain' }} />
                                    ) : (
                                        <Package size={32} color="#8b5cf6" />
                                    )}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: '900', letterSpacing: '1px' }}>
                                    Dismantle {dismantleModal.item.name}
                                </h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                    Available: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{dismantleModal.max}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px', position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <button
                                        onClick={() => setDismantleModal({ ...dismantleModal, quantity: 1 })}
                                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem', transition: '0.2s' }}
                                    >MIN</button>

                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--slot-bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '4px' }}>
                                        <button
                                            onClick={() => setDismantleModal({ ...dismantleModal, quantity: Math.max(1, dismantleModal.quantity - 1) })}
                                            style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem' }}
                                        >-</button>
                                        <input
                                            type="number"
                                            value={dismantleModal.quantity}
                                            onChange={(e) => {
                                                const rawVal = e.target.value;
                                                if (rawVal === '') {
                                                    setDismantleModal({ ...dismantleModal, quantity: '' });
                                                    return;
                                                }
                                                let val = parseInt(rawVal);
                                                if (isNaN(val)) return;
                                                if (val < 1) val = 1;
                                                if (val > dismantleModal.max) val = dismantleModal.max;
                                                setDismantleModal({ ...dismantleModal, quantity: val });
                                            }}
                                            onBlur={() => {
                                                if (dismantleModal.quantity === '' || dismantleModal.quantity < 1) {
                                                    setDismantleModal({ ...dismantleModal, quantity: 1 });
                                                }
                                            }}
                                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', textAlign: 'center', fontSize: '1.1rem', fontWeight: '900', outline: 'none', width: '40px' }}
                                        />
                                        <button
                                            onClick={() => setDismantleModal({ ...dismantleModal, quantity: Math.min(dismantleModal.max, dismantleModal.quantity + 1) })}
                                            style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem' }}
                                        >+</button>
                                    </div>

                                    <button
                                        onClick={() => setDismantleModal({ ...dismantleModal, quantity: dismantleModal.max })}
                                        style={{ padding: '8px 12px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#8b5cf6', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem', transition: '0.2s' }}
                                    >MAX</button>
                                </div>

                                {/* Reward Preview */}
                                <div style={{
                                    background: 'rgba(139, 92, 246, 0.05)',
                                    border: '1px solid rgba(139, 92, 246, 0.15)',
                                    borderRadius: '12px',
                                    padding: '15px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Estimated Reward</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Zap size={18} fill="#a78bfa" />
                                        {(() => {
                                            const tier = dismantleModal.item.tier || 1;
                                            const quality = dismantleModal.item.quality || 0;
                                            let shardPerUnit = 0;
                                            switch (quality) {
                                                case 0: shardPerUnit = tier * 10; break;
                                                case 1: shardPerUnit = Math.ceil(tier * 12.5); break;
                                                case 2: shardPerUnit = tier * 15; break;
                                                case 3: shardPerUnit = Math.ceil(tier * 17.5); break;
                                                case 4: shardPerUnit = tier * 20; break;
                                                default: shardPerUnit = tier * 10;
                                            }
                                            return formatNumber(shardPerUnit * (parseInt(dismantleModal.quantity) || 0));
                                        })()}
                                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>Rune Shards T1</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 1 }}>
                                <button
                                    onClick={() => setDismantleModal(null)}
                                    style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#888', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >CANCEL</button>
                                <button
                                    onClick={() => {
                                        const qty = parseInt(dismantleModal.quantity) || 1;
                                        if (socket) {
                                            socket.emit('dismantle_item', { itemId: dismantleModal.itemId, quantity: qty });
                                        }
                                        setDismantleModal(null);
                                    }}
                                    style={{
                                        flex: 2,
                                        padding: '14px',
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: '12px',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                                    }}
                                >DISMANTLE NOW</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default InventoryPanel;
