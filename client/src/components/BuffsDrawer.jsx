import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, ChevronUp, Star, Coins, Sprout, Hammer, ArrowUpCircle, Clover, Diamond, Clock, X, Zap, Sword } from 'lucide-react';
import { resolveItem } from '@shared/items';

const POTION_METADATA = {
    GLOBAL_XP: { label: 'Global XP', icon: <Star size={16} color="#d4af37" />, color: 'var(--accent)' },
    GATHER_XP: { label: 'Gathering XP', icon: <Sprout size={16} color="#4caf50" />, color: '#4caf50' },
    REFINE_XP: { label: 'Refining XP', icon: <ArrowUpCircle size={16} color="#2196f3" />, color: '#2196f3' },
    CRAFT_XP: { label: 'Crafting XP', icon: <Hammer size={16} color="#ff9800" />, color: '#ff9800' },
    SILVER: { label: 'Silver', icon: <Coins size={16} color="#ffd700" />, color: 'var(--accent)' },
    DROP: { label: 'Luck / Drop', icon: <Clover size={16} color="#4caf50" />, color: '#4caf50' },
    QUALITY: { label: 'Quality', icon: <Diamond size={16} color="#00bcd4" />, color: '#00bcd4' },
    GLOBAL_EFF: { label: 'Global Efficiency', icon: <Clock size={16} color="var(--accent)" />, color: 'var(--accent)' },
    CRIT: { label: 'Critical Chance', icon: <Zap size={16} color="#f59e0b" />, color: '#f59e0b' },
    DAMAGE: { label: 'Damage', icon: <Sword size={16} color="#ef4444" />, color: '#ef4444' },
};

