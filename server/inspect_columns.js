
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumns() {
    const { data: chars, error } = await supabase
        .from('characters')
        .select('*')
        .limit(1);

    if (error) { console.error(error); return; }

    const char = chars[0];
    console.log(`--- COLUMN INSPECT: ${char.name} ---`);
    console.log('Skills Column:', char.skills ? JSON.stringify(char.skills).substring(0, 50) + '...' : 'NULL');
    console.log('Inventory Column:', char.inventory ? 'Present' : 'NULL');
    console.log('Equipment Column:', char.equipment ? 'Present' : 'NULL');
    console.log('Info Column:', char.info ? JSON.stringify(char.info) : 'NULL');
    console.log('State Column Keys:', char.state ? Object.keys(char.state) : 'NULL');
}

inspectColumns();
