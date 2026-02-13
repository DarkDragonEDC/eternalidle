import { HUNTER_STATS_FIXED } from './hunter_stats_fixed.js';
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
            rarity: 'LEGENDARY'
        },
        NAME_CHANGE_TOKEN: {
            id: 'NAME_CHANGE_TOKEN',
            name: 'Name Change Token',
            description: 'Use to unlock a one-time character name change.',
            type: 'CONSUMABLE',
            rarity: 'EPIC'
        }
    },
    GEAR: {
        WARRIORS_FORGE: { SWORD: {}, SHIELD: {}, PLATE_ARMOR: {}, PLATE_HELMET: {}, PLATE_BOOTS: {}, PLATE_GLOVES: {}, PLATE_CAPE: {}, PICKAXE: {} },
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
            name: `${type.charAt(0) + type.slice(1).toLowerCase()}`,
            tier: t,
            type: 'RESOURCE',
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
            name: type.charAt(0) + type.slice(1).toLowerCase(),
            tier: t,
            type: 'RESOURCE',
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
if (ITEMS.RAW.WOOD[1]) ITEMS.RAW.WOOD[1].icon = '/items/T1_WOOD.png';

ITEMS.RAW.WOOD[2].icon = '/items/T2_WOOD.png';
ITEMS.RAW.WOOD[3].icon = '/items/T3_WOOD.png';
ITEMS.RAW.WOOD[4].icon = '/items/T4_WOOD.png';
ITEMS.RAW.WOOD[5].icon = '/items/T5_WOOD.png';
ITEMS.RAW.WOOD[6].icon = '/items/T6_WOOD.png';
ITEMS.RAW.WOOD[7].icon = '/items/T7_WOOD.png';
ITEMS.RAW.WOOD[8].icon = '/items/T8_WOOD.png';
ITEMS.RAW.WOOD[9].icon = '/items/T9_WOOD.png';
ITEMS.RAW.WOOD[10].icon = '/items/T10_WOOD.png';

// Override Icon for T1 Ore
if (ITEMS.RAW.ORE[1]) ITEMS.RAW.ORE[1].icon = '/items/T1_ORE.png';

// Override Icon for T1 Hide
if (ITEMS.RAW.HIDE[1]) ITEMS.RAW.HIDE[1].icon = '/items/T1_HIDE.png';

// Override Icon for T2 Hide
if (ITEMS.RAW.HIDE[2]) ITEMS.RAW.HIDE[2].icon = '/items/T2_HIDE.png';

// Override Icon for T3 Hide
if (ITEMS.RAW.HIDE[3]) ITEMS.RAW.HIDE[3].icon = '/items/T3_HIDE.png';

// Override Icon for T4 Hide
if (ITEMS.RAW.HIDE[4]) ITEMS.RAW.HIDE[4].icon = '/items/T4_HIDE.png';

// Override Icon for T5 Hide
if (ITEMS.RAW.HIDE[5]) ITEMS.RAW.HIDE[5].icon = '/items/T5_HIDE.png';

// Override Icon for T6 Hide
if (ITEMS.RAW.HIDE[6]) ITEMS.RAW.HIDE[6].icon = '/items/T6_HIDE.png';

// Override Icon for T7 Hide
if (ITEMS.RAW.HIDE[7]) ITEMS.RAW.HIDE[7].icon = '/items/T7_HIDE.png';

// Override Icon for T8 Hide
if (ITEMS.RAW.HIDE[8]) ITEMS.RAW.HIDE[8].icon = '/items/T8_HIDE.png';

// Override Icon for T9 Hide
if (ITEMS.RAW.HIDE[9]) ITEMS.RAW.HIDE[9].icon = '/items/T9_HIDE.png';

// Override Icon for T10 Hide
if (ITEMS.RAW.HIDE[10]) ITEMS.RAW.HIDE[10].icon = '/items/T10_HIDE.png';

// Override Icon for T1 Fish
if (ITEMS.RAW.FISH[1]) ITEMS.RAW.FISH[1].icon = '/items/T1_FISH.png';

// Override Icon for T2 Fish
if (ITEMS.RAW.FISH[2]) ITEMS.RAW.FISH[2].icon = '/items/T2_FISH.png';

// Override Icon for T3 Fish
if (ITEMS.RAW.FISH[3]) ITEMS.RAW.FISH[3].icon = '/items/T3_FISH.png';

// Override Icon for T4 Fish
if (ITEMS.RAW.FISH[4]) ITEMS.RAW.FISH[4].icon = '/items/T4_FISH.png';

// Override Icon for T5 Fish
if (ITEMS.RAW.FISH[5]) ITEMS.RAW.FISH[5].icon = '/items/T5_FISH.png';

// Override Icon for T6 Fish
if (ITEMS.RAW.FISH[6]) ITEMS.RAW.FISH[6].icon = '/items/T6_FISH.png';

// Override Icon for T7 Fish
if (ITEMS.RAW.FISH[7]) ITEMS.RAW.FISH[7].icon = '/items/T7_FISH.png';

// Override Icon for T8 Fish
if (ITEMS.RAW.FISH[8]) ITEMS.RAW.FISH[8].icon = '/items/T8_FISH.png';

// Override Icon for T9 Fish
if (ITEMS.RAW.FISH[9]) ITEMS.RAW.FISH[9].icon = '/items/T9_FISH.png';

// Override Icon for T10 Fish
if (ITEMS.RAW.FISH[10]) ITEMS.RAW.FISH[10].icon = '/items/T10_FISH.png';
if (ITEMS.RAW.ORE[2]) ITEMS.RAW.ORE[2].icon = '/items/T2_ORE.png';
if (ITEMS.RAW.ORE[3]) ITEMS.RAW.ORE[3].icon = '/items/T3_ORE.png';
if (ITEMS.RAW.ORE[4]) ITEMS.RAW.ORE[4].icon = '/items/T4_ORE.png';
if (ITEMS.RAW.ORE[5]) ITEMS.RAW.ORE[5].icon = '/items/T5_ORE.png';
if (ITEMS.RAW.ORE[6]) ITEMS.RAW.ORE[6].icon = '/items/T6_ORE.png';
if (ITEMS.RAW.ORE[7]) { ITEMS.RAW.ORE[7].icon = '/items/T7_ORE.png'; ITEMS.RAW.ORE[7].scale = '170%'; }
if (ITEMS.RAW.ORE[8]) ITEMS.RAW.ORE[8].icon = '/items/T8_ORE.png';
if (ITEMS.RAW.ORE[9]) ITEMS.RAW.ORE[9].icon = '/items/T9_ORE.png';
if (ITEMS.RAW.ORE[10]) ITEMS.RAW.ORE[10].icon = '/items/T10_ORE.png';

// Override Icons for Fiber
if (ITEMS.RAW.FIBER[1]) ITEMS.RAW.FIBER[1].icon = '/items/T1_FIBER.png';
if (ITEMS.RAW.FIBER[2]) ITEMS.RAW.FIBER[2].icon = '/items/T2_FIBER.png';
if (ITEMS.RAW.FIBER[3]) ITEMS.RAW.FIBER[3].icon = '/items/T3_FIBER.png';
if (ITEMS.RAW.FIBER[4]) ITEMS.RAW.FIBER[4].icon = '/items/T4_FIBER.png';
if (ITEMS.RAW.FIBER[5]) ITEMS.RAW.FIBER[5].icon = '/items/T5_FIBER.png';
if (ITEMS.RAW.FIBER[6]) ITEMS.RAW.FIBER[6].icon = '/items/T6_FIBER.png';
if (ITEMS.RAW.FIBER[7]) ITEMS.RAW.FIBER[7].icon = '/items/T7_FIBER.png';
if (ITEMS.RAW.FIBER[8]) ITEMS.RAW.FIBER[8].icon = '/items/T8_FIBER.png';
if (ITEMS.RAW.FIBER[9]) ITEMS.RAW.FIBER[9].icon = '/items/T9_FIBER.png';
if (ITEMS.RAW.FIBER[10]) ITEMS.RAW.FIBER[10].icon = '/items/T10_FIBER.png';

// Generate Refined
genRefined('PLANK', 'PLANK', 'WOOD');
genRefined('BAR', 'BAR', 'ORE');
genRefined('LEATHER', 'LEATHER', 'HIDE');
genRefined('CLOTH', 'CLOTH', 'FIBER');
genRefined('EXTRACT', 'EXTRACT', 'HERB');

// Generate Food
for (const t of TIERS) {
    const foodItem = {
        id: `T${t}_FOOD`, name: 'Food', tier: t, type: 'FOOD',
        healPercent: 5 * t, // Heals 5% * Tier of Max HP
        req: { [`T${t}_FISH`]: 1 },
        xp: Math.floor(REFINE_DATA.xp[t - 1] / 2), // Halved XP gain for food
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
    GOLD: { name: 'Silver Potion', suffix: '_POTION_GOLD', desc: 'Increases Silver gain', scale: 0.02, base: 0.00 }, // T1: 2%, T10: 20%
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
if (ITEMS.CONSUMABLE.FOOD[1]) { ITEMS.CONSUMABLE.FOOD[1].icon = '/items/T1_FOOD.png'; ITEMS.CONSUMABLE.FOOD[1].scale = '200%'; }
// Override Icon for T2 Food
if (ITEMS.CONSUMABLE.FOOD[2]) { ITEMS.CONSUMABLE.FOOD[2].icon = '/items/T2_FOOD.png'; ITEMS.CONSUMABLE.FOOD[2].scale = '200%'; }
// Override Icon for T3 Food
if (ITEMS.CONSUMABLE.FOOD[3]) { ITEMS.CONSUMABLE.FOOD[3].icon = '/items/T3_FOOD_v2.png'; ITEMS.CONSUMABLE.FOOD[3].scale = '200%'; }
// Override Icon for T4 Food
if (ITEMS.CONSUMABLE.FOOD[4]) { ITEMS.CONSUMABLE.FOOD[4].icon = '/items/T4_FOOD_v2.png'; ITEMS.CONSUMABLE.FOOD[4].scale = '200%'; }
// Override Icon for T5 Food
if (ITEMS.CONSUMABLE.FOOD[5]) { ITEMS.CONSUMABLE.FOOD[5].icon = '/items/T5_FOOD.png'; ITEMS.CONSUMABLE.FOOD[5].scale = '200%'; }
// Override Icon for T6 Food
if (ITEMS.CONSUMABLE.FOOD[6]) { ITEMS.CONSUMABLE.FOOD[6].icon = '/items/T6_FOOD.png'; ITEMS.CONSUMABLE.FOOD[6].scale = '200%'; }
// Override Icon for T7 Food
if (ITEMS.CONSUMABLE.FOOD[7]) { ITEMS.CONSUMABLE.FOOD[7].icon = '/items/T7_FOOD.png'; ITEMS.CONSUMABLE.FOOD[7].scale = '200%'; }
// Override Icon for T8 Food
if (ITEMS.CONSUMABLE.FOOD[8]) { ITEMS.CONSUMABLE.FOOD[8].icon = '/items/T8_FOOD.png'; ITEMS.CONSUMABLE.FOOD[8].scale = '200%'; }
// Override Icon for T9 Food
if (ITEMS.CONSUMABLE.FOOD[9]) { ITEMS.CONSUMABLE.FOOD[9].icon = '/items/T9_FOOD.png'; ITEMS.CONSUMABLE.FOOD[9].scale = '200%'; }
// Override Icon for T10 Food
if (ITEMS.CONSUMABLE.FOOD[10]) { ITEMS.CONSUMABLE.FOOD[10].icon = '/items/T10_FOOD.png'; ITEMS.CONSUMABLE.FOOD[10].scale = '90%'; }

// Override Icons for Refined Items
if (ITEMS.REFINED.PLANK[1]) { ITEMS.REFINED.PLANK[1].icon = '/items/T1_PLANK.png'; }
if (ITEMS.REFINED.PLANK[2]) { ITEMS.REFINED.PLANK[2].icon = '/items/T2_PLANK.png'; }
if (ITEMS.REFINED.PLANK[3]) { ITEMS.REFINED.PLANK[3].icon = '/items/T3_PLANK.png'; }
if (ITEMS.REFINED.PLANK[4]) { ITEMS.REFINED.PLANK[4].icon = '/items/T4_PLANK.png'; }
if (ITEMS.REFINED.PLANK[5]) { ITEMS.REFINED.PLANK[5].icon = '/items/T5_PLANK.png'; }
if (ITEMS.REFINED.PLANK[6]) { ITEMS.REFINED.PLANK[6].icon = '/items/T6_PLANK.png'; }
if (ITEMS.REFINED.PLANK[7]) { ITEMS.REFINED.PLANK[7].icon = '/items/T7_PLANK.png'; }
if (ITEMS.REFINED.PLANK[8]) { ITEMS.REFINED.PLANK[8].icon = '/items/T8_PLANK.png'; }
if (ITEMS.REFINED.PLANK[9]) { ITEMS.REFINED.PLANK[9].icon = '/items/T9_PLANK.png'; }
if (ITEMS.REFINED.PLANK[10]) { ITEMS.REFINED.PLANK[10].icon = '/items/T10_PLANK.png'; }
if (ITEMS.REFINED.BAR[1]) { ITEMS.REFINED.BAR[1].icon = '/items/T1_BAR.png'; ITEMS.REFINED.BAR[1].scale = '200%'; }
if (ITEMS.REFINED.BAR[2]) { ITEMS.REFINED.BAR[2].icon = '/items/T2_BAR.png'; ITEMS.REFINED.BAR[2].scale = '200%'; }
if (ITEMS.REFINED.BAR[3]) { ITEMS.REFINED.BAR[3].icon = '/items/T3_BAR.png'; ITEMS.REFINED.BAR[3].scale = '200%'; }
if (ITEMS.REFINED.BAR[4]) { ITEMS.REFINED.BAR[4].icon = '/items/T4_BAR.png'; ITEMS.REFINED.BAR[4].scale = '200%'; }
if (ITEMS.REFINED.BAR[5]) { ITEMS.REFINED.BAR[5].icon = '/items/T5_BAR.png'; ITEMS.REFINED.BAR[5].scale = '200%'; }
if (ITEMS.REFINED.BAR[6]) { ITEMS.REFINED.BAR[6].icon = '/items/T6_BAR.png'; ITEMS.REFINED.BAR[6].scale = '200%'; }
if (ITEMS.REFINED.BAR[7]) { ITEMS.REFINED.BAR[7].icon = '/items/T7_BAR.png'; ITEMS.REFINED.BAR[7].scale = '200%'; }
if (ITEMS.REFINED.BAR[8]) { ITEMS.REFINED.BAR[8].icon = '/items/T8_BAR.png'; ITEMS.REFINED.BAR[8].scale = '200%'; }
if (ITEMS.REFINED.BAR[9]) { ITEMS.REFINED.BAR[9].icon = '/items/T9_BAR.png'; ITEMS.REFINED.BAR[9].scale = '200%'; }
if (ITEMS.REFINED.BAR[10]) { ITEMS.REFINED.BAR[10].icon = '/items/T10_BAR.png'; ITEMS.REFINED.BAR[10].scale = '200%'; }

// Override Icons for Leather
if (ITEMS.REFINED.LEATHER[1]) { ITEMS.REFINED.LEATHER[1].icon = '/items/T1_LEATHER.png'; ITEMS.REFINED.LEATHER[1].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[2]) { ITEMS.REFINED.LEATHER[2].icon = '/items/T2_LEATHER.png'; ITEMS.REFINED.LEATHER[2].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[3]) { ITEMS.REFINED.LEATHER[3].icon = '/items/T3_LEATHER.png'; ITEMS.REFINED.LEATHER[3].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[4]) { ITEMS.REFINED.LEATHER[4].icon = '/items/T4_LEATHER.png'; ITEMS.REFINED.LEATHER[4].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[5]) { ITEMS.REFINED.LEATHER[5].icon = '/items/T5_LEATHER.png'; ITEMS.REFINED.LEATHER[5].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[6]) { ITEMS.REFINED.LEATHER[6].icon = '/items/T6_LEATHER.png'; ITEMS.REFINED.LEATHER[6].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[7]) { ITEMS.REFINED.LEATHER[7].icon = '/items/T7_LEATHER.png'; ITEMS.REFINED.LEATHER[7].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[8]) { ITEMS.REFINED.LEATHER[8].icon = '/items/T8_LEATHER.png'; ITEMS.REFINED.LEATHER[8].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[9]) { ITEMS.REFINED.LEATHER[9].icon = '/items/T9_LEATHER.png'; ITEMS.REFINED.LEATHER[9].scale = '110%'; }
if (ITEMS.REFINED.LEATHER[10]) { ITEMS.REFINED.LEATHER[10].icon = '/items/T10_LEATHER.png'; ITEMS.REFINED.LEATHER[10].scale = '110%'; }

// Override Icons for Cloth
if (ITEMS.REFINED.CLOTH[1]) ITEMS.REFINED.CLOTH[1].icon = '/items/T1_CLOTH.png';
if (ITEMS.REFINED.CLOTH[2]) ITEMS.REFINED.CLOTH[2].icon = '/items/T2_CLOTH.png';
if (ITEMS.REFINED.CLOTH[3]) ITEMS.REFINED.CLOTH[3].icon = '/items/T3_CLOTH.png';
if (ITEMS.REFINED.CLOTH[4]) ITEMS.REFINED.CLOTH[4].icon = '/items/T4_CLOTH.png';
if (ITEMS.REFINED.CLOTH[5]) ITEMS.REFINED.CLOTH[5].icon = '/items/T5_CLOTH.png';
if (ITEMS.REFINED.CLOTH[6]) ITEMS.REFINED.CLOTH[6].icon = '/items/T6_CLOTH.png';
if (ITEMS.REFINED.CLOTH[7]) ITEMS.REFINED.CLOTH[7].icon = '/items/T7_CLOTH.png';
if (ITEMS.REFINED.CLOTH[8]) ITEMS.REFINED.CLOTH[8].icon = '/items/T8_CLOTH.png';
if (ITEMS.REFINED.CLOTH[9]) { ITEMS.REFINED.CLOTH[9].icon = '/items/T9_CLOTH.png'; }
if (ITEMS.REFINED.CLOTH[10]) { ITEMS.REFINED.CLOTH[10].icon = '/items/T10_CLOTH.png'; }

// Generate Maps
for (const t of TIERS) {
    ITEMS.MAPS[t] = { id: `T${t}_DUNGEON_MAP`, name: 'Dungeon Map', tier: t, type: 'MAP', description: `A map to a Tier ${t} dungeon. Use to enter.` };
}

// Override Icons for Potions (Reuse generic for now)
for (const [key, data] of Object.entries(POTION_TYPES)) {
    if (ITEMS.CONSUMABLE[key]) {
        for (const t of TIERS) {
            if (ITEMS.CONSUMABLE[key][t]) {
                // Use generic potion icon or specific if available. 
                // T1_POTION_XP.png, T1_POTION_GOLD.png etc would be ideal.
                // For now, let's try to map to T{t}_POTION.png as a generic base, or specific if user provided.
                // Given user said "remove broken icons", we'll leave them blank/default OR use a known working one?
                // User said "remove broken image, leave like others without icons".
                // So we DO NOT add overrides here. Logic stays clean.
            }
        }
    }
}

// Generate Crests
for (const t of TIERS) {
    ITEMS.SPECIAL.CREST[t] = { id: `T${t}_CREST`, name: 'Boss Crest', tier: t, type: 'CRAFTING_MATERIAL', description: `A crest dropped by a Tier ${t} boss. Used for crafting Capes.` };
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
    icon: '/items/shard_battle.png',
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
        desc: 'The highest quality chest with the best rewards.'
    };
    // Generic/Legacy Fallback
    ITEMS.SPECIAL.CHEST[`${t}_GENERIC`] = {
        id: `T${t}_DUNGEON_CHEST`,
        name: `Dungeon Chest`,
        tier: t,
        rarity: 'COMMON',
        type: 'CONSUMABLE',
        desc: 'A standard dungeon chest.'
    };

    // --- LEGACY ALIASES (Fix for crash) ---
    // We copy the object and override ID so resolveItem() indexes it correctly.
    ITEMS.SPECIAL.CHEST[`${t}_COMMON`] = { ...ITEMS.SPECIAL.CHEST[`${t}_NORMAL`], id: `T${t}_CHEST_COMMON` };
    ITEMS.SPECIAL.CHEST[`${t}_RARE`] = { ...ITEMS.SPECIAL.CHEST[`${t}_OUTSTANDING`], id: `T${t}_CHEST_RARE` };
    ITEMS.SPECIAL.CHEST[`${t}_GOLD`] = { ...ITEMS.SPECIAL.CHEST[`${t}_EXCELLENT`], id: `T${t}_CHEST_GOLD` };
    ITEMS.SPECIAL.CHEST[`${t}_MYTHIC`] = { ...ITEMS.SPECIAL.CHEST[`${t}_MASTERPIECE`], id: `T${t}_CHEST_MYTHIC` };

}

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
        noIcon: true
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
        noIcon: true
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
        noIcon: true
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
        noIcon: true
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
        noIcon: true
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
            name: idSuffix.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            tier: t,
            req,
            xp: CRAFT_DATA.xp[t - 1],
            time: CRAFT_DATA.time[t - 1],
            ip: getBaseIP(t),
            type: type,
            isTool: !!statMultipliers.eff,
            stats,
            description: `A Tier ${t} ${idSuffix.replace(/_/g, ' ').toLowerCase()}. Equip to increase stats.`
        };

        // Assign to ITEMS structure
        if (!ITEMS.GEAR[category][slot]) ITEMS.GEAR[category][slot] = {};
        ITEMS.GEAR[category][slot][t] = gear;
    }
};

