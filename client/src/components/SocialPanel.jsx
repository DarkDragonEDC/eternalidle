import React, { useState, useEffect } from 'react';
import {
    Search, Users, Send, X, User, Shield, ArrowLeftRight,
    Clock, Coins, Check, Star, Swords, Trophy, Anchor,
    Hammer, Coffee, TreePine, Pickaxe, Flame, Waves, SearchCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatItemId } from '@shared/items';

const ACTIVITY_ICONS = {
    'COMBAT': <Swords size={12} />,
    'DUNGEON': <Shield size={12} />,
    'WORLD BOSS': <Trophy size={12} />,
    'GATHERING': <Pickaxe size={12} />,
    'WOODCUTTING': <TreePine size={12} />,
    'REFINING': <Flame size={12} />,
    'CRAFTING': <Hammer size={12} />,
    'COOKING': <Coffee size={12} />,
    'FISHING': <Anchor size={12} />,
    'ALCHYMY': <SearchCode size={12} />
};

const formatFriendsSince = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatBondDuration = (dateStr) => {
    if (!dateStr) return '0H';
    const start = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - start);

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    const parts = [];

    const yy = years;
    const mm = months % 12;
    const dd = days % 30;
    const hh = hours % 24;

    if (yy > 0) parts.push(`${yy}Y`);
    if (mm > 0) parts.push(`${mm}M`);
    if (dd > 0) parts.push(`${dd}D`);
    if (hh > 0 || parts.length === 0) parts.push(`${hh}H`);

    return parts.join(':');
};

