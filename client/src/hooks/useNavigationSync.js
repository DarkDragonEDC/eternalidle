import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ITEMS } from '@shared/items';
import { useAppStore } from '../store/useAppStore';

export function useNavigationSync(
    selectedCharacter,
    activeTab,
    setActiveTab,
    setActiveCategory,
    setActiveTier,
    setModalItem,
    setModal
) {
    const location = useLocation();
    const navigate = useNavigate();

    const { session } = useAppStore();

    // Unified Navigation Synchronization
    useEffect(() => {
        // 1. If no session, force URL to root (unless it's privacy policy)
        // This prevents stale URLs like /skills_overview from persisting on the landing page
        if (!session && location.pathname !== '/' && !location.pathname.startsWith('/privacy')) {
            navigate('/', { replace: true });
            return;
        }

        if (!selectedCharacter) return;
        if (location.pathname.startsWith('/privacy')) return;

        const urlTab = location.pathname.substring(1);
        const storeTab = activeTab;
        const validTabs = [
            'world_boss', 'combat', 'dungeon', 'market', 'guild', 'ranking', 
            'taxometer', 'rest_camp', 'gathering', 'refining', 'crafting', 
            'merging', 'inventory', 'profile', 'skills_overview', 'town_overview', 'combat_overview', 'village'
        ];

        // 1. URL has a valid tab -> Sync to Store
        if (urlTab && validTabs.includes(urlTab)) {
            if (urlTab !== storeTab) {
                setActiveTab(urlTab);
            }
        } 
        // 2. State has a tab that doesn't match URL -> Sync to URL
        else if (storeTab && validTabs.includes(storeTab) && `/${storeTab}` !== location.pathname) {
            navigate(`/${storeTab}`, { replace: true });
        }
        // 3. Fallback for root or invalid URL
        else if (!urlTab || !validTabs.includes(urlTab)) {
            if (location.pathname === '/' || location.pathname === '') {
                navigate(`/${storeTab || 'inventory'}`, { replace: true });
            }
        }
    }, [location.pathname, activeTab, selectedCharacter, navigate, setActiveTab, session]);

    const handleNavigate = useCallback((itemId, category = null) => {
        const validTabs = ['world_boss', 'combat', 'dungeon', 'market', 'guild', 'ranking', 'taxometer', 'rest_camp', 'gathering', 'refining', 'crafting', 'merging', 'inventory', 'profile', 'skills_overview', 'town_overview', 'combat_overview', 'village'];
        
        if (validTabs.includes(itemId)) {
            if (itemId === 'merging' && !category) category = 'RUNE';
            navigate(`/${itemId}`);
            if (category) setActiveCategory(category);
            return;
        }

        if (itemId === 'trade') {
            setModal('social', true);
            return;
        }

        // Search in items
        const categories = [
            { type: 'gathering', data: ITEMS.RAW },
            { type: 'refining', data: ITEMS.REFINED },
            { type: 'crafting', data: ITEMS.GEAR, isGear: true }
        ];

        for (const { type, data, isGear } of categories) {
            if (isGear) {
                for (const [station, types] of Object.entries(data)) {
                    for (const [, tiers] of Object.entries(types)) {
                        for (const [t, item] of Object.entries(tiers)) {
                            if (item.id === itemId) {
                                navigate('/crafting');
                                setActiveCategory(station);
                                setActiveTier(Number(t));
                                setModalItem(null);
                                return;
                            }
                        }
                    }
                }
            } else {
                for (const [cat, tiers] of Object.entries(data)) {
                    for (const [t, item] of Object.entries(tiers)) {
                        if (item.id === itemId) {
                            navigate(`/${type}`);
                            setActiveCategory(cat);
                            setActiveTier(Number(t));
                            setModalItem(null);
                            return;
                        }
                    }
                }
            }
        }
    }, [navigate, setActiveCategory, setActiveTier, setModalItem, setModal]);

    const handleSetActiveTab = useCallback((tab) => {
        navigate(`/${tab}`);
    }, [navigate]);

    return { handleNavigate, handleSetActiveTab };
}
