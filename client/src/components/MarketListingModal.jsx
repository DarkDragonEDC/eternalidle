import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatNumber, formatSilver } from '@utils/format';
import { Package, X, Star, Zap } from 'lucide-react';
import { resolveItem, getTierColor, formatItemId, calculateItemSellPrice } from '@shared/items';

const MarketListingModal = ({ listingItem, onClose, socket }) => {
    const store = useAppStore();
    const { marketPriceUpdate, setMarketPriceUpdate } = store;

    const [amount, setAmount] = useState('1');
    const [unitPrice, setUnitPrice] = useState('');
    const [currentMarketPrice, setCurrentMarketPrice] = useState(null);
    const [highestBuyOrder, setHighestBuyOrder] = useState(null);
    const [loadingPrice, setLoadingPrice] = useState(false);

    useEffect(() => {
        if (listingItem) {
            setAmount('1');
            const itemData = resolveItem(listingItem);
            const minP = itemData ? (calculateItemSellPrice(itemData, listingItem.itemId) || 1) : 1;
            setUnitPrice(minP.toString());
            setCurrentMarketPrice(null);
            setHighestBuyOrder(null);

            // Request current market price for this item
            if (socket) {
                setLoadingPrice(true);
                socket.emit('get_item_market_price', { itemId: listingItem.itemId });
            }
        }
    }, [listingItem, socket]);

    // React to store updates
    useEffect(() => {
        if (!marketPriceUpdate) return;

        if (marketPriceUpdate.itemId === listingItem?.itemId) {
            setCurrentMarketPrice(marketPriceUpdate.lowestPrice);
            setHighestBuyOrder(marketPriceUpdate.highestBuyOrder);
            setLoadingPrice(false);
            setMarketPriceUpdate(null); // Clear once consumed
        }
    }, [marketPriceUpdate, listingItem?.itemId, setMarketPriceUpdate]);

    if (!listingItem) return null;

    const itemData = resolveItem(listingItem);
    const tierColor = getTierColor(itemData?.tier || 1);
    const maxQty = (() => {
        const raw = listingItem.max || listingItem.qty || 0;
        return typeof raw === 'object' ? (raw.amount || 0) : (Number(raw) || 0);
    })();

    const minPrice = itemData ? (calculateItemSellPrice(itemData, listingItem.itemId) || 1) : 1;

    const handleConfirm = () => {
        const parsedAmount = parseInt(amount);
        const parsedPrice = parseFloat(unitPrice.toString().replace(',', '.'));

        if (isNaN(parsedAmount) || parsedAmount <= 0) return;
        if (isNaN(parsedPrice) || parsedPrice < minPrice) return;

        const total = Math.floor(parsedAmount * parsedPrice);

        if (total <= 0) return;

        socket.emit('list_market_item', {
            itemId: listingItem.itemId,
            amount: parsedAmount,
            price: total
        });

        onClose();
    };

    const parsedAmount = parseInt(amount) || 0;
    const parsedPrice = parseFloat(unitPrice.toString().replace(',', '.')) || 0;
    const totalPrice = Math.floor(parsedAmount * parsedPrice);
    const fee = Math.floor(totalPrice * 0.20); // Sync with server: 20% tax
    const receive = totalPrice - fee;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '400px',
                padding: '25px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: 'var(--panel-shadow)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: '0px', color: 'var(--text-main)', fontSize: '1.2rem' }}>List Item on Market</h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'rgb(136, 136, 136)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Item Info */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'var(--glass-bg)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'var(--slot-bg)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${itemData?.rarityColor || tierColor || 'var(--border)'}`,
                        position: 'relative',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
                    }}>
                        {(() => {
                            const icon = itemData?.icon;
                            const normalizedIcon = typeof icon === 'string' ? icon.replace(/\.(png|jpg|jpeg)$/, '.webp') : icon;
                            return normalizedIcon ? (
                                <img src={normalizedIcon} alt={itemData.name} style={{ width: '130%', height: '130%', objectFit: 'contain' }} />
                            ) : (
                                <span style={{ color: tierColor, fontWeight: 'bold' }}>T{itemData?.tier}</span>
                            );
                        })()}
                        {/* Rune Stars Overlay */}
                        {itemData?.stars > 0 && (
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
                                border: '1px solid rgba(255,215,0,0.3)',
                                zIndex: 10
                            }}>
                                {Array.from({ length: itemData.stars }).map((_, i) => (
                                    <Star key={i} size={7} fill="#FFD700" color="#FFD700" />
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '1rem' }}>
                            {itemData?.name || formatItemId(listingItem.itemId)}
                            {itemData?.enhancement > 0 && <span style={{ color: '#4ade80', marginLeft: '8px' }}>+{itemData.enhancement}</span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>Owned: <b style={{ color: 'var(--text-main)' }}>{maxQty}</b></div>
                    </div>
                </div>

                {/* Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* Amount Input */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Amount to sell:</label>
                            <button
                                onClick={() => setAmount(String(maxQty))}
                                style={{
                                    background: 'var(--accent-soft)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--accent)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                MAX
                            </button>
                        </div>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                    setAmount('');
                                } else {
                                    const parsed = parseInt(val);
                                    if (!isNaN(parsed)) {
                                        setAmount(String(Math.min(maxQty, parsed)));
                                    }
                                }
                            }}
                            onBlur={() => {
                                if (amount === '' || amount === '0' || parseInt(amount) === 0) {
                                    setAmount('1');
                                }
                            }}
                            style={{
                                width: '100%',
                                background: 'var(--slot-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '10px',
                                color: 'rgb(255, 255, 255)',
                                outline: 'none',
                                fontWeight: 'bold',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Unit Price Input */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Price per Unit (Silver):</label>
                            {/* Market Price Helper */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div
                                    style={{
                                        fontSize: '0.75rem',
                                        color: currentMarketPrice ? 'var(--accent)' : 'var(--text-dim)',
                                        cursor: currentMarketPrice ? 'pointer' : 'default',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    onClick={() => {
                                        if (currentMarketPrice) setUnitPrice(String(currentMarketPrice));
                                    }}
                                >
                                    {loadingPrice ? 'Checking...' : (
                                        currentMarketPrice
                                            ? <>Lowest: <b>{formatNumber(currentMarketPrice)}</b></>
                                            : 'No listings'
                                    )}
                                </div>
                                {highestBuyOrder && (
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            color: 'rgb(68, 255, 68)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                        onClick={() => setUnitPrice(String(highestBuyOrder))}
                                        title="Highest current Buy Order"
                                    >
                                        Buy Order: <b>{formatNumber(highestBuyOrder)}</b>
                                    </div>
                                )}
                            </div>
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={unitPrice}
                            onChange={(e) => {
                                // Allow only digits
                                const val = e.target.value.replace(/\D/g, '');
                                setUnitPrice(val);
                            }}
                            placeholder={minPrice.toString()}
                            style={{
                                width: '100%',
                                background: 'var(--slot-bg)',
                                border: (parsedPrice > 0 && parsedPrice < minPrice)
                                    ? '1px solid rgba(255, 68, 68, 0.5)'
                                    : (parsedPrice > 0 && highestBuyOrder && parsedPrice <= highestBuyOrder)
                                        ? '1px solid rgba(68, 255, 68, 0.5)'
                                        : '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '10px',
                                color: 'rgb(255, 255, 255)',
                                outline: 'none',
                                fontWeight: 'bold',
                                boxSizing: 'border-box',
                                transition: '0.2s'
                            }}
                        />
                        {parsedPrice > 0 && parsedPrice < minPrice && (
                            <div style={{
                                marginTop: '5px',
                                fontSize: '0.7rem',
                                color: 'rgb(255, 68, 68)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                Minimum price allowed is {formatNumber(minPrice)}
                            </div>
                        )}
                        {parsedPrice > 0 && highestBuyOrder && parsedPrice <= highestBuyOrder && parsedPrice >= minPrice && (
                            <div style={{
                                marginTop: '5px',
                                fontSize: '0.7rem',
                                color: 'rgb(68, 255, 68)',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <Zap size={12} fill="rgb(68, 255, 68)" /> INSTANT SELL AVAILABLE!
                            </div>
                        )}
                    </div>

                    {/* Calculation Box */}
                    <div style={{ background: 'var(--panel-bg)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Total Price:</span>
                            <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{formatNumber(totalPrice)} Silver</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Market Tax (20%):</span>
                            <span style={{ color: 'rgb(255, 68, 68)' }}>
                                - {formatNumber(fee)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                            <span style={{ color: 'var(--text-main)' }}>You receive:</span>
                            <span style={{ color: 'rgb(68, 255, 68)' }}>
                                {formatNumber(receive)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Confirm Button */}
                <button
                    onClick={handleConfirm}
                    disabled={parsedPrice < minPrice || parsedAmount <= 0}
                    style={{
                        width: '100%',
                        padding: '15px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'var(--accent)',
                        color: 'var(--panel-bg)',
                        fontWeight: 'bold',
                        cursor: (parsedPrice < minPrice || parsedAmount <= 0) ? 'not-allowed' : 'pointer',
                        opacity: (parsedPrice < minPrice || parsedAmount <= 0) ? 0.5 : 1,
                        marginTop: '10px',
                        fontSize: '1rem'
                    }}
                >
                    Confirm Listing
                </button>
            </div>
        </div >
    );
};

export default MarketListingModal;
