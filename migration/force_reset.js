import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SERVICE_ROLE_KEY);

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
    console.log("Uso: node migration/force_reset.js <email> <nova_senha>");
    process.exit(1);
}

async function forceReset() {
    console.log(`Resetando senha para: ${email}...`);

    // 1. Achar ID do usuário (com paginação para garantir)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const user = users.find(u => u.email === email);

    if (!user) {
        console.error("Usuário não encontrado!");
        return;
    }

    // 2. Atualizar senha
    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword, email_confirm: true }
    );

    if (error) {
        console.error("Erro ao atualizar:", error.message);
    } else {
        console.log("✅ Senha atualizada com sucesso!");
        console.log(`Agora você pode logar com: ${email} / ${newPassword}`);
    }
}

forceReset();
