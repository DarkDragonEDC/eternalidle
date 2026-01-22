export const DUNGEONS = {
    1: {
        id: "dungeon_t1",
        name: "Dark Forest Cave",
        tier: 1,
        levels: 5,
        roomsPerLevel: 3,
        monsterPool: ["WOLF", "FOREST_SPIDER"],
        boss: "GIANT_FOREST_SPIDER",
        minLevel: 10,
        rewards: {
            silver: [100, 300],
            loot: { "WOOD_T1": 0.5, "ORE_T1": 0.3 }
        }
    },
    2: {
        id: "dungeon_t2",
        name: "Ancient Ruins",
        tier: 2,
        levels: 8,
        roomsPerLevel: 4,
        monsterPool: ["SKELETON", "GHOST"],
        boss: "LICH_KING",
        minLevel: 20,
        rewards: {
            silver: [500, 1500],
            loot: { "WOOD_T2": 0.5, "ORE_T2": 0.3, "BAR_T2": 0.1 }
        }
    }
};
