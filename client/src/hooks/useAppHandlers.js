import { useCallback } from 'react';
import { supabase } from '../supabase';

/**
 * Custom hook to manage core application handlers.
 */
export function useAppHandlers({
    socket,
    session,
    setTheme,
    setSelectedCharacter,
    setGameState,
    setModal,
    connectSocket,
    disconnectSocket,
    isPreviewActive,
    CLIENT_VERSION
}) {
    const handleSetTheme = useCallback((newTheme) => {
        setTheme(newTheme);
        if (socket) socket.emit('set_theme', { themeId: newTheme });
    }, [socket, setTheme]);

    const handleCharacterSelect = useCallback((id) => {
        setSelectedCharacter(id);
        if (session?.access_token) {
            connectSocket(session.access_token, id, CLIENT_VERSION);
        }
    }, [session, setSelectedCharacter, connectSocket, CLIENT_VERSION]);

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        disconnectSocket();
        setGameState(null);
        setSelectedCharacter(null);
    }, [disconnectSocket, setGameState, setSelectedCharacter]);

    const handleSwitchCharacter = useCallback((id) => {
        disconnectSocket();
        setGameState(null);
        if (id) {
            handleCharacterSelect(id);
        } else {
            setSelectedCharacter(null);
            setTheme('medieval');
        }
    }, [disconnectSocket, setGameState, handleCharacterSelect, setSelectedCharacter, setTheme]);

    const handleTutorialStepComplete = useCallback((step) => {
        if (socket) socket.emit('tutorial_complete', { step });
    }, [socket]);

    const handleInspectPlayer = useCallback((name) => {
        if (socket && name) socket.emit('get_public_profile', { characterName: name });
    }, [socket]);

    const handleStartWorldBoss = useCallback((type = 'window') => {
        if (isPreviewActive) {
            setModal('confirm', {
                message: "Preview Mode is active! World Boss challenges are disabled.",
                onConfirm: () => setModal('confirm', null)
            });
            return;
        }
        if (socket) socket.emit('start_world_boss_fight', { type });
    }, [socket, setModal, isPreviewActive]);

    return {
        handleSetTheme,
        handleCharacterSelect,
        handleLogout,
        handleSwitchCharacter,
        handleTutorialStepComplete,
        handleInspectPlayer,
        handleStartWorldBoss
    };
}
