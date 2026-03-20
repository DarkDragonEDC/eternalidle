export const WORLD_BOSSES = {
    "T1": {
        id: "T1_BOSS",
        name: "Void Slime Monarch",
        tier: 1,
        maxHP: 500000,
        image: "wb_t1_void_slime.webp",
        bg: "/backgrounds/dark.webp"
    },
    "T2": {
        id: "T2_BOSS",
        name: "Ancient Arbor Sentinel",
        tier: 2,
        maxHP: 1500000,
        image: "wb_t2_grove_guardian.webp",
        bg: "/backgrounds/nature.webp"
    },
    "T3": {
        id: "T3_BOSS",
        name: "Obsidian Dune Stalker",
        tier: 3,
        maxHP: 2500000,
        image: "wb_t3_dune_behemoth.webp",
        bg: "/backgrounds/dark.webp"
    },
    "T4": {
        id: "T4_BOSS",
        name: "The Frost Sovereign",
        tier: 4,
        maxHP: 3500000,
        image: "wb_t4_frost_sovereign.webp",
        bg: "/backgrounds/ice.webp"
    },
    "T5": {
        id: "T5_BOSS",
        name: "The Ethereal Predator",
        tier: 5,
        maxHP: 4500000,
        image: "wb_t5_umbra_stalker.webp",
        bg: "/backgrounds/dark.webp"
    },
    "T6": {
        id: "T6_BOSS",
        name: "Chaos Entity X-0",
        tier: 6,
        maxHP: 5500000,
        image: "boss_void_entity.webp",
        bg: "/backgrounds/arcane.webp"
    },
    "T7": {
        id: "T7_BOSS",
        name: "Aegis of the Forgotten",
        tier: 7,
        maxHP: 6500000,
        image: "RUNE_GUARDIAN.png",
        bg: "/backgrounds/arcane.webp"
    },
    "T8": {
        id: "T8_BOSS",
        name: "Abyssal Juggernaut",
        tier: 8,
        maxHP: 7500000,
        image: "abyssal_knight.webp",
        bg: "/backgrounds/dark.webp"
    },
    "T9": {
        id: "T9_BOSS",
        name: "Nightmare Overlord",
        tier: 9,
        maxHP: 8500000,
        image: "void_reaper.webp",
        bg: "/backgrounds/dark.webp"
    },
    "T10": {
        id: "T10_BOSS",
        name: "The Celestial Ravager",
        tier: 10,
        maxHP: 9500000,
        image: "ancient_dragon.webp",
        bg: "/backgrounds/arcane.webp"
    }
};

export const getBossByTier = (tier) => WORLD_BOSSES[`T${tier}`];
export const getRandomBossTier = () => Math.floor(Math.random() * 10) + 1;
