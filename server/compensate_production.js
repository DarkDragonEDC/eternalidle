import { supabase } from './services/supabase.js';
import { GameManager } from './GameManager.js';
import { MONSTERS } from '../shared/monsters.js';
import { ITEM_LOOKUP } from '../shared/items.js';

const compensationList = [
    { name: "Bellatorz", mobId: "WILD_HOG", tier: 1 },
    { name: "Cardeal", mobId: "WAR_OGRE", tier: 5 },
    { name: "MSU", mobId: "DIRE_WOLF", tier: 4 },
    { name: "Immortal", mobId: "STAG", tier: 2 },
    { name: "Kissinho", mobId: "CORRUPTED_PALADIN", tier: 5 },
    { name: "DarkDragon", mobId: "FOX", tier: 1 },
    { name: "Hex Havoc", mobId: "RABBIT", tier: 1 },
    { name: "GUTS", mobId: "RABBIT", tier: 1 },
    { name: "Orange", mobId: "WILD_HOG", tier: 1 },
    { name: "Guthiix", mobId: "OGRE", tier: 5 },
    { name: "Roflelf", mobId: "FOX", tier: 1 },
    { name: "GHOSTONE", mobId: "RABBIT", tier: 1 },
    { name: "FuturoMago", mobId: "BEAR", tier: 3 },
    { name: "Brola", mobId: "CRIMSON_BAT", tier: 5 },
    { name: "Ky4fun", mobId: "STAG", tier: 2 },
    { name: "Kyjux", mobId: "WOLF", tier: 2 },
    { name: "hithere", mobId: "FOX", tier: 1 },
    { name: "Tacomunchero", mobId: "GOBLIN_SCOUT", tier: 1 },
    { name: "PureIron", mobId: "RABBIT", tier: 1 },
    { name: "Pure", mobId: "RABBIT", tier: 1 },
    { name: "Salz", mobId: "RABBIT", tier: 1 },
    { name: "Loterius", mobId: "BANDIT_THUG", tier: 2 },
    { name: "roxx", mobId: "GOBLIN_SCOUT", tier: 1 },
    { name: "DIABLO", mobId: "GOBLIN_SCOUT", tier: 1 },
    { name: "DIABLO'", mobId: "GOBLIN_SCOUT", tier: 1 },
    { name: "Ark", mobId: "DIRE_WOLF", tier: 4 },
    { name: "Dede68", mobId: "OGRE", tier: 5 },
    { name: "Deathbloom", mobId: "MOUNTAIN_GOBLIN", tier: 3 },
    { name: "Eugene Lionheart", mobId: "GOBLIN_SCOUT", tier: 1 },
    { name: "reSu", mobId: "BEAR", tier: 3 }
];

const SECONDS_9H = 32400;
const RESPAWN_TIME = 2; // seconds

async function runCompensation() {
    const gm = new GameManager(supabase);
    console.log(`Iniciando compensação para ${compensationList.length} jogadores...\n`);

    for (const entry of compensationList) {
        try {
            // 1. Load character
            console.log(`Processando ${entry.name}...`);
            const { data: charRaw } = await supabase
                .from('characters')
                .select('*')
                .eq('name', entry.name)
                .single();

            if (!charRaw) {
                console.error(`Jogador ${entry.name} não encontrado.`);
                continue;
            }

            const char = await gm.getCharacter(charRaw.user_id, charRaw.id, false, true);
            
            // 2. Mob metadata
            const mobData = MONSTERS[entry.tier]?.find(m => m.id === entry.mobId);
            if (!mobData) {
                console.error(`Mob ${entry.mobId} não encontrado.`);
                continue;
            }

            // 3. Estimate Performance
            const stats = gm.inventoryManager.calculateStats(char);
            const playerDmg = stats.damage || 10;
            const playerAtkSpeed = (stats.attackSpeed || 2000) / 1000; // in seconds
            
            const hitsToKill = Math.ceil(mobData.health / playerDmg);
            const timePerKill = (hitsToKill * playerAtkSpeed) + RESPAWN_TIME;
            
            const totalKills = Math.floor(SECONDS_9H / timePerKill);
            console.log(`  Calculado: ${totalKills} kills em 9h (${timePerKill.toFixed(2)}s/kill)`);

            // 4. Calculate Rewards
            const xpBonusMultiplier = 1 + (stats.globals?.xpYield || 0) / 100;
            const silverBonusMultiplier = 1 + (stats.globals?.silverYield || 0) / 100;
            const dropRateMultiplier = 1 + (stats.globals?.dropRate || 0) / 100;

            const finalXp = totalKills * Math.floor(mobData.xp * xpBonusMultiplier);
            
            let finalSilver = 0;
            if (mobData.silver) {
                const avgSilver = (mobData.silver[0] + mobData.silver[1]) / 2;
                finalSilver = totalKills * Math.floor(avgSilver * silverBonusMultiplier);
            }

            // 5. Simulate Loot
            const lootGained = {};
            if (mobData.loot) {
                for (let i = 0; i < totalKills; i++) {
                    for (const [itemId, chance] of Object.entries(mobData.loot)) {
                        const finalChance = chance * dropRateMultiplier;
                        if (Math.random() < finalChance) {
                            lootGained[itemId] = (lootGained[itemId] || 0) + 1;
                        }
                    }
                }
            }

            // 6. Queue Pending Reward
            const { error: rewardError } = await gm.supabase
                .from('pending_rewards')
                .insert([{
                    character_id: char.id,
                    xp_gained: { COMBAT: finalXp },
                    silver_gained: finalSilver,
                    loot_gained: lootGained,
                    reason: `Compensacao 9h Combate (${entry.mobId} T${entry.tier})`
                }]);

            if (rewardError) throw rewardError;
            
            console.log(`  Agendado para ${entry.name}: +${finalXp} XP, +${finalSilver} Silver, Loot: ${JSON.stringify(lootGained)}`);

        } catch (err) {
            console.error(`Erro ao processar ${entry.name}:`, err.message);
        }
    }

    console.log("\nAgendamento de compensação concluído!");
}

runCompensation();
