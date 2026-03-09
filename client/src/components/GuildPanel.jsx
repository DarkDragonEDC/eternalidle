import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Sword, Swords, Trophy, Settings, Plus, Info, Check, X, Coins, Sparkles, Tag, User, Zap, LogOut, Edit2, Save, Menu, Home, Building2, ChevronDown, ArrowUp, ArrowDown, Trash2, Landmark, ClipboardList, Pickaxe, FlaskConical, Hammer, Lock, Dices, Library } from 'lucide-react';
import { formatSilver } from '@utils/format';
import { COUNTRIES } from '../../../shared/countries';
import { GUILD_BUILDINGS, calculateGuildNextLevelXP, GUILD_TASKS_CONFIG, UPGRADE_COSTS, calculateMaterialNeeds, STATION_BONUS_TABLE, GUILD_XP_TABLE } from '../../../shared/guilds.js';

const ICONS = { Shield, Users, Sword, Swords, Trophy, Settings, Plus, Info, Check, X, Coins, Sparkles, Tag, User, Zap, Landmark, ClipboardList, Pickaxe, FlaskConical, Hammer, Lock, Dices, Library };
const ICON_COLORS = ['#ffffff', '#ffd700', '#ff4444', '#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#e91e63'];
const BG_COLORS = ['#1a1a1a', '#2d1a1a', '#1a2d1a', '#1a1a2d', '#2d2d1a', '#2d1a2d', '#1a2d2d', '#333333'];

