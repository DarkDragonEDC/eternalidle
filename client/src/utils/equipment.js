import { resolveItem, calculateRuneBonus } from '@shared/items';

/**
 * Checks if a candidate item is better than the currently equipped item.
 * @param {Object} candidate - The item from inventory to check.
 * @param {Object} current - The currently equipped item.
 * @returns {Boolean}
 */
export const isBetterItem = (candidate, current) => {
    if (!candidate) return false;
    if (!current) return true;

    // Resolve current if it's just a raw object with ID
    const resolvedCurrent = current.name ? current : { ...resolveItem(current.id || current.item_id), ...current };

    // Rune Special Comparison
    if (candidate.type === 'RUNE' && resolvedCurrent.type === 'RUNE') {
        const cVal = calculateRuneBonus(candidate.tier || 1, candidate.stars || 1);
        const curVal = calculateRuneBonus(resolvedCurrent.tier || 1, resolvedCurrent.stars || 1);
        if (cVal > curVal) return true;
        if (cVal === curVal) {
            // If bonus is equal, prioritize tier
            return (candidate.tier || 1) > (resolvedCurrent.tier || 1);
        }
        return false;
    }

    // 1. Tier - Dominant factor due to exponential scaling
    const cTier = candidate.tier || 0;
    const curTier = resolvedCurrent.tier || 0;
    if (cTier > curTier) return true;
    if (cTier < curTier) return false;

    // 2. IP (Within same tier, higher quality usually means higher IP)
    const cIp = candidate.ip || 0;
    const curIp = resolvedCurrent.ip || 0;
    if (cIp > curIp) return true;
    if (cIp < curIp) return false;

    // 3. Quality/Stars (Fallback)
    const cQual = candidate.quality || candidate.stars || 0;
    const curQual = resolvedCurrent.quality || resolvedCurrent.stars || 0;
    if (cQual > curQual) return true;

    return false;
};

/**
 * Finds the best item in the inventory for a specific slot.
 * @param {String} slot - The equipment slot (e.g., 'mainHand', 'rune_WOOD_XP').
 * @param {Object} inventory - The character's inventory.
 * @returns {Object|null} - The best item or null.
 */
export const getBestItemForSlot = (slot, inventory) => {
    const candidates = [];

    Object.entries(inventory).forEach(([itemId, qty]) => {
        if (qty <= 0) return;
        const item = resolveItem(itemId);
        if (!item) return;

        let matches = false;
        if (slot.startsWith('rune_')) {
            const parts = slot.split('_');
            const targetAct = parts[1];
            const targetEff = parts[2];

            if (item.type === 'RUNE') {
                const itemMatch = itemId.match(/^T\d+_RUNE_(.+)_(\d+)STAR$/);
                if (itemMatch) {
                    const runeKey = itemMatch[1];
                    const runeParts = runeKey.split('_');
                    if (runeParts[0] === targetAct && runeParts[1] === targetEff) {
                        matches = true;
                    }
                }
            }
        } else {
            switch (slot) {
                case 'cape': matches = item.type === 'CAPE'; break;
                case 'helmet': case 'head': matches = item.type === 'HELMET'; break;
                case 'tool_axe': matches = item.type === 'TOOL_AXE'; break;
                case 'tool_pickaxe': matches = item.type === 'TOOL_PICKAXE'; break;
                case 'tool_knife': matches = item.type === 'TOOL_KNIFE'; break;
                case 'tool_sickle': matches = item.type === 'TOOL_SICKLE'; break;
                case 'tool_rod': matches = item.type === 'TOOL_ROD'; break;
                case 'tool_pouch': matches = item.type === 'TOOL_POUCH'; break;
                case 'gloves': matches = item.type === 'GLOVES'; break;
                case 'chest': matches = item.type === 'ARMOR'; break;
                case 'offHand': matches = item.type === 'OFF_HAND'; break;
                case 'mainHand': matches = item.type === 'WEAPON'; break;
                case 'boots': case 'shoes': matches = item.type === 'BOOTS'; break;
                case 'food': matches = item.type === 'FOOD'; break;
                default: matches = false;
            }
        }

        if (matches) {
            candidates.push({ ...item, id: itemId });
        }
    });

    if (candidates.length === 0) return null;

    // Sort by: Tier desc, IP desc, Quality desc
    candidates.sort((a, b) => {
        // Special sort for Runes using calculated bonus
        if (a.type === 'RUNE' && b.type === 'RUNE') {
            const bVal = calculateRuneBonus(b.tier || 1, b.stars || 1);
            const aVal = calculateRuneBonus(a.tier || 1, a.stars || 1);
            if (bVal !== aVal) return bVal - aVal;
            return (b.tier || 0) - (a.tier || 0);
        }

        if ((b.tier || 0) !== (a.tier || 0)) return (b.tier || 0) - (a.tier || 0);
        if ((b.ip || 0) !== (a.ip || 0)) return (b.ip || 0) - (a.ip || 0);
        const bQual = b.quality || b.stars || 0;
        const aQual = a.quality || a.stars || 0;
        return bQual - aQual;
    });

    return candidates[0];
};
