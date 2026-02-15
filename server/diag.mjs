
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase.from('trade_sessions').select('*').order('created_at', { ascending: false }).limit(1);
if (error) {
    console.log("ERROR:", error.message);
} else {
    console.log("DATA:", JSON.stringify(data, null, 2));
}
