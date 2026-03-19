import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjI0MTAsImV4cCI6MjA4NTI5ODQxMH0.rpoz6t0zPNC3jsGWuxE_YXfifBa2gKkcp27naXjlazE';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Ijk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

// Using Service Key for schema inspection
const supabase = createClient(PROD_URL, PROD_SERVICE_KEY);

async function inspectSchema() {
    console.log('Inspecting Production Schema...');
    
    // Check if table exists by trying a select
    const { data, error } = await supabase
        .from('pending_rewards')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error querying pending_rewards:', error.message);
    } else if (!data) {
        console.log('Table pending_rewards NOT found in production.');
    } else {
        console.log('Successfully found pending_rewards table!');
        if (data.length > 0) {
            console.log('Columns detected:', Object.keys(data[0]));
        } else {
            console.log('Table exists but is empty.');
        }
    }
}

inspectSchema();
