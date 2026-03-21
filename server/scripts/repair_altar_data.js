import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function repair() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to NEW Supabase for REPAIR...");

        // 1. Sync character ranking columns from state
        console.log("Syncing ranking_altar_donated from state for all characters...");
        const syncRes = await client.query(`
            UPDATE characters 
            SET ranking_altar_donated = COALESCE((state->>'altar_total_donated')::bigint, 0)
            WHERE state->>'altar_total_donated' IS NOT NULL;
        `);
        console.log(`Updated ${syncRes.rowCount} characters' ranking data.`);

        // 2. Restore Global Progress (Set to 9,999,000 as requested/inferred)
        console.log("Restoring Global Altar Progress to 9,999,000...");
        await client.query(`
            INSERT INTO global_altar (id, target_date, total_silver)
            VALUES ('global', CURRENT_DATE, 9999000)
            ON CONFLICT (id) DO UPDATE SET total_silver = 9999000;
        `);
        console.log("Global Altar RESTORED to 9.99M!");

        // 3. Verify DarkDragon
        const dd = await client.query("SELECT name, ranking_altar_donated FROM characters WHERE name = 'DarkDragon'");
        console.log("DarkDragon Status:", dd.rows[0]);

    } catch (err) {
        console.error("Repair Error:", err);
    } finally {
        await client.end();
    }
}

repair();
