import { XP_TABLE, calculateNextLevelXP } from './skills.js';

export const GUILD_XP_TABLE = XP_TABLE.map(xp => Math.floor(xp * 5));

export const calculateGuildNextLevelXP = (level) => {
    const xp = calculateNextLevelXP(level);
    if (xp === Infinity || xp === 999999999) return xp;
    return Math.floor(xp * 5);
};

export const UPGRADE_COSTS = {
    // Level corresponds to the NEXT level (the level you are upgrading TO)
    1: { silver: 200000, gp: 225, mats: 2000 },
    2: { silver: 500000, gp: 1800, mats: 5000 },
    3: { silver: 750000, gp: 3000, mats: 7500 },
    4: { silver: 1000000, gp: 4500, mats: 10000 },
    5: { silver: 1500000, gp: 6000, mats: 15000 },
    6: { silver: 2000000, gp: 7500, mats: 20000 },
    7: { silver: 2500000, gp: 8000, mats: 25000 },
    8: { silver: 5000000, gp: 10000, mats: 30000 },
    9: { silver: 7500000, gp: 13000, mats: 40000 },
    10: { silver: 10000000, gp: 19000, mats: 50000 }
};

export const GUILD_BUILDING_COLUMNS = [
    'library_level',
    'guild_hall_level',
    'gathering_xp_level',
    'gathering_duplic_level',
    'gathering_auto_level',
    'refining_xp_level',
    'refining_duplic_level',
    'refining_effic_level',
    'crafting_xp_level',
    'crafting_duplic_level',
    'crafting_effic_level'
];

export const calculateMaterialNeeds = (guild) => {
    const rawMaterials = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'];
    const tiers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const needs = {};

    tiers.forEach(t => {
        let countBelowTier = 0;
        GUILD_BUILDING_COLUMNS.forEach(col => {
            if ((guild[col] || 0) < t) {
                countBelowTier++;
            }
        });

        const amountPerBuilding = UPGRADE_COSTS[t]?.mats || 0;
        const totalNeededForTier = countBelowTier * amountPerBuilding;

        rawMaterials.forEach(mat => {
            const itemId = `T${t}_${mat}`;
            needs[itemId] = totalNeededForTier;
        });
    });

    return needs;
};

// Cumulative bonus % for each station path level
export const STATION_BONUS_TABLE = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 5,
    5: 7,
    6: 9,
    7: 11,
    8: 13,
    9: 16,
    10: 20
};

export const GUILD_BUILDINGS = {
    GUILD_HALL: {
        name: 'Guild Hall',
        description: 'Increases the maximum number of members in the guild.',
        maxLevel: 10
    },
    LIBRARY: {
        name: 'Library',
        description: 'Unlocks and improves Guild Tasks. Level 1 is required to start receiving tasks.',
        maxLevel: 10,
        column: 'library_level'
    },
    GATHERING_STATION: {
        name: 'Gathering Station',
        description: 'Provides global bonuses to all gathering activities.',
        maxLevel: 10,
        paths: {
            XP: {
                name: 'Experience focus',
                column: 'gathering_xp_level',
                suffix: '% XP'
            },
            DUPLIC: {
                name: 'Duplication focus',
                column: 'gathering_duplic_level',
                suffix: '% Double'
            },
            AUTO: {
                name: 'Processing focus',
                column: 'gathering_auto_level',
                suffix: '% Auto Refine'
            }
        }
    },
    REFINING_STATION: {
        name: 'Refining Station',
        description: 'Provides global bonuses to all refining activities.',
        maxLevel: 10,
        paths: {
            XP: {
                name: 'Experience focus',
                column: 'refining_xp_level',
                suffix: '% XP'
            },
            DUPLIC: {
                name: 'Duplication focus',
                column: 'refining_duplic_level',
                suffix: '% Double'
            },
            EFFICIENCY: {
                name: 'Efficiency focus',
                column: 'refining_effic_level',
                suffix: '% Efficiency'
            }
        }
    },
    CRAFTING_STATION: {
        name: 'Crafting Station',
        description: 'Provides global bonuses to all crafting activities.',
        maxLevel: 10,
        paths: {
            XP: {
                name: 'Experience focus',
                column: 'crafting_xp_level',
                suffix: '% XP'
            },
            DUPLIC: {
                name: 'Duplication focus',
                column: 'crafting_duplic_level',
                suffix: '% Double'
            },
            EFFICIENCY: {
                name: 'Efficiency focus',
                column: 'crafting_effic_level',
                suffix: '% Efficiency'
            }
        }
    }
};

export const GUILD_TASKS_CONFIG = {
    MAX_TASKS: 13,
    ITEMS_REQUIRED: 250,
    POOLS: {
        RAW: ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'],
        REFINED: ['PLANK', 'BAR', 'LEATHER', 'CLOTH', 'EXTRACT']
    },
    REWARDS: {
        XP_TABLE: {
            0: 0,
            1: 50,
            2: 250,
            3: 700,
            4: 1500,
            5: 4000,
            6: 7000,
            7: 11000,
            8: 20000,
            9: 80000,
            10: 155500
        },
        GP_TABLE: {
            0: 0,
            1: 17,
            2: 29,
            3: 40,
            4: 52,
            5: 63,
            6: 81,
            7: 104,
            8: 133,
            9: 167,
            10: 202
        }
    },
    SCALING: {
        ITEMS_PER_LEVEL: 250
    }
};

export { XP_TABLE };
