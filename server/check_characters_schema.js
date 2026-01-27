import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkCharactersSchema() {
    let output = "Checking characters schema...\n";
    const { data, error } = await supabase
        .from('characters')
        .select('*')
        .limit(1);

    if (error) {
        output += `Error fetching characters: ${error.message}\n`;
    } else if (data && data.length > 0) {
        output += '--- AVAILABLE COLUMNS ---\n';
        Object.keys(data[0]).forEach(col => {
            output += `${col}\n`;
        });
        output += '-------------------------\n';
        output += `Sample Row: ${JSON.stringify(data[0], null, 2)}\n`;
    } else {
        output += 'No rows found in characters.\n';
    }

    fs.writeFileSync('characters_schema_output.txt', output);
    console.log("Characters schema check completed. Result saved to characters_schema_output.txt");
}

checkCharactersSchema();
