
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function backfill() {
    console.log("Starting backfill for trade_sessions names...");

    // 1. Get all trades with missing names
    const { data: trades, error: tradesError } = await supabase
        .from('trade_sessions')
        .select('id, sender_id, receiver_id')
        .or('sender_name.is.null,receiver_name.is.null');

    if (tradesError) {
        console.error("Error fetching trades:", tradesError.message);
        return;
    }

    if (!trades || trades.length === 0) {
        console.log("No trades found with missing names.");
        return;
    }

    console.log(`Found ${trades.length} trades to update.`);

    // 2. Collect unique character IDs to fetch
    const charIds = new Set();
    trades.forEach(t => {
        if (t.sender_id) charIds.add(t.sender_id);
        if (t.receiver_id) charIds.add(t.receiver_id);
    });

    console.log(`Fetching names for ${charIds.size} unique characters...`);

    const { data: chars, error: charsError } = await supabase
        .from('characters')
        .select('id, name')
        .in('id', Array.from(charIds));

    if (charsError) {
        console.error("Error fetching characters:", charsError.message);
        return;
    }

    const nameMap = {};
    chars.forEach(c => {
        nameMap[c.id] = c.name;
    });

    // 3. Update each trade
    let updatedCount = 0;
    for (const trade of trades) {
        const sName = nameMap[trade.sender_id] || 'Deleted Character';
        const rName = nameMap[trade.receiver_id] || 'Deleted Character';

        console.log(`Updating Trade ${trade.id}: ${sName} -> ${rName}`);

        const { error: updateError } = await supabase
            .from('trade_sessions')
            .update({
                sender_name: sName,
                receiver_name: rName
            })
            .eq('id', trade.id);

        if (updateError) {
            console.error(`Failed to update trade ${trade.id}:`, updateError.message);
        } else {
            updatedCount++;
        }
    }

    console.log(`Backfill complete. Updated ${updatedCount}/${trades.length} trades.`);
}

backfill();
