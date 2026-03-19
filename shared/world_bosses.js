export const WORLD_BOSSES = {
    "T1": {
        id: "T1_BOSS",
        name: "Slime Emperor",
        tier: 1,
        maxHP: 500000,
        image: "boss_void_entity.webp",
        bg: "/backgrounds/t1_boss_bg.png"
    },
    "T2": {
        id: "T2_BOSS",
        name: "Forest Sentinel",
        tier: 2,
        maxHP: 1500000,
        image: "ancient_golem.webp",
        bg: "/backgrounds/t2_boss_bg.png"
    },
    "T3": {
        id: "T3_BOSS",
        name: "Sandstone Behemoth",
        tier: 3,
        maxHP: 2500000,
        image: "obsidian_golem.webp",
        bg: "/backgrounds/t3_boss_bg.png"
    },
    "T4": {
        id: "T4_BOSS",
        name: "Frost Giant King",
        tier: 4,
        maxHP: 3500000,
        image: "glacier_giant.webp",
        bg: "/backgrounds/t4_boss_bg.png"
    },
    "T5": {
        id: "T5_BOSS",
        name: "Shadow Soul Stealer",
        tier: 5,
        maxHP: 4500000,
        image: "void_stalker.webp",
        bg: "/backgrounds/t5_boss_bg.png"
    },
    "T6": {
        id: "T6_BOSS",
        name: "Infernal Blazewing",
        tier: 6,
        maxHP: 5500000,
        image: "fire_drake.webp",
        bg: "/backgrounds/t6_boss_bg.png"
    },
    "T7": {
        id: "T7_BOSS",
        name: "Storm Cloud Terror",
        tier: 7,
        maxHP: 6500000,
        image: "storm_wraith.webp",
        bg: "/backgrounds/t7_boss_bg.png"
    },
    "T8": {
        id: "T8_BOSS",
        name: "Abyssal Dreadnaught",
        tier: 8,
        maxHP: 7500000,
        image: "abyssal_knight.webp",
        bg: "/backgrounds/t8_boss_bg.png"
    },
    "T9": {
        id: "T9_BOSS",
        name: "Nightmare Weaver",
        tier: 9,
        maxHP: 8500000,
        image: "void_reaper.webp",
        bg: "/backgrounds/t9_boss_bg.png"
    },
    "T10": {
        id: "T10_BOSS",
        name: "The Ancient Dragon",
        tier: 10,
        maxHP: 9500000,
        image: "ancient_dragon.webp",
        bg: "/backgrounds/dragon_boss_bg.png"
    }
};

export const getBossByTier = (tier) => WORLD_BOSSES[`T${tier}`];
export const getRandomBossTier = () => Math.floor(Math.random() * 10) + 1;
