import React, { useState, useEffect } from 'react';
import { resolveItem, calculateItemSellPrice } from '@shared/items';
import { formatNumber } from '@utils/format';
import { Package, Info, Sparkles, ArrowRight, Hammer, Coins, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import ItemActionModal from './ItemActionModal';

const RunePanel = ({ gameState, onShowInfo, isMobile, socket, onListOnMarket }) => {
    const [activeTab, setActiveTab] = useState('shards');
    const [selectedShard, setSelectedShard] = useState(null);
    const [isShardSelectionOpen, setIsShardSelectionOpen] = useState(false);

    // Auto-select T1 Shard on load/tab switch
    useEffect(() => {
        if (activeTab === 'shards') {
            const shard = resolveItem('T1_RUNE_SHARD');
            if (shard) {
                setSelectedShard({ ...shard, id: 'T1_RUNE_SHARD' });
            }
        }
    }, [activeTab]);
    const [isCrafting, setIsCrafting] = useState(false);
    const [craftResult, setCraftResult] = useState(null);
    const [selectedItemForModal, setSelectedItemForModal] = useState(null);
    const [sellModal, setSellModal] = useState(null);
    const [batchModal, setBatchModal] = useState(null);
    const [resultsModal, setResultsModal] = useState(null);

    const inventory = gameState?.state?.inventory || {};

    const handleQuickSell = (itemId) => {
        const item = resolveItem(itemId);
        if (!item) return;

        const unitPrice = calculateItemSellPrice(item, itemId);

        setSellModal({
            itemId,
            item,
            max: gameState?.state?.inventory?.[itemId] || 0,
            quantity: gameState?.state?.inventory?.[itemId] || 1,
            unitPrice
        });
    };

    const handleSelectShard = (item) => {
        if (activeTab === 'shards' || activeTab === 'runes') {
            if (activeTab === 'runes' && item.id.includes('RUNE_') && !item.id.includes('SHARD')) {
                const starsMatch = item.id.match(/_(\d+)STAR$/);
                const tierMatch = item.id.match(/^T(\d+)_/);
                const stars = starsMatch ? parseInt(starsMatch[1]) : 0;
                const tier = tierMatch ? parseInt(tierMatch[1]) : 0;

                if (stars >= 5 && tier >= 10) {
                    alert("This rune has reached its absolute maximum level and tier!");
                    return;
                }
            }
            setSelectedShard(item);
            setCraftResult(null);
        }
    };

    const handleCraft = (qty = 1) => {
        console.log('[RunePanel] Craft/Merge request', { selectedShard, qty, socketConnected: !!socket });
        if (!selectedShard || !socket) return;

        setIsCrafting(true);
        setCraftResult(null);

        // Simulate animation delay then call server
        setTimeout(() => {
            if (activeTab === 'shards') {
                console.log('[RunePanel] Emitting craft_rune', { shardId: 'T1_RUNE_SHARD', qty });
                socket.emit('craft_rune', { shardId: 'T1_RUNE_SHARD', qty });
            } else {
                console.log('[RunePanel] Emitting upgrade_rune', { runeId: selectedShard.id, qty });
                socket.emit('upgrade_rune', { runeId: selectedShard.id, qty });
            }
        }, 1500);
    };

    // Listen for craft success/error
    useEffect(() => {
        if (!socket) return;

        const onCraftSuccess = (result) => {
            setIsCrafting(false);

            if (result.items && result.items.length > 1) {
                // Bulk results - Aggregate by item ID
                const aggregated = result.items.reduce((acc, r) => {
                    const key = r.item;
                    if (!acc[key]) {
                        acc[key] = { ...resolveItem(key), ...r, qty: 0 };
                    }
                    acc[key].qty += 1;
                    return acc;
                }, {});

                setResultsModal({
                    items: Object.values(aggregated).sort((a, b) => (b.stars || 0) - (a.stars || 0)),
                    count: result.count
                });
                setCraftResult(null); // Clear single result to avoid confusion
            } else {
                // Single result
                const item = resolveItem(result.item);
                setCraftResult(item);
                setResultsModal(null);
            }
        };

        const onError = (err) => {
            if (isCrafting) {
                setIsCrafting(false);
                alert(err.message); // Simple feedback
            }
        };

        socket.on('craft_rune_success', onCraftSuccess);
        socket.on('error', onError);

        return () => {
            socket.off('craft_rune_success', onCraftSuccess);
            socket.off('error', onError);
        };
    }, [socket, isCrafting]);

    // Filter items based on active tab
    const filteredItems = Object.entries(inventory)
        .map(([id, qty]) => {
            const item = resolveItem(id);
            if (!item || qty <= 0) return null;

            // Check if item belongs to current tab
            if (activeTab === 'shards') {
                // Show only Rune Shards
                if (item.id.includes('RUNE_SHARD')) return { ...item, id, qty };
            } else if (activeTab === 'runes') {
                // Show finished Runes (type RUNE)
                if (item.type === 'RUNE') return { ...item, id, qty };
            }
            return null;
        })
        .filter(Boolean);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>

            {/* Tab Selection */}
            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => { setActiveTab('shards'); setSelectedShard(null); setCraftResult(null); }}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: activeTab === 'shards' ? 'var(--accent)' : 'var(--panel-bg)',
                        color: activeTab === 'shards' ? '#fff' : 'var(--text-dim)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: '0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <Package size={20} />
                    Shards
                </button>
                <button
                    onClick={() => { setActiveTab('runes'); setSelectedShard(null); }}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: activeTab === 'runes' ? 'var(--accent)' : 'var(--panel-bg)',
                        color: activeTab === 'runes' ? '#fff' : 'var(--text-dim)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: '0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <Sparkles size={20} />
                    Runes
                </button>
            </div>

            <div style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '20px'
            }}>
                <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: 'var(--accent)',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    {activeTab === 'shards' ? <Package size={24} /> : <Sparkles size={24} />}
                    {activeTab === 'shards' ? 'Rune Shards Inventory' : 'Runes Collection'}
                </div>

                {filteredItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        {activeTab === 'shards' ? 'No rune shards found.' : 'No runes crafted yet.'}
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                        gap: isMobile ? '8px' : '15px',
                    }}>
                        {filteredItems.map((item) => {
                            // Specific border color logic
                            let specificBorderColor = 'var(--border)';
                            if (item.rarityColor) {
                                specificBorderColor = item.rarityColor;
                            } else if (item.rarity) {
                                switch (item.rarity) {
                                    case 'COMMON': specificBorderColor = '#9CA3AF'; break;
                                    case 'UNCOMMON': specificBorderColor = '#10B981'; break;
                                    case 'RARE': specificBorderColor = '#3B82F6'; break;
                                    case 'EPIC': specificBorderColor = '#F59E0B'; break;
                                    case 'LEGENDARY': specificBorderColor = '#EF4444'; break;
                                    case 'MYTHIC': specificBorderColor = '#A855F7'; break;
                                    default: specificBorderColor = 'var(--border)';
                                }
                            }

                            const isSelected = selectedShard && selectedShard.id === item.id;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItemForModal(item)}
                                    style={{
                                        background: isSelected ? 'rgba(var(--accent-rgb), 0.2)' : 'var(--slot-bg)',
                                        border: isSelected ? '2px solid var(--accent)' : `1px solid ${specificBorderColor}`,
                                        boxShadow: (item.rarity && item.rarity !== 'COMMON') ? `0 0 4px ${specificBorderColor}40` : 'none',
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
                                        minHeight: '80px',
                                        transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.6rem', color: 'var(--text-main)', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>T{item.tier}</div>
                                    <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 'bold' }}>x{item.qty}</div>

                                    {/* Star Rating */}
                                    {/* Star Rating based on Rarity (Runes Only) */}
                                    {!item.id.includes('RUNE_SHARD') && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 22,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            display: 'flex',
                                            gap: '1px',
                                            zIndex: 2
                                        }}>
                                            {(() => {
                                                const rarityStars = {
                                                    'COMMON': 1,
                                                    'UNCOMMON': 2,
                                                    'RARE': 3,
                                                    'EPIC': 4,
                                                    'LEGENDARY': 5,
                                                    'MYTHIC': 6
                                                };
                                                const starCount = item.stars || rarityStars[item.rarity] || 1;
                                                return Array.from({ length: starCount }).map((_, i) => (
                                                    <Star key={i} size={8} fill="#FFD700" color="#FFD700" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
                                                ));
                                            })()}
                                        </div>
                                    )}

                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden' }}>
                                        {item.icon && !item.id.includes('RUNE_SHARD') ? (
                                            <img src={item.icon} alt={item.name} style={{ width: item.scale || '130%', height: item.scale || '130%', objectFit: 'contain' }} />
                                        ) : (
                                            // Fallback icons
                                            activeTab === 'shards' ?
                                                <Package size={32} color={specificBorderColor} style={{ opacity: 0.8 }} /> :
                                                <Sparkles size={32} color={specificBorderColor} style={{ opacity: 0.8 }} />
                                        )}
                                    </div>

                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.name}
                                    </div>

                                    <div
                                        onClick={(e) => { e.stopPropagation(); onShowInfo(item); }}
                                        style={{
                                            position: 'absolute',
                                            bottom: 22,
                                            right: 6,
                                            color: 'rgba(255,255,255,0.7)',
                                            background: 'rgba(0,0,0,0.5)',
                                            borderRadius: '50%',
                                            padding: '2px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            zIndex: 5
                                        }}>
                                        <Info size={10} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Rune Forge (Visible in both tabs) */}
            {true && (
                <div style={{
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent)', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Hammer size={18} /> {activeTab === 'shards' ? 'Rune Forge' : 'Rune Merge'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center' }}>

                        {/* Square 1: Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <div
                                onClick={() => activeTab === 'runes' && setIsShardSelectionOpen(true)}
                                style={{
                                    width: '80px', height: '80px',
                                    border: activeTab === 'shards' ? '1px solid var(--accent)' : '2px dashed var(--border)',
                                    borderRadius: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--slot-bg)',
                                    position: 'relative',
                                    cursor: activeTab === 'runes' ? 'pointer' : 'default'
                                }}>
                                {selectedShard ? (
                                    <div onClick={(e) => { e.stopPropagation(); setSelectedShard(null); }} style={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer', overflow: 'hidden', borderRadius: '8px' }}>
                                        <div style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.6rem', color: 'var(--text-main)', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 2 }}>T{selectedShard.tier}</div>

                                        {/* Star Rating based on Rarity (Runes Only) */}
                                        {!selectedShard.id.includes('RUNE_SHARD') && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 8,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                display: 'flex',
                                                gap: '1px',
                                                zIndex: 2
                                            }}>
                                                {(() => {
                                                    const rarityStars = {
                                                        'COMMON': 1, 'UNCOMMON': 2, 'RARE': 3,
                                                        'EPIC': 4, 'LEGENDARY': 5, 'MYTHIC': 6
                                                    };
                                                    const starCount = selectedShard.stars || rarityStars[selectedShard.rarity] || 1;
                                                    return Array.from({ length: starCount }).map((_, i) => (
                                                        <Star key={i} size={8} fill="#FFD700" color="#FFD700" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
                                                    ));
                                                })()}
                                            </div>
                                        )}

                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {selectedShard.icon && !selectedShard.id.includes('RUNE_SHARD') ? (
                                                <img src={selectedShard.icon} alt={selectedShard.name} style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                                            ) : (
                                                <Package size={40} color="var(--accent)" style={{ opacity: 0.8 }} />
                                            )}
                                        </div>
                                        <div style={{ position: 'absolute', top: 4, right: 4, fontSize: '0.7rem', fontWeight: 'bold', zIndex: 2, textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                            {selectedShard.id.includes('RUNE_SHARD') ? 'x10' : 'x3'}
                                        </div>
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                                        {activeTab === 'shards' ? 'Select Shard' : 'Select Rune'}
                                    </span>
                                )}
                                {(selectedShard && activeTab === 'runes') && (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setSelectedShard(null); }}
                                        style={{
                                            position: 'absolute', top: -5, right: -5,
                                            background: 'var(--bg-dark)', color: 'var(--text-dim)',
                                            borderRadius: '50%', width: '18px', height: '18px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '10px', cursor: 'pointer', border: '1px solid var(--border)'
                                        }}
                                    >×</div>
                                )}
                            </div>
                            <div style={{ height: '15px', fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px', textAlign: 'center' }}>
                                {selectedShard ? selectedShard.name : ''}
                            </div>
                        </div>

                        {/* Arrow / Animation */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-dim)' }}>
                            <ArrowRight size={24} />
                            {isCrafting && <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                style={{ marginTop: '5px' }}
                            ><Sparkles size={16} color="var(--accent)" /></motion.div>}
                        </div>

                        {/* Square 2: Middle Box (Hammer Animation) */}
                        <div style={{
                            width: '80px', height: '80px',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--slot-bg)'
                        }}>
                            {isCrafting ? (
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                >
                                    <Hammer size={32} color="var(--accent)" />
                                </motion.div>
                            ) : (
                                <div style={{ opacity: 0.2 }}><Hammer size={32} /></div>
                            )}
                        </div>

                        {/* Arrow */}
                        <div style={{ color: 'var(--text-dim)' }}><ArrowRight size={24} /></div>

                        {/* Square 3: Result */}
                        {/* Square 3: Result */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <div style={{
                                width: '80px', height: '80px',
                                border: `2px solid ${craftResult ? (craftResult.rarityColor || '#10B981') : 'var(--border)'}`,
                                borderRadius: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'var(--slot-bg)',
                                boxShadow: craftResult ? `0 0 10px ${craftResult.rarityColor || '#10B981'}40` : 'none'
                            }}>
                                {craftResult ? (
                                    <div onClick={() => onShowInfo(craftResult)} style={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer', overflow: 'hidden', borderRadius: '8px' }}>
                                        <div style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.6rem', color: 'var(--text-main)', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 2 }}>T{craftResult.tier}</div>

                                        {/* Star Rating based on Rarity (Runes Only) */}
                                        {!craftResult.id.includes('RUNE_SHARD') && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 8,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                display: 'flex',
                                                gap: '1px',
                                                zIndex: 2
                                            }}>
                                                {(() => {
                                                    const rarityStars = {
                                                        'COMMON': 1, 'UNCOMMON': 2, 'RARE': 3,
                                                        'EPIC': 4, 'LEGENDARY': 5, 'MYTHIC': 6
                                                    };
                                                    const starCount = craftResult.stars || rarityStars[craftResult.rarity] || 1;
                                                    return Array.from({ length: starCount }).map((_, i) => (
                                                        <Star key={i} size={8} fill="#FFD700" color="#FFD700" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
                                                    ));
                                                })()}
                                            </div>
                                        )}

                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {craftResult.icon ? <img src={craftResult.icon} alt={craftResult.name} style={{ width: '90%', height: '90%', objectFit: 'contain' }} /> : <Sparkles size={32} color={craftResult.rarityColor} />}
                                        </div>
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center' }}>Result</span>
                                )}
                            </div>
                            <div style={{ height: '15px', fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px', textAlign: 'center' }}>
                                {craftResult ? craftResult.name : ''}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (!selectedShard || isCrafting) return;
                            const shardId = activeTab === 'shards' ? 'T1_RUNE_SHARD' : selectedShard.id;
                            const currentQty = inventory[shardId] || 0;
                            const maxBatch = Math.floor(activeTab === 'shards' ? currentQty / 10 : currentQty / 3);

                            if (maxBatch <= 0) return;

                            if (maxBatch === 1) {
                                handleCraft(1);
                            } else {
                                setBatchModal({
                                    item: selectedShard,
                                    max: maxBatch,
                                    quantity: 1,
                                    type: activeTab === 'shards' ? 'FORGE' : 'MERGE'
                                });
                            }
                        }}
                        disabled={isCrafting || !selectedShard || (activeTab === 'shards' ? (inventory['T1_RUNE_SHARD'] || 0) < 10 : (inventory[selectedShard.id] || 0) < 3)}
                        style={{
                            marginTop: '10px',
                            padding: '10px 30px',
                            background: (!selectedShard || (activeTab === 'shards' ? (inventory['T1_RUNE_SHARD'] || 0) < 10 : (inventory[selectedShard.id] || 0) < 3)) ? 'var(--bg-dark)' : 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: (!selectedShard || (activeTab === 'shards' ? (inventory['T1_RUNE_SHARD'] || 0) < 10 : (inventory[selectedShard.id] || 0) < 3)) ? 'not-allowed' : 'pointer',
                            opacity: (!selectedShard || (activeTab === 'shards' ? (inventory['T1_RUNE_SHARD'] || 0) < 10 : (inventory[selectedShard.id] || 0) < 3)) ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'center'
                        }}
                    >
                        {isCrafting ? (activeTab === 'shards' ? 'Forging...' : 'Merging...') : (activeTab === 'shards' ? 'Forge Rune' : 'Merge Runes')}
                    </button>
                </div>
            )}

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.9rem', fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                More {activeTab === 'shards' ? 'forging' : 'merging'} activities coming soon...
            </div>

            {/* SHARD SELECTION MODAL */}
            {isShardSelectionOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setIsShardSelectionOpen(false)}>
                    <div style={{
                        background: 'var(--panel-bg)', border: '1px solid var(--border)',
                        borderRadius: '12px', padding: '20px', width: '90%', maxWidth: '400px',
                        maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '15px'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-bright)', textAlign: 'center' }}>
                            {activeTab === 'shards' ? 'Select Rune Shard' : 'Select Rune'}
                        </div>

                        <div style={{
                            flex: 1, overflowY: 'auto', display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '10px',
                            padding: '5px'
                        }}>
                            {filteredItems.filter(i => activeTab === 'shards' ? i.id.includes('RUNE_SHARD') : (i.id.includes('RUNE_') && !i.id.includes('SHARD'))).map(item => {
                                const specificBorderColor = item.rarityColor || (() => {
                                    switch (item.rarity) {
                                        case 'COMMON': return '#9CA3AF';
                                        case 'UNCOMMON': return '#10B981';
                                        case 'RARE': return '#3B82F6';
                                        case 'EPIC': return '#F59E0B';
                                        case 'LEGENDARY': return '#EF4444';
                                        case 'MYTHIC': return '#A855F7';
                                        default: return 'var(--border)';
                                    }
                                })();

                                return (
                                    <div key={item.id}
                                        onClick={() => {
                                            setSelectedShard(item);
                                            setIsShardSelectionOpen(false);
                                        }}
                                        style={{
                                            background: 'var(--slot-bg)',
                                            border: `1px solid ${specificBorderColor}`,
                                            boxShadow: (item.rarity && item.rarity !== 'COMMON') ? `0 0 4px ${specificBorderColor}40` : 'none',
                                            borderRadius: '8px', padding: '10px', aspectRatio: '1',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', position: 'relative'
                                        }}>

                                        {/* Item Icon */}
                                        {item.icon && !item.id.includes('RUNE_SHARD') ? (
                                            <img src={item.icon} alt={item.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                        ) : (
                                            <Package size={24} color={specificBorderColor} style={{ opacity: 0.8 }} />
                                        )}

                                        <div style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '5px', lineHeight: '1.1' }}>
                                            {item.name.replace(' Rune Shard', '').replace('Rune of ', '')}
                                        </div>
                                        <div style={{ position: 'absolute', top: 2, right: 4, fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>
                                            {item.qty}
                                        </div>

                                        {/* Star Rating based on Rarity (Runes Only) */}
                                        {!item.id.includes('RUNE_SHARD') && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 4,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                display: 'flex',
                                                gap: '1px',
                                                zIndex: 2
                                            }}>
                                                {(() => {
                                                    const rarityStars = {
                                                        'COMMON': 1, 'UNCOMMON': 2, 'RARE': 3,
                                                        'EPIC': 4, 'LEGENDARY': 5, 'MYTHIC': 6
                                                    };
                                                    const starCount = item.stars || rarityStars[item.rarity] || 1;
                                                    return Array.from({ length: starCount }).map((_, i) => (
                                                        <Star key={i} size={6} fill="#FFD700" color="#FFD700" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
                                                    ));
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                );

                            })}
                            {filteredItems.filter(i => activeTab === 'shards' ? i.id.includes('RUNE_SHARD') : (i.id.includes('RUNE_') && !i.id.includes('SHARD'))).length === 0 && (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                                    {activeTab === 'shards' ? 'No Rune Shards found.' : 'No Runes found.'}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsShardSelectionOpen(false)}
                            style={{
                                background: 'transparent', border: '1px solid var(--border)',
                                color: 'var(--text-dim)', padding: '10px', borderRadius: '8px',
                                cursor: 'pointer', fontWeight: 'bold'
                            }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {/* ITEM ACTION MODAL (Same as Inventory) */}
            {selectedItemForModal && (
                <ItemActionModal
                    item={selectedItemForModal}
                    onClose={() => setSelectedItemForModal(null)}
                    onEquip={() => { }}
                    onUse={() => { }}
                    onSell={(id) => handleQuickSell(id)}
                    onList={onListOnMarket ? (id, item) => onListOnMarket(item) : undefined}
                    customAction={selectedItemForModal.id.includes('RUNE_') ? {
                        label: selectedItemForModal.id.includes('SHARD') ? 'USE IN FORGE' : 'USE IN MERGE',
                        icon: <Hammer size={18} />,
                        onClick: (item) => {
                            if (item.id.includes('RUNE_') && !item.id.includes('SHARD')) {
                                const starsMatch = item.id.match(/_(\d+)STAR$/);
                                const tierMatch = item.id.match(/^T(\d+)_/);
                                const stars = starsMatch ? parseInt(starsMatch[1]) : 0;
                                const tier = tierMatch ? parseInt(tierMatch[1]) : 0;

                                if (stars >= 5 && tier >= 10) {
                                    alert("This rune has reached its absolute maximum level and tier!");
                                    return;
                                }
                            }
                            handleSelectShard(item);
                        }
                    } : null}
                />
            )}

            {/* SELL CONFIRMATION MODAL */}
            {sellModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', zIndex: 3000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(5px)'
                }} onClick={() => setSellModal(null)}>
                    <div style={{
                        background: 'var(--panel-bg)', border: '1px solid var(--border)',
                        borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '340px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)', position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>Quick Sell</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>How many do you want to sell?</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            {sellModal.item.icon && (
                                <img src={sellModal.item.icon} alt={sellModal.item.name} style={{ width: '60px', height: '60px', objectFit: 'contain', background: 'var(--slot-bg)', borderRadius: '10px', padding: '5px', border: '1px solid var(--border)' }} />
                            )}
                            <div>
                                <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{sellModal.item.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Price: {formatNumber(sellModal.unitPrice)} / each</div>
                            </div>
                        </div>

                        <div style={{ background: 'var(--slot-bg)', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <button
                                    onClick={() => setSellModal({ ...sellModal, quantity: 1 })}
                                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}
                                >
                                    MIN
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    max={sellModal.max}
                                    value={sellModal.quantity}
                                    onChange={(e) => {
                                        let val = parseInt(e.target.value);
                                        if (isNaN(val)) val = '';
                                        else val = Math.max(1, Math.min(sellModal.max, val));
                                        setSellModal({ ...sellModal, quantity: val });
                                    }}
                                    onBlur={() => {
                                        if (sellModal.quantity === '') {
                                            setSellModal({ ...sellModal, quantity: 1 });
                                        }
                                    }}
                                    style={{
                                        width: '80px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        outline: 'none',
                                        appearance: 'textfield'
                                    }}
                                />
                                <button
                                    onClick={() => setSellModal({ ...sellModal, quantity: sellModal.max })}
                                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}
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
                                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                            />
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '10px', background: 'rgba(255, 215, 0, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 215, 0, 0.1)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Profit</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffd700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Coins size={20} />
                                {formatNumber(sellModal.unitPrice * sellModal.quantity)}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setSellModal(null)}
                                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => {
                                    const qty = parseInt(sellModal.quantity) || 1;
                                    if (socket) socket.emit('sell_item', { itemId: sellModal.itemId, quantity: qty });
                                    setSellModal(null);
                                    setSelectedItemForModal(null); // Close main modal too
                                }}
                                style={{ flex: 1, padding: '12px', background: 'var(--accent)', border: 'none', color: 'var(--bg-dark)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                SELL NOW
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BATCH ACTION MODAL */}
            {batchModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', zIndex: 1100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(5px)'
                }} onClick={() => setBatchModal(null)}>
                    <div style={{
                        background: 'var(--panel-bg)', border: '1px solid var(--border)',
                        borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '340px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)', position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>
                                {batchModal.type === 'FORGE' ? 'Forge Runes' : 'Merge Runes'}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                {batchModal.type === 'FORGE'
                                    ? `How many ${batchModal.item.name}s to forge?`
                                    : `How many ${batchModal.item.name}s to merge?`}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '10px',
                                border: `1px solid ${batchModal.item.rarityColor || 'var(--border)'}`,
                                background: 'var(--slot-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {batchModal.item.id.includes('SHARD') ? <Package size={30} /> : <img src={batchModal.item.icon} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />}
                            </div>
                            <div>
                                <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{batchModal.item.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                                    Cost: {batchModal.type === 'FORGE' ? '50 Shards' : '3 Runes'} / unit
                                </div>
                            </div>
                        </div>

                        <div style={{ background: 'var(--slot-bg)', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <button
                                    onClick={() => setBatchModal({ ...batchModal, quantity: 1 })}
                                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}
                                >
                                    MIN
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    max={batchModal.max}
                                    value={batchModal.quantity}
                                    onChange={(e) => {
                                        let val = parseInt(e.target.value);
                                        if (isNaN(val)) val = '';
                                        else val = Math.max(1, Math.min(batchModal.max, val));
                                        setBatchModal({ ...batchModal, quantity: val });
                                    }}
                                    onBlur={() => {
                                        if (batchModal.quantity === '') {
                                            setBatchModal({ ...batchModal, quantity: 1 });
                                        }
                                    }}
                                    style={{
                                        width: '80px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        outline: 'none',
                                        appearance: 'textfield'
                                    }}
                                />
                                <button
                                    onClick={() => setBatchModal({ ...batchModal, quantity: batchModal.max })}
                                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}
                                >
                                    MAX
                                </button>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max={batchModal.max}
                                value={batchModal.quantity}
                                onChange={(e) => setBatchModal({ ...batchModal, quantity: parseInt(e.target.value) })}
                                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                            />
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '10px', background: 'rgba(255, 215, 0, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 215, 0, 0.1)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Requirement</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {batchModal.quantity * (batchModal.type === 'FORGE' ? 50 : 3)} {batchModal.type === 'FORGE' ? 'Shards' : 'Runes'}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setBatchModal(null)}
                                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => {
                                    handleCraft(batchModal.quantity);
                                    setBatchModal(null);
                                }}
                                style={{ flex: 1, padding: '12px', background: 'var(--accent)', border: 'none', color: 'var(--bg-dark)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK RESULTS MODAL */}
            {resultsModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', zIndex: 1200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(8px)'
                }} onClick={() => setResultsModal(null)}>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            background: 'var(--panel-bg)', border: '1px solid var(--accent)',
                            borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '400px',
                            boxShadow: '0 0 50px rgba(16, 185, 129, 0.2)', position: 'relative',
                            textAlign: 'center'
                        }} onClick={e => e.stopPropagation()}
                    >
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                                <div style={{ background: 'var(--accent)', borderRadius: '50%', padding: '15px', color: 'var(--bg-dark)', boxShadow: '0 0 20px var(--accent)40' }}>
                                    <Sparkles size={32} />
                                </div>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-bright)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                Gained Items
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                You successfully created {resultsModal.count} items!
                            </div>
                        </div>

                        <div style={{
                            maxHeight: '380px', overflowY: 'auto', overflowX: 'hidden',
                            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
                            padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px',
                            marginBottom: '20px',
                            scrollbarWidth: 'thin', scrollbarColor: 'var(--accent) transparent'
                        }}>
                            {resultsModal.items.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: idx * 0.04 }}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                        minWidth: 0
                                    }}
                                >
                                    <div style={{
                                        width: '100%', aspectRatio: '1/1', background: 'var(--slot-bg)', borderRadius: '8px',
                                        border: `1px solid ${item.rarityColor || 'var(--border)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        position: 'relative', overflow: 'hidden',
                                        boxShadow: item.rarityColor ? `0 0 5px ${item.rarityColor}15` : 'none'
                                    }}>
                                        {item.id.includes('SHARD') ? (
                                            <Package size={24} />
                                        ) : (
                                            item.icon ? (
                                                <img src={item.icon} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                            ) : (
                                                <Sparkles size={24} color={item.rarityColor || 'var(--accent)'} style={{ opacity: 0.8 }} />
                                            )
                                        )}
                                        {item.tier && (
                                            <div style={{ position: 'absolute', top: 3, left: 3, fontSize: '0.5rem', color: 'var(--text-main)', fontWeight: '900', textShadow: '0 0 2px rgba(0,0,0,0.8)', zIndex: 5 }}>T{item.tier}</div>
                                        )}

                                        {/* Quantity Badge */}
                                        {item.qty > 1 && (
                                            <div style={{
                                                position: 'absolute', top: 2, right: 2,
                                                background: 'var(--accent)', color: 'var(--bg-dark)',
                                                fontSize: '0.6rem', fontWeight: 'bold', minWidth: '16px',
                                                padding: '1px 3px', borderRadius: '4px', zIndex: 10,
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {item.qty}
                                            </div>
                                        )}

                                        {/* Star Rating for Runes */}
                                        {!item.id.includes('SHARD') && (
                                            <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5px' }}>
                                                {Array.from({ length: item.stars || 1 }).map((_, i) => (
                                                    <Star key={i} size={4} fill="#FFD700" color="#FFD700" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        width: '100%', fontSize: '0.65rem', color: 'var(--text-bright)',
                                        fontWeight: 'bold', overflow: 'hidden',
                                        textAlign: 'center', lineHeight: '1.1',
                                        height: '2.2em', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {item.id.includes('RUNE_') && !item.id.includes('SHARD')
                                            ? item.name.replace(/^T\d+\sRune\sof\s/, '')
                                            : item.name}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <button
                            onClick={() => setResultsModal(null)}
                            style={{
                                width: '100%', padding: '14px', background: 'var(--accent)', border: 'none',
                                color: 'var(--bg-dark)', borderRadius: '10px', fontWeight: 'bold',
                                cursor: 'pointer', fontSize: '1rem', textTransform: 'uppercase',
                                letterSpacing: '1px', boxShadow: '0 4px 15px var(--accent)40'
                            }}
                        >
                            AWESOME!
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default RunePanel;
