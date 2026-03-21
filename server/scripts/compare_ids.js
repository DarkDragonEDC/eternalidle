import pg from 'pg';
const { Client } = pg;

const OLD_DB = "postgresql://postgres:Bertolino%403985@db.cxwivaxqmuzsahydekmv.supabase.co:5432/postgres";
const NEW_DB = "postgresql://postgres:Bertolino%403985@db.rozwhqxbpsxlxbkfzvce.supabase.co:5432/postgres";

async function compare() {
    const oldClient = new Client({ connectionString: OLD_DB });
    const newClient = new Client({ connectionString: NEW_DB });

    try {
        await oldClient.connect();
        const oldChars = (await oldClient.query("SELECT id, name FROM characters")).rows;
        await oldClient.end();

        await newClient.connect();
        const newChars = (await newClient.query("SELECT id, name FROM characters")).rows;
        await newClient.end();

        console.log(`Old: ${oldChars.length}, New: ${newChars.length}`);
        
        const darkDragonOld = oldChars.find(c => c.name === 'DarkDragon');
        const darkDragonNew = newChars.find(c => c.name === 'DarkDragon');

        console.log("DarkDragon Old ID:", darkDragonOld?.id);
        console.log("DarkDragon New ID:", darkDragonNew?.id);

    } catch (e) {
        console.error(e);
    }
}

compare();
