import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

const supabaseUrl = process.env.OLD_SUPABASE_URL;
const serviceRoleKey = process.env.OLD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('ERRO: Faltando OLD_SUPABASE_URL ou OLD_SERVICE_ROLE_KEY no arquivo .env.migration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const BACKUP_DIR = path.join(__dirname, 'backup');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function exportUsers() {
    console.log('Baixando usuários (Auth)...');
    let allUsers = [];
    let page = 1;
    const perPage = 50;

    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) throw error;
        
        allUsers = users;
        console.log(`> Encontrados ${allUsers.length} usuários.`);
        
        fs.writeFileSync(path.join(BACKUP_DIR, 'users.json'), JSON.stringify(allUsers, null, 2));
        console.log('> Arquivo users.json salvo.');
    } catch (err) {
        console.error('Erro ao baixar usuários:', err.message);
    }
}

async function exportTable(tableName) {
    console.log(`Baixando tabela '${tableName}'...`);
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (error) throw error;

        console.log(`> Encontradas ${data.length} linhas em ${tableName}.`);
        fs.writeFileSync(path.join(BACKUP_DIR, `${tableName}.json`), JSON.stringify(data, null, 2));
        console.log(`> Arquivo ${tableName}.json salvo.`);
    } catch (err) {
         // Se a tabela não existir, avisa mas não quebra tudo
        if (err.code === '42P01') { 
            console.log(`> Tabela ${tableName} não existe (pulando).`);
        } else {
            console.error(`Erro ao baixar tabela ${tableName}:`, err.message);
        }
    }
}

async function run() {
    console.log('=== INICIANDO BACKUP ===');
    await exportUsers();
    await exportTable('characters');
    await exportTable('market_listings');
    await exportTable('messages');
    console.log('=== BACKUP CONCLUÍDO ===');
}

run();