const BuffsDrawer = ({ gameState, isMobile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [now, setNow] = useState(Date.now());
    const drawerRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const activeBuffs = gameState?.state?.active_buffs || {};
    const stats = gameState?.calculatedStats || {};
    const equipment = gameState?.state?.equipment || {}; // Added handle for equipment

    const formatTime = (ms) => {
        if (ms <= 0) return null;
        const totalSecs = Math.floor(ms / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;

        const hStr = h.toString().padStart(2, '0');
        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');

        return `${hStr}:${mStr}:${sStr}`;
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: isMobile ? '154px' : '104px', // Acima do ActivityWidget (30 + 64 + 10) ou (80 + 64 + 10 mobile)
            right: isMobile ? '20px' : '30px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
        }}
            ref={drawerRef}
        >
            {/* Modal Overlay and Content */}
            <AnimatePresence>
                {isOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0, 0, 0, 0.85)',
                                backdropFilter: 'blur(8px)'
                            }}
                        />

                        {/* Modal Body */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '300px',
                                maxHeight: '85vh',
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                boxShadow: 'var(--panel-shadow)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '16px',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--accent)',
                                    fontWeight: '900',
                                    letterSpacing: '1.5px',
                                    textTransform: 'uppercase'
                                }}>
                                    Active Bonuses
                                </div>
                                <X
                                    size={18}
                                    style={{ color: 'var(--text-dim)', cursor: 'pointer' }}
                                    onClick={() => setIsOpen(false)}
                                />
                            </div>

                            {/* Buffs List - Scrollable */}
                            <div style={{
                                padding: '12px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'var(--accent) transparent'
                            }}>
                                {(() => {
                                    const items = Object.entries(POTION_METADATA)
                                        .map(([key, meta]) => {
                                            const rawActive = activeBuffs[key];
                                            const active = (rawActive && rawActive.expiresAt > now) ? rawActive : null;
                                            const timeRemaining = active ? active.expiresAt - now : 0;

                                            // Pegar valor do bônus total para o badge principal
                                            let totalBonus = 0;
                                            if (key === 'GLOBAL_XP') totalBonus = stats.globals?.xpYield || 0;
                                            else if (key === 'SILVER') totalBonus = stats.globals?.silverYield || 0;
                                            else if (key === 'DROP') totalBonus = stats.globals?.dropRate || 0;
                                            else if (key === 'QUALITY') totalBonus = stats.globals?.qualityChance || 0;
                                            else if (key === 'GATHER_XP') totalBonus = stats.xpBonus?.GATHERING || 0;
                                            else if (key === 'REFINE_XP') totalBonus = stats.xpBonus?.REFINING || 0;
                                            else if (key === 'CRAFT_XP') totalBonus = stats.xpBonus?.CRAFTING || 0;
                                            else if (key === 'GLOBAL_EFF') {
                                                const isPremium = gameState?.state?.membership?.active && gameState?.state?.membership?.expiresAt > now;
                                                const msBonus = isPremium ? 10 : 0;
                                                const capeSource = Object.values(equipment).find(item => {
                                                    if (!item) return false;
                                                    const fresh = resolveItem(item.id || item.item_id);
                                                    return fresh?.stats?.efficiency?.GLOBAL > 0;
                                                });
                                                const capeBonus = capeSource ? (resolveItem(capeSource.id || capeSource.item_id)?.stats?.efficiency?.GLOBAL || 0) : 0;
                                                totalBonus = msBonus + capeBonus;
                                            } else if (key === 'CRIT') {
                                                totalBonus = stats.potionCritChance || 0;
                                            } else if (key === 'DAMAGE') {
                                                totalBonus = (stats.potionDmgBonus || 0) * 100;
                                            }

                                            return { key, meta, active, totalBonus, timeRemaining };
                                        })
                                        .filter(({ active, totalBonus }) => active || totalBonus > 0)
                                        .sort((a, b) => {
                                            const isActiveA = a.active || a.totalBonus > 0;
                                            const isActiveB = b.active || b.totalBonus > 0;
                                            if (isActiveA && !isActiveB) return -1;
                                            if (!isActiveA && isActiveB) return 1;
                                            return 0;
                                        });

                                    if (items.length === 0) {
                                        return (
                                            <div style={{
                                                padding: '24px 10px',
                                                textAlign: 'center',
                                                color: 'var(--text-dim)',
                                                fontSize: '0.8rem',
                                                fontStyle: 'italic',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span>No active bonuses</span>
                                            </div>
                                        );
                                    }

                                    return items.map(({ key, meta, active, totalBonus, timeRemaining }) => {
                                        // Calcular bônus específico da poção (se houver)
                                        const potionBonusPercent = active ? Math.round(active.value * 100) : 0;

                                        // Calcular bônus base (INT ou outros)
                                        let baseBonus = totalBonus - potionBonusPercent;
                                        if (baseBonus < 0) baseBonus = 0;

                                        const isPremium = gameState?.state?.membership?.active && gameState?.state?.membership?.expiresAt > now;

                                        return (
                                            <div key={key} style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                padding: '10px 12px',
                                                background: (active || totalBonus > 0) ? 'var(--accent-soft)' : 'var(--slot-bg)',
                                                borderRadius: '8px',
                                                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                                                opacity: (active || totalBonus > 0) ? 1 : 0.4,
                                                transition: 'all 0.2s'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '18px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {React.cloneElement(meta.icon, { size: 14 })}
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: '800' }}>{meta.label}</span>
                                                    </div>
                                                    <div style={{ color: (active || totalBonus > 0) ? meta.color : '#666', fontWeight: '900', fontSize: '0.75rem' }}>
                                                        +{totalBonus.toFixed(1)}%
                                                    </div>
                                                </div>

                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginTop: '4px',
                                                    minHeight: '12px'
                                                }}>
                                                    <div style={{
                                                        fontSize: '0.55rem',
                                                        color: 'var(--text-dim)',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '4px',
                                                        flex: 1
                                                    }}>
                                                        {active && (
                                                            <><span style={{ whiteSpace: 'nowrap' }}>POTION: <span style={{ color: 'var(--accent)' }}>+{potionBonusPercent}%</span></span> | </>
                                                        )}
                                                        {key === 'GLOBAL_XP' && isPremium && (
                                                            <><span style={{ whiteSpace: 'nowrap' }}>MS: <span style={{ color: 'var(--accent)' }}>+10.0%</span></span> | </>
                                                        )}
                                                        {key === 'GLOBAL_EFF' ? (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                {isPremium && <span style={{ whiteSpace: 'nowrap' }}>MS: <span style={{ color: 'var(--accent)' }}>+10.0%</span></span>}
                                                                {isPremium && (totalBonus - 10 > 0) && <> | </>}
                                                                {(totalBonus - (isPremium ? 10 : 0) > 0) && (
                                                                    <span style={{ whiteSpace: 'nowrap' }}>CAPE: <span style={{ color: 'var(--accent)' }}>+{(totalBonus - (isPremium ? 10 : 0)).toFixed(1)}%</span></span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                {/* Only show leftover base if it's not the MS bonus we already displayed */}
                                                                {(() => {
                                                                    const msValue = (isPremium && key === 'GLOBAL_XP') ? 10 : 0;
                                                                    const displayBase = baseBonus - msValue;
                                                                    if (displayBase > 0.1) {
                                                                        return <span style={{ whiteSpace: 'nowrap' }}>ALTAR: <span style={{ color: 'var(--accent)' }}>+{displayBase.toFixed(1)}%</span></span>;
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {active && (
                                                        <span style={{
                                                            fontSize: '0.55rem',
                                                            color: 'var(--accent)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '2px',
                                                            marginLeft: '8px',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            <Clock size={8} /> {formatTime(timeRemaining)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'var(--accent-soft)' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(15, 20, 30, 0.95)',
                    opacity: 0.5,
                    border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border-active)'}`,
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isOpen ? '0 0 20px rgba(212, 175, 55, 0.3)' : '0 8px 32px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    transition: 'border 0.3s'
                }}
            >
                <FlaskConical size={20} strokeWidth={2} />

                {/* Active Indicator Dot */}
                {Object.values(activeBuffs).some(b => b && b.expiresAt > now) && (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '10px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            border: '1.5px solid #0f141e'
                        }}
                    />
                )}
            </motion.button>
        </div>
    );
};

export default BuffsDrawer;
