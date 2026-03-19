import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const charId = '0db46a1b-8937-480e-b5c6-f8a31362c6fd';
    const now = new Date();
    console.log('--- Server Diagnostics ---');
    console.log('Current ISO:', now.toISOString());
    console.log('dateStr (Manager Logic):', now.toISOString().split('T')[0]);
    console.log('--------------------------');

    const { data, error } = await supabase
        .from('world_boss_attempts')
        .select('*')
        .eq('character_id', charId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Supabase Error:', error);
        return;
    }

    console.log('--- Recent Attempts for Eterno ---');
    console.table(data.map(r => ({
        id: r.id.substring(0, 8) + '...',
        date: r.date,
        damage: r.damage,
        claimed: r.claimed,
        created: r.created_at,
        session: r.session_id ? r.session_id.substring(0, 8) + '...' : 'NULL'
    })));
    console.log('---------------------------------');
}

inspect();
