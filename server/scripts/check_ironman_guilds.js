import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const connectionString = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function check() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        const query = `
            SELECT c.name as character_name, g.name as guild_name
            FROM guild_members gm
            JOIN guilds g ON gm.guild_id = g.id
            JOIN characters c ON gm.character_id = c.id
            WHERE (g.is_ironman = false OR g.is_ironman IS NULL)
              AND (c.state->>'isIronman')::boolean = true;
        `;
        
        const res = await client.query(query);
        const output = res.rows.map(row => `${row.character_name} - ${row.guild_name}`).join('\n');
        
        fs.writeFileSync('check_results.txt', output || "NONE");
        console.log(`Check complete. Saved ${res.rows.length} results.`);

    } catch (err) {
        console.error("Check Error:", err);
    } finally {
        await client.end();
    }
}

check();
