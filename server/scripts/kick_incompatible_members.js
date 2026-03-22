import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const connectionString = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function kick() {
    const client = new Client({ connectionString });
    let log = "";
    try {
        await client.connect();
        log += "Connected to Supabase\n";

        const names = ['SeiseIron', "DIABLO'"];
        
        for (const name of names) {
            log += `Processing ${name}...\n`;
            
            const charRes = await client.query("SELECT id, state FROM characters WHERE name = $1", [name]);
            if (charRes.rows.length === 0) {
                log += `Character ${name} not found in DB.\n`;
                continue;
            }
            
            const char = charRes.rows[0];
            const newState = { ...(char.state || {}) };
            delete newState.guild_id; // Remove guild reference from JSON state
            
            const delRes = await client.query("DELETE FROM guild_members WHERE character_id = $1", [char.id]);
            log += `Deleted from guild_members: ${delRes.rowCount} rows\n`;
            
            // Only update state. guild_tag is a virtual field in server.
            const upRes = await client.query(
                "UPDATE characters SET state = $1 WHERE id = $2",
                [JSON.stringify(newState), char.id]
            );
            log += `Updated character state: ${upRes.rowCount} rows\n`;
        }

    } catch (err) {
        log += `ERROR: ${err.message}\n`;
        console.error(err);
    } finally {
        await client.end();
        fs.writeFileSync('kick_log.txt', log);
    }
}

kick();
