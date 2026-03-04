
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'combat_history' });

    if (error) {
        console.log('RPC failed, using information_schema...');
        const { data: schemaData, error: schemaError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'combat_history');

        if (schemaError) {
            console.error(schemaError);
            return;
        }
        console.log('Columns for combat_history:', schemaData);
    } else {
        console.log('Columns (RPC):', data);
    }
}

check();
