import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testRequestsTable() {
    const { data, error } = await supabase
        .from('guild_requests')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error querying guild_requests:", error.message);
    } else {
        console.log("guild_requests table exists!");
    }
}

testRequestsTable();
