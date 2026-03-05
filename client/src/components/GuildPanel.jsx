import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Sword, Swords, Trophy, Settings, Plus, Info, Check, X, Coins, Sparkles, Tag, User, Zap, LogOut, Edit2, Save } from 'lucide-react';
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

const GuildDashboard = ({ guild, socket, isMobile, onInspect }) => {
    if (!guild) return null;

    const members = guild.members || [];
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [activeTab, setActiveTab] = useState('MEMBERS'); // MEMBERS | REQUESTS
    const [requests, setRequests] = useState([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);

    // Edit Customization States
    const [showEditCustomization, setShowEditCustomization] = useState(false);
    const [editPending, setEditPending] = useState(false);
    const [editIcon, setEditIcon] = useState(guild.icon || 'Shield');
    const [editBgColor, setEditBgColor] = useState(guild.bg_color || '#1a1a1a');
    const [editIconColor, setEditIconColor] = useState(guild.icon_color || '#ffffff');
    const [editCountry, setEditCountry] = useState(guild.country_code ? COUNTRIES.find(c => c.code === guild.country_code) : null);
    const [showEditCountryPicker, setShowEditCountryPicker] = useState(false);
    const [editCountrySearch, setEditCountrySearch] = useState('');

    useEffect(() => {
        if (!socket) return;
        const handleCustomizationUpdated = (result) => {
            setEditPending(false);
            if (result.success) {
                setShowEditCustomization(false);
            }
        };
        socket.on('guild_customization_updated', handleCustomizationUpdated);
        return () => socket.off('guild_customization_updated', handleCustomizationUpdated);
    }, [socket]);

    useEffect(() => {
        if (guild.myRole === 'LEADER' || guild.myRole === 'OFFICER') {
            if (activeTab === 'REQUESTS') setIsLoadingRequests(true);
            socket?.emit('get_guild_requests');

            const handleRequestsData = (data) => {
                setRequests(data);
                setIsLoadingRequests(false);
            };

            socket?.on('guild_requests_data', handleRequestsData);
            return () => socket?.off('guild_requests_data', handleRequestsData);
        }
    }, [socket, guild.myRole, activeTab]);

    const currentXP = guild.xp || 0;
    const memberLimit = guild.member_limit || 10;
    const nextLevelXP = (guild.level || 1) * 1000; // Mock formula for visualization
    const xpProgress = (currentXP / nextLevelXP) * 100;

    const ICONS = {
        Shield: Shield, Sword: Sword, Sword2: Swords, Trophy: Trophy,
        Sparkles: Sparkles, Users: Users, Settings: Settings, Coins: Coins
    };
    const DashboardIcon = ICONS[guild.icon] || Shield;

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
                {/* Dark Base */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: '#0a0a0c', // Premium dark
                    zIndex: 0
                }} />

                {/* Left Flare - bg_color */}
                <div style={{
                    position: 'absolute', top: isMobile ? '-50px' : '-100px', left: isMobile ? '-50px' : '-100px',
                    width: isMobile ? '200px' : '300px', height: isMobile ? '200px' : '300px',
                    background: `radial-gradient(circle, ${guild.bg_color || '#d4af37'}55 0%, transparent 70%)`,
                    zIndex: 1, filter: 'blur(40px)',
                    opacity: 0.8
                }} />

                {/* Right Flare - icon_color */}
                <div style={{
                    position: 'absolute', bottom: isMobile ? '-50px' : '-150px', right: isMobile ? '-50px' : '-100px',
                    width: isMobile ? '200px' : '400px', height: isMobile ? '200px' : '400px',
                    background: `radial-gradient(circle, ${guild.icon_color || '#ffffff'}22 0%, transparent 70%)`,
                    zIndex: 1, filter: 'blur(50px)'
                }} />

                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    padding: isMobile ? '20px' : '30px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'center' : 'center',
                    gap: isMobile ? '20px' : '30px',
                    textAlign: isMobile ? 'center' : 'left'
                }}>
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        style={{
                            width: isMobile ? '80px' : '100px',
                            height: isMobile ? '80px' : '100px',
                            background: guild.bg_color || '#1a1a1a',
                            borderRadius: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 0 20px ${guild.icon_color || '#ffffff'}15`,
                            position: 'relative'
                        }}
                    >
                        {guild.country_code && (
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '-10px',
                                background: 'rgba(0,0,0,0.8)',
                                padding: '4px 6px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(4px)'
                            }}>
                                <CountryFlag code={guild.country_code} name={COUNTRIES.find(c => c.code === guild.country_code)?.name} size="1rem" />
                            </div>
                        )}
                        <DashboardIcon
                            size={isMobile ? 40 : 54}
                            color={guild.icon_color || '#fff'}
                            style={{ filter: `drop-shadow(0 0 10px ${guild.icon_color || '#ffffff'}88)` }}
                        />
                        {guild.myRole === 'LEADER' && (
                            <button
                                onClick={() => {
                                    setEditIcon(guild.icon || 'Shield');
                                    setEditBgColor(guild.bg_color || '#1a1a1a');
                                    setEditIconColor(guild.icon_color || '#ffffff');
                                    setEditCountry(guild.country_code ? COUNTRIES.find(c => c.code === guild.country_code) : null);
                                    setShowEditCustomization(true);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    background: 'var(--accent)',
                                    color: '#000',
                                    padding: '6px',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(255,255,255,0.4)',
                                    zIndex: 11,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                                title="Edit Guild Customization"
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                    </motion.div>
                    <div style={{ flex: 1, width: '100%' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isMobile ? 'center' : 'flex-start',
                            gap: '12px',
                            marginBottom: '10px',
                            flexWrap: 'wrap'
                        }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: isMobile ? '1.1rem' : '1.55rem',
                                fontWeight: '900',
                                color: '#fff',
                                letterSpacing: '-0.5px',
                                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                            }}>{guild.name}</h2>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    background: 'var(--accent)',
                                    color: '#000',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.55rem',
                                    fontWeight: '900',
                                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
                                    letterSpacing: '0.5px'
                                }}>{guild.tag}</span>
                            </div>
                        </div>

                        <div style={{
                            fontSize: '0.6rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isMobile ? 'center' : 'flex-start',
                            gap: '15px'
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.9)' }}>
                                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', display: 'flex' }}>
                                    <Trophy size={11} color="var(--accent)" />
                                </div>
                                <span style={{ fontWeight: 'bold' }}>Level {guild.level || 1}</span>
                            </span>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.9)' }}>
                                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', display: 'flex' }}>
                                    <Users size={11} color="var(--accent)" />
                                </div>
                                <span style={{ fontWeight: 'bold' }}>{members.length}/{memberLimit} Members</span>
                            </span>
                        </div>

                        {/* Guild XP Progress Bar */}
                        <div style={{ marginTop: '15px', width: '100%' }}>
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
                        <Users size={16} color="var(--accent)" /> {activeTab}
                    </h3>
                    {(guild.myRole === 'LEADER' || guild.myRole === 'OFFICER') && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveTab('MEMBERS')}
                                style={{
                                    background: activeTab === 'MEMBERS' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: activeTab === 'MEMBERS' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    color: activeTab === 'MEMBERS' ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                MEMBERS
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
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
                                {requests.length > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        style={{
                                            position: 'absolute',
                                            top: '-6px',
                                            right: '-6px',
                                            background: '#ff4444',
                                            color: '#fff',
                                            fontSize: '0.55rem',
                                            fontWeight: 'bold',
                                            height: '16px',
                                            minWidth: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '8px',
                                            padding: '0 4px',
                                            boxShadow: '0 0 10px rgba(255,68,68,0.5)',
                                            border: '1px solid rgba(255,255,255,0.2)'
                                        }}
                                    >
                                        {requests.length}
                                    </motion.div>
                                )}
                            </motion.button>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeTab === 'MEMBERS' ? (
                        members.map((member, i) => (
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
                                    cursor: 'pointer'
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
                                        <div
                                            onClick={() => onInspect && onInspect(member.name)}
                                            style={{ fontSize: '0.9rem', fontWeight: 'bold', color: member.online ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                                        >{member.name}</div>
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
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        isLoadingRequests ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.5)' }}>Loading requests...</div>
                        ) : requests.length > 0 ? (
                            requests.map((req, i) => (
                                <motion.div
                                    key={req.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.03)',
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
                                        </div>
                                        <div>
                                            <div
                                                onClick={() => onInspect && onInspect(req.name)}
                                                style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}
                                            >{req.name}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>LVL {req.level}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => {
                                                socket?.emit('handle_guild_request', { requestId: req.id, action: 'REJECT' });
                                                setRequests(prev => prev.filter(r => r.id !== req.id));
                                            }}
                                            style={{
                                                background: 'rgba(255, 68, 68, 0.1)',
                                                border: '1px solid rgba(255, 68, 68, 0.3)',
                                                borderRadius: '8px',
                                                padding: '6px',
                                                color: '#ff4444',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            <X size={16} />
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => {
                                                socket?.emit('handle_guild_request', { requestId: req.id, action: 'ACCEPT' });
                                                setRequests(prev => prev.filter(r => r.id !== req.id));
                                            }}
                                            style={{
                                                background: 'rgba(76, 175, 80, 0.1)',
                                                border: '1px solid rgba(76, 175, 80, 0.3)',
                                                borderRadius: '8px',
                                                padding: '6px',
                                                color: '#4caf50',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            <Check size={16} />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                No pending requests
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Leave Guild Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setConfirmLeave(true)}
                style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255, 68, 68, 0.05)',
                    border: '1px solid rgba(255, 68, 68, 0.15)',
                    borderRadius: '12px',
                    color: 'rgba(255, 68, 68, 0.6)',
                    fontSize: '0.7rem',
                    fontWeight: '900',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '15px'
                }}
            >
                <LogOut size={14} />
                {guild.myRole === 'LEADER' && members.length <= 1 ? 'DISBAND GUILD' : 'LEAVE GUILD'}
            </motion.button>

            {/* Leave Confirmation Modal */}
            <AnimatePresence>
                {confirmLeave && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setConfirmLeave(false)}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(5px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'var(--panel-bg, #1a1a2e)',
                                border: '1px solid rgba(255, 68, 68, 0.3)',
                                borderRadius: '20px',
                                padding: '30px',
                                maxWidth: '350px',
                                width: '100%',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                                <LogOut size={24} color="#ff4444" />
                            </div>
                            <h3 style={{ color: '#ff4444', fontSize: '1rem', fontWeight: '900', margin: '0 0 10px' }}>
                                {guild.myRole === 'LEADER' && members.length <= 1 ? 'DISBAND GUILD?' : 'LEAVE GUILD?'}
                            </h3>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0 0 20px', lineHeight: '1.5' }}>
                                {guild.myRole === 'LEADER' && members.length <= 1
                                    ? 'You are the only member. Leaving will permanently disband the guild.'
                                    : 'Are you sure you want to leave this guild?'
                                }
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setConfirmLeave(false)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        color: 'rgba(255,255,255,0.6)',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    CANCEL
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => {
                                        if (socket) socket.emit('leave_guild');
                                        setConfirmLeave(false);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'rgba(255, 68, 68, 0.2)',
                                        border: '1px solid rgba(255, 68, 68, 0.3)',
                                        borderRadius: '10px',
                                        color: '#ff4444',
                                        fontSize: '0.75rem',
                                        fontWeight: '900',
                                        cursor: 'pointer'
                                    }}
                                >
                                    CONFIRM
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Customization Modal */}
            <AnimatePresence>
                {showEditCustomization && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            padding: '20px'
                        }}
                        onClick={() => !editPending && setShowEditCustomization(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: '#0a0a0c',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px',
                                padding: isMobile ? '20px' : '30px',
                                maxWidth: '450px',
                                width: '100%',
                                boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px',
                                maxHeight: '90vh',
                                overflowY: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ padding: '8px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px' }}>
                                        <Settings size={20} color="var(--accent)" />
                                    </div>
                                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '900' }}>EDIT GUILD</h3>
                                </div>
                                <button
                                    onClick={() => setShowEditCustomization(false)}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Preview */}
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '15px',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px'
                            }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    background: editBgColor,
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    position: 'relative'
                                }}>
                                    {editCountry && (
                                        <div style={{ position: 'absolute', top: '-6px', left: '-6px', background: '#000', padding: '2px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex' }}>
                                            <CountryFlag code={editCountry.code} name={editCountry.name} size="0.8rem" />
                                        </div>
                                    )}
                                    {React.createElement(ICONS[editIcon] || Shield, { size: 24, color: editIconColor })}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '1rem' }}>{guild.name}</div>
                                    <div style={{ color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 'bold' }}>[{guild.tag}]</div>
                                </div>
                            </div>

                            {/* Icon Selection */}
                            <div>
                                <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>SELECT ICON</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                    {Object.keys(ICONS).map(iconName => (
                                        <button
                                            key={iconName}
                                            onClick={() => setEditIcon(iconName)}
                                            style={{
                                                aspectRatio: '1',
                                                background: editIcon === iconName ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.03)',
                                                border: editIcon === iconName ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: editIcon === iconName ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                                                transition: '0.2s'
                                            }}
                                        >
                                            {React.createElement(ICONS[iconName], { size: 20 })}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Selection */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>ICON COLOR</label>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {['#ffffff', '#ffd700', '#ff4444', '#4caf50', '#2196f3', '#9c27b0'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setEditIconColor(color)}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    background: color,
                                                    borderRadius: '6px',
                                                    border: editIconColor === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.2)',
                                                    cursor: 'pointer',
                                                    transition: '0.2s'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>BACK COLOR</label>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {['#1a1a1a', '#2d1a1a', '#1a2d1a', '#1a1a2d', '#2d2d1a', '#2d1a2d'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setEditBgColor(color)}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    background: color,
                                                    borderRadius: '6px',
                                                    border: editBgColor === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.2)',
                                                    cursor: 'pointer',
                                                    transition: '0.2s'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Country Selection */}
                            <div>
                                <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>REGION</label>
                                <button
                                    onClick={() => setShowEditCountryPicker(true)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <CountryFlag code={editCountry?.code} name={editCountry?.name} size="1.2rem" />
                                    <span style={{ fontSize: '0.9rem' }}>{editCountry ? editCountry.name : 'Select Region'}</span>
                                </button>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={editPending}
                                onClick={() => {
                                    setEditPending(true);
                                    socket?.emit('update_guild_customization', {
                                        icon: editIcon,
                                        iconColor: editIconColor,
                                        bgColor: editBgColor,
                                        countryCode: editCountry?.code
                                    });
                                }}
                                style={{
                                    width: '100%',
                                    padding: '15px',
                                    background: 'var(--accent)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#000',
                                    fontWeight: '900',
                                    fontSize: '0.9rem',
                                    cursor: editPending ? 'not-allowed' : 'pointer',
                                    marginTop: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                {editPending ? (
                                    <div className="spinner-small" style={{ width: '16px', height: '16px', borderTopColor: '#000' }} />
                                ) : (
                                    <>
                                        <Save size={18} />
                                        SAVE CHANGES
                                    </>
                                )}
                            </motion.button>
                        </motion.div>

                        {/* Nested Country Picker for Editing */}
                        <AnimatePresence>
                            {showEditCountryPicker && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{
                                        position: 'fixed',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'rgba(0,0,0,0.8)',
                                        backdropFilter: 'blur(5px)',
                                        zIndex: 10000,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    onClick={() => setShowEditCountryPicker(false)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            width: 'min(350px, 90vw)',
                                            background: '#111',
                                            border: '2px solid var(--accent)',
                                            borderRadius: '24px',
                                            padding: '24px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '15px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>SELECT REGION</div>
                                            <button onClick={() => setShowEditCountryPicker(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={20} /></button>
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Search country..."
                                            value={editCountrySearch}
                                            onChange={(e) => setEditCountrySearch(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                background: '#0a0a0a',
                                                border: '1px solid var(--border)',
                                                borderRadius: '12px',
                                                color: '#fff',
                                                fontSize: '0.9rem',
                                                outline: 'none'
                                            }}
                                            autoFocus
                                        />
                                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                            {COUNTRIES.filter(c => c.name.toLowerCase().includes(editCountrySearch.toLowerCase())).map(c => (
                                                <button
                                                    key={c.code}
                                                    onClick={() => {
                                                        setEditCountry(c);
                                                        setShowEditCountryPicker(false);
                                                    }}
                                                    style={{
                                                        aspectRatio: '1',
                                                        background: editCountry?.code === c.code ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.03)',
                                                        border: editCountry?.code === c.code ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                                                        borderRadius: '12px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '5px'
                                                    }}
                                                >
                                                    <CountryFlag code={c.code} name={c.name} size="1.4rem" />
                                                    <span style={{ fontSize: '0.5rem', color: '#fff', textAlign: 'center' }}>{c.code}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >
    );
};

const GuildPanel = ({ gameState, socket, isMobile, onInspect }) => {
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

        socket.on('guild_application_sent', (result) => {
            if (result.success) {
                setStatusMessage({ type: 'success', text: 'Application sent successfully!' });
            } else {
                setStatusMessage({ type: result.type || 'error', text: result.message || 'Failed to send application.' });
            }
        });

        return () => {
            socket.off('guild_search_results');
            socket.off('guild_created');
            socket.off('guild_application_sent');
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
                        <GuildDashboard guild={gameState.guild} socket={socket} isMobile={isMobile} onInspect={onInspect} />
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
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                position: 'relative'
                                                            }}>
                                                                {g.country_code && (
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: '-6px',
                                                                        left: '-6px',
                                                                        background: 'rgba(0,0,0,0.8)',
                                                                        padding: '2px 4px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                                        zIndex: 10,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        backdropFilter: 'blur(2px)'
                                                                    }}>
                                                                        <CountryFlag code={g.country_code} name={COUNTRIES.find(c => c.code === g.country_code)?.name} size="0.6rem" />
                                                                    </div>
                                                                )}
                                                                {(() => {
                                                                    const ResultIcon = ICONS[g.icon] || Shield;
                                                                    return <ResultIcon size={20} color={g.icon_color || '#fff'} />;
                                                                })()}
                                                            </div>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{g.name}</div>
                                                                    <span style={{ color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 'bold' }}>[{g.tag}]</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                                    LVL {g.level || 1} • {g.summary || 'Stronger Together'}
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
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => {
                                                                        socket?.emit('apply_to_guild', { guildId: g.id });
                                                                        // Optimistic UI updates
                                                                        setSearchResults(prev => prev.map(searchGuild => searchGuild.id === g.id ? { ...searchGuild, my_request_pending: true } : searchGuild));
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
                                                            )}
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
