import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkMarketSchema() {
    let output = "Checking market_listings schema...\n";
    const { data, error } = await supabase
        .from('market_listings')
        .select('*')
        .limit(1);

    if (error) {
        output += `Error fetching market listings: ${error.message}\n`;
    } else if (data && data.length > 0) {
        output += '--- AVAILABLE COLUMNS ---\n';
        Object.keys(data[0]).forEach(col => {
            output += `${col}\n`;
        });
        output += '-------------------------\n';
        output += `Sample Row: ${JSON.stringify(data[0], null, 2)}\n`;
    } else {
        output += 'No rows found.\n';
        const { error: colError } = await supabase
            .from('market_listings')
            .select('seller_character_id')
            .limit(1);

        if (colError) {
            output += `RESULT: seller_character_id column does NOT exist. Error: ${colError.message}\n`;
        } else {
            output += 'RESULT: seller_character_id column EXISTS.\n';
        }
    }

    fs.writeFileSync('schema_output.txt', output);
    console.log("Schema check completed. Result saved to schema_output.txt");
}

checkMarketSchema();
