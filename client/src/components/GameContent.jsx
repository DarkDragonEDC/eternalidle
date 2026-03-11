import React from 'react';
import ProfilePanel from './ProfilePanel';
import { SkillsOverview, TownOverview, CombatOverview } from './MobileHubs';
import GatheringPage from '../pages/GatheringPage';
import CraftingPage from '../pages/CraftingPage';
import InventoryPanel from './InventoryPanel';
import RankingPanel from './RankingPanel';
import RestPanel from './RestPanel';
import WorldBossPanel from './WorldBossPanel';
import MarketPanel from './MarketPanel';
import TaxometerPage from '../pages/TaxometerPage';
import CombatPanel from './CombatPanel';
import DungeonPanel from './DungeonPanel';
import RunePanel from './RunePanel';
import GuildPanel from './GuildPanel';
import SkillProgressHeader from './SkillProgressHeader';
import ActivityProgressBar from './ActivityProgressBar';
import { useAppStore } from '../store/useAppStore';

export const GameContent = ({ 
    displayedGameState, 
    session, 
    socket, 
    settings, 
    isMobile, 
    theme, 
    handleSetTheme, 
    handleTutorialStepComplete, 
    handleInspectPlayer, 
    handleStartWorldBoss,
    handleNavigate,
    clockOffset
}) => {
    const {
        activeTab,
        setActiveTab,
        activeCategory,
        setActiveCategory,
        activeTier,
        setActiveTier,
        setInfoItem,
        setPreviewThemeId,
        previewAvatarData,
        setPreviewAvatarData,
        previewBannerData,
        setPreviewBannerData,
        isPreviewActive,
        onPreviewActionBlocked,
        setModal,
        handleEquip,
        handleUseItem,
        handleListOnMarket,
        canSpin,
        tradeInvites,
        activeTrade,
        setShowCombatHistory,
        marketFilter,
        setMarketFilter,
        setModalItem,
        setShowOrbShop
    } = useAppStore();

    switch (activeTab) {
        case 'profile':
            return <ProfilePanel
                gameState={displayedGameState}
                session={session}
                socket={socket}
                settings={settings}
                onShowInfo={setInfoItem}
                isMobile={isMobile}
                theme={theme}
                setTheme={handleSetTheme}
                onPreviewTheme={(id) => setPreviewThemeId(id)}
                previewAvatarData={previewAvatarData}
                onPreviewAvatar={setPreviewAvatarData}
                previewBannerData={previewBannerData}
                onPreviewBanner={(banner) => setPreviewBannerData(banner)}
                isPreviewActive={isPreviewActive}
                onPreviewActionBlocked={onPreviewActionBlocked}
                onTutorialComplete={handleTutorialStepComplete}
                onOpenRenameModal={() => setModal('rename', true)} 
            />;

        case 'skills_overview':
            return <SkillsOverview gameState={displayedGameState} onNavigate={handleNavigate} />;
        case 'town_overview':
            return <TownOverview
                onNavigate={handleNavigate}
                gameState={displayedGameState}
                canSpin={canSpin}
                onOpenDailySpin={() => setModal('dailySpin', true)}
                hasActiveTrade={tradeInvites?.length > 0 || !!activeTrade}
                isAnonymous={session?.user?.is_anonymous}
                onShowGuestModal={() => setModal('guest', true)}
                socket={socket}
            />;
        case 'combat_overview':
            return <CombatOverview gameState={displayedGameState} onNavigate={(tab) => setActiveTab(tab)} />;
        case 'gathering':
        case 'refining':
            return <GatheringPage />;
        case 'crafting':
            return <CraftingPage />;
        case 'inventory':
            return <InventoryPanel
                gameState={displayedGameState}
                socket={socket}
                settings={settings}
                onEquip={handleEquip}
                onShowInfo={setInfoItem}
                onListOnMarket={handleListOnMarket}
                onUse={handleUseItem}
                isMobile={isMobile}
                onSelectItem={(item) => {
                    if (displayedGameState?.state?.tutorialStep === 'SELECT_CHEST' && item?.id === 'NOOB_CHEST') {
                        handleTutorialStepComplete('OPEN_CHEST');
                    }
                }}
                isPreviewActive={isPreviewActive}
                onPreviewActionBlocked={onPreviewActionBlocked}
            />;
        case 'ranking':
            return <RankingPanel gameState={displayedGameState} isMobile={isMobile} socket={socket} onInspect={handleInspectPlayer} />;
        case 'rest_camp':
            return <RestPanel gameState={displayedGameState} isMobile={isMobile} socket={socket} />;
        case 'world_boss':
            return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <WorldBossPanel
                        socket={socket}
                        gameState={displayedGameState}
                        isMobile={isMobile}
                        onChallenge={handleStartWorldBoss}
                        onInspect={handleInspectPlayer}
                        onShowInfo={setInfoItem}
                        isPreviewActive={isPreviewActive}
                        onPreviewActionBlocked={onPreviewActionBlocked}
                    />
                </div>
            );
        case 'market':
            return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <MarketPanel
                        socket={socket}
                        gameState={displayedGameState}
                        silver={displayedGameState?.state?.silver || 0}
                        onShowInfo={setInfoItem}
                        onListOnMarket={handleListOnMarket}
                        isMobile={isMobile}
                        isAnonymous={session?.user?.is_anonymous}
                        filter={marketFilter}
                        onClearFilter={() => setMarketFilter(null)}
                        isPreviewActive={isPreviewActive}
                        onPreviewActionBlocked={onPreviewActionBlocked}
                    />
                </div>
            );
        case 'trade':
            return null;
        case 'taxometer':
            return <TaxometerPage />;
        case 'combat':
            return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <SkillProgressHeader tab="combat" category="COMBAT" />
                    <CombatPanel
                        socket={socket}
                        gameState={displayedGameState}
                        isMobile={isMobile}
                        onShowHistory={() => {
                            if (socket) socket.emit('get_combat_history');
                            setShowCombatHistory(true);
                        }}
                        serverTimeOffset={clockOffset}
                        isPreviewActive={isPreviewActive}
                        onPreviewActionBlocked={onPreviewActionBlocked}
                    />
                </div>
            );
        case 'dungeon':
            return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <SkillProgressHeader tab="dungeon" category="DUNGEONEERING" />
                    <DungeonPanel
                        socket={socket}
                        gameState={displayedGameState}
                        isMobile={isMobile}
                        serverTimeOffset={clockOffset}
                        isPreviewActive={isPreviewActive}
                        onPreviewActionBlocked={onPreviewActionBlocked}
                    />
                </div>
            );
        case 'merging':
            return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <SkillProgressHeader tab="merging" category={activeCategory} />
                    <div className="scroll-container" style={{ flex: 1, overflowY: 'auto' }}>
                        <RunePanel
                            gameState={displayedGameState}
                            onShowInfo={setInfoItem}
                            isMobile={isMobile}
                            socket={socket}
                            onListOnMarket={handleListOnMarket}
                            onOpenShop={() => setShowOrbShop(true)}
                            activeCategory={activeCategory}
                            onTutorialComplete={handleTutorialStepComplete}
                            isPreviewActive={isPreviewActive}
                            onPreviewActionBlocked={onPreviewActionBlocked}
                        />
                    </div>
                </div>
            );
        case 'guild':
            return (
                <GuildPanel
                    gameState={displayedGameState}
                    socket={socket}
                    isMobile={isMobile}
                    onInspect={handleInspectPlayer}
                />
            );
        default:
            return <div style={{ padding: 20, textAlign: 'center', color: '#555' }}>Select a category</div>;
    }
};