const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const formatRelativeTime = (date) => {
    if (!date) return '';
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

const GUILD_PERMISSIONS = [
    { id: 'edit_appearance', label: 'Edit Appearance', desc: 'Can change icon and colors' },
    { id: 'manage_roles', label: 'Manage Roles', desc: 'Can edit rank names and permissions' },
    { id: 'kick_members', label: 'Kick Members', desc: 'Can remove players from the guild' },
    { id: 'manage_requests', label: 'Manage Requests', desc: 'Can accept/reject applications' },
    { id: 'change_member_roles', label: 'Manage Ranks', desc: 'Can promote/demote members' },
    { id: 'manage_upgrades', label: 'Manage Upgrades', desc: 'Can upgrade guild buildings' },
    { id: 'manage_guild', label: 'Manage Guild', desc: 'Can edit guild settings and appearance' },
];

const GuildDashboard = ({ guild, socket, isMobile, onInspect, gameState }) => {
    if (!guild) return null;

    const members = guild.members || [];
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [disbandText, setDisbandText] = useState('');
    const [activeTab, setActiveTab] = useState('MEMBERS'); // HOME | MEMBERS | REQUESTS | SETTINGS | BUILDING
    const [membersSortBy, setMembersSortBy] = useState('DEFAULT'); // 'DEFAULT' | 'DATE'
    const [showMembersDropdown, setShowMembersDropdown] = useState(false);
    const [showNavDropdown, setShowNavDropdown] = useState(false);
    const [showDonateModal, setShowDonateModal] = useState(false);
    const [donationSilver, setDonationSilver] = useState("");
    const [selectedDonationItem, setSelectedDonationItem] = useState(null);
    const [donationItemAmount, setDonationItemAmount] = useState("");
    const [donationPending, setDonationPending] = useState(false);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [requests, setRequests] = useState([]);

    // Edit Customization States
    const [showEditCustomization, setShowEditCustomization] = useState(false);
    const [editPending, setEditPending] = useState(false);
    const [editGuildName, setEditGuildName] = useState(guild.name || "");
    const [editGuildTag, setEditGuildTag] = useState(guild.tag || "");
    const [editGuildSummary, setEditGuildSummary] = useState(guild.summary || "");
    const [editIcon, setEditIcon] = useState(guild.icon || 'Shield');
    const [editBgColor, setEditBgColor] = useState(guild.bg_color || '#1a1a1a');
    const [editIconColor, setEditIconColor] = useState(guild.icon_color || '#ffffff');
    const [editCountry, setEditCountry] = useState(guild.country_code ? COUNTRIES.find(c => c.code === guild.country_code) : null);
    const [showEditCountryPicker, setShowEditCountryPicker] = useState(false);
    const [editCountrySearch, setEditCountrySearch] = useState('');
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showRolesModal, setShowRolesModal] = useState(false);
    const [customRoles, setCustomRoles] = useState([]);
    const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleColor, setNewRoleColor] = useState('#ffd700');
    const [roleDropdownId, setRoleDropdownId] = useState(null);
    const [showEditRoleModal, setShowEditRoleModal] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [editRoleName, setEditRoleName] = useState('');
    const [editRoleColor, setEditRoleColor] = useState('');
    const [editRolePerms, setEditRolePerms] = useState([]);

    // Guild Settings States
    const [settingsMinLevel, setSettingsMinLevel] = useState(guild.min_level || 1);
    const [settingsJoinMode, setSettingsJoinMode] = useState(guild.join_mode || 'APPLY');
    const [settingsPending, setSettingsPending] = useState(false);

    // Delete Role Confirmation
    const [deleteRoleConfirm, setDeleteRoleConfirm] = useState(null); // { id, name }
    // Kick Member Confirmation
    const [kickConfirm, setKickConfirm] = useState(null); // { id, name }

    // Building Selector States
    const [selectedBuilding, setSelectedBuilding] = useState('BANK'); // 'BANK' | 'GUILD_HALL'
    const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);

    // Guild Tasks States
    const [guildTasks, setGuildTasks] = useState([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [showContributeModal, setShowContributeModal] = useState(null); // Task object
    const [contributeAmount, setContributeAmount] = useState("");
    const [taskPending, setTaskPending] = useState(false);
    const [timeUntilReset, setTimeUntilReset] = useState("");

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setUTCHours(24, 0, 0, 0);
            const diff = tomorrow - now;

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeUntilReset(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        const timer = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(timer);
    }, []);

    const getItemAmount = (itemId) => {
        const entry = gameState.state?.inventory?.[itemId];
        if (!entry) return 0;
        if (typeof entry === 'number') return entry;
        if (typeof entry === 'object') return entry.amount || 0;
        return 0;
    };

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

    useEffect(() => {
        if (activeTab === 'TASKS') {
            setIsLoadingTasks(true);
            socket?.emit('get_guild_tasks');
        }
    }, [socket, activeTab]);

    useEffect(() => {
        if (!socket) return;
        const handleTasksData = (data) => {
            setGuildTasks(data);
            setIsLoadingTasks(false);
            setTaskPending(false);
        };
        const handleContributeResult = (result) => {
            if (result.success) {
                setGuildTasks(result.tasks);
                setShowContributeModal(null);
                setContributeAmount("");
            }
            setTaskPending(false);
        };
        socket.on('guild_tasks_data', handleTasksData);
        socket.on('guild_task_contribute_result', handleContributeResult);

        return () => {
            socket.off('guild_tasks_data', handleTasksData);
            socket.off('guild_task_contribute_result', handleContributeResult);
        };
    }, [socket]);

    // Lock body scroll when modals are open
    useEffect(() => {
        const anyModalOpen = showDonateModal || showEditCustomization || showInfoModal ||
            showRolesModal || showCreateRoleModal || showEditRoleModal ||
            deleteRoleConfirm || kickConfirm || showContributeModal;

        if (anyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showDonateModal, showEditCustomization, showInfoModal, showRolesModal,
        showCreateRoleModal, showEditRoleModal, deleteRoleConfirm, kickConfirm,
        showContributeModal]);


    const memberLimit = 10 + (guild.guild_hall_level || 0) * 2;
    const nextLevelXPDelta = guild.nextLevelXP || calculateGuildNextLevelXP(guild.level || 1);
    const xpProgress = Math.min(100, ((guild.xp || 0) / nextLevelXPDelta) * 100);

    const totalCurrentXP = (GUILD_XP_TABLE[(guild.level || 1) - 1] || 0) + (guild.xp || 0);
    const totalNextLevelXP = GUILD_XP_TABLE[guild.level || 1] || totalCurrentXP;

    const DashboardIcon = ICONS[guild.icon] || Shield;

    const getRoleDisplayName = (roleId) => {
        if (!roleId) return 'Membro';
        const roles = guild.roles || {};
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
        if (!roleId) return 'rgba(255, 255, 255, 0.4)';
        const roles = guild.roles || {};
        if (roles[roleId] && roles[roleId].color) return roles[roleId].color;

        const mapping = {
            'LEADER': '#d4af37',
            'OFFICER': '#c0c0c0',
            'MEMBER': 'rgba(255, 255, 255, 0.4)'
        };
        return mapping[roleId] || 'rgba(255, 255, 255, 0.4)';
    };

    const playerHasPermission = (permission) => {
        if (guild.myRole === 'LEADER') return true;
        const roles = guild.roles || {};
        const myRoleConfig = roles[guild.myRole];
        return myRoleConfig?.permissions?.includes(permission);
    };

    const sortedMembers = useMemo(() => {
        if (!members || members.length === 0) return [];
        let sorted = [...members];

        if (membersSortBy === 'DATE') {
            sorted.sort((a, b) => new Date(a.joinedAt || 0) - new Date(b.joinedAt || 0));
        } else if (membersSortBy === 'TOTAL_XP') {
            sorted.sort((a, b) => (b.donatedXP || 0) - (a.donatedXP || 0));
        } else if (membersSortBy === 'TOTAL_SILVER') {
            sorted.sort((a, b) => ((b.donatedSilver || 0) + (b.donatedItemsValue || 0)) - ((a.donatedSilver || 0) + (a.donatedItemsValue || 0)));
        } else if (membersSortBy === 'DAILY_XP') {
            const getDaily = (m) => {
                if (!m.donatedXP) return 0;
                let days = Math.floor((new Date() - new Date(m.joinedAt || Date.now())) / (1000 * 60 * 60 * 24));
                if (days < 1) days = 1; // Prevent division by zero, treat sub-24h as 1 day
                return m.donatedXP / days;
            };
            sorted.sort((a, b) => getDaily(b) - getDaily(a));
        } else {
            // Default sorting: respecting the hierarchy defined in guild.roles
            const getRoleOrder = (roleId) => {
                const roleConfig = (guild.roles || {})[roleId] || {};
                if (roleConfig.order !== undefined) return roleConfig.order;

                // Fallback to same logic as roles modal
                if (roleId === 'LEADER') return -100;
                if (roleId === 'OFFICER') return -50;
                if (roleId === 'MEMBER') return 0;
                return 100;
            };

            sorted.sort((a, b) => {
                const orderA = getRoleOrder(a.role);
                const orderB = getRoleOrder(b.role);
                if (orderA !== orderB) return orderA - orderB;
                return (b.level || 1) - (a.level || 1);
            });
        }

        return sorted;
    }, [members, membersSortBy]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '12px' : '20px',
                paddingBottom: '20px',
                '--accent': guild?.icon_color || '#d4af37'
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
                {/* Guild Info Tooltip */}
                <div
                    onClick={() => setShowInfoModal(true)}
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
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    <Info size={20} />
                </div>

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
                                <span>{formatSilver(totalCurrentXP)} / {GUILD_XP_TABLE[guild.level] ? formatSilver(totalNextLevelXP) : 'MAX'} - {xpProgress.toFixed(0)}%</span>
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

            {/* Unified Glass Container */}
            <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '24px',
                padding: isMobile ? '15px' : '20px',
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
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
                                {activeTab === 'MEMBERS' ? 'Home' :
                                    activeTab === 'SETTINGS' ? 'Settings' :
                                        activeTab === 'BUILDING' ? 'Building' :
                                            activeTab === 'TASKS' ? 'Tasks' :
                                                activeTab === 'REQUESTS' ? 'Requests' : activeTab}
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
                                        {[
                                            { id: 'MEMBERS', label: 'Home', icon: Home },
                                            { id: 'TASKS', label: 'Tasks', icon: ClipboardList },
                                            { id: 'BUILDING', label: 'Building', icon: Building2 },
                                            { id: 'SETTINGS', label: 'Settings', icon: Settings, permission: 'manage_guild' }
                                        ].filter(opt => !opt.permission || playerHasPermission(opt.permission)).map((opt) => (
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

                    {(activeTab === 'MEMBERS' || activeTab === 'REQUESTS') && (
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
                                                    left: 0,
                                                    marginTop: '4px',
                                                    background: '#1a1a1a',
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
                            )}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {activeTab === 'BUILDING' && (
                        <div style={{ padding: '20px' }}>
                            {/* Global Bank Normalization for this tab */}
                            {(() => {
                                const bankTotals = {};
                                if (guild.bank_items) {
                                    Object.entries(guild.bank_items).forEach(([id, qty]) => {
                                        const upperId = id.split('::')[0].toUpperCase();
                                        const amount = (typeof qty === 'object' ? (qty.amount || 0) : qty);
                                        bankTotals[upperId] = (bankTotals[upperId] || 0) + amount;
                                    });
                                }
                                globalThis.currentBankTotals = bankTotals; // Helper for nested scopes if needed
                                return null;
                            })()}
                            {/* Building Selector */}
                            <div style={{ marginBottom: '20px', position: 'relative' }}>
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.5px' }}>SELECT BUILDING</div>
                                <div
                                    onClick={() => setShowBuildingDropdown(!showBuildingDropdown)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {(() => {
                                            const b = [
                                                { id: 'BANK', name: 'Bank', icon: Landmark },
                                                { id: 'GUILD_HALL', name: 'Guild Hall', icon: Building2 },
                                                { id: 'LIBRARY', name: 'Library', icon: Library },
                                                { id: 'GATHERING', name: 'Gathering Station', icon: Pickaxe },
                                                { id: 'REFINING', name: 'Refining Station', icon: FlaskConical },
                                                { id: 'CRAFTING', name: 'Crafting Station', icon: Hammer }
                                            ].find(x => x.id === selectedBuilding) || { name: 'Bank', icon: Landmark };
                                            const Icon = b.icon;
                                            return (
                                                <>
                                                    <Icon size={18} color="var(--accent)" />
                                                    <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                        {b.name}
                                                    </span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <ChevronDown size={16} color="rgba(255,255,255,0.3)" style={{ transform: showBuildingDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                                </div>

                                <AnimatePresence>
                                    {showBuildingDropdown && (
                                        <>
                                            <div
                                                onClick={() => setShowBuildingDropdown(false)}
                                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                style={{
                                                    position: 'absolute',
                                                    top: 'calc(100% + 8px)',
                                                    left: 0,
                                                    right: 0,
                                                    background: '#1a1a1a',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    zIndex: 101,
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                                }}
                                            >
                                                {[
                                                    { id: 'BANK', name: 'Bank', icon: Landmark },
                                                    { id: 'GUILD_HALL', name: 'Guild Hall', icon: Building2 },
                                                    { id: 'LIBRARY', name: 'Library', icon: Library },
                                                    { id: 'GATHERING', name: 'Gathering Station', icon: Pickaxe },
                                                    { id: 'REFINING', name: 'Refining Station', icon: FlaskConical },
                                                    { id: 'CRAFTING', name: 'Crafting Station', icon: Hammer }
                                                ].map(b => (
                                                    <div
                                                        key={b.id}
                                                        onClick={() => {
                                                            setSelectedBuilding(b.id);
                                                            setShowBuildingDropdown(false);
                                                        }}
                                                        style={{
                                                            padding: '12px 16px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            cursor: 'pointer',
                                                            background: selectedBuilding === b.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                                                            transition: 'background 0.2s ease'
                                                        }}
                                                    >
                                                        <b.icon size={16} color={selectedBuilding === b.id ? 'var(--accent)' : 'rgba(255,255,255,0.4)'} />
                                                        <span style={{ color: selectedBuilding === b.id ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: selectedBuilding === b.id ? 'bold' : 'normal' }}>
                                                            {b.name}
                                                        </span>
                                                        {selectedBuilding === b.id && <Check size={14} color="var(--accent)" style={{ marginLeft: 'auto' }} />}
                                                    </div>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>

                            {selectedBuilding === 'GUILD_HALL' && (
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 100%)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(212, 175, 55, 0.2)',
                                    padding: isMobile ? '15px' : '20px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? '15px' : '20px' }}>
                                        <div>
                                            <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Building2 size={isMobile ? 20 : 24} /> GUILD HALL
                                            </h3>
                                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '5px 0 0 0' }}>Expand your member slots.</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#fff', fontSize: isMobile ? '1.1rem' : '1.2rem', fontWeight: 'bold' }}>LVL {guild.guild_hall_level || 0}</div>
                                            <div style={{ color: 'var(--accent)', fontSize: '0.6rem', fontWeight: 'bold' }}>MAX LVL 10</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: isMobile ? '10px' : '15px', marginBottom: isMobile ? '20px' : '25px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '5px', textTransform: 'uppercase' }}>Current Slots</div>
                                            <div style={{ color: '#fff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 'bold' }}>{10 + (guild.guild_hall_level || 0) * 2} <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Members</span></div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '5px', textTransform: 'uppercase' }}>Next Level</div>
                                            <div style={{ color: '#fff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 'bold' }}>
                                                {(guild.guild_hall_level || 0) < 10 ? 10 + ((guild.guild_hall_level || 0) + 1) * 2 : 'MAX'}
                                                {(guild.guild_hall_level || 0) < 10 && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}> Slots</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {(guild.guild_hall_level || 0) < 10 ? (
                                        <>
                                            <div style={{ marginBottom: '20px' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <ArrowUp size={12} color="var(--accent)" /> UPGRADE REQUIREMENTS
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                                                    {(() => {
                                                        const currentLevel = guild.guild_hall_level || 0;
                                                        const nextLevel = currentLevel + 1;
                                                        const costs = UPGRADE_COSTS[nextLevel];
                                                        const silverCost = costs?.silver || 0;
                                                        const gpCost = costs?.gp || 0;
                                                        const matAmount = costs?.mats || 0;
                                                        const tier = Math.min(10, nextLevel);
                                                        const reqGuildLevel = Math.max(1, (nextLevel - 1) * 10);

                                                        const hasSilver = (guild.bank_silver || 0) >= silverCost;
                                                        const hasGP = (guild.guild_points || 0) >= gpCost;
                                                        const hasGuildLevel = (guild.level || 1) >= reqGuildLevel;
                                                        const materials = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'].map(m => ({ id: `T${tier}_${m}`, name: `T${tier} ${m}` }));
                                                        const hasMats = materials.every(m => ((globalThis.currentBankTotals || {})[m.id] || 0) >= matAmount);
                                                        const canUpgrade = playerHasPermission('manage_upgrades') && hasSilver && hasGP && hasMats && hasGuildLevel;

                                                        return (
                                                            <>
                                                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '10px', border: hasSilver ? '1px solid rgba(68, 255, 68, 0.1)' : '1px solid rgba(255, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <Coins size={16} color="#ffd700" />
                                                                    <div>
                                                                        <div style={{ color: hasSilver ? '#44ff44' : '#ff4444', fontSize: '0.75rem', fontWeight: 'bold' }}>{formatSilver(silverCost)}</div>
                                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>Silver in Bank</div>
                                                                    </div>
                                                                </div>
                                                                {gpCost > 0 && (
                                                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '10px', border: hasGP ? '1px solid rgba(68, 255, 68, 0.1)' : '1px solid rgba(255, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <ClipboardList size={16} color="var(--accent)" />
                                                                        <div>
                                                                            <div style={{ color: hasGP ? '#44ff44' : '#ff4444', fontSize: '0.75rem', fontWeight: 'bold' }}>{gpCost.toLocaleString()} GP</div>
                                                                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>Guild Points</div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '10px', border: hasGuildLevel ? '1px solid rgba(68, 255, 68, 0.1)' : '1px solid rgba(255, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <Trophy size={16} color="#4488ff" />
                                                                    <div>
                                                                        <div style={{ color: hasGuildLevel ? '#44ff44' : '#ff4444', fontSize: '0.75rem', fontWeight: 'bold' }}>LVL {reqGuildLevel}</div>
                                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>Guild Level Req.</div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '5px' }}>
                                                                    {materials.map(m => {
                                                                        const cur = (globalThis.currentBankTotals || {})[m.id] || 0;
                                                                        const has = cur >= matAmount;
                                                                        const [tierPart, namePart] = m.id.split('_');
                                                                        return (
                                                                            <div key={m.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '10px', border: has ? '1px solid rgba(68, 255, 68, 0.1)' : '1px solid rgba(255, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.45rem', fontWeight: 'bold' }}>{tierPart} {namePart}</div>
                                                                                <img src={`/items/${m.id}.webp`} style={{ width: '16px', height: '16px' }} alt={m.name} />
                                                                                <div style={{ color: has ? '#44ff44' : '#ff4444', fontSize: '0.55rem', fontWeight: 'bold' }}>
                                                                                    {cur >= 1000 ? (cur / 1000).toFixed(1) + 'K' : cur}/{matAmount >= 1000 ? (matAmount / 1000).toFixed(0) + 'K' : matAmount}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                <div style={{ gridColumn: '1/-1', marginTop: '10px' }}>
                                                                    <motion.button
                                                                        whileHover={canUpgrade ? { scale: 1.02 } : {}}
                                                                        whileTap={canUpgrade ? { scale: 0.98 } : {}}
                                                                        disabled={!canUpgrade}
                                                                        onClick={() => socket?.emit('upgrade_guild_building', { buildingType: 'GUILD_HALL' })}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '12px',
                                                                            background: canUpgrade ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                                                            border: 'none',
                                                                            borderRadius: '12px',
                                                                            color: canUpgrade ? '#000' : 'rgba(255,255,255,0.2)',
                                                                            fontWeight: 'bold',
                                                                            cursor: canUpgrade ? 'pointer' : 'not-allowed'
                                                                        }}
                                                                    >
                                                                        {!playerHasPermission('manage_upgrades') ? 'NO PERMISSION' : canUpgrade ? 'UPGRADE GUILD HALL' : 'MISSING REQUIREMENTS'}
                                                                    </motion.button>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px', border: '1px solid var(--accent)' }}>
                                            <Sparkles size={32} color="var(--accent)" style={{ marginBottom: '10px' }} />
                                            <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem' }}>MAXIMUM LEVEL REACHED</div>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Your Guild Hall is at its peak power!</div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {selectedBuilding === 'LIBRARY' && (
                                <div style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    padding: isMobile ? '15px' : '25px',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(212, 175, 55, 0.15)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? '15px' : '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
                                            <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: isMobile ? '8px' : '10px', borderRadius: '12px' }}>
                                                <Library size={isMobile ? 20 : 24} color="var(--accent)" />
                                            </div>
                                            <div>
                                                <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>LIBRARY</h3>
                                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '0.65rem' : '0.75rem', margin: '2px 0 0 0' }}>Expand your task capabilities and tiers.</p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#fff', fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: '900' }}>LVL {guild.library_level || 0}</div>
                                            <div style={{ color: 'var(--accent)', fontSize: '0.6rem', fontWeight: '900', letterSpacing: '1px' }}>MAX LVL 10</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: isMobile ? '10px' : '15px', marginBottom: isMobile ? '20px' : '25px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: isMobile ? '10px' : '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Current Status</div>
                                            <div style={{ color: '#fff', fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold' }}>
                                                {guild.library_level > 0 ? `T${guild.library_level} Tasks ` : 'No Tasks'}
                                                {guild.library_level > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--accent)', marginLeft: '5px' }}>(+{GUILD_TASKS_CONFIG.REWARDS.GP_TABLE[guild.library_level] || 0} GP)</span>}
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: isMobile ? '10px' : '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Next Milestone</div>
                                            <div style={{ color: '#fff', fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 'bold' }}>
                                                {(guild.library_level || 0) < 10 ? `T${(guild.library_level || 0) + 1} Tasks ` : 'MAX'}
                                                {(guild.library_level || 0) < 10 && <span style={{ fontSize: '0.65rem', color: 'var(--accent)', marginLeft: '5px' }}>(+{GUILD_TASKS_CONFIG.REWARDS.GP_TABLE[(guild.library_level || 0) + 1] || 0} GP)</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {(guild.library_level || 0) < 10 ? (
                                        <>
                                            <div style={{ marginBottom: '20px' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '1px' }}>
                                                    <ArrowUp size={12} color="var(--accent)" /> UPGRADE REQUIREMENTS
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                                                    {(() => {
                                                        const currentLevel = guild.library_level || 0;
                                                        const nextLevel = currentLevel + 1;
                                                        const costs = UPGRADE_COSTS[nextLevel];
                                                        const silverCost = costs?.silver || 0;
                                                        const gpCost = (nextLevel === 1) ? 0 : (costs?.gp || 0);
                                                        const matAmount = costs?.mats || 0;
                                                        const tier = Math.min(10, nextLevel);
                                                        const reqGuildLevel = Math.max(1, (nextLevel - 1) * 10);

                                                        const hasSilver = (guild.bank_silver || 0) >= silverCost;
                                                        const hasGP = (guild.guild_points || 0) >= gpCost;
                                                        const hasGuildLevel = (guild.level || 1) >= reqGuildLevel;
                                                        const materials = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'].map(m => ({ id: `T${tier}_${m}`, name: `T${tier} ${m}` }));
                                                        const hasMats = materials.every(m => ((globalThis.currentBankTotals || {})[m.id] || 0) >= matAmount);
                                                        const canUpgrade = playerHasPermission('manage_upgrades') && hasSilver && hasGP && hasMats && hasGuildLevel;

                                                        return (
                                                            <>
                                                                <div style={{ background: 'rgba(0,0,0,0.25)', padding: isMobile ? '10px' : '15px', borderRadius: '12px', border: hasSilver ? '1px solid rgba(68, 255, 68, 0.1)' : '1px solid rgba(255, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '15px' }}>
                                                                    <div style={{ background: 'rgba(255,215,0,0.1)', padding: isMobile ? '8px' : '10px', borderRadius: '10px' }}>
                                                                        <Coins size={isMobile ? 16 : 20} color="#ffd700" />
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ color: hasSilver ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: '900' }}>{formatSilver(silverCost)}</div>
                                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', fontWeight: 'bold' }}>Silver in Bank</div>
                                                                    </div>
                                                                </div>

                                                                {gpCost > 0 && (
                                                                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: isMobile ? '10px' : '15px', borderRadius: '12px', border: hasGP ? '1px solid rgba(68, 255, 68, 0.1)' : '1px solid rgba(255, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '15px' }}>
                                                                        <div style={{ background: 'rgba(68,136,255,0.1)', padding: isMobile ? '8px' : '10px', borderRadius: '10px' }}>
                                                                            <ClipboardList size={isMobile ? 16 : 20} color="var(--accent)" />
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ color: hasGP ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: '900' }}>{gpCost.toLocaleString()} GP</div>
                                                                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', fontWeight: 'bold' }}>Guild Points</div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div style={{ background: 'rgba(0,0,0,0.25)', padding: isMobile ? '10px' : '15px', borderRadius: '12px', border: hasGuildLevel ? '1px solid rgba(68, 255, 68, 0.1)' : '1px solid rgba(255, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '15px' }}>
                                                                    <div style={{ background: 'rgba(68,136,255,0.1)', padding: isMobile ? '8px' : '10px', borderRadius: '10px' }}>
                                                                        <Trophy size={isMobile ? 16 : 20} color="#4488ff" />
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ color: hasGuildLevel ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: '900' }}>LVL {reqGuildLevel}</div>
                                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', fontWeight: 'bold' }}>Guild Level Req.</div>
                                                                    </div>
                                                                </div>

                                                                <div style={{ gridColumn: isMobile ? 'auto' : '1/-1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '8px' : '10px', marginTop: '5px' }}>
                                                                    {materials.map(m => {
                                                                        const cur = (globalThis.currentBankTotals || {})[m.id] || 0;
                                                                        const has = cur >= matAmount;
                                                                        const [tierPart, namePart] = m.id.split('_');
                                                                        return (
                                                                            <div key={m.id} style={{ background: 'rgba(0,0,0,0.25)', padding: isMobile ? '6px' : '10px', borderRadius: '12px', border: has ? '1px solid rgba(68, 255, 68, 0.1)' : '1px solid rgba(255, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', fontWeight: 'bold' }}>{tierPart} {namePart}</div>
                                                                                <img src={`/items/${m.id}.webp`} style={{ width: isMobile ? '16px' : '22px', height: isMobile ? '16px' : '22px' }} alt={m.name} />
                                                                                <div style={{ color: has ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.55rem' : '0.7rem', fontWeight: 'bold' }}>
                                                                                    {cur >= 1000 ? (cur / 1000).toFixed(1) + 'K' : cur}/{matAmount >= 1000 ? (matAmount / 1000).toFixed(0) + 'K' : matAmount}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                <div style={{ gridColumn: isMobile ? 'auto' : '1/-1', marginTop: isMobile ? '10px' : '15px' }}>
                                                                    <motion.button
                                                                        whileHover={canUpgrade ? { scale: 1.02 } : {}}
                                                                        whileTap={canUpgrade ? { scale: 0.98 } : {}}
                                                                        disabled={!canUpgrade}
                                                                        onClick={() => socket?.emit('upgrade_guild_building', { buildingType: 'LIBRARY' })}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: isMobile ? '12px' : '16px',
                                                                            background: canUpgrade ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                                                            border: 'none',
                                                                            borderRadius: '12px',
                                                                            color: canUpgrade ? '#000' : 'rgba(255,255,255,0.2)',
                                                                            fontWeight: '900',
                                                                            fontSize: isMobile ? '0.8rem' : '0.9rem',
                                                                            cursor: canUpgrade ? 'pointer' : 'not-allowed',
                                                                            letterSpacing: '1px'
                                                                        }}
                                                                    >
                                                                        {!playerHasPermission('manage_upgrades') ? 'NO PERMISSION' : canUpgrade ? 'UPGRADE LIBRARY' : 'MISSING REQUIREMENTS'}
                                                                    </motion.button>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: isMobile ? '20px' : '40px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '24px', border: '1px solid var(--accent)' }}>
                                            <Sparkles size={isMobile ? 32 : 48} color="var(--accent)" style={{ marginBottom: '15px' }} />
                                            <div style={{ color: 'var(--accent)', fontWeight: '900', fontSize: isMobile ? '1rem' : '1.2rem', letterSpacing: '1px' }}>MAXIMUM LEVEL REACHED</div>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '0.7rem' : '0.8rem', marginTop: '5px' }}>Your Library has reached the peak of ancient knowledge.</div>
                                        </div>
                                    )}
                                </div>
                            )}


                            {['GATHERING', 'REFINING', 'CRAFTING'].includes(selectedBuilding) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {(() => {
                                        const bId = selectedBuilding === 'GATHERING' ? 'GATHERING_STATION' :
                                            selectedBuilding === 'REFINING' ? 'REFINING_STATION' : 'CRAFTING_STATION';
                                        const config = GUILD_BUILDINGS[bId];
                                        const color = selectedBuilding === 'GATHERING' ? '#a855f7' :
                                            selectedBuilding === 'REFINING' ? '#10b981' : '#f59e0b';
                                        const Icon = selectedBuilding === 'GATHERING' ? Pickaxe :
                                            selectedBuilding === 'REFINING' ? FlaskConical : Hammer;

                                        return (
                                            <>
                                                <div style={{
                                                    background: `linear-gradient(135deg, ${color}11 0%, rgba(0,0,0,0) 100%)`,
                                                    borderRadius: '20px',
                                                    border: `1px solid ${color}33`,
                                                    padding: isMobile ? '15px' : '20px'
                                                }}>
                                                    <h3 style={{ color, margin: 0, fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Icon size={isMobile ? 20 : 24} /> {config.name}
                                                    </h3>
                                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '5px 0 0 0' }}>{config.description}</p>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '15px' }}>
                                                    {Object.entries(config.paths).map(([path, pathConfig]) => {
                                                        const currentLevel = guild[pathConfig.column] || 0;
                                                        const nextLevel = currentLevel + 1;
                                                        const costs = UPGRADE_COSTS[nextLevel];
                                                        const isMax = currentLevel >= config.maxLevel;

                                                        const silverCost = costs?.silver || 0;
                                                        const gpCost = costs?.gp || 0;
                                                        const matAmount = costs?.mats || 0;
                                                        const tier = Math.min(10, nextLevel);
                                                        const reqGuildLevel = Math.max(1, (nextLevel - 1) * 10);
                                                        const hasGuildLevel = (guild.level || 1) >= reqGuildLevel;
                                                        const isSyncBlocked = Object.values(config.paths).some(p => (guild[p.column] || 0) < currentLevel);

                                                        const materials = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'].map(m => `T${tier}_${m}`);
                                                        const bankTotals = globalThis.currentBankTotals || {};
                                                        const hasMats = materials.every(m => (bankTotals[m] || 0) >= matAmount);
                                                        const hasSilver = (guild.bank_silver || 0) >= silverCost;
                                                        const hasGP = (guild.guild_points || 0) >= gpCost;
                                                        const canUpgrade = playerHasPermission('manage_upgrades') && hasGuildLevel && hasSilver && hasGP && hasMats && !isSyncBlocked;

                                                        const pathColor = path === 'XP' ? '#4488ff' : path === 'DUPLIC' ? '#ffd700' : color;
                                                        const PathIcon = path === 'XP' ? Trophy : path === 'DUPLIC' ? Sparkles : Zap;

                                                        return (
                                                            <div key={path} style={{
                                                                background: 'rgba(255,255,255,0.03)',
                                                                borderRadius: '16px',
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                                padding: '15px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '12px',
                                                                opacity: isSyncBlocked ? 0.6 : 1
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <div style={{ background: `${pathColor}22`, padding: '6px', borderRadius: '8px' }}>
                                                                        <PathIcon size={18} color={pathColor} />
                                                                    </div>
                                                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>LVL {currentLevel}</div>
                                                                </div>

                                                                <div>
                                                                    <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{pathConfig.name}</div>
                                                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                                        <span>Current:</span>
                                                                        <span style={{ color: pathColor }}>+{STATION_BONUS_TABLE[currentLevel] || 0}{pathConfig.suffix}</span>
                                                                        {!isMax && (
                                                                            <>
                                                                                <span style={{ opacity: 0.5 }}>-</span>
                                                                                <span>Next lvl</span>
                                                                                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>(+{STATION_BONUS_TABLE[nextLevel]}{pathConfig.suffix})</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {!isMax ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        {isSyncBlocked && (
                                                                            <div style={{ background: 'rgba(255,68,68,0.1)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                                <Lock size={12} color="#ff4444" />
                                                                                <span style={{ fontSize: '0.55rem', color: "#ff4444", fontWeight: 'bold' }}>SYNC REQUIRED</span>
                                                                            </div>
                                                                        )}
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                                                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <Coins size={12} color="#ffd700" />
                                                                                <span style={{ fontSize: '0.65rem', color: hasSilver ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>{formatSilver(silverCost)}</span>
                                                                            </div>
                                                                            {gpCost > 0 && (
                                                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                    <ClipboardList size={12} color="var(--accent)" />
                                                                                    <span style={{ fontSize: '0.65rem', color: hasGP ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>{gpCost} GP</span>
                                                                                </div>
                                                                            )}
                                                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <Trophy size={12} color="#4488ff" />
                                                                                <span style={{ fontSize: '0.65rem', color: hasGuildLevel ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>LVL {reqGuildLevel}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '4px' : '5px' }}>
                                                                            {materials.map(m => {
                                                                                const bankTotals = globalThis.currentBankTotals || {};
                                                                                const cur = bankTotals[m] || 0;
                                                                                const has = cur >= matAmount;
                                                                                const [tierPart, namePart] = m.split('_');
                                                                                return (
                                                                                    <div key={m} style={{ background: 'rgba(0,0,0,0.2)', padding: isMobile ? '4px' : '5px', borderRadius: '12px', border: has ? '1px solid rgba(68,255,68,0.1)' : '1px solid rgba(255,68,68,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: isMobile ? '0.4rem' : '0.45rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{tierPart} {namePart}</div>
                                                                                        <img src={`/items/${m}.webp`} style={{ width: isMobile ? '12px' : '22px', height: isMobile ? '12px' : '22px' }} />
                                                                                        <div style={{ color: has ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.45rem' : '0.7rem', fontWeight: 'bold' }}>
                                                                                            {cur >= 1000 ? (cur / 1000).toFixed(1) + 'K' : cur}/{matAmount >= 1000 ? (matAmount / 1000).toFixed(0) + 'K' : matAmount}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        <motion.button
                                                                            whileHover={canUpgrade ? { scale: 1.02 } : {}}
                                                                            whileTap={canUpgrade ? { scale: 0.98 } : {}}
                                                                            disabled={!canUpgrade}
                                                                            onClick={() => socket?.emit('upgrade_guild_building', { buildingType: bId, path })}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '8px',
                                                                                background: canUpgrade ? pathColor : 'rgba(255,255,255,0.05)',
                                                                                border: 'none',
                                                                                borderRadius: '10px',
                                                                                color: canUpgrade ? '#000' : 'rgba(255,255,255,0.2)',
                                                                                fontWeight: 'bold',
                                                                                fontSize: '0.7rem',
                                                                                cursor: canUpgrade ? 'pointer' : 'not-allowed'
                                                                            }}
                                                                        >
                                                                            {isMax ? 'MAX' : isSyncBlocked ? 'LOCKED' : canUpgrade ? 'UPGRADE' : 'MISSING'}
                                                                        </motion.button>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ background: 'rgba(68, 255, 68, 0.05)', border: '1px solid rgba(68, 255, 68, 0.2)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                                                        <Check size={16} color="#44ff44" style={{ margin: '0 auto 4px' }} />
                                                                        <div style={{ color: '#44ff44', fontSize: '0.65rem', fontWeight: 'bold' }}>MAX LEVEL</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {selectedBuilding === 'BANK' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                    {/* Bank Balances Card */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 100%)',
                                        borderRadius: '20px',
                                        border: '1px solid rgba(212, 175, 55, 0.2)',
                                        padding: isMobile ? '15px' : '20px'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '15px' : '20px', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Landmark size={isMobile ? 20 : 24} /> GUILD BANK
                                                </h3>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setShowDonateModal(true)}
                                                    style={{
                                                        padding: '4px 12px',
                                                        background: 'var(--accent)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        color: '#000',
                                                        fontSize: '0.65rem',
                                                        fontWeight: '900',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)'
                                                    }}
                                                >
                                                    <Plus size={14} /> DONATE
                                                </motion.button>
                                            </div>
                                            <div style={{ color: '#fff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Coins size={isMobile ? 16 : 18} color="#ffd700" />
                                                    {formatSilver(guild.bank_silver || 0)}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                                                    <ClipboardList size={isMobile ? 16 : 18} />
                                                    <span>{(guild.guild_points || 0).toLocaleString()} GP</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Item Balances Grid */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(130px, 1fr))',
                                            gap: isMobile ? '8px' : '10px',
                                            maxHeight: isMobile ? '300px' : '200px',
                                            overflowY: 'auto',
                                            paddingRight: '5px'
                                        }}>
                                            {(() => {
                                                const rawMaterials = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'];
                                                const tiers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                                                const materialList = [];
                                                tiers.forEach(t => {
                                                    rawMaterials.forEach(m => {
                                                        materialList.push(`T${t}_${m}`);
                                                    });
                                                });

                                                const bankItems = globalThis.currentBankTotals || {};

                                                const materialNeeds = calculateMaterialNeeds(guild);
                                                const otherItems = Object.keys(bankItems).filter(id => !materialList.includes(id));
                                                const finalIds = [...materialList, ...otherItems.sort()];

                                                return finalIds.map(itemId => {
                                                    const amount = bankItems[itemId] || 0;
                                                    const totalNeeded = materialNeeds[itemId];
                                                    const isTracked = totalNeeded !== undefined;
                                                    const isComplete = isTracked && amount >= totalNeeded && totalNeeded > 0;

                                                    return (
                                                        <div key={itemId} style={{
                                                            background: isComplete ? 'rgba(68, 255, 68, 0.05)' : 'rgba(255,255,255,0.03)',
                                                            padding: isMobile ? '8px' : '10px',
                                                            borderRadius: '12px',
                                                            border: isComplete ? '1px solid rgba(68, 255, 68, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: isMobile ? '6px' : '10px',
                                                            opacity: (isTracked && totalNeeded === 0) ? 0.2 : (amount > 0 || isTracked ? 1 : 0.4)
                                                        }}>
                                                            <div style={{ width: isMobile ? '18px' : '24px', height: isMobile ? '18px' : '24px' }}>
                                                                <img src={`/items/${itemId}.webp`} alt={itemId} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ color: isComplete ? '#44ff44' : (amount > 0 ? '#fff' : 'rgba(255,255,255,0.2)'), fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 'bold' }}>
                                                                    {amount.toLocaleString()}
                                                                    {isTracked && totalNeeded > 0 && (
                                                                        <span style={{ fontSize: '0.6rem', color: isComplete ? '#44ff4488' : 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>
                                                                            / {totalNeeded.toLocaleString()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    {itemId.replace(/_/g, ' ')}
                                                                    {isComplete && <Check size={8} color="#44ff44" />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'TASKS' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: isMobile ? 'flex-start' : 'center',
                                flexDirection: isMobile ? 'column' : 'row',
                                gap: isMobile ? '15px' : '0'
                            }}>
                                <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <ClipboardList size={isMobile ? 18 : 22} /> DAILY TASKS
                                </h3>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', letterSpacing: '1px' }}>REWARD PER TASK:</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Trophy size={11} color="var(--accent)" />
                                                    <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: '900' }}>
                                                        +{(GUILD_TASKS_CONFIG.REWARDS.XP_TABLE[guild.library_level || 1] || 0).toLocaleString()} XP
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <ClipboardList size={11} color="#4488ff" />
                                                    <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: '900' }}>
                                                        +{(GUILD_TASKS_CONFIG.REWARDS.GP_TABLE[guild.library_level || 1] || 0).toLocaleString()} GP
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isLoadingTasks ? (
                                <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                                    <div className="spinner-small" style={{ width: '30px', height: '30px' }} />
                                </div>
                            ) : guildTasks.locked ? (
                                <div style={{
                                    padding: '60px 20px',
                                    textAlign: 'center',
                                    background: 'rgba(68, 136, 255, 0.05)',
                                    borderRadius: '24px',
                                    border: '1px dashed rgba(68, 136, 255, 0.3)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '20px'
                                }}>
                                    <div style={{ position: 'relative' }}>
                                        <Library size={48} color="#4488ff" style={{ opacity: 0.5 }} />
                                        <Lock size={20} color="#ff4444" style={{ position: 'absolute', bottom: -5, right: -5 }} />
                                    </div>
                                    <div>
                                        <h4 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: '900' }}>TASKS LOCKED</h4>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', maxWidth: '300px', margin: 0 }}>
                                            {guildTasks.message || "Upgrade the Library to Level 1 to unlock daily guild tasks."}
                                        </p>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            setSelectedBuilding('LIBRARY');
                                            setActiveTab('BUILDING');
                                        }}
                                        style={{
                                            background: '#4488ff',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '10px 20px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        GO TO LIBRARY
                                    </motion.button>
                                </div>
                            ) : guildTasks.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                                    {guildTasks.map((task, index) => {
                                        const isCompleted = task.progress >= task.required;
                                        const progressPct = Math.min(100, (task.progress / task.required) * 100);
                                        const item = task.itemId;
                                        const hasItemInInventory = !isCompleted && (gameState?.state?.inventory?.[item] || 0) > 0;

                                        // Center the 13th item on desktop
                                        const isLastAndLonely = !isMobile && index === 12;

                                        return (
                                            <motion.div
                                                key={task.id}
                                                whileHover={{ y: -5 }}
                                                style={{
                                                    background: isCompleted ? 'rgba(68, 255, 68, 0.08)' : 'rgba(255,255,255,0.03)',
                                                    borderRadius: '10px',
                                                    border: `1px solid ${isCompleted ? 'rgba(68, 255, 68, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                                                    padding: '4px 8px',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    gridColumn: isLastAndLonely ? '2' : 'auto',
                                                    boxShadow: isCompleted ? '0 0 15px rgba(68, 255, 68, 0.05)' : 'none'
                                                }}
                                            >

                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                                                    <div style={{
                                                        width: '36px', height: '36px',
                                                        background: 'rgba(0,0,0,0.3)', borderRadius: '10px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        flexShrink: 0,
                                                        position: 'relative'
                                                    }}>
                                                        {hasItemInInventory && (
                                                            <div style={{
                                                                position: 'absolute', top: '-3px', right: '-3px',
                                                                width: '8px', height: '8px',
                                                                background: '#44ff44',
                                                                borderRadius: '50%',
                                                                border: '2px solid rgba(0,0,0,0.6)',
                                                                zIndex: 2
                                                            }} />
                                                        )}
                                                        <img
                                                            src={
                                                                item.includes('_POTION_XP') ? `/items/${item.split('_')[0]}_KNOWLEDGE_POTION.webp` :
                                                                    item.includes('_POTION_GATHER') ? `/items/${item.split('_')[0]}_GATHERING_POTION.webp` :
                                                                        item.includes('_POTION_REFINE') ? `/items/${item.split('_')[0]}_REFINING_POTION.webp` :
                                                                            item.includes('_POTION_CRAFT') ? `/items/${item.split('_')[0]}_CRAFTING_POTION.webp` :
                                                                                item.includes('_POTION_SILVER') ? `/items/${item.split('_')[0]}_SILVER_POTION.webp` :
                                                                                    item.includes('_POTION_QUALITY') ? `/items/${item.split('_')[0]}_QUALITY_POTION.webp` :
                                                                                        item.includes('_POTION_LUCK') ? `/items/${item.split('_')[0]}_LUCK_POTION.webp` :
                                                                                            item.includes('_POTION_DAMAGE') ? `/items/${item.split('_')[0]}_DAMAGE_POTION.webp` :
                                                                                                item.includes('_POTION_CRIT') ? `/items/${item.split('_')[0]}_CRITICAL_POTION.webp` :
                                                                                                    `/items/${item}.webp`
                                                            }
                                                            alt={item}
                                                            style={{ width: '22px', height: '22px' }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {item.split('_')[0]} {
                                                                item.includes('_POTION_') ?
                                                                    item.split('_').slice(1).join(' ').toLowerCase().replace('xp', 'knowledge') :
                                                                    item.split('_').slice(1).join(' ').toLowerCase()
                                                            }
                                                        </div>

                                                    </div>
                                                </div>

                                                {/* Progress Bar & Contribute Button */}
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '2px', marginTop: '-14px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px', fontWeight: 'bold' }}>
                                                            <span>{task.progress} / {task.required}</span>
                                                        </div>
                                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progressPct}%` }}
                                                                style={{
                                                                    height: '100%',
                                                                    background: isCompleted ? 'linear-gradient(90deg, #44ff44 0%, #fff 100%)' : 'linear-gradient(90deg, var(--accent) 0%, #fff 100%)',
                                                                    boxShadow: isCompleted ? '0 0 10px rgba(68, 255, 68, 0.4)' : '0 0 10px rgba(212, 175, 55, 0.4)'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {!isCompleted && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1, background: 'var(--accent)', color: '#000' }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => {
                                                                setShowContributeModal(task);
                                                                setContributeAmount("");
                                                            }}
                                                            style={{
                                                                width: '24px', height: '24px',
                                                                background: 'rgba(255,255,255,0.05)', color: 'var(--accent)',
                                                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', flexShrink: 0
                                                            }}
                                                            title="Contribute"
                                                        >
                                                            <Plus size={14} />
                                                        </motion.button>
                                                    )}
                                                </div>


                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <ClipboardList size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '15px' }} />
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontWeight: 'bold' }}>No tasks available.</div>
                                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', marginTop: '5px' }}>Check back at 00:00 UTC.</div>
                                </div>
                            )}

                            {/* Contribution Modal */}
                            {showContributeModal && ReactDOM.createPortal(
                                <AnimatePresence>
                                    {showContributeModal && (
                                        <>
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={() => setShowContributeModal(null)}
                                                style={{
                                                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                                                    zIndex: 10000
                                                }}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                                                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                                                exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                                                style={{
                                                    position: 'fixed', top: '50%', left: '50%',
                                                    width: 'min(400px, 90vw)', background: '#111',
                                                    border: '2px solid var(--accent)', borderRadius: '24px',
                                                    padding: '24px', zIndex: 10001,
                                                    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                                                    display: 'flex', flexDirection: 'column', gap: '20px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>CONTRIBUTE MATERIALS</div>
                                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
                                                            {showContributeModal.itemId.replace(/_/g, ' ')}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowContributeModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={24} /></button>
                                                </div>

                                                <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{ width: '40px', height: '40px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifySelf: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <img src={`/items/${showContributeModal.itemId}.webp`} style={{ width: '24px', height: '24px', margin: '0 auto' }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>YOUR INVENTORY</div>
                                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                            {getItemAmount(showContributeModal.itemId).toLocaleString()} <span style={{ fontSize: '0.7rem' }}>Items</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>AMOUNT TO DONATE</label>
                                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>Remaining: {showContributeModal.required - showContributeModal.progress}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <input
                                                            type="number"
                                                            value={contributeAmount}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === "") {
                                                                    setContributeAmount("");
                                                                    return;
                                                                }
                                                                const num = parseInt(val);
                                                                if (!isNaN(num)) {
                                                                    const maxCanDonate = Math.min(
                                                                        getItemAmount(showContributeModal.itemId),
                                                                        showContributeModal.required - showContributeModal.progress
                                                                    );
                                                                    setContributeAmount(Math.max(0, Math.min(maxCanDonate, num)));
                                                                }
                                                            }}
                                                            placeholder="Enter amount..."
                                                            style={{
                                                                flex: 1, minWidth: '0', padding: '12px', background: '#0a0a0a',
                                                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                                                                color: '#fff', fontSize: '1.1rem', fontWeight: 'bold',
                                                                outline: 'none', textAlign: 'center'
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const maxCanDonate = Math.min(
                                                                    getItemAmount(showContributeModal.itemId),
                                                                    showContributeModal.required - showContributeModal.progress
                                                                );
                                                                setContributeAmount(maxCanDonate);
                                                            }}
                                                            style={{
                                                                padding: '0 20px', background: 'rgba(255,255,255,0.05)',
                                                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                                                                color: 'var(--accent)', fontSize: '0.8rem',
                                                                fontWeight: '900', cursor: 'pointer'
                                                            }}
                                                        >
                                                            MAX
                                                        </button>
                                                    </div>
                                                </div>

                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    disabled={taskPending || !contributeAmount || contributeAmount <= 0}
                                                    onClick={() => {
                                                        setTaskPending(true);
                                                        socket?.emit('contribute_to_guild_task', {
                                                            taskId: showContributeModal.id,
                                                            amount: parseInt(contributeAmount)
                                                        });
                                                    }}
                                                    style={{
                                                        width: '100%', padding: '16px',
                                                        background: 'var(--accent)', color: '#000',
                                                        border: 'none', borderRadius: '16px',
                                                        fontSize: '0.9rem', fontWeight: '900',
                                                        cursor: taskPending ? 'not-allowed' : 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                                        opacity: taskPending || !contributeAmount ? 0.6 : 1
                                                    }}
                                                >
                                                    {taskPending ? <div className="spinner-small" style={{ width: '18px', height: '18px', borderTopColor: '#000' }} /> : 'CONFIRM CONTRIBUTION'}
                                                </motion.button>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>, document.body)}
                        </div>
                    )}

                    {activeTab === 'SETTINGS' && (
                        <div style={{ padding: '20px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '0.8rem' }}>Guild Preferences</h4>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Configure who can join and view guild information.</p>
                            </div>
                            {playerHasPermission('manage_guild') ? (
                                <>
                                    {playerHasPermission('edit_appearance') && (
                                        <div
                                            onClick={() => setShowEditCustomization(true)}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                padding: '15px',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}
                                        >
                                            <Edit2 size={16} color="var(--accent)" />
                                            <div>
                                                <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>Edit Appearance</div>
                                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Guild icon, colors and country</div>
                                            </div>
                                        </div>
                                    )}

                                    {playerHasPermission('manage_roles') && (
                                        <div
                                            onClick={() => setShowRolesModal(true)}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                padding: '15px',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                marginTop: '12px'
                                            }}
                                        >
                                            <Users size={16} color="var(--accent)" />
                                            <div>
                                                <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>Manage Roles</div>
                                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>View and configure guild ranks</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Join Settings */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        padding: '18px',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        marginTop: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '16px'
                                    }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>JOIN SETTINGS</div>

                                        {/* Min Level */}
                                        <div>
                                            <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Minimum Level</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="9999"
                                                value={settingsMinLevel}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '') {
                                                        setSettingsMinLevel('');
                                                        return;
                                                    }
                                                    const num = parseInt(val);
                                                    if (!isNaN(num)) {
                                                        setSettingsMinLevel(Math.max(0, Math.min(9999, num)));
                                                    }
                                                }}
                                                style={{
                                                    width: '80px',
                                                    padding: '8px 12px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '10px',
                                                    color: '#fff',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                    outline: 'none',
                                                    textAlign: 'center'
                                                }}
                                            />
                                        </div>

                                        {/* Join Mode */}
                                        <div>
                                            <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Entry Mode</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {[{ id: 'APPLY', label: 'Requires Application' }, { id: 'OPEN', label: 'Open to Join' }].map(mode => (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => setSettingsJoinMode(mode.id)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px',
                                                            background: settingsJoinMode === mode.id ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.03)',
                                                            border: settingsJoinMode === mode.id ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                                                            borderRadius: '10px',
                                                            color: settingsJoinMode === mode.id ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        {mode.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Save Button */}
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.97 }}
                                            disabled={settingsPending}
                                            onClick={() => {
                                                setSettingsPending(true);
                                                socket?.emit('update_guild_settings', {
                                                    minLevel: Number(settingsMinLevel) || 1,
                                                    joinMode: settingsJoinMode
                                                });
                                                setTimeout(() => setSettingsPending(false), 2000);
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: 'var(--accent)',
                                                border: 'none',
                                                borderRadius: '10px',
                                                color: '#000',
                                                fontWeight: '900',
                                                fontSize: '0.75rem',
                                                cursor: settingsPending ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                opacity: settingsPending ? 0.6 : 1
                                            }}
                                        >
                                            {settingsPending ? (
                                                <div className="spinner-small" style={{ width: '14px', height: '14px', borderTopColor: '#000' }} />
                                            ) : (
                                                <>
                                                    <Save size={14} />
                                                    SAVE SETTINGS
                                                </>
                                            )}
                                        </motion.button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', padding: '20px' }}>
                                    You don't have permission to manage guild settings.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'MEMBERS' && (
                        sortedMembers.map((member, i) => (
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
                                                border: '1px solid #ff980044'
                                            }}>
                                                <Shield size={12} color="#ff9800" style={{ filter: 'drop-shadow(0 0 5px #ff980088)' }} title="Ironman" />
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
                                            if (playerHasPermission('change_member_roles') && member.role !== 'LEADER' && member.id !== guild.myMemberId) {
                                                setRoleDropdownId(roleDropdownId === member.id ? null : member.id);
                                            }
                                        }}
                                        style={{
                                            fontSize: '0.65rem',
                                            fontWeight: '900',
                                            color: getRoleColor(member.role),
                                            background: `${getRoleColor(member.role).startsWith('#') ? getRoleColor(member.role) : 'rgba(255,255,255,0.03)'}${getRoleColor(member.role).startsWith('#') ? '15' : ''}`,
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            letterSpacing: '0.5px',
                                            border: `1px solid ${getRoleColor(member.role).startsWith('#') ? getRoleColor(member.role) : 'transparent'}${getRoleColor(member.role).startsWith('#') ? '33' : ''}`,
                                            cursor: (playerHasPermission('change_member_roles') && member.role !== 'LEADER' && member.id !== guild.myMemberId) ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        {getRoleDisplayName(member.role)}
                                        {playerHasPermission('change_member_roles') && member.role !== 'LEADER' && member.id !== guild.myMemberId && <ChevronDown size={10} />}
                                    </div>

                                    {playerHasPermission('kick_members') && member.id !== guild.myMemberId && member.role !== 'LEADER' && (
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setKickConfirm({ id: member.id, name: member.name });
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
                                                    background: '#1a1a1a',
                                                    borderRadius: '10px',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                                    zIndex: 2000,
                                                    minWidth: '140px',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {Object.entries({
                                                    OFFICER: { name: 'Co-Leader', color: '#c0c0c0' },
                                                    MEMBER: { name: 'Member', color: '#808080' },
                                                    ...(guild.roles || {})
                                                }).filter(([key]) => key !== 'LEADER').map(([key, role]) => {
                                                    const config = (guild.roles || {})[key] || {};
                                                    return {
                                                        id: key,
                                                        label: config.name || role.name,
                                                        color: config.color || role.color || '#ffd700',
                                                        order: config.order !== undefined ? config.order : (key === 'OFFICER' ? -50 : (key === 'MEMBER' ? 0 : 100))
                                                    };
                                                }).sort((a, b) => a.order - b.order).map((role) => (
                                                    <div
                                                        key={role.id}
                                                        onClick={() => {
                                                            socket?.emit('change_member_role', { memberId: member.id, newRole: role.id });
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
                        ))
                    )}
                    {activeTab === 'REQUESTS' && (
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
                                                {req.avatar ? (
                                                    <img
                                                        src={req.avatar.replace(/\.(png|jpg|jpeg)$/, '.webp')}
                                                        alt={req.name}
                                                        style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover', objectPosition: 'center 20%' }}
                                                    />
                                                ) : (
                                                    <User size={20} color="rgba(255,255,255,0.4)" />
                                                )}
                                            </div>
                                            {req.isIronman && (
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
                                                    border: '1px solid #ff980044'
                                                }}>
                                                    <Shield size={12} color="#ff9800" style={{ filter: 'drop-shadow(0 0 5px #ff980088)' }} title="Ironman" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div
                                                onClick={() => onInspect && onInspect(req.name)}
                                                style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}
                                            >
                                                {req.name}
                                            </div>
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

                {/* Leave Guild Button - only on Home tab */}
                {(activeTab === 'MEMBERS' || activeTab === 'REQUESTS') && <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        setDisbandText('');
                        setConfirmLeave(true);
                    }}
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
                </motion.button>}
                {/* Leave Confirmation Modal */}
                {ReactDOM.createPortal(
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
                                    background: '#000000',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 2147483647,
                                    padding: '20px'
                                }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        background: '#0a0a0a',
                                        border: '2px solid #ff4444',
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
                                    {guild.myRole === 'LEADER' && members.length <= 1 && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ color: 'var(--text-main)', fontSize: '0.8rem', marginBottom: '10px', fontWeight: 'bold' }}>
                                                Type <span style={{ color: '#ff4444' }}>Disband {guild.name}</span> to confirm:
                                            </p>
                                            <input
                                                type="text"
                                                value={disbandText}
                                                onChange={(e) => setDisbandText(e.target.value)}
                                                placeholder={`Disband ${guild.name}`}
                                                spellCheck={false}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-main)',
                                                    outline: 'none',
                                                    textAlign: 'center',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                        </div>
                                    )}
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
                                                if (guild.myRole === 'LEADER' && members.length <= 1) {
                                                    if (disbandText === `Disband ${guild.name}`) {
                                                        socket?.emit('leave_guild');
                                                        setConfirmLeave(false);
                                                    }
                                                } else {
                                                    socket?.emit('leave_guild');
                                                    setConfirmLeave(false);
                                                }
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: '#ff4444',
                                                border: 'none',
                                                borderRadius: '10px',
                                                color: '#000',
                                                fontSize: '0.75rem',
                                                fontWeight: '900',
                                                cursor: (guild.myRole === 'LEADER' && members.length <= 1 && disbandText !== `Disband ${guild.name}`) ? 'not-allowed' : 'pointer',
                                                opacity: (guild.myRole === 'LEADER' && members.length <= 1 && disbandText !== `Disband ${guild.name}`) ? 0.3 : 1
                                            }}
                                        >
                                            CONFIRM
                                        </motion.button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Info Modal */}
                {ReactDOM.createPortal(
                    <AnimatePresence>
                        {showInfoModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowInfoModal(false)}
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.85)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1000000, // Absolute front
                                    padding: '20px',
                                    paddingTop: '80px'
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        background: '#000', // Solid background matching other modals
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '24px',
                                        padding: '30px',
                                        maxWidth: '400px',
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '20px',
                                        boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                                        position: 'relative',
                                        maxHeight: '90vh',
                                        overflowY: 'auto'
                                    }}
                                >
                                    <button
                                        onClick={() => setShowInfoModal(false)}
                                        style={{
                                            position: 'absolute',
                                            top: '20px',
                                            right: '20px',
                                            background: 'none',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.5)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <X size={20} />
                                    </button>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '16px',
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            border: '1px solid var(--accent)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--accent)'
                                        }}>
                                            <Info size={28} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>About Guild XP</h3>
                                            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.8rem' }}>How does your guild grow?</p>
                                        </div>
                                    </div>

                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '12px',
                                        padding: '15px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        fontSize: '0.85rem',
                                        color: 'rgba(255,255,255,0.8)',
                                        lineHeight: '1.5'
                                    }}>
                                        <p style={{ margin: '0 0 10px 0' }}>
                                            Whenever any member of the guild performs actions that grant experience, <strong>a 10% bonus</strong> of that XP is copied and granted directly to the Guild!
                                        </p>
                                        <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--accent)', fontWeight: 'bold' }}>
                                            <li>⚔️ Combat (Killing Mobs)</li>
                                            <li>🏰 Dungeons</li>
                                            <li>⛏️ Gathering (Wood, Ore, Fishing, etc.)</li>
                                            <li>⚒️ Refining & Crafting</li>
                                        </ul>
                                        <p style={{ margin: '15px 0 0 0', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                            Note: Offline XP gains are automatically credited to the guild when the member logs back in. Guild XP updates occur every 30 minutes in the background.
                                        </p>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowInfoModal(false)}
                                        style={{
                                            padding: '12px',
                                            background: 'var(--accent)',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: '900',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        GOT IT
                                    </motion.button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Edit Customization Modal */}
                {ReactDOM.createPortal(
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
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1000000,
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
                                        background: '#000',
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{
                                                padding: '10px',
                                                background: 'rgba(212, 175, 55, 0.1)',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(212, 175, 55, 0.2)'
                                            }}>
                                                <Settings size={20} color="var(--accent)" />
                                            </div>
                                            <div>
                                                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.5px' }}>EDIT GUILD</h3>
                                                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.7rem' }}>Global Guild Settings</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowEditCustomization(false)}
                                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>

                                    {(() => {
                                        let orbsCost = 0;
                                        const nameChanged = editGuildName.trim() !== guild.name;
                                        const tagChanged = editGuildTag.toUpperCase().slice(0, 4) !== guild.tag;
                                        if (nameChanged) orbsCost += 250;
                                        if (tagChanged) orbsCost += 100;
                                        const playerOrbs = gameState?.state?.orbs || 0;
                                        const hasEnoughOrbs = playerOrbs >= orbsCost;

                                        return (
                                            <>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                    {/* Guild Name & Tag Row */}
                                                    <div style={{ display: 'flex', gap: '15px' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', display: 'block', marginBottom: '8px' }}>GUILD NAME</label>
                                                            <input
                                                                type="text"
                                                                value={editGuildName}
                                                                onChange={(e) => setEditGuildName(e.target.value)}
                                                                placeholder="Enter guild name..."
                                                                style={{
                                                                    width: '100%',
                                                                    background: 'rgba(255,255,255,0.03)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    borderRadius: '12px',
                                                                    padding: '12px 15px',
                                                                    color: '#fff',
                                                                    fontSize: '0.9rem'
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', display: 'block', marginBottom: '8px' }}>GUILD TAG</label>
                                                            <input
                                                                type="text"
                                                                value={editGuildTag}
                                                                onChange={(e) => setEditGuildTag(e.target.value.toUpperCase().slice(0, 4))}
                                                                placeholder="TAG"
                                                                style={{
                                                                    width: '100px',
                                                                    background: 'rgba(255,255,255,0.03)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    borderRadius: '12px',
                                                                    padding: '12px',
                                                                    color: '#fff',
                                                                    fontSize: '0.9rem',
                                                                    textAlign: 'center',
                                                                    fontWeight: 'bold'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Guild Summary */}
                                                    <div>
                                                        <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', display: 'block', marginBottom: '8px' }}>GUILD SUMMARY</label>
                                                        <textarea
                                                            value={editGuildSummary}
                                                            onChange={(e) => setEditGuildSummary(e.target.value)}
                                                            placeholder="Write a short description..."
                                                            rows={2}
                                                            style={{
                                                                width: '100%',
                                                                background: 'rgba(255,255,255,0.03)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '12px',
                                                                padding: '10px 15px',
                                                                color: '#fff',
                                                                fontSize: '0.85rem',
                                                                resize: 'none'
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Appearance Switcher */}
                                                    <div>
                                                        <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', display: 'block', marginBottom: '8px' }}>GUILD EMBLEM & COLORS</label>
                                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '15px', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

                                                            {/* Left: Preview & Colors */}
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: isMobile ? '100%' : '140px', alignItems: 'center' }}>
                                                                {/* Preview */}
                                                                <div style={{
                                                                    width: '64px',
                                                                    height: '64px',
                                                                    background: editBgColor,
                                                                    borderRadius: '16px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                                                                    border: '2px solid rgba(255,255,255,0.1)'
                                                                }}>
                                                                    {(() => {
                                                                        const IconComp = ICONS[editIcon] || Shield;
                                                                        return <IconComp size={32} color={editIconColor} />;
                                                                    })()}
                                                                </div>

                                                                {/* Colors */}
                                                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                    <div>
                                                                        <label style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', display: 'block', textAlign: 'center' }}>ICON COLOR</label>
                                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                                            {ICON_COLORS.map((c, idx) => (
                                                                                <div key={`${c}-${idx}`} onClick={() => setEditIconColor(c)} style={{ width: '16px', height: '16px', borderRadius: '50%', background: c, cursor: 'pointer', border: editIconColor === c ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)' }} />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', display: 'block', textAlign: 'center' }}>BG COLOR</label>
                                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                                            {BG_COLORS.map((c, idx) => (
                                                                                <div key={`${c}-${idx}`} onClick={() => setEditBgColor(c)} style={{ width: '16px', height: '16px', borderRadius: '50%', background: c, cursor: 'pointer', border: editBgColor === c ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)' }} />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Right: Icon Selectors Grid */}
                                                            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                                                                {Object.keys(ICONS).map(iconName => {
                                                                    const IconOption = ICONS[iconName];
                                                                    return (
                                                                        <button
                                                                            key={iconName}
                                                                            onClick={() => setEditIcon(iconName)}
                                                                            style={{
                                                                                padding: '8px',
                                                                                background: editIcon === iconName ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.03)',
                                                                                border: editIcon === iconName ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                                                                                borderRadius: '8px',
                                                                                cursor: 'pointer',
                                                                                color: editIcon === iconName ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                                                                                transition: 'all 0.2s',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }}
                                                                        >
                                                                            <IconOption size={18} />
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Country Selector for Edit */}
                                                    <div style={{ position: 'relative' }}>
                                                        <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', display: 'block', marginBottom: '8px' }}>GUILD REGION</label>
                                                        <button
                                                            onClick={() => setShowEditCountryPicker(!showEditCountryPicker)}
                                                            style={{
                                                                width: '100%',
                                                                background: 'rgba(255,255,255,0.03)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '12px',
                                                                padding: '12px 15px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '12px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <CountryFlag code={editCountry?.code} name={editCountry?.name} size="1.2rem" />
                                                            <span style={{ color: '#fff', fontSize: '0.9rem' }}>{editCountry?.name || 'Select Region'}</span>
                                                            <div style={{ marginLeft: 'auto', opacity: 0.3 }}><Users size={14} /></div>
                                                        </button>

                                                        <AnimatePresence>
                                                            {showEditCountryPicker && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        bottom: '100%',
                                                                        left: 0,
                                                                        right: 0,
                                                                        marginBottom: '10px',
                                                                        background: '#111',
                                                                        border: '1px solid var(--accent)',
                                                                        borderRadius: '16px',
                                                                        padding: '15px',
                                                                        zIndex: 100,
                                                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                                                        maxHeight: '300px',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '10px'
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Search region..."
                                                                        value={editCountrySearch}
                                                                        onChange={(e) => setEditCountrySearch(e.target.value)}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '10px',
                                                                            background: '#0a0a0a',
                                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                                            borderRadius: '8px',
                                                                            color: '#fff',
                                                                            fontSize: '0.8rem',
                                                                            outline: 'none'
                                                                        }}
                                                                        autoFocus
                                                                    />
                                                                    <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
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
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>

                                                <button
                                                    disabled={editPending || !hasEnoughOrbs || editGuildName.trim().length < 3 || editGuildTag.length < 2}
                                                    onClick={() => {
                                                        setEditPending(true);
                                                        socket?.emit('update_guild_customization', {
                                                            name: editGuildName,
                                                            tag: editGuildTag,
                                                            icon: editIcon,
                                                            iconColor: editIconColor,
                                                            bgColor: editBgColor,
                                                            summary: editGuildSummary,
                                                            countryCode: editCountry?.code || null
                                                        });
                                                        setTimeout(() => {
                                                            setEditPending(false);
                                                            setShowEditCustomization(false);
                                                        }, 1500);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '16px',
                                                        background: (!hasEnoughOrbs || editGuildName.trim().length < 3) ? '#444' : 'var(--accent)',
                                                        border: 'none',
                                                        borderRadius: '16px',
                                                        color: (!hasEnoughOrbs || editGuildName.trim().length < 3) ? '#888' : '#000',
                                                        fontWeight: '900',
                                                        cursor: (editPending || !hasEnoughOrbs || editGuildName.trim().length < 3) ? 'not-allowed' : 'pointer',
                                                        marginTop: '10px',
                                                        boxShadow: (!hasEnoughOrbs || editGuildName.trim().length < 3) ? 'none' : '0 8px 16px rgba(212, 175, 55, 0.15)',
                                                        letterSpacing: '0.5px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <span>{editPending ? 'SAVING CHANGES...' : 'SAVE CHANGES'}</span>
                                                    {orbsCost > 0 && (
                                                        <span style={{ fontSize: '0.7rem', opacity: 0.8, color: !hasEnoughOrbs ? '#ff4d4d' : 'inherit' }}>
                                                            Cost: {formatNumber(orbsCost)} Orbs {(!hasEnoughOrbs) && '(Not enough Orbs)'}
                                                        </span>
                                                    )}
                                                </button>
                                            </>
                                        );
                                    })()}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                {ReactDOM.createPortal(
                    <AnimatePresence>
                        {showRolesModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    position: 'fixed',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(0,0,0,0.85)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1000000,
                                    padding: '20px'
                                }}
                                onClick={() => setShowRolesModal(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        background: '#000',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '24px',
                                        padding: isMobile ? '20px' : '30px',
                                        maxWidth: '500px',
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{
                                                padding: '10px',
                                                background: 'rgba(212, 175, 55, 0.1)',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(212, 175, 55, 0.2)'
                                            }}>
                                                <Users size={20} color="var(--accent)" />
                                            </div>
                                            <div>
                                                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.5px' }}>GUILD ROLES</h3>
                                                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.7rem' }}>Configure hierarchy and permissions</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowRolesModal(false)}
                                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {Object.entries({
                                            LEADER: { name: 'Leader', color: guild.icon_color || '#d4af37', members: 1, limit: 1 },
                                            OFFICER: { name: 'Co-Leader', color: '#c0c0c0', members: 0, limit: 3 },
                                            MEMBER: { name: 'Member', color: '#808080', members: members.filter(m => m.role === 'MEMBER').length, limit: memberLimit },
                                            ...(guild.roles || {})
                                        }).map(([id, baseRole]) => {
                                            const config = (guild.roles || {})[id] || {};
                                            return {
                                                id,
                                                name: config.name || baseRole.name,
                                                color: config.color || baseRole.color,
                                                members: id === 'LEADER' ? 1 : (id === 'OFFICER' ? members.filter(m => m.role === 'OFFICER').length : (id === 'MEMBER' ? members.filter(m => m.role === 'MEMBER').length : members.filter(m => m.role === id).length)),
                                                limit: baseRole.limit || memberLimit,
                                                permissions: config.permissions || []
                                            };
                                        }).map((role) => {
                                            const roleConfig = (guild.roles || {})[role.id] || {};
                                            return {
                                                ...role,
                                                order: roleConfig.order !== undefined ? roleConfig.order : (role.id === 'LEADER' ? -100 : (role.id === 'OFFICER' ? -50 : (role.id === 'MEMBER' ? 0 : 100)))
                                            };
                                        }).sort((a, b) => a.order - b.order).map((role, index, sortedRoles) => (
                                            <div key={role.id} style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                padding: '15px',
                                                borderRadius: '16px',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{
                                                        width: '4px',
                                                        height: '24px',
                                                        borderRadius: '2px',
                                                        background: role.color
                                                    }} />
                                                    <div>
                                                        <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{role.name}</div>
                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>{role.members} / {role.limit} members</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    {playerHasPermission('manage_roles') && role.id !== 'LEADER' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <button
                                                                disabled={index <= 1} // Index 0 is LEADER, can't move others above it, can't move index 1 up
                                                                onClick={() => {
                                                                    const newRoles = { ...(guild.roles || {}) };
                                                                    // Ensure all roles have an order first
                                                                    sortedRoles.forEach((r, i) => {
                                                                        if (!newRoles[r.id] && r.id !== 'LEADER') {
                                                                            newRoles[r.id] = { name: r.name, color: r.color, permissions: r.permissions || [] };
                                                                        }
                                                                        if (newRoles[r.id]) newRoles[r.id].order = i;
                                                                    });
                                                                    // Swap
                                                                    const prevRole = sortedRoles[index - 1];
                                                                    newRoles[role.id].order = index - 1;
                                                                    newRoles[prevRole.id].order = index;
                                                                    socket?.emit('reorder_guild_roles', { roles: newRoles });
                                                                }}
                                                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', padding: '2px', borderRadius: '4px', cursor: index <= 1 ? 'not-allowed' : 'pointer', opacity: index <= 1 ? 0.3 : 1 }}
                                                            >
                                                                <ArrowUp size={12} />
                                                            </button>
                                                            <button
                                                                disabled={index === sortedRoles.length - 1}
                                                                onClick={() => {
                                                                    const newRoles = { ...(guild.roles || {}) };
                                                                    sortedRoles.forEach((r, i) => {
                                                                        if (!newRoles[r.id] && r.id !== 'LEADER') {
                                                                            newRoles[r.id] = { name: r.name, color: r.color, permissions: r.permissions || [] };
                                                                        }
                                                                        if (newRoles[r.id]) newRoles[r.id].order = i;
                                                                    });
                                                                    // Swap
                                                                    const nextRole = sortedRoles[index + 1];
                                                                    newRoles[role.id].order = index + 1;
                                                                    newRoles[nextRole.id].order = index;
                                                                    socket?.emit('reorder_guild_roles', { roles: newRoles });
                                                                }}
                                                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', padding: '2px', borderRadius: '4px', cursor: index === sortedRoles.length - 1 ? 'not-allowed' : 'pointer', opacity: index === sortedRoles.length - 1 ? 0.3 : 1 }}
                                                            >
                                                                <ArrowDown size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    {playerHasPermission('manage_roles') && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingRoleId(role.id);
                                                                setEditRoleName(role.name);
                                                                setEditRoleColor(role.color);
                                                                setEditRolePerms(role.permissions);
                                                                setShowEditRoleModal(true);
                                                            }}
                                                            style={{
                                                                background: 'rgba(255,255,255,0.05)',
                                                                border: 'none',
                                                                color: 'rgba(255,255,255,0.5)',
                                                                padding: '6px',
                                                                borderRadius: '8px', cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Settings size={14} />
                                                        </button>
                                                    )}
                                                    {playerHasPermission('manage_roles') && !['LEADER', 'OFFICER', 'MEMBER'].includes(role.id) && (
                                                        <button
                                                            onClick={() => setDeleteRoleConfirm({ id: role.id, name: role.name })}
                                                            style={{
                                                                background: 'rgba(255, 68, 68, 0.1)',
                                                                border: '1px solid rgba(255, 68, 68, 0.2)',
                                                                color: '#ff4444',
                                                                padding: '5px',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                            title="Delete Role"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Delete Role Confirmation Modal */}
                                    {deleteRoleConfirm && ReactDOM.createPortal(
                                        <AnimatePresence>
                                            {deleteRoleConfirm && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setDeleteRoleConfirm(null)}
                                                    style={{
                                                        position: 'fixed',
                                                        top: 0, left: 0, right: 0, bottom: 0,
                                                        background: 'rgba(0,0,0,0.7)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        zIndex: 9999
                                                    }}
                                                >
                                                    <motion.div
                                                        initial={{ scale: 0.9, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.9, opacity: 0 }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            background: '#1a1a1a',
                                                            borderRadius: '16px',
                                                            border: '1px solid rgba(255, 68, 68, 0.2)',
                                                            padding: '24px',
                                                            maxWidth: '320px',
                                                            width: '90%',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        <Trash2 size={32} color="#ff4444" style={{ marginBottom: '12px' }} />
                                                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>Delete "{deleteRoleConfirm.name}"?</div>
                                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginBottom: '20px' }}>Members with this role will be demoted to Member.</div>
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => setDeleteRoleConfirm(null)}
                                                                style={{
                                                                    flex: 1, padding: '10px',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    borderRadius: '10px',
                                                                    color: 'rgba(255,255,255,0.6)',
                                                                    fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer'
                                                                }}
                                                            >Cancel</motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => {
                                                                    socket?.emit('delete_guild_role', { roleId: deleteRoleConfirm.id });
                                                                    setDeleteRoleConfirm(null);
                                                                }}
                                                                style={{
                                                                    flex: 1, padding: '10px',
                                                                    background: 'rgba(255, 68, 68, 0.2)',
                                                                    border: '1px solid rgba(255, 68, 68, 0.4)',
                                                                    borderRadius: '10px',
                                                                    color: '#ff4444',
                                                                    fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer'
                                                                }}
                                                            >Delete</motion.button>
                                                        </div>
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>, document.body)}

                                    <button
                                        onClick={() => setShowCreateRoleModal(true)}
                                        style={{
                                            width: '100%',
                                            padding: '15px',
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            border: '1px solid rgba(212, 175, 55, 0.2)',
                                            borderRadius: '12px',
                                            color: 'var(--accent)',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            marginTop: '10px'
                                        }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </motion.div>

                                <AnimatePresence>
                                    {showCreateRoleModal && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            style={{
                                                position: 'fixed',
                                                inset: isMobile ? '10px' : '40px',
                                                background: '#0a0a0c',
                                                borderRadius: '20px',
                                                border: '2px solid var(--accent)',
                                                padding: '20px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '20px',
                                                zIndex: 10002,
                                                boxShadow: '0 0 50px rgba(0,0,0,0.9)'
                                            }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>Create Role</h4>
                                                <button onClick={() => setShowCreateRoleModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', display: 'block', marginBottom: '8px' }}>ROLE NAME</label>
                                                <input
                                                    type="text"
                                                    value={newRoleName}
                                                    onChange={(e) => setNewRoleName(e.target.value)}
                                                    placeholder="Enter role name..."
                                                    style={{
                                                        width: '100%',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        color: '#fff',
                                                        fontSize: '0.8rem'
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', display: 'block', marginBottom: '8px' }}>ROLE COLOR</label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {['#ffd700', '#c0c0c0', '#cd7f32', '#ff4444', '#44aaff', '#44ff44'].map(color => (
                                                        <div
                                                            key={color}
                                                            onClick={() => setNewRoleColor(color)}
                                                            style={{
                                                                width: '30px',
                                                                height: '30px',
                                                                borderRadius: '50%',
                                                                background: color,
                                                                border: newRoleColor === color ? '2px solid #fff' : 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    if (newRoleName.trim()) {
                                                        const roleId = `ROLE_${Date.now()}`;
                                                        socket?.emit('update_guild_role', {
                                                            roleId,
                                                            name: newRoleName,
                                                            color: newRoleColor,
                                                            permissions: []
                                                        });
                                                        setNewRoleName('');
                                                        setShowCreateRoleModal(false);
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: 'var(--accent)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    color: '#000',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    marginTop: 'auto'
                                                }}
                                            >
                                                CREATE
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {showEditRoleModal && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            style={{
                                                position: 'absolute',
                                                inset: '20px',
                                                background: '#0a0a0c',
                                                borderRadius: '20px',
                                                border: '2px solid var(--accent)',
                                                padding: '24px',
                                                display: 'flex', flexDirection: 'column', gap: '20px',
                                                zIndex: 20,
                                                overflowY: 'auto'
                                            }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Edit Rank: {editingRoleId}</h4>
                                                <button onClick={() => setShowEditRoleModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', display: 'block', marginBottom: '8px' }}>RANK NAME</label>
                                                    <input
                                                        type="text"
                                                        value={editRoleName}
                                                        onChange={(e) => setEditRoleName(e.target.value)}
                                                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', color: '#fff', fontSize: '0.8rem' }}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', display: 'block', marginBottom: '8px' }}>RANK COLOR</label>
                                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                        {['#ffd700', '#c0c0c0', '#cd7f32', '#ff4444', '#44aaff', '#44ff44', '#9c27b0', '#e91e63'].map(color => (
                                                            <div key={color} onClick={() => setEditRoleColor(color)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, border: editRoleColor === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)', cursor: 'pointer', transition: '0.2s' }} />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '900', display: 'block', marginBottom: '12px' }}>RANK PERMISSIONS</label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {GUILD_PERMISSIONS.map(perm => (
                                                            <div key={perm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>{perm.label}</div>
                                                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem' }}>{perm.desc}</div>
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editRolePerms.includes(perm.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setEditRolePerms([...editRolePerms, perm.id]);
                                                                        else setEditRolePerms(editRolePerms.filter(p => p !== perm.id));
                                                                    }}
                                                                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    socket?.emit('update_guild_role', {
                                                        roleId: editingRoleId,
                                                        name: editRoleName,
                                                        color: editRoleColor,
                                                        permissions: editRolePerms
                                                    });
                                                    setShowEditRoleModal(false);
                                                }}
                                                style={{ width: '100%', padding: '15px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', marginTop: 'auto', boxShadow: '0 5px 15px rgba(212,175,55,0.2)', fontSize: '0.8rem', letterSpacing: '1px' }}
                                            >
                                                SAVE CHANGES
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>

            {/* Kick Member Confirmation Modal */}
            {
                kickConfirm && ReactDOM.createPortal(
                    <AnimatePresence>
                        {kickConfirm && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setKickConfirm(null)}
                                style={{
                                    position: 'fixed',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(0,0,0,0.7)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 9999
                                }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        background: '#1a1a1a',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255, 68, 68, 0.2)',
                                        padding: '24px',
                                        maxWidth: '320px',
                                        width: '90%',
                                        textAlign: 'center'
                                    }}
                                >
                                    <LogOut size={32} color="#ff4444" style={{ marginBottom: '12px' }} />
                                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>Kick "{kickConfirm.name}"?</div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginBottom: '20px' }}>This member will be removed from the guild.</div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setKickConfirm(null)}
                                            style={{
                                                flex: 1, padding: '10px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '10px',
                                                color: 'rgba(255,255,255,0.6)',
                                                fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer'
                                            }}
                                        >Cancel</motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                socket?.emit('kick_guild_member', { memberId: kickConfirm.id });
                                                setKickConfirm(null);
                                            }}
                                            style={{
                                                flex: 1, padding: '10px',
                                                background: 'rgba(255, 68, 68, 0.2)',
                                                border: '1px solid rgba(255, 68, 68, 0.4)',
                                                borderRadius: '10px',
                                                color: '#ff4444',
                                                fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer'
                                            }}
                                        >Kick</motion.button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>, document.body)
            }

            {/* Donation Modal */}
            {
                showDonateModal && ReactDOM.createPortal(
                    <AnimatePresence>
                        {showDonateModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowDonateModal(false)}
                                style={{
                                    position: 'fixed',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(0,0,0,0.85)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 9999,
                                    backdropFilter: 'blur(8px)'
                                }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        background: '#141417',
                                        borderRadius: '24px',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        padding: '24px',
                                        maxWidth: '450px',
                                        width: '95%',
                                        position: 'relative',
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>GUILD DONATION</h3>
                                        <button
                                            onClick={() => setShowDonateModal(false)}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '50%', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Silver Donation */}
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Donate Silver</div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div style={{ position: 'relative', flex: 1 }}>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={donationSilver}
                                                        onChange={(e) => setDonationSilver(e.target.value)}
                                                        style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none' }}
                                                    />
                                                    <Coins size={18} color="#ffd700" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                                </div>
                                                <button
                                                    onClick={() => setDonationSilver(gameState?.state?.silver?.toString() || '0')}
                                                    style={{ padding: '0 15px', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px', color: 'var(--accent)', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer' }}
                                                >MAX</button>
                                            </div>
                                        </div>

                                        {/* Item Donation */}
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Donate Raw Items</div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px', marginBottom: '15px' }}>
                                                {(() => {
                                                    const needs = calculateMaterialNeeds(guild);
                                                    return Object.entries(gameState?.state?.inventory || {})
                                                        .map(([id, val]) => {
                                                            const cleanId = id.split('::')[0].toUpperCase();
                                                            const amount = (typeof val === 'object' && val !== null) ? (val.amount || 0) : (val || 0);
                                                            const isRaw = /^(T[0-9]+)_(WOOD|ORE|HIDE|FIBER|FISH|HERB)$/i.test(cleanId);

                                                            const neededAmount = Math.floor(Number(needs[cleanId] || 0));
                                                            const bankedAmount = Math.floor(Number(guild.bank_items?.[cleanId] || 0));
                                                            const shouldShow = neededAmount > bankedAmount;

                                                            return { id, cleanId, amount, isRaw, neededAmount, bankedAmount, shouldShow };
                                                        })
                                                        .filter(item => item.isRaw && item.amount > 0 && item.shouldShow)
                                                        .map(({ id, amount, cleanId, neededAmount, bankedAmount }) => {
                                                            const isSelected = selectedDonationItem?.id === id;
                                                            const remainingNeed = Math.max(0, neededAmount - bankedAmount);
                                                            const effectiveMax = Math.min(amount, remainingNeed);

                                                            return (
                                                                <div
                                                                    key={id}
                                                                    onClick={() => {
                                                                        setSelectedDonationItem({ id, max: effectiveMax, inventoryAmount: amount, remainingNeed });
                                                                        setDonationItemAmount(effectiveMax.toString());
                                                                    }}
                                                                    style={{ cursor: 'pointer', position: 'relative' }}
                                                                >
                                                                    <div style={{
                                                                        width: '50px',
                                                                        height: '50px',
                                                                        background: isSelected ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0,0,0,0.5)',
                                                                        borderRadius: '8px',
                                                                        border: isSelected ? '2px solid var(--accent)' : `1px solid ${cleanId.startsWith('T1_') ? '#a0aec0' :
                                                                            cleanId.startsWith('T2_') ? '#48bb78' :
                                                                                cleanId.startsWith('T3_') ? '#4299e1' :
                                                                                    cleanId.startsWith('T4_') ? '#9f7aea' :
                                                                                        cleanId.startsWith('T5_') ? '#ed8936' :
                                                                                            cleanId.startsWith('T6_') ? '#f56565' : 'rgba(255,255,255,0.2)'
                                                                            }`,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        position: 'relative',
                                                                        boxShadow: isSelected ? '0 0 10px rgba(212, 175, 55, 0.5)' : 'none',
                                                                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                                                        transition: 'all 0.1s ease',
                                                                        overflow: 'hidden'
                                                                    }}>
                                                                        <img src={`/items/${cleanId}.webp`} style={{ width: '32px', height: '32px' }} alt={cleanId} />
                                                                        <div style={{
                                                                            position: 'absolute',
                                                                            bottom: '-1px',
                                                                            right: '-1px',
                                                                            background: 'rgba(0,0,0,0.8)',
                                                                            padding: '1px 4px',
                                                                            borderRadius: '4px 0 0 0',
                                                                            fontSize: '0.6rem',
                                                                            fontWeight: 'bold',
                                                                            color: '#fff',
                                                                            borderTop: '1px solid rgba(255,255,255,0.2)',
                                                                            borderLeft: '1px solid rgba(255,255,255,0.2)'
                                                                        }}>
                                                                            {amount >= 1e6 ? (amount / 1e6).toFixed(1) + 'M' : amount >= 1000 ? (amount / 1000).toFixed(1) + 'K' : amount}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: '0.55rem',
                                                                        color: isSelected ? 'var(--accent)' : 'var(--text-dim)',
                                                                        marginTop: '4px',
                                                                        textAlign: 'center',
                                                                        maxWidth: '56px',
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis'
                                                                    }}>
                                                                        {cleanId.replace('_', ' ')}
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                })()}
                                            </div>

                                            {selectedDonationItem && (
                                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    <div style={{ flex: 1, position: 'relative' }}>
                                                        <input
                                                            type="number"
                                                            placeholder="Qty"
                                                            value={donationItemAmount}
                                                            onChange={(e) => {
                                                                let val = parseInt(e.target.value);
                                                                if (isNaN(val)) {
                                                                    setDonationItemAmount('');
                                                                    return;
                                                                }
                                                                if (val < 0) val = 0;
                                                                if (val > selectedDonationItem.max) val = selectedDonationItem.max;
                                                                setDonationItemAmount(val.toString());
                                                            }}
                                                            style={{ width: '100%', padding: '10px 10px 10px 35px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                                                        />
                                                        <img src={`/items/${selectedDonationItem.id.split('::')[0]}.webp`} style={{ width: '16px', height: '16px', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                                                    </div>
                                                    <button
                                                        onClick={() => setDonationItemAmount(selectedDonationItem.max.toString())}
                                                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                    >MAX</button>
                                                </motion.div>
                                            )}
                                        </div>

                                        <motion.button
                                            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={donationPending || (!donationSilver && (!selectedDonationItem || !donationItemAmount))}
                                            onClick={() => {
                                                const silverAmount = parseInt(donationSilver);
                                                const itemAmount = parseInt(donationItemAmount);

                                                setDonationPending(true);

                                                if (!isNaN(silverAmount) && silverAmount > 0) {
                                                    socket?.emit('donate_to_guild_bank', { silver: silverAmount });
                                                }

                                                if (selectedDonationItem && !isNaN(itemAmount) && itemAmount > 0) {
                                                    socket?.emit('donate_to_guild_bank', {
                                                        items: { [selectedDonationItem.id]: itemAmount }
                                                    });
                                                }

                                                setDonationSilver('');
                                                setDonationItemAmount('');
                                                setSelectedDonationItem(null);
                                                setTimeout(() => {
                                                    setDonationPending(false);
                                                    setShowDonateModal(false);
                                                }, 1000);
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '16px',
                                                background: 'var(--accent)',
                                                border: 'none',
                                                borderRadius: '16px',
                                                color: '#000',
                                                fontWeight: '900',
                                                fontSize: '0.9rem',
                                                cursor: donationPending ? 'not-allowed' : 'pointer',
                                                opacity: donationPending || (!donationSilver && (!selectedDonationItem || !donationItemAmount)) ? 0.4 : 1,
                                                marginTop: '10px'
                                            }}
                                        >
                                            {donationPending ? 'SENDING...' : 'CONFIRM DONATION'}
                                        </motion.button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>, document.body)
            }

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
    const [isApplying, setIsApplying] = useState(false);

    // Calculate player's total level
    const playerLevel = useMemo(() => {
        const skills = gameState?.state?.skills || {};
        return Object.values(skills).reduce((sum, s) => sum + (s?.level || 1), 0);
    }, [gameState?.state?.skills]);
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
                        <GuildDashboard guild={gameState.guild} socket={socket} isMobile={isMobile} onInspect={onInspect} gameState={gameState} />
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
                                                                    whileHover={!(isApplying || playerLevel < g.min_level) ? { scale: 1.05 } : {}}
                                                                    whileTap={!(isApplying || playerLevel < g.min_level) ? { scale: 0.95 } : {}}
                                                                    disabled={isApplying || playerLevel < g.min_level}
                                                                    onClick={() => {
                                                                        if (isApplying || playerLevel < g.min_level) return;
                                                                        setIsApplying(true);
                                                                        socket?.emit('apply_to_guild', { guildId: g.id });
                                                                        // Optimistic UI updates
                                                                        setSearchResults(prev => prev.map(searchGuild => searchGuild.id === g.id ? { ...searchGuild, my_request_pending: true } : searchGuild));

                                                                        // Reset isApplying after a short delay or when search results return
                                                                        setTimeout(() => setIsApplying(false), 2000);
                                                                    }}
                                                                    style={{
                                                                        padding: '6px 16px',
                                                                        background: playerLevel < g.min_level ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
                                                                        border: playerLevel < g.min_level ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                                                        borderRadius: '8px',
                                                                        color: playerLevel < g.min_level ? 'rgba(255,255,255,0.2)' : '#000',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: '900',
                                                                        cursor: (isApplying || playerLevel < g.min_level) ? 'not-allowed' : 'pointer',
                                                                        transition: '0.2s'
                                                                    }}
                                                                >
                                                                    {playerLevel < g.min_level ? `REQ. LVL ${g.min_level}` : (g.join_mode === 'OPEN' ? 'JOIN' : 'APPLY')}
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
                                                            LVL 1 • MIN LVL 1 {guildSummary ? `\u2022 ${guildSummary}` : '\u2022 Stronger Together'}
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
                                                            {ICON_COLORS.map((color, idx) => (
                                                                <motion.button
                                                                    key={`${color}-${idx}`}
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
                                                            {BG_COLORS.map((color, idx) => (
                                                                <motion.button
                                                                    key={`${color}-${idx}`}
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
