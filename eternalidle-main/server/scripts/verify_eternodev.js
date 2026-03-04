import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function verify() {
    const { data: char, error } = await supabase
        .from('characters')
        .select('skills, state')
        .eq('name', '<EternoDev>')
        .single();

    if (error || !char) {
        console.error('Error fetching character:', error);
        return;
    }

    console.log('--- EternoDev Verification ---');

    const allSkills100 = Object.entries(char.skills).every(([name, s]) => {
        if (s.level !== 100) {
            console.log(`- Skill ${name} is level ${s.level} (Expected 100)`);
            return false;
        }
        return true;
    });
    console.log('Skills level 100:', allSkills100);

    const equip = char.state.equipment || {};
    console.log('Equipment Check:');
    const signature = 'EternoDev';
    for (const [slot, item] of Object.entries(equip)) {
        if (!item) continue;
        const isSigned = item.id.includes(`::${signature}`);
        const isRune = item.id.includes('_RUNE_');
        const isFood = item.type === 'FOOD';

        if (isSigned || isRune || isFood) {
            console.log(`- ${slot}: ${item.id} (OK)`);
        } else {
            console.log(`- ${slot}: ${item.id} (NOT SIGNED)`);
        }
    }

    console.log('Currency:');
    console.log(`- Silver: ${char.state.silver}`);
    console.log(`- Crowns/Orbs: ${char.state.crowns}`);
}

verify();
