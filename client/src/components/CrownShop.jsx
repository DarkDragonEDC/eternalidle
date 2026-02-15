import React, { useState, useEffect } from 'react';
import { X, Circle, Zap, Package, Sparkles, Star, ShoppingBag, Check, Trophy, Info } from 'lucide-react';

const CrownShop = ({ socket, gameState, onClose }) => {
    const [storeItems, setStoreItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(null);
    const [purchaseResult, setPurchaseResult] = useState(null);

    const [showMSInfo, setShowMSInfo] = useState(false);

    const crowns = gameState?.state?.crowns || 0;

    useEffect(() => {
        const handleStoreUpdate = (items) => {
            setStoreItems(items);
            setLoading(false);
        };

        const handlePurchaseSuccess = (result) => {
            setPurchasing(null);
            setPurchaseResult({ success: true, message: result.message || 'Purchase successful!' });
            setTimeout(() => setPurchaseResult(null), 3000);
        };

        const handlePurchaseError = (result) => {
            setPurchasing(null);
            setPurchaseResult({ success: false, message: result.error || 'Purchase failed' });
            setTimeout(() => setPurchaseResult(null), 3000);
        };

        const handleStripeSession = (result) => {
            if (result.url) {
                setPurchaseResult({ success: true, message: 'Redirecting to Stripe...' });
                window.location.href = result.url;
            } else {
                setPurchasing(null);
                setPurchaseResult({ success: false, message: 'Failed to create payment session' });
            }
        };

        socket.on('crown_store_update', handleStoreUpdate);
        socket.on('crown_purchase_success', handlePurchaseSuccess);
        socket.on('crown_purchase_error', handlePurchaseError);
        socket.on('stripe_checkout_session', handleStripeSession);

        // Request store items AFTER registering listeners
        socket.emit('get_crown_store');

        return () => {
            socket.off('crown_store_update', handleStoreUpdate);
            socket.off('crown_purchase_success', handlePurchaseSuccess);
            socket.off('crown_purchase_error', handlePurchaseError);
            socket.off('stripe_checkout_session', handleStripeSession);
        };
    }, [socket]);

    const handlePurchase = (item) => {
        if (item.category === 'PACKAGE' || item.category === 'MEMBERSHIP') {
            setPurchasing(item.id);
            // Simulate payment gateway start
            socket.emit('buy_crown_package', { packageId: item.id });
        } else {
            setPurchasing(item.id);
            socket.emit('purchase_crown_item', { itemId: item.id });
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'BOOST': return <Zap size={16} color="#ffd700" />;
            case 'CONVENIENCE': return <Package size={16} color="#4caf50" />;
            case 'COSMETIC': return <Sparkles size={16} color="#e040fb" />;
            case 'PACKAGE': return <Circle size={16} color="#ffd700" />;
            case 'MEMBERSHIP': return <Trophy size={16} color="#4fc3f7" />;
            default: return <Star size={16} />;
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'BOOST': return 'var(--accent)';
            case 'CONVENIENCE': return '#4caf50';
            case 'COSMETIC': return '#e040fb';
            case 'PACKAGE': return 'var(--accent)';
            case 'MEMBERSHIP': return '#4fc3f7';
            default: return '#888';
        }
    };

    // Group items by category
    const groupedItems = storeItems.reduce((acc, item) => {
        const cat = item.category || 'OTHER';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 12000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-active)',
                borderRadius: '20px',
                padding: '0',
                width: '95%',
                maxWidth: '600px',
                maxHeight: '85vh',
                overflow: 'hidden',
                boxShadow: 'var(--panel-shadow)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    background: 'linear-gradient(90deg, var(--accent-soft), transparent)',
                    padding: '20px 25px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Circle size={28} color="var(--accent)" />
                        <div>
                            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.3rem', fontWeight: '900' }}>ORB SHOP</h2>
                            <div style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '1px' }}>PREMIUM STORE</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            background: 'var(--accent-soft)',
                            border: '1px solid var(--border-active)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Circle size={18} color="var(--accent)" />
                            <span style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '1.1rem' }}>{crowns}</span>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'var(--accent-soft)',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Purchase Result Toast */}
                {purchaseResult && (
                    <div style={{
                        position: 'absolute',
                        top: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: purchaseResult.success ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)',
                        color: '#fff',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        {purchaseResult.success ? <Check size={18} /> : <X size={18} />}
                        {purchaseResult.message}
                    </div>
                )}

                {/* Content */}
                <div style={{
                    padding: '20px',
                    overflowY: 'auto',
                    maxHeight: 'calc(85vh - 100px)'
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                            Loading store...
                        </div>
                    ) : (
                        Object.entries(groupedItems).map(([category, items]) => (
                            <div key={category} style={{ marginBottom: '25px' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '12px',
                                    paddingBottom: '8px',
                                    borderBottom: `1px solid ${getCategoryColor(category)}33`
                                }}>
                                    {getCategoryIcon(category)}
                                    <span style={{
                                        color: getCategoryColor(category),
                                        fontSize: '0.75rem',
                                        fontWeight: '900',
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase'
                                    }}>
                                        {category === 'BOOST' ? 'Boosts (24h)' :
                                            category === 'CONVENIENCE' ? 'Convenience' :
                                                category === 'COSMETIC' ? 'Cosmetics' :
                                                    category === 'PACKAGE' ? 'Orb Packages' :
                                                        category === 'MEMBERSHIP' ? 'VIP Membership' : category}
                                    </span>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                    gap: '12px'
                                }}>
                                    {items.map(item => {
                                        const isRealMoney = item.category === 'PACKAGE' || item.category === 'MEMBERSHIP';
                                        const isPackage = item.category === 'PACKAGE';
                                        const isMembership = item.category === 'MEMBERSHIP';
                                        const canAfford = isRealMoney ? true : (crowns >= item.cost);
                                        const isPurchasing = purchasing === item.id;

                                        return (
                                            <div key={item.id} style={{
                                                background: 'var(--slot-bg)',
                                                border: `1px solid ${isRealMoney ? 'var(--accent)' : (canAfford ? 'var(--border)' : 'rgba(255,0,0,0.2)')}`,
                                                borderRadius: '12px',
                                                padding: '15px',
                                                opacity: canAfford ? 1 : 0.6,
                                                transition: '0.2s',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                {item.bestSeller && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '6px',
                                                        right: '-32px',
                                                        background: 'var(--accent)',
                                                        color: '#000',
                                                        padding: '4px 35px',
                                                        fontSize: '0.6rem',
                                                        fontWeight: 'bold',
                                                        transform: 'rotate(45deg)',
                                                        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                                        zIndex: 1
                                                    }}>BEST SELLER</div>
                                                )}
                                                {item.premium && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '6px',
                                                        right: '-32px',
                                                        background: '#e040fb',
                                                        color: '#fff',
                                                        padding: '4px 35px',
                                                        fontSize: '0.6rem',
                                                        fontWeight: 'bold',
                                                        transform: 'rotate(45deg)',
                                                        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                                        zIndex: 1
                                                    }}>BEST VALUE</div>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                                        <div>
                                                            <div style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '0.9rem' }}>{item.name}</div>
                                                            {item.permanent && (
                                                                <span style={{ fontSize: '0.6rem', color: '#4caf50', textTransform: 'uppercase' }}>Permanent</span>
                                                            )}
                                                            {item.duration && (
                                                                <span style={{ fontSize: '0.6rem', color: 'var(--accent)', textTransform: 'uppercase' }}>
                                                                    {item.duration >= 24 * 60 * 60 * 1000
                                                                        ? `${Math.round(item.duration / (24 * 60 * 60 * 1000))} Days`
                                                                        : `${Math.round(item.duration / (60 * 60 * 1000))} Hours`}
                                                                </span>
                                                            )}
                                                            {isPackage && item.amount && (
                                                                <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 'bold' }}>{item.amount} ORBS</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: 'var(--accent-soft)',
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        border: `1px solid var(--border-active)`,
                                                        position: 'relative',
                                                        zIndex: 2
                                                    }}>
                                                        {!isRealMoney && <Circle size={12} color="var(--accent)" />}
                                                        <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                            {isRealMoney
                                                                ? (item.currency === 'BRL' ? `R$ ${item.price.toFixed(2).replace('.', ',')}` : `$${item.price.toFixed(2)}`)
                                                                : item.cost}
                                                        </span>
                                                        {item.id === 'MEMBERSHIP' && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setShowMSInfo(true); }}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#4fc3f7',
                                                                    cursor: 'pointer',
                                                                    padding: '2px',
                                                                    display: 'flex',
                                                                    marginLeft: '4px'
                                                                }}
                                                            >
                                                                <Info size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <p style={{ color: '#888', fontSize: '0.75rem', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                                                    {item.description}
                                                </p>

                                                <button
                                                    onClick={() => canAfford && !isPurchasing && handlePurchase(item)}
                                                    disabled={!canAfford || isPurchasing}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        background: isRealMoney
                                                            ? 'linear-gradient(90deg, rgba(76, 175, 80, 0.4), rgba(76, 175, 80, 0.1))'
                                                            : (canAfford
                                                                ? 'linear-gradient(90deg, var(--accent), var(--accent-soft))'
                                                                : 'rgba(100,100,100,0.2)'),
                                                        border: `1px solid ${isRealMoney ? 'rgba(76, 175, 80, 0.5)' : (canAfford ? 'var(--accent)' : 'rgba(100,100,100,0.3)')}`,
                                                        borderRadius: '8px',
                                                        color: isRealMoney ? '#4caf50' : (canAfford ? 'var(--accent)' : '#666'),
                                                        fontWeight: 'bold',
                                                        fontSize: '0.8rem',
                                                        cursor: canAfford && !isPurchasing ? 'pointer' : 'not-allowed',
                                                        transition: '0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    {isPurchasing ? (
                                                        'Processing...'
                                                    ) : isRealMoney ? (
                                                        <>
                                                            <ShoppingBag size={14} />
                                                            {item.category === 'MEMBERSHIP' ? 'BUY MEMBERSHIP' : 'BUY ORBS'}
                                                        </>
                                                    ) : canAfford ? (
                                                        <>
                                                            <ShoppingBag size={14} />
                                                            PURCHASE
                                                        </>
                                                    ) : (
                                                        'Insufficient Orbs'
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Membership Benefits Modal */}
                {showMSInfo && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }} onClick={() => setShowMSInfo(false)}>
                        <div style={{
                            background: 'var(--panel-bg)',
                            border: '1px solid var(--accent)',
                            borderRadius: '16px',
                            padding: '30px',
                            maxWidth: '500px',
                            width: '100%',
                            boxShadow: 'var(--panel-shadow)'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Trophy size={24} color="var(--accent)" />
                                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>Membership Benefits</h3>
                                </div>
                                <button onClick={() => setShowMSInfo(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                                <div style={{ background: 'var(--slot-bg)', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #ffca28' }}>
                                    <div style={{ fontWeight: 'bold', color: '#ffca28', fontSize: '0.95rem', marginBottom: '4px' }}>Global XP Bonus</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Gain <strong style={{ color: 'var(--text-main)' }}>+10% more XP</strong> from all sources.</div>
                                </div>

                                <div style={{ background: 'var(--slot-bg)', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #4caf50' }}>
                                    <div style={{ fontWeight: 'bold', color: '#4caf50', fontSize: '0.95rem', marginBottom: '4px' }}>Inventory Expansion</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Increase base inventory from <strong style={{ color: 'var(--text-main)' }}>30 to 50 slots</strong>.</div>
                                </div>

                                <div style={{ background: 'var(--slot-bg)', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #42a5f5' }}>
                                    <div style={{ fontWeight: 'bold', color: '#42a5f5', fontSize: '0.95rem', marginBottom: '4px' }}>Market Domination</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>List up to <strong style={{ color: 'var(--text-main)' }}>50 items</strong> (Base: 30).</div>
                                </div>

                                <div style={{ background: 'var(--slot-bg)', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #ae00ff' }}>
                                    <div style={{ fontWeight: 'bold', color: '#ae00ff', fontSize: '0.95rem', marginBottom: '4px' }}>Rune Automation</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Access to <strong style={{ color: 'var(--text-main)' }}>Auto Merge</strong> feature to instantly combine runes.</div>
                                </div>

                                <div style={{ background: 'var(--slot-bg)', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #ec407a' }}>
                                    <div style={{ fontWeight: 'bold', color: '#ec407a', fontSize: '0.95rem', marginBottom: '4px' }}>Productive Inactivity</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>IDLE limit increased from <strong style={{ color: 'var(--text-main)' }}>8h to 12h</strong>.</div>
                                </div>

                                <div style={{ background: 'var(--slot-bg)', padding: '15px', borderRadius: '10px', borderLeft: '4px solid var(--accent)' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', fontSize: '0.95rem', marginBottom: '4px' }}>Global Efficiency</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Gain an additional <strong style={{ color: 'var(--text-main)' }}>+10% Global Efficiency</strong> (Mining, Logging, Crafting speed, etc).</div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowMSInfo(false)}
                                style={{
                                    width: '100%',
                                    marginTop: '20px',
                                    padding: '12px',
                                    background: 'rgba(79, 195, 247, 0.1)',
                                    border: '1px solid rgba(79, 195, 247, 0.3)',
                                    borderRadius: '8px',
                                    color: '#4fc3f7',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CrownShop;
