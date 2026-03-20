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
        image: "wb_t6_chaos_entity.webp",
        bg: "/backgrounds/arcane.webp"
    },
    "T7": {
        id: "T7_BOSS",
        name: "Ancient Arcanist Golem",
        tier: 7,
        maxHP: 6500000,
        image: "wb_t7_arcanist_golem.webp",
        bg: "/backgrounds/arcane.webp"
    },
    "T8": {
        id: "T8_BOSS",
        name: "The Infernal Dreadknight",
        tier: 8,
        maxHP: 7500000,
        image: "wb_t8_dreadknight.webp",
        bg: "/backgrounds/dark.webp"
    },
    "T9": {
        id: "T9_BOSS",
        name: "Soul-Stalker of the Abyss",
        tier: 9,
        maxHP: 8500000,
        image: "wb_t9_soul_stalker.webp",
        bg: "/backgrounds/dark.webp"
    },
    "T10": {
        id: "T10_BOSS",
        name: "The Primordial Star-Eater",
        tier: 10,
        maxHP: 9500000,
        image: "wb_t10_star_eater.webp",
        bg: "/backgrounds/arcane.webp"
    }
};

export const getBossByTier = (tier) => WORLD_BOSSES[`T${tier}`];
export const getRandomBossTier = () => Math.floor(Math.random() * 10) + 1;
