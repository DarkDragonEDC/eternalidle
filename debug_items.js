import { resolveItem, ITEM_LOOKUP } from './shared/items.js';
import { HUNTER_STATS_FIXED } from './shared/hunter_stats_fixed.js';

const armorId = 'T10_LEATHER_ARMOR';
const masterpieceId = 'T10_LEATHER_ARMOR_Q4';

console.log('--- DEBUG ITEM RESOLUTION ---');
console.log('Fixed Stats for T10 Masterpiece Armor:', HUNTER_STATS_FIXED['Leather Armor'][10][4]);

const resolvedNormal = resolveItem(armorId);
console.log('Resolved Normal Defense:', resolvedNormal.stats.defense);

const resolvedMasterpiece = resolveItem(masterpieceId);
console.log('Resolved Masterpiece Defense:', resolvedMasterpiece.stats.defense);

const baseInLookup = ITEM_LOOKUP[armorId];
console.log('Base Item in Lookup Defense:', baseInLookup.stats.defense);
console.log('isHunterLookup flag:', baseInLookup.isHunterLookup);
