import { HUNTER_STATS_FIXED } from './hunter_stats_fixed.js';
import { MAGE_STATS_FIXED } from './mage_stats_fixed.js';
import { WARRIOR_STATS_FIXED } from './warrior_stats_fixed.js';
export const ITEMS_VERSION = "20260130_2007";
export const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const RESOURCE_TYPES = {
    WOOD: 'Wood', ORE: 'Ore', HIDE: 'Hide', FIBER: 'Fiber', FISH: 'Fish'
};

export const CRAFTING_STATIONS = {
    WARRIORS_FORGE: 'Warrior\'s Forge',
    HUNTERS_LODGE: 'Hunter\'s Lodge',
    MAGES_TOWER: 'Mage\'s Tower',
    TOOLMAKER: 'Toolmaker',
    COOKING_STATION: 'Cooking Station'
};

const getBaseIP = (tier) => tier * 100;

/**
 * Standardizes capitalization for item names.
 * Example: "cloth helmet" -> "Cloth Helmet"
 */
const toTitleCase = (str) => {
    if (!str) return '';
    return str.replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase());
};

export const QUALITIES = {
    0: { id: 0, name: 'Normal', suffix: '', chance: 0.699, ipBonus: 0, color: '#fff' },
    1: { id: 1, name: 'Good', suffix: '_Q1', chance: 0.20, ipBonus: 20, color: '#4caf50' },
    2: { id: 2, name: 'Outstanding', suffix: '_Q2', chance: 0.09, ipBonus: 50, color: '#4a90e2' },
    3: { id: 3, name: 'Excellent', suffix: '_Q3', chance: 0.01, ipBonus: 100, color: '#9013fe' },
    4: { id: 4, name: 'Masterpiece', suffix: '_Q4', chance: 0.001, ipBonus: 200, color: '#f5a623' }
};

// --- SCALING CONSTANTS ---
// Exponential Growth Factor for Tiers
const DMG_CURVE = [10, 25, 60, 150, 400, 1000, 2500, 6000, 14000, 30000]; // Weapon Dmg
const DEF_CURVE = [5, 15, 30, 80, 200, 500, 1200, 3000, 7000, 15000];   // Armor Def
const HP_CURVE = [50, 120, 240, 800, 2000, 5000, 12000, 30000, 80000, 200000]; // Armor HP

// USER PROVIDED DATA FOR XP AND TIME
const GATHER_DATA = {
    xp: [1, 2, 4, 7, 11, 16, 22, 29, 37, 46],
    time: [15, 20, 30, 40, 50, 60, 70, 80, 90, 100]
};
const REFINE_DATA = {
    xp: [2, 4, 8, 14, 22, 32, 44, 58, 74, 92],
    time: [15, 20, 30, 40, 50, 60, 70, 80, 90, 100]
};
const POTION_XP_CURVE = [10, 20, 40, 70, 110, 160, 220, 290, 370, 460];
const CRAFT_DATA = {
    xp: [40, 80, 160, 280, 440, 640, 880, 1160, 1480, 1840],
    time: [240, 320, 480, 640, 800, 960, 1120, 1280, 1440, 1520]
};


export const ITEMS = {
    RAW: {
        WOOD: {}, ORE: {}, HIDE: {}, FIBER: {}, FISH: {}, HERB: {}
    },
    REFINED: {
        PLANK: {}, BAR: {}, LEATHER: {}, CLOTH: {}, EXTRACT: {}
    },
    CONSUMABLE: {
        FOOD: {},
        INVENTORY_SLOT_TICKET: {
            id: 'INVENTORY_SLOT_TICKET',
            name: 'Inventory Slot expansion',
            description: 'Permanently increases your inventory by 1 slot.',
            type: 'CONSUMABLE',
            rarity: 'LEGENDARY',
            icon: '/items/INVENTORY_SLOT.webp'
        },
        NAME_CHANGE_TOKEN: {
            id: 'NAME_CHANGE_TOKEN',
            name: 'Name Change Token',
            description: 'Use to unlock a one-time character name change.',
            type: 'CONSUMABLE',
            rarity: 'EPIC',
            icon: '/items/CHANGE_NAME.webp'
        }
    },
    GEAR: {
        WARRIORS_FORGE: { SWORD: {}, SHEATH: {}, PLATE_ARMOR: {}, PLATE_HELMET: {}, PLATE_BOOTS: {}, PLATE_GLOVES: {}, PLATE_CAPE: {}, PICKAXE: {} },
        HUNTERS_LODGE: { BOW: {}, TORCH: {}, LEATHER_ARMOR: {}, LEATHER_HELMET: {}, LEATHER_BOOTS: {}, LEATHER_GLOVES: {}, LEATHER_CAPE: {}, AXE: {}, SKINNING_KNIFE: {} },
        MAGES_TOWER: { FIRE_STAFF: {}, TOME: {}, CLOTH_ARMOR: {}, CLOTH_HELMET: {}, CLOTH_BOOTS: {}, CLOTH_GLOVES: {}, CAPE: {} },
        TOOLMAKER: { PICKAXE: {}, AXE: {}, SKINNING_KNIFE: {}, SICKLE: {}, FISHING_ROD: {} },
        COOKING_STATION: { FOOD: {} },
        ALCHEMY_LAB: { POTION: {} }
    },
    MAPS: {},
    SPECIAL: {
        CREST: {},
        CHEST: {},
        RUNE_SHARD: {},
        RUNE: {}
    }
};

// --- GENERATOR FUNCTIONS ---
const genRaw = (type, idPrefix) => {
    for (const t of TIERS) {
        ITEMS.RAW[type][t] = {
            id: `T${t}_${idPrefix}`,
            name: toTitleCase(type),
            tier: t,
            type: 'RAW',
            xp: GATHER_DATA.xp[t - 1],
            time: GATHER_DATA.time[t - 1],
            description: `A raw resource of Tier ${t}. Used for refining.`
        };
    }
};

const genRefined = (type, idPrefix, rawId) => {
    for (const t of TIERS) {
        const req = {};
        req[`T${t}_${rawId}`] = 2; // Flat cost of 2 raw materials for any tier

        ITEMS.REFINED[type][t] = {
            id: `T${t}_${idPrefix}`,
            name: toTitleCase(type),
            tier: t,
            type: 'REFINED',
            req,
            xp: REFINE_DATA.xp[t - 1],
            time: REFINE_DATA.time[t - 1],
            description: `A refined material of Tier ${t}. Used for crafting.`
        };
    }
};

// Generate Materials
genRaw('WOOD', 'WOOD'); genRaw('ORE', 'ORE'); genRaw('HIDE', 'HIDE'); genRaw('FIBER', 'FIBER');
genRaw('FISH', 'FISH'); // Fish is special, but for now standard
// Override Fishing Time (50% faster)
for (const t of TIERS) {
    if (ITEMS.RAW.FISH[t]) {
        ITEMS.RAW.FISH[t].time = Math.ceil(ITEMS.RAW.FISH[t].time / 2);
    }
}
genRaw('HERB', 'HERB');

// Override Icon for T1 Wood (Test)
if (ITEMS.RAW.WOOD[1]) ITEMS.RAW.WOOD[1].icon = '/items/T1_WOOD.webp';

ITEMS.RAW.WOOD[2].icon = '/items/T2_WOOD.webp';
ITEMS.RAW.WOOD[3].icon = '/items/T3_WOOD.webp';
ITEMS.RAW.WOOD[4].icon = '/items/T4_WOOD.webp';
ITEMS.RAW.WOOD[5].icon = '/items/T5_WOOD.webp';
ITEMS.RAW.WOOD[6].icon = '/items/T6_WOOD.webp';
ITEMS.RAW.WOOD[7].icon = '/items/T7_WOOD.webp';
ITEMS.RAW.WOOD[8].icon = '/items/T8_WOOD.webp';
ITEMS.RAW.WOOD[9].icon = '/items/T9_WOOD.webp';
ITEMS.RAW.WOOD[10].icon = '/items/T10_WOOD.webp';

// Override Icon for T1 Ore
if (ITEMS.RAW.ORE[1]) ITEMS.RAW.ORE[1].icon = '/items/T1_ORE.webp';

// Override Icon for T1 Hide
if (ITEMS.RAW.HIDE[1]) ITEMS.RAW.HIDE[1].icon = '/items/T1_HIDE.webp';

// Override Icon for T2 Hide
if (ITEMS.RAW.HIDE[2]) ITEMS.RAW.HIDE[2].icon = '/items/T2_HIDE.webp';

// Override Icon for T3 Hide
if (ITEMS.RAW.HIDE[3]) ITEMS.RAW.HIDE[3].icon = '/items/T3_HIDE.webp';

// Override Icon for T4 Hide
if (ITEMS.RAW.HIDE[4]) ITEMS.RAW.HIDE[4].icon = '/items/T4_HIDE.webp';

// Override Icon for T5 Hide
if (ITEMS.RAW.HIDE[5]) ITEMS.RAW.HIDE[5].icon = '/items/T5_HIDE.webp';

// Override Icon for T6 Hide
if (ITEMS.RAW.HIDE[6]) ITEMS.RAW.HIDE[6].icon = '/items/T6_HIDE.webp';

// Override Icon for T7 Hide
if (ITEMS.RAW.HIDE[7]) ITEMS.RAW.HIDE[7].icon = '/items/T7_HIDE.webp';

// Override Icon for T8 Hide
if (ITEMS.RAW.HIDE[8]) ITEMS.RAW.HIDE[8].icon = '/items/T8_HIDE.webp';

// Override Icon for T9 Hide
if (ITEMS.RAW.HIDE[9]) ITEMS.RAW.HIDE[9].icon = '/items/T9_HIDE.webp';

// Override Icon for T10 Hide
if (ITEMS.RAW.HIDE[10]) ITEMS.RAW.HIDE[10].icon = '/items/T10_HIDE.webp';

// Override Icon for T1 Fish
if (ITEMS.RAW.FISH[1]) ITEMS.RAW.FISH[1].icon = '/items/T1_FISH.webp';

// Override Icon for T2 Fish
if (ITEMS.RAW.FISH[2]) ITEMS.RAW.FISH[2].icon = '/items/T2_FISH.webp';

// Override Icon for T3 Fish
if (ITEMS.RAW.FISH[3]) ITEMS.RAW.FISH[3].icon = '/items/T3_FISH.webp';

// Override Icon for T4 Fish
if (ITEMS.RAW.FISH[4]) ITEMS.RAW.FISH[4].icon = '/items/T4_FISH.webp';

// Override Icon for T5 Fish
if (ITEMS.RAW.FISH[5]) ITEMS.RAW.FISH[5].icon = '/items/T5_FISH.webp';

// Override Icon for T6 Fish
if (ITEMS.RAW.FISH[6]) ITEMS.RAW.FISH[6].icon = '/items/T6_FISH.webp';

// Override Icon for T7 Fish
if (ITEMS.RAW.FISH[7]) ITEMS.RAW.FISH[7].icon = '/items/T7_FISH.webp';

// Override Icon for T8 Fish
if (ITEMS.RAW.FISH[8]) ITEMS.RAW.FISH[8].icon = '/items/T8_FISH.webp';

// Override Icon for T9 Fish
if (ITEMS.RAW.FISH[9]) ITEMS.RAW.FISH[9].icon = '/items/T9_FISH.webp';

