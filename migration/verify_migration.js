import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SERVICE_ROLE_KEY);

async function verify() {
    console.log('--- Verificação ---');

    const { count: usersCount } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    console.log(`Usuários no Auth: ${usersCount || '?'}`); // listUsers pagination return is diff structure sometimes

    const { count: charsCount } = await supabase.from('characters').select('*', { count: 'exact', head: true });
    console.log(`Personagens: ${charsCount}`);

    const { count: msgsCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });
    console.log(`Mensagens: ${msgsCount}`);

    // Check one user
    const { data: chars } = await supabase.from('characters').select('name, user_id').limit(5);
    if (chars && chars.length > 0) {
        console.log('Exemplos de personagens migrados:');
        chars.forEach(c => console.log(`- ${c.name} (Owner: ${c.user_id})`));
    } else {
        console.log('ALERTA: Nenhum personagem encontrado!');
    }
}

verify();
