
import { createClient } from '@supabase/supabase-js';

const URL = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

const supabase = createClient(URL, KEY);

/**
 * Formula to calculate total XP based on level and current XP.
 */
function calculateAccumulatedXP(level, currentXp) {
    let total = 0;
    for (let i = 1; i < level; i++) {
        total += Math.floor(100 * Math.pow(1.15, i - 1));
    }
    return total + currentXp;
}

async function fixRankings() {
    console.log("Starting enhanced production ranking fix...");
    
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
        let ipCount = 0;
        const skillsToUpdate = char.skills || {};

        // Calculate Level and XP
        if (skillsToUpdate) {
            for (const skillKey of Object.keys(skillsToUpdate)) {
                const skill = skillsToUpdate[skillKey];
                const lvl = Number(skill.level) || 1;
                const xp = Number(skill.xp) || 0;
                
                const skillTotalXp = calculateAccumulatedXP(lvl, xp);
                
                // Inject totalXp into the skill object for easier query sorting
                skill.totalXp = skillTotalXp;
                
                totalLevel += lvl;
                totalXp += skillTotalXp;
            }
        }

        // Calculate Item Power
        if (char.equipment) {
            for (const slot of Object.values(char.equipment)) {
                if (slot && slot.ip) {
                    totalIp += Number(slot.ip);
                    ipCount++;
                }
            }
        }

        const ranking_total_level = totalLevel;
        const ranking_total_xp = totalXp;
        const ranking_item_power = ipCount > 0 ? Math.floor(totalIp / ipCount) : 0;

        const { error: updateErr } = await supabase
            .from('characters')
            .update({
                skills: skillsToUpdate, // Save updated skills with totalXp
                ranking_total_level,
                ranking_total_xp,
                ranking_item_power
            })
            .eq('id', char.id);

        if (updateErr) {
            console.error(`Failed to update ${char.name}:`, updateErr.message);
        } else {
            console.log(`Updated ${char.name}: Lvl=${ranking_total_level}, XP=${ranking_total_xp}`);
        }
    }

    console.log("Fix complete!");
}

fixRankings();
