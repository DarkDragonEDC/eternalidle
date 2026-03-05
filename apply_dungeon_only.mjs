// Re-apply ONLY dungeon mob damage values onto the restored (old) monsters.js
import fs from 'fs';

// These are the balanced dungeon mob damage values we calculated
const DUNGEON_MOB_DAMAGES = {
    // Tier 1
    'ROCK_ELEMENTAL_T1': 7,
    'FOREST_SPIDER': 8,
    'GOBLIN_KING': 9,
    'DUNGEON_RABBIT': 10,
    'BOSS_GOBLIN_SCOUT_KING': 12,
    // Tier 2
    'FOREST_SPIRIT': 15,
    'BANDIT_SCOUT': 18,
    'ALPHA_WOLF': 21,
    'DUNGEON_WOLF': 24,
    'BOSS_DIRE_RAT_KING': 30,
    // Tier 3
    'SKELETON': 25,
    'SKELETON_WARRIOR': 28,
    'ANCIENT_BEAR': 31,
    'DUNGEON_BEAR': 34,
    'BOSS_MOUNTAIN_GOBLIN_KING': 40,
    // Tier 4
    'UNDEAD_SOLDIER': 45,
    'CRYPT_WARDEN': 50,
    'SKELETON_KING': 55,
    'DUNGEON_DIRE_WOLF': 60,
    'BOSS_GHOST_KNIGHT_LORD': 75,
    // Tier 5
    'ANCIENT_LICH': 80,
    'LICH_LORD': 90,
    'OGRE_CHIEFTAIN': 100,
    'DUNGEON_OGRE': 110,
    'BOSS_WAR_OGRE_KING': 135,
    // Tier 6
    'FIRE_ELEMENTAL': 140,
    'INFERNAL_ELEMENTAL': 155,
    'ELDER_TROLL': 170,
    'DUNGEON_TROLL': 185,
    'BOSS_ARMORED_TROLL_KING': 220,
    // Tier 7
    'DARK_KNIGHT': 190,
    'DEATH_KNIGHT': 210,
    'DRAGON_MOTHER': 230,
    'DUNGEON_DRAGON_WHELP': 250,
    'BOSS_FIRE_DRAKE_MONARCH': 300,
    // Tier 8
    'LESSER_DEMON': 240,
    'DEMON_WARRIOR': 265,
    'PRIMORDIAL_GOLEM': 290,
    'DUNGEON_ANCIENT_GOLEM': 315,
    'BOSS_OBSIDIAN_GOLEM_LORD': 380,
    // Tier 9
    'ARCHDEMON': 300,
    'ABYSSAL_FIEND': 330,
    'DEMON_PRINCE': 360,
    'DUNGEON_ELDER_DRAGON': 390,
    'BOSS_VOID_DRAGON_OVERLORD': 470,
    // Tier 10
    'DEMON_LORD': 380,
    'VOID_EXECUTIONER': 420,
    'VOID_ENTITY': 460,
    'DUNGEON_ANCIENT_DRAGON': 500,
    'BOSS_VOID_DRAGON_LORD': 600
};

let file = fs.readFileSync('./shared/monsters.js', 'utf-8');

let applied = 0;
let failed = 0;

for (const [mobId, newDmg] of Object.entries(DUNGEON_MOB_DAMAGES)) {
    // Match: "id": "MOB_ID" ... "damage": NUMBER
    // The pattern must cross lines but stay within the same mob object block
    const pattern = new RegExp(
        `("id":\\s*"${mobId}"[^}]*?"damage":\\s*)\\d+`,
        's'
    );
    const before = file;
    file = file.replace(pattern, `$1${newDmg}`);
    if (file !== before) {
        applied++;
        console.log(`✓ ${mobId}: damage -> ${newDmg}`);
    } else {
        console.error(`✗ FAILED: ${mobId}`);
        failed++;
    }
}

fs.writeFileSync('./shared/monsters.js', file, 'utf-8');
console.log(`\nApplied: ${applied}, Failed: ${failed}`);
