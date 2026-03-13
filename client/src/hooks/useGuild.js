import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useGuild(socket, activeTab, playerHasPermission, gameState) {
    const store = useAppStore();
    const {
        guildSearchResults: searchResults, setGuildSearchResults: setSearchResults,
        isSearchingGuilds: isSearching, setIsSearchingGuilds: setIsSearching,
        guildRequests: requests, setGuildRequests: setRequests,
        isLoadingGuildRequests: isLoadingRequests, setIsLoadingGuildRequests: setIsLoadingRequests,
        guildTasks, setGuildTasks,
        isLoadingGuildTasks: isLoadingTasks, setIsLoadingGuildTasks: setIsLoadingTasks,
        guildStatusMessage: statusMessage, setGuildStatusMessage: setStatusMessage,
        guildTimeUntilReset: timeUntilReset, setGuildTimeUntilReset: setTimeUntilReset,
        isSubmittingGuild: isSubmitting, setIsSubmittingGuild: setIsSubmitting,
        isApplyingToGuild: isApplying, setIsApplyingToGuild: setIsApplying,
        isUpdatingGuild: isUpdating, setIsUpdatingGuild: setIsUpdating,
        isDonatingToGuild: donationPending, setIsDonatingToGuild: setDonationPending,
        isContributingToTask: taskPending, setIsContributingToTask: setTaskPending,
    } = store;

    const [expandedTasks, setExpandedTasks] = useState(new Set());

    // Donation states
    const [donationSilver, setDonationSilver] = useState('');
    const [selectedDonationItem, setSelectedDonationItem] = useState(null);
    const [donationItemAmount, setDonationItemAmount] = useState('');

    // Timer for task reset (moved to store logic if desired, but here is fine for now if it's UI only)
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
    }, [setTimeUntilReset]);

    // Socket listeners are now centralized in useSocketEvents.js

    // Request logic (Aba REQUESTS)
    useEffect(() => {
        if (!socket) return;

        if (playerHasPermission && playerHasPermission('manage_requests')) {
            if (activeTab === 'REQUESTS') setIsLoadingRequests(true);
            socket.emit('get_guild_requests');
        }
    }, [socket, activeTab, playerHasPermission, setIsLoadingRequests]);

    // Tasks logic
    useEffect(() => {
        if (activeTab === 'TASKS') {
            setIsLoadingTasks(true);
            socket?.emit('get_guild_tasks');
        }
    }, [socket, activeTab, setIsLoadingTasks]);

    const searchGuilds = useCallback((query, countryCode) => {
        if (!socket) return;
        setIsSearching(true);
        socket.emit('search_guilds', { query, countryCode });
    }, [socket]);

    const createGuild = useCallback((data) => {
        if (!socket) return;
        setIsSubmitting(true);
        socket.emit('create_guild', data);
    }, [socket]);

    const applyToGuild = useCallback((guildId) => {
        if (!socket) return;
        setIsApplying(true);
        socket.emit('apply_to_guild', { guildId });
        // Optimistic UI update
        setSearchResults(prev => prev.map(g => g.id === guildId ? { ...g, my_request_pending: true } : g));
    }, [socket]);

    const updateCustomization = useCallback((data) => {
        if (!socket) return;
        setIsUpdating(true);
        socket.emit('update_guild_customization', data);
    }, [socket]);

    const donateToGuild = useCallback(({ silver, items }) => {
        if (!socket) return;
        setDonationPending(true);
        socket.emit('donate_to_guild_bank', { silver: Number(silver || 0), items: items || {} });
    }, [socket]);

    const updateGuildSettings = useCallback((settings) => {
        if (!socket) return;
        setIsUpdating(true);
        socket.emit('update_guild_settings', settings);
    }, [socket, setIsUpdating]);

    const createRole = useCallback((name, color) => {
        if (!socket) return;
        socket.emit('create_guild_role', { name, color });
    }, [socket]);

    const updateRole = useCallback((roleId, data) => {
        if (!socket) return;
        socket.emit('update_guild_role', { roleId, ...data });
    }, [socket]);

    const deleteRole = useCallback((roleId) => {
        if (!socket) return;
        socket.emit('delete_guild_role', { roleId });
    }, [socket]);

    const reorderRoles = useCallback((roles) => {
        if (!socket) return;
        socket.emit('reorder_guild_roles', { roles });
    }, [socket]);

    const changeMemberRole = useCallback((memberId, newRole) => {
        if (!socket) return;
        socket.emit('change_member_role', { memberId, newRole });
    }, [socket]);

    const kickMember = useCallback((memberId) => {
        if (!socket) return;
        socket.emit('kick_guild_member', { memberId });
    }, [socket]);

    const handleRequest = useCallback((requestId, action) => {
        if (!socket) return;
        socket.emit('handle_guild_request', { requestId, action });
    }, [socket]);

    const contributeToTask = useCallback((taskId, amount) => {
        if (!socket) return;
        setTaskPending(true);
        socket.emit('contribute_to_guild_task', { taskId, amount: Number(amount) });
    }, [socket]);

    const leaveGuild = useCallback(() => {
        if (!socket) return;
        setIsUpdating(true);
        socket.emit('leave_guild');
    }, [socket, setIsUpdating]);

    const disbandGuild = useCallback(() => {
        if (!socket) return;
        setIsUpdating(true);
        socket.emit('disband_guild');
    }, [socket, setIsUpdating]);

    const toggleTaskExpanded = useCallback((taskId) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    }, []);

    return {
        // Shared
        statusMessage,
        setStatusMessage,
        // Search & Create
        searchResults,
        isSearching,
        isSubmitting,
        isApplying,
        isUpdating,
        searchGuilds,
        createGuild,
        applyToGuild,
        updateCustomization,
        donateToGuild,
        updateGuildSettings,
        settingsPending: isUpdating,
        // Roles
        createRole,
        updateRole,
        deleteRole,
        reorderRoles,
        changeMemberRole,
        kickMember,
        // Requests
        requests,
        isLoadingRequests,
        handleRequest,
        // Tasks
        guildTasks,
        isLoadingTasks,
        taskPending,
        expandedTasks,
        toggleTaskExpanded,
        timeUntilReset,
        contributeToTask,
        leaveGuild,
        disbandGuild,
        // Donation
        donationSilver, setDonationSilver,
        selectedDonationItem, setSelectedDonationItem,
        donationItemAmount, setDonationItemAmount,
        donationPending
    };
}