// Override Icon for T10 Fish
if (ITEMS.RAW.FISH[10]) ITEMS.RAW.FISH[10].icon = '/items/T10_FISH.webp';
if (ITEMS.RAW.ORE[2]) ITEMS.RAW.ORE[2].icon = '/items/T2_ORE.webp';
if (ITEMS.RAW.ORE[3]) ITEMS.RAW.ORE[3].icon = '/items/T3_ORE.webp';
if (ITEMS.RAW.ORE[4]) ITEMS.RAW.ORE[4].icon = '/items/T4_ORE.webp';
if (ITEMS.RAW.ORE[5]) ITEMS.RAW.ORE[5].icon = '/items/T5_ORE.webp';
if (ITEMS.RAW.ORE[6]) ITEMS.RAW.ORE[6].icon = '/items/T6_ORE.webp';
if (ITEMS.RAW.ORE[7]) { ITEMS.RAW.ORE[7].icon = '/items/T7_ORE.webp'; ITEMS.RAW.ORE[7].scale = '170%'; }
if (ITEMS.RAW.ORE[8]) ITEMS.RAW.ORE[8].icon = '/items/T8_ORE.webp';
if (ITEMS.RAW.ORE[9]) ITEMS.RAW.ORE[9].icon = '/items/T9_ORE.webp';
if (ITEMS.RAW.ORE[10]) ITEMS.RAW.ORE[10].icon = '/items/T10_ORE.webp';

// Override Icons for Fiber
if (ITEMS.RAW.FIBER[1]) ITEMS.RAW.FIBER[1].icon = '/items/T1_FIBER.webp';
if (ITEMS.RAW.FIBER[2]) ITEMS.RAW.FIBER[2].icon = '/items/T2_FIBER.webp';
if (ITEMS.RAW.FIBER[3]) ITEMS.RAW.FIBER[3].icon = '/items/T3_FIBER.webp';
if (ITEMS.RAW.FIBER[4]) ITEMS.RAW.FIBER[4].icon = '/items/T4_FIBER.webp';
if (ITEMS.RAW.FIBER[5]) ITEMS.RAW.FIBER[5].icon = '/items/T5_FIBER.webp';
if (ITEMS.RAW.FIBER[6]) ITEMS.RAW.FIBER[6].icon = '/items/T6_FIBER.webp';
if (ITEMS.RAW.FIBER[7]) ITEMS.RAW.FIBER[7].icon = '/items/T7_FIBER.webp';
if (ITEMS.RAW.FIBER[8]) ITEMS.RAW.FIBER[8].icon = '/items/T8_FIBER.webp';
if (ITEMS.RAW.FIBER[9]) ITEMS.RAW.FIBER[9].icon = '/items/T9_FIBER.webp';
if (ITEMS.RAW.FIBER[10]) ITEMS.RAW.FIBER[10].icon = '/items/T10_FIBER.webp';

// Icons for Herbs (Raw)
if (ITEMS.RAW.HERB[1]) ITEMS.RAW.HERB[1].icon = '/items/T1_HERB.webp';
if (ITEMS.RAW.HERB[2]) ITEMS.RAW.HERB[2].icon = '/items/T2_HERB.webp';
if (ITEMS.RAW.HERB[3]) ITEMS.RAW.HERB[3].icon = '/items/T3_HERB.webp';
if (ITEMS.RAW.HERB[4]) ITEMS.RAW.HERB[4].icon = '/items/T4_HERB.webp';
if (ITEMS.RAW.HERB[5]) ITEMS.RAW.HERB[5].icon = '/items/T5_HERB.webp';
if (ITEMS.RAW.HERB[6]) ITEMS.RAW.HERB[6].icon = '/items/T6_HERB.webp';
if (ITEMS.RAW.HERB[7]) ITEMS.RAW.HERB[7].icon = '/items/T7_HERB.webp';
if (ITEMS.RAW.HERB[8]) ITEMS.RAW.HERB[8].icon = '/items/T8_HERB.webp';
if (ITEMS.RAW.HERB[9]) ITEMS.RAW.HERB[9].icon = '/items/T9_HERB.webp';
if (ITEMS.RAW.HERB[10]) ITEMS.RAW.HERB[10].icon = '/items/T10_HERB.webp';

// Generate Refined
genRefined('PLANK', 'PLANK', 'WOOD');
genRefined('BAR', 'BAR', 'ORE');
genRefined('LEATHER', 'LEATHER', 'HIDE');
genRefined('CLOTH', 'CLOTH', 'FIBER');
genRefined('EXTRACT', 'EXTRACT', 'HERB');

// Icons for Herbs (Refined - Extract)
if (ITEMS.REFINED.EXTRACT) {
    if (ITEMS.REFINED.EXTRACT[1]) ITEMS.REFINED.EXTRACT[1].icon = '/items/T1_EXTRACT.webp';
    if (ITEMS.REFINED.EXTRACT[2]) ITEMS.REFINED.EXTRACT[2].icon = '/items/T2_EXTRACT.webp';
    if (ITEMS.REFINED.EXTRACT[3]) ITEMS.REFINED.EXTRACT[3].icon = '/items/T3_EXTRACT.webp';
    if (ITEMS.REFINED.EXTRACT[4]) ITEMS.REFINED.EXTRACT[4].icon = '/items/T4_EXTRACT.webp';
    if (ITEMS.REFINED.EXTRACT[5]) ITEMS.REFINED.EXTRACT[5].icon = '/items/T5_EXTRACT.webp';
    if (ITEMS.REFINED.EXTRACT[6]) ITEMS.REFINED.EXTRACT[6].icon = '/items/T6_EXTRACT.webp';
    if (ITEMS.REFINED.EXTRACT[7]) ITEMS.REFINED.EXTRACT[7].icon = '/items/T7_EXTRACT.webp';
    if (ITEMS.REFINED.EXTRACT[8]) ITEMS.REFINED.EXTRACT[8].icon = '/items/T8_EXTRACT.webp';
    if (ITEMS.REFINED.EXTRACT[9]) ITEMS.REFINED.EXTRACT[9].icon = '/items/T9_EXTRACT.webp';
    if (ITEMS.REFINED.EXTRACT[10]) ITEMS.REFINED.EXTRACT[10].icon = '/items/T10_EXTRACT.webp';
}

// Generate Food
for (const t of TIERS) {
    const foodItem = {
        id: `T${t}_FOOD`, name: 'Food', tier: t, type: 'FOOD',
        healPercent: 5 * t, // Heals 5% * Tier of Max HP
        req: { [`T${t}_FISH`]: 2 },
        xp: REFINE_DATA.xp[t - 1], // Full XP gain for food (doubled from previous 0.5x)
        time: Math.ceil(REFINE_DATA.time[t - 1] / 2),
        description: `A cooked meal. Restores ${5 * t}% Health when eaten.`
    };
    ITEMS.CONSUMABLE.FOOD[t] = foodItem;
    ITEMS.GEAR.COOKING_STATION.FOOD[t] = foodItem;
}

// --- POTION GENERATOR ---
const POTION_TYPES = {
    GATHER_XP: { name: 'Gathering Potion', suffix: '_POTION_GATHER', desc: 'Increases Gathering XP', scale: 0.03, base: 0.02 }, // T1: 5%, T10: 32% (Approx) -> Formula TBD
    REFINE_XP: { name: 'Refining Potion', suffix: '_POTION_REFINE', desc: 'Increases Refining XP', scale: 0.03, base: 0.02 },
    CRAFT_XP: { name: 'Crafting Potion', suffix: '_POTION_CRAFT', desc: 'Increases Crafting XP', scale: 0.03, base: 0.02 },
    SILVER: { name: 'Silver Potion', suffix: '_POTION_SILVER', desc: 'Increases Silver gain', scale: 0.02, base: 0.00 }, // T1: 2%, T10: 20%
    QUALITY: { name: 'Quality Potion', suffix: '_POTION_QUALITY', desc: 'Increases Craft Quality Chance', scale: 0.005, base: 0.005 }, // T1: 1%, T10: 5.5%
    DROP: { name: 'Luck Potion', suffix: '_POTION_LUCK', desc: 'Increases Drop Rate', scale: 0.02, base: 0.00 },
    GLOBAL_XP: { name: 'Knowledge Potion', suffix: '_POTION_XP', desc: 'Increases Global XP', scale: 0.02, base: 0.00 }
};

// Override scaling to match User Request exactly
const POTION_SCALING = {
    // Specific XP (5% -> 35%)
    XP_SPECIFIC: [5, 7, 10, 12, 15, 18, 22, 26, 30, 35],
    // Global/Gold/Drop (2% -> 20%)
    GLOBAL: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20],
    // Quality (4% -> 40%)
    QUALITY: [4, 8, 12, 16, 20, 24, 28, 32, 36, 40]
};

const genPotions = () => {
    for (const [key, data] of Object.entries(POTION_TYPES)) {
        ITEMS.CONSUMABLE[key] = {}; // Init category in CONSUMABLE if needed (or just flat list?)
        // Let's use specific keys in CONSUMABLE to easier lookup if needed, or just flatten.
        // ActivityManager checks generic items.

        // We'll put them in ITEMS.GEAR.ALCHEMY_LAB with specific keys so the UI groups them?
        // Actually UI groups by ITEM ID usually or Category.
        // Let's put them all in ALCHEMY_LAB.POTION but maybe distinct sub-tabs if we want?
        // App.jsx logic: `const itemsToRender = Object.values(activeCategoryData || {})`
        // So if we put them all in `ITEMS.GEAR.ALCHEMY_LAB.POTION`, they show up in Alchemy Lab. Perfect.

        if (!ITEMS.GEAR.ALCHEMY_LAB[key]) ITEMS.GEAR.ALCHEMY_LAB[key] = {};

        for (const t of TIERS) {
            let val = 0;
            if (key.includes('XP') && key !== 'GLOBAL_XP') val = POTION_SCALING.XP_SPECIFIC[t - 1] / 100;
            else if (key === 'QUALITY') val = POTION_SCALING.QUALITY[t - 1] / 100;
            else val = POTION_SCALING.GLOBAL[t - 1] / 100;

            const id = `T${t}${data.suffix}`;

            const potionItem = {
                id: id,
                name: `${data.name}`, // T1 Gathering Potion handled by Tier badge? Or name? "Gathering Potion"
                tier: t,
                type: 'POTION',
                effect: key,
                value: val,
                desc: `${data.desc} by ${Math.round(val * 100)}%`,
                duration: 3600, // 1 Hour Duration
                icon: key === 'REFINE_XP' ? `/items/T${t}_REFINING_POTION.webp` :
                    (key === 'SILVER' ? `/items/T${t}_SILVER_POTION.webp` :
                        (key === 'QUALITY' ? `/items/T${t}_QUALITY_POTION.webp` :
                            (key === 'GATHER_XP' ? `/items/T${t}_GATHERING_POTION.webp` :
                                (key === 'CRAFT_XP' ? `/items/T${t}_CRAFTING_POTION.webp` :
                                    (key === 'DROP' ? `/items/T${t}_LUCK_POTION.webp` :
                                        (key === 'GLOBAL_XP' ? `/items/T${t}_KNOWLEDGE_POTION.webp` : '')))))),
                req: {
                    [`T${t}_EXTRACT`]: 5
                },
                xp: POTION_XP_CURVE[t - 1], // New balanced Potion XP
                time: CRAFT_DATA.time[t - 1] // Original Craft Time
            };

            // Register in Consumable (for lookup) and Station (for crafting)
            if (!ITEMS.CONSUMABLE[key]) ITEMS.CONSUMABLE[key] = {};
            ITEMS.CONSUMABLE[key][t] = potionItem;

            ITEMS.GEAR.ALCHEMY_LAB[key][t] = potionItem;
        }
    }
    // console.log(`[DEBUG-ITEMS] Generated ${Object.keys(POTION_TYPES).length} potion types across ${TIERS.length} tiers.`);
};
genPotions();

