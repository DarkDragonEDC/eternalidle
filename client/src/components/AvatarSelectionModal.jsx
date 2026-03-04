import React, { useState } from 'react';
import { X, Check, Lock, ShoppingBag, User, Eye } from 'lucide-react';

const AvatarSelectionModal = ({ onClose, onSelect, onPreview, currentAvatar, gameState }) => {
    const [activeTab, setActiveTab] = useState('acquired'); // 'acquired' or 'shop'
    const orbs = gameState?.state?.orbs || 0;
    const unlockedAvatars = gameState?.state?.unlockedAvatars || [];
    const freeAvatars = ['1 - male', '1 - female'];

    // Use static glob to import images from src/assets to satisfy Vite build
    const avatarModules = import.meta.glob('../assets/profile/*.{webp,png,jpg,jpeg,gif}', { eager: true });

    const allAvatars = Object.keys(avatarModules).map((path, index) => {
        const filename = path.split('/').pop();
        const name = filename.replace(/\.[^/.]+$/, "");
        const isFree = freeAvatars.some(fa => filename.includes(fa));
        const isUnlocked = unlockedAvatars.some(ua => {
            const unlockedName = ua.replace(/\.[^/.]+$/, "");
            return name === unlockedName;
        });

        return {
            id: `avatar-${index}`,
            path: `/profile/${filename.replace(/\.png$/, '.webp')}`,
            preview: avatarModules[path].default,
            name: name,
            filename: filename,
            isLocked: !isFree && !isUnlocked
        };
    });

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleAvatarClick = (av) => {
        if (av.isLocked) {
            if (onPreview) onPreview(av);
            onClose(); // Close modal to show preview behind it
        } else {
            const webpPath = av.path.replace(/\.png$/, '.webp');
            if (currentAvatar === webpPath) return;
            onSelect(webpPath);
        }
    };


    const TabButton = ({ id, label, icon }) => {
        const isActive = activeTab === id;
        return (
            <button
                onClick={() => {
                    setActiveTab(id);
                }}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: isActive ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                    color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}
            >
                {icon}
                {label}
            </button>
        );
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
                id="avatar-select-modal"
                style={{
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    width: '90%',
                    maxWidth: '500px',
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
                            Character Profile
                        </h3>
                        <div style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            color: 'var(--accent)',
                            border: '1px solid var(--accent-soft)'
                        }}>
                            <img src="/items/ORB.webp" alt="Orb" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                            {orbs}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '5px' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(0,0,0,0.2)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <TabButton
                        id="acquired"
                        label="Owned"
                        icon={<User size={16} />}
                    />
                    <TabButton
                        id="shop"
                        label="Orb Shop"
                        icon={<ShoppingBag size={16} />}
                    />
                </div>

                <div style={{
                    flex: 1,
                    padding: '20px',
                    overflowY: 'auto',
                    minHeight: 0
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: '12px',
                        paddingBottom: '20px'
                    }}>
                        {(activeTab === 'acquired' ? allAvatars.filter(av => !av.isLocked) : allAvatars.filter(av => av.isLocked)).map((av) => {
                            const isEquipped = currentAvatar === av.path || currentAvatar === av.path.replace(/\.webp$/, '.png');

                            return (
                                <div
                                    key={av.id}
                                    onClick={() => handleAvatarClick(av)}
                                    style={{
                                        background: isEquipped ? 'rgba(212, 175, 55, 0.15)' : 'var(--slot-bg)',
                                        border: `1px solid ${isEquipped ? 'var(--accent)' : av.isLocked ? 'rgba(255,255,255,0.05)' : 'var(--border)'}`,
                                        borderRadius: '10px',
                                        padding: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        aspectRatio: '1/1',
                                        cursor: isEquipped ? 'default' : 'pointer',
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isEquipped ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none',
                                        opacity: av.isLocked ? 0.6 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isEquipped) {
                                            e.currentTarget.style.borderColor = 'var(--accent-soft)';
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isEquipped) {
                                            e.currentTarget.style.borderColor = av.isLocked ? 'rgba(255,255,255,0.05)' : 'var(--border)';
                                            e.currentTarget.style.background = 'var(--slot-bg)';
                                        }
                                    }}
                                >
                                    {isEquipped && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '5px',
                                            right: '5px',
                                            zIndex: 10,
                                            background: 'var(--accent)',
                                            color: '#000',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Check size={12} strokeWidth={4} />
                                        </div>
                                    )}

                                    {av.isLocked && (
                                        <div
                                            title="Preview"
                                            style={{
                                                position: 'absolute',
                                                top: '5px',
                                                right: '5px',
                                                zIndex: 10,
                                                background: 'rgba(0,0,0,0.6)',
                                                color: 'var(--text-dim)',
                                                borderRadius: '4px',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = 'var(--accent)';
                                                e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = 'var(--text-dim)';
                                                e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
                                            }}
                                        >
                                            <Eye size={12} />
                                        </div>
                                    )}

                                    <div style={{
                                        width: '100%',
                                        height: '75%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        borderRadius: '8px',
                                        background: 'rgba(0,0,0,0.2)'
                                    }}>
                                        <img
                                            src={av.preview}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                objectPosition: 'center 20%',
                                                opacity: isEquipped ? 1 : 0.8,
                                                filter: av.isLocked ? 'grayscale(0.5)' : 'none'
                                            }}
                                            alt={av.name}
                                        />
                                    </div>

                                    {isEquipped ? (
                                        <div style={{
                                            fontSize: '0.6rem',
                                            color: 'var(--accent)',
                                            fontWeight: '900',
                                            opacity: 0.9,
                                            marginTop: '4px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            EQUIPPED
                                        </div>
                                    ) : av.isLocked ? (
                                        <div style={{
                                            background: 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)',
                                            border: '1px solid #FFECB3',
                                            color: '#000',
                                            padding: '4px 12px',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                            marginTop: '4px'
                                        }}>
                                            <img
                                                src="/items/ORB.webp"
                                                alt="Orb"
                                                style={{ width: '16px', height: '16px', filter: 'drop-shadow(0 0 3px rgba(129, 212, 250, 0.8))' }}
                                            />
                                            {av.name.includes('5 -') ? 250 : 200} ORBS
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AvatarSelectionModal;
