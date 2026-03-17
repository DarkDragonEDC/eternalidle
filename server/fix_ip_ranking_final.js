
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;

if (!URL || !KEY) {
    console.error("ERRO: Credenciais do Supabase não encontradas no .env");
    process.exit(1);
}

const supabase = createClient(URL, KEY);

const XP_TABLE = [
    0, 84, 192, 324, 480, 645, 820, 1005, 1200, 1407,
    1735, 2082, 2449, 2838, 3249, 3684, 4144, 4631, 5146, 5691,
    6460, 7281, 8160, 9101, 10109, 11191, 12353, 13603, 14949, 16400,
    18455, 20675, 23076, 25675, 28492, 31549, 34870, 38482, 42415, 46702,
    52583, 58662, 64933, 71390, 78026, 84833, 91802, 98923, 106186, 114398,
    123502, 132734, 142077, 151515, 161029, 170602, 180216, 189852, 199491, 209115,
    220417, 232945, 246859, 262341, 279598, 298871, 320434, 344603, 371744, 402278,
    441971, 486789, 537487, 594941, 660170, 734360, 818896, 915396, 1025752, 1152182,
    1316749, 1492835, 1681248, 1882849, 2098562, 2329375, 2576345, 2840603, 3123359, 3425908,
    3749636, 4269287, 4827911, 5428432, 6073992, 6767969, 7513995, 8315973, 9178099, 10104099
];

function calculateAccumulatedXP(level, currentXp) {
    const baseXP = XP_TABLE[level - 1] || 0;
    return baseXP + currentXp;
}

async function fixRankings() {
    console.log("Starting Standardized IP & Ranking Recalibration...");
    
    // 1. Fetch all characters
    const { data: characters, error } = await supabase
        .from('characters')
        .select('id, name, skills, equipment');
    
    if (error) {
        console.error("Error fetching characters:", error);
        return;
    }

    console.log(`Processing ${characters.length} characters...`);

    for (const char of characters) {
        let totalLevel = 0;
        let totalXp = 0;
        let totalIp = 0;
        const skills = char.skills || {};

        if (skills) {
            for (const skillKey of Object.keys(skills)) {
                const skill = skills[skillKey];
                const lvl = Number(skill.level) || 1;
                const xp = Number(skill.xp) || 0;
                const skillTotalXp = calculateAccumulatedXP(lvl, xp);
                skill.totalXp = skillTotalXp;
                totalLevel += lvl;
                totalXp += skillTotalXp;
            }
        }

        // Standardized IP Calculation (Match InventoryManager.js)
        if (char.equipment) {
            const combatSlots = ['helmet', 'chest', 'boots', 'gloves', 'cape', 'mainHand', 'offHand'];
            
            combatSlots.forEach(slotKey => {
                const slot = char.equipment[slotKey];
                if (slot && typeof slot === 'object') {
                    let ip = Number(slot.ip);
                    if (!ip || isNaN(ip)) {
                        // Fallback logic for items with missing IP field in DB
                        const tier = Number(slot.id?.match(/T(\d+)/)?.[1]) || 1;
                        const quality = Number(slot.quality) || 0;
                        const qualityBonus = { 0: 0, 1: 20, 2: 50, 3: 100, 4: 200 }[quality] || 0;
                        ip = (tier * 100) + qualityBonus;
                    }
                    totalIp += ip;
                }
            });
        }

        const ranking_total_level = Math.floor(totalLevel);
        const ranking_total_xp = Math.floor(totalXp);
        const ranking_item_power = Math.floor(totalIp / 7);

        const updatePayload = {
            skills: skills,
            ranking_total_level,
            ranking_total_xp,
            ranking_item_power
        };

        const { error: updateError } = await supabase
            .from('characters')
            .update(updatePayload)
            .eq('id', char.id);

        if (updateError) {
            console.error(`Error updating character ${char.name}:`, updateError);
        } else {
            // Update Leaderboard table
            const lbEntries = [
                { character_id: char.id, ranking_type: 'LEVEL', value: ranking_total_level, character_name: char.name },
                { character_id: char.id, ranking_type: 'TOTAL_XP', value: ranking_total_xp, character_name: char.name },
                { character_id: char.id, ranking_type: 'ITEM_POWER', value: ranking_item_power, character_name: char.name }
            ];

            for (const [sKey, sData] of Object.entries(skills)) {
                if (sData && sData.totalXp) {
                    lbEntries.push({
                        character_id: char.id,
                        ranking_type: sKey,
                        value: sData.totalXp,
                        character_name: char.name
                    });
                }
            }

            await supabase.from('leaderboards').upsert(lbEntries, { onConflict: 'character_id,ranking_type' });
            console.log(`Updated ${char.name}: Lvl=${ranking_total_level}, IP=${ranking_item_power}`);
        }
    }

    console.log("Recalibration complete!");
}

fixRankings();
