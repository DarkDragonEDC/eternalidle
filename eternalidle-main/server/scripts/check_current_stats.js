const { createClient } = require('@supabase/supabase-js');
const { resolveItem } = require('../shared/items');
const { getProficiencyStats } = require('../shared/proficiency_stats');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkStats() {
    const { data: chars } = await supabase.from('characters').select('*').ilike('name', 'EternoDev');
    const char = chars[0];
    const state = char.state;
    const skills = char.skills;
    const equipment = char.equipment || state.equipment || {};

    // Logic from CombatManager/shared
    const activeProf = 'warrior'; // Assuming warrior based on screenshot
    const profLvl = skills.WARRIOR_PROFICIENCY?.level || 1;
    const profStats = getProficiencyStats('warrior', profLvl);

    const profDefense = profStats.def || 0;
    const gearDefense = Object.values(equipment).reduce((acc, item) => {
        if (!item) return acc;
        const fresh = resolveItem(item.id || item.item_id);
        return acc + (fresh?.stats?.defense || 0);
    }, 0);

    const totalDefense = profDefense + gearDefense;
    const mitigation = Math.min(0.75, totalDefense / 10000);

    console.log(`Character: ${char.name}`);
    console.log(`Prof Lvl: ${profLvl}`);
    console.log(`Prof Defense: ${profDefense}`);
    console.log(`Gear Defense: ${gearDefense}`);
    console.log(`Total Defense: ${totalDefense}`);
    console.log(`Mitigation: ${(mitigation * 100).toFixed(1)}%`);
}

checkStats();