// Override Icon for T1 Food
if (ITEMS.CONSUMABLE.FOOD[1]) { ITEMS.CONSUMABLE.FOOD[1].icon = '/items/T1_FOOD.webp'; }
// Override Icon for T2 Food
if (ITEMS.CONSUMABLE.FOOD[2]) { ITEMS.CONSUMABLE.FOOD[2].icon = '/items/T2_FOOD.webp'; }
// Override Icon for T3 Food
if (ITEMS.CONSUMABLE.FOOD[3]) { ITEMS.CONSUMABLE.FOOD[3].icon = '/items/T3_FOOD.webp'; }
// Override Icon for T4 Food
if (ITEMS.CONSUMABLE.FOOD[4]) { ITEMS.CONSUMABLE.FOOD[4].icon = '/items/T4_FOOD.webp'; }
// Override Icon for T5 Food
if (ITEMS.CONSUMABLE.FOOD[5]) { ITEMS.CONSUMABLE.FOOD[5].icon = '/items/T5_FOOD.webp'; }
// Override Icon for T6 Food
if (ITEMS.CONSUMABLE.FOOD[6]) { ITEMS.CONSUMABLE.FOOD[6].icon = '/items/T6_FOOD.webp'; }
// Override Icon for T7 Food
if (ITEMS.CONSUMABLE.FOOD[7]) { ITEMS.CONSUMABLE.FOOD[7].icon = '/items/T7_FOOD.webp'; }
// Override Icon for T8 Food
if (ITEMS.CONSUMABLE.FOOD[8]) { ITEMS.CONSUMABLE.FOOD[8].icon = '/items/T8_FOOD.webp'; }
// Override Icon for T9 Food
if (ITEMS.CONSUMABLE.FOOD[9]) { ITEMS.CONSUMABLE.FOOD[9].icon = '/items/T9_FOOD.webp'; }
// Override Icon for T10 Food
if (ITEMS.CONSUMABLE.FOOD[10]) { ITEMS.CONSUMABLE.FOOD[10].icon = '/items/T10_FOOD.webp'; }

// Override Icons for Refined Items
if (ITEMS.REFINED.PLANK[1]) { ITEMS.REFINED.PLANK[1].icon = '/items/T1_PLANK.webp'; }
if (ITEMS.REFINED.PLANK[2]) { ITEMS.REFINED.PLANK[2].icon = '/items/T2_PLANK.webp'; }
if (ITEMS.REFINED.PLANK[3]) { ITEMS.REFINED.PLANK[3].icon = '/items/T3_PLANK.webp'; }
if (ITEMS.REFINED.PLANK[4]) { ITEMS.REFINED.PLANK[4].icon = '/items/T4_PLANK.webp'; }
if (ITEMS.REFINED.PLANK[5]) { ITEMS.REFINED.PLANK[5].icon = '/items/T5_PLANK.webp'; }
if (ITEMS.REFINED.PLANK[6]) { ITEMS.REFINED.PLANK[6].icon = '/items/T6_PLANK.webp'; }
if (ITEMS.REFINED.PLANK[7]) { ITEMS.REFINED.PLANK[7].icon = '/items/T7_PLANK.webp'; }
if (ITEMS.REFINED.PLANK[8]) { ITEMS.REFINED.PLANK[8].icon = '/items/T8_PLANK.webp'; }
if (ITEMS.REFINED.PLANK[9]) { ITEMS.REFINED.PLANK[9].icon = '/items/T9_PLANK.webp'; }
if (ITEMS.REFINED.PLANK[10]) { ITEMS.REFINED.PLANK[10].icon = '/items/T10_PLANK.webp'; }
if (ITEMS.REFINED.BAR[1]) { ITEMS.REFINED.BAR[1].icon = '/items/T1_BAR.webp'; ITEMS.REFINED.BAR[1].scale = '120%'; }
if (ITEMS.REFINED.BAR[2]) { ITEMS.REFINED.BAR[2].icon = '/items/T2_BAR.webp'; ITEMS.REFINED.BAR[2].scale = '120%'; }
if (ITEMS.REFINED.BAR[3]) { ITEMS.REFINED.BAR[3].icon = '/items/T3_BAR.webp'; ITEMS.REFINED.BAR[3].scale = '120%'; }
if (ITEMS.REFINED.BAR[4]) { ITEMS.REFINED.BAR[4].icon = '/items/T4_BAR.webp'; ITEMS.REFINED.BAR[4].scale = '120%'; }
if (ITEMS.REFINED.BAR[5]) { ITEMS.REFINED.BAR[5].icon = '/items/T5_BAR.webp'; ITEMS.REFINED.BAR[5].scale = '120%'; }
if (ITEMS.REFINED.BAR[6]) { ITEMS.REFINED.BAR[6].icon = '/items/T6_BAR.webp'; ITEMS.REFINED.BAR[6].scale = '120%'; }
if (ITEMS.REFINED.BAR[7]) { ITEMS.REFINED.BAR[7].icon = '/items/T7_BAR.webp'; ITEMS.REFINED.BAR[7].scale = '120%'; }
if (ITEMS.REFINED.BAR[8]) { ITEMS.REFINED.BAR[8].icon = '/items/T8_BAR.webp'; ITEMS.REFINED.BAR[8].scale = '120%'; }
if (ITEMS.REFINED.BAR[9]) { ITEMS.REFINED.BAR[9].icon = '/items/T9_BAR.webp'; ITEMS.REFINED.BAR[9].scale = '120%'; }
if (ITEMS.REFINED.BAR[10]) { ITEMS.REFINED.BAR[10].icon = '/items/T10_BAR.webp'; ITEMS.REFINED.BAR[10].scale = '120%'; }

// Override Icons for Leather
if (ITEMS.REFINED.LEATHER[1]) { ITEMS.REFINED.LEATHER[1].icon = '/items/T1_LEATHER.webp'; ITEMS.REFINED.LEATHER[1].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[2]) { ITEMS.REFINED.LEATHER[2].icon = '/items/T2_LEATHER.webp'; ITEMS.REFINED.LEATHER[2].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[3]) { ITEMS.REFINED.LEATHER[3].icon = '/items/T3_LEATHER.webp'; ITEMS.REFINED.LEATHER[3].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[4]) { ITEMS.REFINED.LEATHER[4].icon = '/items/T4_LEATHER.webp'; ITEMS.REFINED.LEATHER[4].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[5]) { ITEMS.REFINED.LEATHER[5].icon = '/items/T5_LEATHER.webp'; ITEMS.REFINED.LEATHER[5].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[6]) { ITEMS.REFINED.LEATHER[6].icon = '/items/T6_LEATHER.webp'; ITEMS.REFINED.LEATHER[6].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[7]) { ITEMS.REFINED.LEATHER[7].icon = '/items/T7_LEATHER.webp'; ITEMS.REFINED.LEATHER[7].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[8]) { ITEMS.REFINED.LEATHER[8].icon = '/items/T8_LEATHER.webp'; ITEMS.REFINED.LEATHER[8].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[9]) { ITEMS.REFINED.LEATHER[9].icon = '/items/T9_LEATHER.webp'; ITEMS.REFINED.LEATHER[9].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[10]) { ITEMS.REFINED.LEATHER[10].icon = '/items/T10_LEATHER.webp'; ITEMS.REFINED.LEATHER[10].scale = '110%'; }

// Override Icons for Cloth
if (ITEMS.REFINED.CLOTH[1]) ITEMS.REFINED.CLOTH[1].icon = '/items/T1_CLOTH.webp';
if (ITEMS.REFINED.CLOTH[2]) ITEMS.REFINED.CLOTH[2].icon = '/items/T2_CLOTH.webp';
if (ITEMS.REFINED.CLOTH[3]) ITEMS.REFINED.CLOTH[3].icon = '/items/T3_CLOTH.webp';
if (ITEMS.REFINED.CLOTH[4]) ITEMS.REFINED.CLOTH[4].icon = '/items/T4_CLOTH.webp';
if (ITEMS.REFINED.CLOTH[5]) ITEMS.REFINED.CLOTH[5].icon = '/items/T5_CLOTH.webp';
if (ITEMS.REFINED.CLOTH[6]) ITEMS.REFINED.CLOTH[6].icon = '/items/T6_CLOTH.webp';
if (ITEMS.REFINED.CLOTH[7]) ITEMS.REFINED.CLOTH[7].icon = '/items/T7_CLOTH.webp';
if (ITEMS.REFINED.CLOTH[8]) ITEMS.REFINED.CLOTH[8].icon = '/items/T8_CLOTH.webp';
if (ITEMS.REFINED.CLOTH[9]) { ITEMS.REFINED.CLOTH[9].icon = '/items/T9_CLOTH.webp'; }
if (ITEMS.REFINED.CLOTH[10]) { ITEMS.REFINED.CLOTH[10].icon = '/items/T10_CLOTH.webp'; }

// Generate Maps
for (const t of TIERS) {
    ITEMS.MAPS[t] = {
        id: `T${t}_DUNGEON_MAP`,
        name: 'Dungeon Map',
        tier: t,
        type: 'MAP',
        description: `A map to a Tier ${t} dungeon. Use to enter.`,
        icon: `/items/T${t}_DG_MAP.webp`
    };
}

// Add new special items
ITEMS.SPECIAL.MINING_COMBAT_LUCKY = {
    id: 'MINING_COMBAT_LUCKY',
    name: 'Lucky Miner Bundle',
    type: 'BUNDLE',
    description: 'Contains: T1 Pickaxe, T1 Sword, 100x T1 Food',
    icon: '/items/MINING_COMBAT_LUCKY.webp'
};
ITEMS.SPECIAL.NOOB_CHEST = {
    id: 'NOOB_CHEST',
    name: 'Noob Chest',
    type: 'CONSUMABLE',
    description: 'Contains starting gear and supplies for new adventurers.',
    icon: '/items/NOOB_CHEST.webp', // Ensure this icon exists or use a placeholder
    tier: 1,
    rarity: 'COMMON'
};

// Override Icons for Potions (Reuse generic for now)
for (const [key, data] of Object.entries(POTION_TYPES)) {
    if (ITEMS.CONSUMABLE[key]) {
        for (const t of TIERS) {
            if (ITEMS.CONSUMABLE[key][t]) {
                // Use generic potion icon or specific if available. 
                // T1_POTION_XP.webp, T1_POTION_GOLD.webp etc would be ideal.
                // For now, let's try to map to T{t}_POTION.webp as a generic base, or specific if user provided.
                // Given user said "remove broken icons", we'll leave them blank/default OR use a known working one?
                // User said "remove broken image, leave like others without icons".
                // So we DO NOT add overrides here. Logic stays clean.
            }
        }
    }
}

// Generate Crests
for (const t of TIERS) {
    ITEMS.SPECIAL.CREST[t] = {
        id: `T${t}_CREST`,
        name: 'Boss Crest',
        tier: t,
        type: 'CRAFTING_MATERIAL',
        icon: `/items/T${t}_CREST.webp`,
        scale: '150%',
        description: `A crest dropped by a Tier ${t} boss. Used for crafting Capes.`
    };
}

// Generate T1 Rune Shards (Unified system)
ITEMS.SPECIAL.RUNE_SHARD[1] = {
    id: `T1_RUNE_SHARD`,
    name: 'Rune Shard',
    tier: 1,
    type: 'CRAFTING_MATERIAL',
    rarity: 'UNCOMMON',
    noInventorySpace: true,
    description: 'A mysterious shard from a shattered rune. Used in rune crafting.'
};

ITEMS.SPECIAL.RUNE_SHARD['BATTLE'] = {
    id: `T1_BATTLE_RUNE_SHARD`,
    name: 'Battle Rune Shard',
    tier: 1,
    type: 'CRAFTING_MATERIAL',
    rarity: 'EPIC',
    rarityColor: '#9013fe',
    noInventorySpace: true,
    icon: '/items/shard_battle.webp',
    description: 'A shard forged in the heat of battle. Used for advanced rune crafting.'
};

