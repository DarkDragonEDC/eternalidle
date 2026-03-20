import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_CHAR_ID = '625d8349-3ce3-4739-a8d6-9917aaf4e9c7'; 
const dateStr = new Date().toISOString().split('T')[0];

async function testQuery() {
    console.log(`Starting test query for ${TEST_CHAR_ID} on ${dateStr}`);
    const start = Date.now();
    
    try {
        const { data, error } = await supabase
            .from('world_boss_attempts')
            .select('id, damage')
            .eq('character_id', TEST_CHAR_ID)
            .eq('date', dateStr)
            .is('session_id', null);

        const end = Date.now();
        if (error) {
            console.error("Query Error:", error);
        } else {
            console.log(`Query Success! Found ${data.length} rows in ${end - start}ms`);
            console.log("Data:", data);
        }
    } catch (err) {
        console.error("Query Exception:", err);
    }
}

testQuery().catch(console.error);
