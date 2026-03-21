import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const connectionString = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function restoreGlobal() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to NEW Supabase...");

        // 1. Calculate sum from characters
        console.log("Calculating total silver from all characters...");
        const sumResult = await client.query("SELECT SUM(ranking_altar_donated) as total FROM characters");
        const total = Number(sumResult.rows[0].total) || 0;
        console.log(`Computed total: ${total} silver.`);

        // 2. Update global_altar
        console.log("Updating global_altar with computed total...");
        const updateSql = `
            INSERT INTO global_altar (id, target_date, total_silver)
            VALUES ('global', CURRENT_DATE, ${total})
            ON CONFLICT (id) DO UPDATE SET total_silver = EXCLUDED.total_silver;
        `;
        await client.query(updateSql);
        console.log("Global Altar RESTORED!");

    } catch (err) {
        console.error("Restoration Error:", err);
    } finally {
        await client.end();
    }
}

restoreGlobal();
