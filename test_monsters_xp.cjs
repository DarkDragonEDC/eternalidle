
const { MONSTERS } = require('./shared/monsters.js');

const expectedXp = {
    RABBIT: 23, GOBLIN_SCOUT: 24, WILD_HOG: 25, FOX: 27, SNAKE: 28,
    WOLF: 29, DIRE_RAT: 31, STAG: 32, MOUNTAIN_GOAT: 34, BANDIT_THUG: 36,
    BEAR: 37, MOUNTAIN_GOBLIN: 39, HIGHLAND_COW: 41, HARPY: 43, ROGUE_KNIGHT: 45,
    DIRE_WOLF: 48, GHOST_KNIGHT: 50, SNOW_LEOPARD: 53, GIANT_EAGLE: 55, ASH_GHOUL: 58,
    OGRE: 61, WAR_OGRE: 64, SWAMP_TROC: 67, CRIMSON_BAT: 70, CORRUPTED_PALADIN: 74,
    TROLL: 78, ARMORED_TROLL: 81, TUNDRA_BEAR: 86, SKY_STALKER: 90, EXECUTIONER: 94,
    DRAGON_WHELP: 99, FIRE_DRAKE: 104, LAVA_HOUND: 109, STORM_WRAITH: 115, RUNE_GUARDIAN: 120,
    ANCIENT_GOLEM: 126, OBSIDIAN_GOLEM: 133, GLACIER_GIANT: 139, VOID_STALKER: 146, ABYSSAL_KNIGHT: 154,
    ELDER_DRAGON: 161, VOID_DRAGON: 169, NEBULA_SERPENT: 178, STAR_DEVOURER: 187, COSMIC_HORROR: 196,
    ANCIENT_DRAGON: 206, VOID_DRAGON_LORD: 216, GALAXY_EATER: 227, VOID_REAPER: 238, ETERNAL_WATCHER: 250
};

let errors = 0;
let checked = 0;

Object.values(MONSTERS).forEach(tierList => {
    tierList.forEach(m => {
        if (expectedXp[m.id]) {
            checked++;
            if (m.xp !== expectedXp[m.id]) {
                console.error(`ERROR: ${m.id} has XP ${m.xp}, expected ${expectedXp[m.id]}`);
                errors++;
            }
        }
    });
});

console.log(`Checked ${checked} monsters. Errors: ${errors}`);
if (errors === 0) console.log("Verification SUCCESSFUL!");
else process.exit(1);
