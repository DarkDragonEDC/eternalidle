import React, { useState } from 'react';
import { X, Check, User, ShoppingBag, Lock } from 'lucide-react';

const BannerSelectionModal = ({ onClose, onSelect, currentBanner, gameState, socket, onPreview }) => {
    const [activeTab, setActiveTab] = useState('acquired');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [unlockError, setUnlockError] = useState('');

    // Glob from public directory
    const bannerModules = import.meta.glob('/public/banner/*.{webp,png,jpg,jpeg,gif}', { eager: true });

    const freeBanners = ['ceu-noturno', 'noite-sem-fim', 'medieval'];
    const unlockedBanners = gameState?.state?.unlockedBanners || [];

    const allBanners = Object.keys(bannerModules).map((path, index) => {
        const filename = path.split('/').pop();
        const name = filename.replace(/\.[^/.]+$/, "");
        const isFree = freeBanners.includes(name);
        const isUnlocked = unlockedBanners.includes(filename);

        return {
            id: `banner-${index}`,
            path: `/banner/${filename}`, // Path as served from public
            preview: `/banner/${filename}`, // Since it's in public, we can just use the absolute URL
            name: name,
            filename: filename,
            isOwned: isFree || isUnlocked
        };
    });

    const ownedBanners = allBanners.filter(b => b.isOwned);
    const shopBanners = allBanners.filter(b => !b.isOwned);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleBannerClick = (banner) => {
        if (activeTab === 'acquired') {
            if (currentBanner === banner.path) return;
            onSelect(banner.path);
        } else if (activeTab === 'shop' && onPreview) {
            onPreview(banner.path);
        }
    };

    const handleUnlock = (banner) => {
        if (!socket || isUnlocking) return;

        const cost = 200;
        if ((gameState?.state?.orbs || 0) < cost) {
            setUnlockError(`Not enough Orbs! This banner costs ${cost} Orbs.`);
            setTimeout(() => setUnlockError(''), 3000);
            return;
        }

        setIsUnlocking(true);
        setUnlockError('');

        socket.emit('unlock_banner', { bannerName: banner.filename });

        // Listen for result
        const handleResult = (res) => {
            setIsUnlocking(false);
            if (res.success) {
                // It will automatically move to owned via state update, 
                // but we can also switch tab to show them
                setActiveTab('acquired');
            }
            socket.off('action_result', handleResult);
        };
        socket.once('action_result', handleResult);

        // Also catch errors right away
        const handleError = () => {
            setIsUnlocking(false);
            socket.off('error', handleError);
        };
        socket.once('error', handleError);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)'
        }} onClick={handleBackdropClick}>
            <div
                id="banner-select-modal"
                style={{
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    width: '90%',
                    maxWidth: '800px', // Wider since banners are horizontal
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--panel-shadow)',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--accent-soft)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Select Background Banner
                        </h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '5px' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <button
                        onClick={() => setActiveTab('acquired')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: activeTab === 'acquired' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === 'acquired' ? 'var(--accent)' : 'transparent'}`,
                            color: activeTab === 'acquired' ? 'var(--accent)' : 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            letterSpacing: '1px',
                            transition: 'all 0.2s',
                            textTransform: 'uppercase'
                        }}
                    >
                        <User size={16} />
                        OWNED
                    </button>
                    <button
                        onClick={() => setActiveTab('shop')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: activeTab === 'shop' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === 'shop' ? 'var(--accent)' : 'transparent'}`,
                            color: activeTab === 'shop' ? 'var(--accent)' : 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            letterSpacing: '1px',
                            transition: 'all 0.2s',
                            textTransform: 'uppercase'
                        }}
                    >
                        <ShoppingBag size={16} />
                        ORB SHOP
                    </button>
                </div>

                <div style={{
                    flex: 1,
                    padding: '20px',
                    overflowY: 'auto',
                    minHeight: 0
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '16px',
                        paddingBottom: '20px'
                    }}>
                        {(activeTab === 'acquired' ? ownedBanners : shopBanners).map((banner) => {
                            const isEquipped = currentBanner === banner.path;

                            return (
                                <div
                                    key={banner.id}
                                    onClick={() => handleBannerClick(banner)}
                                    style={{
                                        background: isEquipped ? 'rgba(212, 175, 55, 0.15)' : 'var(--slot-bg)',
                                        border: `1px solid ${isEquipped ? 'var(--accent)' : 'var(--border)'}`,
                                        borderRadius: '12px',
                                        padding: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        aspectRatio: '21/9', // Banner aspect ratio (usually wide)
                                        cursor: isEquipped ? 'default' : 'pointer',
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isEquipped ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isEquipped) {
                                            e.currentTarget.style.borderColor = 'var(--accent-soft)';
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isEquipped) {
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                            e.currentTarget.style.background = 'var(--slot-bg)';
                                        }
                                    }}
                                >
                                    {isEquipped && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            zIndex: 10,
                                            background: 'var(--accent)',
                                            color: '#000',
                                            borderRadius: '50%',
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                                        }}>
                                            <Check size={16} strokeWidth={4} />
                                        </div>
                                    )}

                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        borderRadius: '8px',
                                        background: 'rgba(0,0,0,0.2)'
                                    }}>
                                        <img
                                            src={banner.preview}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                objectPosition: 'center',
                                                opacity: isEquipped ? 1 : 0.8
                                            }}
                                            alt={banner.name}
                                        />
                                    </div>

                                    {isEquipped && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-10px',
                                            background: 'var(--accent)',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.65rem',
                                            color: '#000',
                                            fontWeight: '900',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                                        }}>
                                            EQUIPPED
                                        </div>
                                    )}

                                    {activeTab === 'shop' && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-10px',
                                            display: 'flex',
                                            gap: '5px'
                                        }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleUnlock(banner); }}
                                                disabled={isUnlocking}
                                                style={{
                                                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)',
                                                    border: '1px solid #FFECB3',
                                                    color: '#000',
                                                    padding: '4px 12px',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.75rem',
                                                    cursor: isUnlocking ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                                    transition: '0.2s',
                                                    opacity: isUnlocking ? 0.7 : 1
                                                }}
                                            >
                                                <img
                                                    src="/items/ORB.webp"
                                                    alt="Orb"
                                                    style={{ width: '16px', height: '16px', filter: 'drop-shadow(0 0 3px rgba(129, 212, 250, 0.8))' }}
                                                />
                                                200 ORBS
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {
                        unlockError && (
                            <div style={{ textAlign: 'center', color: '#ff5252', marginTop: '10px', fontWeight: 'bold' }}>
                                {unlockError}
                            </div>
                        )
                    }
                    {
                        (activeTab === 'shop' && shopBanners.length === 0) && (
                            <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '40px' }}>
                                <Lock size={48} style={{ opacity: 0.2, marginBottom: '10px' }} />
                                <p>No premium banners available in the shop right now. You own everything!</p>
                            </div>
                        )
                    }
                    {
                        (activeTab === 'acquired' && ownedBanners.length === 0) && (
                            <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '40px' }}>
                                <p>No banners owned yet.</p>
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
};

export default BannerSelectionModal;