const formatNumber = (n) => {
    if (n == null) return '0';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

const SocialPanel = ({ socket, isOpen, onClose, onInvite, tradeInvites, gameState, onInspect }) => {
    const [searchNick, setSearchNick] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');

    const [friendSearchNick, setFriendSearchNick] = useState('');
    const [friendSearchResults, setFriendSearchResults] = useState([]);
    const [isSearchingFriends, setIsSearchingFriends] = useState(false);
    const [friendSearchError, setFriendSearchError] = useState('');
    const [tradeHistory, setTradeHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [friends, setFriends] = useState([]);
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [socialTab, setSocialTab] = useState('FRIENDS'); // FRIENDS, TRADE, HISTORY
    const [friendsSubTab, setFriendsSubTab] = useState('LIST'); // LIST, REQUESTS
    const [friendToRemove, setFriendToRemove] = useState(null);
    const [requestToCancel, setRequestToCancel] = useState(null);
    const [bestFriendToConfirm, setBestFriendToConfirm] = useState(null);

    useEffect(() => {
        if (!socket) return;

        const handleResult = (results) => {
            if (searching) {
                setSearchResults(results || []);
                setSearching(false);
                setError('');
            } else if (isSearchingFriends) {
                setFriendSearchResults(results || []);
                setIsSearchingFriends(false);
                setFriendSearchError('');
            }
        };

        const handleError = (err) => {
            if (searching) {
                setError(err.message);
                setSearching(false);
                setSearchResults([]);
            } else if (isSearchingFriends) {
                setFriendSearchError(err.message);
                setIsSearchingFriends(false);
                setFriendSearchResults([]);
            }
        };

        socket.on('trade_search_result', handleResult);
        socket.on('error', handleError);

        const handleTradeHistory = (history) => {
            setTradeHistory(history || []);
            setIsLoadingHistory(false);
        };
        socket.on('my_trade_history_update', handleTradeHistory);

        const handleFriendsUpdate = (list) => {
            setFriends(list || []);
            setIsLoadingFriends(false);
        };
        socket.on('friends_list_update', handleFriendsUpdate);

        const handleSocialSuccess = (res) => {
            // Re-fetch friends on any success action (add, respond, remove)
            socket.emit('get_friends');
        };
        socket.on('friend_action_success', handleSocialSuccess);

        return () => {
            socket.off('trade_search_result', handleResult);
            socket.off('error', handleError);
            socket.off('my_trade_history_update', handleTradeHistory);
            socket.off('friends_list_update', handleFriendsUpdate);
            socket.off('friend_action_success', handleSocialSuccess);
        };
    }, [socket, searching, isSearchingFriends]);

    // Fetch trade history when History tab is active
    useEffect(() => {
        if (isOpen && socket) {
            if (socialTab === 'HISTORY') {
                setIsLoadingHistory(true);
                socket.emit('get_my_trade_history');
            } else if (socialTab === 'FRIENDS') {
                setIsLoadingFriends(true);
                socket.emit('get_friends');

                // Real-time refresh interval
                const interval = setInterval(() => {
                    if (isOpen && socialTab === 'FRIENDS') {
                        socket.emit('get_friends');
                    }
                }, 5000); // Every 5s
                return () => clearInterval(interval);
            }
        }
    }, [isOpen, socket, socialTab]);

    const handleSearch = () => {
        if (!searchNick.trim()) return;
        setSearching(true);
        setError('');
        socket.emit('trade_search_player', { nickname: searchNick });
    };

    const handleFriendSearch = () => {
        if (!friendSearchNick.trim()) return;
        setIsSearchingFriends(true);
        setFriendSearchError('');
        socket.emit('trade_search_player', { nickname: friendSearchNick });
    };

    if (!isOpen) return null;

    const isIronman = gameState?.state?.isIronman || gameState?.name?.toLowerCase() === 'ironman' || gameState?.name?.toLowerCase().includes('[im]');

    if (isIronman && socialTab === 'TRADE') {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 12000,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        width: '100%', maxWidth: '500px',
                        background: 'rgba(30,30,35,0.8)', backdropFilter: 'blur(20px)',
                        borderRadius: '24px', border: '1px solid rgba(255,180,0,0.3)',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                        position: 'relative', overflow: 'hidden'
                    }}
                >
                    <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', zIndex: 10 }}>
                        <X size={24} />
                    </button>

                    <div style={{
                        padding: '60px 40px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: '25px', textAlign: 'center'
                    }}>
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 4 }}
                            style={{
                                width: '100px', height: '100px', borderRadius: '30px',
                                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid rgba(212, 175, 55, 0.3)',
                                boxShadow: '0 10px 30px rgba(212, 175, 55, 0.1)'
                            }}>
                            <Shield size={50} color="#D4AF37" />
                        </motion.div>
                        <div>
                            <h2 style={{ color: '#D4AF37', margin: '0 0 10px 0', fontSize: '2.2rem', fontWeight: '900', letterSpacing: '4px' }}>IRONMAN</h2>
                            <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '350px', lineHeight: '1.6', fontSize: '1rem', margin: 0 }}>
                                Self-sufficiency is your path. Trading is strictly forbidden for the bravest of adventurers.
                            </p>
                        </div>
                        <div style={{
                            padding: '12px 24px', background: 'rgba(212, 175, 55, 0.1)',
                            borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.2)',
                            fontSize: '0.85rem', color: '#D4AF37', fontWeight: '900',
                            letterSpacing: '1px'
                        }}>
                            NO TRADE ACTIVE
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 12000,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                style={{
                    width: '100%', maxWidth: '550px', maxHeight: '85vh',
                    background: 'rgba(15, 15, 20, 0.85)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px', background: 'var(--accent-soft)',
                    borderBottom: '1px solid var(--border-active)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users color="var(--accent)" size={20} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', letterSpacing: '1px', color: '#fff' }}>SOCIAL CENTER</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '4px',
                    margin: '0 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    {[
                        { id: 'FRIENDS', label: 'FRIENDS', icon: <Users size={16} /> },
                        { id: 'TRADE', label: 'TRADE', icon: <Send size={16} /> },
                        { id: 'HISTORY', label: 'HISTORY', icon: <Clock size={16} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSocialTab(tab.id)}
                            style={{
                                flex: 1, padding: '10px', background: socialTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: socialTab === tab.id ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                                fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer',
                                letterSpacing: '1px', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: socialTab === tab.id ? '0 4px 15px rgba(0,0,0,0.2)' : 'none'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>

                    {/* FRIENDS TAB */}
                    {socialTab === 'FRIENDS' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                            {/* Sub-Tabs */}
                            <div style={{ display: 'flex', gap: '6px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {[
                                    { key: 'LIST', label: `ADDED (${friends.filter(f => f.status === 'ACCEPTED').length}/50)`, icon: <Users size={12} />, limitReached: friends.filter(f => f.status === 'ACCEPTED').length >= 50 },
                                    {
                                        key: 'BEST',
                                        label: `BEST FRIENDS (${friends.filter(f => f.isBestFriend).length}/5)`,
                                        icon: <Star size={12} fill="var(--accent)" color="var(--accent)" />,
                                        limitReached: friends.filter(f => f.isBestFriend).length >= 5,
                                        badge: friends.filter(f => f.status === 'ACCEPTED' && f.bestFriendRequestSender && f.bestFriendRequestSender === f.friendId).length
                                    },
                                    { key: 'REQUESTS', label: 'REQUESTS', icon: <Send size={12} />, badge: friends.filter(f => f.status === 'PENDING' && !f.isSender).length }
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setFriendsSubTab(tab.key)}
                                        style={{
                                            padding: '7px 16px', borderRadius: '8px',
                                            background: friendsSubTab === tab.key ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                                            color: friendsSubTab === tab.key ? (tab.limitReached ? '#ef4444' : '#000') : (tab.limitReached ? '#ef4444' : 'var(--text-dim)'),
                                            border: 'none', fontSize: '0.72rem', fontWeight: '800',
                                            cursor: 'pointer', transition: '0.2s',
                                            display: 'flex', alignItems: 'center', gap: '6px', position: 'relative'
                                        }}
                                    >
                                        {tab.icon} {tab.label}
                                        {tab.badge > 0 && (
                                            <span style={{
                                                position: 'absolute', top: '-4px', right: '-4px',
                                                minWidth: '16px', height: '16px', borderRadius: '8px',
                                                background: '#ef4444', color: '#fff', fontSize: '0.6rem',
                                                fontWeight: '900', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', padding: '0 4px',
                                                border: '2px solid var(--panel-bg)'
                                            }}>{tab.badge}</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* === BEST FRIENDS SUB-TAB === */}
                            {friendsSubTab === 'BEST' && (
                                <div>
                                    {isLoadingFriends ? (
                                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>Loading...</div>
                                    ) : friends.filter(f => f.isBestFriend || f.bestFriendRequestSender).length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.5 }}>
                                            No Best Friends or pending requests. Click the Star icon on a friend in the ADDED tab to send a request!
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {friends.filter(f => f.isBestFriend || f.bestFriendRequestSender).sort((a, b) => b.isOnline - a.isOnline).map(friend => (
                                                <motion.div
                                                    key={friend.id}
                                                    whileHover={{ x: 5, background: friend.isBestFriend ? 'rgba(255, 215, 0, 0.08)' : 'rgba(255, 255, 255, 0.05)' }}
                                                    style={{
                                                        padding: '12px',
                                                        background: friend.isBestFriend ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                                        borderRadius: '16px',
                                                        border: friend.isBestFriend ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                        display: 'flex', flexDirection: 'row', gap: '12px',
                                                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    {friend.isBestFriend ? (
                                                        <>
                                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <div style={{ position: 'relative' }}>
                                                                        <div style={{
                                                                            width: '32px', height: '32px', borderRadius: '10px',
                                                                            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1))',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            border: '1px solid rgba(255, 215, 0, 0.3)'
                                                                        }}>
                                                                            <Star size={16} fill="#FFD700" color="#FFD700" />
                                                                        </div>
                                                                        <div style={{
                                                                            position: 'absolute', bottom: '-2px', right: '-2px',
                                                                            width: '10px', height: '10px', borderRadius: '50%',
                                                                            background: friend.isOnline ? '#22c55e' : (friend.activities?.length > 0 ? '#f59e0b' : '#444'),
                                                                            border: '2px solid rgba(15, 15, 20, 1)'
                                                                        }} />
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                        <span
                                                                            style={{
                                                                                fontSize: '0.95rem', fontWeight: '900', color: '#FFD700',
                                                                                cursor: 'pointer', textShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
                                                                                maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                                whiteSpace: 'nowrap', display: 'inline-block'
                                                                            }}
                                                                            onClick={() => onInspect && onInspect(friend.friendName)}
                                                                        >
                                                                            {friend.friendName}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,215,0,0.6)', fontWeight: 'bold', flexShrink: 0 }}>Lv.{friend.level}</span>
                                                                        {friend.isOnline && <span style={{ fontSize: '0.5rem', color: '#22c55e', fontWeight: 'bold', background: 'rgba(34, 197, 94, 0.1)', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>ON</span>}
                                                                    </div>
                                                                </div>

                                                                <div style={{ paddingLeft: '4px' }}>
                                                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                                                                        Best Friend
                                                                    </div>
                                                                    {friend.friendsSince && (
                                                                        <div style={{ fontSize: '0.65rem', color: '#FFD700', fontWeight: '900', letterSpacing: '2px', textShadow: '0 0 5px rgba(255, 215, 0, 0.3)' }}>
                                                                            {formatBondDuration(friend.friendsSince)}
                                                                        </div>
                                                                    )}

                                                                    {/* Activities List */}
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                                                        {(friend.activities?.length > 0 || friend.currentActivity) ? (
                                                                            (friend.activities || [friend.currentActivity]).filter(Boolean).map((act, idx) => (
                                                                                <motion.div
                                                                                    key={idx}
                                                                                    initial={{ opacity: 0, x: -10 }}
                                                                                    animate={{ opacity: 1, x: 0 }}
                                                                                    transition={{ delay: idx * 0.1 }}
                                                                                    style={{
                                                                                        fontSize: '0.6rem',
                                                                                        color: '#FFD700',
                                                                                        display: 'flex', alignItems: 'center', gap: '5px',
                                                                                        background: 'rgba(255, 215, 0, 0.05)',
                                                                                        padding: '3px 8px',
                                                                                        borderRadius: '20px',
                                                                                        border: '1px solid rgba(255, 215, 0, 0.1)',
                                                                                        width: 'fit-content'
                                                                                    }}
                                                                                >
                                                                                    <span style={{ color: '#FFD700', display: 'flex', alignItems: 'center' }}>
                                                                                        {ACTIVITY_ICONS[act.type] || <Clock size={10} />}
                                                                                    </span>
                                                                                    <span style={{ fontWeight: '800', textTransform: 'capitalize' }}>
                                                                                        {act.type.toLowerCase()}
                                                                                    </span>
                                                                                    {act.itemId && (
                                                                                        <span style={{ opacity: 0.6, fontSize: '0.55rem', borderLeft: '1px solid rgba(255, 215, 0, 0.2)', paddingLeft: '5px' }}>
                                                                                            {act.itemId.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                                                                                        </span>
                                                                                    )}
                                                                                </motion.div>
                                                                            ))
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Vertical Action Column */}
                                                            <div style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '8px',
                                                                alignItems: 'center',
                                                                justifyContent: 'flex-start',
                                                                paddingTop: '10px',
                                                                paddingLeft: '12px',
                                                                borderLeft: '1px solid rgba(255, 215, 0, 0.1)',
                                                                width: '45px',
                                                                flexShrink: 0
                                                            }}>
                                                                <button
                                                                    onClick={() => socket.emit('remove_best_friend', { friendId: friend.friendId })}
                                                                    style={{ background: 'transparent', border: 'none', color: '#FFD700', cursor: 'pointer', padding: '4px' }}
                                                                    title="Remove Best Friend Status"
                                                                ><Star size={16} fill="#FFD700" /></button>
                                                                <button
                                                                    onClick={() => onInvite(friend.friendName)}
                                                                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px' }}
                                                                ><ArrowLeftRight size={16} /></button>
                                                                <button
                                                                    onClick={() => setFriendToRemove(friend)}
                                                                    style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer', padding: '4px' }}
                                                                ><X size={16} /></button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        /* Simplified Pending Card */
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                                                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255, 215, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                                                                    <Star size={16} color="#FFD700" opacity={0.5} />
                                                                </div>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'rgba(255, 215, 0, 0.6)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.friendName}</div>
                                                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255, 215, 0, 0.3)', fontWeight: 'bold' }}>Lv.{friend.level}</div>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.55rem', color: '#FFD700', fontWeight: '900', letterSpacing: '1px', opacity: 0.7 }}>
                                                                        {friend.bestFriendRequestSender === gameState?.character_id ? 'REQUEST SENT...' : 'PENDING REQUEST!'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {friend.bestFriendRequestSender === friend.friendId ? (
                                                                    /* Receiver View: YES/NO */
                                                                    <>
                                                                        <button
                                                                            onClick={() => socket.emit('respond_best_friend', { friendId: friend.friendId, accept: true })}
                                                                            style={{ padding: '6px 12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', fontWeight: '900', fontSize: '0.6rem', cursor: 'pointer' }}
                                                                        >YES</button>
                                                                        <button
                                                                            onClick={() => socket.emit('respond_best_friend', { friendId: friend.friendId, accept: false })}
                                                                            style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontWeight: '900', fontSize: '0.6rem', cursor: 'pointer' }}
                                                                        >NO</button>
                                                                    </>
                                                                ) : (
                                                                    /* Sender View: CANCEL */
                                                                    <button
                                                                        onClick={() => socket.emit('remove_best_friend', { friendId: friend.friendId })}
                                                                        style={{
                                                                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                            color: '#ef4444', cursor: 'pointer', width: '32px', height: '32px',
                                                                            borderRadius: '10px', display: 'flex', alignItems: 'center',
                                                                            justifyContent: 'center', transition: '0.3s'
                                                                        }}
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* === ADDED SUB-TAB === */}
                            {friendsSubTab === 'LIST' && (
                                <div>
                                    {isLoadingFriends ? (
                                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>Loading...</div>
                                    ) : friends.filter(f => f.status === 'ACCEPTED').length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.5 }}>
                                            No friends added yet. Go to REQUESTS to find players!
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {friends.filter(f => f.status === 'ACCEPTED').sort((a, b) => b.isOnline - a.isOnline).map(friend => (
                                                <motion.div
                                                    key={friend.id}
                                                    whileHover={{ x: 5, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' }}
                                                    style={{
                                                        padding: '12px', background: 'rgba(255,255,255,0.02)',
                                                        borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)',
                                                        display: 'flex', flexDirection: 'row', gap: '12px',
                                                        position: 'relative',
                                                        transition: 'background 0.3s, border-color 0.3s',
                                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {/* Profile Picture */}
                                                            <div style={{ position: 'relative' }}>
                                                                <div style={{
                                                                    width: '32px', height: '32px', borderRadius: '10px',
                                                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                                                }}>
                                                                    <User size={16} color={friend.isOnline ? "var(--accent)" : "rgba(255,255,255,0.4)"} />
                                                                </div>
                                                                <div style={{
                                                                    position: 'absolute', bottom: '-2px', right: '-2px',
                                                                    width: '10px', height: '10px', borderRadius: '50%',
                                                                    background: friend.isOnline ? '#22c55e' : (friend.activities?.length > 0 ? '#f59e0b' : '#444'),
                                                                    border: '2px solid rgba(15, 15, 20, 1)'
                                                                }} />
                                                            </div>

                                                            {/* Nick + Level Inline */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.95rem', fontWeight: '900',
                                                                        color: friend.isOnline ? '#fff' : 'rgba(255,255,255,0.7)',
                                                                        cursor: 'pointer', letterSpacing: '0.5px',
                                                                        maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap', display: 'inline-block'
                                                                    }}
                                                                    onClick={() => onInspect && onInspect(friend.friendName)}
                                                                >
                                                                    {friend.friendName}
                                                                </span>
                                                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', flexShrink: 0 }}>Lv.{friend.level}</span>
                                                                {friend.isOnline && (
                                                                    <span style={{
                                                                        fontSize: '0.5rem', color: '#22c55e', fontWeight: 'bold',
                                                                        background: 'rgba(34, 197, 94, 0.1)', padding: '1px 4px', borderRadius: '4px',
                                                                        border: '1px solid rgba(34, 197, 94, 0.2)', flexShrink: 0
                                                                    }}>ON</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div style={{ paddingLeft: '4px' }}>
                                                            {friend.friendsSince && (
                                                                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                                                                    Friends since {formatFriendsSince(friend.friendsSince)}
                                                                </div>
                                                            )}

                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                                                {(friend.activities?.length > 0 || friend.currentActivity) ? (
                                                                    (friend.activities || [friend.currentActivity]).filter(Boolean).map((act, idx) => (
                                                                        <motion.div
                                                                            key={idx}
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: idx * 0.1 }}
                                                                            style={{
                                                                                fontSize: '0.6rem',
                                                                                color: friend.isOnline ? '#fff' : 'rgba(255,255,255,0.6)',
                                                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                                                background: friend.isOnline ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                                                                                padding: '3px 8px',
                                                                                borderRadius: '20px',
                                                                                border: friend.isOnline ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                                                                                width: 'fit-content'
                                                                            }}
                                                                        >
                                                                            <span style={{ color: friend.isOnline ? 'var(--accent)' : 'inherit', display: 'flex', alignItems: 'center' }}>
                                                                                {ACTIVITY_ICONS[act.type] || <Clock size={10} />}
                                                                            </span>
                                                                            <span style={{ fontWeight: '800', textTransform: 'capitalize' }}>
                                                                                {act.type.toLowerCase()}
                                                                            </span>
                                                                            {act.itemId && (
                                                                                <span style={{ opacity: 0.6, fontSize: '0.55rem', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '5px' }}>
                                                                                    {act.itemId.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                                                                                </span>
                                                                            )}
                                                                        </motion.div>
                                                                    ))
                                                                ) : (
                                                                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>
                                                                        {friend.isOnline ? 'Idling...' : 'Offline'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Vertical Action Column */}
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px',
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-start',
                                                        paddingTop: '10px',
                                                        paddingLeft: '12px',
                                                        borderLeft: '1px solid rgba(255,255,255,0.05)',
                                                        width: '45px',
                                                        flexShrink: 0
                                                    }}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (friend.isBestFriend) return;
                                                                if (friend.bestFriendRequestSender) return;
                                                                setBestFriendToConfirm(friend);
                                                            }}
                                                            style={{
                                                                background: 'transparent', border: 'none', cursor: friend.isBestFriend || friend.bestFriendRequestSender || friends.filter(f => f.isBestFriend).length >= 5 ? 'default' : 'pointer', padding: '4px',
                                                                color: friend.isBestFriend ? "#FFD700" : (friend.bestFriendRequestSender ? "var(--accent)" : (friends.filter(f => f.isBestFriend).length >= 5 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)")),
                                                                opacity: (friends.filter(f => f.isBestFriend).length >= 5 && !friend.isBestFriend && !friend.bestFriendRequestSender) ? 0.3 : 1
                                                            }}
                                                            title={friends.filter(f => f.isBestFriend).length >= 5 ? "Limit reached (5/5)" : "Add Best Friend"}
                                                        >
                                                            <Star size={16} fill={friend.isBestFriend ? "#FFD700" : "none"} />
                                                        </button>
                                                        <button
                                                            onClick={() => onInvite(friend.friendName)}
                                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                                                        ><ArrowLeftRight size={16} /></button>
                                                        <button
                                                            onClick={() => setFriendToRemove(friend)}
                                                            style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.5)', cursor: 'pointer', padding: '4px' }}
                                                        ><X size={16} /></button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* === REQUESTS SUB-TAB === */}
                            {friendsSubTab === 'REQUESTS' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                    {/* Search Player */}
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '1px', opacity: 0.7 }}>SEARCH PLAYER</div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    value={friendSearchNick}
                                                    onChange={(e) => setFriendSearchNick(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleFriendSearch()}
                                                    placeholder="Enter player's name"
                                                    style={{
                                                        width: '100%', padding: '12px 15px', borderRadius: '10px',
                                                        background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                                                        color: '#fff', outline: 'none', transition: '0.2s', fontSize: '0.85rem'
                                                    }}
                                                />
                                                <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                                            </div>
                                            <button
                                                onClick={handleFriendSearch}
                                                disabled={isSearchingFriends}
                                                style={{
                                                    padding: '0 20px', borderRadius: '10px', background: 'var(--accent)',
                                                    color: '#000', fontWeight: '800', border: 'none', cursor: 'pointer', transition: '0.2s'
                                                }}
                                            >
                                                {isSearchingFriends ? '...' : 'FIND'}
                                            </button>
                                        </div>
                                        {friendSearchError && <div style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: '8px', fontWeight: 'bold' }}>{friendSearchError}</div>}
                                    </div>

                                    {/* Search Results */}
                                    <AnimatePresence mode="wait">
                                        {friendSearchResults.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                                            >
                                                <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>MATCHING PLAYERS:</div>
                                                {friendSearchResults.map(result => (
                                                    <motion.div
                                                        key={result.id}
                                                        whileHover={{ x: 5, background: 'rgba(255,255,255,0.05)' }}
                                                        style={{
                                                            padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
                                                            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
                                                            display: 'flex', flexDirection: 'row', gap: '12px',
                                                            alignItems: 'center',
                                                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{
                                                                    width: '32px', height: '32px', borderRadius: '10px',
                                                                    background: 'rgba(255,255,255,0.05)', display: 'flex',
                                                                    alignItems: 'center', justifyContent: 'center',
                                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                                }}>
                                                                    <User size={16} color="rgba(255,255,255,0.4)" />
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                    <span style={{
                                                                        fontSize: '0.95rem', fontWeight: '900', color: '#fff',
                                                                        maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap', display: 'inline-block'
                                                                    }}>{result.name}</span>
                                                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>Lv.{result.level}</span>
                                                                    {result.isIronman && (
                                                                        <div style={{
                                                                            fontSize: '0.45rem', background: 'rgba(212, 175, 55, 0.1)',
                                                                            color: '#D4AF37', padding: '1px 4px',
                                                                            borderRadius: '4px', border: '1px solid rgba(212, 175, 55, 0.2)',
                                                                            display: 'flex', alignItems: 'center', gap: '3px',
                                                                            fontWeight: '900'
                                                                        }}>
                                                                            <Shield size={10} /> IRM
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            paddingLeft: '12px',
                                                            borderLeft: '1px solid rgba(255,255,255,0.05)',
                                                            width: '100px',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            <button
                                                                onClick={() => {
                                                                    socket.emit('add_friend', { friendName: result.name });
                                                                    setFriendSearchResults([]);
                                                                    setFriendSearchNick('');
                                                                }}
                                                                style={{
                                                                    padding: '10px 15px', borderRadius: '10px', background: 'var(--accent)',
                                                                    color: '#000', fontWeight: '900', border: 'none',
                                                                    fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                                                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
                                                                }}
                                                            >
                                                                <Send size={14} /> INVITE
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Received Requests */}
                                    <AnimatePresence>
                                        {friends.filter(f => f.status === 'PENDING' && !f.isSender).length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--accent)', marginBottom: '12px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', boxShadow: '0 0 10px var(--accent)' }} />
                                                    RECEIVED ORDERS ({friends.filter(f => f.status === 'PENDING' && !f.isSender).length})
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {friends.filter(f => f.status === 'PENDING' && !f.isSender).map(req => (
                                                        <motion.div
                                                            key={req.id}
                                                            whileHover={{ scale: 1.01 }}
                                                            style={{
                                                                padding: '16px', background: 'rgba(34, 197, 94, 0.05)',
                                                                borderRadius: '20px', border: '1px solid rgba(34, 197, 94, 0.2)',
                                                                display: 'flex', flexDirection: 'row', gap: '12px',
                                                                alignItems: 'center',
                                                                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <div style={{
                                                                        width: '32px', height: '32px', borderRadius: '10px',
                                                                        background: 'rgba(34, 197, 94, 0.1)', display: 'flex',
                                                                        alignItems: 'center', justifyContent: 'center',
                                                                        border: '1px solid rgba(34, 197, 94, 0.2)'
                                                                    }}>
                                                                        <User size={16} color="#22c55e" />
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                        <div style={{
                                                                            color: '#fff', fontSize: '0.95rem', fontWeight: '900',
                                                                            maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap'
                                                                        }}>{req.friendName}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: 'rgba(34, 197, 94, 0.6)', fontWeight: 'bold', flexShrink: 0 }}>Lv.{req.level}</div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ fontSize: '0.55rem', color: '#22c55e', fontWeight: '900', letterSpacing: '1px', paddingLeft: '4px' }}>FRIEND REQUEST</div>
                                                            </div>
                                                            <div style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '6px',
                                                                paddingLeft: '12px',
                                                                borderLeft: '1px solid rgba(34, 197, 94, 0.2)',
                                                                width: '100px',
                                                                flexShrink: 0
                                                            }}>
                                                                <button
                                                                    onClick={() => socket.emit('respond_friend_request', { requestId: req.id, accept: true })}
                                                                    style={{
                                                                        padding: '8px 15px', background: '#22c55e', color: '#000',
                                                                        border: 'none', borderRadius: '10px', fontWeight: '900',
                                                                        fontSize: '0.65rem', cursor: 'pointer', transition: '0.3s',
                                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                                        boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)'
                                                                    }}
                                                                ><Check size={14} /> ACCEPT</button>
                                                                <button
                                                                    onClick={() => socket.emit('respond_friend_request', { requestId: req.id, accept: false })}
                                                                    style={{
                                                                        padding: '8px 15px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
                                                                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                                                                        fontWeight: '900', fontSize: '0.65rem', cursor: 'pointer', transition: '0.3s'
                                                                    }}
                                                                >DECLINE</button>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Sent Requests */}
                                    <AnimatePresence>
                                        {friends.filter(f => f.status === 'PENDING' && f.isSender).length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                style={{ marginTop: '10px' }}
                                            >
                                                <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginBottom: '12px', letterSpacing: '1px' }}>
                                                    OUTGOING REQUESTS ({friends.filter(f => f.status === 'PENDING' && f.isSender).length})
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {friends.filter(f => f.status === 'PENDING' && f.isSender).map(req => (
                                                        <motion.div
                                                            key={req.id}
                                                            whileHover={{ background: 'rgba(255,255,255,0.04)' }}
                                                            style={{
                                                                background: 'rgba(255,255,255,0.02)',
                                                                padding: '12px 16px', borderRadius: '16px',
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                                display: 'flex', justifyContent: 'space-between',
                                                                alignItems: 'center', transition: '0.3s'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <User size={16} color="rgba(255,255,255,0.2)" />
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'rgba(255,255,255,0.6)' }}>{req.friendName}</div>
                                                                    <div style={{ fontSize: '0.55rem', color: 'var(--accent)', fontWeight: '900', letterSpacing: '1px', opacity: 0.7 }}>WAITING...</div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => setRequestToCancel(req)}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                    color: '#ef4444', cursor: 'pointer', width: '32px', height: '32px',
                                                                    borderRadius: '10px', display: 'flex', alignItems: 'center',
                                                                    justifyContent: 'center', transition: '0.3s'
                                                                }}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Empty State */}
                                    {friends.filter(f => f.status === 'PENDING').length === 0 && friendSearchResults.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>
                                            <Users size={40} style={{ marginBottom: '15px', opacity: 0.1 }} />
                                            <p style={{ margin: 0, fontSize: '0.85rem' }}>No pending requests.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}

                    {/* TRADE TAB */}
                    {socialTab === 'TRADE' && (
                        <>
                            {/* Search Box */}
                            <div style={{ marginBottom: '25px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '1px' }}>SEARCH PLAYER</div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="text"
                                            value={searchNick}
                                            onChange={(e) => setSearchNick(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                            placeholder="Enter player's name"
                                            style={{
                                                width: '100%', padding: '12px 15px', borderRadius: '10px',
                                                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                                                color: '#fff', outline: 'none', transition: '0.2s'
                                            }}
                                        />
                                        <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                                    </div>
                                    <button
                                        onClick={handleSearch}
                                        disabled={searching}
                                        style={{
                                            padding: '0 20px', borderRadius: '10px', background: 'var(--accent)',
                                            color: '#000', fontWeight: '800', border: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        {searching ? '...' : 'FIND'}
                                    </button>
                                </div>
                                {error && <div style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: '8px', fontWeight: 'bold' }}>{error}</div>}
                            </div>

                            {/* Search Results */}
                            <AnimatePresence>
                                {searchResults.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{
                                            display: 'flex', flexDirection: 'column', gap: '8px',
                                            marginBottom: '25px', maxHeight: '200px', overflowY: 'auto',
                                            paddingRight: '5px'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-dim)', marginBottom: '4px' }}>MATCHING PLAYERS:</div>
                                        {searchResults.map(result => (
                                            <motion.div
                                                key={result.id}
                                                whileHover={{ x: 5, background: 'rgba(255,255,255,0.05)' }}
                                                style={{
                                                    padding: '16px', background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{
                                                        width: '42px', height: '42px', borderRadius: '14px',
                                                        background: 'rgba(255,255,255,0.03)', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        border: '1px solid rgba(255,255,255,0.05)'
                                                    }}>
                                                        <User size={18} color="rgba(255,255,255,0.4)" />
                                                    </div>
                                                    <div>
                                                        <div
                                                            style={{ fontSize: '1rem', fontWeight: '900', color: '#fff', cursor: 'pointer' }}
                                                            onClick={() => onInspect && onInspect(result.name)}
                                                        >
                                                            {result.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>Level {result.level}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => !result.isIronman && onInvite(result.name)}
                                                    disabled={result.isIronman}
                                                    style={{
                                                        padding: '8px 18px', borderRadius: '12px',
                                                        background: result.isIronman ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
                                                        color: result.isIronman ? 'rgba(255,255,255,0.2)' : '#000',
                                                        fontWeight: '900', fontSize: '0.75rem', border: 'none',
                                                        cursor: result.isIronman ? 'not-allowed' : 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                        transition: '0.3s',
                                                        boxShadow: result.isIronman ? 'none' : '0 4px 15px rgba(212, 175, 55, 0.2)'
                                                    }}
                                                >
                                                    {result.isIronman ? <Shield size={14} /> : <Send size={14} />}
                                                    {result.isIronman ? 'IRONMAN' : 'INVITE'}
                                                </button>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Incoming Invites */}
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-dim)', marginBottom: '12px', letterSpacing: '1px' }}>PENDING OFFERS</div>
                                {(tradeInvites || []).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                        No pending trade offers.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {tradeInvites.map(trade => (
                                            <motion.div
                                                key={trade.id}
                                                whileHover={{ x: 5, background: 'rgba(212, 175, 55, 0.08)' }}
                                                style={{
                                                    padding: '16px', background: 'rgba(212, 175, 55, 0.05)',
                                                    borderRadius: '20px', border: '1px solid rgba(212, 175, 55, 0.2)',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{
                                                        width: '42px', height: '42px', borderRadius: '14px',
                                                        background: 'rgba(212, 175, 55, 0.1)', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        border: '1px solid rgba(212, 175, 55, 0.2)'
                                                    }}>
                                                        <ArrowLeftRight size={20} color="#D4AF37" />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>Incoming Trade</div>
                                                        <div
                                                            style={{ color: '#D4AF37', fontWeight: '900', cursor: 'pointer', fontSize: '1.1rem', letterSpacing: '0.5px' }}
                                                            onClick={() => onInspect && onInspect(trade.partner_name)}
                                                        >
                                                            {trade.partner_name || 'Unknown'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => onInvite(trade.id)}
                                                    style={{
                                                        padding: '10px 20px', borderRadius: '12px', background: 'var(--accent)',
                                                        color: '#000', fontWeight: '900', fontSize: '0.75rem',
                                                        border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                                                        transition: '0.3s'
                                                    }}
                                                >
                                                    OPEN TRADE
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* HISTORY TAB */}
                    {socialTab === 'HISTORY' && (
                        <>
                            {isLoadingHistory ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
                                    <Clock size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
                                    <p style={{ fontSize: '0.85rem' }}>Loading history...</p>
                                </div>
                            ) : tradeHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
                                    <ArrowLeftRight size={36} style={{ marginBottom: '10px', opacity: 0.3 }} />
                                    <p style={{ fontSize: '0.85rem' }}>No trade history found.</p>
                                    <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Completed trades will appear here.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                                    {tradeHistory.map((tx, idx) => {
                                        const timeAgo = getTimeAgo(tx.created_at);
                                        const isSender = tx.role === 'SENDER';
                                        const otherPlayer = isSender ? tx.receiver_name : tx.sender_name;
                                        const myItems = isSender ? tx.sender_items : tx.receiver_items;
                                        const mySilver = isSender ? tx.sender_silver : tx.receiver_silver;
                                        const myTax = isSender ? tx.sender_tax : tx.receiver_tax;
                                        const theirItems = isSender ? tx.receiver_items : tx.sender_items;
                                        const theirSilver = isSender ? tx.receiver_silver : tx.sender_silver;

                                        return (
                                            <motion.div
                                                key={tx.id || idx}
                                                whileHover={{ y: -2, background: 'rgba(255,255,255,0.04)' }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    borderRadius: '20px',
                                                    padding: '16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                {/* Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <ArrowLeftRight size={16} color="var(--accent)" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: '900', letterSpacing: '1px' }}>COMPLETED TRADE</div>
                                                            <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#fff' }}>
                                                                With <span style={{ color: 'var(--accent)' }}>{otherPlayer || 'Unknown'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>{timeAgo}</span>
                                                </div>

                                                {/* Two columns: Sent / Received */}
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    {/* Sent */}
                                                    <div style={{
                                                        flex: 1,
                                                        background: 'rgba(239, 68, 68, 0.05)',
                                                        border: '1px solid rgba(239, 68, 68, 0.1)',
                                                        borderRadius: '12px',
                                                        padding: '12px'
                                                    }}>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: '900', color: '#ef4444', marginBottom: '8px', letterSpacing: '1px' }}>SENT</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {(myItems || []).map((it, i) => {
                                                                const itemData = it || {};
                                                                return (
                                                                    <div key={i} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        {itemData.icon ? (
                                                                            <img src={itemData.icon} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                                                        ) : <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }} />}
                                                                        <span>{it.amount}x <span style={{ fontWeight: 'bold' }}>{itemData.name || formatItemId(it.id)}</span></span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {mySilver > 0 && (
                                                                <div style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                                                                    <Coins size={14} /> {formatNumber(mySilver)}
                                                                </div>
                                                            )}
                                                            {myTax > 0 && (
                                                                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                                                                    Tax: {formatNumber(myTax)} silver
                                                                </div>
                                                            )}
                                                            {(!myItems || myItems.length === 0) && !mySilver && (
                                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Nothing offered</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Received */}
                                                    <div style={{
                                                        flex: 1,
                                                        background: 'rgba(34, 197, 94, 0.05)',
                                                        border: '1px solid rgba(34, 197, 94, 0.1)',
                                                        borderRadius: '12px',
                                                        padding: '12px'
                                                    }}>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: '900', color: '#22c55e', marginBottom: '8px', letterSpacing: '1px' }}>RECEIVED</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {(theirItems || []).map((it, i) => {
                                                                const itemData = it || {};
                                                                return (
                                                                    <div key={i} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        {itemData.icon ? (
                                                                            <img src={itemData.icon} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                                                        ) : <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }} />}
                                                                        <span>{it.amount}x <span style={{ fontWeight: 'bold' }}>{itemData.name || formatItemId(it.id)}</span></span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {theirSilver > 0 && (
                                                                <div style={{ fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                                                                    <Coins size={14} /> {formatNumber(theirSilver)}
                                                                </div>
                                                            )}
                                                            {(!theirItems || theirItems.length === 0) && !theirSilver && (
                                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Nothing received</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                </div>
            </motion.div>

            <AnimatePresence>
                {friendToRemove && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 13000,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: 'var(--panel-bg)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-active)',
                                padding: '25px',
                                width: '100%',
                                maxWidth: '350px',
                                textAlign: 'center',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                            }}
                        >
                            <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1.1rem' }}>Remove Friend?</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
                                Are you sure you want to remove <span style={{ color: '#fff', fontWeight: 'bold' }}>{friendToRemove.friendName}</span> from your friends list?
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setFriendToRemove(null)}
                                    style={{
                                        flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)',
                                        color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer',
                                        transition: '0.3s'
                                    }}
                                >CANCEL</button>
                                <button
                                    onClick={async () => {
                                        socket.emit('remove_friend', { friendId: friendToRemove.id });
                                        setFriendToRemove(null);
                                    }}
                                    style={{
                                        flex: 1, padding: '12px', background: '#ef4444',
                                        color: '#fff', border: 'none',
                                        borderRadius: '12px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', transition: '0.3s'
                                    }}
                                >REMOVE</button>
                            </div>
                        </motion.div>
                    </div>
                )}
                {requestToCancel && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 13000,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: 'var(--panel-bg)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-active)',
                                padding: '25px',
                                width: '100%',
                                maxWidth: '350px',
                                textAlign: 'center',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                            }}
                        >
                            <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1.1rem' }}>Cancel Friend Request?</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
                                Are you sure you want to cancel the request sent to <span style={{ color: '#fff', fontWeight: 'bold' }}>{requestToCancel.friendName}</span>?
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setRequestToCancel(null)}
                                    style={{
                                        flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)',
                                        color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer',
                                        transition: '0.3s'
                                    }}
                                >KEEP REQUEST</button>
                                <button
                                    onClick={() => {
                                        socket.emit('cancel_friend_request', { requestId: requestToCancel.id });
                                        setRequestToCancel(null);
                                    }}
                                    style={{
                                        flex: 1, padding: '12px', background: '#ef4444',
                                        color: '#fff', border: 'none',
                                        borderRadius: '12px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', transition: '0.3s'
                                    }}
                                >CANCEL REQUEST</button>
                            </div>
                        </motion.div>
                    </div>
                )}
                {bestFriendToConfirm && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 13000,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: 'var(--panel-bg)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255, 215, 0, 0.3)',
                                padding: '25px',
                                width: '100%',
                                maxWidth: '350px',
                                textAlign: 'center',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%',
                                background: 'rgba(255, 215, 0, 0.1)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 15px', border: '1px solid rgba(255, 215, 0, 0.2)'
                            }}>
                                <Star size={30} fill="#FFD700" color="#FFD700" />
                            </div>
                            <h3 style={{ margin: '0 0 10px 0', color: '#FFD700', fontSize: '1.2rem', fontWeight: '900' }}>Best Friend Request</h3>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
                                Do you want to send a Best Friend request to <span style={{ color: '#fff', fontWeight: 'bold' }}>{bestFriendToConfirm.friendName}</span>?
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setBestFriendToConfirm(null)}
                                    style={{
                                        flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)',
                                        color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer',
                                        transition: '0.3s'
                                    }}
                                >CANCEL</button>
                                <button
                                    onClick={() => {
                                        socket.emit('request_best_friend', { friendId: bestFriendToConfirm.friendId });
                                        setBestFriendToConfirm(null);
                                    }}
                                    style={{
                                        flex: 1, padding: '12px', background: 'linear-gradient(135deg, #FFD700, #DAA520)',
                                        color: '#000', border: 'none',
                                        borderRadius: '12px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)', transition: '0.3s'
                                    }}
                                >SEND REQUEST</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SocialPanel;
