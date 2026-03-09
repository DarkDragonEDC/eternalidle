import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Configurações do seu Supabase de STAGING (HOMOLOGAÇÃO)
const connectionString = "postgresql://postgres:Bertolino%403985@db.cxwivaxqmuzsahydekmv.supabase.co:5432/postgres";

const sqlFiles = [
    'full_data_backup.sql'
];

async function importStaging() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Conectado ao Supabase de STAGING...");

        for (const file of sqlFiles) {
            console.log(`Executando arquivo: ${file}...`);
            const filePath = path.join(process.cwd(), file);
            
            if (!fs.existsSync(filePath)) {
                console.warn(`Aviso: Arquivo ${file} não encontrado. Pulando...`);
                continue;
            }

            const sql = fs.readFileSync(filePath, 'utf8');
            
            // Executar o SQL
            await client.query(sql);
            console.log(`Sucesso ao executar ${file}`);
        }

        console.log("\nPARABÉNS! Dados importados com sucesso.");

    } catch (err) {
        console.error("Erro na importação:", err);
    } finally {
        await client.end();
    }
}

importStaging();