// Generate Dungeon Chests
for (const t of TIERS) {
    // Normal (White)
    ITEMS.SPECIAL.CHEST[`${t}_NORMAL`] = {
        id: `T${t}_CHEST_NORMAL`,
        name: `Dungeon Chest (Normal)`,
        tier: t,
        rarity: 'COMMON',
        type: 'CONSUMABLE',
        rarityColor: '#ffffff',
        icon: `/items/T${t}_DG_CHEST.webp`,
        desc: 'Contains standard dungeon loot.'
    };
    // Good (Green)
    ITEMS.SPECIAL.CHEST[`${t}_GOOD`] = {
        id: `T${t}_CHEST_GOOD`,
        name: `Dungeon Chest (Good)`,
        tier: t,
        rarity: 'UNCOMMON',
        type: 'CONSUMABLE',
        rarityColor: '#10b981', // Green
        icon: `/items/T${t}_DG_CHEST.webp`,
        desc: 'Contains better dungeon loot.'
    };

    // Outstanding (Blue)
    ITEMS.SPECIAL.CHEST[`${t}_OUTSTANDING`] = {
        id: `T${t}_CHEST_OUTSTANDING`,
        name: `Dungeon Chest (Outstanding)`,
        tier: t,
        rarity: 'RARE',
        type: 'CONSUMABLE',
        rarityColor: '#4a90e2',
        icon: `/items/T${t}_DG_CHEST.webp`,
        desc: 'An outstanding chest with high value rewards.'
    };
    // Excellent (Purple)
    ITEMS.SPECIAL.CHEST[`${t}_EXCELLENT`] = {
        id: `T${t}_CHEST_EXCELLENT`,
        name: `Dungeon Chest (Excellent)`,
        tier: t,
        rarity: 'EPIC',
        type: 'CONSUMABLE',
        rarityColor: '#9013fe',
        icon: `/items/T${t}_DG_CHEST.webp`,
        desc: 'An excellent reward for great feats.'
    };
    // Masterpiece (Orange)
    ITEMS.SPECIAL.CHEST[`${t}_MASTERPIECE`] = {
        id: `T${t}_CHEST_MASTERPIECE`,
        name: `Dungeon Chest (Masterpiece)`,
        tier: t,
        rarity: 'LEGENDARY',
        type: 'CONSUMABLE',
        rarityColor: '#f5a623', // Orange/Gold
        icon: `/items/T${t}_DG_CHEST.webp`,
        desc: 'The highest quality chest with the best rewards.'
    };
    // Generic/Legacy Fallback
    ITEMS.SPECIAL.CHEST[`${t}_GENERIC`] = {
        id: `T${t}_DUNGEON_CHEST`,
        name: `Dungeon Chest`,
        tier: t,
        rarity: 'COMMON',
        type: 'CONSUMABLE',
        icon: `/items/T${t}_DG_CHEST.webp`,
        desc: 'A standard dungeon chest.'
    };

    // --- LEGACY ALIASES (Fix for crash) ---
    // We copy the object and override ID so resolveItem() indexes it correctly.
    ITEMS.SPECIAL.CHEST[`${t}_COMMON`] = { ...ITEMS.SPECIAL.CHEST[`${t}_NORMAL`], id: `T${t}_CHEST_COMMON` };
    ITEMS.SPECIAL.CHEST[`${t}_RARE`] = { ...ITEMS.SPECIAL.CHEST[`${t}_OUTSTANDING`], id: `T${t}_CHEST_RARE` };
    ITEMS.SPECIAL.CHEST[`${t}_GOLD`] = { ...ITEMS.SPECIAL.CHEST[`${t}_EXCELLENT`], id: `T${t}_CHEST_GOLD` };
    ITEMS.SPECIAL.CHEST[`${t}_MYTHIC`] = { ...ITEMS.SPECIAL.CHEST[`${t}_MASTERPIECE`], id: `T${t}_CHEST_MYTHIC` };

}

// T10 Dungeon Chest scale override (+14%)
['NORMAL', 'GOOD', 'OUTSTANDING', 'EXCELLENT', 'MASTERPIECE', 'GENERIC', 'COMMON', 'RARE', 'GOLD', 'MYTHIC'].forEach(q => {
    if (ITEMS.SPECIAL.CHEST[`10_${q}`]) ITEMS.SPECIAL.CHEST[`10_${q}`].scale = '144%';
});

// Generate WorldBoss Chests
for (const t of TIERS) {
    // Normal (White)
    ITEMS.SPECIAL.CHEST[`${t}_WORLDBOSS_NORMAL`] = {
        id: `T${t}_WORLDBOSS_CHEST_NORMAL`,
        name: `WorldBoss Chest (Normal)`,
        tier: t,
        rarity: 'COMMON',
        type: 'CONSUMABLE',
        rarityColor: '#ffffff',
        desc: 'An ordinary chest dropped by a World Boss.',
        icon: `/items/T${t}_WB_CHEST.webp`,
        scale: '150%'
    };
    // Good (Green)
    ITEMS.SPECIAL.CHEST[`${t}_WORLDBOSS_GOOD`] = {
        id: `T${t}_WORLDBOSS_CHEST_GOOD`,
        name: `WorldBoss Chest (Good)`,
        tier: t,
        rarity: 'UNCOMMON',
        type: 'CONSUMABLE',
        rarityColor: '#10b981', // Green
        desc: 'A good chest dropped by a World Boss.',
        icon: `/items/T${t}_WB_CHEST.webp`,
        scale: '150%'
    };

    // Outstanding (Blue)
    ITEMS.SPECIAL.CHEST[`${t}_WORLDBOSS_OUTSTANDING`] = {
        id: `T${t}_WORLDBOSS_CHEST_OUTSTANDING`,
        name: `WorldBoss Chest (Outstanding)`,
        tier: t,
        rarity: 'RARE',
        type: 'CONSUMABLE',
        rarityColor: '#4a90e2',
        desc: 'An outstanding chest dropped by a World Boss.',
        icon: `/items/T${t}_WB_CHEST.webp`,
        scale: '150%'
    };
    // Excellent (Purple)
    ITEMS.SPECIAL.CHEST[`${t}_WORLDBOSS_EXCELLENT`] = {
        id: `T${t}_WORLDBOSS_CHEST_EXCELLENT`,
        name: `WorldBoss Chest (Excellent)`,
        tier: t,
        rarity: 'EPIC',
        type: 'CONSUMABLE',
        rarityColor: '#9013fe', // Purple
        desc: 'An excellent chest dropped by a World Boss.',
        icon: `/items/T${t}_WB_CHEST.webp`,
        scale: '150%'
    };
    // Masterpiece (Orange)
    ITEMS.SPECIAL.CHEST[`${t}_WORLDBOSS_MASTERPIECE`] = {
        id: `T${t}_WORLDBOSS_CHEST_MASTERPIECE`,
        name: `WorldBoss Chest (Masterpiece)`,
        tier: t,
        rarity: 'LEGENDARY',
        type: 'CONSUMABLE',
        rarityColor: '#f5a623', // Orange/Gold
        desc: 'A masterpiece chest dropped by a World Boss.',
        icon: `/items/T${t}_WB_CHEST.webp`,
        scale: '150%'
    };
}

// Helper for Gear Generation
const genGear = (category, slot, type, idSuffix, matType, statMultipliers = {}) => {
    for (const t of TIERS) {
        const matId = `T${t}_${matType}`;
        const prevId = t > 1 ? `T${t - 1}_${idSuffix}` : null;

        let req = {};
        let mainMatCount = 0;

        // Cost Scaling - FIXED to 20 for all tiers/slots as requested
        mainMatCount = 20;

        req[matId] = mainMatCount;
        // Capes need crests
        if (type === 'CAPE') req[`T${t}_CREST`] = 1;

        const stats = {};
        if (statMultipliers.dmg) stats.damage = DMG_CURVE[t - 1] * statMultipliers.dmg;
        if (statMultipliers.def) stats.defense = DEF_CURVE[t - 1] * statMultipliers.def;
        if (statMultipliers.hp) stats.hp = HP_CURVE[t - 1] * statMultipliers.hp;
        if (statMultipliers.speed) {
            if (type === 'WEAPON') {
                stats.speed = statMultipliers.speed; // Fixed base for weapons
            } else {
                stats.speed = t * statMultipliers.speed; // Multiplier for gear
            }
        }
        if (statMultipliers.eff) stats.efficiency = 1; // Base value, logic moved to resolveItem
        if (statMultipliers.globalEff) {
            // New Curve: T1 (~1%) to T10 (~5% Base -> 15% Max)
            // Formula: (Tier * 0.45) + 0.55
            // T10 Base: 5.05. T10 MP: 15.15%
            // T1 Base: 1.00. T1 Normal: 1.00%
            const baseVal = parseFloat(((t * 0.45) + 0.55).toFixed(2));
            stats.efficiency = { GLOBAL: baseVal };
        }
        if (statMultipliers.atkSpeed) stats.attackSpeed = statMultipliers.atkSpeed; // Fixed base speed
        if (statMultipliers.crit) stats.critChance = t * statMultipliers.crit; // New Crit support

        const gear = {
            id: `T${t}_${idSuffix}`,
            name: toTitleCase(idSuffix),
            tier: t,
            req,
            xp: CRAFT_DATA.xp[t - 1],
            time: CRAFT_DATA.time[t - 1],
            ip: getBaseIP(t),
            type: type,
            isTool: !!statMultipliers.eff,
            stats,
            description: `A Tier ${t} ${toTitleCase(idSuffix)}. Equip to increase stats.`
        };

        // Assign to ITEMS structure
        if (!ITEMS.GEAR[category][slot]) ITEMS.GEAR[category][slot] = {};
        ITEMS.GEAR[category][slot][t] = gear;
    }
};

const genWarriorGear = (slot, type, idSuffix, matType, lookupName) => {
    for (const t of TIERS) {
        const matId = `T${t}_${matType}`;
        const req = { [matId]: 20 };
        if (type === 'CAPE') req[`T${t}_CREST`] = 1;

        // Default to Normal quality stats for the base item view
        const stats = WARRIOR_STATS_FIXED[lookupName][t][0];

        const gear = {
            id: `T${t}_${idSuffix}`,
            name: toTitleCase(idSuffix),
            tier: t,
            req,
            xp: CRAFT_DATA.xp[t - 1],
            time: CRAFT_DATA.time[t - 1],
            ip: getBaseIP(t),
            type: type,
            stats,
            isWarriorLookup: true,
            lookupName: lookupName,
            description: `A Tier ${t} ${toTitleCase(idSuffix)}. Specialized Warrior gear.`
        };

        if (!ITEMS.GEAR.WARRIORS_FORGE[slot]) ITEMS.GEAR.WARRIORS_FORGE[slot] = {};
        ITEMS.GEAR.WARRIORS_FORGE[slot][t] = gear;
    }
};

// --- WARRIOR GEAR ---
genWarriorGear('SWORD', 'WEAPON', 'SWORD', 'BAR', 'Sword');
genWarriorGear('SHEATH', 'OFF_HAND', 'SHEATH', 'BAR', 'Sheath');
genWarriorGear('PLATE_ARMOR', 'ARMOR', 'PLATE_ARMOR', 'BAR', 'Plate Armor');
genWarriorGear('PLATE_HELMET', 'HELMET', 'PLATE_HELMET', 'BAR', 'Plate Helmet');
genWarriorGear('PLATE_BOOTS', 'BOOTS', 'PLATE_BOOTS', 'BAR', 'Plate Boots');
genWarriorGear('PLATE_GLOVES', 'GLOVES', 'PLATE_GLOVES', 'BAR', 'Plate Gloves');
genWarriorGear('PLATE_CAPE', 'CAPE', 'PLATE_CAPE', 'BAR', 'Warrior Cape');

