import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

const supabaseUrl = process.env.NEW_SUPABASE_URL;
const serviceRoleKey = process.env.NEW_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('ERRO: Faltando NEW_SUPABASE_URL ou NEW_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const BACKUP_DIR = path.join(__dirname, 'backup');
const ID_MAP_FILE = path.join(BACKUP_DIR, 'id_map.json');
let idMap = {};

// Função auxiliar para ler JSON
function loadJSON(filename) {
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function restoreUsers() {
    console.log('--- Restaurando/Mapeando Usuários ---');
    const oldUsers = loadJSON('users.json');
    if (!oldUsers) {
        console.error('users.json não encontrado!');
        return;
    }

    // 1. Baixar todos os usuários JÁ criados no novo Supabase para mapear
    const { data: { users: existingUsers }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailToNewId = {};
    if (existingUsers) {
        existingUsers.forEach(u => emailToNewId[u.email] = u.id);
    }

    let restoredCount = 0;

    for (const oldUser of oldUsers) {
        // Se já existe, mapeia e segue
        if (emailToNewId[oldUser.email]) {
            idMap[oldUser.id] = emailToNewId[oldUser.email];
            continue;
        }

        // Se não existe, cria
        const tempPassword = `Mudar123!${Math.random().toString(36).slice(-5)}`;
        try {
            const { data: newUser, error } = await supabase.auth.admin.createUser({
                email: oldUser.email,
                password: tempPassword,
                email_confirm: true
            });

            if (error) {
                console.log(`Erro ao criar ${oldUser.email}: ${error.message}`);
            } else {
                console.log(`Usuário criado: ${oldUser.email}`);
                idMap[oldUser.id] = newUser.user.id;
                restoredCount++;
            }
        } catch (e) {
            console.error(`Exceção user ${oldUser.email}:`, e);
        }
    }

    fs.writeFileSync(ID_MAP_FILE, JSON.stringify(idMap, null, 2));
    console.log(`> Mapa de IDs atualizado com ${Object.keys(idMap).length} usuários.`);
}

async function restoreTable(tableName, idColumn = 'user_id') {
    console.log(`--- Restaurando Tabela: ${tableName} ---`);
    const records = loadJSON(`${tableName}.json`);
    if (!records) {
        console.log(`> Arquivo ${tableName}.json não encontrado.`);
        return;
    }

    const newRecords = [];
    const skipped = [];

    for (const record of records) {
        const oldId = record[idColumn];

        // Se a tabela tem uma coluna de referência ao usuário, precisamos atualizar
        if (oldId && idMap[oldId]) {
            // Cria cópia do registro trocando o ID
            const newRecord = { ...record };
            newRecord[idColumn] = idMap[oldId];

            // Remove ID original da linha se for SERIAL ou gerado automaticamente
            // Para 'characters' o ID é UUID Primary Key. Podemos TENTAR manter o mesmo ID de registro?
            // NÃO, se o ID do registro for o próprio Auth UID (como em characters.id = auth.uid())

            if (tableName === 'characters') {
                // Em characters: id é PK e DEFAULT auth.uid().
                // Mas no banco antigo, o ID do personagem ERA o ID do usuário.
                // Então aqui também deve ser.
                newRecord.id = idMap[oldId];
            }
            else if (tableName === 'market_listings') {
                // market_listings: seller_id vira o novo ID. O 'id' do listing pode ser mantido ou novo.
                // Vamos deixar gerar novo UUID para evitar conflitos, a menos que tenhamos referencias cruzadas.
                delete newRecord.id;
            }
            else if (tableName === 'messages') {
                delete newRecord.id; // SERIAL
            }

            newRecords.push(newRecord);
        } else {
            // Se não achou o dono no mapa (ex: usuário deletado ou falha na criação)
            skipped.push(record);
        }
    }

    // Inserir um por um para garantir que erro em um não falhe todos
    let successCount = 0;
    for (const record of newRecords) {
        const { error } = await supabase.from(tableName).upsert(record);
        if (error) {
            console.error(`Erro ao inserir registro (Owner: ${record.user_id}):`, error.message);
        } else {
            successCount++;
        }
    }
    console.log(`> ${successCount}/${newRecords.length} registros inseridos em ${tableName}.`);

    if (skipped.length > 0) {
        console.log(`> ${skipped.length} registros pulados (usuário não encontrado no mapa).`);
    }
}

async function run() {
    await restoreUsers();

    // Recarrega mapa caso tenhamos rodado users separado antes
    if (Object.keys(idMap).length === 0 && fs.existsSync(ID_MAP_FILE)) {
        idMap = JSON.parse(fs.readFileSync(ID_MAP_FILE));
    }

    await restoreTable('characters', 'user_id'); // characters.user_id -> map -> characters.id

    // Outras tabelas
    await restoreTable('market_listings', 'seller_id');
    await restoreTable('messages', 'user_id');

    console.log('=== RESTAURAÇÃO CONCLUÍDA ===');
}

run();
