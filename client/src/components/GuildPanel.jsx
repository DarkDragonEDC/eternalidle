import { formatItemId } from '@shared/items';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Shield, Users, Sword, Swords, Trophy, Settings, Plus, Info, Check, X, 
    Coins, Sparkles, Tag, User, Zap, Landmark, ClipboardList, Pickaxe, 
    FlaskConical, Hammer, Lock, Dices, Library, Building2, AlertCircle, CheckCircle2
, PackagePlus} from 'lucide-react';

// Shared / Utils
import { COUNTRIES } from '@shared/countries';
import { GUILD_XP_TABLE, GUILD_BUILDINGS } from '@shared/guilds.js';
import { formatSilver } from '@utils/format';

// Hooks
import { useGuild } from '../hooks/useGuild';

// Sub-components
import { GuildHeader } from './guild/GuildHeader';
import { GuildNavigation } from './guild/GuildNavigation';
import { GuildMembers } from './guild/GuildMembers';
import { GuildTasks } from './guild/GuildTasks';
import { GuildBuildings } from './guild/GuildBuildings';
import { GuildSettings } from './guild/GuildSettings';
import { GuildModals, TaskContributeModal } from './guild/GuildModals';
import { GuildSearch } from './guild/GuildSearch';
import { GuildCreate } from './guild/GuildCreate';
import { GuildRequests } from './guild/GuildRequests';

