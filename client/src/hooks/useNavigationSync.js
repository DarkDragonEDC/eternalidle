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
        // console.log('[NAV] Sync Check:', { path: location.pathname, storeTab: activeTab, selectedCharacter, hasSession: !!session });

        // 1. If no session, force URL to root
        if (!session) {
            if (location.pathname !== '/' && !location.pathname.startsWith('/privacy')) {
                navigate('/', { replace: true });
            }
            return;
        }

        // 2. If no selected character, stay on / (character selection)
        if (!selectedCharacter) {
            if (location.pathname !== '/' && !location.pathname.startsWith('/privacy')) {
                navigate('/', { replace: true });
            }
            return;
        }

        if (location.pathname.startsWith('/privacy')) return;

        const pathSegments = location.pathname.substring(1).split('/');
        const urlTab = pathSegments[0];
        const storeTab = activeTab;
        const validTabs = [
            'world_boss', 'combat', 'dungeon', 'market', 'guild', 'ranking', 
            'taxometer', 'rest_camp', 'gathering', 'refining', 'crafting', 
            'merging', 'inventory', 'profile', 'skills_overview', 'town_overview', 'combat_overview', 'village'
        ];

        // 3. Root path with character selected -> Go to activeTab or inventory
        if (location.pathname === '/' || location.pathname === '') {
            const target = storeTab && validTabs.includes(storeTab) ? storeTab : 'inventory';
            navigate(`/${target}`, { replace: true });
            return;
        }

        // 4. URL has a valid tab -> Sync to Store
        if (urlTab && validTabs.includes(urlTab)) {
            if (urlTab !== storeTab) {
                console.log(`[NAV] Syncing storeTab: ${storeTab} -> ${urlTab}`);
                setActiveTab(urlTab);
            }
        } 
        // 5. State has a tab that doesn't match URL -> Sync to URL
        else if (storeTab && validTabs.includes(storeTab)) {
            const targetPath = `/${storeTab}`;
            if (location.pathname !== targetPath) {
                console.log(`[NAV] Syncing URL: ${location.pathname} -> ${targetPath}`);
                navigate(targetPath, { replace: true });
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