// --- WARRIOR GEAR ---
genGear('WARRIORS_FORGE', 'SWORD', 'WEAPON', 'SWORD', 'BAR', { dmg: 1.51794, speed: 137.7, crit: 0.16667 });
genGear('WARRIORS_FORGE', 'SHIELD', 'OFF_HAND', 'SHIELD', 'BAR', { def: 0.02083, hp: 0.41667 });
genGear('WARRIORS_FORGE', 'PLATE_ARMOR', 'ARMOR', 'PLATE_ARMOR', 'BAR', { dmg: 0.75898, def: 0.025, hp: 0.5 });
genGear('WARRIORS_FORGE', 'PLATE_HELMET', 'HELMET', 'PLATE_HELMET', 'BAR', { dmg: 0.37949, def: 0.01667, hp: 0.33333 });
genGear('WARRIORS_FORGE', 'PLATE_BOOTS', 'BOOTS', 'PLATE_BOOTS', 'BAR', { def: 0.00833, hp: 0.25, speed: 12.6533 });
genGear('WARRIORS_FORGE', 'PLATE_GLOVES', 'GLOVES', 'PLATE_GLOVES', 'BAR', { dmg: 0.75898, def: 0.0125, hp: 0.16667, speed: 6.3267 });
genGear('WARRIORS_FORGE', 'PLATE_CAPE', 'CAPE', 'PLATE_CAPE', 'BAR', { dmg: 0.37949, speed: 3.1633, globalEff: 1 });

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
            name: idSuffix.replace(/_/g, ' ').toLowerCase().replace(/ w/g, l => l.toUpperCase()),
            tier: t,
            req,
            xp: CRAFT_DATA.xp[t - 1],
            time: CRAFT_DATA.time[t - 1],
            ip: getBaseIP(t),
            type: type,
            stats,
            isHunterLookup: true,
            lookupName: lookupName,
            description: `A Tier ${t} ${idSuffix.replace(/_/g, ' ').toLowerCase()}. Specialized Hunter gear.`
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
const MAGE_STATS_FIXED = {
    "Fire Staff": {
        "1": {
            "0": {
                "damage": 37078,
                "speed": 26
            },
            "1": {
                "damage": 38932,
                "speed": 27.3
            },
            "2": {
                "damage": 40879,
                "speed": 28.6
            },
            "3": {
                "damage": 42923,
                "speed": 30.1
            },
            "4": {
                "damage": 45069,
                "speed": 31.6
            }
        },
        "2": {
            "0": {
                "damage": 47323,
                "speed": 33.1
            },
            "1": {
                "damage": 49689,
                "speed": 34.8
            },
            "2": {
                "damage": 52174,
                "speed": 36.5
            },
            "3": {
                "damage": 54782,
                "speed": 38.4
            },
            "4": {
                "damage": 57521,
                "speed": 40.3
            }
        },
        "3": {
            "0": {
                "damage": 60397,
                "speed": 42.3
            },
            "1": {
                "damage": 63417,
                "speed": 44.4
            },
            "2": {
                "damage": 66588,
                "speed": 46.6
            },
            "3": {
                "damage": 69917,
                "speed": 48.9
            },
            "4": {
                "damage": 73413,
                "speed": 51.4
            }
        },
        "4": {
            "0": {
                "damage": 77084,
                "speed": 54
            },
            "1": {
                "damage": 80938,
                "speed": 56.7
            },
            "2": {
                "damage": 84985,
                "speed": 59.5
            },
            "3": {
                "damage": 89234,
                "speed": 62.5
            },
            "4": {
                "damage": 93696,
                "speed": 65.6
            }
        },
        "5": {
            "0": {
                "damage": 98381,
                "speed": 68.9
            },
            "1": {
                "damage": 103300,
                "speed": 72.3
            },
            "2": {
                "damage": 108465,
                "speed": 75.9
            },
            "3": {
                "damage": 113888,
                "speed": 79.7
            },
            "4": {
                "damage": 119582,
                "speed": 83.7
            }
        },
        "6": {
            "0": {
                "damage": 125561,
                "speed": 87.9
            },
            "1": {
                "damage": 131839,
                "speed": 92.3
            },
            "2": {
                "damage": 138431,
                "speed": 96.9
            },
            "3": {
                "damage": 145352,
                "speed": 101.8
            },
            "4": {
                "damage": 152620,
                "speed": 106.9
            }
        },
        "7": {
            "0": {
                "damage": 160251,
                "speed": 112.2
            },
            "1": {
                "damage": 168264,
                "speed": 117.8
            },
            "2": {
                "damage": 176677,
                "speed": 123.7
            },
            "3": {
                "damage": 185511,
                "speed": 129.9
            },
            "4": {
                "damage": 194787,
                "speed": 136.4
            }
        },
        "8": {
            "0": {
                "damage": 204526,
                "speed": 143.2
            },
            "1": {
                "damage": 214753,
                "speed": 150.3
            },
            "2": {
                "damage": 225490,
                "speed": 157.9
            },
            "3": {
                "damage": 236765,
                "speed": 165.8
            },
            "4": {
                "damage": 248603,
                "speed": 174.1
            }
        },
        "9": {
            "0": {
                "damage": 261033,
                "speed": 182.8
            },
            "1": {
                "damage": 274085,
                "speed": 191.9
            },
            "2": {
                "damage": 287789,
                "speed": 201.5
            },
            "3": {
                "damage": 302178,
                "speed": 211.6
            },
            "4": {
                "damage": 317287,
                "speed": 222.1
            }
        },
        "10": {
            "0": {
                "damage": 333152,
                "speed": 233.2
            },
            "1": {
                "damage": 349810,
                "speed": 244.9
            },
            "2": {
                "damage": 367300,
                "speed": 257.1
            },
            "3": {
                "damage": 385665,
                "speed": 270
            },
            "4": {
                "damage": 404949,
                "speed": 284.7
            }
        }
    },
    "Tome": {
        "1": {
            "0": {
                "damage": 16876,
                "critChance": 0.46
            },
            "1": {
                "damage": 17719,
                "critChance": 0.48
            },
            "2": {
                "damage": 18605,
                "critChance": 0.5
            },
            "3": {
                "damage": 19536,
                "critChance": 0.53
            },
            "4": {
                "damage": 20512,
                "critChance": 0.55
            }
        },
        "2": {
            "0": {
                "damage": 21538,
                "critChance": 0.58
            },
            "1": {
                "damage": 22615,
                "critChance": 0.61
            },
            "2": {
                "damage": 23746,
                "critChance": 0.64
            },
            "3": {
                "damage": 24933,
                "critChance": 0.67
            },
            "4": {
                "damage": 26180,
                "critChance": 0.7
            }
        },
        "3": {
            "0": {
                "damage": 27489,
                "critChance": 0.74
            },
            "1": {
                "damage": 28863,
                "critChance": 0.77
            },
            "2": {
                "damage": 30306,
                "critChance": 0.81
            },
            "3": {
                "damage": 31821,
                "critChance": 0.85
            },
            "4": {
                "damage": 33412,
                "critChance": 0.89
            }
        },
        "4": {
            "0": {
                "damage": 35083,
                "critChance": 0.93
            },
            "1": {
                "damage": 36837,
                "critChance": 0.98
            },
            "2": {
                "damage": 38679,
                "critChance": 1.03
            },
            "3": {
                "damage": 40613,
                "critChance": 1.08
            },
            "4": {
                "damage": 42643,
                "critChance": 1.13
            }
        },
        "5": {
            "0": {
                "damage": 44776,
                "critChance": 1.19
            },
            "1": {
                "damage": 47014,
                "critChance": 1.25
            },
            "2": {
                "damage": 49365,
                "critChance": 1.31
            },
            "3": {
                "damage": 51833,
                "critChance": 1.38
            },
            "4": {
                "damage": 54424,
                "critChance": 1.45
            }
        },
        "6": {
            "0": {
                "damage": 57142,
                "critChance": 1.52
            },
            "1": {
                "damage": 59993,
                "critChance": 1.6
            },
            "2": {
                "damage": 62983,
                "critChance": 1.68
            },
            "3": {
                "damage": 66116,
                "critChance": 1.76
            },
            "4": {
                "damage": 69399,
                "critChance": 1.85
            }
        },
        "7": {
            "0": {
                "damage": 72839,
                "critChance": 1.94
            },
            "1": {
                "damage": 76443,
                "critChance": 2.04
            },
            "2": {
                "damage": 80220,
                "critChance": 2.14
            },
            "3": {
                "damage": 84179,
                "critChance": 2.25
            },
            "4": {
                "damage": 88328,
                "critChance": 2.36
            }
        },
        "8": {
            "0": {
                "damage": 92676,
                "critChance": 2.48
            },
            "1": {
                "damage": 97235,
                "critChance": 2.6
            },
            "2": {
                "damage": 102017,
                "critChance": 2.73
            },
            "3": {
                "damage": 107034,
                "critChance": 2.87
            },
            "4": {
                "damage": 112301,
                "critChance": 3.01
            }
        },
        "9": {
            "0": {
                "damage": 117831,
                "critChance": 3.16
            },
            "1": {
                "damage": 123639,
                "critChance": 3.32
            },
            "2": {
                "damage": 129741,
                "critChance": 3.49
            },
            "3": {
                "damage": 136153,
                "critChance": 3.66
            },
            "4": {
                "damage": 142891,
                "critChance": 3.84
            }
        },
        "10": {
            "0": {
                "damage": 149971,
                "critChance": 4.03
            },
            "1": {
                "damage": 157409,
                "critChance": 4.23
            },
            "2": {
                "damage": 165225,
                "critChance": 4.44
            },
            "3": {
                "damage": 173436,
                "critChance": 4.66
            },
            "4": {
                "damage": 185000,
                "critChance": 5
            }
        }
    },
    "Cloth Armor": {
        "1": {
            "0": {
                "hp": 27366,
                "defense": 45.6
            },
            "1": {
                "hp": 28734,
                "defense": 47.9
            },
            "2": {
                "hp": 30171,
                "defense": 50.3
            },
            "3": {
                "hp": 31680,
                "defense": 52.8
            },
            "4": {
                "hp": 33264,
                "defense": 55.4
            }
        },
        "2": {
            "0": {
                "hp": 34927,
                "defense": 58.2
            },
            "1": {
                "hp": 36674,
                "defense": 61.1
            },
            "2": {
                "hp": 38508,
                "defense": 64.1
            },
            "3": {
                "hp": 40433,
                "defense": 67.3
            },
            "4": {
                "hp": 42455,
                "defense": 70.7
            }
        },
        "3": {
            "0": {
                "hp": 44577,
                "defense": 74.2
            },
            "1": {
                "hp": 46806,
                "defense": 77.9
            },
            "2": {
                "hp": 49146,
                "defense": 81.8
            },
            "3": {
                "hp": 51603,
                "defense": 85.9
            },
            "4": {
                "hp": 54183,
                "defense": 90.2
            }
        },
        "4": {
            "0": {
                "hp": 56892,
                "defense": 94.7
            },
            "1": {
                "hp": 59736,
                "defense": 99.4
            },
            "2": {
                "hp": 62723,
                "defense": 104.4
            },
            "3": {
                "hp": 65859,
                "defense": 109.6
            },
            "4": {
                "hp": 69152,
                "defense": 115.1
            }
        },
        "5": {
            "0": {
                "hp": 72610,
                "defense": 120.8
            },
            "1": {
                "hp": 76240,
                "defense": 126.9
            },
            "2": {
                "hp": 80052,
                "defense": 133.2
            },
            "3": {
                "hp": 84055,
                "defense": 139.9
            },
            "4": {
                "hp": 88258,
                "defense": 146.9
            }
        },
        "6": {
            "0": {
                "hp": 92671,
                "defense": 154.2
            },
            "1": {
                "hp": 97305,
                "defense": 161.9
            },
            "2": {
                "hp": 102170,
                "defense": 170
            },
            "3": {
                "hp": 107279,
                "defense": 178.5
            },
            "4": {
                "hp": 112643,
                "defense": 187.4
            }
        },
        "7": {
            "0": {
                "hp": 118275,
                "defense": 196.8
            },
            "1": {
                "hp": 124189,
                "defense": 206.6
            },
            "2": {
                "hp": 130399,
                "defense": 216.9
            },
            "3": {
                "hp": 136919,
                "defense": 227.8
            },
            "4": {
                "hp": 143765,
                "defense": 239.2
            }
        },
        "8": {
            "0": {
                "hp": 150953,
                "defense": 251.2
            },
            "1": {
                "hp": 158500,
                "defense": 263.8
            },
            "2": {
                "hp": 166425,
                "defense": 277
            },
            "3": {
                "hp": 174746,
                "defense": 290.9
            },
            "4": {
                "hp": 183484,
                "defense": 305.4
            }
        },
        "9": {
            "0": {
                "hp": 192658,
                "defense": 320.7
            },
            "1": {
                "hp": 202291,
                "defense": 336.7
            },
            "2": {
                "hp": 212405,
                "defense": 353.5
            },
            "3": {
                "hp": 223025,
                "defense": 371.2
            },
            "4": {
                "hp": 234176,
                "defense": 389.8
            }
        },
        "10": {
            "0": {
                "hp": 245885,
                "defense": 409.3
            },
            "1": {
                "hp": 258179,
                "defense": 429.7
            },
            "2": {
                "hp": 271088,
                "defense": 451.2
            },
            "3": {
                "hp": 284642,
                "defense": 473.8
            },
            "4": {
                "hp": 300000,
                "defense": 500
            }
        }
    },
    "Cloth Helmet": {
        "1": {
            "0": {
                "hp": 20525,
                "defense": 34.2
            },
            "1": {
                "hp": 21551,
                "defense": 35.9
            },
            "2": {
                "hp": 22629,
                "defense": 37.7
            },
            "3": {
                "hp": 23760,
                "defense": 39.6
            },
            "4": {
                "hp": 24948,
                "defense": 41.6
            }
        },
        "2": {
            "0": {
                "hp": 26195,
                "defense": 43.7
            },
            "1": {
                "hp": 27505,
                "defense": 45.9
            },
            "2": {
                "hp": 28880,
                "defense": 48.2
            },
            "3": {
                "hp": 30324,
                "defense": 50.6
            },
            "4": {
                "hp": 31840,
                "defense": 53.1
            }
        },
        "3": {
            "0": {
                "hp": 33432,
                "defense": 55.8
            },
            "1": {
                "hp": 35103,
                "defense": 58.6
            },
            "2": {
                "hp": 36858,
                "defense": 61.5
            },
            "3": {
                "hp": 38701,
                "defense": 64.6
            },
            "4": {
                "hp": 40636,
                "defense": 67.8
            }
        },
        "4": {
            "0": {
                "hp": 42668,
                "defense": 71.2
            },
            "1": {
                "hp": 44801,
                "defense": 74.8
            },
            "2": {
                "hp": 47041,
                "defense": 78.5
            },
            "3": {
                "hp": 49393,
                "defense": 82.4
            },
            "4": {
                "hp": 51863,
                "defense": 86.5
            }
        },
        "5": {
            "0": {
                "hp": 54456,
                "defense": 90.8
            },
            "1": {
                "hp": 57179,
                "defense": 95.4
            },
            "2": {
                "hp": 60038,
                "defense": 100.2
            },
            "3": {
                "hp": 63040,
                "defense": 105.2
            },
            "4": {
                "hp": 66192,
                "defense": 110.5
            }
        },
        "6": {
            "0": {
                "hp": 69502,
                "defense": 116
            },
            "1": {
                "hp": 72977,
                "defense": 121.8
            },
            "2": {
                "hp": 76626,
                "defense": 127.9
            },
            "3": {
                "hp": 80457,
                "defense": 134.3
            },
            "4": {
                "hp": 84480,
                "defense": 141
            }
        },
        "7": {
            "0": {
                "hp": 88704,
                "defense": 148.1
            },
            "1": {
                "hp": 93139,
                "defense": 155.5
            },
            "2": {
                "hp": 97796,
                "defense": 163.3
            },
            "3": {
                "hp": 102686,
                "defense": 171.5
            },
            "4": {
                "hp": 107820,
                "defense": 180.1
            }
        },
        "8": {
            "0": {
                "hp": 113211,
                "defense": 189.1
            },
            "1": {
                "hp": 118872,
                "defense": 198.6
            },
            "2": {
                "hp": 124816,
                "defense": 208.5
            },
            "3": {
                "hp": 131057,
                "defense": 219
            },
            "4": {
                "hp": 137610,
                "defense": 229.9
            }
        },
        "9": {
            "0": {
                "hp": 144490,
                "defense": 241.4
            },
            "1": {
                "hp": 151715,
                "defense": 253.5
            },
            "2": {
                "hp": 159301,
                "defense": 266.2
            },
            "3": {
                "hp": 167266,
                "defense": 279.5
            },
            "4": {
                "hp": 175629,
                "defense": 293.5
            }
        },
        "10": {
            "0": {
                "hp": 184410,
                "defense": 308.2
            },
            "1": {
                "hp": 193631,
                "defense": 323.6
            },
            "2": {
                "hp": 203313,
                "defense": 339.8
            },
            "3": {
                "hp": 213479,
                "defense": 356.8
            },
            "4": {
                "hp": 225000,
                "defense": 375
            }
        }
    },
    "Cloth Boots": {
        "1": {
            "0": {
                "hp": 10314,
                "defense": 17.2,
                "speed": 30.3
            },
            "1": {
                "hp": 10830,
                "defense": 18.1,
                "speed": 31.8
            },
            "2": {
                "hp": 11372,
                "defense": 19,
                "speed": 33.4
            },
            "3": {
                "hp": 11941,
                "defense": 19.9,
                "speed": 35.1
            },
            "4": {
                "hp": 12538,
                "defense": 20.9,
                "speed": 36.9
            }
        },
        "2": {
            "0": {
                "hp": 13165,
                "defense": 22,
                "speed": 38.7
            },
            "1": {
                "hp": 13823,
                "defense": 23.1,
                "speed": 40.6
            },
            "2": {
                "hp": 14514,
                "defense": 24.3,
                "speed": 42.6
            },
            "3": {
                "hp": 15240,
                "defense": 25.5,
                "speed": 44.8
            },
            "4": {
                "hp": 16002,
                "defense": 26.8,
                "speed": 47
            }
        },
        "3": {
            "0": {
                "hp": 16802,
                "defense": 28.1,
                "speed": 49.3
            },
            "1": {
                "hp": 17642,
                "defense": 29.5,
                "speed": 51.8
            },
            "2": {
                "hp": 18524,
                "defense": 31,
                "speed": 54.4
            },
            "3": {
                "hp": 19450,
                "defense": 32.6,
                "speed": 57.1
            },
            "4": {
                "hp": 20422,
                "defense": 34.2,
                "speed": 60
            }
        },
        "4": {
            "0": {
                "hp": 21443,
                "defense": 35.9,
                "speed": 63
            },
            "1": {
                "hp": 22515,
                "defense": 37.7,
                "speed": 66.2
            },
            "2": {
                "hp": 23641,
                "defense": 39.6,
                "speed": 69.5
            },
            "3": {
                "hp": 24823,
                "defense": 41.6,
                "speed": 73
            },
            "4": {
                "hp": 26064,
                "defense": 43.7,
                "speed": 76.6
            }
        },
        "5": {
            "0": {
                "hp": 27367,
                "defense": 45.9,
                "speed": 80.4
            },
            "1": {
                "hp": 28735,
                "defense": 48.2,
                "speed": 84.4
            },
            "2": {
                "hp": 30172,
                "defense": 50.6,
                "speed": 88.6
            },
            "3": {
                "hp": 31680,
                "defense": 53.1,
                "speed": 93
            },
            "4": {
                "hp": 33264,
                "defense": 55.8,
                "speed": 97.7
            }
        },
        "6": {
            "0": {
                "hp": 34927,
                "defense": 58.6,
                "speed": 102.6
            },
            "1": {
                "hp": 36673,
                "defense": 61.5,
                "speed": 107.7
            },
            "2": {
                "hp": 38507,
                "defense": 64.6,
                "speed": 113.1
            },
            "3": {
                "hp": 40433,
                "defense": 67.8,
                "speed": 118.8
            },
            "4": {
                "hp": 42455,
                "defense": 71.2,
                "speed": 124.7
            }
        },
        "7": {
            "0": {
                "hp": 44578,
                "defense": 74.8,
                "speed": 130.9
            },
            "1": {
                "hp": 46807,
                "defense": 78.5,
                "speed": 137.4
            },
            "2": {
                "hp": 49147,
                "defense": 82.4,
                "speed": 144.3
            },
            "3": {
                "hp": 51604,
                "defense": 86.5,
                "speed": 151.5
            },
            "4": {
                "hp": 54184,
                "defense": 90.8,
                "speed": 159.1
            }
        },
        "8": {
            "0": {
                "hp": 56893,
                "defense": 95.4,
                "speed": 167.1
            },
            "1": {
                "hp": 59737,
                "defense": 100.2,
                "speed": 175.4
            },
            "2": {
                "hp": 62724,
                "defense": 105.2,
                "speed": 184.2
            },
            "3": {
                "hp": 65860,
                "defense": 110.5,
                "speed": 193.4
            },
            "4": {
                "hp": 69153,
                "defense": 116,
                "speed": 203.1
            }
        },
        "9": {
            "0": {
                "hp": 72611,
                "defense": 121.8,
                "speed": 213.3
            },
            "1": {
                "hp": 76242,
                "defense": 127.9,
                "speed": 223.9
            },
            "2": {
                "hp": 80054,
                "defense": 134.3,
                "speed": 235.1
            },
            "3": {
                "hp": 84057,
                "defense": 141,
                "speed": 246.9
            },
            "4": {
                "hp": 88260,
                "defense": 148.1,
                "speed": 259.2
            }
        },
        "10": {
            "0": {
                "hp": 92673,
                "defense": 155.5,
                "speed": 272.2
            },
            "1": {
                "hp": 97307,
                "defense": 163.3,
                "speed": 285.8
            },
            "2": {
                "hp": 102172,
                "defense": 171.5,
                "speed": 300.1
            },
            "3": {
                "hp": 107281,
                "defense": 180.1,
                "speed": 315.1
            },
            "4": {
                "hp": 112500,
                "defense": 187.5,
                "speed": 332.2
            }
        }
    },
    "Cloth Gloves": {
        "1": {
            "0": {
                "damage": 6750,
                "hp": 10263,
                "defense": 17.1,
                "speed": 17.3
            },
            "1": {
                "damage": 7088,
                "hp": 10776,
                "defense": 18,
                "speed": 18.2
            },
            "2": {
                "damage": 7442,
                "hp": 11315,
                "defense": 18.9,
                "speed": 19.1
            },
            "3": {
                "damage": 7814,
                "hp": 11881,
                "defense": 19.8,
                "speed": 20.1
            },
            "4": {
                "damage": 8205,
                "hp": 12475,
                "defense": 20.8,
                "speed": 21.1
            }
        },
        "2": {
            "0": {
                "damage": 8615,
                "hp": 13099,
                "defense": 21.8,
                "speed": 22.1
            },
            "1": {
                "damage": 9046,
                "hp": 13754,
                "defense": 22.9,
                "speed": 23.2
            },
            "2": {
                "damage": 9498,
                "hp": 14442,
                "defense": 24,
                "speed": 24.4
            },
            "3": {
                "damage": 9973,
                "hp": 15164,
                "defense": 25.2,
                "speed": 25.6
            },
            "4": {
                "damage": 10472,
                "hp": 15922,
                "defense": 26.5,
                "speed": 26.9
            }
        },
        "3": {
            "0": {
                "damage": 10996,
                "hp": 16718,
                "defense": 27.8,
                "speed": 28.2
            },
            "1": {
                "damage": 11546,
                "hp": 17554,
                "defense": 29.2,
                "speed": 29.6
            },
            "2": {
                "damage": 12123,
                "hp": 18432,
                "defense": 30.7,
                "speed": 31.1
            },
            "3": {
                "damage": 12729,
                "hp": 19353,
                "defense": 32.2,
                "speed": 32.7
            },
            "4": {
                "damage": 13365,
                "hp": 20321,
                "defense": 33.8,
                "speed": 34.3
            }
        },
        "4": {
            "0": {
                "damage": 14033,
                "hp": 21337,
                "defense": 35.5,
                "speed": 36
            },
            "1": {
                "damage": 14735,
                "hp": 22404,
                "defense": 37.3,
                "speed": 37.8
            },
            "2": {
                "damage": 15472,
                "hp": 23524,
                "defense": 39.2,
                "speed": 39.7
            },
            "3": {
                "damage": 16245,
                "hp": 24699,
                "defense": 41.2,
                "speed": 41.7
            },
            "4": {
                "damage": 17058,
                "hp": 25934,
                "defense": 43.3,
                "speed": 43.8
            }
        },
        "5": {
            "0": {
                "damage": 17911,
                "hp": 27231,
                "defense": 45.5,
                "speed": 46
            },
            "1": {
                "damage": 18806,
                "hp": 28592,
                "defense": 47.8,
                "speed": 48.3
            },
            "2": {
                "damage": 19746,
                "hp": 30022,
                "defense": 50.2,
                "speed": 50.7
            },
            "3": {
                "damage": 20733,
                "hp": 31523,
                "defense": 52.7,
                "speed": 53.2
            },
            "4": {
                "damage": 21770,
                "hp": 33100,
                "defense": 55.3,
                "speed": 55.9
            }
        },
        "6": {
            "0": {
                "damage": 22859,
                "hp": 34755,
                "defense": 58.1,
                "speed": 58.7
            },
            "1": {
                "damage": 24002,
                "hp": 36493,
                "defense": 61,
                "speed": 61.6
            },
            "2": {
                "damage": 25202,
                "hp": 38317,
                "defense": 64.1,
                "speed": 64.7
            },
            "3": {
                "damage": 26462,
                "hp": 40233,
                "defense": 67.3,
                "speed": 67.9
            },
            "4": {
                "damage": 27785,
                "hp": 42245,
                "defense": 70.7,
                "speed": 71.3
            }
        },
        "7": {
            "0": {
                "damage": 29174,
                "hp": 44357,
                "defense": 74.2,
                "speed": 74.9
            },
            "1": {
                "damage": 30633,
                "hp": 46575,
                "defense": 77.9,
                "speed": 78.6
            },
            "2": {
                "damage": 32164,
                "hp": 48904,
                "defense": 81.8,
                "speed": 82.5
            },
            "3": {
                "damage": 33772,
                "hp": 51349,
                "defense": 85.9,
                "speed": 86.6
            },
            "4": {
                "damage": 35461,
                "hp": 53916,
                "defense": 90.2,
                "speed": 90.9
            }
        },
        "8": {
            "0": {
                "damage": 37234,
                "hp": 56612,
                "defense": 94.7,
                "speed": 95.4
            },
            "1": {
                "damage": 39096,
                "hp": 59442,
                "defense": 99.4,
                "speed": 100.2
            },
            "2": {
                "damage": 41050,
                "hp": 62414,
                "defense": 104.4,
                "speed": 105.2
            },
            "3": {
                "damage": 43103,
                "hp": 65535,
                "defense": 109.6,
                "speed": 110.5
            },
            "4": {
                "damage": 45258,
                "hp": 68812,
                "defense": 115.1,
                "speed": 116
            }
        },
        "9": {
            "0": {
                "damage": 47521,
                "hp": 72253,
                "defense": 120.9,
                "speed": 121.8
            },
            "1": {
                "damage": 49897,
                "hp": 75866,
                "defense": 126.9,
                "speed": 127.9
            },
            "2": {
                "damage": 52392,
                "hp": 79659,
                "defense": 133.2,
                "speed": 134.3
            },
            "3": {
                "damage": 55012,
                "hp": 83642,
                "defense": 139.9,
                "speed": 141
            },
            "4": {
                "damage": 57762,
                "hp": 87824,
                "defense": 146.9,
                "speed": 148.1
            }
        },
        "10": {
            "0": {
                "damage": 60650,
                "hp": 92215,
                "defense": 154.2,
                "speed": 155.5
            },
            "1": {
                "damage": 63682,
                "hp": 96826,
                "defense": 161.9,
                "speed": 163.3
            },
            "2": {
                "damage": 66866,
                "hp": 101668,
                "defense": 170,
                "speed": 171.5
            },
            "3": {
                "damage": 70209,
                "hp": 106751,
                "defense": 178.5,
                "speed": 180.1
            },
            "4": {
                "damage": 74000,
                "hp": 112500,
                "defense": 187.5,
                "speed": 189.8
            }
        }
    },
    "Mage Cape": {
        "1": {
            "0": {
                "damage": 6751,
                "speed": 13,
                "efficiency": {
                    "GLOBAL": 1.37
                }
            },
            "1": {
                "damage": 7089,
                "speed": 13.7,
                "efficiency": {
                    "GLOBAL": 1.44
                }
            },
            "2": {
                "damage": 7443,
                "speed": 14.4,
                "efficiency": {
                    "GLOBAL": 1.51
                }
            },
            "3": {
                "damage": 7815,
                "speed": 15.1,
                "efficiency": {
                    "GLOBAL": 1.59
                }
            },
            "4": {
                "damage": 8206,
                "speed": 15.9,
                "efficiency": {
                    "GLOBAL": 1.67
                }
            }
        },
        "2": {
            "0": {
                "damage": 8616,
                "speed": 16.7,
                "efficiency": {
                    "GLOBAL": 1.75
                }
            },
            "1": {
                "damage": 9047,
                "speed": 17.5,
                "efficiency": {
                    "GLOBAL": 1.84
                }
            },
            "2": {
                "damage": 9499,
                "speed": 18.4,
                "efficiency": {
                    "GLOBAL": 1.93
                }
            },
            "3": {
                "damage": 9974,
                "speed": 19.3,
                "efficiency": {
                    "GLOBAL": 2.03
                }
            },
            "4": {
                "damage": 10473,
                "speed": 20.3,
                "efficiency": {
                    "GLOBAL": 2.13
                }
            }
        },
        "3": {
            "0": {
                "damage": 10997,
                "speed": 21.3,
                "efficiency": {
                    "GLOBAL": 2.24
                }
            },
            "1": {
                "damage": 11547,
                "speed": 22.4,
                "efficiency": {
                    "GLOBAL": 2.35
                }
            },
            "2": {
                "damage": 12124,
                "speed": 23.5,
                "efficiency": {
                    "GLOBAL": 2.47
                }
            },
            "3": {
                "damage": 12730,
                "speed": 24.7,
                "efficiency": {
                    "GLOBAL": 2.59
                }
            },
            "4": {
                "damage": 13366,
                "speed": 25.9,
                "efficiency": {
                    "GLOBAL": 2.72
                }
            }
        },
        "4": {
            "0": {
                "damage": 14034,
                "speed": 27.2,
                "efficiency": {
                    "GLOBAL": 2.86
                }
            },
            "1": {
                "damage": 14736,
                "speed": 28.6,
                "efficiency": {
                    "GLOBAL": 3
                }
            },
            "2": {
                "damage": 15473,
                "speed": 30,
                "efficiency": {
                    "GLOBAL": 3.15
                }
            },
            "3": {
                "damage": 16246,
                "speed": 31.5,
                "efficiency": {
                    "GLOBAL": 3.31
                }
            },
            "4": {
                "damage": 17059,
                "speed": 33.1,
                "efficiency": {
                    "GLOBAL": 3.48
                }
            }
        },
        "5": {
            "0": {
                "damage": 17912,
                "speed": 34.8,
                "efficiency": {
                    "GLOBAL": 3.65
                }
            },
            "1": {
                "damage": 18807,
                "speed": 36.5,
                "efficiency": {
                    "GLOBAL": 3.83
                }
            },
            "2": {
                "damage": 19747,
                "speed": 38.3,
                "efficiency": {
                    "GLOBAL": 4.02
                }
            },
            "3": {
                "damage": 20734,
                "speed": 40.2,
                "efficiency": {
                    "GLOBAL": 4.22
                }
            },
            "4": {
                "damage": 21771,
                "speed": 42.2,
                "efficiency": {
                    "GLOBAL": 4.43
                }
            }
        },
        "6": {
            "0": {
                "damage": 22860,
                "speed": 44.3,
                "efficiency": {
                    "GLOBAL": 4.65
                }
            },
            "1": {
                "damage": 24003,
                "speed": 46.5,
                "efficiency": {
                    "GLOBAL": 4.88
                }
            },
            "2": {
                "damage": 25203,
                "speed": 48.8,
                "efficiency": {
                    "GLOBAL": 5.12
                }
            },
            "3": {
                "damage": 26463,
                "speed": 51.2,
                "efficiency": {
                    "GLOBAL": 5.38
                }
            },
            "4": {
                "damage": 27786,
                "speed": 53.8,
                "efficiency": {
                    "GLOBAL": 5.65
                }
            }
        },
        "7": {
            "0": {
                "damage": 29175,
                "speed": 56.5,
                "efficiency": {
                    "GLOBAL": 5.93
                }
            },
            "1": {
                "damage": 30634,
                "speed": 59.3,
                "efficiency": {
                    "GLOBAL": 6.23
                }
            },
            "2": {
                "damage": 32165,
                "speed": 62.3,
                "efficiency": {
                    "GLOBAL": 6.54
                }
            },
            "3": {
                "damage": 33773,
                "speed": 65.4,
                "efficiency": {
                    "GLOBAL": 6.87
                }
            },
            "4": {
                "damage": 35462,
                "speed": 68.7,
                "efficiency": {
                    "GLOBAL": 7.21
                }
            }
        },
        "8": {
            "0": {
                "damage": 37235,
                "speed": 72.1,
                "efficiency": {
                    "GLOBAL": 7.57
                }
            },
            "1": {
                "damage": 39097,
                "speed": 75.7,
                "efficiency": {
                    "GLOBAL": 7.95
                }
            },
            "2": {
                "damage": 41051,
                "speed": 79.5,
                "efficiency": {
                    "GLOBAL": 8.35
                }
            },
            "3": {
                "damage": 43104,
                "speed": 83.5,
                "efficiency": {
                    "GLOBAL": 8.77
                }
            },
            "4": {
                "damage": 45259,
                "speed": 87.7,
                "efficiency": {
                    "GLOBAL": 9.21
                }
            }
        },
        "9": {
            "0": {
                "damage": 47522,
                "speed": 92.1,
                "efficiency": {
                    "GLOBAL": 9.67
                }
            },
            "1": {
                "damage": 49898,
                "speed": 96.7,
                "efficiency": {
                    "GLOBAL": 10.15
                }
            },
            "2": {
                "damage": 52393,
                "speed": 101.5,
                "efficiency": {
                    "GLOBAL": 10.66
                }
            },
            "3": {
                "damage": 55013,
                "speed": 106.6,
                "efficiency": {
                    "GLOBAL": 11.19
                }
            },
            "4": {
                "damage": 57763,
                "speed": 111.9,
                "efficiency": {
                    "GLOBAL": 11.75
                }
            }
        },
        "10": {
            "0": {
                "damage": 60651,
                "speed": 117.5,
                "efficiency": {
                    "GLOBAL": 12.34
                }
            },
            "1": {
                "damage": 63683,
                "speed": 123.4,
                "efficiency": {
                    "GLOBAL": 12.96
                }
            },
            "2": {
                "damage": 66867,
                "speed": 129.6,
                "efficiency": {
                    "GLOBAL": 13.61
                }
            },
            "3": {
                "damage": 70210,
                "speed": 136.1,
                "efficiency": {
                    "GLOBAL": 14.29
                }
            },
            "4": {
                "damage": 74000,
                "speed": 142.3,
                "efficiency": {
                    "GLOBAL": 15
                }
            }
        }
    }
};

