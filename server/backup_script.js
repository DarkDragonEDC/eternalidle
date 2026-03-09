import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// Configurações do seu Supabase de PRODUÇÃO
const connectionString = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function backup() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Conectado ao Supabase...");

        let sql = "-- Backup gerado via script Node.js\n\n";

        // 1. Pegar as tabelas do schema public
        const resTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        `);

        for (const row of resTables.rows) {
            const tableName = row.table_name;
            console.log(`Fazendo backup da tabela: ${tableName}...`);

            // Aqui pegamos os dados
            const resData = await client.query(`SELECT * FROM "${tableName}"`);
            
            sql += `-- Tabela: ${tableName}\n`;
            if (resData.rows.length > 0) {
                const columns = Object.keys(resData.rows[0]).map(c => `"${c}"`).join(", ");
                for (const dataRow of resData.rows) {
                    const values = Object.values(dataRow).map(v => {
                        if (v === null) return "NULL";
                        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                        if (v instanceof Date) return `'${v.toISOString()}'`;
                        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
                        return v;
                    }).join(", ");
                    sql += `INSERT INTO "${tableName}" (${columns}) VALUES (${values});\n`;
                }
            }
            sql += "\n";
        }

        fs.writeFileSync('full_data_backup.sql', sql);
        console.log("SUCESSO! Arquivo full_data_backup.sql gerado com sucesso.");

    } catch (err) {
        console.error("Erro no backup:", err);
    } finally {
        await client.end();
    }
}

backup();
