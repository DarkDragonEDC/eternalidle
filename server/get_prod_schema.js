import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const connectionString = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function getFullSchemaDetailed() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        // 1. Get all tables
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        
        const fullSchema = {
            tables: {},
            foreignKeys: [],
            indexes: []
        };

        for (const tableName of tables) {
            console.log(`Getting columns for ${tableName}...`);
            const res = await client.query(`
                SELECT column_name, data_type, column_default, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '${tableName}'
                ORDER BY ordinal_position;
            `);
            fullSchema.tables[tableName] = res.rows;
        }

        // 2. Get Foreign Keys
        console.log("Getting Foreign Keys...");
        const fkRes = await client.query(`
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
        `);
        fullSchema.foreignKeys = fkRes.rows;

        // 3. Get Indexes (simplified)
        console.log("Getting Indexes...");
        const idxRes = await client.query(`
            SELECT
                tablename,
                indexname,
                indexdef
            FROM
                pg_indexes
            WHERE
                schemaname = 'public';
        `);
        fullSchema.indexes = idxRes.rows;
        
        fs.writeFileSync('production_full_schema_detailed.json', JSON.stringify(fullSchema, null, 2));
        console.log("Detailed schema saved to production_full_schema_detailed.json");

    } catch (err) {
        fs.writeFileSync('schema_error.txt', err.stack);
        console.error(err);
    } finally {
        await client.end();
    }
}

getFullSchemaDetailed();
