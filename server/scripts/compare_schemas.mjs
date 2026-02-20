import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const PROD_URL = "https://rozwhqxbpsxlxbkfzvce.supabase.co";
const PROD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I";

const HOMOLOG_URL = "https://pogfjnuzytzqdeuzefyv.supabase.co";
const HOMOLOG_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZ2ZqbnV6eXR6cWRldXplZnl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU3Mzc1MCwiZXhwIjoyMDg3MTQ5NzUwfQ.AUwzeR7GDPhCjqo15C93yXXMmKbDW1KKBhvnUK_lncs";

const prodClient = createClient(PROD_URL, PROD_KEY);
const homologClient = createClient(HOMOLOG_URL, HOMOLOG_KEY);

const tablesToCheck = [
    'characters',
    'market_listings',
    'market_history',
    'messages',
    'combat_history',
    'dungeon_history',
    'user_sessions',
    'trade_sessions',
    'guilds',
    'guild_members',
    'guild_invites',
    'friends',
    'world_boss_history',
    'trade_names'
];

async function compareSchemas() {
    console.log("=== COMPARING PRODUCTION VS HOMOLOGATION ===");
    const results = {};

    for (const table of tablesToCheck) {

        // Fetch 1 row from PROD to get keys
        const { data: prodData, error: prodErr } = await prodClient.from(table).select('*').limit(1);
        const prodKeys = (prodData && prodData.length > 0) ? Object.keys(prodData[0]) : (prodErr ? `ERROR: ${prodErr.message}` : 'NO DATA / ROW EMPTY');

        // Fetch 1 row from HOMOLOG to get keys
        const { data: homData, error: homErr } = await homologClient.from(table).select('*').limit(1);
        const homKeys = (homData && homData.length > 0) ? Object.keys(homData[0]) : (homErr ? `ERROR: ${homErr.message}` : 'NO DATA / ROW EMPTY');

        results[table] = { prod_status: 'ok', hom_status: 'ok', missing_in_prod: [], missing_in_homolog: [] };

        if (Array.isArray(prodKeys) && Array.isArray(homKeys)) {
            results[table].missing_in_prod = homKeys.filter(k => !prodKeys.includes(k));
            results[table].missing_in_homolog = prodKeys.filter(k => !homKeys.includes(k));
            results[table].prod_status = 'Matches Data';
            results[table].hom_status = 'Matches Data';
        } else {
            results[table].prod_status = typeof prodKeys === 'string' ? prodKeys : 'Has Data';
            results[table].hom_status = typeof homKeys === 'string' ? homKeys : 'Has Data';
        }
    }

    fs.writeFileSync('compare_results.json', JSON.stringify(results, null, 2));
    console.log("Results written to compare_results.json");
}

compareSchemas();
