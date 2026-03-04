
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials.");
    console.error("URL:", SUPABASE_URL ? "FOUND" : "MISSING");
    console.error("KEY:", SUPABASE_KEY ? "FOUND" : "MISSING");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addColumns() {
    console.log("Attempting to add columns 'sender_name' and 'receiver_name' to 'trade_sessions'...");

    const sql = `
    ALTER TABLE trade_sessions 
    ADD COLUMN IF NOT EXISTS sender_name TEXT,
    ADD COLUMN IF NOT EXISTS receiver_name TEXT;
    `;

    // Try using RPC if available (exec_sql)
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (rpcError) {
        console.log("------------------------------------------");
        console.log("Could not execute SQL automatically (RPC 'exec_sql' missing or permissions error).");
        console.log("Error:", rpcError.message);
        console.log("Please run the following SQL in your Supabase Dashboard -> SQL Editor:");
        console.log("------------------------------------------");
        console.log(sql);
        console.log("------------------------------------------");
    } else {
        console.log("Successfully added columns via RPC!");
    }
}

addColumns();
