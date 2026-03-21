import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres:Bertolino%403985@db.cxwivaxqmuzsahydekmv.supabase.co:5432/postgres";

async function listTables() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log("Tables in Old DB:", res.rows.map(r => r.tablename));
    } catch (e) {
        console.error("List Error:", e.message);
    } finally {
        await client.end();
    }
}

listTables();
