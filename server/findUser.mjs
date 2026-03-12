import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findUser() {
    const { data, error } = await supabase
        .from('characters')
        .select('user_id')
        .ilike('name', 'Eterno')
        .maybeSingle();

    if (error) {
        console.error('ERRO:', error.message);
        process.exit(1);
    }
    if (!data) {
        console.log('PERSONAGEM_NAO_ENCONTRADO');
    } else {
        console.log('USER_ID=' + data.user_id);
    }
}

findUser();