// Override Icons for Sheaths
for (const t of TIERS) {
    if (ITEMS.GEAR.WARRIORS_FORGE.SHEATH[t]) {
        ITEMS.GEAR.WARRIORS_FORGE.SHEATH[t].icon = `/items/T${t}_SHEATH.webp`;
        ITEMS.GEAR.WARRIORS_FORGE.SHEATH[t].scale = '190%';
    }
}

// --- HUNTER GEAR (FIXED LOOKUP) ---
const genHunterGear = (slot, type, idSuffix, matType, lookupName) => {
    for (const t of TIERS) {
        const matId = `T${t}_${matType}`;
        const req = { [matId]: 20 };
        if (type === 'CAPE') req[`T${t}_CREST`] = 1;

        // Default to Normal quality stats for the base item view
        // Hunter fixed stats structure: HUNTER_STATS_FIXED[lookupName][t][qualityId]
        const stats = HUNTER_STATS_FIXED[lookupName][t][0];

        const gear = {
            id: `T${t}_${idSuffix}`,
            name: toTitleCase(idSuffix),
            tier: t,
            req,
            xp: CRAFT_DATA.xp[t - 1],
            time: CRAFT_DATA.time[t - 1],
            ip: getBaseIP(t),
            type: type,
            stats,
            isHunterLookup: true,
            lookupName: lookupName,
            description: `A Tier ${t} ${toTitleCase(idSuffix)}. Specialized Hunter gear.`
        };

        if (!ITEMS.GEAR.HUNTERS_LODGE[slot]) ITEMS.GEAR.HUNTERS_LODGE[slot] = {};
        ITEMS.GEAR.HUNTERS_LODGE[slot][t] = gear;
    }
};

genHunterGear('BOW', 'WEAPON', 'BOW', 'PLANK', 'Bow');
genHunterGear('TORCH', 'OFF_HAND', 'TORCH', 'PLANK', 'Torch');
genHunterGear('LEATHER_ARMOR', 'ARMOR', 'LEATHER_ARMOR', 'LEATHER', 'Leather Armor');
genHunterGear('LEATHER_HELMET', 'HELMET', 'LEATHER_HELMET', 'LEATHER', 'Leather Helmet');
genHunterGear('LEATHER_BOOTS', 'BOOTS', 'LEATHER_BOOTS', 'LEATHER', 'Leather Boots');
genHunterGear('LEATHER_GLOVES', 'GLOVES', 'LEATHER_GLOVES', 'LEATHER', 'Leather Gloves');
genHunterGear('LEATHER_CAPE', 'CAPE', 'LEATHER_CAPE', 'LEATHER', 'Leather Cape');




// --- MAGE GEAR (FIXED LOOKUP 12/02/26) ---
// Using exact values from CSV

const genMageGear = (slot, type, idSuffix, matType, lookupName) => {
    for (const t of TIERS) {
        const matId = `T${t}_${matType}`;
        const req = { [matId]: 20 };
        if (type === 'CAPE') req[`T${t}_CREST`] = 1;

        // Default to Normal quality stats for the base item view
        const stats = MAGE_STATS_FIXED[lookupName][t][0];

        const gear = {
            id: `T${t}_${idSuffix}`,
            name: toTitleCase(idSuffix),
            tier: t,
            req,
            xp: CRAFT_DATA.xp[t - 1],
            time: CRAFT_DATA.time[t - 1],
            ip: getBaseIP(t),
            type: type,
            stats,
            isMageLookup: true,
            lookupName: lookupName,
            description: `A Tier ${t} ${toTitleCase(idSuffix)}. Specialized Mage gear.`
        };

        if (!ITEMS.GEAR.MAGES_TOWER[slot]) ITEMS.GEAR.MAGES_TOWER[slot] = {};
        ITEMS.GEAR.MAGES_TOWER[slot][t] = gear;
    }
};

genMageGear('FIRE_STAFF', 'WEAPON', 'FIRE_STAFF', 'PLANK', 'Fire Staff');
genMageGear('TOME', 'OFF_HAND', 'TOME', 'CLOTH', 'Tome');
genMageGear('CLOTH_ARMOR', 'ARMOR', 'CLOTH_ARMOR', 'CLOTH', 'Cloth Armor');
genMageGear('CLOTH_HELMET', 'HELMET', 'CLOTH_HELMET', 'CLOTH', 'Cloth Helmet');
genMageGear('CLOTH_BOOTS', 'BOOTS', 'CLOTH_BOOTS', 'CLOTH', 'Cloth Boots');
genMageGear('CLOTH_GLOVES', 'GLOVES', 'CLOTH_GLOVES', 'CLOTH', 'Cloth Gloves');
genMageGear('CAPE', 'CAPE', 'MAGE_CAPE', 'CLOTH', 'Mage Cape');

// --- TOOLMAKER ---
genGear('TOOLMAKER', 'PICKAXE', 'TOOL_PICKAXE', 'PICKAXE', 'BAR', { eff: 1 });
genGear('TOOLMAKER', 'AXE', 'TOOL_AXE', 'AXE', 'PLANK', { eff: 1 });
genGear('TOOLMAKER', 'SKINNING_KNIFE', 'TOOL_KNIFE', 'SKINNING_KNIFE', 'LEATHER', { eff: 1 });
genGear('TOOLMAKER', 'SICKLE', 'TOOL_SICKLE', 'SICKLE', 'CLOTH', { eff: 1 });
genGear('TOOLMAKER', 'FISHING_ROD', 'TOOL_ROD', 'FISHING_ROD', 'PLANK', { eff: 1 });
genGear('TOOLMAKER', 'POUCH', 'TOOL_POUCH', 'POUCH', 'LEATHER', { eff: 1 });

// --- ICON OVERRIDES FOR TOOLS ---
if (ITEMS.GEAR.TOOLMAKER.AXE[1]) { ITEMS.GEAR.TOOLMAKER.AXE[1].icon = '/items/T1_AXE.webp'; ITEMS.GEAR.TOOLMAKER.AXE[1].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[2]) { ITEMS.GEAR.TOOLMAKER.AXE[2].icon = '/items/T2_AXE.webp'; ITEMS.GEAR.TOOLMAKER.AXE[2].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[3]) { ITEMS.GEAR.TOOLMAKER.AXE[3].icon = '/items/T3_AXE.webp'; ITEMS.GEAR.TOOLMAKER.AXE[3].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[4]) { ITEMS.GEAR.TOOLMAKER.AXE[4].icon = '/items/T4_AXE.webp'; ITEMS.GEAR.TOOLMAKER.AXE[4].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[5]) { ITEMS.GEAR.TOOLMAKER.AXE[5].icon = '/items/T5_AXE.webp'; ITEMS.GEAR.TOOLMAKER.AXE[5].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[6]) { ITEMS.GEAR.TOOLMAKER.AXE[6].icon = '/items/T6_AXE.webp'; ITEMS.GEAR.TOOLMAKER.AXE[6].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[7]) { ITEMS.GEAR.TOOLMAKER.AXE[7].icon = '/items/T7_AXE.webp'; ITEMS.GEAR.TOOLMAKER.AXE[7].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[8]) { ITEMS.GEAR.TOOLMAKER.AXE[8].icon = '/items/T8_AXE.webp'; ITEMS.GEAR.TOOLMAKER.AXE[8].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[9]) { ITEMS.GEAR.TOOLMAKER.AXE[9].icon = '/items/T9_AXE.webp'; ITEMS.GEAR.TOOLMAKER.AXE[9].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[10]) { ITEMS.GEAR.TOOLMAKER.AXE[10].icon = '/items/T10_AXE.webp'; ITEMS.GEAR.TOOLMAKER.AXE[10].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[1]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[1].icon = '/items/T1_PICKAXE.webp'; ITEMS.GEAR.TOOLMAKER.PICKAXE[1].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[2]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[2].icon = '/items/T2_PICKAXE.webp'; ITEMS.GEAR.TOOLMAKER.PICKAXE[2].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[3]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[3].icon = '/items/T3_PICKAXE.webp'; ITEMS.GEAR.TOOLMAKER.PICKAXE[3].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[4]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[4].icon = '/items/T4_PICKAXE.webp'; ITEMS.GEAR.TOOLMAKER.PICKAXE[4].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[5]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[5].icon = '/items/T5_PICKAXE.webp'; ITEMS.GEAR.TOOLMAKER.PICKAXE[5].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[6]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[6].icon = '/items/T6_PICKAXE.webp'; ITEMS.GEAR.TOOLMAKER.PICKAXE[6].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[7]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[7].icon = '/items/T7_PICKAXE.webp'; ITEMS.GEAR.TOOLMAKER.PICKAXE[7].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[8]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[8].icon = '/items/T8_PICKAXE.webp'; ITEMS.GEAR.TOOLMAKER.PICKAXE[8].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[9]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[9].icon = '/items/T9_PICKAXE.webp'; ITEMS.GEAR.TOOLMAKER.PICKAXE[9].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[10]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[10].icon = '/items/T10_PICKAXE.webp'; ITEMS.GEAR.TOOLMAKER.PICKAXE[10].scale = '110%'; }

// --- ICON OVERRIDES FOR SICKLES ---
if (ITEMS.GEAR.TOOLMAKER.SICKLE[1]) { ITEMS.GEAR.TOOLMAKER.SICKLE[1].icon = '/items/T1_SICKLE.webp'; ITEMS.GEAR.TOOLMAKER.SICKLE[1].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[2]) { ITEMS.GEAR.TOOLMAKER.SICKLE[2].icon = '/items/T2_SICKLE.webp'; ITEMS.GEAR.TOOLMAKER.SICKLE[2].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[3]) { ITEMS.GEAR.TOOLMAKER.SICKLE[3].icon = '/items/T3_SICKLE.webp'; ITEMS.GEAR.TOOLMAKER.SICKLE[3].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[4]) { ITEMS.GEAR.TOOLMAKER.SICKLE[4].icon = '/items/T4_SICKLE.webp'; ITEMS.GEAR.TOOLMAKER.SICKLE[4].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[5]) { ITEMS.GEAR.TOOLMAKER.SICKLE[5].icon = '/items/T5_SICKLE.webp'; ITEMS.GEAR.TOOLMAKER.SICKLE[5].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[6]) { ITEMS.GEAR.TOOLMAKER.SICKLE[6].icon = '/items/T6_SICKLE.webp'; ITEMS.GEAR.TOOLMAKER.SICKLE[6].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[7]) { ITEMS.GEAR.TOOLMAKER.SICKLE[7].icon = '/items/T7_SICKLE.webp'; ITEMS.GEAR.TOOLMAKER.SICKLE[7].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[8]) { ITEMS.GEAR.TOOLMAKER.SICKLE[8].icon = '/items/T8_SICKLE.webp'; ITEMS.GEAR.TOOLMAKER.SICKLE[8].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[9]) { ITEMS.GEAR.TOOLMAKER.SICKLE[9].icon = '/items/T9_SICKLE.webp'; ITEMS.GEAR.TOOLMAKER.SICKLE[9].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[10]) { ITEMS.GEAR.TOOLMAKER.SICKLE[10].icon = '/items/T10_SICKLE.webp'; ITEMS.GEAR.TOOLMAKER.SICKLE[10].scale = '110%'; }

