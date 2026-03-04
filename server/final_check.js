
const { createClient } = await import('@supabase/supabase-js');
const dotenv = await import('dotenv');
const path = await import('path');
const fs = await import('fs');

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase.from('trade_sessions').select('*').order('created_at', { ascending: false }).limit(5);

if (error) {
    console.log("ERROR:", error.message);
} else {
    data.forEach(row => {
        console.log(`Trade ${row.id}: sender_name=${row.sender_name}, receiver_name=${row.receiver_name}, status=${row.status}`);
    });
}
