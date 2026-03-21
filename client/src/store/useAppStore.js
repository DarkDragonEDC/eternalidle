import { create } from 'zustand';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useAppStore = create((set, get) => ({
    // --- AUTH STATE ---
    session: null,
    user: null,
    isAuthLoading: true,
    setSession: (session) => set({ session, user: session?.user || null }),
    setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

    // --- CHARACTERS STATE ---
    characters: JSON.parse(localStorage.getItem('cached_characters') || '[]'),
    isCharactersLoading: false,
    fetchCharacters: async (supabase) => {
        const { characters, isCharactersLoading } = get();
        if (isCharactersLoading) return;

        set({ isCharactersLoading: true });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            const token = session.access_token;
            const res = await fetch(`${API_URL}/api/characters`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                set({ characters: data });
                localStorage.setItem('cached_characters', JSON.stringify(data));
            }
        } catch (err) {
            console.error('Error fetching characters:', err);
        } finally {
            set({ isCharactersLoading: false });
        }
    },
    setCharacters: (characters) => {
        set({ characters });
        localStorage.setItem('cached_characters', JSON.stringify(characters));
    },

    // --- SOCKET STATE ---
    socket: null,
    isConnected: false,
    connectSocket: (accessToken, charId, clientVersion) => {
        const { socket, isConnecting } = get();
        if (socket || isConnecting) return;

        set({ isConnecting: true });

        if (socket) socket.disconnect();

        const newSocket = io(API_URL, {
            auth: { token: accessToken },
            transports: ['websocket'],
            reconnectionAttempts: 5
        });

        // --- Critical Initial Sync Listeners ---
        // Attached early to avoid race conditions between connect and useSocketEvents
        newSocket.on('status_update', (status) => get().handleStatusUpdate(status));
        newSocket.on('game_status', (status) => get().handleStatusUpdate(status));

        newSocket.on('connect', () => {
            set({ isConnected: true, isConnecting: false });
            if (charId) {
                newSocket.emit('join_character', { characterId: charId });
            } else {
                console.warn('[SOCKET] No charId provided on connect');
            }
        });

        newSocket.on('server_version', ({ version }) => {
            if (clientVersion && version !== clientVersion) {
                console.error(`[VERSION] Mismatch! Client: ${clientVersion}, Server: ${version}`);
                set({ versionMismatch: true });
            }
        });

        newSocket.on('disconnect', () => {
            set({ isConnected: false });
        });

        newSocket.on('connect_error', (err) => {
            console.error('[SOCKET] Connection error:', err.message);
            set({ isConnecting: false });
            
            // If it's an authentication error, force a logout/re-login
            if (err.message.toLowerCase().includes('auth') || err.message.toLowerCase().includes('token')) {
                console.warn('[SOCKET] Authentication failure detected. Clearing session.');
                const { setSession, setSelectedCharacter, setGameState, isConnected } = get();
                
                // Only clear if we were previously "trying" to be connected or were connected
                setSession(null);
                setSelectedCharacter(null);
                setGameState(null);
                
                if (newSocket) newSocket.disconnect();
            }
        });

        newSocket.on('queue_updated', (result) => {
            if (result.success && result.queue) {
                set((state) => {
                    if (!state.gameState) return state;
                    return {
                        gameState: {
                            ...state.gameState,
                            state: {
                                ...state.gameState.state,
                                actionQueue: result.queue
                            }
                        }
                    };
                });
            }
        });
        
        newSocket.on('name_availability_result', (result) => {
            set({ nameAvailability: result });
        });

        // --- ALTAR LISTENER ---
        newSocket.on('altar_update', (altarState) => {
            set({ altarState: altarState.global ? altarState : { global: altarState } });
        });

        // --- QUEST LISTENERS ---
        newSocket.on('quest_status_update', (data) => {
            set((state) => {
                if (!state.gameState) return state;
                const newQuests = { ...state.gameState.state.quests, ...data };
                return {
                    gameState: {
                        ...state.gameState,
                        state: {
                            ...state.gameState.state,
                            quests: newQuests
                        }
                    }
                };
            });
        });

        newSocket.on('quest_progress', ({ questId, progress }) => {
            set((state) => {
                if (!state.gameState?.state?.quests?.active?.[questId]) return state;
                const active = { ...state.gameState.state.quests.active };
                active[questId] = { ...active[questId], progress };
                return {
                    gameState: {
                        ...state.gameState,
                        state: {
                            ...state.gameState.state,
                            quests: {
                                ...state.gameState.state.quests,
                                active
                            }
                        }
                    }
                };
            });
        });

        newSocket.on('quest_ready_to_claim', ({ questId }) => {
            set((state) => {
                if (!state.gameState?.state?.quests?.active?.[questId]) return state;
                const active = { ...state.gameState.state.quests.active };
                active[questId] = { ...active[questId], completed: true };
                return {
                    gameState: {
                        ...state.gameState,
                        state: {
                            ...state.gameState.state,
                            quests: {
                                ...state.gameState.state.quests,
                                active
                            }
                        }
                    }
                };
            });
        });

        set({ socket: newSocket });
    },
    disconnectSocket: () => {
        const { socket } = get();
        if (socket) socket.disconnect();
        set({ socket: null, isConnected: false });
    },

    gameState: null,
    altarState: null,
    setAltarState: (altarState) => set({ altarState }),
    nameAvailability: null,
    setNameAvailability: (nameAvailability) => set({ nameAvailability }),
    checkNameAvailability: (name) => {
        const { socket } = get();
        if (socket) socket.emit('check_name_availability', { name });
    },
    selectedCharacter: localStorage.getItem('selectedCharacterId'),
    globalStats: { total_market_tax: 0 },
    setGlobalStats: (globalStats) => set({ globalStats }),
    activePlayers: 0,
    setActivePlayers: (activePlayers) => set({ activePlayers }),
    fetchActivePlayers: async () => {
        try {
            const res = await fetch(`${API_URL}/api/active_players`);
            if (res.ok) {
                const data = await res.json();
                set({ activePlayers: data.count || 0 });
            }
        } catch (err) {
            console.warn('Could not fetch active players count');
        }
    },

    // --- QUEST ACTIONS ---
    questInteract: (npcId) => {
        const { socket } = get();
        if (socket) socket.emit('quest_interact', { npcId });
    },
    questAccept: (questId) => {
        const { socket } = get();
        if (socket) socket.emit('quest_accept', { questId });
    },
    questClaim: (questId) => {
        const { socket } = get();
        if (socket) socket.emit('quest_claim', { questId });
    },
    connectionError: null,
    setConnectionError: (connectionError) => set({ connectionError }),
    isConnecting: false,
    setIsConnecting: (isConnecting) => set({ isConnecting }),
    setGameState: (gameState) => set({ gameState }),
    handleStatusUpdate: (status) => set((state) => {
        let globalStats = state.globalStats;
        if (status.globalStats) {
            globalStats = status.globalStats;
        }

        if (status.noCharacter) {
            localStorage.removeItem('selectedCharacterId');
            return { selectedCharacter: null, gameState: null, isConnecting: false, globalStats };
        }

        let newGameState = state.gameState;

        if (status._lightweight) {
            if (!newGameState) return { isConnecting: false, globalStats };
            const merged = { ...newGameState, serverTime: status.serverTime };

            if (status.state) {
                merged.state = { ...newGameState.state };
                if (status.state.health !== undefined) merged.state.health = status.state.health;
                if (status.state.lastFoodAt !== undefined) merged.state.lastFoodAt = status.state.lastFoodAt;
                if (status.state.combat !== undefined) merged.state.combat = status.state.combat;
                if (status.state.dungeon !== undefined) merged.state.dungeon = status.state.dungeon;
                if (status.state.activeWorldBossFight !== undefined) merged.state.activeWorldBossFight = status.state.activeWorldBossFight;
                if (status.state.actionQueue !== undefined) merged.state.actionQueue = status.state.actionQueue;
                if (status.state.notifications) merged.state.notifications = status.state.notifications;

                if (status.state.equipment?.food) {
                    merged.state.equipment = { ...newGameState.state.equipment, food: status.state.equipment.food };
                }
                if (status.state.inventory !== undefined) merged.state.inventory = status.state.inventory;
                if (status.state.bank !== undefined) merged.state.bank = status.state.bank;
                if (status.state.quests !== undefined) merged.state.quests = status.state.quests;
            }

            if (status.current_activity !== undefined) merged.current_activity = status.current_activity;
            if (status.activity_started_at !== undefined) merged.activity_started_at = status.activity_started_at;
            newGameState = merged;
        } else {
            newGameState = status;
        }

        let isWorldBossFight = state.isWorldBossFight;
        let activeWorldBossType = state.activeWorldBossType;
        const wbUpdateStatus = state.worldBossUpdate?.status;
        
        // Auto-open only if we detect a NEW fight or if we are logging in (state.gameState is null)
        const hasActiveFight = !!newGameState?.state?.activeWorldBossFight;
        const wasInFight = !!state.gameState?.state?.activeWorldBossFight;
        
        if (hasActiveFight && (!wasInFight || state.gameState === null)) {
            // If the fight is in the state, we should be in the fight UI
            isWorldBossFight = true;
            activeWorldBossType = newGameState.state.activeWorldBossFight.type || 'window';
        }

        // If fight finished (persisted state gone in a full status update), sync UI flag
        // BUT don't auto-close if we are currently showing the FINISHED summary screen
        if (!status._lightweight && !hasActiveFight && wbUpdateStatus !== 'FINISHED') {
            isWorldBossFight = false;
        }

        return { gameState: newGameState, isConnecting: false, globalStats, isWorldBossFight, activeWorldBossType };
    }),
    setSelectedCharacter: (id) => {
        if (id) localStorage.setItem('selectedCharacterId', id);
        else localStorage.removeItem('selectedCharacterId');
        set({ selectedCharacter: id });
    },

    // --- MARKET STATE ---
    marketListings: [],
    marketPagination: { totalCount: 0, page: 1, totalPages: 1 },
    setMarketListings: (data) => {
        if (data && data.listings) {
            set({ marketListings: data.listings, marketPagination: { totalCount: data.totalCount, page: data.page, totalPages: data.totalPages } });
        } else {
            set({ marketListings: Array.isArray(data) ? data : [] });
        }
    },
    myMarketListings: [],
    setMyMarketListings: (data) => {
        if (data && data.listings) {
            set({ myMarketListings: data.listings });
        } else {
            set({ myMarketListings: Array.isArray(data) ? data : [] });
        }
    },
    marketHistory: [],
    setMarketHistory: (marketHistory) => set({ marketHistory }),
    myMarketHistory: [],
    setMyMarketHistory: (myMarketHistory) => set({ myMarketHistory }),
    buyOrders: [],
    setBuyOrders: (buyOrders) => set({ buyOrders }),
    lowestSellPrice: null,
    setLowestSellPrice: (lowestSellPrice) => set({ lowestSellPrice }),
    marketNotification: null,
    setMarketNotification: (marketNotification) => set({ marketNotification }),
    isLoadingMarketHistory: false,
    setIsLoadingMarketHistory: (isLoadingMarketHistory) => set({ isLoadingMarketHistory }),

    // --- GUILD MODULE STATE ---
    guildSearchResults: [],
    setGuildSearchResults: (guildSearchResults) => set({ guildSearchResults }),
    isSearchingGuilds: false,
    setIsSearchingGuilds: (isSearchingGuilds) => set({ isSearchingGuilds }),
    guildRequests: [],
    setGuildRequests: (guildRequests) => set({ guildRequests }),
    isLoadingGuildRequests: false,
    setIsLoadingGuildRequests: (isLoadingGuildRequests) => set({ isLoadingGuildRequests }),
    guildTasks: [],
    setGuildTasks: (guildTasks) => set({ guildTasks }),
    isLoadingGuildTasks: false,
    setIsLoadingGuildTasks: (isLoadingGuildTasks) => set({ isLoadingGuildTasks }),
    guildStatusMessage: null,
    setGuildStatusMessage: (guildStatusMessage) => set({ guildStatusMessage }),
    guildTimeUntilReset: "",
    setGuildTimeUntilReset: (guildTimeUntilReset) => set({ guildTimeUntilReset }),

    // --- SOCIAL STATE ---
    friends: [],
    setFriends: (friends) => set({ friends }),
    isLoadingFriends: false,
    setIsLoadingFriends: (isLoadingFriends) => set({ isLoadingFriends }),
    playerSearchResults: [],
    setPlayerSearchResults: (playerSearchResults) => set({ playerSearchResults }),
    isSearchingPlayers: false,
    setIsSearchingPlayers: (isSearchingPlayers) => set({ isSearchingPlayers }),
    tradeHistory: [],
    setTradeHistory: (tradeHistory) => set({ tradeHistory }),
    isLoadingTradeHistory: false,
    setIsLoadingTradeHistory: (isLoadingTradeHistory) => set({ isLoadingTradeHistory }),
    socialError: null,
    setSocialError: (socialError) => set({ socialError }),

    // --- WORLD BOSS STATE ---
    wbStatus: null,
    setWbStatus: (wbStatus) => set({ wbStatus }),
    isLoadingWb: true,
    setIsLoadingWb: (isLoadingWb) => set({ isLoadingWb }),
    wbHistoryRankings: [],
    setWbHistoryRankings: (wbHistoryRankings) => set({ wbHistoryRankings }),
    isLoadingWbHistory: false,
    setIsLoadingWbHistory: (isLoadingWbHistory) => set({ isLoadingWbHistory }),

    // --- DUNGEON STATE ---
    dungeonHistory: null,
    setDungeonHistory: (dungeonHistory) => set({ dungeonHistory }),
    isLoadingDungeonHistory: false,
    setIsLoadingDungeonHistory: (isLoadingDungeonHistory) => set({ isLoadingDungeonHistory }),

    // --- LEADERBOARD STATE ---
    leaderboardRankings: [],
    setLeaderboardRankings: (leaderboardRankings) => set({ leaderboardRankings }),
    isLoadingLeaderboard: false,
    setIsLoadingLeaderboard: (isLoadingLeaderboard) => set({ isLoadingLeaderboard }),

    // --- ORB SHOP STATE ---
    orbStoreItems: [],
    setOrbStoreItems: (orbStoreItems) => set({ orbStoreItems }),
    isLoadingOrbStore: false,
    setIsLoadingOrbStore: (isLoadingOrbStore) => set({ isLoadingOrbStore }),
    orbShopStatusMessage: null,
    setOrbShopStatusMessage: (orbShopStatusMessage) => set({ orbShopStatusMessage }),

    // --- UI STATE ---
    activeTab: localStorage.getItem('activeTab') || 'inventory',
    activeCategory: localStorage.getItem('activeCategory') || 'WOOD',
    activeTier: parseInt(localStorage.getItem('activeTier')) || 1,
    setActiveTab: (tab) => {
        localStorage.setItem('activeTab', tab);
        set({ activeTab: tab });
    },
    setActiveCategory: (category) => {
        localStorage.setItem('activeCategory', category);
        set({ activeCategory: category });
    },
    setActiveTier: (tier) => {
        localStorage.setItem('activeTier', tier);
        set({ activeTier: tier });
    },
    sidebarOpen: false,
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    modals: {
        settings: false,
        profile: false,
        offlineGain: false,
        shop: false,
        characterSelection: true,
        headerMenu: false,
        combatHistory: false,
        loot: false,
        marketListing: false,
        announcement: false,
        notifications: false,
        dailySpin: false,
        orbShop: false,
        guest: false,
        social: false,
        currencyDropdown: false,
        rename: false,
        guildProfile: false,
        trade: false,
        queue: false,
        altar: false,
    },
    setModal: (modal, isOpen) => set((state) => ({
        modals: { ...state.modals, [modal]: isOpen }
    })),
    setQueueModal: (item, type) => set({ 
        modalItem: item, 
        modalType: type, 
        modals: { ...get().modals, queue: !!item } 
    }),
    setConfirmModal: (confirmModal) => set({ confirmModal }),

    // --- NOTIFICATIONS ---
    notifications: [],
    addNotification: (notification) => set((state) => ({
        notifications: [
            { id: Date.now() + Math.random(), timestamp: Date.now(), read: false, ...notification },
            ...state.notifications
        ].slice(0, 50)
    })),
    clearNotifications: () => set({ notifications: [] }),
    markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    })),
    markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
    })),

    // --- ADDITIONAL GAME STATE ---
    canSpin: false,
    setCanSpin: (canSpin) => set({ canSpin }),
    banWarning: null,
    setBanWarning: (banWarning) => set({ banWarning }),
    banModalData: null,
    setBanModalData: (banModalData) => set({ banModalData }),
    serverError: null,
    setServerError: (serverError) => set({ serverError }),
    tradeInvites: [],
    setTradeInvites: (tradeInvites) => set({ tradeInvites }),
    activeTrade: null,
    setActiveTrade: (activeTrade) => set({ activeTrade }),
    inspectData: null,
    setInspectData: (inspectData) => set({ inspectData }),
    combatHistory: null,
    setCombatHistory: (combatHistory) => set({ combatHistory }),
    isWorldBossFight: false,
    setIsWorldBossFight: (isWorldBossFight) => set({ isWorldBossFight }),
    activeWorldBossType: 'window',
    setActiveWorldBossType: (activeWorldBossType) => set({ activeWorldBossType }),
    versionMismatch: false,
    setVersionMismatch: (versionMismatch) => set({ versionMismatch }),
    lootModalData: null,
    setLootModalData: (lootModalData) => set({ lootModalData }),
    combatActionResult: null,
    setCombatActionResult: (combatActionResult) => set({ combatActionResult }),
    worldBossUpdate: null,
    lastFinishedWorldBossSessionId: null,
    setWorldBossUpdate: (worldBossUpdate) => {
        const current = get().worldBossUpdate;
        const lastFinishedId = get().lastFinishedWorldBossSessionId;
        
        // If we are trying to set a truthy update
        if (worldBossUpdate) {
            // 1. If this session was already marked as finished, ignore it
            if (worldBossUpdate.sessionId === lastFinishedId && worldBossUpdate.status !== 'ACTIVE') {
                return;
            }

            // 2. If we have a current update for the same session
            if (current && worldBossUpdate.sessionId === current.sessionId) {
                // If it's already FINISHED, ignore more FINISHED
                if (current.status === 'FINISHED' && worldBossUpdate.status === 'FINISHED') return;

                // If same data, ignore to prevent re-renders
                const isSameDamage = worldBossUpdate.damage === current.damage;
                const currentSec = Math.floor((current.elapsed || 0) / 1000);
                const newSec = Math.floor((worldBossUpdate.elapsed || 0) / 1000);
                if (worldBossUpdate.status === current.status && isSameDamage && currentSec === newSec) return;
            }

            // If this is a new session or a status change to FINISHED, track it
            if (worldBossUpdate.status === 'FINISHED') {
                set({ lastFinishedWorldBossSessionId: worldBossUpdate.sessionId });
            }
        }

        set({ worldBossUpdate });
    },
    dailySpinResult: null,
    setDailySpinResult: (dailySpinResult) => set({ dailySpinResult }),
    lastActionResult: null,
    setLastActionResult: (lastActionResult) => set({ lastActionResult }),
    tradeSuccess: null,
    setTradeSuccess: (tradeSuccess) => set({ tradeSuccess }),
    craftRuneSuccess: null,
    setCraftRuneSuccess: (craftRuneSuccess) => set({ craftRuneSuccess }),
    leaderboardData: { top100: [], userRank: null },
    setLeaderboardData: (leaderboardData) => set({ leaderboardData }),
    marketPriceUpdate: null,
    setMarketPriceUpdate: (marketPriceUpdate) => set({ marketPriceUpdate }),
    inspectGuildId: null,
    setInspectGuildId: (inspectGuildId) => set({ inspectGuildId }),
    pendingPotion: null,
    setPendingPotion: (pendingPotion) => set({ pendingPotion }),
    isMobile: window.innerWidth < 768,
    setIsMobile: (isMobile) => set({ isMobile }),
    showCombatHistory: false,
    setShowCombatHistory: (showCombatHistory) => set({ showCombatHistory }),
    showLeaderboard: false,
    setShowLeaderboard: (showLeaderboard) => set({ showLeaderboard }),

    // --- GUILD PENDING STATES ---
    isSubmittingGuild: false,
    setIsSubmittingGuild: (isSubmittingGuild) => set({ isSubmittingGuild }),
    isApplyingToGuild: false,
    setIsApplyingToGuild: (isApplyingToGuild) => set({ isApplyingToGuild }),
    isUpdatingGuild: false,
    setIsUpdatingGuild: (isUpdatingGuild) => set({ isUpdatingGuild }),
    isDonatingToGuild: false,
    setIsDonatingToGuild: (isDonatingToGuild) => set({ isDonatingToGuild }),
    isContributingToTask: false,
    setIsContributingToTask: (isContributingToTask) => set({ isContributingToTask }),

    // --- TRADE PENDING STATES ---
    isTradeAccepting: false,
    setIsTradeAccepting: (isTradeAccepting) => set({ isTradeAccepting }),
    isInvitePending: false,
    setIsInvitePending: (isInvitePending) => set({ isInvitePending }),

    handleTradeInvite: (partnerId) => {
        const { socket, isPreviewActive, onPreviewActionBlocked } = get();
        if (isPreviewActive) return onPreviewActionBlocked();
        if (socket) {
            set({ isInvitePending: true });
            socket.emit('trade_invite', { receiverId: partnerId });
        }
    },
    handleOpenTrade: (tradeId) => {
        const { socket, isPreviewActive, onPreviewActionBlocked } = get();
        if (isPreviewActive) return onPreviewActionBlocked();
        if (socket) socket.emit('trade_join', { tradeId });
    },
    requestSync: () => {
        const { socket, selectedCharacter, isConnecting } = get();
        if (socket && socket.connected && selectedCharacter) {
            socket.emit('request_sync');
        }
    },

    // --- FINAL UI STATE ---
    modalItem: null,
    setModalItem: (modalItem) => set({ modalItem }),
    infoItem: null,
    setInfoItem: (infoItem) => set({ infoItem }),
    modalType: null,
    setModalType: (modalType) => set({ modalType }),
    offlineGains: null,
    setOfflineGains: (offlineGains) => set({ offlineGains }),
    acknowledgeOfflineReport: () => {
      const { socket, selectedCharacter, setOfflineGains, gameState, setGameState } = get();
      if (socket && selectedCharacter) {
        socket.emit('acknowledge_offline_report', { characterId: selectedCharacter });
        setOfflineGains(null);
        if (gameState?.offlineReport) {
          setGameState({ ...gameState, offlineReport: null });
        }
      }
    },
    marketSellItem: null,
    setMarketSellItem: (marketSellItem) => set({ marketSellItem }),
    marketFilter: '',
    setMarketFilter: (marketFilter) => set({ marketFilter }),
    showFullNumbers: false,
    setShowFullNumbers: (showFullNumbers) => set({ showFullNumbers }),
    previewThemeId: null,
    setPreviewThemeId: (previewThemeId) => set({ previewThemeId }),
    previewAvatarData: null,
    setPreviewAvatarData: (previewAvatarData) => set({ previewAvatarData }),
    previewBannerData: null,
    setPreviewBannerData: (previewBannerData) => set({ previewBannerData }),
    confirmModal: null,
    setConfirmModal: (confirmModal) => set({ confirmModal }),
    showGuildXPInfo: false,
    setShowGuildXPInfo: (show) => set({ showGuildXPInfo: show }),
    lastThemeChangeRef: { current: 0 },
    pushSubscriptionActive: false,
    setPushSubscriptionActive: (active) => set({ pushSubscriptionActive: active }),
    checkPushSubscription: async () => {
        try {
            const { PushService } = await import('../services/PushService');
            const sub = await PushService.getSubscription();
            set({ pushSubscriptionActive: !!sub });
        } catch (e) {
            console.error('[PUSH] Failed to check subscription:', e);
        }
    },
    
    // --- SETTINGS ---
    settings: {
        autoSortInventory: 'off',
        disableOfflineModal: false,
        hideCollectionPopups: false,
        hideAvatarBg: false,
        textSize: 'medium',
        ...JSON.parse(localStorage.getItem('eternalidle_settings') || '{}')
    },
    updateSettings: (newSettings) => set((state) => {
        const updated = { ...state.settings, ...newSettings };
        localStorage.setItem('eternalidle_settings', JSON.stringify(updated));
        
        if (state.socket) {
            state.socket.emit('set_settings', { settings: updated });
        }
        
        return { settings: updated };
    }),
    theme: localStorage.getItem('theme') || 'medieval',
    setTheme: (theme) => {
      localStorage.setItem('theme', theme);
      set((state) => {
        state.lastThemeChangeRef.current = Date.now();
        return { theme };
      });
    },

    // --- GAME ACTIONS ---
    handleEquip: (itemId, quantity = null) => {
      const { socket, isPreviewActive, onPreviewActionBlocked } = get();
      if (isPreviewActive) {
        onPreviewActionBlocked();
        return;
      }
      if (socket) socket.emit('equip_item', { itemId, quantity });
    },
    handleUseItem: (itemId, quantity = 1) => {
      const { socket, isPreviewActive, onPreviewActionBlocked, setActiveTab, setActiveCategory, activeCategory, setModal } = get();
      if (isPreviewActive) {
        onPreviewActionBlocked();
        return;
      }
      if (socket) socket.emit('use_item', { itemId, quantity });

      if (itemId === 'NAME_CHANGE_TOKEN') {
          setModal('rename', true);
      }

      // Client-side redirection for Shards
      if (itemId?.includes('_SHARD')) {
        setActiveTab('merging');
        if (itemId.includes('BATTLE')) setActiveCategory('COMBAT');
        else if (activeCategory === 'COMBAT') setActiveCategory('GATHERING');
      }
    },
    handleUnequip: (slot) => {
      const { socket, isPreviewActive, onPreviewActionBlocked } = get();
      if (isPreviewActive) {
        onPreviewActionBlocked();
        return;
      }
      if (socket) socket.emit('unequip_item', { slot });
    },
    startActivity: (type, itemId, quantity = 1) => {
      const { socket, isPreviewActive, onPreviewActionBlocked, setModalItem } = get();
      if (isPreviewActive) {
        onPreviewActionBlocked();
        return;
      }
      if (socket) socket.emit('start_activity', { actionType: type, itemId, quantity });
      setModalItem(null);
    },
    enqueueActivity: (type, itemId, quantity = 1) => {
        const { socket, isPreviewActive, onPreviewActionBlocked, setModalItem } = get();
        if (isPreviewActive) {
            onPreviewActionBlocked();
            return;
        }
        if (socket) socket.emit('enqueue_activity', { actionType: type, itemId, quantity });
        setModalItem(null);
    },
    removeFromQueue: (index) => {
        const { socket } = get();
        if (socket) socket.emit('remove_from_queue', { index });
    },
    clearQueue: () => {
        const { socket } = get();
        if (socket) socket.emit('clear_queue');
    },
    reorderQueue: (index, direction) => {
        console.log(`[SOCKET] Emitting reorder_queue: index=${index}, direction=${direction}`);
        const { socket } = get();
        if (socket) socket.emit('reorder_queue', { index, direction });
    },
    claimReward: () => {
      const { socket } = get();
      if (socket) socket.emit('claim_reward');
    },

    handleRenameSubmit: (newName) => {
      const { socket, isPreviewActive, onPreviewActionBlocked, setModal } = get();
      if (isPreviewActive) {
        onPreviewActionBlocked();
        return;
      }
      if (socket) {
        socket.emit('change_name', { newName });
        setModal('rename', false);
      }
    },
    clearAllNotifications: () => {
      const { socket, clearNotifications } = get();
      clearNotifications();
      if (socket) socket.emit('clear_notifications');
    },
    markAllAsRead: () => {
      const { socket, markAllNotificationsRead } = get();
      markAllNotificationsRead();
      if (socket) socket.emit('mark_all_notifications_read');
    },
    handleListOnMarket: (id, item) => {
      const { isPreviewActive, onPreviewActionBlocked, setMarketSellItem } = get();
      if (isPreviewActive) {
        onPreviewActionBlocked();
        return;
      }
      if (item && typeof item === 'object') {
        setMarketSellItem({ ...item, itemId: id });
      } else if (typeof id === 'object') {
        setMarketSellItem({ ...id, itemId: id.itemId || id.id });
      } else {
        setMarketSellItem({ itemId: id });
      }
    },

    clearPreview: () => set({ 
      previewThemeId: null, 
      previewAvatarData: null, 
      previewBannerData: null 
    }),

    // --- PREVIEW LOGIC ---
    get isPreviewActive() {
      const state = get();
      return !!state.previewThemeId || !!state.previewAvatarData || !!state.previewBannerData;
    },
    onPreviewActionBlocked: (onConfirmAction = null) => {
      const { setConfirmModal, clearPreview } = get();
      setConfirmModal({
        message: "Preview Mode is active! Actions are disabled. Exit preview to play.",
        onConfirm: () => {
          if (onConfirmAction) onConfirmAction();
          setConfirmModal(null);
        },
        onCancel: () => {
          clearPreview();
          setConfirmModal(null);
        },
        confirmLabel: onConfirmAction ? "Keep & Proceed" : "OK",
        cancelLabel: "Exit Preview"
      });
    },

    // Convenience setters for modals
    setDailySpinOpen: (isOpen) => get().setModal('dailySpin', isOpen),
    setShowGuestModal: (isOpen) => get().setModal('guest', isOpen),
    setShowOrbShop: (isOpen) => get().setModal('orbShop', isOpen),
    setIsRenameModalOpen: (isOpen) => get().setModal('rename', isOpen),
    setShowCurrencyDropdown: (isOpen) => get().setModal('currencyDropdown', isOpen),
    setShowSocialModal: (isOpen) => get().setModal('social', isOpen),
    setIsHeaderMenuOpen: (isOpen) => get().setModal('headerMenu', isOpen),
    setIsSettingsOpen: (isOpen) => get().setModal('settings', isOpen),
  }));
