import pg from 'pg';
const { Client } = pg;

const OLD_DB = "postgresql://postgres:Bertolino%403985@db.cxwivaxqmuzsahydekmv.supabase.co:5432/postgres";
const NEW_DB = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function fullSync() {
    const oldClient = new Client({ connectionString: OLD_DB });
    const newClient = new Client({ connectionString: NEW_DB });

    try {
        await oldClient.connect();
        console.log("Connected to OLD Supabase...");

        const globalRes = await oldClient.query("SELECT * FROM global_altar WHERE id = 'global'");
        const globalTotal = globalRes.rows[0]?.total_silver || 0;
        console.log(`Old Global Total: ${globalTotal}`);

        const charRes = await oldClient.query("SELECT name, (state->>'altar_total_donated')::bigint as donated FROM characters WHERE state->>'altar_total_donated' IS NOT NULL");
        const donations = charRes.rows;
        console.log(`Found ${donations.length} characters with donations in old DB.`);
        await oldClient.end();

        await newClient.connect();
        console.log("Connected to NEW Supabase...");

        await newClient.query(`
            INSERT INTO global_altar (id, target_date, total_silver)
            VALUES ('global', CURRENT_DATE, ${globalTotal})
            ON CONFLICT (id) DO UPDATE SET total_silver = ${globalTotal};
        `);
        console.log("Global Total Updated to " + globalTotal);

        let updatedCount = 0;
        for (const d of donations) {
            console.log(`Syncing ${d.name} (${d.donated})...`);
            const res = await newClient.query(`
                UPDATE characters 
                SET ranking_altar_donated = ${d.donated},
                    state = state || jsonb_build_object('altar_total_donated', ${d.donated})
                WHERE name = '${d.name}';
            `);
            if (res.rowCount > 0) updatedCount++;
        }
        console.log(`Successfully migrated ${updatedCount} characters.`);

    } catch (err) {
        console.error("Full Sync Error:", err);
    } finally {
        try { await newClient.end(); } catch(e) {}
    }
}

fullSync();
