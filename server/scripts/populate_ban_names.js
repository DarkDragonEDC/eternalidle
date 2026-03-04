import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Erro: Credenciais do Supabase não encontradas no .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function updateSchemaAndPopulate() {
    console.log("Adding 'player_name' column to 'user_bans' (if not exists)...");

    // We can't run raw SQL directly via the client easily unless there's an RPC.
    // However, we can try to "ping" it or just skip to populating if the user manually added it.
    // THE USER MUST MANUALLY RUN:
    // ALTER TABLE public.user_bans ADD COLUMN player_name TEXT;

    console.log("Attempting to populate 'player_name' for existing bans...");

    // 1. Fetch all bans
    const { data: bans, error: banError } = await supabase
        .from('user_bans')
        .select('user_id, player_name');

    if (banError) {
        console.error("Error fetching bans (maybe column doesn't exist yet?):", banError.message);
        console.log("\n>>> ACTION REQUIRED: Go to Supabase SQL Editor and run:");
        console.log("ALTER TABLE public.user_bans ADD COLUMN player_name TEXT;");
        process.exit(1);
    }

    console.log(`Found ${bans.length} records in user_bans.`);

    // 2. Fetch all characters to map user_id -> name
    const { data: characters, error: charError } = await supabase
        .from('characters')
        .select('user_id, name');

    if (charError) {
        console.error("Error fetching characters:", charError);
        process.exit(1);
    }

    const nameMap = {};
    characters.forEach(c => {
        // If a user has multiple characters, we'll just pick one for the ban log
        if (!nameMap[c.user_id]) {
            nameMap[c.user_id] = c.name;
        }
    });

    let updatedCount = 0;
    for (const ban of bans) {
        if (!ban.player_name) {
            const name = nameMap[ban.user_id];
            if (name) {
                const { error: updateError } = await supabase
                    .from('user_bans')
                    .update({ player_name: name })
                    .eq('user_id', ban.user_id);

                if (updateError) {
                    console.error(`Failed to update ${ban.user_id}:`, updateError.message);
                } else {
                    updatedCount++;
                }
            }
        }
    }

    console.log(`Successfully populated player_name for ${updatedCount} records.`);
    process.exit(0);
}

updateSchemaAndPopulate();