// --- ICON OVERRIDES FOR SKINNING KNIVES ---
if (ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[1]) { ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[1].icon = '/items/T1_KNIFE.webp'; ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[1].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[2]) { ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[2].icon = '/items/T2_KNIFE.webp'; ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[2].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[3]) { ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[3].icon = '/items/T3_KNIFE.webp'; ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[3].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[4]) { ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[4].icon = '/items/T4_KNIFE.webp'; ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[4].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[5]) { ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[5].icon = '/items/T5_KNIFE.webp'; ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[5].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[6]) { ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[6].icon = '/items/T6_KNIFE.webp'; ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[6].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[7]) { ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[7].icon = '/items/T7_KNIFE.webp'; ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[7].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[8]) { ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[8].icon = '/items/T8_KNIFE.webp'; ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[8].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[9]) { ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[9].icon = '/items/T9_KNIFE.webp'; ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[9].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[10]) { ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[10].icon = '/items/T10_KNIFE.webp'; ITEMS.GEAR.TOOLMAKER.SKINNING_KNIFE[10].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[1]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[1].icon = '/items/T1_FISHING_ROD.webp'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[1].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[2]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[2].icon = '/items/T2_FISHING_ROD.webp'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[2].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[3]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[3].icon = '/items/T3_FISHING_ROD.webp'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[3].scale = '170%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[4]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[4].icon = '/items/T4_FISHING_ROD.webp'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[4].scale = '170%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[5]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[5].icon = '/items/T5_FISHING_ROD.webp'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[5].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[6]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[6].icon = '/items/T6_FISHING_ROD.webp'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[6].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[7]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[7].icon = '/items/T7_FISHING_ROD.webp'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[7].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[8]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[8].icon = '/items/T8_FISHING_ROD.webp'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[8].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[9]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[9].icon = '/items/T9_FISHING_ROD.webp'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[9].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[10]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[10].icon = '/items/T10_FISHING_ROD.webp'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[10].scale = '110%'; }

// --- ICON OVERRIDES FOR POUCHES ---
if (ITEMS.GEAR.TOOLMAKER.POUCH[1]) { ITEMS.GEAR.TOOLMAKER.POUCH[1].icon = '/items/T1_POUCH.webp'; ITEMS.GEAR.TOOLMAKER.POUCH[1].scale = '100%'; }
if (ITEMS.GEAR.TOOLMAKER.POUCH[2]) { ITEMS.GEAR.TOOLMAKER.POUCH[2].icon = '/items/T2_POUCH.webp'; ITEMS.GEAR.TOOLMAKER.POUCH[2].scale = '100%'; }
if (ITEMS.GEAR.TOOLMAKER.POUCH[3]) { ITEMS.GEAR.TOOLMAKER.POUCH[3].icon = '/items/T3_POUCH.webp'; ITEMS.GEAR.TOOLMAKER.POUCH[3].scale = '100%'; }
if (ITEMS.GEAR.TOOLMAKER.POUCH[4]) { ITEMS.GEAR.TOOLMAKER.POUCH[4].icon = '/items/T4_POUCH.webp'; ITEMS.GEAR.TOOLMAKER.POUCH[4].scale = '100%'; }
if (ITEMS.GEAR.TOOLMAKER.POUCH[5]) { ITEMS.GEAR.TOOLMAKER.POUCH[5].icon = '/items/T5_POUCH.webp'; ITEMS.GEAR.TOOLMAKER.POUCH[5].scale = '100%'; }
if (ITEMS.GEAR.TOOLMAKER.POUCH[6]) { ITEMS.GEAR.TOOLMAKER.POUCH[6].icon = '/items/T6_POUCH.webp'; ITEMS.GEAR.TOOLMAKER.POUCH[6].scale = '100%'; }
if (ITEMS.GEAR.TOOLMAKER.POUCH[7]) { ITEMS.GEAR.TOOLMAKER.POUCH[7].icon = '/items/T7_POUCH.webp'; ITEMS.GEAR.TOOLMAKER.POUCH[7].scale = '100%'; }
if (ITEMS.GEAR.TOOLMAKER.POUCH[8]) { ITEMS.GEAR.TOOLMAKER.POUCH[8].icon = '/items/T8_POUCH.webp'; ITEMS.GEAR.TOOLMAKER.POUCH[8].scale = '100%'; }
if (ITEMS.GEAR.TOOLMAKER.POUCH[9]) { ITEMS.GEAR.TOOLMAKER.POUCH[9].icon = '/items/T9_POUCH.webp'; ITEMS.GEAR.TOOLMAKER.POUCH[9].scale = '100%'; }
if (ITEMS.GEAR.TOOLMAKER.POUCH[10]) { ITEMS.GEAR.TOOLMAKER.POUCH[10].icon = '/items/T10_POUCH.webp'; ITEMS.GEAR.TOOLMAKER.POUCH[10].scale = '100%'; }

// --- ICON OVERRIDES FOR PLATE ARMOR (WARRIOR) ---
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[1]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[1].icon = '/items/T1_PLATE_ARMOR.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[1].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[2]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[2].icon = '/items/T2_PLATE_ARMOR.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[2].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[3]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[3].icon = '/items/T3_PLATE_ARMOR.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[3].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[4]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[4].icon = '/items/T4_PLATE_ARMOR.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[4].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[5]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[5].icon = '/items/T5_PLATE_ARMOR.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[5].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[6]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[6].icon = '/items/T6_PLATE_ARMOR.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[6].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[7]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[7].icon = '/items/T7_PLATE_ARMOR.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[7].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[8]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[8].icon = '/items/T8_PLATE_ARMOR.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[8].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[9]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[9].icon = '/items/T9_PLATE_ARMOR.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[9].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[10]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[10].icon = '/items/T10_PLATE_ARMOR.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_ARMOR[10].scale = '190%'; }

// --- ICON OVERRIDES FOR PLATE BOOTS (WARRIOR) ---
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[1]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[1].icon = '/items/T1_PLATE_BOOTS.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[1].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[2]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[2].icon = '/items/T2_PLATE_BOOTS.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[2].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[3]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[3].icon = '/items/T3_PLATE_BOOTS.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[3].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[4]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[4].icon = '/items/T4_PLATE_BOOTS.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[4].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[5]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[5].icon = '/items/T5_PLATE_BOOTS.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[5].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[6]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[6].icon = '/items/T6_PLATE_BOOTS.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[6].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[7]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[7].icon = '/items/T7_PLATE_BOOTS.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[7].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[8]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[8].icon = '/items/T8_PLATE_BOOTS.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[8].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[9]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[9].icon = '/items/T9_PLATE_BOOTS.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[9].scale = '190%'; }
if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[10]) { ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[10].icon = '/items/T10_PLATE_BOOTS.webp'; ITEMS.GEAR.WARRIORS_FORGE.PLATE_BOOTS[10].scale = '190%'; }

// Generate Dungeon Chests
for (const t of TIERS) {
    // ... existing chest code ...
}

ITEMS.SPECIAL.MEMBERSHIP = {
    id: 'MEMBERSHIP',
    name: 'Membership',
    description: 'Use to activate 30 days of VIP status and exclusive benefits.',
    type: 'CONSUMABLE',
    tier: 1,
    icon: '/items/MEMBERSHIP.webp'
};

