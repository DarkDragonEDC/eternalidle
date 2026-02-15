
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log("Checking columns for 'sender', 'receiver', 'sender_name', 'receiver_name'...");
    const { data, error } = await supabase.from('trade_sessions').select('*').limit(1);

    if (error) {
        console.log("Error:", error.message);
    } else if (data && data[0]) {
        const keys = Object.keys(data[0]);
        console.log("ALL KEYS FOUND:", keys);
        console.log("sender exists?", keys.includes('sender'));
        console.log("receiver exists?", keys.includes('receiver'));
        console.log("receive exists?", keys.includes('receive'));
        console.log("sender_name exists?", keys.includes('sender_name'));
        console.log("receiver_name exists?", keys.includes('receiver_name'));
    }
}

check();
