import { useState, useEffect, useCallback } from 'react';

export function useGuild(socket, activeTab, playerHasPermission, gameState) {
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [requests, setRequests] = useState([]);
    const [guildTasks, setGuildTasks] = useState([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [taskPending, setTaskPending] = useState(false);
    const [timeUntilReset, setTimeUntilReset] = useState("");

    // Search & Create states
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [isApplying, setIsApplying] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [settingsPending, setSettingsPending] = useState(false);
    const [expandedTasks, setExpandedTasks] = useState(new Set());

    // Donation states
    const [donationSilver, setDonationSilver] = useState('');
    const [selectedDonationItem, setSelectedDonationItem] = useState(null);
    const [donationItemAmount, setDonationItemAmount] = useState('');
    const [donationPending, setDonationPending] = useState(false);

    // Timer for task reset
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

    // Socket listeners for Search, Create, Applications, and Updates
    useEffect(() => {
        if (!socket) return;

        const handleSearchResults = (results) => {
            setSearchResults(results || []);
            setIsSearching(false);
        };

        const handleGuildCreated = (result) => {
            setIsSubmitting(false);
            if (result.success) {
                setStatusMessage({ type: 'success', text: 'Guild created successfully!' });
            } else {
                setStatusMessage({ type: 'error', text: result.message || 'Failed to create guild.' });
            }
        };

        const handleApplicationSent = (result) => {
            setIsApplying(false);
            if (result.success) {
                setStatusMessage({ type: 'success', text: 'Application sent successfully!' });
            } else {
                setStatusMessage({ type: result.type || 'error', text: result.message || 'Failed to send application.' });
            }
        };

        const handleCustomizationUpdated = (result) => {
            setIsUpdating(false);
            if (result.success) {
                setStatusMessage({ type: 'success', text: 'Guild updated successfully!' });
            } else {
                setStatusMessage({ type: 'error', text: result.message || 'Failed to update guild.' });
            }
        };

        const handleDonationResult = (result) => {
            setDonationPending(false);
            if (result.success) {
                setStatusMessage({ type: 'success', text: result.message || 'Donation successful!' });
                // Clear donation inputs on success
                setDonationSilver('');
                setSelectedDonationItem(null);
                setDonationItemAmount('');
            } else {
                setStatusMessage({ type: 'error', text: result.message || 'Donation failed.' });
            }
        };

        const handleSettingsUpdated = (result) => {
            setSettingsPending(false);
            if (result.success) {
                setStatusMessage({ type: 'success', text: 'Guild settings updated!' });
            } else {
                setStatusMessage({ type: 'error', text: result.message || 'Failed to update settings.' });
            }
        };

        socket.on('guild_search_results', handleSearchResults);
        socket.on('guild_created', handleGuildCreated);
        socket.on('guild_application_sent', handleApplicationSent);
        socket.on('guild_customization_updated', handleCustomizationUpdated);
        socket.on('guild_donation_result', handleDonationResult);
        socket.on('guild_settings_updated', handleSettingsUpdated);

        return () => {
            socket.off('guild_search_results', handleSearchResults);
            socket.off('guild_created', handleGuildCreated);
            socket.off('guild_application_sent', handleApplicationSent);
            socket.off('guild_customization_updated', handleCustomizationUpdated);
            socket.off('guild_donation_result', handleDonationResult);
            socket.off('guild_settings_updated', handleSettingsUpdated);
        };
    }, [socket]);

    // Request logic (Aba REQUESTS)
    useEffect(() => {
        if (!socket) return;

        const handleRequestsData = (data) => {
            setRequests(data);
            setIsLoadingRequests(false);
        };

        if (playerHasPermission && playerHasPermission('manage_requests')) {
            if (activeTab === 'REQUESTS') setIsLoadingRequests(true);
            socket.emit('get_guild_requests');
            socket.on('guild_requests_data', handleRequestsData);
        }

        return () => {
            socket.off('guild_requests_data', handleRequestsData);
        };
    }, [socket, activeTab, playerHasPermission]);

    // Tasks logic
    useEffect(() => {
        if (activeTab === 'TASKS') {
            setIsLoadingTasks(true);
            socket?.emit('get_guild_tasks');
        }
    }, [socket, activeTab]);

    useEffect(() => {
        if (!socket) return;
        const handleTasksData = (data) => {
            setGuildTasks(data || []);
            setIsLoadingTasks(false);
            setTaskPending(false);
        };
        const handleContributeResult = (result) => {
            if (result.success) {
                setGuildTasks(result.tasks || []);
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
        setSettingsPending(true);
        socket.emit('update_guild_settings', settings);
    }, [socket]);

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
        settingsPending,
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
        // Donation
        donationSilver, setDonationSilver,
        selectedDonationItem, setSelectedDonationItem,
        donationItemAmount, setDonationItemAmount,
        donationPending
    };
}