export const ITEM_LOOKUP = {};
// Global post-processing to link icons that follow standard naming: /items/T{tier}_{ID}.webp
const applyGlobalIconFixes = (obj) => {
    Object.values(obj).forEach(val => {
        if (val && typeof val === 'object') {
            if (val.id && val.tier) {
                const id = val.id.toUpperCase();
                // Apply to gear and tools that might be missing icons
                const gearTypes = ['WEAPON', 'OFF_HAND', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE',
                    'TOOL', 'TOOL_AXE', 'TOOL_PICKAXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'TOOL_POUCH'];

                if (!val.icon && gearTypes.includes(val.type)) {
                    // ONLY apply automatic guessing to items we KNOW have these assets
                    // Currently: AXE
                    const isAxe = id.includes('AXE') && !id.includes('PICKAXE');

                    if (isAxe) {
                        // Convention: /items/T{tier}_{NAME}.webp
                        const parts = id.split('_');
                        if (parts[0].match(/^T\d+$/)) {
                            const baseName = parts.slice(1).join('_');
                            val.icon = `/items/T${val.tier}_${baseName}.webp`;

                            // Apply specific scales for better UI fit
                            val.scale = '110%';
                        }
                    }
                }
            } else {
                applyGlobalIconFixes(val);
            }
        }
    });
};

// Run global fixes before indexing
applyGlobalIconFixes(ITEMS);

const indexItems = (obj) => {
    Object.values(obj).forEach(val => {
        if (val && typeof val === 'object') {
            if (val.id && val.name) {
                ITEM_LOOKUP[val.id] = val;
            } else {
                indexItems(val);
            }
        }
    });
};
indexItems(ITEMS); // Populate ITEM_LOOKUP so resolveItem works


export const resolveItem = (itemId, overrideQuality = null) => {
    if (!itemId) return null;

    // Normalize ID
    let rawId = String(itemId).trim();

    // Check for creator signature (e.g. T1_AXE::PlayerOne)
    let creatorName = null;
    if (rawId.includes('::')) {
        const signatureParts = rawId.split('::');
        rawId = signatureParts[0];
        creatorName = signatureParts[1];
    }

    const upperId = rawId.toUpperCase();

    // 1. Precise Lookup

    let qualityId = 0;
    let baseId = upperId;
    let baseItem = null;


    // 2. Quality Detection (Legacy Split Method - Safer)
    if (upperId.includes('_Q')) {
        const parts = upperId.split('_Q');
        // Handle cases where ID might have multiple _Q (unlikely but safe) by taking the last part?
        // Actually, the standard structure is ID_SUFFIX_QX.
        // If split has > 2 parts, it might be tricky.
        // Let's assume the LAST part is the quality if it's a number.
        const lastPart = parts[parts.length - 1];
        const possibleQ = parseInt(lastPart);

        if (!isNaN(possibleQ)) {
            qualityId = possibleQ;
            // The base ID is everything before the last _Q
            baseId = parts.slice(0, parts.length - 1).join('_Q');
            baseItem = ITEM_LOOKUP[baseId];
        }
    }

    // 3. Fallback/Direct Lookup if 2 failed
    if (!baseItem) {
        baseItem = ITEM_LOOKUP[baseId];
    }

    if (overrideQuality !== null) {
        // AUTO-HEALING: If ID encodes a quality suffix (e.g. _Q3) but override is 0,
        // we trust the ID quality instead of forcing the item to Common.
        if (overrideQuality === 0 && qualityId > 0) {
            // Keep detected qualityId
        } else {
            qualityId = overrideQuality;
        }
    }

    if (!baseItem) return null;

    const quality = QUALITIES[qualityId] || QUALITIES[0];

    // RESTRICTION: Only Equipment types can have quality bonuses.
    // Materials (WOOD, ORE, etc), Refined (PLANK, BAR, etc), and Consumables (FOOD) are always Normal.
    const equipmentTypes = [
        'WEAPON', 'OFF_HAND', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE',
        'TOOL', 'TOOL_AXE', 'TOOL_PICKAXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'TOOL_POUCH'
    ];
    const canHaveQuality = equipmentTypes.includes(baseItem.type);

    // If it can't have quality but we have a quality suffix, we treat it as Normal (Id stays original)
    const effectiveQualityId = canHaveQuality ? qualityId : 0;
    const effectiveQuality = canHaveQuality ? quality : QUALITIES[0];

    const ipBonus = effectiveQuality.ipBonus || 0;
    const statMultiplier = 1 + (ipBonus / 100);

    const newStats = {};
    if (baseItem.stats) {
        if (baseItem.isHunterLookup) {
            const lookup = HUNTER_STATS_FIXED[baseItem.lookupName];
            if (lookup && lookup[baseItem.tier] && lookup[baseItem.tier][effectiveQualityId]) {
                const fixedStats = lookup[baseItem.tier][effectiveQualityId];
                for (const key in fixedStats) {
                    newStats[key] = fixedStats[key];
                }
            } else {
                for (const key in baseItem.stats) newStats[key] = baseItem.stats[key];
            }
        } else if (baseItem.isMageLookup) {
            // 12/02/26: Fixed Lookup Table for Mage Rebalance
            const lookup = MAGE_STATS_FIXED[baseItem.lookupName];
            if (lookup && lookup[baseItem.tier] && lookup[baseItem.tier][effectiveQualityId]) {
                const fixedStats = lookup[baseItem.tier][effectiveQualityId];
                for (const key in fixedStats) {
                    newStats[key] = fixedStats[key];
                }
            } else {
                // Fallback
                for (const key in baseItem.stats) newStats[key] = baseItem.stats[key];
            }
        } else if (baseItem.isWarriorLookup) {
            const lookup = WARRIOR_STATS_FIXED[baseItem.lookupName];
            if (lookup && lookup[baseItem.tier] && lookup[baseItem.tier][effectiveQualityId]) {
                const fixedStats = lookup[baseItem.tier][effectiveQualityId];
                for (const key in fixedStats) {
                    newStats[key] = fixedStats[key];
                }
            } else {
                for (const key in baseItem.stats) newStats[key] = baseItem.stats[key];
            }
        } else {
            for (const key in baseItem.stats) {
                if (typeof baseItem.stats[key] === 'number') {
                    if (key === 'efficiency' && baseItem.isTool) {
                        const index = (baseItem.tier - 1) * 5 + effectiveQualityId;

                        // Formula: 1.0 + (Index * (44 / 49))
                        newStats[key] = parseFloat((1.0 + (index * (44 / 49))).toFixed(1));
                    } else if (key === 'speed') {
                        // Universal Speed Calculation
                        // For Weapons: Base (e.g. 1300) + Bonus. High = Fast.
                        // For Gear: Base (e.g. 5) + Bonus. High = Fast.

                        if (baseItem.type === 'WEAPON') {
                            // Weapon Bonus: ((Tier - 1) * 15) + (effectiveQualityId * 3)
                            // Added to base Speed.
                            const bonus = ((baseItem.tier - 1) * 15) + (effectiveQualityId * 3);
                            newStats[key] = baseItem.stats[key] + bonus;
                        } else if (baseItem.stats[key] > 10) {
                            // High Gear Speed (New Scaling): Follows Quality Multiplier
                            newStats[key] = parseFloat((baseItem.stats[key] * statMultiplier).toFixed(1));
                        } else if (key === 'critChance') {
                            // Crit Chance (New Scaling): Follows Quality Multiplier
                            newStats[key] = parseFloat((baseItem.stats[key] * statMultiplier).toFixed(2));
                        } else {
                            // Low Gear Speed (Legacy): Small additive bonus
                            const speedVal = ((baseItem.tier - 1) * 5) + 1 + effectiveQualityId;
                            newStats[key] = speedVal;
                        }
                    } else {
                        newStats[key] = parseFloat((baseItem.stats[key] * statMultiplier).toFixed(1));
                    }
                } else if (key === 'efficiency' && typeof baseItem.stats[key] === 'object') {
                    // Handle Efficiency Object specifically
                    newStats[key] = {};
                    for (const subKey in baseItem.stats[key]) {
                        if (subKey === 'GLOBAL') {
                            // 50-step linear progression: 10 Tiers * 5 Qualities
                            // Index: 0 (T1 Normal) to 49 (T10 Masterpiece)
                            const index = (baseItem.tier - 1) * 5 + effectiveQualityId;
                            // Formula: 1.0 + (Index * (14 / 49))
                            // Explicitly rounding to 1 decimal place to ensure 15.0
                            const calculated = 1.0 + (index * (14 / 49));
                            newStats[key][subKey] = Math.round(calculated * 10) / 10;
                        } else {
                            newStats[key][subKey] = parseFloat((baseItem.stats[key][subKey] * statMultiplier).toFixed(1));
                        }
                    }
                } else {
                    newStats[key] = baseItem.stats[key];
                }
            }
        }
    }

    // Determine Rarity Name prefix
    const qualityPrefix = (quality.name && quality.name !== 'Normal') ? `${quality.name} ` : '';

    const finalItem = {
        ...baseItem,
        id: itemId,
        name: baseItem.name,
        rarityColor: baseItem.rarityColor || effectiveQuality.color || '#fff',
        quality: effectiveQualityId,
        qualityName: effectiveQuality.name,
        originalId: baseId,
        craftedBy: creatorName, // Ensure signature is part of the resolved object
        ip: (baseItem.ip || 0) + ipBonus,
        stats: newStats
    };


    // Secondary emergency fix for ORE and LEATHER T1
    if (baseId === 'T1_ORE' && !finalItem.icon) finalItem.icon = '/items/T1_ORE.webp';
    if (baseId === 'T1_LEATHER' && !finalItem.icon) finalItem.icon = '/items/T1_LEATHER.webp';

    // GLOBAL MIGRATION FIX: Force .webp for all item icons (Migration PNG -> WEBP)
    if (finalItem.icon && typeof finalItem.icon === 'string' && finalItem.icon.endsWith('.png')) {
        finalItem.icon = finalItem.icon.replace('.png', '.webp');
    }

    return finalItem;
};


export const getTierColor = (tier) => {
    const colors = {
        1: '#9e9e9e', 2: '#ffffff', 3: '#4caf50', 4: '#42a5f5', 5: '#ab47bc',
        6: '#ff9800', 7: '#f44336', 8: '#ffd700', 9: '#00e5ff', 10: '#ff4081'
    };
    return colors[tier] || '#9e9e9e';
};
export const calculateItemSellPrice = (item, itemId) => {
    if (!item) return 0;

    const tier = item.tier || 1;
    const rarity = (item.rarity || 'COMMON').toUpperCase();

    // 1. Raw Resources (Gathering materials like Wood, Ore, etc. - no 'req' property)
    const rawResourcePrices = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 11, 6: 16, 7: 22, 8: 29, 9: 37, 10: 46 };

    // 2. Refined Resources (Planks, Bars, Leather, etc. - have 'req' property)
    const refinedResourcePrices = { 1: 4, 2: 8, 3: 15, 4: 25, 5: 38, 6: 54, 7: 73, 8: 95, 9: 120, 10: 148 };

    // 3. Potions
    const potionPrices = { 1: 22, 2: 44, 3: 83, 4: 138, 5: 209, 6: 297, 7: 402, 8: 523, 9: 660, 10: 814 };

    // 4. Crafted Items (Equipment/Weapons) - Based on Tier and Rarity
    const craftedPrices = {
        1: { COMMON: 88, UNCOMMON: 114, RARE: 150, EPIC: 202, LEGENDARY: 282, MYTHIC: 423 },
        2: { COMMON: 176, UNCOMMON: 229, RARE: 299, EPIC: 405, LEGENDARY: 563, MYTHIC: 844 },
        3: { COMMON: 330, UNCOMMON: 429, RARE: 561, EPIC: 759, LEGENDARY: 1056, MYTHIC: 1584 },
        4: { COMMON: 550, UNCOMMON: 715, RARE: 935, EPIC: 1265, LEGENDARY: 1760, MYTHIC: 2640 },
        5: { COMMON: 836, UNCOMMON: 1087, RARE: 1421, EPIC: 1923, LEGENDARY: 2675, MYTHIC: 4012 },
        6: { COMMON: 1188, UNCOMMON: 1544, RARE: 2020, EPIC: 2732, LEGENDARY: 3802, MYTHIC: 5703 },
        7: { COMMON: 1606, UNCOMMON: 2088, RARE: 2730, EPIC: 3694, LEGENDARY: 5139, MYTHIC: 7708 },
        8: { COMMON: 2090, UNCOMMON: 2717, RARE: 3553, EPIC: 4807, LEGENDARY: 6688, MYTHIC: 10032 },
        9: { COMMON: 2640, UNCOMMON: 3432, RARE: 4488, EPIC: 6072, LEGENDARY: 8448, MYTHIC: 12672 },
        10: { COMMON: 3256, UNCOMMON: 4233, RARE: 5535, EPIC: 7489, LEGENDARY: 10419, MYTHIC: 15628 }
    };

    // 5. Default Base Prices (Original fallback)
    const defaultPrices = { 1: 5, 2: 15, 3: 40, 4: 100, 5: 250, 6: 600, 7: 1500, 8: 4000, 9: 10000, 10: 25000 };

    if (item.type === 'RESOURCE') {
        const isRefined = item.req && Object.keys(item.req).length > 0;
        if (isRefined) {
            return refinedResourcePrices[tier] || 4;
        }
        return rawResourcePrices[tier] || 1;
    }

    if (item.type === 'POTION') {
        return potionPrices[tier] || 22;
    }

    if (item.type === 'FOOD') {
        const foodPrices = { 1: 1, 2: 2, 3: 5, 4: 8, 5: 13, 6: 19, 7: 26, 8: 35, 9: 44, 10: 55 };
        return foodPrices[tier] || 1;
    }

    if (craftedPrices[tier]) {
        return craftedPrices[tier][rarity] || craftedPrices[tier]['COMMON'] || defaultPrices[tier] || 5;
    }

    return defaultPrices[tier] || 5;
};

/**
 * Centralized mapping of item ID + Action Type to Skill Key.
 * Shared between Client and Server to ensure consistency.
 */
export const getSkillForItem = (itemId, actionType) => {
    if (!itemId) return null;
    const id = String(itemId).toUpperCase();
    const type = String(actionType).toUpperCase();

    if (type === 'GATHERING') {
        if (id.includes('FISH') || id.includes('ROD')) return 'FISHING';
        if (id.includes('ORE') || id.includes('PICKAXE')) return 'ORE_MINER';
        if (id.includes('WOOD') || id.includes('AXE')) return 'LUMBERJACK';
        if (id.includes('HIDE') || id.includes('KNIFE')) return 'ANIMAL_SKINNER';
        if (id.includes('FIBER') || id.includes('SICKLE')) return 'FIBER_HARVESTER';
        if (id.includes('HERB') || id.includes('POUCH')) return 'HERBALISM';
    }

    if (type === 'REFINING') {
        if (id.includes('PLANK')) return 'PLANK_REFINER';
        if (id.includes('BAR')) return 'METAL_BAR_REFINER';
        if (id.includes('LEATHER')) return 'LEATHER_REFINER';
        if (id.includes('CLOTH')) return 'CLOTH_REFINER';
        if (id.includes('EXTRACT')) return 'DISTILLATION';
    }

    if (type === 'CRAFTING') {
        // Tools & Pouches
        if (id.includes('PICKAXE') || id.includes('AXE') || id.includes('KNIFE') || id.includes('SICKLE') || id.includes('ROD') || id.includes('POUCH')) {
            return 'TOOL_CRAFTER';
        }
        // Warrior
        // Warrior - Includes PLATE (Armor, Boots, Helm, Gloves), SWORD, SHEATH, CAPE
        if (id.includes('SWORD') || id.includes('PLATE') || id.includes('SHEATH') || id.includes('WARRIOR_CAPE')) {
            return 'WARRIOR_CRAFTER';
        }
        // Hunter - Includes LEATHER (Armor, Boots, Helm, Gloves), BOW, TORCH
        if (id.includes('BOW') || id.includes('LEATHER') || id.includes('TORCH') || id.includes('HUNTER_CAPE')) {
            return 'HUNTER_CRAFTER';
        }
        // Mage - Includes CLOTH (Armor, Boots, Helm, Gloves), STAFF, TOME
        if (id.includes('STAFF') || id.includes('CLOTH') || id.includes('TOME') || id.includes('MAGE_CAPE')) {
            return 'MAGE_CRAFTER';
        }
        // General Capes fallback
        if (id.includes('CAPE')) return 'WARRIOR_CRAFTER';
        // Consumables
        if (id.includes('FOOD')) return 'COOKING';
        if (id.includes('POTION')) return 'ALCHEMY';
    }

    if (type === 'COOKING') return 'COOKING';

    return null;
};

