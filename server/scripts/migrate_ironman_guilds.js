import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function migrate() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to Supabase for Ironman Guild Migration...");

        // 1. Identify and update guilds
        const query = `
            UPDATE guilds
            SET is_ironman = true
            FROM characters
            WHERE guilds.leader_id = characters.id
              AND (characters.state->>'isIronman')::boolean = true
              AND (guilds.is_ironman = false OR guilds.is_ironman IS NULL);
        `;
        
        const res = await client.query(query);
        console.log(`Updated ${res.rowCount} guilds to Ironman status based on leader status.`);

    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        await client.end();
    }
}

migrate();
