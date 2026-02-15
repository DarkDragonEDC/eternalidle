
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log("Adding columns 'sender' and 'receiver' to 'trade_sessions'...");
    const sql = `
    ALTER TABLE trade_sessions 
    ADD COLUMN IF NOT EXISTS sender TEXT,
    ADD COLUMN IF NOT EXISTS receiver TEXT;
    `;
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error("Migration failed:", error.message);
    } else {
        console.log("Migration successful!");
    }
}

migrate();
