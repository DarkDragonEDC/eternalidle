
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase.from('trade_sessions').select('*').order('created_at', { ascending: false }).limit(1);
    if (error) {
        console.log("ERROR:", error.message);
    } else {
        console.log("FULL DATA ROW:", JSON.stringify(data[0], null, 2));
    }
}

check();
