import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../supabase';
import { PushService } from '../services/PushService';
import { useNavigate, useLocation } from 'react-router-dom';

export const useGameSync = () => {
    const {
        session,
        socket,
        gameState,
        theme,
        setTheme,
        lastThemeChangeRef,
        settings,
        updateSettings,
        activeTab,
        setActiveTab,
        activeCategory,
        activeTier,
        setActivePlayers,
        selectedCharacter,
        setIsConnecting,
        connectSocket,
        previewThemeId
    } = useAppStore();

    const navigate = useNavigate();
    const location = useLocation();
    const settingsInitializedRef = useRef(false);
    const settingsFromSyncRef = useRef(null);
    const prevTabRef = useRef(activeTab);

    // Load settings from Supabase user_metadata on login
    useEffect(() => {
        if (session?.user?.user_metadata?.game_settings && !settingsInitializedRef.current) {
            settingsInitializedRef.current = true;
            const serverSettings = session.user.user_metadata.game_settings;
            updateSettings(serverSettings);
        }
    }, [session, updateSettings]);

    // Sync settings from character state
    useEffect(() => {
        if (gameState?.state?.settings) {
            const serverSettings = gameState.state.settings;
            const serverSettingsStr = JSON.stringify(serverSettings);
            if (settingsFromSyncRef.current !== serverSettingsStr) {
                settingsFromSyncRef.current = serverSettingsStr;
                updateSettings(serverSettings);
            }
        }
    }, [gameState?.state?.settings, updateSettings]);

    // Apply and Persist Settings
    useEffect(() => {
        localStorage.setItem('eternalidle_settings', JSON.stringify(settings));
        let fontSize = '16px'; 
        if (settings.textSize === 'small') fontSize = '14px';
        if (settings.textSize === 'large') fontSize = '18px';
        document.documentElement.style.fontSize = fontSize;

        const settingsStr = JSON.stringify(settings);
        if (socket && Object.keys(settings).length > 0 && settingsFromSyncRef.current !== settingsStr) {
            socket.emit('set_settings', { settings });
            if (settings.pushEnabled) {
                socket.emit('push_update_settings', { settings });
            }
        }
    }, [settings, socket]);

    // Push Subscription
    useEffect(() => {
        if (socket && settings.pushEnabled) {
            const syncPush = async () => {
                try {
                    const sub = await PushService.getSubscription();
                    if (sub) socket.emit('push_subscribe', { subscription: sub });
                } catch (e) {
                    console.error('[PUSH] Failed to sync subscription:', e);
                }
            };
            syncPush();
        }
    }, [socket, settings.pushEnabled]);

    // Register SW
    useEffect(() => {
        PushService.registerServiceWorker();
    }, []);

    // Persist Navigation to LocalStorage
    useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
        localStorage.setItem('activeCategory', activeCategory);
        localStorage.setItem('activeTier', activeTier);
    }, [activeTab, activeCategory, activeTier]);

    // Theme Sync
    useEffect(() => {
        if (Date.now() - lastThemeChangeRef.current < 2000) return;
        if (gameState?.state) {
            const charTheme = gameState.state.theme;
            if (charTheme && charTheme !== theme && !previewThemeId) {
                setTheme(charTheme);
            }
        }
    }, [gameState?.state, previewThemeId, theme, setTheme]);

    useEffect(() => {
        if (Date.now() - lastThemeChangeRef.current < 2000) return;
        if (session?.user?.user_metadata?.theme && !previewThemeId && !gameState) {
            const serverTheme = session.user.user_metadata.theme;
            if (serverTheme !== theme) setTheme(serverTheme);
        }
    }, [session, previewThemeId, theme, gameState, setTheme]);

    // Update Last Active on Unload
    useEffect(() => {
        const handleUnload = () => {
            if (session?.access_token) {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const url = `${apiUrl}/api/update_last_active`;
                if (navigator.sendBeacon) {
                    const blob = new Blob([new URLSearchParams({ token: session.access_token }).toString()], { type: 'application/x-www-form-urlencoded' });
                    navigator.sendBeacon(url, blob);
                } else {
                    fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        keepalive: true
                    }).catch(err => console.error("Failed to update last active:", err));
                }
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [session]);

    // Fetch Active Players (Every 5 minutes)
    useEffect(() => {
        const { fetchActivePlayers } = useAppStore.getState();
        fetchActivePlayers();
        const interval = setInterval(fetchActivePlayers, 300000);
        return () => clearInterval(interval);
    }, []);

    // Auto-connect
    useEffect(() => {
        if (session?.access_token && !socket) {
            connectSocket(session.access_token, selectedCharacter);
        }
    }, [session, socket, selectedCharacter, connectSocket]);

    useEffect(() => {
        const activeTheme = previewThemeId || theme;
        document.body.className = `theme-${activeTheme}`;
        if (!previewThemeId) localStorage.setItem('theme', theme);
    }, [theme, previewThemeId]);

    // Background Sync Logic
    useEffect(() => {
        const { requestSync } = useAppStore.getState();
        let lastSync = 0;
        const SYNC_COOLDOWN = 5000; // 5 seconds

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                if (now - lastSync > SYNC_COOLDOWN) {
                    requestSync();
                    lastSync = now;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange); // Extra safety for some browsers

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleVisibilityChange);
        };
    }, []);
};
