import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useAppStore } from './store/useAppStore';
import { useOptimisticState } from './hooks/useOptimisticState';
import { useSocketEvents } from './hooks/useSocketEvents';
import { useGameSync } from './hooks/useGameSync';
import { useAuthSync } from './hooks/useAuthSync';
import { useNavigationSync } from './hooks/useNavigationSync';
import { useWindowListeners } from './hooks/useWindowListeners';
import { useAppHandlers } from './hooks/useAppHandlers';

// Versioning
const CLIENT_VERSION = '1.5.4';

// Components
import Auth from './components/Auth';
import CharacterSelection from './components/CharacterSelection';
import ChatWidget from './components/ChatWidget';
import Sidebar from './components/Sidebar';
import ActivityWidget from './components/ActivityWidget';
import BottomNav from './components/BottomNav';
import BuffsDrawer from './components/BuffsDrawer';
import ToastContainer from './components/ToastContainer';
import TutorialOverlay from './components/TutorialOverlay';
import WorldBossFight from './components/WorldBossFight';
import PrivacyPolicy from './components/PrivacyPolicy';

// New Modular Components
import { GlobalHeader } from './components/GlobalHeader';
import { GameContent } from './components/GameContent';
import { AppModals } from './components/AppModals';
import { 
    VersionMismatchOverlay, 
    BannedOverlay, 
    BanWarningOverlay 
} from './components/AppOverlays';

// Utils
import { ITEMS } from '@shared/items';
import { calculateNextLevelXP } from './utils/xpTable';
import { getSkillForItem } from '@shared/items';

