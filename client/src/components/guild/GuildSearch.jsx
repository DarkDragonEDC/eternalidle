import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, X } from 'lucide-react';
import GuildProfileModal from '../GuildProfileModal';
import { COUNTRIES } from '@shared/countries';

const CountryFlag = ({ code, name, size = '1.2rem', style = {} }) => {
    if (!code) return <span style={{ fontSize: size, ...style }}>🌐</span>;
    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            alt={name || code}
            title={name || code}
            style={{
                height: isNaN(size) ? size : `${size}px`,
                width: 'auto',
                borderRadius: '2px',
                display: 'inline-block',
                verticalAlign: 'middle',
                ...style
            }}
        />
    );
};

export const GuildSearch = ({ 
    searchResults: originalSearchResults, 
    onSearch, 
    onApply, 
    isSearching, 
    isApplying: parentIsApplying, 
    playerLevel,
    isMobile,
    ICONS,
    socket,
    isIronman,
    onInspect
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [countrySearch, setCountrySearch] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    
    // Manage local search results for optimistic UI updates
    const [searchResults, setSearchResults] = useState([]);
    const [isApplying, setIsApplying] = useState(false);
    const [selectedGuildId, setSelectedGuildId] = useState(null);

    // Sync from parent
    useEffect(() => {
        setSearchResults(originalSearchResults);
    }, [originalSearchResults]);

    // Handle debounced search internally since onSearch prop usually handles it in parent,
    // but in case we just call onSearch with the latest query
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (onSearch) {
                onSearch(searchQuery, selectedCountry?.code || null);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, selectedCountry, onSearch]);

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const handleApply = (guildId, minLevel, joinMode) => {
        if (isApplying || parentIsApplying || playerLevel < minLevel) return;
        setIsApplying(true);
        if (socket) {
            socket.emit('apply_to_guild', { guildId });
        } else if (onApply) {
            onApply(guildId); // Fallback if handled entirely by parent
        }
        
        // Optimistic UI update
        setSearchResults(prev => prev.map(g => 
            g.id === guildId ? { ...g, my_request_pending: true } : g
        ));

        setTimeout(() => setIsApplying(false), 2000);
    };

    return (
        <motion.div
            key="search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
                background: 'linear-gradient(180deg, #0a0a0a 0%, #000 100%)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: isMobile ? '12px' : '20px',
                minHeight: isMobile ? '300px' : '350px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}
        >
            <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <input
                        type="text"
                        placeholder="Search for guilds by name or tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 15px 12px 40px',
                            background: '#1a1a1a',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '0.9rem',
                            outline: 'none'
                        }}
                    />
                    <Users size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>

                {/* Country Filter in Search */}
                <div style={{ position: 'relative', width: '80px' }}>
                    <button
                        onClick={() => setShowCountryPicker(!showCountryPicker)}
                        style={{
                            width: '100%',
                            height: '100%',
                            background: '#1a1a1a',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '1.4rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title={selectedCountry?.name || "Filter by Country"}
                    >
                        <CountryFlag code={selectedCountry?.code} name={selectedCountry?.name} size="1.4rem" />
                    </button>

                    <AnimatePresence>
                        {showCountryPicker && (
                            <>
                                {/* Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowCountryPicker(false)}
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'rgba(0,0,0,0.8)',
                                        backdropFilter: 'blur(5px)',
                                        zIndex: 10000
                                    }}
                                />
                                {/* Modal */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                                    animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                                    exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                                    style={{
                                        position: 'fixed',
                                        top: '50%',
                                        left: '50%',
                                        width: 'min(350px, 90vw)',
                                        background: '#111',
                                        border: '2px solid var(--accent)',
                                        borderRadius: '24px',
                                        padding: '24px',
                                        zIndex: 10001,
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '15px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>SELECT REGION</div>
                                        <button onClick={() => setShowCountryPicker(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={20} /></button>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Search country..."
                                        value={countrySearch}
                                        onChange={(e) => setCountrySearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            background: '#0a0a0a',
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            color: '#fff',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                            borderColor: 'rgba(255,255,255,0.1)'
                                        }}
                                        autoFocus
                                    />
                                    <div style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '5px' }}>
                                        <button
                                            onClick={() => {
                                                setSelectedCountry(null);
                                                setShowCountryPicker(false);
                                            }}
                                            style={{
                                                aspectRatio: '1',
                                                background: !selectedCountry ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${!selectedCountry ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                                                borderRadius: '12px',
                                                fontSize: '1.5rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: '0.2s'
                                            }}
                                            title="All Countries"
                                        >
                                            🌐
                                        </button>
                                        {filteredCountries.map(c => (
                                            <button
                                                key={c.code}
                                                onClick={() => {
                                                    setSelectedCountry(c);
                                                    setShowCountryPicker(false);
                                                }}
                                                style={{
                                                    aspectRatio: '1',
                                                    background: selectedCountry?.code === c.code ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${selectedCountry?.code === c.code ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: '0.2s'
                                                }}
                                                title={c.name}
                                            >
                                                <CountryFlag code={c.code} name={c.name} size="1.8rem" />
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                {isSearching ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="spinner-small" style={{ width: '30px', height: '30px' }} />
                    </div>
                ) : searchResults.length > 0 ? (
                    searchResults.map((g, idx) => (
                        <motion.div
                            key={g.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '16px',
                                padding: '12px 15px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div
                                style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}
                                onClick={() => setSelectedGuildId(g.id)}
                            >
                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    background: g.bg_color || '#1a1a1a',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    position: 'relative'
                                }}>

                                    <div style={{
                                        position: 'absolute',
                                        top: '0',
                                        left: '0',
                                        transform: 'translate(-50%, -50%)',
                                        background: 'rgba(0,0,0,0.8)',
                                        padding: '1px 3px',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        zIndex: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backdropFilter: 'blur(2px)'
                                    }}>
                                        <CountryFlag code={g.country_code} name={COUNTRIES.find(c => c.code === g.country_code)?.name} size="0.7rem" />
                                    </div>
                                    {(() => {
                                        const ResultIcon = ICONS[g.icon] || Shield;
                                        return <ResultIcon size={20} color={g.icon_color || '#fff'} />;
                                    })()}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{g.name}</div>
                                        <span style={{ color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 'bold' }}>[{g.tag}]</span>
                                        {g.is_ironman && (
                                            <div style={{
                                                background: 'rgba(255, 165, 0, 0.15)',
                                                border: '1px solid rgba(255, 165, 0, 0.4)',
                                                color: '#ffa500',
                                                fontSize: '0.55rem',
                                                padding: '1px 5px',
                                                borderRadius: '4px',
                                                fontWeight: '900',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px'
                                            }}>
                                                <Shield size={10} /> IRONMAN
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                        LVL {g.level || 1} • MIN LVL {g.min_level || 1} • {g.summary || 'Stronger Together'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                {g.my_request_pending ? (
                                    <div style={{
                                        padding: '6px 16px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        color: 'var(--text-dim)',
                                        fontSize: '0.7rem',
                                        fontWeight: '900',
                                        cursor: 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <div className="spinner-small" style={{ width: '10px', height: '10px', borderWidth: '2px' }} />
                                        PENDING
                                    </div>
                                ) : (
                                    <motion.button
                                        whileHover={!(isApplying || playerLevel < g.min_level || (isIronman !== !!g.is_ironman)) ? { scale: 1.05 } : {}}
                                        whileTap={!(isApplying || playerLevel < g.min_level || (isIronman !== !!g.is_ironman)) ? { scale: 0.95 } : {}}
                                        disabled={isApplying || parentIsApplying || playerLevel < g.min_level || (isIronman !== !!g.is_ironman)}
                                        onClick={() => handleApply(g.id, g.min_level, g.join_mode)}
                                        style={{
                                            padding: '6px 16px',
                                            background: (playerLevel < g.min_level || (isIronman !== !!g.is_ironman)) ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
                                            border: (playerLevel < g.min_level || (isIronman !== !!g.is_ironman)) ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                            borderRadius: '8px',
                                            color: (playerLevel < g.min_level || (isIronman !== !!g.is_ironman)) ? 'rgba(255,255,255,0.2)' : '#000',
                                            fontSize: '0.7rem',
                                            fontWeight: '900',
                                            cursor: (isApplying || parentIsApplying || playerLevel < g.min_level || (isIronman !== !!g.is_ironman)) ? 'not-allowed' : 'pointer',
                                            transition: '0.2s'
                                        }}
                                    >
                                        {isIronman !== !!g.is_ironman 
                                            ? (g.is_ironman ? "IRONMAN ONLY" : "NORMAL ONLY") 
                                            : (playerLevel < g.min_level ? `REQ. LVL ${g.min_level}` : (g.join_mode === 'OPEN' ? 'JOIN' : 'APPLY'))
                                        }
                                    </motion.button>
                                )}
                                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>{g.memberCount || 0}/{g.maxMembers || 10}</span>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', opacity: 0.5 }}>
                        <Shield size={48} color="var(--border)" />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-dim)' }}>No guilds found</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Try searching for a different name or tag</div>
                        </div>
                    </div>
                )}
            </div>

            <GuildProfileModal
                isOpen={!!selectedGuildId}
                onClose={() => setSelectedGuildId(null)}
                guildId={selectedGuildId}
                socket={socket}
                onInspect={(name) => {
                    setSelectedGuildId(null);
                    if (onInspect) onInspect(name);
                }}
                isMobile={isMobile}
            />
        </motion.div>
    );
};
