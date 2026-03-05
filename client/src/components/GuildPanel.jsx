import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Sword, Swords, Trophy, Settings, Plus, Info, Check, X, Coins, Sparkles, Tag, User, Zap } from 'lucide-react';
import { formatSilver } from '@utils/format';
import { COUNTRIES } from '../../../shared/countries';

const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

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

const GuildDashboard = ({ guild, socket, isMobile }) => {
    if (!guild) return null;

    const members = guild.members || [];
    const memberLimit = 10;
    const currentXP = guild.xp || 0;
    const nextLevelXP = (guild.level || 1) * 1000; // Mock formula for visualization
    const xpProgress = (currentXP / nextLevelXP) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '12px' : '20px',
                paddingBottom: '20px'
            }}
        >
            {/* Premium Guild Header */}
            <div style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}>
                {/* Dynamic Background Gradient */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(135deg, ${guild.bg_color || '#1a1a1a'}dd 0%, #000000ee 100%)`,
                    zIndex: 0
                }} />

                {/* Soft Glow Effect */}
                <div style={{
                    position: 'absolute',
                    top: '-20%',
                    right: '-10%',
                    width: '60%',
                    height: '140%',
                    background: `radial-gradient(circle, ${guild.bg_color || '#d4af37'}22 0%, transparent 70%)`,
                    zIndex: 1,
                    filter: 'blur(40px)'
                }} />

                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    padding: isMobile ? '20px' : '30px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'center' : 'center',
                    gap: isMobile ? '15px' : '25px',
                    textAlign: isMobile ? 'center' : 'left'
                }}>
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        style={{
                            width: isMobile ? '70px' : '90px',
                            height: isMobile ? '70px' : '90px',
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: `0 0 20px ${guild.icon_color || '#fff'}22`,
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <Shield size={isMobile ? 36 : 48} color={guild.icon_color || '#fff'} />
                    </motion.div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '10px', marginBottom: '4px' }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: isMobile ? '1.3rem' : '1.8rem',
                                fontWeight: '900',
                                color: '#fff',
                                letterSpacing: '-0.5px'
                            }}>{guild.name}</h2>
                            <span style={{
                                background: 'var(--accent)',
                                color: '#000',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.65rem',
                                fontWeight: '900',
                                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.2)'
                            }}>{guild.tag}</span>
                        </div>
                        <div style={{
                            fontSize: isMobile ? '0.75rem' : '0.85rem',
                            color: 'rgba(255,255,255,0.5)',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isMobile ? 'center' : 'flex-start',
                            gap: '12px'
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={12} color="var(--accent)" /> LVL {guild.level || 1}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} color="var(--accent)" /> {members.length}/{memberLimit} MEMBERS</span>
                        </div>

                        {/* Guild XP Progress Bar */}
                        <div style={{ marginTop: '15px', maxWidth: isMobile ? '100%' : '300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                <span>GUILD PROGRESS</span>
                                <span>{xpProgress.toFixed(0)}%</span>
                            </div>
                            <div style={{
                                height: '6px',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${xpProgress}%` }}
                                    style={{
                                        height: '100%',
                                        background: 'linear-gradient(90deg, var(--accent) 0%, #fff 100%)',
                                        boxShadow: '0 0 10px var(--accent)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? '10px' : '15px' }}>
                {[
                    { label: 'GUILD BANK', value: '0', icon: <Coins size={14} />, color: 'var(--accent)' },
                    { label: 'TOTAL XP', value: formatNumber(guild.xp || 0), icon: <Sparkles size={14} />, color: '#fff' },
                    { label: 'RANK', value: '#1', icon: <Trophy size={14} />, color: '#ffd700' },
                    { label: 'BONUS', value: '+0%', icon: <Zap size={14} />, color: '#44ff44' }
                ].map((stat, i) => (
                    <div key={i} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        padding: '12px',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        alignItems: isMobile ? 'center' : 'flex-start'
                    }}>
                        <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: '900', letterSpacing: '1px' }}>{stat.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: stat.color }}>
                            {stat.icon} {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Members Section */}
            <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '24px',
                padding: isMobile ? '15px' : '20px',
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        color: '#fff',
                        fontWeight: '900',
                        letterSpacing: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <Users size={16} color="var(--accent)" /> MEMBERS
                    </h3>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            color: 'var(--accent)',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        MANAGE
                    </motion.button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {members.map((member, i) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ background: 'rgba(255,255,255,0.05)', x: 5 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.03)',
                                transition: 'all 0.2s ease',
                                cursor: 'default'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <User size={20} color="rgba(255,255,255,0.4)" />
                                    </div>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        style={{
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            background: member.online ? '#44ff44' : '#555',
                                            position: 'absolute',
                                            bottom: '-2px',
                                            right: '-2px',
                                            border: '2px solid #000',
                                            boxShadow: member.online ? '0 0 8px #44ff4466' : 'none'
                                        }}
                                    />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: member.online ? '#fff' : 'rgba(255,255,255,0.5)' }}>{member.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>LVL {member.level}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: '900',
                                    color: member.role === 'LEADER' ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                                    background: member.role === 'LEADER' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.03)',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    letterSpacing: '0.5px',
                                    border: member.role === 'LEADER' ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid transparent'
                                }}>{member.role}</span>

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'rgba(255,255,255,0.2)',
                                        cursor: 'pointer',
                                        padding: '5px'
                                    }}
                                >
                                    <Info size={16} />
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const GuildPanel = ({ gameState, socket, isMobile }) => {
    const [guildName, setGuildName] = useState('');
    const [guildTag, setGuildTag] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Shield');
    const [iconColor, setIconColor] = useState('#ffffff');
    const [bgColor, setBgColor] = useState('#d4af37'); // Default gold
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [guildSummary, setGuildSummary] = useState('');
    const [activeTab, setActiveTab] = useState('search'); // 'search' or 'create'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('silver');

    // Country selection states
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [countrySearch, setCountrySearch] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
    );

    // Initial search
    useEffect(() => {
        if (activeTab === 'search') {
            socket?.emit('search_guilds', { query: searchQuery, countryCode: selectedCountry?.code || null });
            setIsSearching(true);
        }
    }, [activeTab, socket, selectedCountry]);

    // Search debouncing
    useEffect(() => {
        if (activeTab !== 'search') return;

        const timer = setTimeout(() => {
            socket?.emit('search_guilds', { query: searchQuery, countryCode: selectedCountry?.code || null });
            setIsSearching(true);
        }, 800);

        return () => clearTimeout(timer);
    }, [searchQuery, socket, activeTab, selectedCountry]);

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('guild_search_results', (results) => {
            setSearchResults(results || []);
            setIsSearching(false);
        });

        socket.on('guild_created', (result) => {
            if (result.success) {
                setStatusMessage({ type: 'success', text: 'Guild created successfully!' });
                setActiveTab('search');
            }
        });

        return () => {
            socket.off('guild_search_results');
            socket.off('guild_created');
        };
    }, [socket]);

    const userSilver = gameState?.state?.silver || 0;
    const userOrbs = gameState?.state?.orbs || 0;
    const SILVER_COST = 500000;
    const ORB_COST = 100;

    const canAfford = paymentMethod === 'silver' ? userSilver >= SILVER_COST : userOrbs >= ORB_COST;

    const ICONS = {
        Shield: Shield,
        Sword: Sword,
        Sword2: Swords,
        Trophy: Trophy,
        Sparkles: Sparkles,
        Users: Users,
        Settings: Settings,
        Coins: Coins
    };

    const ICON_COLORS = ['#ffffff', '#ffd700', '#ff4444', '#44aaff', '#44ff44', '#aa44ff'];
    const BG_COLORS = ['#d4af37', '#1a1a1a', '#8b0000', '#00008b', '#006400', '#483d8b'];

    const handleCreateGuild = () => {
        if (!guildName || guildName.length < 3) {
            setStatusMessage({ type: 'error', text: 'Guild Name must be at least 3 characters.' });
            return;
        }
        if (!guildTag || guildTag.length < 2 || guildTag.length > 4) {
            setStatusMessage({ type: 'error', text: 'Tag must be 2-4 characters.' });
            return;
        }
        if (!canAfford) {
            setStatusMessage({ type: 'error', text: `Not enough ${paymentMethod === 'silver' ? 'Silver' : 'Orbs'}!` });
            return;
        }

        setIsSubmitting(true);
        setStatusMessage({ type: 'info', text: 'Sending request to the ancients...' });

        if (socket) {
            socket.emit('create_guild', {
                name: guildName,
                tag: guildTag,
                icon: selectedIcon,
                iconColor: iconColor,
                bgColor: bgColor,
                summary: guildSummary,
                paymentMethod: paymentMethod,
                countryCode: selectedCountry?.code || null
            });
        }

        setTimeout(() => setIsSubmitting(false), 2000);
    };

    const PreviewIcon = ICONS[selectedIcon] || Shield;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="scroll-container" style={{ flex: 1, padding: isMobile ? '2px 5px 5px' : '2px 10px 10px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                    {gameState?.guild ? (
                        <GuildDashboard guild={gameState.guild} socket={socket} isMobile={isMobile} />
                    ) : (
                        <>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => setActiveTab('search')}
                                    style={{
                                        flex: 1,
                                        padding: isMobile ? '8px' : '10px',
                                        background: activeTab === 'search'
                                            ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)'
                                            : 'linear-gradient(180deg, #222 0%, #111 100%)',
                                        border: `1px solid ${activeTab === 'search' ? 'var(--accent)' : 'var(--border)'}`,
                                        borderRadius: '12px',
                                        color: activeTab === 'search' ? 'var(--accent)' : 'var(--text-dim)',
                                        fontWeight: '900',
                                        fontSize: '0.7rem',
                                        letterSpacing: '1px',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: activeTab === 'search' ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none'
                                    }}
                                >
                                    <Users size={14} /> SEARCH
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => setActiveTab('create')}
                                    style={{
                                        flex: 1,
                                        padding: isMobile ? '8px' : '10px',
                                        background: activeTab === 'create'
                                            ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)'
                                            : 'linear-gradient(180deg, #222 0%, #111 100%)',
                                        border: `1px solid ${activeTab === 'create' ? 'var(--accent)' : 'var(--border)'}`,
                                        borderRadius: '12px',
                                        color: activeTab === 'create' ? 'var(--accent)' : 'var(--text-dim)',
                                        fontWeight: '900',
                                        fontSize: '0.7rem',
                                        letterSpacing: '1px',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: activeTab === 'create' ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none'
                                    }}
                                >
                                    <Plus size={14} /> CREATE
                                </motion.button>
                            </div>

                            <AnimatePresence mode="wait">
                                {activeTab === 'search' ? (
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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                            <div style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                background: g.bg_color || '#1a1a1a',
                                                                borderRadius: '10px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: '1px solid rgba(255,255,255,0.1)'
                                                            }}>
                                                                <Shield size={20} color={g.icon_color || '#fff'} />
                                                            </div>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{g.name}</div>
                                                                    {g.country_code && (
                                                                        <CountryFlag code={g.country_code} name={COUNTRIES.find(c => c.code === g.country_code)?.name} size="1rem" />
                                                                    )}
                                                                    <span style={{ color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 'bold' }}>[{g.tag}]</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                                    LVL {g.level || 1} • {g.summary || 'Stronger Together'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => {
                                                                    // Placeholder for Join Logic
                                                                    socket?.emit('apply_to_guild', { guildId: g.id });
                                                                    setStatusMessage({ type: 'info', text: 'Application sent to the Guild Leader!' });
                                                                }}
                                                                style={{
                                                                    padding: '6px 16px',
                                                                    background: 'var(--accent)',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    color: '#000',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: '900',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                JOIN
                                                            </motion.button>
                                                            <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>{g.member_count || 1}/{g.member_limit || 10}</span>
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
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="create"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        style={{
                                            background: '#0a0a0a',
                                            border: '1px solid var(--border)',
                                            borderRadius: '20px',
                                            padding: isMobile ? '2px 8px 6px' : '2px 16px 14px',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        {/* Compact PREVIEW - AAA Polish */}
                                        <div style={{ marginBottom: isMobile ? '12px' : '18px', position: 'relative' }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: '-10px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                fontSize: '0.6rem',
                                                color: 'var(--accent)',
                                                letterSpacing: '2px',
                                                fontWeight: '900',
                                                background: '#0a0a0a',
                                                padding: '0 10px',
                                                border: '1px solid var(--border)',
                                                borderRadius: '4px',
                                                whiteSpace: 'nowrap',
                                                zIndex: 1
                                            }}>HOW OTHERS WILL SEE YOUR GUILD</div>
                                            <motion.div
                                                key={guildName + guildTag + selectedIcon + iconColor + bgColor + (selectedCountry?.code || '') + guildSummary}
                                                initial={{ opacity: 0.9, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        background: bgColor,
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                    }}>
                                                        <PreviewIcon size={20} color={iconColor} />
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ fontWeight: 'bold', color: '#fff' }}>{guildName || 'New Guild'}</div>
                                                            {selectedCountry && (
                                                                <CountryFlag code={selectedCountry.code} name={selectedCountry.name} size="1rem" />
                                                            )}
                                                            <span style={{ color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 'bold' }}>[{guildTag || 'TAG'}]</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                            LVL 1 {guildSummary ? `\u2022 ${guildSummary}` : '\u2022 Stronger Together'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                    <div
                                                        style={{
                                                            padding: '6px 16px',
                                                            background: 'var(--accent)',
                                                            borderRadius: '8px',
                                                            color: '#000',
                                                            fontSize: '0.7rem',
                                                            fontWeight: '900',
                                                            opacity: 0.4
                                                        }}
                                                    >
                                                        JOIN
                                                    </div>
                                                    <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>1/10</span>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Main Interaction Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

                                            {/* LEFT COLUMN: Identity info */}
                                            <div style={{
                                                background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
                                                padding: isMobile ? '8px' : '10px',
                                                borderRadius: '16px',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}>
                                                <div style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Users size={12} color="var(--accent)" /> IDENTITY
                                                </div>
                                                {/* Guild Name */}
                                                <div>
                                                    <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginLeft: '4px', display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>GUILD NAME - {guildName.length}/15</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ex: Knights of Chaos"
                                                        maxLength={15}
                                                        value={guildName}
                                                        onChange={(e) => setGuildName(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            background: '#1a1a1a',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '8px',
                                                            color: '#fff',
                                                            fontSize: '0.8rem',
                                                            outline: 'none',
                                                            transition: '0.2s'
                                                        }}
                                                        onFocus={(e) => {
                                                            e.target.style.borderColor = 'var(--accent)';
                                                            e.target.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.1)';
                                                        }}
                                                        onBlur={(e) => {
                                                            e.target.style.borderColor = 'var(--border)';
                                                            e.target.style.boxShadow = 'none';
                                                        }}
                                                    />
                                                </div>

                                                {/* Guild Tag & Country */}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginLeft: '4px', display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>GUILD TAG - {guildTag.length}/4</label>
                                                        <input
                                                            type="text"
                                                            placeholder="TAG"
                                                            maxLength={4}
                                                            value={guildTag}
                                                            onChange={(e) => setGuildTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                background: '#1a1a1a',
                                                                border: '1px solid var(--border)',
                                                                borderRadius: '8px',
                                                                color: 'var(--accent)',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '900',
                                                                letterSpacing: '2px',
                                                                outline: 'none',
                                                                transition: '0.2s'
                                                            }}
                                                            onFocus={(e) => {
                                                                e.target.style.borderColor = 'var(--accent)';
                                                                e.target.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.1)';
                                                            }}
                                                            onBlur={(e) => {
                                                                e.target.style.borderColor = 'var(--border)';
                                                                e.target.style.boxShadow = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1, position: 'relative' }}>
                                                        <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginLeft: '4px', display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>COUNTRY</label>
                                                        <button
                                                            onClick={() => setShowCountryPicker(!showCountryPicker)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                background: '#1a1a1a',
                                                                border: '1px solid var(--border)',
                                                                borderRadius: '8px',
                                                                color: '#fff',
                                                                fontSize: '0.8rem',
                                                                textAlign: 'left',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                height: '37px'
                                                            }}
                                                            onFocus={(e) => {
                                                                e.target.style.borderColor = 'var(--accent)';
                                                                e.target.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.1)';
                                                            }}
                                                            onBlur={(e) => {
                                                                e.target.style.borderColor = 'var(--border)';
                                                                e.target.style.boxShadow = 'none';
                                                            }}
                                                        >
                                                            <CountryFlag code={selectedCountry?.code} name={selectedCountry?.name} size="1.2rem" />
                                                            <span style={{ color: selectedCountry ? '#fff' : 'var(--text-dim)', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {selectedCountry ? selectedCountry.name : 'All Regions'}
                                                            </span>
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
                                                                            <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>CHOOSE ORIGIN</div>
                                                                            <button onClick={() => setShowCountryPicker(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={20} /></button>
                                                                        </div>

                                                                        <input
                                                                            type="text"
                                                                            placeholder="Filter country..."
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

                                                {/* Guild Summary */}
                                                <div>
                                                    <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginLeft: '4px', display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>GUILD SUMMARY - {guildSummary.length}/100</label>
                                                    <textarea
                                                        placeholder="Describe your guild's purpose..."
                                                        maxLength={100}
                                                        value={guildSummary}
                                                        onChange={(e) => setGuildSummary(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            background: '#1a1a1a',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '8px',
                                                            color: '#fff',
                                                            fontSize: '0.75rem',
                                                            outline: 'none',
                                                            transition: '0.2s',
                                                            resize: 'none',
                                                            height: isMobile ? '35px' : '40px',
                                                            fontFamily: 'inherit'
                                                        }}
                                                        onFocus={(e) => {
                                                            e.target.style.borderColor = 'var(--accent)';
                                                            e.target.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.1)';
                                                        }}
                                                        onBlur={(e) => {
                                                            e.target.style.borderColor = 'var(--border)';
                                                            e.target.style.boxShadow = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* RIGHT COLUMN: Appearance */}
                                            <div style={{
                                                background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
                                                padding: isMobile ? '8px' : '10px',
                                                borderRadius: '16px',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}>
                                                <div style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Sparkles size={10} color="var(--accent)" /> APPEARANCE
                                                </div>

                                                <div>
                                                    <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>CHOOSE ICON</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                                                        {Object.keys(ICONS).map(iconName => {
                                                            const IconComp = ICONS[iconName];
                                                            return (
                                                                <motion.button
                                                                    key={iconName}
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                    onClick={() => setSelectedIcon(iconName)}
                                                                    style={{
                                                                        aspectRatio: '1',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        background: selectedIcon === iconName
                                                                            ? 'linear-gradient(135deg, var(--accent) 0%, #b8860b 100%)'
                                                                            : '#1a1a1a',
                                                                        border: `1px solid ${selectedIcon === iconName ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        color: selectedIcon === iconName ? '#000' : 'rgba(255,255,255,0.4)',
                                                                        transition: '0.2s',
                                                                        padding: '0'
                                                                    }}
                                                                >
                                                                    <IconComp size={isMobile ? 12 : 14} />
                                                                </motion.button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '6px' : '12px' }}>
                                                    {/* Icon Color Selection */}
                                                    <div>
                                                        <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>ICON COLOR</label>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                                                            {ICON_COLORS.map(color => (
                                                                <motion.button
                                                                    key={color}
                                                                    whileHover={{ scale: 1.2 }}
                                                                    whileTap={{ scale: 0.8 }}
                                                                    onClick={() => setIconColor(color)}
                                                                    style={{
                                                                        width: isMobile ? '16px' : '20px',
                                                                        height: isMobile ? '16px' : '20px',
                                                                        background: color,
                                                                        border: iconColor === color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                                                                        borderRadius: '50%',
                                                                        cursor: 'pointer',
                                                                        boxShadow: iconColor === color ? `0 0 10px ${color}88` : 'none',
                                                                        transition: 'all 0.2s',
                                                                        padding: 0
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Background Color Selection */}
                                                    <div>
                                                        <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>BG COLOR</label>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                                                            {BG_COLORS.map(color => (
                                                                <motion.button
                                                                    key={color}
                                                                    whileHover={{ scale: 1.2 }}
                                                                    whileTap={{ scale: 0.8 }}
                                                                    onClick={() => setBgColor(color)}
                                                                    style={{
                                                                        width: isMobile ? '16px' : '20px',
                                                                        height: isMobile ? '16px' : '20px',
                                                                        background: color,
                                                                        border: bgColor === color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        boxShadow: bgColor === color ? `0 0 10px ${color}88` : 'none',
                                                                        transition: 'all 0.2s',
                                                                        padding: 0
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{
                                            background: 'linear-gradient(180deg, #0e0e0e 0%, #050505 100%)',
                                            padding: isMobile ? '8px' : '10px',
                                            borderRadius: '16px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', textAlign: 'center', fontWeight: '900', letterSpacing: '1px' }}>SELECT PAYMENT METHOD</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '7px', marginBottom: '13px' }}>
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setPaymentMethod('silver')}
                                                    style={{
                                                        padding: '8px',
                                                        background: paymentMethod === 'silver'
                                                            ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)'
                                                            : '#111',
                                                        border: `1px solid ${paymentMethod === 'silver' ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '2px',
                                                        transition: '0.2s',
                                                        minHeight: '48px',
                                                        justifyContent: 'center',
                                                        boxShadow: paymentMethod === 'silver' ? '0 0 15px rgba(212, 175, 55, 0.05)' : 'none'
                                                    }}
                                                >
                                                    <div style={{ fontSize: '0.6rem', fontWeight: '900', color: paymentMethod === 'silver' ? 'var(--accent)' : 'var(--text-dim)' }}>SILVER</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <Coins size={10} color="var(--accent)" /> 500k
                                                    </div>
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setPaymentMethod('orb')}
                                                    style={{
                                                        padding: '8px',
                                                        background: paymentMethod === 'orb'
                                                            ? 'linear-gradient(180deg, rgba(144, 213, 255, 0.15) 0%, rgba(144, 213, 255, 0.05) 100%)'
                                                            : '#111',
                                                        border: `1px solid ${paymentMethod === 'orb' ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '2px',
                                                        transition: '0.2s',
                                                        minHeight: '48px',
                                                        justifyContent: 'center',
                                                        boxShadow: paymentMethod === 'orb' ? '0 0 15px rgba(144, 213, 255, 0.05)' : 'none'
                                                    }}
                                                >
                                                    <div style={{ fontSize: '0.6rem', fontWeight: '900', color: paymentMethod === 'orb' ? 'var(--accent)' : 'var(--text-dim)' }}>ORBS</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <Sparkles size={10} color="var(--accent)" /> 100
                                                    </div>
                                                </motion.button>

                                                <motion.button
                                                    whileHover={canAfford && !isSubmitting ? { scale: 1.01, boxShadow: '0 8px 25px rgba(212, 175, 55, 0.2)' } : {}}
                                                    whileTap={canAfford && !isSubmitting ? { scale: 0.99 } : {}}
                                                    onClick={handleCreateGuild}
                                                    disabled={!canAfford || isSubmitting}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        borderRadius: '12px',
                                                        background: canAfford
                                                            ? 'linear-gradient(135deg, var(--accent) 0%, #b8860b 100%)'
                                                            : '#222',
                                                        color: canAfford ? '#000' : 'rgba(255,255,255,0.1)',
                                                        border: 'none',
                                                        cursor: canAfford && !isSubmitting ? 'pointer' : 'not-allowed',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '900',
                                                        transition: '0.3s',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '2px',
                                                        boxShadow: canAfford ? '0 5px 15px rgba(212, 175, 55, 0.1)' : 'none',
                                                        minHeight: '48px'
                                                    }}
                                                >
                                                    {isSubmitting ? (
                                                        <div className="spinner-small" style={{ width: '16px', height: '16px', border: '2px solid #000', borderTop: '2px solid transparent' }} />
                                                    ) : (
                                                        <>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', letterSpacing: '1px' }}>
                                                                <Shield size={16} />
                                                                <span>FOUND GUILD</span>
                                                            </div>
                                                            <div style={{
                                                                fontSize: '0.6rem',
                                                                opacity: 0.9,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                color: canAfford ? '#000' : '#ff4444',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {paymentMethod === 'silver' ? <Coins size={11} color={canAfford ? "#000" : "#ff4444"} /> : <Sparkles size={11} color={canAfford ? "#000" : "#ff4444"} />}
                                                                <span>{paymentMethod === 'silver' ? '500,000' : '100'}</span>
                                                                {!canAfford && <span>(INSUFFICIENT)</span>}
                                                            </div>
                                                        </>
                                                    )}
                                                </motion.button>
                                            </div>

                                            {/* Status Message */}
                                            <AnimatePresence>
                                                {statusMessage && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        style={{
                                                            marginBottom: '13px',
                                                            padding: '10px 18px',
                                                            borderRadius: '10px',
                                                            background: statusMessage.type === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(144,213,255,0.1)',
                                                            border: `1px solid ${statusMessage.type === 'error' ? '#f87171' : 'var(--accent)'}`,
                                                            color: statusMessage.type === 'error' ? '#f87171' : 'var(--accent)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '9px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        {statusMessage.type === 'error' ? <X size={14} /> : <Sparkles size={14} />}
                                                        {statusMessage.text}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {!canAfford && !isSubmitting && (
                                                <div style={{ textAlign: 'center', marginTop: '7px', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                                                    Balance: <span style={{ color: '#ff4444' }}>{paymentMethod === 'silver' ? formatSilver(userSilver) : userOrbs} {paymentMethod === 'silver' ? 'Silver' : 'Orbs'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuildPanel;
