import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sword, Shield, Heart, Zap, User, Star, Layers, Info, Award, Crosshair, Hammer, Pickaxe, Flame, Droplets, Wind, Sparkles, Scissors, Anchor, ShoppingBag, Apple, Target, ChevronRight, History, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { resolveItem, calculateRuneBonus, formatItemId, formatItemNameShort } from '@shared/items';
import { calculateNextLevelXP } from '@shared/skills';
import StatBreakdownModal from './StatBreakdownModal';

const EquipmentSlot = ({ slot, icon, label, item: rawItem, delay = 0, onItemClick }) => {
    // RESOLVE FIX: Pass the whole rawItem to resolveItem to preserve enhancement, stats, etc.
    // And spread resolveItem BEFORE rawItem so rawItem's specific instance data (like enhancement) wins.
    const resolved = rawItem ? resolveItem(rawItem) : null;
    const item = rawItem ? { ...resolved, ...rawItem } : null;
    const rarityColor = item && item.rarityColor ? item.rarityColor : 'rgba(255,255,255,0.05)';
    const borderColor = item && item.rarityColor ? item.rarityColor : 'rgba(255,255,255,0.05)';
    const glowColor = item ? `${rarityColor}33` : 'transparent';
    const hasQuality = (item && item.quality > 0) || (item && item.stars > 0);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            onClick={() => item && onItemClick(item)}
            style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '2px',
                cursor: item ? 'pointer' : 'default'
            }}
        >
            <div style={{
                width: '54px',
                height: '54px',
                background: 'var(--slot-bg)',
                border: `1px solid ${item ? rarityColor : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: item ? `0 0 10px ${glowColor}` : 'none',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(4px)',
            }}>
                {item && (
                    <div style={{ position: 'absolute', top: 3, left: 5, fontSize: '0.6rem', fontWeight: '900', color: rarityColor, opacity: 0.8, zIndex: 10 }}>
                        T{item.tier}
                    </div>
                )}
                {item && hasQuality && (
                    <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: '1px', zIndex: 10 }}>
                        {[...Array(item.stars || 1)].map((_, i) => (
                            <Star key={i} size={10} fill="#FFD700" color="#FFD700" strokeWidth={1} />
                        ))}
                    </div>
                )}
                {item && item.icon ? (
                    <img
                        src={item.icon}
                        alt={item.name}
                        style={{
                            width: item.scale || '130%',
                            height: item.scale || '130%',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))',
                            zIndex: 1
                        }}
                    />
                ) : (
                    <div style={{ opacity: item ? 0.3 : 0.1, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {icon}
                    </div>
                )}

                {/* ITEM QUANTITY (FOR FOOD) */}
                {(() => {
                    const amount = item ? (typeof item.amount === 'object' ? item.amount.amount : item.amount) : 0;
                    if (amount > 1) {
                        return (
                            <span style={{
                                position: 'absolute',
                                bottom: 3,
                                left: 5,
                                fontSize: '0.65rem',
                                color: 'var(--text-main)',
                                fontWeight: '900',
                                textShadow: '0 1px 3px rgba(0,0,0,1)',
                                zIndex: 10
                            }}>
                                {amount}
                            </span>
                        );
                    }
                    return null;
                })()}

                {item && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onItemClick(item);
                        }}
                        style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            cursor: 'pointer',
                            opacity: 0.4,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: '0.2s',
                            zIndex: 10
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = 1}
                        onMouseOut={e => e.currentTarget.style.opacity = 0.4}
                    >
                        <Info size={11} />
                    </div>
                )}
            </div>
            {item ? (
                <span style={{
                    fontSize: '0.6rem',
                    color: '#bbb',
                    textAlign: 'center',
                    maxWidth: '85px',
                    lineHeight: '1.2',
                    minHeight: '2.4em',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginTop: '2px',
                    fontWeight: 'bold'
                }}>
                    {formatItemNameShort(item)}
                    {item.enhancement > 0 && <span style={{ color: '#4ade80' }}> +{item.enhancement}</span>}
                </span>
            ) : (
                <span style={{ fontSize: '0.45rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6 }}>
                    {label}
                </span>
            )}
        </motion.div>
    );
};


const SkillCategory = ({ title, icon, skillsList, color, isExpanded, onToggle, skills = {} }) => {
    return (
        <div style={{ marginBottom: '12px', background: 'var(--accent-soft)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div
                onClick={onToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                    transition: '0.3s'
                }}
            >
                <div style={{ color, display: 'flex', alignItems: 'center' }}>{React.cloneElement(icon, { size: 18 })}</div>
                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#fff', letterSpacing: '1px', textTransform: 'uppercase', flex: 1 }}>{title}</span>
                <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    style={{ color: 'rgba(255,255,255,0.2)' }}
                >
                    <ChevronRight size={18} />
                </motion.div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 16px 16px 16px' }}>
                            {skillsList.map(sId => {
                                const skill = skills[sId] || { level: 1, xp: 0 };
                                const nextXP = calculateNextLevelXP(skill.level);
                                const progress = skill.level >= 100 ? 100 : Math.min(100, (skill.xp / nextXP) * 100);
                                return (
                                    <div key={sId} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                                {formatItemId(sId)}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: '900' }}>
                                                <span style={{ fontSize: '0.55rem', opacity: 0.4, marginRight: '4px' }}>LV</span>
                                                {skill.level}
                                            </span>
                                        </div>
                                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div
                                                style={{ width: `${progress}%`, transition: 'width 0.2s linear', height: '100%', background: color, boxShadow: `0 0 10px ${color}66` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


const RuneSlot = ({ slot, label, icon, item: rawItem, onItemClick }) => {
    const item = rawItem ? { ...rawItem, ...resolveItem(rawItem.id || rawItem.item_id, rawItem.stars) } : null;
    const rarityColor = item && item.rarityColor ? item.rarityColor : 'rgba(255,255,255,0.05)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div
                onClick={() => item && onItemClick(item)}
                style={{
                    width: '56px',
                    height: '56px',
                    background: 'rgba(0,0,0,0.3)',
                    border: `1px solid ${item ? rarityColor : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: item ? 'pointer' : 'default',
                    transition: '0.2s',
                    boxShadow: item ? `0 0 10px ${rarityColor}33` : 'none'
                }}
            >
                {item && (
                    <div style={{ position: 'absolute', top: 2, left: 4, fontSize: '0.55rem', fontWeight: '900', color: rarityColor, opacity: 0.8 }}>
                        T{item.tier}
                    </div>
                )}
                {item && item.stars > 0 && (
                    <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: '1px' }}>
                        {[...Array(item.stars)].map((_, i) => (
                            <Star key={i} size={10} fill="#FFD700" color="#FFD700" strokeWidth={1} />
                        ))}
                    </div>
                )}
                <div style={{ opacity: item ? 0.3 : 0.1, color: '#fff' }}>
                    {icon}
                </div>
                {item && item.icon && (
                    <img
                        src={item.icon}
                        alt=""
                        style={{ position: 'absolute', width: '70%', height: '70%', objectFit: 'contain' }}
                    />
                )}
            </div>
            <span style={{ fontSize: '0.5rem', fontWeight: 'bold', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </span>
        </div>
    );
};