const genMageGear = (slot, type, idSuffix, matType, lookupName) => {
    for (const t of TIERS) {
        const matId = `T${t}_${matType}`;
        const req = { [matId]: 20 };
        if (type === 'CAPE') req[`T${t}_CREST`] = 1;

        // Default to Normal quality stats for the base item view
        const stats = MAGE_STATS_FIXED[lookupName][t][0];

        const gear = {
            id: `T${t}_${idSuffix}`,
            name: idSuffix.replace(/_/g, ' ').toLowerCase().replace(/w/g, l => l.toUpperCase()),
            tier: t,
            req,
            xp: CRAFT_DATA.xp[t - 1],
            time: CRAFT_DATA.time[t - 1],
            ip: getBaseIP(t),
            type: type,
            stats,
            isMageLookup: true,
            lookupName: lookupName,
            description: `A Tier ${t} ${idSuffix.replace(/_/g, ' ').toLowerCase()}. Specialized Mage gear.`
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
if (ITEMS.GEAR.TOOLMAKER.AXE[1]) { ITEMS.GEAR.TOOLMAKER.AXE[1].icon = '/items/T1_AXE.png'; ITEMS.GEAR.TOOLMAKER.AXE[1].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[2]) { ITEMS.GEAR.TOOLMAKER.AXE[2].icon = '/items/T2_AXE.png'; ITEMS.GEAR.TOOLMAKER.AXE[2].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[3]) { ITEMS.GEAR.TOOLMAKER.AXE[3].icon = '/items/T3_AXE.png'; ITEMS.GEAR.TOOLMAKER.AXE[3].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[4]) { ITEMS.GEAR.TOOLMAKER.AXE[4].icon = '/items/T4_AXE.png'; ITEMS.GEAR.TOOLMAKER.AXE[4].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[5]) { ITEMS.GEAR.TOOLMAKER.AXE[5].icon = '/items/T5_AXE.png'; ITEMS.GEAR.TOOLMAKER.AXE[5].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[6]) { ITEMS.GEAR.TOOLMAKER.AXE[6].icon = '/items/T6_AXE.png'; ITEMS.GEAR.TOOLMAKER.AXE[6].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[7]) { ITEMS.GEAR.TOOLMAKER.AXE[7].icon = '/items/T7_AXE.png'; ITEMS.GEAR.TOOLMAKER.AXE[7].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[8]) { ITEMS.GEAR.TOOLMAKER.AXE[8].icon = '/items/T8_AXE.png'; ITEMS.GEAR.TOOLMAKER.AXE[8].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[9]) { ITEMS.GEAR.TOOLMAKER.AXE[9].icon = '/items/T9_AXE.png'; ITEMS.GEAR.TOOLMAKER.AXE[9].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.AXE[10]) { ITEMS.GEAR.TOOLMAKER.AXE[10].icon = '/items/T10_AXE.png'; ITEMS.GEAR.TOOLMAKER.AXE[10].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[1]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[1].icon = '/items/T1_PICKAXE.png'; ITEMS.GEAR.TOOLMAKER.PICKAXE[1].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[2]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[2].icon = '/items/T2_PICKAXE.png'; ITEMS.GEAR.TOOLMAKER.PICKAXE[2].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[3]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[3].icon = '/items/T3_PICKAXE.png'; ITEMS.GEAR.TOOLMAKER.PICKAXE[3].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[4]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[4].icon = '/items/T4_PICKAXE.png'; ITEMS.GEAR.TOOLMAKER.PICKAXE[4].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[5]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[5].icon = '/items/T5_PICKAXE.png'; ITEMS.GEAR.TOOLMAKER.PICKAXE[5].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[6]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[6].icon = '/items/T6_PICKAXE.png'; ITEMS.GEAR.TOOLMAKER.PICKAXE[6].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[7]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[7].icon = '/items/T7_PICKAXE.png'; ITEMS.GEAR.TOOLMAKER.PICKAXE[7].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[8]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[8].icon = '/items/T8_PICKAXE.png'; ITEMS.GEAR.TOOLMAKER.PICKAXE[8].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[9]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[9].icon = '/items/T9_PICKAXE.png'; ITEMS.GEAR.TOOLMAKER.PICKAXE[9].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.PICKAXE[10]) { ITEMS.GEAR.TOOLMAKER.PICKAXE[10].icon = '/items/T10_PICKAXE.png'; ITEMS.GEAR.TOOLMAKER.PICKAXE[10].scale = '110%'; }

// --- ICON OVERRIDES FOR SICKLES ---
if (ITEMS.GEAR.TOOLMAKER.SICKLE[1]) { ITEMS.GEAR.TOOLMAKER.SICKLE[1].icon = '/items/T1_SICKLE.png'; ITEMS.GEAR.TOOLMAKER.SICKLE[1].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[2]) { ITEMS.GEAR.TOOLMAKER.SICKLE[2].icon = '/items/T2_SICKLE.png'; ITEMS.GEAR.TOOLMAKER.SICKLE[2].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[3]) { ITEMS.GEAR.TOOLMAKER.SICKLE[3].icon = '/items/T3_SICKLE.png'; ITEMS.GEAR.TOOLMAKER.SICKLE[3].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[4]) { ITEMS.GEAR.TOOLMAKER.SICKLE[4].icon = '/items/T4_SICKLE.png'; ITEMS.GEAR.TOOLMAKER.SICKLE[4].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[5]) { ITEMS.GEAR.TOOLMAKER.SICKLE[5].icon = '/items/T5_SICKLE.png'; ITEMS.GEAR.TOOLMAKER.SICKLE[5].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[6]) { ITEMS.GEAR.TOOLMAKER.SICKLE[6].icon = '/items/T6_SICKLE.png'; ITEMS.GEAR.TOOLMAKER.SICKLE[6].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[7]) { ITEMS.GEAR.TOOLMAKER.SICKLE[7].icon = '/items/T7_SICKLE.png'; ITEMS.GEAR.TOOLMAKER.SICKLE[7].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[8]) { ITEMS.GEAR.TOOLMAKER.SICKLE[8].icon = '/items/T8_SICKLE.png'; ITEMS.GEAR.TOOLMAKER.SICKLE[8].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[9]) { ITEMS.GEAR.TOOLMAKER.SICKLE[9].icon = '/items/T9_SICKLE.png'; ITEMS.GEAR.TOOLMAKER.SICKLE[9].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.SICKLE[10]) { ITEMS.GEAR.TOOLMAKER.SICKLE[10].icon = '/items/T10_SICKLE.png'; ITEMS.GEAR.TOOLMAKER.SICKLE[10].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[1]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[1].icon = '/items/T1_FISHING_ROD.png'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[1].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[2]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[2].icon = '/items/T2_FISHING_ROD.png'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[2].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[3]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[3].icon = '/items/T3_FISHING_ROD.png'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[3].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[4]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[4].icon = '/items/T4_FISHING_ROD.png'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[4].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[5]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[5].icon = '/items/T5_FISHING_ROD.png'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[5].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[6]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[6].icon = '/items/T6_FISHING_ROD.png'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[6].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[7]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[7].icon = '/items/T7_FISHING_ROD.png'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[7].scale = '110%'; }
if (ITEMS.GEAR.TOOLMAKER.FISHING_ROD[8]) { ITEMS.GEAR.TOOLMAKER.FISHING_ROD[8].icon = '/items/T8_FISHING_ROD.png'; ITEMS.GEAR.TOOLMAKER.FISHING_ROD[8].scale = '110%'; }
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
    icon: ''
};

export const ITEM_LOOKUP = {};
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
indexItems(ITEMS); // Populate it immediately


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

    // DEBUG LOG
    if (upperId.includes('FIRE_STAFF')) {
        console.log('Resolving:', upperId);
    }

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
        qualityId = overrideQuality;
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
                            // Weapon Bonus: ((Tier - 1) * 15) + (QualityId * 3)
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
        rarityColor: baseItem.rarityColor || effectiveQuality.color,
        quality: effectiveQualityId,
        qualityName: effectiveQuality.name,
        originalId: baseId,
        craftedBy: creatorName, // Ensure signature is part of the resolved object
        ip: (baseItem.ip || 0) + ipBonus,
        stats: newStats
    };

    // EMERGENCY GLOBAL FIX FOR AXE ICONS
    if (baseId.toUpperCase().includes('AXE') && !baseId.toUpperCase().includes('PICKAXE')) {
        const t = baseItem.tier || 1;
        if (!finalItem.icon) finalItem.icon = `/items/T${t}_AXE.png`;
        if (!finalItem.scale) finalItem.scale = '110%';
    }

    // Secondary emergency fix for ORE and LEATHER T1
    if (baseId === 'T1_ORE' && !finalItem.icon) finalItem.icon = '/items/T1_ORE.png';
    if (baseId === 'T1_LEATHER' && !finalItem.icon) finalItem.icon = '/items/T1_LEATHER.png';

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
        if (id.includes('WOOD') || id.includes('AXE')) return 'LUMBERJACK';
        if (id.includes('ORE') || id.includes('PICKAXE')) return 'ORE_MINER';
        if (id.includes('HIDE') || id.includes('KNIFE')) return 'ANIMAL_SKINNER';
        if (id.includes('FIBER') || id.includes('SICKLE')) return 'FIBER_HARVESTER';
        if (id.includes('FISH') || id.includes('ROD')) return 'FISHING';
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
        // Warrior - Includes PLATE (Armor, Boots, Helm, Gloves), SWORD, SHIELD, CAPE
        if (id.includes('SWORD') || id.includes('PLATE') || id.includes('SHIELD') || id.includes('WARRIOR_CAPE')) {
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

    // Warrior: PLATE, SWORD, SHIELD
    if (id.includes('SWORD') || id.includes('PLATE') || id.includes('SHIELD') || id.includes('WARRIOR_CAPE')) {
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

    // ATTACK (Combat) runes: Scale 1% (T1 1*) to 30% (T10 3*)
    // Formula: Base Points * 0.6. Allows decimals.
    // Also applies to ATTACK_SPEED
    if (effType === 'ATTACK' || effType === 'ATTACK_SPEED') {
        const raw = bonus * 0.6;
        bonus = Math.max(1, Number(raw.toFixed(1)));
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
            const EFF_NAME_MAP = { XP: 'XP', COPY: 'Duplication', SPEED: 'Auto-Refine', EFF: 'Efficiency', ATTACK: 'Attack', SAVE_FOOD: 'Food Saving', BURST: 'Burst' };
            const EFF_LABEL_MAP = { XP: 'Experience', COPY: 'Duplication', SPEED: 'Auto-Refine Chance', EFF: 'Speed', ATTACK: 'Damage', SAVE_FOOD: 'Conservation', BURST: 'Critical Chance' };

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


// Generation for World Boss Chests (50 types: T1-T10 x 5 Qualities)
for (let t = 1; t <= 10; t++) {
    Object.entries(QUALITIES).forEach(([qId, q]) => {
        const id = `T${t}_WORLDBOSS_CHEST_${q.name.toUpperCase()}`;
        if (!ITEMS.SPECIAL.CHEST) ITEMS.SPECIAL.CHEST = {};
        ITEMS.SPECIAL.CHEST[id] = {
            id: id,
            name: `T${t} World Boss Chest (${q.name})`,
            tier: t,
            quality: parseInt(qId),
            type: 'CHEST',
            description: `A heavy chest containing rewards from the World Boss.`,
            rarity: q.name === 'Masterpiece' ? 'LEGENDARY' : (q.name === 'Excellent' ? 'EPIC' : (q.name === 'Outstanding' ? 'RARE' : 'COMMON')),
            rarityColor: q.color,
            icon: '/items/chest_worldboss.png'
        };
    });
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

