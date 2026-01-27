import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testQuery() {
    console.log("Testing original query...");
    const { count: c1, error: e1 } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true })
        .or('current_activity.not.is.null,state->combat.not.is.null,state->dungeon.not.is.null');

    console.log(`Original Result: ${c1}, Error: ${e1?.message || 'none'}`);

    console.log("Testing individual parts...");
    const { count: activityCount } = await supabase.from('characters').select('*', { count: 'exact', head: true }).not('current_activity', 'is', null);
    console.log(`Activity only: ${activityCount}`);

    // Tentativa com sintaxe alternativa de JSONB se necessário
    const { count: combatCount } = await supabase.from('characters').select('*', { count: 'exact', head: true }).not('state->combat', 'is', null);
    console.log(`Combat only (direct): ${combatCount}`);
}

testQuery();