const InspectModal = React.memo(({ data, theme: propTheme, onClose, onItemClick, onInspectGuild, socket }) => {
    const [activeTab, setActiveTab] = useState('EQUIPMENT'); // EQUIPMENT | SKILLS | RUNES | HISTORY
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [breakdownModal, setBreakdownModal] = useState(null);
    const [selectedTrade, setSelectedTrade] = useState(null);
    const [tradeHistory, setTradeHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const { id: characterId, name, level, selectedTitle, health = 0, equipment = {}, skills = {}, runes = {}, stats = {}, isPremium, guildName, guildTag, guildId, selectedBanner } = data;

    // Use propTheme or fallback to data.theme, then to global default
    const activeTheme = propTheme || data.theme || 'dark';

    // Normalize avatar path for WebP and local assets
    const avatarPath = useMemo(() => {
        const path = (data.avatar || "/profile/1 - male.webp").replace(/\.png$/, '.webp');
        if (!path.startsWith('/') && !path.startsWith('http')) {
            return `/profile/${path}`;
        }
        return path;
    }, [data.avatar]);

    // Normalize banner path
    const bannerPath = useMemo(() => {
        let path = selectedBanner || "/banner/ceu-noturno.webp";

        // Force .webp for known legacy formats if not an external URL
        if (!path.startsWith('http')) {
            path = path.replace(/\.(png|jpg|jpeg)$/, '.webp');
        }

        if (!path.startsWith('/') && !path.startsWith('http')) {
            return `/banner/${path}`;
        }
        return path;
    }, [selectedBanner]);

    // Fallback for legacy data/direct stats
    const warriorProf = stats.warriorProf || stats.str || 0;
    const hunterProf = stats.hunterProf || stats.agi || 0;
    const mageProf = stats.mageProf || stats.int || 0;

    const totalIP = useMemo(() => {
        const combatSlots = ['helmet', 'chest', 'boots', 'gloves', 'cape', 'mainHand', 'offHand'];
        let total = 0;
        const hasWeapon = !!equipment.mainHand;

        combatSlots.forEach(slot => {
            const rawItem = equipment[slot];
            if (rawItem) {
                // Return early if no weapon and it's a combat gear slot (match ProfilePanel logic)
                if (!hasWeapon && slot !== 'mainHand') return;

                const itemIP = resolveItem(rawItem.id || rawItem.item_id)?.ip || 0;
                total += itemIP;
            }
        });

        return Math.floor(total / 7);
    }, [equipment]);

    const totalLevel = Object.values(skills).reduce((acc, s) => acc + (s.level || 0), 0);

    // Fetch trade history when tab is active
    React.useEffect(() => {
        if (activeTab === 'HISTORY' && socket && characterId) {
            setLoadingHistory(true);
            socket.emit('get_player_trade_history', { targetCharacterId: characterId });

            const handleHistoryUpdate = (payload) => {
                if (payload.characterId === characterId) {
                    setTradeHistory(payload.history || []);
                    setLoadingHistory(false);
                }
            };

            socket.on('player_trade_history_update', handleHistoryUpdate);
            return () => socket.off('player_trade_history_update', handleHistoryUpdate);
        }
    }, [activeTab, characterId, socket]);



    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
            style={{
                position: 'fixed',
                top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(12px)',
                zIndex: 15000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
            {/* Background Decor */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)', opacity: 0.1, pointerEvents: 'none' }} />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                className={`theme-${activeTheme}`}
                style={{
                    border: isPremium ? '1px solid #d4af37' : '1px solid var(--border)',
                    borderRadius: '32px',
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: 'var(--panel-shadow)',
                    position: 'relative'
                }}
            >
                {/* Header Banner */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    borderBottom: '1px solid var(--border)',
                    maxHeight: '260px', // Caps the height to ensure the banner is shorter on larger displays
                    zIndex: 1
                }}>
                    {/* Background Banner Image */}
                    <img
                        src={bannerPath}
                        alt="Profile Banner"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 0,
                            filter: 'saturate(1.2) contrast(1.1) brightness(1)'
                        }}
                    />

                    {/* Glassy Overlay & Content */}
                    <div style={{
                        position: 'relative',
                        zIndex: 1,
                        padding: '15px 10px 15px 10px',
                        background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <button
                            onClick={onClose}
                            style={{ position: 'absolute', top: 10, right: 15, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', zIndex: 10 }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,0,0,0.2)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <X size={18} />
                        </button>

                        {/* Avatar Slot */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'var(--slot-bg)',
                            border: isPremium ? '2px solid #d4af37' : '2px solid var(--accent)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isPremium ? '0 0 20px rgba(212, 175, 55, 0.2)' : '0 0 20px var(--accent-soft)',
                            position: 'relative',
                            overflow: 'hidden',
                            flexShrink: 0
                        }}>
                            <img
                                src={avatarPath}
                                alt="Avatar"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'center 20%'
                                }}
                            />
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.05) 100%)',
                                pointerEvents: 'none'
                            }} />
                        </div>

                        <h2 style={{
                            margin: 0,
                            fontSize: '1.5rem',
                            fontWeight: '950',
                            color: '#fff',
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                            letterSpacing: '1px'
                        }}>
                            {name}
                        </h2>

                        {/* Stacked LVL and IP */}
                        <div style={{
                            fontSize: '0.8rem',
                            fontWeight: '900',
                            letterSpacing: '1px',
                            color: '#ffcc00', // Brighter Golden Yellow
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>LVL {totalLevel}</span>
                            <span>-</span>
                            <span>{totalIP} IP</span>
                        </div>

                        {/* Title */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '2px',
                            color: '#ffcc00',
                            fontSize: '0.75rem',
                            fontWeight: '900',
                            letterSpacing: '1.5px',
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                            textTransform: 'uppercase',
                            gap: '6px'
                        }}>
                            {isPremium && <Award size={12} />}
                            {selectedTitle || 'No Title'}
                            {isPremium && <Award size={12} />}
                        </div>

                        {guildName && (
                            <div
                                onClick={() => {
                                    if (guildId && onInspectGuild) onInspectGuild(guildId);
                                }}
                                style={{
                                    fontSize: '0.8rem',
                                    color: '#4ade80',
                                    fontWeight: 'bold',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    cursor: guildId ? 'pointer' : 'default',
                                    transition: '0.2s'
                                }}
                                onMouseOver={e => {
                                    if (guildId) {
                                        e.currentTarget.style.color = '#fff';
                                        e.currentTarget.style.textShadow = '0 0 5px #4ade80';
                                    }
                                }}
                                onMouseOut={e => {
                                    if (guildId) {
                                        e.currentTarget.style.color = '#4ade80';
                                        e.currentTarget.style.textShadow = 'none';
                                    }
                                }}
                            >
                                <span style={{ opacity: 0.4 }}>‹</span>
                                {guildTag && <span style={{ color: 'var(--accent)', opacity: 0.8, marginRight: '4px' }}>[{guildTag}]</span>}
                                {guildName}
                                <span style={{ opacity: 0.4 }}>›</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Body Area */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Backround Image (borrado) exclusa da Header */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(18, 18, 22, 0.95)',
                        backgroundImage: `linear-gradient(rgba(18, 18, 22, 0.85), rgba(18, 18, 22, 0.85)), url('${avatarPath}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center 10%',
                        backgroundRepeat: 'no-repeat',
                        zIndex: 0
                    }} />

                    <div style={{ display: 'flex', padding: '12px 20px 0', gap: '4px', marginTop: '0px', justifyContent: 'center', position: 'relative', zIndex: 1, flexWrap: 'nowrap' }}>
                        {['EQUIPMENT', 'SKILLS', 'RUNES', 'HISTORY'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '6px 12px',
                                    background: activeTab === tab ? 'var(--accent-soft)' : 'transparent',
                                    borderRadius: '8px',
                                    color: activeTab === tab ? '#fff' : 'var(--text-dim)',
                                    fontWeight: '900', fontSize: '0.65rem', cursor: 'pointer',
                                    transition: '0.3s',
                                    border: activeTab === tab ? '1px solid var(--border-active)' : '1px solid transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                {tab === 'EQUIPMENT' && <Sword size={12} />}
                                {tab === 'SKILLS' && <Star size={12} />}
                                {tab === 'RUNES' && <Layers size={12} />}
                                {tab === 'HISTORY' && <History size={12} />}
                                {tab === 'EQUIPMENT' ? 'EQUIP' : tab === 'HISTORY' ? 'HIST' : tab}
                            </button>
                        ))}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 25px', position: 'relative', zIndex: 1 }}>
                        {activeTab === 'EQUIPMENT' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                {/* HP Bar */}
                                <div style={{ marginBottom: '5px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '8px', fontWeight: '900', letterSpacing: '1px', color: '#888' }}>
                                        <span>VITALITY</span>
                                        <span style={{ color: '#fff' }}>{Math.floor(health)} / {Math.floor(stats.maxHP || 100)} HP</span>
                                    </div>
                                    <div style={{ background: 'var(--accent-soft)', height: '6px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (health / (stats.maxHP || 100)) * 100)}%` }}
                                            style={{ height: '100%', background: 'linear-gradient(90deg, #ff4d4d, #b30000)' }}
                                        />
                                    </div>
                                </div>

                                {/* Compact Grid Layout */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, auto)',
                                    gap: '8px',
                                    justifyContent: 'center',
                                    padding: '5px 0'
                                }}>
                                    <EquipmentSlot slot="cape" icon={<Layers size={18} />} label="CAPE" item={equipment.cape} delay={0.05} onItemClick={onItemClick} />
                                    <EquipmentSlot slot="helmet" icon={<User size={18} />} label="HEAD" item={equipment.helmet} delay={0.1} onItemClick={onItemClick} />
                                    <EquipmentSlot slot="food" icon={<Apple size={18} />} label="FOOD" item={equipment.food} delay={0.15} onItemClick={onItemClick} />

                                    <EquipmentSlot slot="mainHand" icon={<Sword size={18} />} label="WEAPON" item={equipment.mainHand} delay={0.2} onItemClick={onItemClick} />
                                    <EquipmentSlot slot="chest" icon={<Shield size={18} />} label="CHEST" item={equipment.chest} delay={0.25} onItemClick={onItemClick} />
                                    <EquipmentSlot slot="offHand" icon={<Target size={18} />} label="OFF-HAND" item={equipment.offHand} delay={0.3} onItemClick={onItemClick} />

                                    <EquipmentSlot slot="gloves" icon={<Shield size={18} />} label="HANDS" item={equipment.gloves} delay={0.35} onItemClick={onItemClick} />
                                    <EquipmentSlot slot="boots" icon={<Target size={18} />} label="FEET" item={equipment.boots} delay={0.4} onItemClick={onItemClick} />

                                    <div style={{
                                        width: '54px',
                                        height: '54px',
                                        border: '1px dashed var(--border)',
                                        borderRadius: '12px',
                                        background: 'var(--slot-bg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.1)'
                                    }}>
                                        <div style={{ fontSize: '0.5rem', fontWeight: 'bold' }}>LOCKED</div>
                                    </div>
                                </div>

                                {/* Tools Section */}
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                    <h4 style={{ color: 'var(--accent)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '15px', textAlign: 'center', letterSpacing: '2px', fontWeight: '900', opacity: 0.6 }}>Gathering Tools</h4>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '12px',
                                        flexWrap: 'wrap'
                                    }}>
                                        <EquipmentSlot slot="tool_axe" icon={<Pickaxe size={18} />} label="AXE" item={equipment.tool_axe} delay={0.45} onItemClick={onItemClick} />
                                        <EquipmentSlot slot="tool_pickaxe" icon={<Pickaxe size={18} />} label="PICK" item={equipment.tool_pickaxe} delay={0.5} onItemClick={onItemClick} />
                                        <EquipmentSlot slot="tool_sickle" icon={<Scissors size={18} />} label="SICKLE" item={equipment.tool_sickle} delay={0.55} onItemClick={onItemClick} />
                                        <EquipmentSlot slot="tool_knife" icon={<Sword size={18} style={{ transform: 'rotate(45deg)' }} />} label="KNIFE" item={equipment.tool_knife} delay={0.6} onItemClick={onItemClick} />
                                        <EquipmentSlot slot="tool_rod" icon={<Anchor size={18} />} label="ROD" item={equipment.tool_rod} delay={0.65} onItemClick={onItemClick} />
                                        <EquipmentSlot slot="tool_pouch" icon={<ShoppingBag size={18} />} label="BASKET" item={equipment.tool_pouch} delay={0.7} onItemClick={onItemClick} />
                                    </div>
                                </div>

                                {/* Proficiencies Section */}
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                    <h4 style={{ color: 'var(--accent)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '15px', textAlign: 'center', letterSpacing: '2px', fontWeight: '900', opacity: 0.6 }}>Combat Proficiencies</h4>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '20px',
                                        flexWrap: 'wrap'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            <Sword size={18} color="#ef4444" />
                                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px' }}>WARRIOR</span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: '950', color: '#fff' }}>{warriorProf}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            <Target size={18} color="#4ade80" />
                                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px' }}>HUNTER</span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: '950', color: '#fff' }}>{hunterProf}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            <Sparkles size={18} color="#60a5fa" />
                                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px' }}>MAGE</span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: '950', color: '#fff' }}>{mageProf}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'SKILLS' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <SkillCategory
                                    title="Gathering"
                                    icon={<Pickaxe />}
                                    skills={skills}
                                    color="#4ade80"
                                    skillsList={['LUMBERJACK', 'ORE_MINER', 'ANIMAL_SKINNER', 'FIBER_HARVESTER', 'FISHING', 'HERBALISM']}
                                    isExpanded={expandedCategory === 'gathering'}
                                    onToggle={() => setExpandedCategory(expandedCategory === 'gathering' ? null : 'gathering')}
                                />
                                <SkillCategory
                                    title="Refining"
                                    icon={<Flame />}
                                    skills={skills}
                                    color="#60a5fa"
                                    skillsList={['PLANK_REFINER', 'METAL_BAR_REFINER', 'LEATHER_REFINER', 'CLOTH_REFINER', 'DISTILLATION']}
                                    isExpanded={expandedCategory === 'refining'}
                                    onToggle={() => setExpandedCategory(expandedCategory === 'refining' ? null : 'refining')}
                                />
                                <SkillCategory
                                    title="Crafting"
                                    icon={<Hammer />}
                                    skills={skills}
                                    color="#f472b6"
                                    skillsList={['WARRIOR_CRAFTER', 'HUNTER_CRAFTER', 'MAGE_CRAFTER', 'TOOL_CRAFTER', 'COOKING', 'ALCHEMY']}
                                    isExpanded={expandedCategory === 'crafting'}
                                    onToggle={() => setExpandedCategory(expandedCategory === 'crafting' ? null : 'crafting')}
                                />
                                <SkillCategory
                                    title="Adventure"
                                    icon={<Sword />}
                                    skills={skills}
                                    color="#ef4444"
                                    skillsList={['COMBAT', 'DUNGEONEERING']}
                                    isExpanded={expandedCategory === 'adventure'}
                                    onToggle={() => setExpandedCategory(expandedCategory === 'adventure' ? null : 'adventure')}
                                />
                            </div>
                        )}

                        {activeTab === 'RUNES' && (
                            <RunesTabView equipment={equipment} onItemClick={onItemClick} />
                        )}

                        {activeTab === 'HISTORY' && (
                            <TradeHistoryTabView history={tradeHistory} characterId={characterId} loading={loadingHistory} onTradeClick={setSelectedTrade} />
                        )}
                    </div>

                    {/* Footer Info */}
                    <div style={{ padding: '6px 20px', background: 'var(--accent-soft)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                        <div
                            onClick={() => setBreakdownModal({ type: 'DAMAGE', value: stats.damage || 0 })}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.5 }}>
                                <Crosshair size={12} style={{ color: '#ef4444' }} />
                                <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>DMG</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '950', color: '#fff' }}>{stats.damage || 0}</span>
                        </div>

                        <div
                            onClick={() => setBreakdownModal({ type: 'DEFENSE', value: stats.defense || 0 })}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.5 }}>
                                <Shield size={12} style={{ color: '#60a5fa' }} />
                                <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>DEF</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '950', color: '#fff' }}>{Math.min(75, (stats.defense || 0) / 100).toFixed(1)}%</span>
                        </div>

                        <div
                            onClick={() => setBreakdownModal({ type: 'SPEED', value: stats.attackSpeed || 0 })}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.5 }}>
                                <Zap size={12} style={{ color: '#facc15' }} />
                                <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>SPD</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '950', color: '#fff' }}>
                                {stats.attackSpeed ? (1000 / stats.attackSpeed).toFixed(2) : '1.00'}
                                <span style={{ fontSize: '0.55rem', opacity: 0.4, marginLeft: '2px' }}>hit/s</span>
                            </span>
                        </div>

                        <div
                            onClick={() => setBreakdownModal({ type: 'CRIT', value: stats.burstChance || 0 })}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.5 }}>
                                <Star size={12} style={{ color: '#f59e0b' }} />
                                <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>CRIT</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '950', color: '#fff' }}>{(stats.burstChance || 0).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {breakdownModal && (
                        <StatBreakdownModal
                            statType={breakdownModal.type}
                            value={breakdownModal.value}
                            stats={{ ...stats, guild_bonuses: data.guild_bonuses }}
                            equipment={equipment}
                            membership={data.membership}
                            onClose={() => setBreakdownModal(null)}
                        />
                    )}
                    {selectedTrade && (
                        <TradeDetailsModal
                            trade={selectedTrade}
                            characterId={characterId}
                            onClose={() => setSelectedTrade(null)}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
});

const RunesTabView = ({ equipment, onItemClick }) => {
    const [activeRuneTab, setActiveRuneTab] = useState('GATHERING'); // GATHERING | REFINING | CRAFTING | COMBAT

    const activeRuneBuffs = useMemo(() => {
        const summary = {};
        Object.entries(equipment).forEach(([slot, item]) => {
            if (slot.startsWith('rune_') && item) {
                const parts = slot.split('_');
                const act = parts[1];
                const eff = parts.slice(2).join('_');

                const freshItem = resolveItem(item.id || item.item_id);
                if (freshItem) {
                    const bonusValue = calculateRuneBonus(freshItem.tier, freshItem.stars, eff);
                    if (!summary[act]) summary[act] = {};
                    summary[act][eff] = (summary[act][eff] || 0) + bonusValue;
                }
            }
        });
        return summary;
    }, [equipment]);

    const categories = {
        GATHERING: [
            { id: 'WOOD', label: 'Woodcutting', icon: <Wind size={16} /> },
            { id: 'ORE', label: 'Mining', icon: <Pickaxe size={16} /> },
            { id: 'HIDE', label: 'Skinning', icon: <Sword size={16} style={{ transform: 'rotate(45deg)' }} /> },
            { id: 'FIBER', label: 'Fiber', icon: <Scissors size={16} /> },
            { id: 'HERB', label: 'Herbalism', icon: <Apple size={16} /> },
            { id: 'FISH', label: 'Fishing', icon: <Anchor size={16} /> }
        ],
        REFINING: [
            { id: 'METAL', label: 'Bars', icon: <Layers size={16} /> },
            { id: 'PLANK', label: 'Planks', icon: <Wind size={16} /> },
            { id: 'LEATHER', label: 'Leather', icon: <Sword size={16} style={{ transform: 'rotate(45deg)' }} /> },
            { id: 'CLOTH', label: 'Cloth', icon: <Scissors size={16} /> },
            { id: 'EXTRACT', label: 'Extracts', icon: <Apple size={16} /> }
        ],
        CRAFTING: [
            { id: 'WARRIOR', label: 'Warrior', icon: <Sword size={16} /> },
            { id: 'HUNTER', label: 'Hunter', icon: <Target size={16} /> },
            { id: 'MAGE', label: 'Mage', icon: <Star size={16} /> },
            { id: 'TOOLS', label: 'Tools', icon: <Pickaxe size={16} /> },
            { id: 'COOKING', label: 'Cooking', icon: <Apple size={16} /> },
            { id: 'ALCHEMY', label: 'Alchemy', icon: <Zap size={16} /> }
        ]
    };


    return (
        <div style={{ width: '100%' }}>
            <div style={{
                display: 'flex',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {['GATHERING', 'REFINING', 'CRAFTING', 'COMBAT'].map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveRuneTab(t)}
                        style={{
                            flex: 1,
                            padding: '8px 4px',
                            border: 'none',
                            background: activeRuneTab === t ? 'var(--accent)' : 'transparent',
                            color: activeRuneTab === t ? '#000' : 'rgba(255,255,255,0.4)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.6rem',
                            fontWeight: '950',
                            transition: '0.2s',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}
                    >
                        {t === 'GATHERING' ? 'GATHER' : t}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {activeRuneTab === 'COMBAT' ? (
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            <Sword size={14} /> Attack Runes
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            <RuneSlot slot="rune_ATTACK_ATTACK" label="DMG" icon={<Sword size={20} />} item={equipment.rune_ATTACK_ATTACK} onItemClick={onItemClick} />
                            <RuneSlot slot="rune_ATTACK_ATTACK_SPEED" label="SPEED" icon={<Zap size={20} />} item={equipment.rune_ATTACK_ATTACK_SPEED} onItemClick={onItemClick} />
                            <RuneSlot slot="rune_ATTACK_SAVE_FOOD" label="SAVE" icon={<Heart size={20} />} item={equipment.rune_ATTACK_SAVE_FOOD} onItemClick={onItemClick} />
                            <RuneSlot slot="rune_ATTACK_BURST" label="BURST" icon={<Sparkles size={20} />} item={equipment.rune_ATTACK_BURST} onItemClick={onItemClick} />
                        </div>
                    </div>
                ) : (
                    categories[activeRuneTab]?.map(cat => (
                        <div key={cat.id} style={{
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '16px',
                            padding: '16px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                {cat.icon} {cat.label}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                <RuneSlot slot={`rune_${cat.id}_XP`} label="XP" icon={<Award size={18} />} item={equipment[`rune_${cat.id}_XP`]} onItemClick={onItemClick} />
                                <RuneSlot slot={`rune_${cat.id}_DUPLIC`} label="DUPL" icon={<Layers size={18} />} item={equipment[`rune_${cat.id}_DUPLIC`]} onItemClick={onItemClick} />
                                <RuneSlot
                                    slot={activeRuneTab === 'GATHERING' ? `rune_${cat.id}_AUTO` : `rune_${cat.id}_EFF`}
                                    label={activeRuneTab === 'GATHERING' ? "AUTO" : "EFF"}
                                    icon={<Zap size={18} />}
                                    item={equipment[activeRuneTab === 'GATHERING' ? `rune_${cat.id}_AUTO` : `rune_${cat.id}_EFF`]}
                                    onItemClick={onItemClick}
                                />
                            </div>
                        </div>
                    ))
                )}

                <RuneBuffSummary activeRuneBuffs={activeRuneBuffs} activeRuneTab={activeRuneTab} />
            </div>
        </div>
    );
};

const RuneBuffSummary = ({ activeRuneBuffs, activeRuneTab }) => {
    const relevantBuffs = useMemo(() => {
        const filter = {
            GATHERING: ['WOOD', 'ORE', 'HIDE', 'FIBER', 'HERB', 'FISH'],
            REFINING: ['METAL', 'PLANK', 'LEATHER', 'CLOTH', 'EXTRACT'],
            CRAFTING: ['WARRIOR', 'HUNTER', 'MAGE', 'TOOLS', 'COOKING', 'ALCHEMY'],
            COMBAT: ['ATTACK']
        }[activeRuneTab];

        return Object.entries(activeRuneBuffs).filter(([act]) => filter.includes(act));
    }, [activeRuneBuffs, activeRuneTab]);

    if (relevantBuffs.length === 0) return null;

    return (
        <div style={{
            marginTop: '10px',
            padding: '16px',
            background: 'rgba(212, 175, 55, 0.05)',
            borderRadius: '16px',
            border: '1px solid rgba(212, 175, 55, 0.2)'
        }}>
            <h4 style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} fill="var(--accent)" /> Active Bonus
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {relevantBuffs.map(([act, buffs]) => (
                    <div key={act} style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        border: '1px solid rgba(255,255,255,0.03)'
                    }}>
                        <div style={{
                            fontSize: '0.6rem',
                            color: 'rgba(255,255,255,0.3)',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            paddingBottom: '6px'
                        }}>
                            {act}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                            {Object.entries(buffs).map(([eff, val]) => (
                                <div key={eff} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase' }}>
                                        {formatItemId(eff)}
                                    </span>
                                    <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: '950',
                                        color: eff === 'XP' ? 'var(--accent)' : (eff === 'COPY' || eff === 'DUPLIC') ? '#4ade80' : '#60a5fa'
                                    }}>
                                        +{val.toFixed(1)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TradeHistoryTabView = ({ history, characterId, loading, onTradeClick }) => {
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '40px 0' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ color: 'var(--accent)', opacity: 0.5 }}
                >
                    <Zap size={32} />
                </motion.div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>LOADING HISTORY...</span>
            </div>
        );
    }

    if (!history || history.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <History size={32} style={{ color: 'rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#fff' }}>No Trade History</h3>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>This player hasn't completed any trades yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((trade, idx) => (
                <TradeHistoryItem key={trade.id || idx} trade={trade} characterId={characterId} onClick={() => onTradeClick(trade)} />
            ))}
        </div>
    );
};

const TradeHistoryItem = ({ trade, characterId, onClick }) => {
    const isSender = trade.sender_id === characterId;
    const partnerName = isSender ? trade.receiver_name : trade.sender_name;
    
    const formattedDate = new Date(trade.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.06)' }}
            onClick={onClick}
            style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '10px 14px',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: '0.2s',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
                background: isSender ? '#ef4444' : '#4ade80',
                opacity: 0.5
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    color: isSender ? '#ef4444' : '#4ade80',
                    display: 'flex'
                }}>
                    {isSender ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#fff' }}>
                        {isSender ? 'TO' : 'FROM'} <span style={{ color: 'var(--accent)' }}>{partnerName}</span>
                    </span>
                    <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>{formattedDate}</span>
                </div>
            </div>

            <ChevronRight size={14} style={{ opacity: 0.3 }} />
        </motion.div>
    );
};

const TradeDetailsModal = ({ trade, characterId, onClose }) => {
    const isSender = trade.sender_id === characterId;
    const myOffer = { items: trade.sender_items, silver: trade.sender_silver };
    const partnerOffer = { items: trade.receiver_items, silver: trade.receiver_silver };
    
    const formattedDate = new Date(trade.created_at).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const hasMyItems = myOffer.items && myOffer.items.length > 0;
    const hasPartnerItems = partnerOffer.items && partnerOffer.items.length > 0;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)', padding: '20px'
        }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '24px',
                    width: '100%',
                    maxWidth: '400px',
                    boxShadow: 'var(--panel-shadow)',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                            <History size={18} color="var(--accent)" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Trade Details</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '5px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Date & Time</div>
                    <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>{formattedDate}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* Outgoing */}
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '15px', padding: '15px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <div style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <TrendingDown size={12} /> SENDER: <span style={{ color: '#fff', marginLeft: '4px' }}>{trade.sender_name}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {myOffer.silver > 0 && (
                                <div style={{ fontSize: '0.75rem', color: '#ffd700', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,215,0,0.1)', padding: '4px 10px', borderRadius: '8px' }}>
                                    <ShoppingBag size={12} /> {myOffer.silver.toLocaleString()}
                                </div>
                            )}
                            {hasMyItems ? myOffer.items.map((it, i) => {
                                const resolved = resolveItem(it.id || it.item_id);
                                const item = resolved ? { ...resolved, ...it } : it;
                                const tier = item.tier || 1;
                                const color = item.rarityColor || '#fff';
                                const qName = item.quality > 0 ? item.qualityName : '';
                                
                                return (
                                    <div key={i} title={item.name} style={{ fontSize: '0.75rem', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '0.65rem' }}>T{tier}</span>
                                        <span style={{ color: color }}>
                                            {item.amount}x {qName} {item.name?.split(' ').pop()}
                                        </span>
                                        {item.stars > 0 && <span style={{ color: '#ffcc00', fontSize: '0.6rem' }}>{'★'.repeat(item.stars)}</span>}
                                    </div>
                                );
                            }) : !myOffer.silver && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>No items/silver given</span>}
                        </div>
                    </div>

                    {/* Incoming */}
                    <div style={{ background: 'rgba(34, 197, 94, 0.05)', borderRadius: '15px', padding: '15px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                        <div style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <TrendingUp size={12} /> RECEIVER: <span style={{ color: '#fff', marginLeft: '4px' }}>{trade.receiver_name}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {partnerOffer.silver > 0 && (
                                <div style={{ fontSize: '0.75rem', color: '#ffd700', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,215,0,0.1)', padding: '4px 10px', borderRadius: '8px' }}>
                                    <ShoppingBag size={12} /> {partnerOffer.silver.toLocaleString()}
                                </div>
                            )}
                            {hasPartnerItems ? partnerOffer.items.map((it, i) => {
                                const resolved = resolveItem(it.id || it.item_id);
                                const item = resolved ? { ...resolved, ...it } : it;
                                const tier = item.tier || 1;
                                const color = item.rarityColor || '#fff';
                                const qName = item.quality > 0 ? item.qualityName : '';

                                return (
                                    <div key={i} title={item.name} style={{ fontSize: '0.75rem', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '0.65rem' }}>T{tier}</span>
                                        <span style={{ color: color }}>
                                            {item.amount}x {qName} {item.name?.split(' ').pop()}
                                        </span>
                                        {item.stars > 0 && <span style={{ color: '#ffcc00', fontSize: '0.6rem' }}>{'★'.repeat(item.stars)}</span>}
                                    </div>
                                );
                            }) : !partnerOffer.silver && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>No items/silver received</span>}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default InspectModal;
