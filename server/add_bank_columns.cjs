
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addBankColumns() {
    console.log("Attempting to add bank columns to 'guilds' table...");

    const sql = `
    ALTER TABLE guilds ADD COLUMN IF NOT EXISTS bank_silver BIGINT DEFAULT 0;
    ALTER TABLE guilds ADD COLUMN IF NOT EXISTS bank_items JSONB DEFAULT '{}';
    `;

    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (rpcError) {
        console.error("RPC_ERROR: " + rpcError.message);
    } else {
        console.log("RPC_SUCCESS");
    }
}

addBankColumns();
