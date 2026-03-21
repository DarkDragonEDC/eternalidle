import pg from 'pg';
const { Client } = pg;

const OLD_DB = "postgresql://postgres:Bertolino%403985@db.cxwivaxqmuzsahydekmv.supabase.co:5432/postgres";
const NEW_DB = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function check() {
    const oldClient = new Client({ connectionString: OLD_DB });
    const newClient = new Client({ connectionString: NEW_DB });

    await oldClient.connect();
    const oldRes = await oldClient.query("SELECT name, LENGTH(name) as len FROM characters WHERE state->>'altar_total_donated' IS NOT NULL");
    console.log("Old DB Names:", oldRes.rows);
    await oldClient.end();

    await newClient.connect();
    const newRes = await newClient.query("SELECT name, LENGTH(name) as len FROM characters WHERE name ILIKE 'DarkDragon%' OR name ILIKE 'htgrefwd%' OR name ILIKE 'Pearl%' OR name ILIKE 'Autumn Rose%'");
    console.log("New DB Names:", newRes.rows);
    await newClient.end();
}

check();
