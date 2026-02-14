import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

console.log('Searching for Guthiix...');
const { data, error } = await supabase
    .from('characters')
    .select('id, name, state, skills')
    .ilike('name', 'Guthiix')
    .limit(1);

if (error) {
    console.error('Error:', error);
} else {
    console.log('Data for Guthiix:');
    if (data && data.length > 0) {
        const char = data[0];
        console.log('Name:', char.name);
        console.log('Skills Column type:', typeof char.skills);
        console.log('Skills Column data:', char.skills);
        console.log('State Skills type:', typeof char.state?.skills);
        console.log('State Skills data:', char.state?.skills);

        const skills = char.skills || char.state?.skills || {};
        const level = Object.values(skills).reduce((acc, s) => acc + (Number(s?.level) || 0), 0);
        console.log('Calculated Level:', level);
    } else {
        console.log('No character found matching "Guthiix"');

        // Let's list some characters to see what's there
        const { data: list } = await supabase.from('characters').select('name').limit(5);
        console.log('Sample characters:', list?.map(c => c.name));
    }
}
process.exit();
