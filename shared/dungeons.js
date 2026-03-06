export const DUNGEONS = {
    1: {
        id: 'DUNGEON_T1',
        name: 'Goblin Cave',
        tier: 1,
        reqItem: 'T1_DUNGEON_MAP',
        bossId: 'WILD_HOG',
        trashMobs: ['RABBIT', 'GOBLIN_SCOUT', 'FOX', 'SNAKE'],
        rewards: {
            xp: 120,
            resource: { id: 'T1_ORE', chance: 0.50, min: 5, max: 10 },
            crest: { id: 'T1_CREST', chance: 0.25 }
        },
        entrySilver: 200,
        reqIP: 150,
    },
    2: {
        id: 'DUNGEON_T2',
        name: 'Wolf Den',
        tier: 2,
        reqItem: 'T2_DUNGEON_MAP',
        bossId: 'WOLF',
        trashMobs: ['DIRE_RAT', 'STAG', 'MOUNTAIN_GOAT', 'BANDIT_THUG'],
        rewards: {
            xp: 180,
            resource: { id: 'T2_WOOD', chance: 0.50, min: 5, max: 10 },
            crest: { id: 'T2_CREST', chance: 0.25 }
        },
        entrySilver: 500,
        reqIP: 250,
    },
    3: {
        id: 'DUNGEON_T3',
        name: 'Bear Cave',
        tier: 3,
        reqItem: 'T3_DUNGEON_MAP',
        bossId: 'BEAR',
        trashMobs: ['MOUNTAIN_GOBLIN', 'HIGHLAND_COW', 'HARPY', 'ROGUE_KNIGHT'],
        rewards: {
            xp: 240,
            resource: { id: 'T3_HIDE', chance: 0.50, min: 5, max: 10 },
            crest: { id: 'T3_CREST', chance: 0.25 }
        },
        entrySilver: 1000,
        reqIP: 350,
    },
    4: {
        id: 'DUNGEON_T4',
        name: 'Undead Crypt',
        tier: 4,
        reqItem: 'T4_DUNGEON_MAP',
        bossId: 'DIRE_WOLF',
        trashMobs: ['GHOST_KNIGHT', 'SNOW_LEOPARD', 'GIANT_EAGLE', 'ASH_GHOUL'],
        rewards: {
            xp: 315,
            resource: { id: 'T4_BAR', chance: 0.50, min: 3, max: 8 },
            crest: { id: 'T4_CREST', chance: 0.25 }
        },
        entrySilver: 2500,
        reqIP: 450,
    },
    5: {
        id: 'DUNGEON_T5',
        name: 'Ogre Fortress',
        tier: 5,
        reqItem: 'T5_DUNGEON_MAP',
        bossId: 'OGRE',
        trashMobs: ['SWAMP_HYRA', 'POLAR_BEAR', 'MOUNTAIN_TROLL', 'BANDIT_LEADER'],
        rewards: {
            xp: 396,
            resource: { id: 'T5_HIDE', chance: 0.50, min: 3, max: 8 },
            crest: { id: 'T5_CREST', chance: 0.25 }
        },
        entrySilver: 5000,
        reqIP: 550,
    },
    6: {
        id: 'DUNGEON_T6',
        name: 'Troll Mountain',
        tier: 6,
        reqItem: 'T6_DUNGEON_MAP',
        bossId: 'TROLL',
        trashMobs: ['BASILISK', 'IRON_GOLEM', 'WYVERN', 'CHIMERA'],
        rewards: {
            xp: 480,
            resource: { id: 'T6_ORE', chance: 0.50, min: 3, max: 8 },
            crest: { id: 'T6_CREST', chance: 0.25 }
        },
        entrySilver: 10000,
        reqIP: 650,
    },
    7: {
        id: 'DUNGEON_T7',
        name: 'Dragon Nest',
        tier: 7,
        reqItem: 'T7_DUNGEON_MAP',
        bossId: 'DRAGON',
        trashMobs: ['HYDRA', 'PHOENIX', 'CYCLOPS', 'GIANT'],
        rewards: {
            xp: 565,
            resource: { id: 'T7_HIDE', chance: 0.50, min: 2, max: 6 },
            crest: { id: 'T7_CREST', chance: 0.25 }
        },
        entrySilver: 20000,
        reqIP: 750,
    },
    8: {
        id: 'DUNGEON_T8',
        name: 'Ancient Ruins',
        tier: 8,
        reqItem: 'T8_DUNGEON_MAP',
        bossId: 'ANCIENT_GOLEM',
        trashMobs: ['UNDEAD_KNIGHT', 'BANSHEE', 'VAMPIRE', 'WEREWOLF'],
        rewards: {
            xp: 652,
            resource: { id: 'T8_ORE', chance: 0.50, min: 2, max: 6 },
            crest: { id: 'T8_CREST', chance: 0.25 }
        },
        entrySilver: 40000,
        reqIP: 850,
    },
    9: {
        id: 'DUNGEON_T9',
        name: 'Demon Realm',
        tier: 9,
        reqItem: 'T9_DUNGEON_MAP',
        bossId: 'ELDER_DRAGON',
        trashMobs: ['PIT_FIEND', 'SUCCUBUS', 'HELLHOUND', 'IMP'],
        rewards: {
            xp: 740,
            resource: { id: 'T9_BAR', chance: 0.50, min: 2, max: 5 },
            crest: { id: 'T9_CREST', chance: 0.25 }
        },
        entrySilver: 100000,
        reqIP: 950,
    },
    10: {
        id: 'DUNGEON_T10',
        name: 'Void Dimension',
        tier: 10,
        reqItem: 'T10_DUNGEON_MAP',
        bossId: 'ANCIENT_DRAGON',
        trashMobs: ['VOID_WALKER', 'VOID_REAPER', 'VOID_MAGE', 'VOID_CENTURION'],
        rewards: {
            xp: 830,
            resource: { id: 'T10_BAR', chance: 0.50, min: 2, max: 5 },
            crest: { id: 'T10_CREST', chance: 0.25 }
        },
        entrySilver: 500000,
        reqIP: 1050,
    },
};

