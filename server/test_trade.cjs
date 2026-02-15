
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testCreate() {
    console.log("Testing Trade Creation...");

    // Get two characters
    const { data: chars } = await supabase.from('characters').select('id, name').limit(2);
    if (!chars || chars.length < 2) {
        console.error("Not enough characters to test.");
        return;
    }

    const sender = chars[0];
    const receiver = chars[1];

    console.log(`Simulating trade from ${sender.name} to ${receiver.name}`);

    const { data, error } = await supabase
        .from('trade_sessions')
        .insert({
            sender_id: sender.id,
            receiver_id: receiver.id,
            sender_name: sender.name,
            receiver_name: receiver.name,
            status: 'PENDING'
        })
        .select()
        .single();

    if (error) {
        console.error("Insert failed:", error.message);
    } else {
        console.log("Trade created successfully with names!");
        console.log("Data in DB:", JSON.stringify(data, null, 2));

        // Cleanup
        await supabase.from('trade_sessions').delete().eq('id', data.id);
        console.log("Test trade cleaned up.");
    }
}

testCreate();
