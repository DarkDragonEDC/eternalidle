import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function stopCombat() {
    console.log("Stopping combat for all users...");
    const { data: chars, error } = await supabase.from('characters').select('*');
    if (error) {
        console.error(error);
        return;
    }

    for (const char of chars) {
        if (char.state.combat) {
            console.log(`Clearing combat for: ${char.name}`);
            delete char.state.combat;

            // Also ensure no negative health or weird state
            if (char.state.health <= 0) char.state.health = 10;

            const { error: updateError } = await supabase
                .from('characters')
                .update({ state: char.state })
                .eq('id', char.id);

            if (updateError) console.error(`Failed to update ${char.name}:`, updateError);
            else console.log(`Success.`);
        }
    }
}

stopCombat();
