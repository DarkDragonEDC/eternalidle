import { XP_TABLE, calculateNextLevelXP } from './skills.js';

export const calculateGuildNextLevelXP = (level) => {
    return calculateNextLevelXP(level);
};

// Re-export if needed, or just use skills.js directly
export { XP_TABLE };
