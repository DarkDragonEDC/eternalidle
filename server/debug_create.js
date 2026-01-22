import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { SUPABASE_URL, SUPABASE_KEY } = process.env;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const debugCreate = async () => {
    const testId = '00000000-0000-0000-0000-000000000000'; // Valid UUID for testing
    const name = 'DebugHero-' + Math.floor(Math.random() * 1000);

    console.log(`Testing creation for User: ${testId}, Name: ${name}`);

    const { data, error } = await supabase
        .from('characters')
        .insert({
            id: testId,
            user_id: testId,
            name: name,
            state: {
                skills: {},
                inventory: [],
                stats: { hp: 100, maxHp: 100 }
            }
        })
        .select();

    if (error) {
        console.error('FAILED to create character:', error);
    } else {
        console.log('SUCCESS! Character created:', data);

        // Cleanup
        await supabase.from('characters').delete().eq('id', testId);
        console.log('Cleanup: Test character deleted.');
    }
}

debugCreate();
