import React, { useEffect, useState } from 'react';
import { X, Shield, Sword, Swords, Trophy, Sparkles, Users, Settings, Coins, Crown, Star, Plus, Info, Check, Tag, User, Zap, Landmark, ClipboardList, Pickaxe, FlaskConical, Hammer, Lock, Dices, Library } from 'lucide-react';
import { COUNTRIES } from '@shared/countries';
import { GUILD_XP_TABLE } from '@shared/guilds.js';
import { formatNumber } from '@utils/format';
import { motion, AnimatePresence } from 'framer-motion';

const GUILD_ICONS = {
    Shield, Users, Sword, Swords, Sword2: Swords, Trophy, Settings, Plus, Info, Check, X, Coins, Sparkles, Tag, User, Zap, Landmark, ClipboardList, Pickaxe, FlaskConical, Hammer, Lock, Dices, Library
};

const ROLE_ORDER = { LEADER: 0, OFFICER: 1, MEMBER: 2, owner: 0, officer: 1, member: 2 };

const getRoleDisplayName = (guild, roleId) => {
    if (!roleId) return 'Member';
    const roles = guild?.roles || {};
    if (roles[roleId]) return roles[roleId].name;

    const mapping = {
        'LEADER': 'Leader',
        'OFFICER': 'Co-Leader',
        'MEMBER': 'Member',
        'owner': 'Leader',
        'officer': 'Co-Leader',
        'member': 'Member'
    };
    if (mapping[roleId]) return mapping[roleId];
    if (roleId.startsWith('CUSTOM_')) return roleId.replace('CUSTOM_', '');
    return roleId;
};

const getRoleColor = (guild, roleId) => {
    if (!roleId) return 'var(--text-dim)';
    const roles = guild?.roles || {};
    if (roles[roleId] && roles[roleId].color) return roles[roleId].color;

    const mapping = {
        'LEADER': '#d4af37',
        'OFFICER': '#60a5fa',
        'MEMBER': 'var(--text-dim)',
        'owner': '#d4af37',
        'officer': '#60a5fa',
        'member': 'var(--text-dim)'
    };
    return mapping[roleId] || 'var(--text-dim)';
};

const CountryFlag = ({ code, size = '1.2rem', style = {} }) => {
    if (!code) return <span style={{ fontSize: size, ...style }}>🌐</span>;
    const country = COUNTRIES.find(c => c.code === code);
    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            alt={country?.name || code}
            title={country?.name || code}
            style={{
                height: size,
                width: 'auto',
                borderRadius: '2px',
                display: 'inline-block',
                verticalAlign: 'middle',
                ...style
            }}
        />
    );
};

