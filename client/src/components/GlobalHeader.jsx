import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    User, ChevronDown, Coins, Circle, Settings, Users, LogOut, Flame 
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatNumber, formatSilver } from '../utils/format';
import NotificationCenter from './NotificationCenter';
import QuestTracker from './QuestTracker';

export const GlobalHeader = ({ 
    displayedGameState, 
    handleLogout, 
    handleSwitchCharacter,
    markAllAsRead,
    clearAllNotifications,
    clockOffset
}) => {
    const {
        isMobile,
        activePlayers,
        modals,
        setModal,
        socket,
        setIsSettingsOpen,
        settings,
        updateSettings,
        session
    } = useAppStore();

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--glass-border)',
            padding: isMobile ? '6px 10px' : '15px 40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: (modals.headerMenu || modals.currencyDropdown) ? 5001 : 100,
            flexWrap: 'nowrap',
            gap: isMobile ? '6px' : '10px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : 20, minWidth: 0 }}>
                {isMobile && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'rgba(74, 222, 128, 0.05)', padding: '4px 8px',
                        borderRadius: '6px', border: '1px solid rgba(74, 222, 128, 0.15)',
                        marginRight: '4px',
                        cursor: 'help'
                    }} title="Players Online">
                        <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 6px #4ade80' }}></span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4ade80', fontFamily: 'monospace' }}>{activePlayers}</span>
                    </div>
                )}

                {!isMobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{
                            width: 40, height: 40, background: 'rgba(0,0,0,0.3)',
                            borderRadius: '12px', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {displayedGameState?.state?.avatar ? (
                                <img
                                    src={displayedGameState.state.avatar.replace(/\.(png|jpg|jpeg)$/, '.webp')}
                                    alt=""
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }}
                                />
                            ) : (
                                <User color="rgba(255,255,255,0.4)" size={20} />
                            )}
                        </div>
                        <div style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                            {displayedGameState?.name?.toUpperCase() || 'ADVENTURER'}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 20 }}>
                {/* Currency Display with Dropdown */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} data-currency-dropdown>
                    <button
                        onClick={() => setModal('currencyDropdown', !modals.currencyDropdown)}
                        style={{
                            background: 'var(--accent-soft)', border: '1px solid var(--border-active)',
                            borderRadius: '6px', padding: isMobile ? '4px 8px' : '6px 12px', display: 'flex',
                            alignItems: 'center', gap: isMobile ? '6px' : '10px', cursor: 'pointer', transition: '0.2s',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px' }}>
                            <Coins size={isMobile ? 14 : 16} color="var(--accent)" />
                            <span style={{ fontSize: isMobile ? '0.8rem' : '0.9rem', fontWeight: 'bold', color: 'var(--accent)', fontFamily: 'monospace' }}>
                                {formatSilver(displayedGameState?.state?.silver || 0, true)}
                            </span>
                        </div>
                        <ChevronDown size={14} color="var(--accent)" style={{
                            transition: '0.2s', transform: modals.currencyDropdown ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.6
                        }} />
                    </button>

                    <AnimatePresence>
                        {modals?.currencyDropdown && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                                background: 'var(--panel-bg)', border: '1px solid var(--border-active)',
                                borderRadius: '12px', padding: '12px', minWidth: '200px',
                                zIndex: 4999, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'
                            }} onClick={(e) => e.stopPropagation()}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 12px', background: 'var(--accent-soft)', borderRadius: '8px',
                                    marginBottom: '8px', border: '1px solid var(--border-active)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Coins size={20} color="var(--accent)" />
                                        <div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>SILVER</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--accent)', fontFamily: 'monospace' }}>
                                                {formatSilver(displayedGameState?.state?.silver || 0, false)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => { setModal('currencyDropdown', false); setModal('orbShop', true); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 12px', background: 'var(--accent-soft)', borderRadius: '8px',
                                        cursor: 'pointer', border: '1px solid var(--border-active)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Circle size={20} color="var(--accent)" />
                                        <div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>ORBS</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--accent)', fontFamily: 'monospace' }}>
                                                {formatNumber(displayedGameState?.state?.orbs || 0)}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 'bold', opacity: 0.7 }}>SHOP →</div>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
                
                <QuestTracker />

                <NotificationCenter
                    notifications={displayedGameState?.state?.notifications || []}
                    isOpen={modals.notifications}
                    onClose={() => setModal('notifications', false)}
                    onMarkAsRead={(id) => {
                        socket?.emit('mark_notification_read', { notificationId: id });
                    }}
                    onMarkAllAsRead={() => socket?.emit('mark_all_notifications_read')}
                    onClearAll={() => socket?.emit('clear_notifications')}
                    onClickTrigger={() => setModal('notifications', !modals.notifications)}
                    isMobile={isMobile}
                />

                <div style={{ position: 'relative' }}>
                    <button
                        title="Altar of Offerings"
                        onClick={() => setModal('altar', !modals?.altar)}
                        style={{
                            color: 'var(--accent)', fontSize: '0.65rem', fontWeight: '900',
                            padding: isMobile ? '6px' : '8px', background: 'var(--slot-bg)', borderRadius: '6px',
                            border: '1px solid rgba(251, 146, 60, 0.4)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', opacity: 0.9, gap: '6px', cursor: 'pointer', transition: '0.2s'
                        }}
                    >
                        <Flame size={16} color="#fb923c" />
                    </button>
                </div>

                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setModal('headerMenu', !modals?.headerMenu)}
                        style={{
                            color: 'var(--text-main)', fontSize: '0.65rem', fontWeight: '900',
                            padding: isMobile ? '6px' : '8px', background: 'var(--slot-bg)', borderRadius: '6px',
                            border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', opacity: 0.8
                        }}
                    >
                        <ChevronDown size={16} style={{ transform: modals?.headerMenu ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    <AnimatePresence>
                        {modals?.headerMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    position: 'absolute', top: '120%', right: 0,
                                    background: 'var(--panel-bg)', border: '1px solid var(--border)',
                                    borderRadius: '12px', padding: '8px', zIndex: 5001,
                                    minWidth: '180px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                <button
                                    onClick={() => { setModal('headerMenu', false); setModal('settings', true); }}
                                    style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}
                                >
                                    <Settings size={14} /> Settings
                                </button>
                                <button
                                    onClick={() => { setModal('headerMenu', false); handleSwitchCharacter(); }}
                                    style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}
                                >
                                    <Users size={14} /> Switch Character
                                </button>
                                <button
                                    onClick={() => { setModal('headerMenu', false); handleLogout(); }}
                                    style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}
                                >
                                    <LogOut size={14} /> Logout
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};
