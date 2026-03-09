import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const detailedSchema = JSON.parse(fs.readFileSync('production_full_schema_detailed.json', 'utf8'));

const connectionString = "postgresql://postgres:Bertolino%403985@db.cxwivaxqmuzsahydekmv.supabase.co:5432/postgres";

async function compareSchemas() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        const results = {};
        for (const [tableName, expectedCols] of Object.entries(detailedSchema.tables)) {
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = '${tableName}';
            `);
            
            const actualCols = res.rows.map(r => r.column_name);
            const expectedColNames = expectedCols.map(c => c.column_name);
            
            const missing = expectedColNames.filter(c => !actualCols.includes(c));
            const extra = actualCols.filter(c => !expectedColNames.includes(c));
            
            if (missing.length > 0 || extra.length > 0) {
                results[tableName] = { missing, extra };
            }
        }
        
        fs.writeFileSync('comparison_results.json', JSON.stringify(results, null, 2));
        console.log("Comparison results saved to comparison_results.json");

    } catch (err) {
        fs.writeFileSync('comparison_error.txt', err.stack);
        console.error(err);
    } finally {
        await client.end();
    }
}

compareSchemas();
