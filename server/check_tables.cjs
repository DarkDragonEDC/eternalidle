
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { data: plural, error: errorPlural } = await supabase.from('trade_sessions').select('id').limit(1);
    const { data: singular, error: errorSingular } = await supabase.from('trade_session').select('id').limit(1);

    console.log("Table 'trade_sessions' exists?", !errorPlural);
    console.log("Table 'trade_session' exists?", !errorSingular);

    if (errorPlural) console.log("Plural error:", errorPlural.message);
    if (errorSingular) console.log("Singular error:", errorSingular.message);

    if (!errorPlural) {
        const { data: pluralData } = await supabase.from('trade_sessions').select('*').limit(1);
        if (pluralData && pluralData[0]) console.log("Plural Columns:", Object.keys(pluralData[0]));
    }
}

check();
