import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres:Bertolino%403985@db.cxwivaxqmuzsahydekmv.supabase.co:5432/postgres";

async function getTotal() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM global_altar WHERE id = 'global'");
        console.log("Global Altar Data:", res.rows[0]);
    } catch (e) {
        console.error("Fetch Error:", e.message);
    } finally {
        await client.end();
    }
}

getTotal();
