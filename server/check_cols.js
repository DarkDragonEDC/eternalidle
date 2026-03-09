import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres:Bertolino%403985@db.cxwivaxqmuzsahydekmv.supabase.co:5432/postgres";

async function checkCols() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'world_boss_attempts';
        `);
        console.log("Columns in world_boss_attempts:");
        res.rows.forEach(r => console.log(`- ${r.column_name}`));
    } finally {
        await client.end();
    }
}

checkCols();
