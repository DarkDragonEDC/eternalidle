import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const connectionString = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to NEW Supabase...");

        // 1. Run the Altar Ranking Migration
        console.log("Applying 022_add_altar_ranking_column.sql...");
        const sql = fs.readFileSync(path.join(process.cwd(), 'sql/022_add_altar_ranking_column.sql'), 'utf8');
        await client.query(sql).catch(e => console.log("Note: Migration might already be applied or error:", e.message));

        // 2. Sync existing data from state.altar_total_donated to the new column
        console.log("Syncing ranking_altar_donated from state...");
        const syncSql = `
            UPDATE characters 
            SET ranking_altar_donated = (state->>'altar_total_donated')::bigint 
            WHERE state->>'altar_total_donated' IS NOT NULL;
        `;
        const res = await client.query(syncSql);
        console.log(`Synced ${res.rowCount} characters.`);

    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        await client.end();
    }
}

run();