const ICONS = { Shield, Users, Sword, Swords, Trophy, Settings, Plus, Info, Check, X, Coins, Sparkles, Tag, User, Zap, Landmark, ClipboardList, Pickaxe, FlaskConical, Hammer, Lock, Dices, Library };
const GuildDashboard = ({ guild, socket, isMobile, onInspect, gameState }) => {
    const [activeTab, setActiveTab] = useState('MEMBERS');
    const [showNavDropdown, setShowNavDropdown] = useState(false);
    
    // Member sorting states
    const [membersSortBy, setMembersSortBy] = useState('DEFAULT');
    const [showMembersDropdown, setShowMembersDropdown] = useState(false);
    
    // Building states
    const [selectedBuilding, setSelectedBuilding] = useState('BANK');
    const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
    
    // Modal states
    const [showDonateModal, setShowDonateModal] = useState(false);
    const [kickConfirm, setKickConfirm] = useState(null);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
    const [showEditCustomization, setShowEditCustomization] = useState(false);
    const [showRolesModal, setShowRolesModal] = useState(false);
    const [showTaskContributeModal, setShowTaskContributeModal] = useState(false);
    const [selectedTaskForContribute, setSelectedTaskForContribute] = useState(null);

    // Permissions helper
    const playerHasPermission = useCallback((permission) => {
        if (!guild) return false;
        
        // Leader has ALL permissions - check both role string and leader_id matching
        if (guild.myRole === 'LEADER' || (guild.leader_id && guild.leader_id == guild.myMemberId)) return true;

        // If no specifically defined permissions for the current role, check defaults or custom roles
        const roleConfig = guild.roles?.[guild.myRole];
        if (roleConfig?.permissions?.includes(permission)) return true;

        // Fallback for legacy/default roles if not in roles config
        if (guild.myRole === 'OFFICER') {
            const officerPerms = ['manage_requests', 'kick_members', 'invite_members'];
            return officerPerms.includes(permission);
        }

        return false;
    }, [guild]);

    // Use Custom Hook for Data
    const { 
        requests,
        isLoadingRequests,
        handleRequest,
        guildTasks, 
        isLoadingTasks, 
        timeUntilReset, 
        contributeToTask,
        donateToGuild,
        updateCustomization,
        createRole,
        updateRole,
        deleteRole,
        reorderRoles,
        changeMemberRole,
        kickMember,
        updateGuildSettings,
        settingsPending,
        expandedTasks,
        toggleTaskExpanded,
        isUpdating,
        // Donation states/actions from hook
        donationSilver, setDonationSilver,
        selectedDonationItem, setSelectedDonationItem,
        donationItemAmount, setDonationItemAmount,
        donationPending
    } = useGuild(socket, activeTab, playerHasPermission, gameState);

    // Inventory helper
    const getItemAmount = (itemId) => {
        const item = gameState?.state?.inventory?.[itemId];
        return typeof item === 'object' ? item.amount : (item || 0);
    };

    // Sorted Members
    const sortedMembers = useMemo(() => {
        if (!guild?.members) return [];
        let membersList = [...guild.members];
        
        // Sorting logic
        if (membersSortBy === 'DATE') {
            membersList.sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0));
        } else if (membersSortBy === 'TOTAL_XP') {
            membersList.sort((a, b) => (b.donatedXP || 0) - (a.donatedXP || 0));
        } else if (membersSortBy === 'DAILY_XP') {
            const getDailyXp = (m) => (m.donatedXP || 0) / Math.max(1, Math.floor((new Date() - new Date(m.joinedAt || Date.now())) / (1000 * 60 * 60 * 24)));
            membersList.sort((a, b) => getDailyXp(b) - getDailyXp(a));
        } else if (membersSortBy === 'TOTAL_SILVER') {
            membersList.sort((a, b) => ((b.donatedSilver || 0) + (b.donatedItemsValue || 0)) - ((a.donatedSilver || 0) + (a.donatedItemsValue || 0)));
        } else {
            // Default: Hierarchy (Leader first, then by joined date)
            membersList.sort((a, b) => {
                if (a.role === 'LEADER') return -1;
                if (b.role === 'LEADER') return 1;
                if (a.role === 'OFFICER' && b.role === 'MEMBER') return -1;
                if (a.role === 'MEMBER' && b.role === 'OFFICER') return 1;
                return new Date(a.joinedAt || 0) - new Date(b.joinedAt || 0);
            });
        }
        return membersList;
    }, [guild?.members, membersSortBy]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? '12px' : '20px',
            paddingBottom: '20px',
            '--accent': guild?.icon_color || '#d4af37'
        }}>
            <GuildHeader 
                guild={guild} 
                isMobile={isMobile} 
                playerHasPermission={playerHasPermission}
                ICONS={ICONS}
                onEditCustomization={() => setShowEditCustomization(true)}
            />

            <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '24px',
                padding: '15px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}>
                <GuildNavigation 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    showNavDropdown={showNavDropdown}
                    setShowNavDropdown={setShowNavDropdown}
                    playerHasPermission={playerHasPermission}
                    isMobile={isMobile}
                    timeUntilReset={timeUntilReset}
                    membersSortBy={membersSortBy}
                    setMembersSortBy={setMembersSortBy}
                    showMembersDropdown={showMembersDropdown}
                    setShowMembersDropdown={setShowMembersDropdown}
                    pendingRequestsCount={requests?.length || 0}
                />

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        style={{ flex: 1 }}
                    >
                        {activeTab === 'MEMBERS' && (
                            <GuildMembers 
                                members={sortedMembers}
                                membersSortBy={membersSortBy}
                                isMobile={isMobile}
                                onInspect={onInspect}
                                roles={guild.roles}
                                playerHasPermission={playerHasPermission}
                                onKick={setKickConfirm}
                                onChangeRole={changeMemberRole}
                                currentUser={gameState?.state}
                                guild={guild}
                                onLeave={() => setShowLeaveConfirm(true)}
                            />
                        )}

                        {activeTab === 'TASKS' && (
                            <GuildTasks 
                                guild={guild}
                                tasks={guildTasks}
                                isLoading={isLoadingTasks}
                                onContribute={(task) => {
                                    setSelectedTaskForContribute(task);
                                    setShowTaskContributeModal(true);
                                }}
                                expandedTasks={expandedTasks}
                                toggleTaskExpanded={toggleTaskExpanded}
                                getItemAmount={getItemAmount}
                                timeUntilReset={timeUntilReset}
                                isMobile={isMobile}
                            />
                        )}

                        {activeTab === 'REQUESTS' && (
                            <GuildRequests 
                                requests={requests}
                                isLoading={isLoadingRequests}
                                onHandleRequest={handleRequest}
                                isMobile={isMobile}
                            />
                        )}

                        {activeTab === 'BUILDING' && (
                            <GuildBuildings 
                                guild={guild}
                                selectedBuilding={selectedBuilding}
                                setSelectedBuilding={setSelectedBuilding}
                                showBuildingDropdown={showBuildingDropdown}
                                setShowBuildingDropdown={setShowBuildingDropdown}
                                playerHasPermission={playerHasPermission}
                                isMobile={isMobile}
                                getItemAmount={getItemAmount}
                                socket={socket}
                                setShowDonateModal={setShowDonateModal}
                            />
                        )}

                        {activeTab === 'SETTINGS' && (
                            <GuildSettings 
                                guild={guild}
                                playerHasPermission={playerHasPermission}
                                onLeave={() => setShowLeaveConfirm(true)}
                                onDisband={() => setShowDisbandConfirm(true)}
                                onOpenRoles={() => setShowRolesModal(true)}
                                onShowInfo={() => setShowInfoModal(true)}
                                onEditCustomization={() => setShowEditCustomization(true)}
                                onUpdateSettings={updateGuildSettings}
                                settingsPending={settingsPending}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <GuildModals 
                showDonateModal={showDonateModal} setShowDonateModal={setShowDonateModal}
                kickConfirm={kickConfirm} setKickConfirm={setKickConfirm}
                showLeaveConfirm={showLeaveConfirm} setShowLeaveConfirm={setShowLeaveConfirm}
                showDisbandConfirm={showDisbandConfirm} setShowDisbandConfirm={setShowDisbandConfirm}
                showEditCustomization={showEditCustomization} setShowEditCustomization={setShowEditCustomization}
                onDonate={donateToGuild}
                onKick={() => {}}
                onLeave={() => {}}
                onDisband={() => {}}
                onUpdateCustomization={updateCustomization}
                guild={guild}
                gameState={gameState}
                donationSilver={donationSilver} setDonationSilver={setDonationSilver}
                selectedDonationItem={selectedDonationItem} setSelectedDonationItem={setSelectedDonationItem}
                donationItemAmount={donationItemAmount} setDonationItemAmount={setDonationItemAmount}
                donationPending={donationPending}
                isUpdating={isUpdating}
                ICONS={ICONS}
                playerHasPermission={playerHasPermission}
                // Roles Actions
                showRolesModal={showRolesModal}
                setShowRolesModal={setShowRolesModal}
                onCreateRole={createRole}
                onUpdateRole={updateRole}
                onDeleteRole={deleteRole}
                onReorderRoles={reorderRoles}
                onKick={kickMember}
            />

            <TaskContributeModal 
                isOpen={showTaskContributeModal}
                onClose={() => {
                    setShowTaskContributeModal(false);
                    setSelectedTaskForContribute(null);
                }}
                task={selectedTaskForContribute}
                onContribute={contributeToTask}
                getItemAmount={getItemAmount}
            />

            {!isMobile && (
                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDonateModal(true)}
                    style={{
                        position: 'fixed', bottom: '30px', right: '30px',
                        width: '60px', height: '60px', borderRadius: '50%',
                        background: 'var(--accent)', border: 'none', color: '#000',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}
                >
                    <Plus size={30} />
                </motion.button>
            )}
        </motion.div>
    );
};

