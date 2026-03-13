import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

// Modal imports
import ActivityModal from './ActivityModal';
import ItemInfoModal from './ItemInfoModal';
import MarketListingModal from './MarketListingModal';
import CombatHistoryModal from './CombatHistoryModal';
import LootModal from './LootModal';
import OfflineGainsModal from './OfflineGainsModal';
import DailySpinModal from './DailySpinModal';
import SocialPanel from './SocialPanel';
import InspectModal from './InspectModal';
import GuildProfileModal from './GuildProfileModal';
import LeaderboardModal from './LeaderboardModal';
import RenameModal from './RenameModal';
import OrbShop from './OrbShop';
import SettingsModal from './SettingsModal';
import TradePanel from './TradePanel';
import { GuestRestrictionModal } from './AppOverlays';
import GuildXPInfoModal from './guild/GuildXPInfoModal';

export const AppModals = ({ 
    displayedGameState, 
    handleNavigate, 
    handleSearchInMarket, 
    handleInspectPlayer, 
    handleTradeInvite, 
    handleOpenTrade,
    handleCloseInspect,
    handleInspectMessage,
    handleItemClick,
    handleRenameSubmit,
    clockOffset
}) => {
    const {
        socket,
        session,
        modals,
        setModal,
        modalItem,
        setModalItem,
        modalType,
        infoItem,
        setInfoItem,
        marketSellItem,
        setMarketSellItem,
        showCombatHistory,
        setShowCombatHistory,
        lootModalData,
        setLootModalData,
        offlineGains,
        setOfflineGains,
        acknowledgeOfflineReport,
        tradeInvites,
        activeTrade,
        setActiveTrade,
        inspectData,
        inspectGuildId,
        setInspectGuildId,
        showLeaderboard,
        setShowLeaderboard,
        confirmModal,
        setConfirmModal,
        setIsRenameModalOpen,
        settings,
        updateSettings,
        isMobile,
        isPreviewActive,
        onPreviewActionBlocked,
        showGuildXPInfo,
        setShowGuildXPInfo,
        serverError,
        setServerError,
        startActivity
    } = useAppStore();

    const isGoogleLinked = session?.user?.app_metadata?.providers?.includes('google') ||
        session?.user?.identities?.some(id => id.provider === 'google');

    return (
        <>
            {modalItem && (
                <ActivityModal
                    isOpen={!!modalItem}
                    onClose={() => setModalItem(null)}
                    item={modalItem}
                    type={modalType}
                    gameState={displayedGameState}
                    onStart={startActivity}
                    onNavigate={handleNavigate}
                    onSearchInMarket={handleSearchInMarket}
                />
            )}

            <ItemInfoModal item={infoItem} onClose={() => setInfoItem(null)} />
            
            {marketSellItem && (
                <MarketListingModal
                    listingItem={marketSellItem}
                    onClose={() => setMarketSellItem(null)}
                    socket={socket}
                />
            )}

            <CombatHistoryModal
                isOpen={showCombatHistory}
                onClose={() => setShowCombatHistory(false)}
                socket={socket}
            />

            <AnimatePresence>
                {lootModalData && (
                    <LootModal
                        isOpen={!!lootModalData}
                        rewards={lootModalData}
                        onClose={() => setLootModalData(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {(offlineGains || displayedGameState?.offlineReport) && (
                    <OfflineGainsModal
                        isOpen={!!(offlineGains || displayedGameState?.offlineReport)}
                        data={offlineGains || displayedGameState?.offlineReport}
                        onClose={() => acknowledgeOfflineReport()}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modals.dailySpin && (
                    <DailySpinModal
                        isOpen={modals.dailySpin}
                        onClose={() => setModal('dailySpin', false)}
                        socket={socket}
                        gameState={displayedGameState}
                    />
                )}
            </AnimatePresence>

            <SocialPanel
                isOpen={modals.social}
                onClose={() => setModal('social', false)}
                session={session}
                socket={socket}
                onInspect={handleInspectPlayer}
                onInvite={handleTradeInvite}
                onOpenTrade={handleOpenTrade}
                tradeInvites={tradeInvites}
            />

            {inspectData && (
                <InspectModal
                    data={inspectData}
                    onClose={handleCloseInspect}
                    onMessage={handleInspectMessage}
                    onItemClick={handleItemClick}
                    onInspectGuild={(id) => setInspectGuildId(id)}
                />
            )}

            <GuildProfileModal
                isOpen={!!inspectGuildId}
                onClose={() => setInspectGuildId(null)}
                guildId={inspectGuildId}
                socket={socket}
                onInspect={handleInspectPlayer}
                isMobile={isMobile}
            />

            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                socket={socket}
            />

            <AnimatePresence>
                {confirmModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10000, padding: '20px'
                    }} onClick={confirmModal.onCancel || (() => setConfirmModal(null))}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'var(--panel-bg)', border: '1px solid var(--border-active)',
                                borderRadius: '16px', padding: '25px', maxWidth: '400px', width: '100%',
                                textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                            }}
                        >
                            <h3 style={{ margin: '0 0 15px', color: 'var(--text-main)' }}>Confirm Action</h3>
                            <p style={{ color: 'var(--text-dim)', marginBottom: '25px', lineHeight: '1.5' }}>{confirmModal.message}</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={confirmModal.onCancel || (() => setConfirmModal(null))} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                                <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>Confirm</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modals?.rename && (
                    <RenameModal
                        isOpen={modals?.rename}
                        onClose={() => setIsRenameModalOpen(false)}
                        onSubmit={handleRenameSubmit}
                        currentName={displayedGameState?.name}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modals?.guest && (
                    <GuestRestrictionModal onClose={() => setModal('guest', false)} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modals?.orbShop && (
                    <OrbShop
                        isOpen={modals?.orbShop}
                        onClose={() => setModal('orbShop', false)}
                        socket={socket}
                        gameState={displayedGameState}
                        serverTimeOffset={clockOffset}
                        isPreviewActive={isPreviewActive}
                        onPreviewActionBlocked={onPreviewActionBlocked}
                        isMobile={isMobile}
                        isAnonymous={session?.user?.is_anonymous}
                        onShowGuestModal={() => setModal('guest', true)}
                    />
                )}
            </AnimatePresence>

            <SettingsModal
                isOpen={modals?.settings}
                onClose={() => setModal('settings', false)}
                settings={settings}
                setSettings={updateSettings}
                session={session}
                isGoogleLinked={isGoogleLinked}
                socket={socket}
            />

            <AnimatePresence>
                {activeTrade && (
                    <TradePanel
                        socket={socket}
                        trade={activeTrade}
                        charId={useAppStore.getState().selectedCharacter}
                        inventory={displayedGameState?.state?.inventory}
                        currentSilver={displayedGameState?.state?.silver}
                        onClose={() => setActiveTrade(null)}
                        onInspect={handleInspectPlayer}
                        isMobile={isMobile}
                        isPreviewActive={isPreviewActive}
                        onPreviewActionBlocked={onPreviewActionBlocked}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {serverError && (
                    <div key="server-error-backdrop" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 10000, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', background: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(5px)'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                background: 'var(--panel-bg)',
                                border: '1px solid #ff4444',
                                borderRadius: '16px',
                                padding: '30px',
                                width: '90%',
                                maxWidth: '400px',
                                textAlign: 'center',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                position: 'relative'
                            }}
                        >
                            <div style={{
                                width: '60px', height: '60px',
                                background: 'rgba(255, 68, 68, 0.1)',
                                borderRadius: '50%', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px', border: '1px solid rgba(255, 68, 68, 0.2)'
                            }}>
                                <X color="#ff4444" size={32} />
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '900', marginBottom: '10px' }}>SYSTEM ERROR</h2>
                            <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '25px' }}>
                                {serverError}
                            </p>
                            <button
                                onClick={() => setServerError(null)}
                                style={{
                                    width: '100%', padding: '12px', background: '#ff4444',
                                    border: 'none', borderRadius: '8px', color: '#fff',
                                    fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                CLOSE
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <GuildXPInfoModal 
                isOpen={showGuildXPInfo} 
                onClose={() => setShowGuildXPInfo(false)} 
            />
        </>
    );
};
