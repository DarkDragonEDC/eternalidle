export const DUNGEONS = {
    1: {
        id: 'DUNGEON_T1',
        name: 'Goblin Cave',
        tier: 1,
        reqItem: 'T1_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_GOBLIN_SCOUT',
        trashMobs: ['ROCK_ELEMENTAL_T1', 'GIANT_SPIDER_T1', 'GOBLIN_KING', 'DG_RABBIT'],
        reqLevel: 1,
        rewards: {
            xp: 120,
            resource: { id: 'T1_ORE', chance: 0.50, min: 5, max: 10 },
            crest: { id: 'T1_CREST', chance: 0.25 }
        },
        entrySilver: 200,
    },
    2: {
        id: 'DUNGEON_T2',
        name: 'Wolf Den',
        tier: 2,
        reqItem: 'T2_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_DIRE_RAT',
        trashMobs: ['FOREST_SPIRIT', 'BANDIT_SCOUT', 'WOLF_ALPHA', 'DG_WOLF'],
        reqLevel: 10,
        rewards: {
            xp: 180,
            resource: { id: 'T2_WOOD', chance: 0.50, min: 5, max: 10 },
            crest: { id: 'T2_CREST', chance: 0.25 }
        },
        entrySilver: 500,
    },
    3: {
        id: 'DUNGEON_T3',
        name: 'Bear Cave',
        tier: 3,
        reqItem: 'T3_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_MOUNTAIN_GOBLIN',
        trashMobs: ['SKELETON', 'SKELETON_WARRIOR', 'BEAR_ANCIENT', 'DG_BEAR'],
        reqLevel: 20,
        rewards: {
            xp: 240,
            resource: { id: 'T3_HIDE', chance: 0.50, min: 5, max: 10 },
            crest: { id: 'T3_CREST', chance: 0.25 }
        },
        entrySilver: 1000,
    },
    4: {
        id: 'DUNGEON_T4',
        name: 'Undead Crypt',
        tier: 4,
        reqItem: 'T4_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_GHOST_KNIGHT',
        trashMobs: ['UNDEAD_SOLDIER', 'CRYPT_WARDEN', 'SKELETON_KING', 'DG_DIRE_WOLF'],
        reqLevel: 30,
        rewards: {
            xp: 315,
            resource: { id: 'T4_BAR', chance: 0.50, min: 3, max: 8 },
            crest: { id: 'T4_CREST', chance: 0.25 }
        },
        entrySilver: 2500,
    },
    5: {
        id: 'DUNGEON_T5',
        name: 'Ogre Fortress',
        tier: 5,
        reqItem: 'T5_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_WAR_OGRE',
        trashMobs: ['LICH', 'LICH_LORD', 'OGRE_CHIEFTAIN', 'DG_OGRE'],
        reqLevel: 40,
        rewards: {
            xp: 396,
            resource: { id: 'T5_HIDE', chance: 0.50, min: 3, max: 8 },
            crest: { id: 'T5_CREST', chance: 0.25 }
        },
        entrySilver: 5000,
    },
    6: {
        id: 'DUNGEON_T6',
        name: 'Troll Mountain',
        tier: 6,
        reqItem: 'T6_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_ARMORED_TROLL',
        trashMobs: ['FIRE_ELEMENTAL', 'INFERNAL_ELEMENTAL', 'TROLL_ELDER', 'DG_TROLL'],
        reqLevel: 50,
        rewards: {
            xp: 480,
            resource: { id: 'T6_ORE', chance: 0.50, min: 3, max: 8 },
            crest: { id: 'T6_CREST', chance: 0.25 }
        },
        entrySilver: 10000,
    },
    7: {
        id: 'DUNGEON_T7',
        name: 'Dragon Nest',
        tier: 7,
        reqItem: 'T7_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_FIRE_DRAKE',
        trashMobs: ['DARK_KNIGHT', 'DEATH_KNIGHT', 'DRAGON_MOTHER', 'DG_DRAGON_WHELP'],
        reqLevel: 60,
        rewards: {
            xp: 565,
            resource: { id: 'T7_HIDE', chance: 0.50, min: 2, max: 6 },
            crest: { id: 'T7_CREST', chance: 0.25 }
        },
        entrySilver: 20000,
    },
    8: {
        id: 'DUNGEON_T8',
        name: 'Ancient Ruins',
        tier: 8,
        reqItem: 'T8_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_OBSIDIAN_GOLEM',
        trashMobs: ['DEMON', 'DEMON_WARRIOR', 'GOLEM_PRIMORDIAL', 'DG_ANCIENT_GOLEM'],
        reqLevel: 70,
        rewards: {
            xp: 652,
            resource: { id: 'T8_ORE', chance: 0.50, min: 2, max: 6 },
            crest: { id: 'T8_CREST', chance: 0.25 }
        },
        entrySilver: 40000,
    },
    9: {
        id: 'DUNGEON_T9',
        name: 'Demon Realm',
        tier: 9,
        reqItem: 'T9_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_VOID_DRAGON',
        trashMobs: ['ARCHDEMON', 'ABYSSAL_FIEND', 'DEMON_PRINCE', 'DG_ELDER_DRAGON'],
        reqLevel: 80,
        rewards: {
            xp: 740,
            resource: { id: 'T9_BAR', chance: 0.50, min: 2, max: 5 },
            crest: { id: 'T9_CREST', chance: 0.25 }
        },
        entrySilver: 100000,
    },
    10: {
        id: 'DUNGEON_T10',
        name: 'Void Dimension',
        tier: 10,
        reqItem: 'T10_DUNGEON_MAP',
        waves: 5,
        bossId: 'BOSS_VOID_DRAGON_LORD',
        trashMobs: ['DEMON_LORD', 'VOID_EXECUTIONER', 'VOID_ENTITY', 'DG_ANCIENT_DRAGON'],
        reqLevel: 90,
        rewards: {
            xp: 830,
            resource: { id: 'T10_BAR', chance: 0.50, min: 2, max: 5 },
            crest: { id: 'T10_CREST', chance: 0.25 }
        },
        entrySilver: 500000,
    }
};