function App() {
    const {
        session, setSession,
        socket,
        gameState, setGameState,
        isConnecting,
        activeTab, setActiveTab,
        activeCategory, setActiveCategory,
        activeTier, setActiveTier,
        sidebarOpen, setSidebarOpen,
        theme, setTheme,
        banWarning, setBanWarning,
        banModalData,
        versionMismatch,
        isMobile, setIsMobile,
        modals, setModal,
        selectedCharacter, setSelectedCharacter,
        handleTradeInvite,
        handleOpenTrade,
        handleRenameSubmit,
        markAllAsRead,
        clearAllNotifications,
        handleListOnMarket,
        setModalItem,
        setInfoItem,
        setMarketSellItem,
        setOfflineGains,
        setShowCombatHistory,
        setShowLeaderboard,
        setInspectData,
        isWorldBossFight, setIsWorldBossFight,
        connectSocket, disconnectSocket,
        settings, updateSettings,
        previewThemeId, setPreviewThemeId,
        tradeInvites, activeTrade, canSpin,
        isPreviewActive, onPreviewActionBlocked,
        startActivity
    } = useAppStore();

    const clockOffset = useRef(0);
    const [initialAuthView] = useState('LOGIN');
    const authoritativeGameState = useOptimisticState(gameState);

    const displayedGameState = useMemo(() => {
        if (!authoritativeGameState) return null;
        let state = { ...authoritativeGameState };

        // Handle Preview Overrides
        if (previewThemeId) {
            state.theme = previewThemeId;
        }
        
        if (previewAvatarData) {
            state.state = { 
                ...state.state, 
                avatar: previewAvatarData.path 
            };
        }

        if (previewBannerData) {
            state.state = { 
                ...state.state, 
                banner: previewBannerData 
            };
        }

        return state;
    }, [authoritativeGameState, previewThemeId, previewAvatarData, previewBannerData]);

    // Modular Hooks
    useAuthSync();
    useSocketEvents();
    useGameSync();
    useWindowListeners({
        setModalItem,
        setInfoItem,
        setMarketSellItem,
        setOfflineGains,
        setSidebarOpen,
        setModal,
        setShowCombatHistory,
        setShowLeaderboard,
        setInspectData,
        setIsMobile
    });

    const { handleNavigate, handleSetActiveTab } = useNavigationSync(
        selectedCharacter,
        activeTab,
        setActiveTab,
        setActiveCategory,
        setActiveTier,
        setModalItem,
        setModal
    );

    const location = useLocation();
    const navigate = useNavigate();

    // Handlers
    const {
        handleSetTheme,
        handleCharacterSelect,
        handleLogout,
        handleSwitchCharacter,
        handleTutorialStepComplete,
        handleInspectPlayer,
        handleStartWorldBoss
    } = useAppHandlers({
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
    });



    // Render Logic
    const isAuthLoading = useAppStore(state => state.isAuthLoading);
    if (isAuthLoading) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'var(--accent)' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--accent-soft)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <div style={{ marginTop: '20px', fontWeight: '900', letterSpacing: '2px' }}>VERIFYING SESSION...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (versionMismatch) return <VersionMismatchOverlay />;
    if (banModalData) return <BannedOverlay banModalData={banModalData} />;

    // Privacy Policy route check
    if (location.pathname.replace(/\/$/, '') === '/privacy') {
        return <PrivacyPolicy />;
    }

    if (!session || initialAuthView === 'RESET') {
        return (
            <>
                <Auth onLogin={setSession} initialView={initialAuthView} theme={theme} setTheme={handleSetTheme} isMobile={isMobile} onPreviewTheme={(id) => setPreviewThemeId(id)} />
                <BanWarningOverlay banWarning={banWarning} setBanWarning={setBanWarning} socket={socket} />
            </>
        );
    }

    if (!selectedCharacter) {
        return (
            <>
                <CharacterSelection onSelectCharacter={handleCharacterSelect} theme={theme} setTheme={handleSetTheme} isMobile={isMobile} onPreviewTheme={(id) => setPreviewThemeId(id)} />
                <BanWarningOverlay banWarning={banWarning} setBanWarning={setBanWarning} socket={socket} />
            </>
        );
    }

    if (!gameState || (!gameState.state && isConnecting)) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                {isConnecting ? "Connecting to World..." : "Loading Game State..."}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent', color: 'var(--text-main)', fontFamily: "'Inter', sans-serif", position: 'relative', paddingBottom: isMobile ? '70px' : '0' }}>
            {!isMobile && (
                <Sidebar
                    gameState={displayedGameState}
                    activeTab={activeTab} setActiveTab={handleSetActiveTab}
                    activeCategory={activeCategory} setActiveCategory={setActiveCategory}
                    activeTier={activeTier} setActiveTier={setActiveTier}
                    onNavigate={handleNavigate}
                    isMobile={isMobile}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onSwitchCharacter={handleSwitchCharacter}
                    socket={socket}
                    canSpin={canSpin}
                    onOpenDailySpin={() => setModal('dailySpin', true)}
                    hasActiveTrade={tradeInvites?.length > 0 || !!activeTrade}
                    isAnonymous={session?.user?.is_anonymous}
                    onShowGuestModal={() => setModal('guest', true)}
                    onTutorialComplete={handleTutorialStepComplete}
                />
            )}

            {isMobile && <BottomNav
                gameState={displayedGameState}
                activeTab={activeTab} setActiveTab={handleSetActiveTab}
                onNavigate={handleNavigate}
                canSpin={canSpin}
                hasActiveTrade={tradeInvites?.length > 0 || !!activeTrade}
                isAnonymous={session?.user?.is_anonymous}
                onShowGuestModal={() => setModal('guest', true)}
                onTutorialComplete={handleTutorialStepComplete}
            />}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
                <GlobalHeader
                    displayedGameState={displayedGameState}
                    handleLogout={handleLogout}
                    handleSwitchCharacter={handleSwitchCharacter}
                    markAllAsRead={markAllAsRead}
                    clearAllNotifications={clearAllNotifications}
                    clockOffset={clockOffset.current}
                />

                <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: isMobile ? '10px' : '20px 30px', position: 'relative', minHeight: 0, maxWidth: isMobile ? '100vw' : '1440px', margin: '0 auto', width: '100%' }}>
                    {session?.user?.is_anonymous && (
                        <div className="guest-banner" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '10px', padding: '10px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)' }}>
                           <span style={{ fontSize: '0.85rem', color: '#d4af37' }}>Guest Account: Save progress!</span>
                           <button onClick={() => setActiveTab('profile')} className="save-btn">SAVE PROGRESS</button>
                        </div>
                    )}
                    <GameContent
                        displayedGameState={displayedGameState}
                        session={session}
                        socket={socket}
                        settings={settings}
                        isMobile={isMobile}
                        theme={theme}
                        handleSetTheme={handleSetTheme}
                        handleTutorialStepComplete={handleTutorialStepComplete}
                        handleInspectPlayer={handleInspectPlayer}
                        handleStartWorldBoss={handleStartWorldBoss}
                        handleNavigate={handleNavigate}
                        clockOffset={clockOffset.current}
                    />
                </main>

                <ChatWidget socket={socket} user={session.user} characterName={displayedGameState?.name} isMobile={isMobile} onInspect={handleInspectPlayer} />
                <BuffsDrawer gameState={displayedGameState} isMobile={isMobile} />
                <ActivityWidget
                    gameState={displayedGameState}
                    onStop={() => socket.emit('stop_activity')}
                    socket={socket}
                    onNavigate={handleNavigate}
                    isMobile={isMobile}
                    serverTimeOffset={clockOffset.current}
                    onOpenWorldBoss={() => setIsWorldBossFight(true)}
                    skillProgress={gameState?.current_activity && displayedGameState?.state?.skills ? (() => {
                        const s = displayedGameState.state.skills[getSkillForItem(gameState.current_activity.item_id, gameState.current_activity.type)];
                        if (!s || s.level >= 100) return s?.level >= 100 ? 100 : 0;
                        return (s.xp / calculateNextLevelXP(s.level || 1)) * 100;
                    })() : 0}
                />
                <ToastContainer socket={socket} settings={settings} />
                
                {displayedGameState?.state?.tutorialStep && <TutorialOverlay step={displayedGameState.state.tutorialStep} onComplete={handleTutorialStepComplete} />}
                
                <AppModals
                    displayedGameState={displayedGameState}
                    handleNavigate={handleNavigate}
                    handleSearchInMarket={(name) => { useAppStore.getState().setMarketFilter(name); setActiveTab('market'); }}
                    handleInspectPlayer={handleInspectPlayer}
                    handleTradeInvite={handleTradeInvite}
                    handleOpenTrade={handleOpenTrade}
                    handleCloseInspect={() => setInspectData(null)}
                    handleInspectMessage={() => setInspectData(null)}
                    handleItemClick={(item) => setInfoItem(item)}
                    handleRenameSubmit={handleRenameSubmit}
                    clockOffset={clockOffset.current}
                />

                <BanWarningOverlay banWarning={banWarning} setBanWarning={setBanWarning} socket={socket} />
                {isWorldBossFight && <WorldBossFight gameState={displayedGameState} socket={socket} onMinimize={() => setIsWorldBossFight(false)} onFinish={() => { setIsWorldBossFight(false); setActiveTab('world_boss'); }} />}
            </div>
        </div>
    );
}

export default App;
