import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspectIdentities() {
    const userId = '5093ffaa-4770-4123-a83b-fca97a30601b';
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    console.log('User identities raw structure:');
    console.log(JSON.stringify(user.identities, null, 2));
    process.exit(0);
}

inspectIdentities();
