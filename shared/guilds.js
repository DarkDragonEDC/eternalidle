import { XP_TABLE, calculateNextLevelXP } from './skills.js';

export const GUILD_XP_TABLE = XP_TABLE.map(xp => Math.floor(xp * 10));

export const calculateGuildNextLevelXP = (level) => {
    const xp = calculateNextLevelXP(level);
    if (xp === Infinity || xp === 999999999) return xp;
    return Math.floor(xp * 10);
};

// Re-export if needed, or just use skills.js directly
export { XP_TABLE };
