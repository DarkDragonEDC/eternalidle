import React, { useState, useEffect } from 'react';
import { Search, Users, Send, X, User, Shield, ArrowLeftRight, Clock, Coins, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatItemId } from '@shared/items';

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

    if (isIronman) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 12000,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    style={{
                        width: '100%', maxWidth: '500px', background: 'var(--panel-bg)',
                        borderRadius: '16px', border: '1px solid var(--border-active)',
                        overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        position: 'relative'
                    }}
                >
                    <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', zIndex: 10 }}>
                        <X size={24} />
                    </button>

                    <div style={{
                        padding: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'rgba(212, 175, 55, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '10px',
                            border: '2px solid rgba(212, 175, 55, 0.2)'
                        }}>
                            <Shield size={40} color="var(--accent)" />
                        </div>
                        <h2 style={{ color: 'var(--accent)', margin: 0, fontSize: '1.8rem', letterSpacing: '2px' }}>IRONMAN MODE</h2>
                        <p style={{ color: 'var(--text-dim)', maxWidth: '400px', lineHeight: '1.6', fontSize: '1rem' }}>
                            Ironman characters are self-sufficient and cannot Trade with other players.
                            <br /><br />
                            All items must be gathered, crafted, or found through your own adventures!
                        </p>
                        <div style={{
                            marginTop: '20px',
                            padding: '15px 25px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            fontSize: '0.9rem',
                            color: 'var(--accent)',
                            fontWeight: 'bold'
                        }}>
                            STRICT SELF-SUFFICIENCY ACTIVE
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
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                    width: '100%', maxWidth: '500px', maxHeight: '85vh', background: 'var(--panel-bg)',
                    borderRadius: '16px', border: '1px solid var(--border-active)',
                    overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column'
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
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
                    <button
                        onClick={() => setSocialTab('FRIENDS')}
                        style={{
                            flex: 1, padding: '12px', background: 'transparent', border: 'none',
                            borderBottom: socialTab === 'FRIENDS' ? '2px solid var(--accent)' : '2px solid transparent',
                            color: socialTab === 'FRIENDS' ? 'var(--accent)' : 'var(--text-dim)',
                            fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer',
                            letterSpacing: '1px', transition: '0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <Users size={14} /> FRIENDS
                    </button>
                    <button
                        onClick={() => setSocialTab('TRADE')}
                        style={{
                            flex: 1, padding: '12px', background: 'transparent', border: 'none',
                            borderBottom: socialTab === 'TRADE' ? '2px solid var(--accent)' : '2px solid transparent',
                            color: socialTab === 'TRADE' ? 'var(--accent)' : 'var(--text-dim)',
                            fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer',
                            letterSpacing: '1px', transition: '0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <Send size={14} /> TRADE
                    </button>
                    <button
                        onClick={() => setSocialTab('HISTORY')}
                        style={{
                            flex: 1, padding: '12px', background: 'transparent', border: 'none',
                            borderBottom: socialTab === 'HISTORY' ? '2px solid var(--accent)' : '2px solid transparent',
                            color: socialTab === 'HISTORY' ? 'var(--accent)' : 'var(--text-dim)',
                            fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer',
                            letterSpacing: '1px', transition: '0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <Clock size={14} /> HISTORY
                    </button>
                </div>

                <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>

                    {/* FRIENDS TAB */}
                    {socialTab === 'FRIENDS' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                            {/* Sub-Tabs */}
                            <div style={{ display: 'flex', gap: '6px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {[
                                    { key: 'LIST', label: 'ADDED', icon: <Users size={12} /> },
                                    { key: 'REQUESTS', label: 'REQUESTS', icon: <Send size={12} />, badge: friends.filter(f => f.status === 'PENDING' && !f.isSender).length }
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setFriendsSubTab(tab.key)}
                                        style={{
                                            padding: '7px 16px', borderRadius: '8px',
                                            background: friendsSubTab === tab.key ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                                            color: friendsSubTab === tab.key ? '#000' : 'var(--text-dim)',
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
                                                <div key={friend.id} style={{
                                                    padding: '12px', background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '12px', border: '1px solid var(--border)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <div style={{
                                                                width: '36px', height: '36px', borderRadius: '10px',
                                                                background: 'var(--accent-soft)', display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center'
                                                            }}>
                                                                <User size={18} color="var(--accent)" />
                                                            </div>
                                                            <div style={{
                                                                position: 'absolute', bottom: '-2px', right: '-2px',
                                                                width: '12px', height: '12px', borderRadius: '50%',
                                                                background: friend.isOnline ? '#22c55e' : (friend.currentActivity ? '#f59e0b' : '#444'),
                                                                border: '2px solid var(--panel-bg)'
                                                            }} />
                                                        </div>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span
                                                                    style={{ fontSize: '0.9rem', fontWeight: '900', color: '#fff', cursor: 'pointer' }}
                                                                    onClick={() => onInspect && onInspect(friend.friendName)}
                                                                >
                                                                    {friend.friendName}
                                                                </span>
                                                                {friend.isOnline && <span style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: 'bold' }}>ONLINE</span>}
                                                                {!friend.isOnline && friend.currentActivity && <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 'bold' }}>OFFLINE</span>}
                                                            </div>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                                                                {friend.title ? `${friend.title} • ` : ''}Level {friend.level}
                                                            </div>
                                                            {friend.currentActivity ? (
                                                                <div style={{
                                                                    fontSize: '0.6rem',
                                                                    color: friend.isOnline ? '#22c55e' : '#f59e0b',
                                                                    display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px',
                                                                    opacity: friend.isOnline ? 1 : 0.8
                                                                }}>
                                                                    <span style={{
                                                                        width: '5px', height: '5px', borderRadius: '50%',
                                                                        background: friend.isOnline ? '#22c55e' : '#f59e0b',
                                                                        display: 'inline-block',
                                                                        animation: friend.isOnline ? 'pulse 2s infinite' : 'none'
                                                                    }} />
                                                                    {friend.currentActivity.type.charAt(0) + friend.currentActivity.type.slice(1).toLowerCase()}
                                                                    {friend.currentActivity.itemId && ` • ${friend.currentActivity.itemId.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}`}
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontStyle: 'italic', opacity: 0.6, marginTop: '2px' }}>
                                                                    {friend.isOnline ? 'Idle' : 'Offline'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button
                                                            onClick={() => onInvite(friend.friendName)}
                                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                                                            title="Trade"
                                                        ><ArrowLeftRight size={16} /></button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`Remove ${friend.friendName} from friends?`)) {
                                                                    socket.emit('remove_friend', { friendId: friend.friendId });
                                                                }
                                                            }}
                                                            style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.5)', cursor: 'pointer', padding: '4px' }}
                                                            title="Remove Friend"
                                                        ><X size={16} /></button>
                                                    </div>
                                                </div>
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
                                    <AnimatePresence>
                                        {friendSearchResults.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                                            >
                                                <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-dim)', marginBottom: '4px' }}>MATCHING PLAYERS:</div>
                                                {friendSearchResults.map(result => (
                                                    <div key={result.id} style={{
                                                        padding: '12px', background: 'rgba(255,255,255,0.02)',
                                                        borderRadius: '12px', border: '1px solid var(--border)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{
                                                                width: '32px', height: '32px', borderRadius: '8px',
                                                                background: 'var(--accent-soft)', display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center'
                                                            }}>
                                                                <User size={16} color="var(--accent)" />
                                                            </div>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{result.name}</span>
                                                                    {result.isIronman && (
                                                                        <div style={{
                                                                            fontSize: '0.55rem', background: 'rgba(255,255,255,0.05)',
                                                                            color: 'var(--text-dim)', padding: '1px 6px',
                                                                            borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)',
                                                                            display: 'flex', alignItems: 'center', gap: '3px'
                                                                        }}>
                                                                            <Shield size={10} /> IRONMAN
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Level {result.level}</div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                socket.emit('add_friend', { friendName: result.name });
                                                                setFriendSearchResults([]);
                                                                setFriendSearchNick('');
                                                            }}
                                                            style={{
                                                                padding: '6px 15px', borderRadius: '8px', background: 'var(--accent-soft)',
                                                                color: 'var(--accent)', fontWeight: 'bold', border: '1px solid var(--accent)',
                                                                fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                                                            }}
                                                        >
                                                            <Send size={12} /> INVITE
                                                        </button>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Received Requests */}
                                    {friends.filter(f => f.status === 'PENDING' && !f.isSender).length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--accent)', marginBottom: '10px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                                                RECEIVED ({friends.filter(f => f.status === 'PENDING' && !f.isSender).length})
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {friends.filter(f => f.status === 'PENDING' && !f.isSender).map(req => (
                                                    <motion.div
                                                        key={req.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        style={{
                                                            padding: '12px 14px', background: 'rgba(var(--accent-rgb), 0.08)',
                                                            borderRadius: '12px', border: '1px solid var(--accent-soft)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{
                                                                width: '34px', height: '34px', borderRadius: '8px',
                                                                background: 'var(--accent-soft)', display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center'
                                                            }}>
                                                                <User size={16} color="var(--accent)" />
                                                            </div>
                                                            <div>
                                                                <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{req.friendName}</div>
                                                                <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 'bold', letterSpacing: '0.5px' }}>WANTS TO BE YOUR FRIEND</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button
                                                                onClick={() => socket.emit('respond_friend_request', { requestId: req.id, accept: true })}
                                                                style={{
                                                                    padding: '6px 14px', background: 'var(--accent)', color: '#000',
                                                                    border: 'none', borderRadius: '8px', fontWeight: 'bold',
                                                                    fontSize: '0.7rem', cursor: 'pointer', transition: '0.2s',
                                                                    display: 'flex', alignItems: 'center', gap: '4px'
                                                                }}
                                                            ><Check size={12} /> ACCEPT</button>
                                                            <button
                                                                onClick={() => socket.emit('respond_friend_request', { requestId: req.id, accept: false })}
                                                                style={{
                                                                    padding: '6px 14px', background: 'rgba(255,255,255,0.05)', color: '#fff',
                                                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                                                                    fontWeight: 'bold', fontSize: '0.7rem', cursor: 'pointer', transition: '0.2s'
                                                                }}
                                                            >DECLINE</button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sent Requests */}
                                    {friends.filter(f => f.status === 'PENDING' && f.isSender).length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-dim)', marginBottom: '12px', letterSpacing: '1px', opacity: 0.7 }}>
                                                SENT ({friends.filter(f => f.status === 'PENDING' && f.isSender).length})
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {friends.filter(f => f.status === 'PENDING' && f.isSender).map(req => (
                                                    <motion.div
                                                        key={req.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        style={{
                                                            background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                                            padding: '10px 14px', borderRadius: '10px',
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            display: 'flex', justifyContent: 'space-between',
                                                            alignItems: 'center', transition: '0.3s'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <User size={14} color="var(--text-dim)" opacity={0.5} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dim)' }}>{req.friendName}</div>
                                                                <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 'bold', letterSpacing: '0.5px' }}>REQUEST SENT</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic', opacity: 0.5 }}>Waiting...</span>
                                                            <button
                                                                onClick={() => socket.emit('cancel_friend_request', { requestId: req.id })}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                    color: '#ef4444', cursor: 'pointer', padding: '6px',
                                                                    borderRadius: '8px', display: 'flex', alignItems: 'center',
                                                                    justifyContent: 'center', transition: '0.2s'
                                                                }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                                                title="Cancel Request"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {friends.filter(f => f.status === 'PENDING').length === 0 && friendSearchResults.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.5 }}>
                                            Search for players above to send friend requests!
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
                                            <div
                                                key={result.id}
                                                style={{
                                                    padding: '12px', background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '12px', border: '1px solid var(--border)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '8px',
                                                        background: 'var(--accent-soft)', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        position: 'relative'
                                                    }}>
                                                        <User size={16} color="var(--accent)" />
                                                    </div>
                                                    <div>
                                                        <div
                                                            style={{ fontSize: '0.85rem', fontWeight: '900', color: '#fff', cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => onInspect && onInspect(result.name)}
                                                        >
                                                            {result.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Level {result.level}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => !result.isIronman && onInvite(result.name)}
                                                    disabled={result.isIronman}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: '8px',
                                                        background: result.isIronman ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
                                                        color: result.isIronman ? 'var(--text-dim)' : '#000',
                                                        fontWeight: '800', fontSize: '0.7rem', border: 'none',
                                                        cursor: result.isIronman ? 'not-allowed' : 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        opacity: result.isIronman ? 0.5 : 1
                                                    }}
                                                    title={result.isIronman ? "Cannot trade with Ironman players" : "Invite to Trade"}
                                                >
                                                    {result.isIronman ? <Shield size={12} /> : <Send size={12} />}
                                                    {result.isIronman ? 'IRONMAN' : 'INVITE'}
                                                </button>
                                            </div>
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                        {tradeInvites.map(trade => (
                                            <div key={trade.id} style={{
                                                padding: '12px', background: 'rgba(0,0,0,0.2)',
                                                borderRadius: '10px', border: '1px solid var(--border)',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <span style={{ fontSize: '0.85rem', color: '#fff' }}>
                                                    Trade with <span
                                                        style={{ color: 'var(--accent)', fontWeight: '900', cursor: 'pointer', textDecoration: 'underline' }}
                                                        onClick={() => onInspect && onInspect(trade.partner_name)}
                                                    >
                                                        {trade.partner_name || 'Unknown'}
                                                    </span>
                                                </span>
                                                <button
                                                    onClick={() => onInvite(trade.id)}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)',
                                                        color: 'var(--accent)', fontWeight: '800', fontSize: '0.75rem',
                                                        border: '1px solid var(--border-active)', cursor: 'pointer'
                                                    }}
                                                >
                                                    OPEN
                                                </button>
                                            </div>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                                            <div key={tx.id || idx} style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '10px',
                                                padding: '10px 12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}>
                                                {/* Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <ArrowLeftRight size={12} style={{ color: 'var(--accent)' }} />
                                                        <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#fff' }}>
                                                            <span style={{ color: 'var(--accent)' }}>{otherPlayer || 'Unknown'}</span>
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{timeAgo}</span>
                                                </div>

                                                {/* Two columns: Sent / Received */}
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {/* Sent */}
                                                    <div style={{
                                                        flex: 1,
                                                        background: 'rgba(239, 68, 68, 0.08)',
                                                        border: '1px solid rgba(239, 68, 68, 0.15)',
                                                        borderRadius: '6px',
                                                        padding: '6px'
                                                    }}>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '3px' }}>SENT</div>
                                                        {(myItems || []).map((it, i) => {
                                                            const itemData = it || {};
                                                            return (
                                                                <div key={i} style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '1px' }}>
                                                                    {itemData.icon && (
                                                                        <img src={itemData.icon} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                                                                    )}
                                                                    <span>{it.amount}x {itemData.name || formatItemId(it.id)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        {mySilver > 0 && (
                                                            <div style={{ fontSize: '0.72rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                <Coins size={10} /> {formatNumber(mySilver)}
                                                            </div>
                                                        )}
                                                        {myTax > 0 && (
                                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                                                                Tax: {formatNumber(myTax)}
                                                            </div>
                                                        )}
                                                        {(!myItems || myItems.length === 0) && !mySilver && (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Nothing</div>
                                                        )}
                                                    </div>

                                                    {/* Received */}
                                                    <div style={{
                                                        flex: 1,
                                                        background: 'rgba(34, 197, 94, 0.08)',
                                                        border: '1px solid rgba(34, 197, 94, 0.15)',
                                                        borderRadius: '6px',
                                                        padding: '6px'
                                                    }}>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '3px' }}>RECEIVED</div>
                                                        {(theirItems || []).map((it, i) => {
                                                            const itemData = it || {};
                                                            return (
                                                                <div key={i} style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '1px' }}>
                                                                    {itemData.icon && (
                                                                        <img src={itemData.icon} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                                                                    )}
                                                                    <span>{it.amount}x {itemData.name || formatItemId(it.id)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        {theirSilver > 0 && (
                                                            <div style={{ fontSize: '0.72rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                <Coins size={10} /> {formatNumber(theirSilver)}
                                                            </div>
                                                        )}
                                                        {(!theirItems || theirItems.length === 0) && !theirSilver && (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Nothing</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                </div>
            </motion.div>
        </div>
    );
};

export default SocialPanel;
