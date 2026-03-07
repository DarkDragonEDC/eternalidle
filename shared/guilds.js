import { XP_TABLE, calculateNextLevelXP } from './skills.js';

export const GUILD_XP_TABLE = XP_TABLE.map(xp => Math.floor(xp * 10));

export const calculateGuildNextLevelXP = (level) => {
    const xp = calculateNextLevelXP(level);
    if (xp === Infinity || xp === 999999999) return xp;
    return Math.floor(xp * 10);
};

export const GUILD_BUILDINGS = {
    GUILD_HALL: {
        name: 'Guild Hall',
        description: 'Increases the maximum number of members in the guild.',
        maxLevel: 10,
        baseSilverCost: 50000,
        perLevelSilverCost: 50000,
        baseGPCost: 100,
        perLevelGPCost: 100,
        baseMaterialCost: 1000
    },
    GATHERING_STATION: {
        name: 'Gathering Station',
        description: 'Provides global bonuses to all gathering activities.',
        maxLevel: 10,
        baseSilverCost: 50000,
        perLevelSilverCost: 50000,
        baseGPCost: 100,
        perLevelGPCost: 100,
        baseMaterialCost: 1000,
        paths: {
            XP: {
                name: 'Experience focus',
                column: 'gathering_xp_level',
                bonusPerLevel: 1, // 1% per level
                suffix: '% XP'
            },
            DUPLIC: {
                name: 'Duplication focus',
                column: 'gathering_duplic_level',
                bonusPerLevel: 1, // 1% per level
                suffix: '% Double'
            },
            AUTO: {
                name: 'Processing focus',
                column: 'gathering_auto_level',
                bonusPerLevel: 1, // 1% per level
                suffix: '% Auto'
            }
        }
    },
    REFINING_STATION: {
        name: 'Refining Station',
        description: 'Provides global bonuses to all refining activities.',
        maxLevel: 10,
        baseSilverCost: 50000,
        perLevelSilverCost: 50000,
        baseGPCost: 100,
        perLevelGPCost: 100,
        baseMaterialCost: 1000,
        paths: {
            XP: {
                name: 'Experience focus',
                column: 'refining_xp_level',
                bonusPerLevel: 1, // 1% per level
                suffix: '% XP'
            },
            DUPLIC: {
                name: 'Duplication focus',
                column: 'refining_duplic_level',
                bonusPerLevel: 1, // 1% per level
                suffix: '% Double'
            },
            EFFICIENCY: {
                name: 'Efficiency focus',
                column: 'refining_effic_level',
                bonusPerLevel: 1, // 1% per level
                suffix: '% Efficiency'
            }
        }
    },
    CRAFTING_STATION: {
        name: 'Crafting Station',
        description: 'Provides global bonuses to all crafting activities.',
        maxLevel: 10,
        baseSilverCost: 50000,
        perLevelSilverCost: 50000,
        baseGPCost: 100,
        perLevelGPCost: 100,
        baseMaterialCost: 1000,
        paths: {
            XP: {
                name: 'Experience focus',
                column: 'crafting_xp_level',
                bonusPerLevel: 1, // 1% per level
                suffix: '% XP'
            },
            DUPLIC: {
                name: 'Duplication focus',
                column: 'crafting_duplic_level',
                bonusPerLevel: 1, // 1% per level
                suffix: '% Double'
            },
            EFFICIENCY: {
                name: 'Efficiency focus',
                column: 'crafting_effic_level',
                bonusPerLevel: 1, // 1% per level
                suffix: '% Efficiency'
            }
        }
    }
};

export const GUILD_TASKS_CONFIG = {
    MAX_TASKS: 2,
    ITEMS_REQUIRED: 250,
    POOLS: {
        RAW: ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'],
        REFINED: ['PLANK', 'BAR', 'LEATHER', 'CLOTH', 'EXTRACT']
    },
    REWARDS: {
        XP: 500,
        GP: 10 // Guild Points
    }
};

export { XP_TABLE };
