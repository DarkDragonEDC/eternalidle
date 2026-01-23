export const DUNGEONS = {
    1: {
        id: 'DUNGEON_T1',
        name: 'Goblin Cave',
        tier: 1,
        reqItem: 'T1_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_GOBLIN_KING',
        trashMobs: ['RABBIT', 'ROCK_ELEMENTAL_T1'],
        rewards: {
            xp: 500,
            silver: 200,
            resource: { id: 'T1_ORE', chance: 0.50, min: 5, max: 10 }
        }
    },
    2: {
        id: 'DUNGEON_T2',
        name: 'Wolf Den',
        tier: 2,
        reqItem: 'T2_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_WOLF_ALPHA',
        trashMobs: ['WOLF', 'FOREST_SPIRIT'],
        rewards: {
            xp: 1200,
            silver: 500,

            resource: { id: 'T2_WOOD', chance: 0.50, min: 5, max: 10 }
        }
    },
    3: {
        id: 'DUNGEON_T3',
        name: 'Bear Cave',
        tier: 3,
        reqItem: 'T3_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_BEAR_ANCIENT',
        trashMobs: ['BEAR', 'SKELETON'],
        rewards: {
            xp: 2500,
            silver: 1000,

            resource: { id: 'T3_HIDE', chance: 0.50, min: 5, max: 10 }
        }
    },
    4: {
        id: 'DUNGEON_T4',
        name: 'Undead Crypt',
        tier: 4,
        reqItem: 'T4_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_SKELETON_KING',
        trashMobs: ['DIRE_WOLF', 'UNDEAD_SOLDIER'],
        rewards: {
            xp: 6000,
            silver: 2500,

            resource: { id: 'T4_BAR', chance: 0.50, min: 3, max: 8 }
        }
    },
    5: {
        id: 'DUNGEON_T5',
        name: 'Ogre Fortress',
        tier: 5,
        reqItem: 'T5_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_OGRE_CHIEFTAIN',
        trashMobs: ['OGRE', 'LICH'],
        rewards: {
            xp: 12000,
            silver: 5000,

            resource: { id: 'T5_HIDE', chance: 0.50, min: 3, max: 8 }
        }
    },
    6: {
        id: 'DUNGEON_T6',
        name: 'Troll Mountain',
        tier: 6,
        reqItem: 'T6_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_TROLL_ELDER',
        trashMobs: ['TROLL', 'FIRE_ELEMENTAL'],
        rewards: {
            xp: 25000,
            silver: 10000,

            resource: { id: 'T6_ORE', chance: 0.50, min: 3, max: 8 }
        }
    },
    7: {
        id: 'DUNGEON_T7',
        name: 'Dragon Nest',
        tier: 7,
        reqItem: 'T7_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_DRAGON_MOTHER',
        trashMobs: ['DRAGON_WHELP', 'DARK_KNIGHT'],
        rewards: {
            xp: 50000,
            silver: 20000,

            resource: { id: 'T7_HIDE', chance: 0.50, min: 2, max: 6 }
        }
    },
    8: {
        id: 'DUNGEON_T8',
        name: 'Ancient Ruins',
        tier: 8,
        reqItem: 'T8_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_GOLEM_PRIMORDIAL',
        trashMobs: ['ANCIENT_GOLEM', 'DEMON'],
        rewards: {
            xp: 100000,
            silver: 40000,

            resource: { id: 'T8_ORE', chance: 0.50, min: 2, max: 6 }
        }
    },
    9: {
        id: 'DUNGEON_T9',
        name: 'Demon Realm',
        tier: 9,
        reqItem: 'T9_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_DEMON_PRINCE',
        trashMobs: ['ELDER_DRAGON', 'ARCHDEMON'],
        rewards: {
            xp: 250000,
            silver: 100000,

            resource: { id: 'T9_BAR', chance: 0.50, min: 2, max: 5 }
        }
    },
    10: {
        id: 'DUNGEON_T10',
        name: 'Void Dimension',
        tier: 10,
        reqItem: 'T10_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_VOID_ENTITY',
        trashMobs: ['ANCIENT_DRAGON', 'DEMON_LORD'],
        rewards: {
            xp: 1000000,
            silver: 500000,

            resource: { id: 'T10_BAR', chance: 0.50, min: 2, max: 5 }
        }
    }
};