export const FOOD_COST_MATRIX = {
    1: [10, 5, 3, 3, 2, 2, 1, 1, 1, 1],
    2: [20, 10, 7, 5, 4, 3, 3, 3, 2, 2],
    3: [30, 15, 10, 8, 6, 5, 4, 4, 3, 3],
    4: [40, 20, 13, 10, 8, 7, 6, 5, 4, 4],
    5: [50, 25, 17, 13, 10, 8, 7, 6, 6, 5],
    6: [60, 30, 20, 15, 12, 10, 9, 8, 7, 6],
    7: [70, 35, 23, 18, 14, 12, 10, 9, 8, 7],
    8: [80, 40, 27, 20, 16, 13, 11, 10, 9, 8],
    9: [90, 45, 30, 23, 18, 15, 13, 11, 10, 9],
    10: [100, 50, 33, 25, 20, 17, 14, 13, 11, 10]
};

export const getFoodCost = (dungeonTier, foodTier, playerIP = null) => {
    const costs = FOOD_COST_MATRIX[dungeonTier];
    if (!costs) return 0;

    const baseCost = costs[foodTier - 1] || 0;
    if (baseCost === 0 || playerIP === null) return baseCost;

    const reqIP = DUNGEONS[dungeonTier]?.reqIP || 150;

    let multiplier = 1;

    if (playerIP < reqIP) {
        // Weaker: cost increases by TWICE the percentage difference
        // cost = base * (1 + ((reqIP - playerIP) / reqIP) * 2)
        const pctDiff = (reqIP - playerIP) / reqIP;
        multiplier = 1 + (pctDiff * 2);
    } else {
        // Stronger: cost decreases inversely to the percentage difference
        // cost = base * (reqIP / playerIP)
        multiplier = reqIP / playerIP;
    }

    // Math.round (0.5+ rounds up) as requested
    const finalCost = Math.round(baseCost * multiplier);

    // Minimum 1 unit
    return Math.max(1, finalCost);
};

export const getDungeonDuration = (dungeonTier, playerIP) => {
    const baseDuration = 5 * 60 * 1000; // 5 minutes in ms
    if (playerIP === null) return baseDuration;

    const reqIP = DUNGEONS[dungeonTier]?.reqIP || 150;

    if (playerIP >= reqIP) {
        return baseDuration;
    }

    // IP is lower: increase duration by TWICE the percentage difference
    const pctDiff = (reqIP - playerIP) / reqIP;
    const finalDuration = baseDuration * (1 + (pctDiff * 2));

    return Math.floor(finalDuration);
};
