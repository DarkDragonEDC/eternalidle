
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const targetItem = process.argv[2];

if (!targetItem) {
    console.log("Usage: node fetch_item_sales.js \"Item Name\"");
    console.log("Example: node fetch_item_sales.js \"Sickle\"");
    process.exit(1);
}

console.log(`Searching for transactions involving: '${targetItem}'...`);

async function findSales() {
    const { data: chars, error } = await supabase
        .from('characters')
        .select('id, name, state');

    if (error) {
        console.error("Error fetching characters:", error);
        return;
    }

    const transactions = [];
    const searchLayout = targetItem.toLowerCase();

    for (const char of chars) {
        const state = char.state || {};
        const notifications = state.notifications || [];
        const claims = state.claims || [];

        // Check notifications
        notifications.forEach(n => {
            const msg = n.message ? n.message.toLowerCase() : '';
            if (msg.includes(searchLayout) && (msg.includes('sold') || msg.includes('bought'))) {
                transactions.push({
                    charName: char.name,
                    type: 'NOTIFICATION',
                    message: n.message,
                    timestamp: n.timestamp || 0
                });
            }
        });

        // Check claims (completed market transactions)
        claims.forEach(c => {
            if (c.itemId && c.itemId.toLowerCase().includes(searchLayout)) {
                transactions.push({
                    charName: char.name,
                    type: 'CLAIM',
                    claimType: c.type,
                    itemId: c.itemId,
                    amount: c.amount,
                    timestamp: c.timestamp || 0,
                    cost: c.cost,
                    silver: c.silver
                });
            }
        });
    }

    // Sort by date
    transactions.sort((a, b) => a.timestamp - b.timestamp);

    // Output to console in a readable format
    console.log(`\n--- Found ${transactions.length} transactions for '${targetItem}' ---\n`);

    transactions.forEach(t => {
        const date = new Date(t.timestamp).toLocaleString();
        if (t.type === 'NOTIFICATION') {
            console.log(`[${date}] ${t.charName}: ${t.message}`);
        } else if (t.claimType === 'SOLD_ITEM') {
            console.log(`[${date}] ${t.charName} SOLD ${t.amount}x ${t.itemId} for ${t.silver} silver`);
        } else if (t.claimType === 'BOUGHT_ITEM') {
            console.log(`[${date}] ${t.charName} BOUGHT ${t.amount}x ${t.itemId} for ${t.cost} silver`);
        }
    });

    // Also save to JSON
    const filename = `sales_${targetItem.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    fs.writeFileSync(filename, JSON.stringify(transactions, null, 2));
    console.log(`\nFull data saved to: ${filename}`);
}

findSales();
