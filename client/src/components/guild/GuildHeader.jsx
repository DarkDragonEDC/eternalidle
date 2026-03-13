import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Edit2, Info } from 'lucide-react';
import { formatSilver } from '@utils/format';
import { GUILD_XP_TABLE } from '@shared/guilds.js';
import { COUNTRIES } from '@shared/countries';
import { useAppStore } from '../../store/useAppStore';

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

export const GuildHeader = ({ 
    guild, 
    isMobile, 
    playerHasPermission, 
    onShowInfo, 
    onEditCustomization,
    ICONS 
}) => {
    const setShowGuildXPInfo = useAppStore(state => state.setShowGuildXPInfo);
    if (!guild) return null;

    const DashboardIcon = ICONS[guild.icon] || ICONS.Shield;
    const members = guild.members || [];
    const memberLimit = 10 + (guild.guild_hall_level || 0) * 2;
    const xpProgress = Math.min(100, ((guild.xp || 0) / (guild.nextLevelXP || 100)) * 100);
    const totalCurrentXP = (GUILD_XP_TABLE[(guild.level || 1) - 1] || 0) + (guild.xp || 0);
    const totalNextLevelXP = GUILD_XP_TABLE[guild.level || 1] || totalCurrentXP;

    return (
        <div style={{
            position: 'relative',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            '--accent': guild?.icon_color || '#d4af37'
        }}>
            {/* Guild Info Tooltip */}
            <div
                onClick={() => setShowGuildXPInfo(true)}
                style={{
                    position: 'absolute',
                    top: '15px',
                    left: isMobile ? '15px' : 'auto',
                    right: isMobile ? 'auto' : '15px',
                    zIndex: 10,
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    opacity: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '8px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(4px)',
                    transition: '0.2s'
                }}
            >
                <Info size={20} />
            </div>

            {/* Dark Base */}
            <div style={{ position: 'absolute', inset: 0, background: '#0a0a0c', zIndex: 0 }} />

            {/* Flares */}
            <div style={{
                position: 'absolute', top: isMobile ? '-50px' : '-100px', left: isMobile ? '-50px' : '-100px',
                width: isMobile ? '200px' : '300px', height: isMobile ? '200px' : '300px',
                background: `radial-gradient(circle, ${guild.bg_color || '#d4af37'}55 0%, transparent 70%)`,
                zIndex: 1, filter: 'blur(40px)', opacity: 0.8
            }} />

            <div style={{
                position: 'absolute', bottom: isMobile ? '-50px' : '-150px', right: isMobile ? '-50px' : '-100px',
                width: isMobile ? '200px' : '400px', height: isMobile ? '200px' : '400px',
                background: `radial-gradient(circle, ${guild.icon_color || '#ffffff'}22 0%, transparent 70%)`,
                zIndex: 1, filter: 'blur(50px)'
            }} />

            <div style={{
                position: 'relative', zIndex: 2, padding: isMobile ? '20px' : '30px',
                display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center', gap: isMobile ? '20px' : '30px',
                textAlign: isMobile ? 'center' : 'left'
            }}>
                <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    style={{
                        width: isMobile ? '80px' : '100px', height: isMobile ? '80px' : '100px',
                        background: guild.bg_color || '#1a1a1a', borderRadius: '24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 0 20px ${guild.icon_color || '#ffffff'}15`,
                        position: 'relative'
                    }}
                >
                    {guild.country_code && (
                        <div style={{
                            position: 'absolute', top: '-10px', left: '-10px',
                            background: 'rgba(0,0,0,0.8)', padding: '4px 6px',
                            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)',
                            zIndex: 10, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', backdropFilter: 'blur(4px)'
                        }}>
                            <CountryFlag code={guild.country_code} name={COUNTRIES.find(c => c.code === guild.country_code)?.name} size="1rem" />
                        </div>
                    )}
                    <DashboardIcon
                        size={isMobile ? 40 : 54}
                        color={guild.icon_color || '#fff'}
                        style={{ filter: `drop-shadow(0 0 10px ${guild.icon_color || '#ffffff'}88)` }}
                    />
                    {playerHasPermission('edit_appearance') && (
                        <button
                            onClick={onEditCustomization}
                            style={{
                                position: 'absolute', top: '-8px', right: '-8px',
                                background: 'var(--accent)', color: '#000',
                                padding: '6px', borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,0.4)',
                                zIndex: 11, cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
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
                        display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start',
                        gap: '12px', marginBottom: '10px', flexWrap: 'wrap'
                    }}>
                        <h2 style={{
                            margin: 0, fontSize: isMobile ? '1.1rem' : '1.55rem',
                            fontWeight: '900', color: '#fff', letterSpacing: '-0.5px',
                            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                        }}>{guild.name}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                background: 'var(--accent)', color: '#000',
                                padding: '4px 8px', borderRadius: '6px',
                                fontSize: '0.55rem', fontWeight: '900',
                                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
                                letterSpacing: '0.5px'
                            }}>{guild.tag}</span>
                        </div>
                    </div>

                    <div style={{
                        fontSize: '0.6rem', display: 'flex', alignItems: 'center',
                        justifyContent: isMobile ? 'center' : 'flex-start', gap: '15px'
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
                            <span>{formatSilver(totalCurrentXP)} / {GUILD_XP_TABLE[guild.level] ? formatSilver(totalNextLevelXP) : 'MAX'} - {xpProgress.toFixed(0)}%</span>
                        </div>
                        <div style={{
                            height: '6px', background: 'rgba(255,255,255,0.05)',
                            borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)'
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
    );
};
