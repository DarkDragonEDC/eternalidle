import React, { useState, useEffect } from 'react';
import { Search, Users, Send, X, User, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SocialPanel = ({ socket, isOpen, onClose, onInvite, tradeInvites, gameState, onInspect }) => {
    const [searchNick, setSearchNick] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!socket) return;

        const handleResult = (results) => {
            setSearchResults(results || []);
            setSearching(false);
            setError('');
        };

        const handleError = (err) => {
            if (searching) {
                setError(err.message);
                setSearching(false);
                setSearchResults([]);
            }
        };

        socket.on('trade_search_result', handleResult);
        socket.on('error', handleError);

        return () => {
            socket.off('trade_search_result', handleResult);
            socket.off('error', handleError);
        };
    }, [socket, searching]);

    const handleSearch = () => {
        if (!searchNick.trim()) return;
        setSearching(true);
        setError('');
        socket.emit('trade_search_player', { nickname: searchNick });
    };

    if (!isOpen) return null;

    const isIronman = gameState?.state?.isIronman || gameState?.name?.toLowerCase() === 'ironman' || gameState?.name?.toLowerCase().includes('[im]');

    if (isIronman) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 11000,
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
            position: 'fixed', inset: 0, zIndex: 11000,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                    width: '100%', maxWidth: '500px', background: 'var(--panel-bg)',
                    borderRadius: '16px', border: '1px solid var(--border-active)',
                    overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
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
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', letterSpacing: '1px', color: '#fff' }}>TRADE CENTER</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '20px' }}>
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
                                            onClick={() => onInvite(trade.id)} // Reuse onInvite or handle specifically
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
                </div>
            </motion.div>
        </div>
    );
};

export default SocialPanel;