const GuildProfileModal = ({ isOpen, onClose, guildId, socket, onInspect, isMobile }) => {
    const [guild, setGuild] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !guildId || !socket) return;

        setLoading(true);
        setGuild(null);
        socket.emit('get_guild_profile', { guildId });

        const handleData = (data) => {
            setGuild(data);
            setLoading(false);
        };

        socket.on('guild_profile_data', handleData);
        return () => socket.off('guild_profile_data', handleData);
    }, [isOpen, guildId, socket]);

    if (!isOpen) return null;

    const sortedMembers = guild?.members
        ? [...guild.members].sort((a, b) => {
            const aIsLeader = a.role === 'LEADER' || a.role === 'owner';
            const bIsLeader = b.role === 'LEADER' || b.role === 'owner';

            if (aIsLeader && !bIsLeader) return -1;
            if (!aIsLeader && bIsLeader) return 1;

            return (b.donatedXP || 0) - (a.donatedXP || 0);
        })
        : [];

    const IconComp = guild ? (GUILD_ICONS[guild.icon] || Shield) : Shield;

    // Calculate total accumulated guild XP (all previous levels + current)
    const totalGuildXP = guild
        ? (GUILD_XP_TABLE[(guild.level || 1) - 1] || 0) + (guild.xp || 0)
        : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 15100,
                        padding: isMobile ? '10px' : '20px'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={e => e.stopPropagation()}
                        className="theme-dark"
                        style={{
                            background: 'var(--panel-bg)',
                            borderRadius: '32px',
                            border: '1px solid var(--border)',
                            width: isMobile ? '100%' : '480px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: 'var(--panel-shadow)',
                            position: 'relative'
                        }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                padding: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10
                            }}
                        >
                            <X size={16} />
                        </button>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '80px 20px', opacity: 0.4 }}>
                                <div className="loading-spinner" />
                                <p style={{ marginTop: '16px', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' }}>LOADING GUILD...</p>
                            </div>
                        ) : !guild ? (
                            <div style={{ textAlign: 'center', padding: '80px 20px', opacity: 0.4 }}>
                                <p style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Guild not found</p>
                            </div>
                        ) : (
                            <>
                                {/* Guild Header - AAA Guild Panel Match */}
                                <div style={{
                                    position: 'relative',
                                    borderBottom: '1px solid var(--border)',
                                    zIndex: 1,
                                    overflow: 'hidden',
                                    padding: '20px 20px 15px', // Compacted padding
                                    flexShrink: 0
                                }}>
                                    {/* Dark Base */}
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: '#0a0a0c', // Premium dark
                                        zIndex: 0
                                    }} />

                                    {/* Left Flare - bg_color */}
                                    <div style={{
                                        position: 'absolute', top: '-100px', left: '-100px',
                                        width: '300px', height: '300px',
                                        background: `radial-gradient(circle, ${guild.bg_color || '#d4af37'}55 0%, transparent 70%)`,
                                        zIndex: 1, filter: 'blur(40px)',
                                        opacity: 0.8
                                    }} />

                                    {/* Right Flare - icon_color */}
                                    <div style={{
                                        position: 'absolute', bottom: '-150px', right: '-100px',
                                        width: '400px', height: '400px',
                                        background: `radial-gradient(circle, ${guild.icon_color || '#ffffff'}22 0%, transparent 70%)`,
                                        zIndex: 1, filter: 'blur(50px)'
                                    }} />

                                    <div style={{
                                        position: 'relative',
                                        zIndex: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px' // Compacted gap
                                    }}>
                                        {/* Guild Icon */}
                                        <div style={{
                                            width: '64px', // Compacted size
                                            height: '64px',
                                            background: guild.bg_color || '#1a1a1a',
                                            borderRadius: '16px', // Adjusted radius for smaller size
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            boxShadow: `0 4px 16px 0 rgba(0, 0, 0, 0.3), inset 0 0 10px ${guild.icon_color || '#ffffff'}15`,
                                            position: 'relative'
                                        }}>
                                            {guild.country_code && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-6px',
                                                    left: '-6px',
                                                    background: 'rgba(0,0,0,0.8)',
                                                    padding: '2px 4px',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    zIndex: 10,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backdropFilter: 'blur(4px)'
                                                }}>
                                                    <CountryFlag code={guild.country_code} size="0.8rem" />
                                                </div>
                                            )}
                                            <IconComp
                                                size={32} // Compacted size
                                                color={guild.icon_color || '#fff'}
                                                style={{ filter: `drop-shadow(0 0 6px ${guild.icon_color || '#ffffff'}88)` }}
                                            />
                                        </div>

                                        {/* Guild Name & Tag */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            marginTop: '4px' // Compacted margin
                                        }}>
                                            <h2 style={{
                                                margin: 0,
                                                fontSize: '1.25rem', // Compacted font size
                                                fontWeight: '900',
                                                color: '#fff',
                                                letterSpacing: '-0.5px',
                                                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                                            }}>{guild.name}</h2>

                                            <span style={{
                                                background: 'var(--accent)',
                                                color: '#000',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '0.6rem',
                                                fontWeight: '900',
                                                boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
                                                letterSpacing: '0.5px'
                                            }}>{guild.tag}</span>

                                            {guild.is_ironman && (
                                                <div style={{
                                                    background: 'rgba(255, 165, 0, 0.15)',
                                                    border: '1px solid rgba(255, 165, 0, 0.4)',
                                                    color: '#ffa500',
                                                    fontSize: '0.6rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontWeight: '900',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    boxShadow: '0 2px 10px rgba(255, 165, 0, 0.1)'
                                                }}>
                                                    <Shield size={12} /> IRONMAN
                                                </div>
                                            )}
                                        </div>

                                        {/* Level & Members List */}
                                        <div style={{
                                            fontSize: '0.65rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '12px'
                                        }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.9)' }}>
                                                <div style={{ padding: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex' }}>
                                                    <Trophy size={10} color="var(--accent)" />
                                                </div>
                                                <span style={{ fontWeight: 'bold' }}>Level {guild.level || 1}</span>
                                            </span>
                                            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.9)' }}>
                                                <div style={{ padding: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex' }}>
                                                    <Users size={10} color="var(--accent)" />
                                                </div>
                                                <span style={{ fontWeight: 'bold' }}>{sortedMembers.length}/{guild.maxMembers} Members</span>
                                            </span>
                                        </div>

                                        {/* Guild Summary */}
                                        {guild.summary && (
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: 'var(--text-dim)',
                                                marginTop: '0px',
                                                maxWidth: '350px',
                                                lineHeight: 1.3,
                                                opacity: 0.9,
                                                fontWeight: '600',
                                                textAlign: 'center'
                                            }}>
                                                {guild.summary}
                                            </div>
                                        )}

                                        {/* Guild Progress Bar */}
                                        <div style={{ marginTop: '5px', width: '100%', maxWidth: '380px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', marginBottom: '3px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                                <span>GUILD PROGRESS</span>
                                                <span>{formatNumber(totalGuildXP)} / {guild.nextLevelXP ? formatNumber(((GUILD_XP_TABLE[(guild.level || 1)] || totalGuildXP))) : 'MAX'} - {Math.min(100, ((guild.xp || 0) / (guild.nextLevelXP || 1)) * 100).toFixed(0)}%</span>
                                            </div>
                                            <div style={{
                                                height: '4px', // Compress progress bar
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '10px',
                                                overflow: 'hidden',
                                                border: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, ((guild.xp || 0) / (guild.nextLevelXP || 1)) * 100)}%` }}
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

                                {/* Members List */}
                                <div style={{
                                    padding: '0 24px 24px',
                                    flex: 1,
                                    overflowY: 'auto',
                                    minHeight: 0
                                }}>
                                    <div style={{
                                        fontSize: '0.7rem',
                                        fontWeight: '900',
                                        color: 'var(--text-dim)',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase',
                                        padding: '12px 0 8px',
                                        borderBottom: '1px solid var(--border)',
                                        marginBottom: '8px'
                                    }}>
                                        Members ({sortedMembers.length})
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {sortedMembers.map((member, idx) => (
                                            <motion.div
                                                key={member.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                onClick={() => {
                                                    if (onInspect) onInspect(member.name);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '10px 14px',
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                                    e.currentTarget.style.borderColor = `rgba(255,255,255,0.1)`;
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                {/* Avatar */}
                                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${getRoleColor(guild, member.role)}`,
                                                        overflow: 'hidden',
                                                        background: 'var(--slot-bg)'
                                                    }}>
                                                        {member.avatar ? (
                                                            <img
                                                                src={member.avatar.replace(/\.(png|jpg|jpeg)$/, '.webp')}
                                                                alt={member.name}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover',
                                                                    objectPosition: 'center 15%',
                                                                    display: 'block'
                                                                }}
                                                            />
                                                        ) : (
                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                                                <User size={20} color="#fff" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {member.isIronman && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '-3px',
                                                            left: '-3px',
                                                            background: 'rgba(0,0,0,0.85)',
                                                            borderRadius: '4px',
                                                            padding: '1px',
                                                            border: '1px solid rgba(255,255,255,0.2)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <Shield size={10} color="#9ca3af" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Member Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: '700',
                                                        color: 'var(--text-main)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {member.name}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.6rem',
                                                        fontWeight: '900',
                                                        color: getRoleColor(guild, member.role),
                                                        letterSpacing: '1px',
                                                        textTransform: 'uppercase',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        {(member.role === 'owner' || member.role === 'LEADER') && <Crown size={10} />}
                                                        {getRoleDisplayName(guild, member.role)}
                                                    </div>
                                                </div>

                                                {/* Donated XP */}
                                                <div style={{
                                                    textAlign: 'right',
                                                    flexShrink: 0
                                                }}>
                                                    <div style={{
                                                        fontSize: '1rem',
                                                        fontWeight: '950',
                                                        color: '#fff',
                                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                                    }}>
                                                        {formatNumber(member.donatedXP || 0)}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.55rem',
                                                        color: 'var(--text-dim)',
                                                        fontWeight: 'bold',
                                                        letterSpacing: '0.5px',
                                                        opacity: 0.6
                                                    }}>
                                                        XP CONTRIBUTED
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GuildProfileModal;
