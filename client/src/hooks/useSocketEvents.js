import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useSocketEvents = () => {
    const store = useAppStore();
    const { socket } = store;

    useEffect(() => {
        if (!socket) return;
        
        // Initial fetches to ensure indicators are correct from the start
        if (store.selectedCharacter) {
            socket.emit('trade_get_active');
        }

        // --- Core Events ---
        socket.on('guild_broadcast', store.addGuildMessage);
        socket.on('craft_rune_success', store.setCraftRuneSuccess);
        socket.on('item_market_price', store.setMarketPriceUpdate);
        socket.on('global_stats_update', store.setGlobalStats);
        socket.on('active_players_update', store.setActivePlayers);
        socket.on('error', (err) => {
            const msg = err?.message || 'Unknown error';
            store.setServerError(msg);
            store.setSocialError(msg);
            store.setMarketNotification({ type: 'error', message: msg });
        });
        socket.on('ban_error', store.setBanModalData);
        socket.on('account_status', (data) => {
            if (data?.banWarning !== undefined) {
                store.setBanWarning(data.banWarning);
            }
        });
        socket.on('daily_status', (data) => store.setCanSpin(data?.canSpin));
        socket.on('daily_spin_result', store.setDailySpinResult);
        socket.on('version_mismatch', () => store.setVersionMismatch(true));
        socket.on('public_profile_data', store.setInspectData);
        socket.on('offline_report', (data) => {
            if (store.settings?.disableOfflineModal) {
                store.acknowledgeOfflineReport();
                return;
            }
            store.setOfflineGains(data);
        });
        socket.on('item_used', (result) => {
            if (result?.rewards) {
                store.setLootModalData(result.rewards);
            }
        });
        socket.on('world_boss_started', () => store.setIsWorldBossFight(true));
        socket.on('action_result', (result) => {
            if (result.combatUpdate || result.healingUpdate) {
                store.setCombatActionResult(result);
            }
            if (result.worldBossUpdate) {
                store.setWorldBossUpdate(result.worldBossUpdate);
            }
            store.setLastActionResult(result);
        });
        socket.on('trade_success', store.setTradeSuccess);

        // --- Market Events ---
        socket.on('market_listings_update', (data) => {
            store.setMarketListings(data); // store.setMarketListings handles the object with listings and pagination
        });
        socket.on('my_market_listings_update', (data) => {
            store.setMyMarketListings(data?.listings || []);
        });
        socket.on('market_action_success', (result) => {
            console.log('[MARKET-SYNC] market_action_success:', result);
            store.setMarketNotification({ type: 'success', message: result.message || 'Action completed successfully!' });

            // Refetch personal listings to ensure "My Listings" tab stays in sync
            const charId = store.selectedCharacter;
            if (charId) {
                socket.emit('get_market_listings', {
                    seller_character_id: charId,
                    limit: 100
                });
            }
        });
        socket.on('market_history_update', (history) => {
            store.setMarketHistory(history || []);
            store.setIsLoadingMarketHistory(false);
        });
        socket.on('my_market_history_update', (history) => {
            store.setMyMarketHistory(history || []);
            store.setIsLoadingMarketHistory(false);
        });
        socket.on('buy_orders_update', store.setBuyOrders);
        socket.on('item_market_price', (data) => {
            const price = data.price || data.lowestPrice || null;
            store.setLowestSellPrice(price);
        });

        // --- Guild Events ---
        socket.on('guild_search_results', (results) => {
            store.setGuildSearchResults(results || []);
            store.setIsSearchingGuilds(false);
        });
        socket.on('guild_created', (result) => {
            store.setIsSubmittingGuild(false);
            store.setIsSearchingGuilds(false);
            store.setGuildStatusMessage({ type: result.success ? 'success' : 'error', text: result.message || (result.success ? 'Guild created!' : 'Failed to create guild.') });
        });
        socket.on('guild_application_sent', (result) => {
            store.setIsApplyingToGuild(false);
            store.setGuildStatusMessage({ type: result.success ? 'success' : 'error', text: result.message || (result.success ? 'Application sent!' : 'Failed to send application.') });
        });
        socket.on('guild_customization_updated', (result) => {
            store.setIsUpdatingGuild(false);
            store.setGuildStatusMessage({ type: result.success ? 'success' : 'error', text: result.message || (result.success ? 'Guild updated!' : 'Failed to update guild.') });
        });
        socket.on('guild_donation_result', (result) => {
            store.setIsDonatingToGuild(false);
            store.setGuildStatusMessage({ type: result.success ? 'success' : 'error', text: result.message || (result.success ? 'Donation successful!' : 'Donation failed.') });
        });
        socket.on('guild_settings_updated', (result) => {
            store.setIsUpdatingGuild(false);
            store.setSettingsPending?.(false); // Backward compatibility if needed
            store.setGuildStatusMessage({ type: result.success ? 'success' : 'error', text: result.message || (result.success ? 'Settings updated!' : 'Failed to update settings.') });
        });
        socket.on('guild_requests_data', (data) => {
            store.setGuildRequests(data || []);
            store.setIsLoadingGuildRequests(false);
        });
        socket.on('guild_tasks_data', (data) => {
            store.setGuildTasks(data || []);
            store.setIsLoadingGuildTasks(false);
        });
        socket.on('guild_task_contribute_result', (result) => {
            store.setIsContributingToTask(false);
            if (result.success) {
                store.setGuildTasks(result.tasks || []);
            }
            store.setIsLoadingGuildTasks(false);
        });
        socket.on('guild_left', (result) => {
            store.setIsUpdatingGuild(false);
            store.setGuildStatusMessage({ type: result.success ? 'success' : 'error', text: result.success ? 'You have left the guild.' : (result.message || 'Failed to leave guild.') });
        });
        socket.on('guild_disbanded', (result) => {
            store.setIsUpdatingGuild(false);
            store.setGuildStatusMessage({ type: result.success ? 'success' : 'error', text: result.success ? 'The guild has been disbanded.' : (result.message || 'Failed to disband guild.') });
        });

        // --- Social Events ---
        socket.on('trade_search_result', (results) => {
            store.setPlayerSearchResults(results || []);
            store.setIsSearchingPlayers(false);
            store.setSocialError(null);
        });
        socket.on('trade_search_error', (err) => {
            store.setSocialError(err.message);
            store.setIsSearchingPlayers(false);
            store.setPlayerSearchResults([]);
        });
        socket.on('my_trade_history_update', (history) => {
            store.setTradeHistory(history || []);
            store.setIsLoadingTradeHistory(false);
        });
        socket.on('friends_list_update', (list) => {
            store.setFriends(list || []);
            store.setIsLoadingFriends(false);
        });
        socket.on('friend_action_success', () => {
            socket.emit('get_friends');
        });

        // --- Trade Module ---
        socket.on('trade_invite_received', (invite) => {
            const current = store.tradeInvites || [];
            store.setTradeInvites([...current.filter(i => i.sender_id !== invite.sender_id), invite]);
        });
        socket.on('trade_invite_cancelled', (senderId) => {
            const current = store.tradeInvites || [];
            store.setTradeInvites(current.filter(i => i.sender_id !== senderId));
        });
        socket.on('trade_invite_result', (result) => {
            store.setIsInvitePending(false);
            if (!result.success && result.message) {
                store.setSocialError(result.message);
            }
        });
        socket.on('trade_active_list', (trades) => {
            store.setTradeInvites(trades);
        });
        socket.on('trade_started', (trade) => {
            store.setActiveTrade(trade);
            store.setModal('social', false);
            // Don't remove from invites, just ensure it's there
            const current = store.tradeInvites || [];
            const exists = current.find(i => i.id === trade.id);
            if (!exists) {
                store.setTradeInvites([...current, trade]);
            }
        });
        socket.on('trade_joined', (trade) => {
            store.setActiveTrade(trade);
            store.setModal('social', false);
            // Don't remove from invites, just ensure it's there
            const current = store.tradeInvites || [];
            const exists = current.find(i => i.id === trade.id);
            if (!exists) {
                store.setTradeInvites([...current, trade]);
            }
        });
        socket.on('trade_update', (trade) => {
            store.setActiveTrade(trade);
            // Also update in invites list to keep names/status in sync if SocialPanel is open
            const current = store.tradeInvites || [];
            const exists = current.find(i => i.id === trade.id);
            if (exists) {
                store.setTradeInvites(current.map(i => i.id === trade.id ? trade : i));
            } else {
                store.setTradeInvites([...current, trade]);
            }
        });
        socket.on('trade_accept_result', (result) => {
            store.setIsTradeAccepting(false);
            if (!result.success && result.message) {
                store.setSocialError(result.message);
            }
        });
        socket.on('trade_cancelled', (trade) => {
            store.setActiveTrade(null);
            // Cleanup from invites
            const id = typeof trade === 'object' ? trade.id : trade;
            if (id) {
                const current = store.tradeInvites || [];
                store.setTradeInvites(current.filter(i => i.id !== id));
            } else {
              // Fallback: refresh list if no ID provided
              socket.emit('trade_get_active');
            }
        });
        socket.on('trade_success', (result) => {
            store.setTradeSuccess(result);
            store.setActiveTrade(null);
            store.setIsTradeAccepting(false);
            // Cleanup from invites
            const current = store.tradeInvites || [];
            const tradeId = result.trade_id || result.id;
            if (tradeId) {
                store.setTradeInvites(current.filter(i => i.id !== tradeId));
            } else {
                socket.emit('trade_get_active');
            }
        });
        socket.on('trade_error', (err) => {
            store.setSocialError(err.message || 'Trade error');
            store.setIsTradeAccepting(false);
        });

        // --- World Boss Events ---
        socket.on('world_boss_status', (status) => {
            store.setWbStatus(status);
            store.setIsLoadingWb(false);
        });
        socket.on('world_boss_ranking_history', ({ rankings }) => {
            store.setWbHistoryRankings(rankings || []);
            store.setIsLoadingWbHistory(false);
        });
        socket.on('world_boss_reward_claimed', (result) => {
            if (result.success) {
                store.setWbStatus(prev => ({ ...prev, pendingReward: null }));
                socket.emit('get_world_boss_status');
            }
        });

        // --- COMBAT & DUNGEON EVENTS ---
        socket.on('combat_history_update', (history) => {
            store.setCombatHistory(history || []);
        });

        socket.on('dungeon_history_update', (data) => {
            store.setDungeonHistory(data || []);
            store.setIsLoadingDungeonHistory(false);
        });

        // --- LEADERBOARD EVENTS ---
        socket.on('leaderboard_update', (data) => {
            // Unify data handling for both RankingPanel and LeaderboardModal
            store.setLeaderboardData(data || { top100: [], userRank: null });
            store.setLeaderboardRankings(data?.top100 || []);
            store.setIsLoadingLeaderboard(false);
        });

        // --- ORB SHOP EVENTS ---
        socket.on('orb_store_update', (items) => {
            store.setOrbStoreItems(items || []);
            store.setIsLoadingOrbStore(false);
        });

        socket.on('orb_purchase_success', (result) => {
            store.setOrbShopStatusMessage({ type: 'success', text: result.message || 'Purchase successful!' });
        });

        socket.on('orb_purchase_error', (err) => {
            store.setOrbShopStatusMessage({ type: 'error', text: err.message || 'Purchase failed.' });
        });

        socket.on('stripe_checkout_session', (data) => {
            const url = typeof data === 'string' ? data : data?.url;
            if (url) {
                console.log('[STRIPE] Redirecting to:', url);
                window.location.assign(url);
            } else {
                console.error('[STRIPE] Received invalid checkout session data:', data);
            }
        });

        return () => {
            socket.off('status_update');
            socket.off('game_status');
            socket.off('guild_broadcast');
            socket.off('craft_rune_success');
            socket.off('item_market_price');
            socket.off('global_stats_update');
            socket.off('active_players_update');
            socket.off('error');
            socket.off('ban_error');
            socket.off('account_status');
            socket.off('daily_status');
            socket.off('daily_spin_result');
            socket.off('version_mismatch');
            socket.off('public_profile_data');
            socket.off('offline_report');
            socket.off('item_used');
            socket.off('world_boss_started');
            socket.off('action_result');
            socket.off('trade_success');

            socket.off('market_listings_update');
            socket.off('my_market_listings_update');
            socket.off('market_action_success');
            socket.off('market_history_update');
            socket.off('my_market_history_update');
            socket.off('buy_orders_update');
            socket.off('item_market_price');

            socket.off('guild_search_results');
            socket.off('guild_created');
            socket.off('guild_application_sent');
            socket.off('guild_customization_updated');
            socket.off('guild_donation_result');
            socket.off('guild_settings_updated');
            socket.off('guild_requests_data');
            socket.off('guild_tasks_data');
            socket.off('guild_task_contribute_result');
            socket.off('guild_left');
            socket.off('guild_disbanded');

            socket.off('trade_search_result');
            socket.off('trade_search_error');
            socket.off('my_trade_history_update');
            socket.off('friends_list_update');
            socket.off('friend_action_success');

            socket.off('world_boss_status');
            socket.off('world_boss_ranking_history');
            socket.off('world_boss_reward_claimed');

            socket.off('trade_invite_received');
            socket.off('trade_invite_cancelled');
            socket.off('trade_invite_result');
            socket.off('trade_started');
            socket.off('trade_joined');
            socket.off('trade_update');
            socket.off('trade_accept_result');
            socket.off('trade_cancelled');
            socket.off('trade_error');

            socket.off('combat_history_update');
            socket.off('dungeon_history_update');
            socket.off('leaderboard_update');
            
            socket.off('orb_store_update');
            socket.off('orb_purchase_success');
            socket.off('orb_purchase_error');
            socket.off('stripe_checkout_session');
        };
    }, [socket, store.selectedCharacter]);
};
