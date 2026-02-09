import React, { useState, useEffect } from 'react';
import { Package, Coins, CheckCircle, Clock, X, ArrowLeftRight, ChevronRight, Search, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveItem } from '@shared/items';


const TradePanel = ({ socket, trade, charId, inventory, currentSilver, onClose, isMobile }) => {
    const [localOffer, setLocalOffer] = useState({ items: [], silver: 0 });
    const [isAccepting, setIsAccepting] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [quantityModal, setQuantityModal] = useState({ isOpen: false, item: null, itemId: null, max: 0 });
    const [quantityInput, setQuantityInput] = useState('1');
    const [silverInput, setSilverInput] = useState('');
    const [mobileTab, setMobileTab] = useState('OFFER'); // 'OFFER' or 'INVENTORY'

    const isSender = trade.sender_id === charId;
    const myOffer = isSender ? trade.sender_offer : trade.receiver_offer;
    const partnerOffer = isSender ? trade.receiver_offer : trade.sender_offer;
    const myAccepted = isSender ? trade.sender_accepted : trade.receiver_accepted;
    const partnerAccepted = isSender ? trade.receiver_accepted : trade.sender_accepted;

    // Sync local offer with trade data when trade updates (optional, or just use trade data)
    useEffect(() => {
        setLocalOffer(myOffer);
    }, [trade]);

    const handleUpdateOffer = (newItems, newSilver) => {
        socket.emit('trade_update_offer', {
            tradeId: trade.id,
            items: newItems,
            silver: newSilver
        });
    };

    const handleAccept = () => {
        socket.emit('trade_accept', { tradeId: trade.id });
    };

    const handleCancel = () => {
        socket.emit('trade_cancel', { tradeId: trade.id });
        onClose();
    };

    const handleItemClick = (itemId, item, currentAmount) => {
        setQuantityModal({
            isOpen: true,
            item,
            itemId,
            max: currentAmount
        });
        setQuantityInput('1');
    };

    const confirmAddItem = () => {
        if (!quantityModal.itemId) return;
        const amount = parseInt(quantityInput);
        if (amount <= 0 || amount > quantityModal.max) return;

        addItem(quantityModal.itemId, quantityModal.item, amount);
        setQuantityModal({ isOpen: false, item: null, itemId: null, max: 0 });
    };

    const addItem = (itemId, item, amountToAdd = 1) => {
        const existing = localOffer.items.find(it => it.id === itemId);
        let newItems;
        if (existing) {
            newItems = localOffer.items.map(it => it.id === itemId ? { ...it, amount: it.amount + amountToAdd } : it);
        } else {
            newItems = [...localOffer.items, { id: itemId, amount: amountToAdd, name: item.name }];
        }
        handleUpdateOffer(newItems, localOffer.silver);
    };

    const removeItem = (itemId) => {
        const newItems = localOffer.items.map(it => {
            if (it.id === itemId) return { ...it, amount: it.amount - 1 };
            return it;
        }).filter(it => it.amount > 0);
        handleUpdateOffer(newItems, localOffer.silver);
    };

    const handleAddSilver = () => {
        const amountToAdd = parseInt(silverInput) || 0;
        if (amountToAdd <= 0) return;

        const maxAddable = Math.max(0, currentSilver - localOffer.silver);
        const finalAdd = Math.min(amountToAdd, maxAddable);

        const newTotal = localOffer.silver + finalAdd;
        handleUpdateOffer(localOffer.items, newTotal);
        setSilverInput('');
    };

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 11999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
            <div style={{
                position: 'fixed',
                zIndex: 12000,
                inset: isMobile ? '3% 2%' : '5% 10%',
                background: isMobile ? '#121212' : 'rgba(18,18,18,0.95)',
                backdropFilter: isMobile ? 'none' : 'blur(10px)',
                display: 'flex', flexDirection: 'column',
                padding: isMobile ? '8px' : '15px',
                fontSize: isMobile ? '0.7rem' : '0.9rem',
                borderRadius: isMobile ? '12px' : '20px',
                border: '1px solid var(--border)',
                boxShadow: isMobile ? '0 10px 40px rgba(0,0,0,0.8)' : '0 20px 60px rgba(0,0,0,0.8)'
            }}>
                {/* Header */}
                <div style={{
                    maxWidth: '1200px', width: '100%', margin: '0 auto',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px' }}>
                        <ArrowLeftRight color="var(--accent)" size={isMobile ? 18 : 20} />
                        <h1 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.5rem', fontWeight: '900', color: '#fff', letterSpacing: '2px' }}>TRADING</h1>
                        {!isMobile && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', padding: '4px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '20px' }}>
                                ID: {trade.id.slice(0, 8)}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleCancel} style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)', padding: '8px 12px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                            CANCEL TRADE
                        </button>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Mobile Tabs */}
                {
                    isMobile && (
                        <div style={{ display: 'flex', gap: '10px', padding: '10px 0' }}>
                            <button
                                onClick={() => setMobileTab('OFFER')}
                                style={{
                                    flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 'bold',
                                    background: mobileTab === 'OFFER' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                    color: mobileTab === 'OFFER' ? '#000' : '#888',
                                    border: 'none', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                            >
                                OFFERS
                            </button>
                            <button
                                onClick={() => setMobileTab('INVENTORY')}
                                style={{
                                    flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 'bold',
                                    background: mobileTab === 'INVENTORY' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                    color: mobileTab === 'INVENTORY' ? '#000' : '#888',
                                    border: 'none', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                            >
                                INVENTORY
                            </button>
                        </div>
                    )
                }

                <div style={{
                    maxWidth: '1200px', width: '100%', margin: '10px auto',
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: isMobile ? (mobileTab === 'OFFER' ? '1fr 1fr' : '1fr') : '1fr 1.4fr 1fr',
                    gap: isMobile ? '8px' : '15px',
                    overflowY: 'hidden',
                    overflowX: 'hidden'
                }}>
                    {/* YOUR SIDE */}
                    {(!isMobile || mobileTab === 'OFFER') && (
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: isMobile ? '10px' : '15px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '10px' : '15px' }}>
                                <h3 style={{ margin: 0, fontSize: isMobile ? '0.9rem' : '0.9rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>YOUR OFFER</h3>
                                {myAccepted ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#44ff44', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        <CheckCircle size={16} /> ACCEPTED
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Awaiting your confirmation...</div>
                                )}
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {myOffer.items.length === 0 && myOffer.silver === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                        Your offer is empty. {isMobile ? 'Go to Inventory tab to add items.' : 'Click items in the middle to add them.'}
                                    </div>
                                )}
                                {myOffer.items.map(item => {
                                    const def = resolveItem(item.id);
                                    const Icon = def?.icon;
                                    return (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '8px' : '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: `1px solid ${def?.rarityColor || 'rgba(255,255,255,0.1)'}` }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px' }}>
                                                <div style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                    {Icon ? (
                                                        typeof Icon === 'string' ? <img src={Icon} alt={def?.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Icon size={isMobile ? 16 : 18} color={def.rarityColor || "var(--text-dim)"} />
                                                    ) : <Package size={isMobile ? 16 : 18} color="var(--text-dim)" />}
                                                </div>
                                                <span style={{ color: def?.rarityColor || '#fff', fontSize: isMobile ? '0.8rem' : '0.9rem', fontWeight: '600' }}>{item.amount}x {def?.tier ? `T${def.tier} ` : ''}{def?.name || item.name || 'Unknown Item'}</span>
                                            </div>
                                            <button onClick={() => removeItem(item.id)} style={{ color: '#ff4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={isMobile ? 14 : 16} /></button>
                                        </div>
                                    );
                                })}
                                {myOffer.silver > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '8px' : '12px', background: 'rgba(212,175,55,0.05)', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px' }}>
                                            <Coins size={isMobile ? 16 : 18} color="var(--accent)" />
                                            <span style={{ color: 'var(--accent)', fontWeight: '900', fontSize: isMobile ? '0.85rem' : '1rem' }}>{myOffer.silver.toLocaleString()} Silver</span>
                                        </div>
                                        <button onClick={() => handleUpdateOffer(myOffer.items, 0)} style={{ color: '#ff4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={isMobile ? 14 : 16} /></button>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: isMobile ? '10px' : '20px', paddingTop: isMobile ? '10px' : '20px', borderTop: '1px solid var(--border)' }}>
                                <button
                                    onClick={handleAccept}
                                    disabled={myAccepted}
                                    style={{
                                        width: '100%', padding: isMobile ? '10px' : '15px', borderRadius: '12px',
                                        background: myAccepted ? 'rgba(68,255,68,0.2)' : 'var(--accent)',
                                        color: myAccepted ? '#44ff44' : '#000',
                                        fontWeight: '900', border: 'none', cursor: myAccepted ? 'default' : 'pointer',
                                        transition: '0.2s', boxShadow: myAccepted ? 'none' : '0 4px 15px rgba(212,175,55,0.3)',
                                        fontSize: isMobile ? '0.9rem' : '1rem'
                                    }}
                                >
                                    {myAccepted ? 'WAITING FOR PARTNER...' : 'ACCEPT OFFER'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* INVENTORY / SELECTIONS */}
                    {(!isMobile || mobileTab === 'INVENTORY') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '15px', overflow: 'hidden' }}>
                            <div className="glass-panel" style={{ padding: isMobile ? '10px' : '15px', borderRadius: '16px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '5px' : '10px' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px' }}>ADD SILVER</div>
                                    <div
                                        onClick={() => setSilverInput(Math.max(0, currentSilver - localOffer.silver).toString())}
                                        style={{ fontSize: '0.7rem', color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        MAX: {Math.max(0, currentSilver - localOffer.silver).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={silverInput}
                                        onChange={(e) => setSilverInput(e.target.value)}
                                        style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', color: 'var(--accent)', padding: isMobile ? '8px' : '10px', borderRadius: '8px', fontWeight: '900', fontSize: isMobile ? '0.9rem' : '1rem' }}
                                    />
                                    <button
                                        onClick={handleAddSilver}
                                        style={{
                                            padding: isMobile ? '8px 12px' : '10px 15px', borderRadius: '8px', border: 'none',
                                            background: 'var(--accent)', color: '#000', fontWeight: '900', cursor: 'pointer',
                                            fontSize: isMobile ? '0.8rem' : '1rem'
                                        }}
                                    >
                                        ADD
                                    </button>
                                </div>
                            </div>

                            <div className="glass-panel" style={{ flex: 1, padding: isMobile ? '10px' : '15px', borderRadius: '16px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '5px' : '10px' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px' }}>YOUR INVENTORY</div>
                                    <div style={{ position: 'relative', width: isMobile ? '100px' : '120px' }}>
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={filterText}
                                            onChange={(e) => setFilterText(e.target.value)}
                                            style={{
                                                width: '100%', padding: '4px 8px 4px 24px', borderRadius: '4px',
                                                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                                                color: '#fff', fontSize: '0.7rem', outline: 'none'
                                            }}
                                        />
                                        <Search size={12} style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                    </div>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'min-content', gap: isMobile ? '5px' : '8px', paddingRight: '5px' }}>
                                    {Object.entries(inventory || {})
                                        .filter(([id, entry]) => {
                                            if (!filterText) return true;
                                            const item = resolveItem(id);
                                            return item && item.name.toLowerCase().includes(filterText.toLowerCase());
                                        })
                                        .map(([id, entry]) => {
                                            const item = resolveItem(id);
                                            if (!item) return null;
                                            const totalAmount = (entry && typeof entry === 'object') ? (entry.amount || 0) : (Number(entry) || 0);

                                            const offeredItem = localOffer.items.find(it => it.id === id);
                                            const offeredAmount = offeredItem ? offeredItem.amount : 0;
                                            const amount = totalAmount - offeredAmount;

                                            if (amount <= 0) return null;

                                            return (() => {
                                                // Extract stars from rune ID (e.g., T1_RUNE_MINING_XP_2STAR)
                                                const starsMatch = id.match(/_(\d+)STAR$/);
                                                const stars = starsMatch ? parseInt(starsMatch[1]) : 0;
                                                const isRune = id.includes('_RUNE_') && !id.includes('SHARD');

                                                return (
                                                    <div
                                                        key={id}
                                                        onClick={() => handleItemClick(id, item, amount)}
                                                        style={{
                                                            aspectRatio: '1', background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                                                            border: `1px solid ${item.rarityColor || 'rgba(255,255,255,0.1)'}`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            cursor: 'pointer', transition: '0.2s', position: 'relative', overflow: 'hidden',
                                                            flexDirection: 'column', padding: '4px'
                                                        }}
                                                        title={`${item.tier ? `T${item.tier} ` : ''}${item.name}${stars ? ` (${stars}★)` : ''}`}
                                                    >
                                                        {/* Tier Badge */}
                                                        {item.tier && <div style={{ position: 'absolute', top: '2px', left: '4px', fontSize: '0.5rem', fontWeight: '900', color: '#fff', textShadow: '0 0 3px #000' }}>T{item.tier}</div>}

                                                        {/* Star Rating for Runes */}
                                                        {isRune && stars > 0 && (
                                                            <div style={{ position: 'absolute', top: '2px', right: '4px', display: 'flex', gap: '0px' }}>
                                                                {Array.from({ length: stars }).map((_, i) => (
                                                                    <Star key={i} size={6} fill="#FFD700" color="#FFD700" style={{ filter: 'drop-shadow(0 0 1px #000)' }} />
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Icon */}
                                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                            {item.icon ? (
                                                                typeof item.icon === 'string' ? <img src={item.icon} alt={item.name} style={{ width: '70%', height: '70%', objectFit: 'contain' }} /> : <item.icon size={20} color={item.rarityColor || "var(--text-dim)"} />
                                                            ) : <Package size={20} color="var(--text-dim)" />}
                                                        </div>

                                                        {/* Quantity */}
                                                        <div style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '0.55rem', fontWeight: 'bold', color: '#fff', textShadow: '0 0 3px #000' }}>{amount}</div>

                                                        {/* Item Name */}
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textAlign: 'center', width: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: '600', lineHeight: '1.2' }}>{item.name}</div>
                                                    </div>
                                                )
                                            })();
                                        })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PARTNER SIDE */}
                    {(!isMobile || mobileTab === 'OFFER') && (
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', background: 'rgba(144,213,255,0.02)', padding: isMobile ? '10px' : '15px', borderRadius: '16px', border: '1px solid rgba(144,213,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '10px' : '15px' }}>
                                <h3 style={{ margin: 0, fontSize: isMobile ? '0.9rem' : '0.9rem', fontWeight: '900', color: '#90d5ff', letterSpacing: '1px' }}>THEIR OFFER</h3>
                                {partnerAccepted ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#44ff44', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        <CheckCircle size={16} /> ACCEPTED
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={16} /> WAITING...
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {partnerOffer.items.length === 0 && partnerOffer.silver === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                        Their offer is empty.
                                    </div>
                                )}
                                {partnerOffer.items.map(item => {
                                    const def = resolveItem(item.id);
                                    const Icon = def?.icon;
                                    return (
                                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', padding: isMobile ? '8px' : '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: `1px solid ${def?.rarityColor || 'rgba(255,255,255,0.1)'}` }}>
                                            <div style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                {Icon ? (
                                                    typeof Icon === 'string' ? <img src={Icon} alt={def?.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Icon size={isMobile ? 16 : 18} color={def.rarityColor || "var(--text-dim)"} />
                                                ) : <Package size={isMobile ? 16 : 18} color="var(--text-dim)" />}
                                            </div>
                                            <span style={{ color: def?.rarityColor || '#fff', fontSize: isMobile ? '0.8rem' : '0.9rem', fontWeight: '600' }}>{item.amount}x {def?.tier ? `T${def.tier} ` : ''}{def?.name || item.name || 'Unknown Item'}</span>
                                        </div>
                                    );
                                })}
                                {partnerOffer.silver > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', padding: isMobile ? '8px' : '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                        <Coins size={isMobile ? 16 : 18} color="var(--accent)" />
                                        <span style={{ color: 'var(--accent)', fontWeight: '900', fontSize: isMobile ? '0.85rem' : '1rem' }}>{partnerOffer.silver.toLocaleString()} Silver</span>
                                    </div>
                                )}
                            </div>

                            {partnerAccepted && !myAccepted && (
                                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(68,255,68,0.1)', borderRadius: '12px', border: '1px solid rgba(68,255,68,0.3)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#44ff44', marginBottom: '4px' }}>Offer Accepted!</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Review the items and accept to finalize the trade.</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <style>{`
                .glass-panel {
                    backdrop-filter: blur(5px);
                }
            `}</style>

                <AnimatePresence>
                    {quantityModal.isOpen && (
                        <div style={{
                            position: 'fixed', inset: 0, zIndex: 12100,
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }}>
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                style={{
                                    background: '#1a1a1a', borderRadius: '16px', border: '1px solid var(--border)',
                                    padding: '16px', width: '90%', maxWidth: '360px',
                                    boxSizing: 'border-box',
                                    display: 'flex', flexDirection: 'column', gap: '12px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                }}
                            >
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', textAlign: 'center' }}>Add Quantity</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                                    <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={quantityModal.item?.name}>
                                        {quantityModal.item?.name}
                                    </span>
                                    <span style={{ opacity: 0.5 }}>|</span>
                                    <span>Max: {quantityModal.max}</span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        value={quantityInput}
                                        onChange={(e) => setQuantityInput(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') confirmAddItem();
                                            if (e.key === 'Escape') setQuantityModal({ ...quantityModal, isOpen: false });
                                        }}
                                        style={{
                                            flex: 1, minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)',
                                            background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1.2rem', textAlign: 'center',
                                            fontWeight: 'bold', outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={() => setQuantityInput(quantityModal.max.toString())}
                                        style={{
                                            padding: '0 12px', borderRadius: '8px', border: '1px solid var(--accent)',
                                            background: 'rgba(212,175,55,0.1)', color: 'var(--accent)', fontWeight: 'bold',
                                            cursor: 'pointer', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        MAX
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                                    <button
                                        onClick={() => setQuantityModal({ ...quantityModal, isOpen: false })}
                                        style={{
                                            flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'rgba(255,255,255,0.05)', color: '#ccc', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        onClick={confirmAddItem}
                                        style={{
                                            flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                                            background: 'var(--accent)', color: '#000', fontWeight: '900', cursor: 'pointer',
                                            boxShadow: '0 4px 15px rgba(212,175,55,0.2)', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ADD
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                    }
                </AnimatePresence >
            </div >
        </>
    );
};

export default TradePanel;