const GuildPanel = ({ gameState, socket, isMobile, onInspect }) => {
    const [noGuildTab, setNoGuildTab] = useState('search');
    
    const {
        statusMessage,
        setStatusMessage,
        searchResults,
        isSearching,
        isSubmitting,
        isApplying,
        searchGuilds,
        createGuild,
        applyToGuild
    } = useGuild(socket, noGuildTab, null, gameState);

    const playerLevel = useMemo(() => {
        const skills = gameState?.state?.skills || {};
        return Object.values(skills).reduce((sum, s) => sum + (s?.level || 1), 0);
    }, [gameState?.state?.skills]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="scroll-container" style={{ flex: 1, padding: isMobile ? '2px 5px 5px' : '2px 10px 10px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                    
                    {/* Status Messages */}
                    <AnimatePresence>
                        {statusMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                style={{
                                    marginBottom: '10px',
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    background: statusMessage.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                    border: `1px solid ${statusMessage.type === 'success' ? '#4caf50' : '#f44336'}`,
                                    color: statusMessage.type === 'success' ? '#4caf50' : '#f44336',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    zIndex: 1000
                                }}
                            >
                                {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                {statusMessage.text}
                                <button onClick={() => setStatusMessage(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={14} /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {gameState?.guild ? (
                        <GuildDashboard guild={gameState.guild} socket={socket} isMobile={isMobile} onInspect={onInspect} gameState={gameState} />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => setNoGuildTab('search')}
                                    style={{
                                        flex: 1,
                                        padding: isMobile ? '8px' : '10px',
                                        background: noGuildTab === 'search'
                                            ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)'
                                            : 'linear-gradient(180deg, #222 0%, #111 100%)',
                                        border: `1px solid ${noGuildTab === 'search' ? 'var(--accent)' : 'var(--border)'}`,
                                        borderRadius: '12px',
                                        color: noGuildTab === 'search' ? 'var(--accent)' : 'var(--text-dim)',
                                        fontWeight: '900',
                                        fontSize: '0.7rem',
                                        letterSpacing: '1px',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: noGuildTab === 'search' ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none'
                                    }}
                                >
                                    <Users size={14} /> SEARCH
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => setNoGuildTab('create')}
                                    style={{
                                        flex: 1,
                                        padding: isMobile ? '8px' : '10px',
                                        background: noGuildTab === 'create'
                                            ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)'
                                            : 'linear-gradient(180deg, #222 0%, #111 100%)',
                                        border: `1px solid ${noGuildTab === 'create' ? 'var(--accent)' : 'var(--border)'}`,
                                        borderRadius: '12px',
                                        color: noGuildTab === 'create' ? 'var(--accent)' : 'var(--text-dim)',
                                        fontWeight: '900',
                                        fontSize: '0.7rem',
                                        letterSpacing: '1px',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: noGuildTab === 'create' ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none'
                                    }}
                                >
                                    <Plus size={14} /> CREATE
                                </motion.button>
                            </div>

                            <AnimatePresence mode="wait">
                                {noGuildTab === 'search' ? (
                                    <GuildSearch 
                                        key="search"
                                        searchResults={searchResults}
                                        isSearching={isSearching}
                                        onSearch={searchGuilds}
                                        onApply={applyToGuild}
                                        isApplying={isApplying}
                                        playerLevel={playerLevel}
                                        isMobile={isMobile}
                                        ICONS={ICONS}
                                    />
                                ) : (
                                    <GuildCreate 
                                        key="create"
                                        onCreate={createGuild}
                                        isSubmitting={isSubmitting}
                                        userSilver={gameState?.state?.silver || 0}
                                        userOrbs={gameState?.state?.orbs || 0}
                                        isMobile={isMobile}
                                        ICONS={ICONS}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuildPanel;
