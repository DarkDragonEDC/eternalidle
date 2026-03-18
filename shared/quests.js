export const QUEST_TYPES = {
    KILL: 'KILL',
    COLLECT: 'COLLECT',
    LEVEL: 'LEVEL',
    CRAFT: 'CRAFT',
    REFINE: 'REFINE',
    EQUIP: 'EQUIP',
    TALK: 'TALK',
    OPEN: 'OPEN',
    WORLD_BOSS: 'WORLD_BOSS',
    CRAFT_RUNE: 'CRAFT_RUNE',
    FUSE_RUNE: 'FUSE_RUNE'
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
    },
    THERON: {
        id: 'THERON',
        name: 'Theron the Runekeeper',
        image: 'theron.png',
        quests: ['theron_worldboss', 'theron_craft_rune', 'theron_fuse_rune', 'theron_equip_rune']
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
        reqQuest: 'theron_equip_rune',
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
        rewards: { silver: 1000, xp: { FISHING: 150 }, useClassItems: 10 },
        navigation: { tab: 'gathering', category: 'FISH' }
    },
    elara_food: {
        id: 'elara_food',
        title: 'Provision Stock',
        description: 'Raw fish sustains no one. Prepare 5 meals.',
        npcId: 'ELARA',
        type: QUEST_TYPES.CRAFT,
        goal: { itemId: 'T1_FOOD', count: 5 },
        rewards: { silver: 2000, xp: { COOKING: 300 }, useClassItems: 20 },
        navigation: { tab: 'crafting', category: 'COOKING_STATION' }
    },
    elara_gathering: {
        id: 'elara_gathering',
        title: 'Field Specialty',
        description: 'Every adventurer has their specialty. Bring 10 basic resources of your class.',
        npcId: 'ELARA',
        type: QUEST_TYPES.COLLECT,
        goal: { useClassResource: true, count: 10 },
        rewards: { silver: 5000, useClassXp: 500, useClassRefinedItems: 10 },
        navigation: { tab: 'gathering', useClass: true }
    },

    // GROG QUESTS
    grog_refine: {
        id: 'grog_refine',
        title: 'The Secret of Steel',
        description: 'Raw material is weak. Refine what you collected to make it useful. Refine 10 times.',
        npcId: 'GROG',
        type: QUEST_TYPES.REFINE,
        goal: { useClassRefined: true, count: 10 },
        rewards: { silver: 1000, useClassRefineXp: 150 },
        navigation: { tab: 'refining', useClass: true }
    },
    grog_craft: {
        id: 'grog_craft',
        title: 'Elite Forge',
        description: 'Now use these refined materials to create a worthy piece of armor for your class.',
        npcId: 'GROG',
        type: QUEST_TYPES.CRAFT,
        goal: { useClassArmor: true, count: 1 },
        rewards: { silver: 2000, useClassCraftXp: 300, useClassEquipment: true },
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
    },

    // THERON (RUNEKEEPER) QUESTS
    theron_worldboss: {
        id: 'theron_worldboss',
        title: 'Face the Ancient',
        description: 'The World Boss threatens us all. Challenge the Ancient Dragon at least once to prove your bravery.',
        npcId: 'THERON',
        type: QUEST_TYPES.WORLD_BOSS,
        goal: { count: 1 },
        rewards: { silver: 2000, items: { T1_BATTLE_RUNE_SHARD: 1000 } },
        navigation: { tab: 'world_boss' }
    },
    theron_craft_rune: {
        id: 'theron_craft_rune',
        title: 'Rune Forging',
        description: 'Use your rune shards to create a rune. Any category will do.',
        npcId: 'THERON',
        type: QUEST_TYPES.CRAFT_RUNE,
        goal: { count: 1 },
        rewards: { silver: 3000 },
        reqQuest: 'theron_worldboss',
        navigation: { tab: 'merging' }
    },
    theron_fuse_rune: {
        id: 'theron_fuse_rune',
        title: 'Rune Fusion',
        description: 'Combine two runes of the same type to create a stronger one.',
        npcId: 'THERON',
        type: QUEST_TYPES.FUSE_RUNE,
        goal: { count: 1 },
        rewards: { silver: 4000 },
        reqQuest: 'theron_craft_rune',
        navigation: { tab: 'merging' }
    },
    theron_equip_rune: {
        id: 'theron_equip_rune',
        title: 'Rune Empowerment',
        description: 'Equip a combat rune to enhance your battle capabilities.',
        npcId: 'THERON',
        type: QUEST_TYPES.EQUIP,
        goal: { combatRune: true },
        rewards: { items: { T1_FOOD: 200 } },
        reqQuest: 'theron_fuse_rune',
        navigation: { tab: 'profile', category: 'RUNES', tier: 'COMBAT' }
    }
};