/**
 * Returns the required skill level for a given tier.
 */
export const getLevelRequirement = (tier) => {
    const t = parseInt(tier) || 1;
    if (t === 1) return 1;
    return (t - 1) * 10;
};

/**
 * Returns the proficiency group ('warrior', 'hunter', 'mage') required for an item.
 */
export const getRequiredProficiencyGroup = (itemId) => {
    if (!itemId) return null;
    const id = String(itemId).toUpperCase();
    if (id.includes('_RUNE_')) return null;

    // Warrior: PLATE, SWORD, SHEATH
    if (id.includes('SWORD') || id.includes('PLATE') || id.includes('SHEATH') || id.includes('WARRIOR_CAPE')) {
        return 'warrior';
    }
    // Hunter: LEATHER, BOW, TORCH
    if (id.includes('BOW') || id.includes('LEATHER') || id.includes('TORCH') || id.includes('HUNTER_CAPE')) {
        return 'hunter';
    }
    // Mage: CLOTH, STAFF, TOME
    if (id.includes('STAFF') || id.includes('CLOTH') || id.includes('TOME') || id.includes('MAGE_CAPE')) {
        return 'mage';
    }

    return null;
};

export const calculateRuneBonus = (tier, stars, effType = null) => {
    const starBonusMap = { 1: 1, 2: 3, 3: 5 }; // Max 3 stars
    let bonus = (tier - 1) * 5 + (starBonusMap[stars] || stars);

    // SPEED (Auto-Refine) runes give half bonus (max ~25% instead of ~50%)
    if (effType === 'SPEED') {
        bonus = Math.max(1, Math.floor(bonus / 2));
    }

    // ATTACK (Combat) and ATTACK_SPEED runes: Specific linear growth requested by user
    if (effType === 'ATTACK' || effType === 'ATTACK_SPEED') {
        const combatBonusMap = {
            1: { 1: 0.5, 2: 1.2, 3: 1.8 },
            2: { 1: 2.5, 2: 3.2, 3: 3.9 },
            3: { 1: 4.5, 2: 5.2, 3: 5.9 },
            4: { 1: 6.6, 2: 7.2, 3: 7.9 },
            5: { 1: 8.6, 2: 9.2, 3: 9.9 },
            6: { 1: 10.6, 2: 11.3, 3: 11.9 },
            7: { 1: 12.6, 2: 13.3, 3: 14.0 },
            8: { 1: 14.6, 2: 15.3, 3: 16.0 },
            9: { 1: 16.6, 2: 17.3, 3: 18.0 },
            10: { 1: 18.7, 2: 19.3, 3: 20.0 }
        };
        const tierData = combatBonusMap[tier] || combatBonusMap[1];
        return tierData[stars] || tierData[1];
    }

    // Food Saving runes give 30% bonus (max ~15% instead of ~50%)
    if (effType === 'SAVE_FOOD') {
        bonus = Math.max(1, Math.floor(bonus * 0.3));
    }

    // BURST (Critical Strike) runes give 30% bonus (max 15% instead of ~50%)
    // Fix: Burst Chance shouldn't be too high (cap at 15%)
    if (effType === 'BURST') {
        bonus = Math.max(1, Math.floor(bonus * 0.3));
    }

    return bonus;
};

// Generate Runes & Shards
export const RUNE_GATHER_ACTIVITIES = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'HERB', 'FISH'];
export const RUNE_REFINE_ACTIVITIES = ['METAL', 'PLANK', 'LEATHER', 'CLOTH', 'EXTRACT'];
export const RUNE_CRAFT_ACTIVITIES = ['WARRIOR', 'HUNTER', 'MAGE', 'TOOLS', 'COOKING', 'ALCHEMY'];
export const RUNE_COMBAT_ACTIVITIES = ['ATTACK'];
const RUNE_EFFECTS = ['XP', 'COPY', 'SPEED', 'EFF', 'BOOST'];

// Export for server usage
export const ALL_RUNE_TYPES = [];
export const RUNES_BY_CATEGORY = {
    GATHERING: [],
    REFINING: [],
    CRAFTING: [],
    COMBAT: []
};

RUNE_GATHER_ACTIVITIES.forEach(act => {
    ['XP', 'COPY', 'SPEED'].forEach(eff => {
        const type = `${act}_${eff}`;
        ALL_RUNE_TYPES.push(type);
        RUNES_BY_CATEGORY.GATHERING.push(type);
    });
});

RUNE_REFINE_ACTIVITIES.forEach(act => {
    ['XP', 'COPY', 'EFF'].forEach(eff => {
        const type = `${act}_${eff}`;
        ALL_RUNE_TYPES.push(type);
        RUNES_BY_CATEGORY.REFINING.push(type);
    });
});

RUNE_CRAFT_ACTIVITIES.forEach(act => {
    ['XP', 'COPY', 'EFF'].forEach(eff => {
        const type = `${act}_${eff}`;
        ALL_RUNE_TYPES.push(type);
        RUNES_BY_CATEGORY.CRAFTING.push(type);
    });
});

RUNE_COMBAT_ACTIVITIES.forEach(act => {
    ['ATTACK', 'SAVE_FOOD', 'BURST', 'ATTACK_SPEED'].forEach(eff => {
        const type = `${act}_${eff}`;
        ALL_RUNE_TYPES.push(type);
        RUNES_BY_CATEGORY.COMBAT.push(type);
    });
});

for (const t of TIERS) {
    // Rune Shards (All Tiers)
    ITEMS.SPECIAL.RUNE_SHARD[`T${t}_SHARD`] = {
        id: `T${t}_SHARD`,
        name: `T${t} Runic Shard`,
        tier: t,
        type: 'RESOURCE',
        description: `A fragment of magical power from Tier ${t}.`,
        noInventorySpace: true
    };

    // Legacy Support for T1_RUNE_SHARD if needed
    if (t === 1) {
        ITEMS.SPECIAL.RUNE_SHARD[`T1_RUNE_SHARD`] = {
            id: `T1_RUNE_SHARD`,
            name: `Rune Shard`,
            tier: 1,
            type: 'RESOURCE',
            noInventorySpace: true
        };
    }

    // Runes (Hidden from main inventory)
    ALL_RUNE_TYPES.forEach(typeKey => {
        const parts = typeKey.split('_');
        const act = parts[0];
        const eff = parts.slice(1).join('_');

        for (let s = 1; s <= 3; s++) {
            const id = `T${t}_RUNE_${act}_${eff}_${s}STAR`;

            // Map nice display names
            const ACT_NAME_MAP = {
                WOOD: 'Woodcutting', ORE: 'Mining', HIDE: 'Skinning', FIBER: 'Fiber', FISH: 'Fishing', HERB: 'Herbalism',
                METAL: 'Metal', PLANK: 'Plank', LEATHER: 'Leather', CLOTH: 'Cloth', EXTRACT: 'Extract',
                WARRIOR: 'Warrior', HUNTER: 'Hunter', MAGE: 'Mage', TOOLS: 'Tools', COOKING: 'Cooking', ALCHEMY: 'Alchemy',
                ATTACK: 'Combat'
            };
            const EFF_NAME_MAP = { XP: 'XP', COPY: 'Duplication', SPEED: 'Auto-Refine', EFF: 'Efficiency', ATTACK: 'Attack', SAVE_FOOD: 'Food Saving', BURST: 'Burst', ATTACK_SPEED: 'Attack Speed' };
            const EFF_LABEL_MAP = { XP: 'Experience', COPY: 'Duplication', SPEED: 'Auto-Refine Chance', EFF: 'Speed', ATTACK: 'Damage', SAVE_FOOD: 'Conservation', BURST: 'Critical Chance', ATTACK_SPEED: 'Attack Speed' };

            const actName = ACT_NAME_MAP[act] || act;
            let effName = EFF_NAME_MAP[eff] || eff;
            let effectLabel = EFF_LABEL_MAP[eff] || eff;

            // SPECIAL CASE: Fishing SPEED rune is "Auto-Cooking"
            if (act === 'FISH' && eff === 'SPEED') {
                effName = 'Auto-Cooking';
                effectLabel = 'Auto-Cooking Chance';
            }

            const bonusValue = calculateRuneBonus(t, s, eff);

            let description = '';
            if (eff === 'SPEED') {
                if (act === 'FISH') {
                    description = `Chance to automatically cook raw fish while fishing by ${bonusValue}%.`;
                } else {
                    description = `Chance to automatically refine gathered materials by ${bonusValue}%.`;
                }
            } else if (eff === 'EFF' || eff === 'ATTACK') {
                description = `Increases ${eff === 'EFF' ? 'speed' : 'damage'} by ${bonusValue}%.`;
            } else if (eff === 'SAVE_FOOD') {
                description = `Chance to consume no food when healing by ${bonusValue}%.`;
            } else if (eff === 'BURST') {
                description = `${bonusValue}% Chance to deal 1.5x damage on hit.`;
            } else {
                description = `Increases ${actName} ${effectLabel} by ${bonusValue}%.`;
            }

            if (!ITEMS.SPECIAL.RUNE) ITEMS.SPECIAL.RUNE = {};

            const rarityMap = { 1: 'COMMON', 2: 'RARE', 3: 'LEGENDARY' };
            const qualityIdMap = { 1: 0, 2: 2, 3: 4 };

            ITEMS.SPECIAL.RUNE[id] = {
                id: id,
                name: `T${t} ${actName} Rune of ${effName}`,
                tier: t,
                type: 'RUNE',
                stars: s,
                rarity: rarityMap[s] || 'COMMON',
                noInventorySpace: true,
                description: description,
                icon: '',
                rarityColor: QUALITIES[qualityIdMap[s]] ? QUALITIES[qualityIdMap[s]].color : '#fff'
            };
        }
    });
}




// Override Icons for Swords
for (const t of TIERS) {
    if (ITEMS.GEAR.WARRIORS_FORGE.SWORD[t]) {
        ITEMS.GEAR.WARRIORS_FORGE.SWORD[t].icon = `/items/T${t}_SWORD.webp`;
        ITEMS.GEAR.WARRIORS_FORGE.SWORD[t].scale = '190%';
    }
}

// Override Icons for Plate Helmets
for (const t of TIERS) {
    if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_HELMET[t]) {
        ITEMS.GEAR.WARRIORS_FORGE.PLATE_HELMET[t].icon = `/items/T${t}_PLATE_HELMET.webp`;
        ITEMS.GEAR.WARRIORS_FORGE.PLATE_HELMET[t].scale = '190%';
    }
}

// Override Icons for Plate Gloves
for (const t of TIERS) {
    if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_GLOVES[t]) {
        ITEMS.GEAR.WARRIORS_FORGE.PLATE_GLOVES[t].icon = `/items/T${t}_PLATE_GLOVES.webp`;
        ITEMS.GEAR.WARRIORS_FORGE.PLATE_GLOVES[t].scale = '190%';
    }
}

// Override Icons for Plate Capes
for (const t of TIERS) {
    if (ITEMS.GEAR.WARRIORS_FORGE.PLATE_CAPE[t]) {
        ITEMS.GEAR.WARRIORS_FORGE.PLATE_CAPE[t].icon = `/items/T${t}_PLATE_CAPE.webp`;
        ITEMS.GEAR.WARRIORS_FORGE.PLATE_CAPE[t].scale = '190%';
    }
}

// Index items AFTER generation
indexItems(ITEMS);

// Format item ID for display (replace underscores with spaces and capitalize)
export const formatItemId = (itemId) => {
    if (!itemId) return '';
    return itemId
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
};

