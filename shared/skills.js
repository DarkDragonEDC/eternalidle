// Custom XP Curve provided by user
export const XP_TABLE = [
    0, 84, 192, 324, 480, 645, 820, 1005, 1200, 1407,
    1735, 2082, 2449, 2838, 3249, 3684, 4144, 4631, 5146, 5691,
    6460, 7281, 8160, 9101, 10109, 11191, 12353, 13603, 14949, 16400,
    18455, 20675, 23076, 25675, 28492, 31549, 34870, 38482, 42415, 46702,
    52583, 58662, 64933, 71390, 78026, 84833, 91802, 98923, 106186, 114398,
    123502, 132734, 142077, 151515, 161029, 170602, 180216, 189852, 199491, 209115,
    220417, 232945, 246859, 262341, 279598, 298871, 320434, 344603, 371744, 402278,
    441971, 486789, 537487, 594941, 660170, 734360, 818896, 915396, 1025752, 1152182,
    1316749, 1492835, 1681248, 1882849, 2098562, 2329375, 2576345, 2840603, 3123359, 3425908,
    3749636, 4269287, 4827911, 5428432, 6073992, 6767969, 7513995, 8315973, 9178099, 10104099
];

export const calculateNextLevelXP = (level) => {
    // Level is the CURRENT level. We return XP needed to reach NEXT level.
    // User table: Lvl 1->2 needs 84 xp? Or Lvl 2 is 84 total?
    // Usually tables are "Total XP required for Level X".
    // User list: 1 -> 0, 2 -> 84.
    // So to get from 1 to 2, you need 84 XP.
    // If input is level 1, return XP_TABLE[1] (84).
    // If input is level 99, return XP_TABLE[99] (10M).
    // If input is level 100, return Infinity (Max Level).

    if (level >= 100) return Infinity;

    const xpCurrentLevelTotal = XP_TABLE[level - 1] || 0;
    const xpNextLevelTotal = XP_TABLE[level] || 0;

    // Actually, usually games store "XP required for next level" vs "Cumulative XP".
    // The user's list looks like Cumulative XP for that level.
    // Lvl 1 = 0, Lvl 2 = 84. Delta = 84.
    // If current level is 1, calculating next level XP usually means "How much do I need per level" or "Total"?
    // The existing function usage is: skill.xp >= nextLevelXP means level up.
    // Existing logic used: `100 * 1.15^(level-1)`.
    // Lvl 1: 100. Lvl 2: 115. These look like "XP required for THIS specific level step".

    // BUT the user provided a Curve "LVL XP".
    // Lvl 1 0. Lvl 2 84.
    // This implies Cumulative XP to REACH that level.
    // So at level 1 (0 XP), you need 84 XP to reach Level 2.
    // At Level 2 (84 XP), you need (192-84 = 108) XP to reach Level 3.
    // The previous code seemed to treat skill.xp as "current progress in this level" NOT total accumulated.
    // Let's check GameManager.js line 386: `skill.xp -= nextLevelXP`.
    // This CONFIRMS that skill.xp is "XP in current level bucket", not total.
    // So calculateNextLevelXP matches "Delta XP to next level".

    // So for Level L, we need (XP_TABLE[L] - XP_TABLE[L-1]).
    // Example: Level 1. Need (XP_TABLE[1] - XP_TABLE[0]) = 84-0 = 84.

    const targetTotal = XP_TABLE[level]; // XP for next level (level+1 index in 1-based logic, or just index=level)
    const currentTotal = XP_TABLE[level - 1];

    if (targetTotal === undefined) return 999999999;

    return targetTotal - currentTotal;
};

export const INITIAL_SKILLS = {
    // Gathering
    LUMBERJACK: { level: 1, xp: 0, nextLevelXp: 84 },
    ORE_MINER: { level: 1, xp: 0, nextLevelXp: 84 },
    ANIMAL_SKINNER: { level: 1, xp: 0, nextLevelXp: 84 },
    FIBER_HARVESTER: { level: 1, xp: 0, nextLevelXp: 84 },

    // Refining
    PLANK_REFINER: { level: 1, xp: 0, nextLevelXp: 84 },
    METAL_BAR_REFINER: { level: 1, xp: 0, nextLevelXp: 84 },
    LEATHER_REFINER: { level: 1, xp: 0, nextLevelXp: 84 },
    CLOTH_REFINER: { level: 1, xp: 0, nextLevelXp: 84 },

    // Crafting
    WARRIOR_CRAFTER: { level: 1, xp: 0, nextLevelXp: 84 },
    MAGE_CRAFTER: { level: 1, xp: 0, nextLevelXp: 84 },
    TOOL_CRAFTER: { level: 1, xp: 0, nextLevelXp: 84 },

    // Combat
    COMBAT: { level: 1, xp: 0, nextLevelXp: 84 },

    // Specialization
    FISHING: { level: 1, xp: 0, nextLevelXp: 84 },
    COOKING: { level: 1, xp: 0, nextLevelXp: 84 },
    DUNGEONEERING: { level: 1, xp: 0, nextLevelXp: 84 },

    // Alchemy Expansion
    HERBALISM: { level: 1, xp: 0, nextLevelXp: 84 },
    DISTILLATION: { level: 1, xp: 0, nextLevelXp: 84 },
    ALCHEMY: { level: 1, xp: 0, nextLevelXp: 84 },
    RUNE: { level: 1, xp: 0, nextLevelXp: Infinity },
};
