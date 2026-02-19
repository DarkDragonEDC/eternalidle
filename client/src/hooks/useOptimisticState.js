import { useState, useEffect, useRef } from 'react';
import { calculateNextLevelXP } from '@shared/skills';

const getSkillKey = (type, itemId) => {
    if (type === 'GATHERING') {
        if (itemId.includes('WOOD')) return 'LUMBERJACK';
        if (itemId.includes('ORE')) return 'ORE_MINER';
        if (itemId.includes('HIDE')) return 'ANIMAL_SKINNER';
        if (itemId.includes('FIBER')) return 'FIBER_HARVESTER';
        if (itemId.includes('FISH')) return 'FISHING';
    }
    if (type === 'REFINING') {
        if (itemId.includes('PLANK')) return 'PLANK_REFINER';
        if (itemId.includes('BAR')) return 'METAL_BAR_REFINER';
        if (itemId.includes('LEATHER')) return 'LEATHER_REFINER';
        if (itemId.includes('CLOTH')) return 'CLOTH_REFINER';
    }
    if (type === 'CRAFTING') {
        if (itemId.includes('SWORD') || itemId.includes('PLATE') || itemId.includes('PICKAXE') || itemId.includes('SHEATH')) return 'WARRIOR_CRAFTER';
        if (itemId.includes('BOW') || itemId.includes('LEATHER') || itemId.includes('AXE') || itemId.includes('TORCH')) return 'HUNTER_CRAFTER';
        if (itemId.includes('STAFF') || itemId.includes('CLOTH') || itemId.includes('SICKLE') || itemId.includes('TOME')) return 'MAGE_CRAFTER';
        if (itemId.includes('FOOD')) return 'COOKING';
        if (itemId.includes('CAPE')) return 'WARRIOR_CRAFTER';
    }
    return null;
};

const addItemToInventory = (state, itemId, amount) => {
    if (!state || !state.state) return; // Guard clause
    if (!state.state.inventory) state.state.inventory = {};
    const inv = state.state.inventory;
    inv[itemId] = (inv[itemId] || 0) + amount;
    if (inv[itemId] <= 0) delete inv[itemId];
};

const consumeItems = (state, req) => {
    if (!req || !state || !state.state || !state.state.inventory) return; // Guard clause
    const inv = state.state.inventory;
    Object.entries(req).forEach(([id, amount]) => {
        if (inv[id]) {
            inv[id] -= amount;
            if (inv[id] <= 0) delete inv[id];
        }
    });
};

const addXP = (state, skillKey, amount) => {
    if (!state || !state.state || !state.state.skills) return; // Guard clause
    if (!skillKey || !state.state.skills[skillKey]) return;
    const skill = state.state.skills[skillKey];
    skill.xp += amount;

    let nextLevelXP = calculateNextLevelXP(skill.level);
    while (skill.xp >= nextLevelXP && skill.level < 100) {
        skill.level++;
        skill.xp -= nextLevelXP;
        nextLevelXP = calculateNextLevelXP(skill.level);
    }
};

export function useOptimisticState(authoritativeState) {
    const [localState, setLocalState] = useState(authoritativeState);
    const clockOffset = useRef(0);

    useEffect(() => {
        if (authoritativeState) {
            setLocalState(authoritativeState);
            if (authoritativeState.serverTime) {
                clockOffset.current = authoritativeState.serverTime - Date.now();
            }
        }
    }, [authoritativeState]);

    useEffect(() => {
        if (!localState || !localState.current_activity) return;

        // Note: We removed the optimistic data prediction (XP/Items) 
        // to avoid visual rollbacks and keep the UI perfectly synced with the server.
        // The bars are now static and jumps only when server confirms progress.
    }, [localState?.current_activity?.next_action_at]);

    // Simulação de Combate (Simple HP prediction)
    useEffect(() => {
        if (!localState || !localState.state?.combat) return;

        // Removed visual HP prediction to keep authoritative state sync
    }, [localState?.state?.combat]);

    return localState;
}
