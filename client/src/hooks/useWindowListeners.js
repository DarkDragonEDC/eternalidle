import { useEffect } from 'react';

/**
 * Custom hook to handle window-level listeners such as keyboard shortcuts and resizing.
 */
export function useWindowListeners({
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
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setModalItem(null);
                setInfoItem(null);
                setMarketSellItem(null);
                setOfflineGains(null);
                setSidebarOpen(false);
                setModal('notifications', false);
                setShowCombatHistory(false);
                setShowLeaderboard(false);
                setModal('currencyDropdown', false);
                setInspectData(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        setModalItem, 
        setInfoItem, 
        setMarketSellItem, 
        setOfflineGains, 
        setSidebarOpen, 
        setModal, 
        setShowCombatHistory, 
        setShowLeaderboard, 
        setInspectData
    ]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setSidebarOpen(false);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [setIsMobile, setSidebarOpen]);
}
