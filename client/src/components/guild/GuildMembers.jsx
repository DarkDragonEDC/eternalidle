import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Shield, User, X, LogOut } from 'lucide-react';
import { formatSilver, formatNumber } from '@utils/format';

export const GuildMembers = ({ 
    members, 
    membersSortBy, 
    setMembersSortBy, 
    showMembersDropdown, 
    setShowMembersDropdown,
    isMobile,
    onInspect,
    roles = {},
    playerHasPermission,
    onKick,
    onChangeRole,
    currentUser,
    guild,
    onLeave
}) => {
    const [roleDropdownId, setRoleDropdownId] = useState(null);

    const getRoleDisplayName = (roleId) => {
        if (!roleId) return 'Membro';
        if (roles[roleId]) return roles[roleId].name;

        const mapping = {
            'LEADER': 'Leader',
            'OFFICER': 'Co-Leader',
            'MEMBER': 'Member'
        };
        if (mapping[roleId]) return mapping[roleId];
        if (roleId.startsWith('CUSTOM_')) return roleId.replace('CUSTOM_', '');
        return roleId;
    };

    const getRoleColor = (roleId) => {
        if (!roleId) return '#ffffff33';
        if (roles[roleId] && roles[roleId].color) return roles[roleId].color;

        const mapping = {
            'LEADER': '#d4af37',
            'OFFICER': '#c0c0c0',
            'MEMBER': '#ffffff33',
            'Warrior': '#ff4444',
            'Mage': '#44aaff',
            'Ranged': '#44ff44'
        };
        return mapping[roleId] || '#ffffff33';
    };

    const getRoleStyles = (color) => {
        // If it's a hex color, we can easily add alpha
        if (color.startsWith('#')) {
            const base = color.substring(0, 7);
            return {
                color: base,
                background: base + '15', // 0.082 alpha
                border: `1px solid ${base}33` // 0.2 alpha
            };
        }
        // Fallback for other formats
        return {
            color: color,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        };
    };

    const formatRelativeTime = (date) => {
        if (!date) return 'Unknown';
        const diff = new Date() - new Date(date);
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days >= 1) {
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h ago`;
        }
        if (hours >= 1) {
            return `${hours}h ago`;
        }
        if (minutes >= 1) {
            return `${minutes}m ago`;
        }
        return 'Just now';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {members.map((member, i) => {
                const roleColor = getRoleColor(member.role);
                const roleStyles = getRoleStyles(roleColor);
                
                return (
                    <motion.div
                        key={member.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.03)',
                            transition: '0.2s',
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
                                    {member.avatar ? (
                                        <img
                                            src={member.avatar.replace(/\.(png|jpg|jpeg)$/, '.webp')}
                                            alt={member.name}
                                            style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover', objectPosition: 'center 20%' }}
                                        />
                                    ) : (
                                        <User size={20} color="rgba(255,255,255,0.4)" />
                                    )}
                                </div>
                                {member.isIronman && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: 2,
                                        background: '#000',
                                        borderRadius: '50%',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(255, 152, 0, 0.267)'
                                    }}>
                                        <Shield size={12} color="#ff9800" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 152, 0, 0.533))' }} title="Ironman" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div
                                    onClick={() => onInspect && onInspect(member.name)}
                                    style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}
                                >
                                    {member.name}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
                                    {membersSortBy === 'DATE' && member.joinedAt ?
                                        formatRelativeTime(member.joinedAt) :
                                        membersSortBy === 'TOTAL_XP' ?
                                            `Total XP: ${formatNumber(member.donatedXP || 0)}` :
                                            membersSortBy === 'TOTAL_SILVER' ?
                                                `Silver ${formatNumber(member.donatedSilver || 0)} + Items ${formatNumber(member.donatedItemsValue || 0)} = ${formatNumber((member.donatedSilver || 0) + (member.donatedItemsValue || 0))} Total` :
                                                membersSortBy === 'DAILY_XP' ?
                                                    `${formatNumber(Math.floor((member.donatedXP || 0) / Math.max(1, Math.floor((new Date() - new Date(member.joinedAt || Date.now())) / (1000 * 60 * 60 * 24)))))} XP/day` :
                                                    `LVL ${member.level}`}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const isSelf = member.id == guild?.myMemberId;
                                    if (playerHasPermission('change_member_roles') && member.role !== 'LEADER' && !isSelf) {
                                        setRoleDropdownId(roleDropdownId === member.id ? null : member.id);
                                    }
                                }}
                                style={{
                                    fontSize: '0.65rem',
                                    fontWeight: '900',
                                    color: roleStyles.color,
                                    background: roleStyles.background,
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    letterSpacing: '0.5px',
                                    border: roleStyles.border,
                                    cursor: (playerHasPermission('change_member_roles') && member.role !== 'LEADER' && member.id != guild?.myMemberId) ? 'pointer' : 'default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                {getRoleDisplayName(member.role)}
                                {playerHasPermission('change_member_roles') && member.role !== 'LEADER' && member.id != guild?.myMemberId && <ChevronDown size={10} />}
                            </div>

                        {playerHasPermission('kick_members') && member.id != guild?.myMemberId && member.role !== 'LEADER' && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onKick({ id: member.id, name: member.name });
                                }}
                                style={{
                                    background: 'rgba(255, 68, 68, 0.1)',
                                    border: '1px solid rgba(255, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    padding: '6px',
                                    color: '#ff4444',
                                    cursor: 'pointer',
                                    display: 'flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center'
                                }}
                                title="Kick Member"
                            >
                                <X size={14} />
                            </motion.button>
                        )}

                        <AnimatePresence>
                            {roleDropdownId === member.id && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '5px',
                                        background: '#000',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
                                        zIndex: 2000,
                                        minWidth: '140px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {Object.entries({
                                        OFFICER: { name: 'Co-Leader', color: '#c0c0c0' },
                                        MEMBER: { name: 'Member', color: '#808080' },
                                        ...(roles || {})
                                    }).filter(([key]) => key !== 'LEADER').map(([key, role]) => {
                                        const config = (roles || {})[key] || {};
                                        return {
                                            id: key,
                                            label: config.name || role.name,
                                            color: config.color || role.color || '#ffd700',
                                            order: config.order !== undefined ? config.order : (key === 'OFFICER' ? -50 : (key === 'MEMBER' ? 0 : 100))
                                        };
                                    }).sort((a, b) => a.order - b.order).map((role) => (
                                        <div
                                            key={role.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onChangeRole(member.id, role.id);
                                                setRoleDropdownId(null);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 14px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                background: member.role === role.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                borderLeft: member.role === role.id ? `3px solid ${role.color}` : '3px solid transparent'
                                            }}
                                        >
                                            <div style={{ width: '3px', height: '14px', background: role.color, borderRadius: '2px' }} />
                                            <span style={{ fontSize: '0.7rem', color: member.role === role.id ? role.color : '#fff', fontWeight: 'bold' }}>{role.label}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
                );
            })}

            <button
                onClick={() => onLeave && onLeave()}
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
                    gap: '8px'
                }}
            >
                <LogOut size={14} />
                LEAVE GUILD
            </button>
        </div>
    );
};
