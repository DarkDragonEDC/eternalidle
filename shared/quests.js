export const QUEST_TYPES = {
    KILL: 'KILL',
    COLLECT: 'COLLECT',
    LEVEL: 'LEVEL',
    CRAFT: 'CRAFT',
    REFINE: 'REFINE',
    EQUIP: 'EQUIP',
    TALK: 'TALK',
    OPEN: 'OPEN'
};

export const NPCS = {
    ELDER: {
        id: 'ELDER',
        name: 'The Elder',
        image: 'elder.png',
        quests: ['elder_intro', 'elder_open_chest', 'elder_choose_path', 'elder_equip_food', 'elder_talk_elara']
    },
    BRYN: {
        id: 'BRYN',
        name: 'Bryn the Hunter',
        image: 'bryn.png',
        quests: ['bryn_rabbit', 'bryn_goblin', 'bryn_hogs']
    },
    ELARA: {
        id: 'ELARA',
        name: 'Elara the Gatherer',
        image: 'elara.png',
        quests: ['elara_fish', 'elara_food', 'elara_gathering']
    },
    GROG: {
        id: 'GROG',
        name: 'Grog the Blacksmith',
        image: 'grog.png',
        quests: ['grog_refine', 'grog_craft', 'grog_equip']
    }
};

export const QUESTS = {
    // ELDER QUESTS
    elder_intro: {
        id: 'elder_intro',
        title: 'The Beginning of All',
        description: 'Welcome! As a sign of welcome, take this Noob Chest. In it, you will find the basics for your journey.',
        npcId: 'ELDER',
        type: QUEST_TYPES.TALK,
        goal: { npcId: 'ELDER' },
        rewards: { 
            items: { NOOB_CHEST: 1 },
            xp: { COMBAT: 50 }
        },
        navigation: { tab: 'village' }
    },
    elder_open_chest: {
        id: 'elder_open_chest',
        title: 'Opening the Gift',
        description: "Don't leave the chest closed! Open it in your inventory to see what's inside.",
        npcId: 'ELDER',
        type: QUEST_TYPES.OPEN,
        goal: { itemId: 'NOOB_CHEST' },
        rewards: { silver: 1000 },
        reqQuest: 'elder_intro',
        navigation: { tab: 'inventory' }
    },
    elder_choose_path: {
        id: 'elder_choose_path',
        title: 'Choose Your Path',
        description: 'Inside the chest were three weapons. Pick the one that fits you best and equip it. This choice will define your future!',
        npcId: 'ELDER',
        type: QUEST_TYPES.EQUIP,
        goal: { 
            anyItem: ['T1_SWORD', 'T1_BOW', 'T1_FIRE_STAFF'] 
        },
        rewards: { silver: 1000 },
        reqQuest: 'elder_open_chest',
        navigation: { tab: 'inventory' }
    },
    elder_equip_food: {
        id: 'elder_equip_food',
        title: 'Fuel for the Journey',
        description: "An adventurer can't fight on an empty stomach. Equip the food you found to stay healthy.",
        npcId: 'ELDER',
        type: QUEST_TYPES.EQUIP,
        goal: { itemId: 'T1_FOOD' },
        rewards: { silver: 1000 },
        reqQuest: 'elder_choose_path',
        navigation: { tab: 'inventory' }
    },
    elder_talk_elara: {
        id: 'elder_talk_elara',
        title: 'Getting to Know the Village',
        description: 'You look ready. Now, go talk to Elara, our resource expert. She has much to teach you.',
        npcId: 'ELDER',
        type: QUEST_TYPES.TALK,
        goal: { npcId: 'ELARA' },
        rewards: { silver: 1000 },
        reqQuest: 'elder_equip_food',
        navigation: { tab: 'village' }
    },

    // BRYN QUESTS
    bryn_rabbit: {
        id: 'bryn_rabbit',
        title: 'Rabbit Plague',
        description: 'The rabbits are devouring our gardens. Kill 20 of them.',
        npcId: 'BRYN',
        type: QUEST_TYPES.KILL,
        goal: { monsterId: 'RABBIT', count: 20 },
        rewards: { silver: 1000, proficiencyXp: 150 },
        navigation: { tab: 'combat', tier: 1 }
    },
    bryn_goblin: {
        id: 'bryn_goblin',
        title: 'Lurkers',
        description: 'Goblin scouts have been spotted nearby. Eliminate 15 of them.',
        npcId: 'BRYN',
        type: QUEST_TYPES.KILL,
        goal: { monsterId: 'GOBLIN_SCOUT', count: 15 },
        rewards: { silver: 2000, proficiencyXp: 300 },
        navigation: { tab: 'combat', tier: 1 }
    },
    bryn_hogs: {
        id: 'bryn_hogs',
        title: 'The Hog Hunt',
        description: 'The village needs meat and leather. Hunt 15 Wild Hogs.',
        npcId: 'BRYN',
        type: QUEST_TYPES.KILL,
        goal: { monsterId: 'WILD_HOG', count: 15 },
        rewards: { silver: 5000, proficiencyXp: 500 },
        navigation: { tab: 'combat', tier: 1 }
    },

    // ELARA QUESTS
    elara_fish: {
        id: 'elara_fish',
        title: 'Fishing for Dinner',
        description: 'The river is full today. Catch 10 fish for the village stock.',
        npcId: 'ELARA',
        type: QUEST_TYPES.COLLECT,
        goal: { itemId: 'T1_FISH', count: 10 },
        rewards: { silver: 1000, xp: { FISHING: 150 } },
        navigation: { tab: 'gathering', category: 'FISH' }
    },
    elara_food: {
        id: 'elara_food',
        title: 'Provision Stock',
        description: 'Raw fish sustains no one. Prepare 5 meals.',
        npcId: 'ELARA',
        type: QUEST_TYPES.CRAFT,
        goal: { itemId: 'T1_FOOD', count: 5 },
        rewards: { silver: 2000, xp: { COOKING: 300 } },
        navigation: { tab: 'crafting', category: 'COOKING_STATION' }
    },
    elara_gathering: {
        id: 'elara_gathering',
        title: 'Field Specialty',
        description: 'Every adventurer has their specialty. Bring 40 basic resources of your class.',
        npcId: 'ELARA',
        type: QUEST_TYPES.COLLECT,
        goal: { useClassResource: true, count: 40 },
        rewards: { silver: 5000, useClassXp: 500 },
        navigation: { tab: 'gathering', useClass: true }
    },

    // GROG QUESTS
    grog_refine: {
        id: 'grog_refine',
        title: 'The Secret of Steel',
        description: 'Raw material is weak. Refine what you collected to make it useful. Refine 20 times.',
        npcId: 'GROG',
        type: QUEST_TYPES.REFINE,
        goal: { useClassRefined: true, count: 20 },
        rewards: { silver: 1000, useClassRefineXp: 150 },
        navigation: { tab: 'refining', useClass: true }
    },
    grog_craft: {
        id: 'grog_craft',
        title: 'Elite Forge',
        description: 'Now use these refined materials to create a worthy piece of gear (Weapon or Armor).',
        npcId: 'GROG',
        type: QUEST_TYPES.CRAFT,
        goal: { anyCombatGear: true, onlyCrafted: true, count: 1 },
        rewards: { silver: 2000, useClassCraftXp: 300 },
        navigation: { tab: 'crafting', useClass: true }
    },
    grog_equip: {
        id: 'grog_equip',
        title: 'Ready for Combat',
        description: 'Gear in the inventory is of no use. Put it on and get ready.',
        npcId: 'GROG',
        type: QUEST_TYPES.EQUIP,
        goal: { anyCombatGear: true, onlyCrafted: true },
        rewards: { silver: 5000, items: { T1_FOOD: 100 } },
        navigation: { tab: 'inventory' }
    }
};
