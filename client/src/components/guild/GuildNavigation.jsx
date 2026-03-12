import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, ChevronDown, Home, ClipboardList, Building2, Settings, Users } from 'lucide-react';

export const GuildNavigation = ({ 
    activeTab, 
    setActiveTab, 
    showNavDropdown, 
    setShowNavDropdown, 
    playerHasPermission,
    isMobile,
    timeUntilReset,
    membersSortBy,
    setMembersSortBy,
    showMembersDropdown,
    setShowMembersDropdown,
    pendingRequestsCount
}) => {
    const tabs = [
        { id: 'MEMBERS', label: 'Home', icon: Home },
        { id: 'TASKS', label: 'Tasks', icon: ClipboardList },
        { id: 'BUILDING', label: 'Building', icon: Building2 },
        { id: 'SETTINGS', label: 'Settings', icon: Settings, permission: 'manage_guild' }
    ].filter(opt => !opt.permission || playerHasPermission(opt.permission));

    const currentTabLabel = tabs.find(t => t.id === activeTab)?.label || activeTab;

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                    onClick={() => setShowNavDropdown(!showNavDropdown)}
                    style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Menu size={16} color="var(--accent)" />
                    <h3 style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: '#fff',
                        fontWeight: '900',
                        letterSpacing: '1px',
                        textTransform: 'uppercase'
                    }}>
                        {currentTabLabel}
                    </h3>
                    <ChevronDown size={14} color="rgba(255,255,255,0.5)" style={{ transform: showNavDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                <AnimatePresence>
                    {showNavDropdown && (
                        <>
                            <div
                                onClick={() => setShowNavDropdown(false)}
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    marginTop: '8px',
                                    background: '#1a1a1a',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    zIndex: 1000,
                                    minWidth: '180px',
                                    overflow: 'hidden'
                                }}
                            >
                                {tabs.map((opt) => (
                                    <div
                                        key={opt.id}
                                        onClick={() => {
                                            setActiveTab(opt.id);
                                            setShowNavDropdown(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            background: activeTab === opt.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                            color: activeTab === opt.id ? 'var(--accent)' : 'rgba(255,255,255,0.7)',
                                            transition: 'all 0.2s ease',
                                            borderLeft: activeTab === opt.id ? '3px solid var(--accent)' : '3px solid transparent'
                                        }}
                                    >
                                        <opt.icon size={16} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{opt.label}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {activeTab === 'TASKS' && (
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', letterSpacing: '1px' }}>RESETS IN</div>
                    <div style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', color: 'var(--accent)', fontWeight: '900', fontFamily: 'monospace' }}>{timeUntilReset}</div>
                </div>
            )}

            {(activeTab === 'MEMBERS' || activeTab === 'REQUESTS') ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                if (activeTab !== 'MEMBERS') setActiveTab('MEMBERS');
                                else setShowMembersDropdown(!showMembersDropdown);
                            }}
                            style={{
                                background: activeTab === 'MEMBERS' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.05)',
                                border: activeTab === 'MEMBERS' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                color: activeTab === 'MEMBERS' ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            {membersSortBy === 'DATE' ? 'DATE' :
                                membersSortBy === 'TOTAL_XP' ? 'TOTAL XP' :
                                    membersSortBy === 'DAILY_XP' ? 'DAILY XP' :
                                        membersSortBy === 'TOTAL_SILVER' ? 'TOTAL SILVER' : 'MEMBERS'}
                            {activeTab === 'MEMBERS' && (
                                <ChevronDown size={12} style={{ opacity: 0.7, transform: showMembersDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            )}
                        </motion.button>

                        <AnimatePresence>
                            {showMembersDropdown && activeTab === 'MEMBERS' && (
                                <>
                                    <div
                                        onClick={() => setShowMembersDropdown(false)}
                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            marginTop: '4px',
                                            background: '#111',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                            zIndex: 100,
                                            minWidth: '120px',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {[
                                            { id: 'DEFAULT', label: 'Members' },
                                            { id: 'DATE', label: 'Date' },
                                            { id: 'TOTAL_XP', label: 'Total XP' },
                                            { id: 'DAILY_XP', label: 'Daily XP' },
                                            { id: 'TOTAL_SILVER', label: 'Total Silver' }
                                        ].map(opt => (
                                            <div
                                                key={opt.id}
                                                onClick={() => {
                                                    setMembersSortBy(opt.id);
                                                    setShowMembersDropdown(false);
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    background: membersSortBy === opt.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                                    color: membersSortBy === opt.id ? 'var(--accent)' : 'rgba(255,255,255,0.7)',
                                                    borderLeft: membersSortBy === opt.id ? '2px solid var(--accent)' : '2px solid transparent',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {opt.label}
                                            </div>
                                        ))}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {playerHasPermission('manage_requests') && (
                        <button
                            onClick={() => setActiveTab('REQUESTS')}
                            style={{
                                background: activeTab === 'REQUESTS' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.05)',
                                border: activeTab === 'REQUESTS' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                color: activeTab === 'REQUESTS' ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                        >
                            REQUESTS
                            {pendingRequestsCount > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    background: '#ff4444',
                                    color: '#fff',
                                    fontSize: '8px',
                                    fontWeight: 'bold',
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {pendingRequestsCount}
                                </div>
                            )}
                        </button>
                    )}
                </div>
            ) : null}
        </div>
    );
};
