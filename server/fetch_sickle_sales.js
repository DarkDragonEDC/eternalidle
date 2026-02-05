
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function findSales() {
    // console.log("Searching for character sales/purchases of 'Sickle'...");

    const { data: chars, error } = await supabase
        .from('characters')
        .select('id, name, state');

    if (error) {
        console.error("Error fetching characters:", error);
        return;
    }

    const transactions = [];

    for (const char of chars) {
        const state = char.state || {};
        const notifications = state.notifications || [];
        const claims = state.claims || [];

        notifications.forEach(n => {
            const msg = n.message ? n.message.toLowerCase() : '';
            if ((msg.includes('sickle') || msg.includes('5 silver')) && (msg.includes('sold') || msg.includes('bought'))) {
                transactions.push({
                    charName: char.name,
                    type: 'NOTIFICATION',
                    message: n.message,
                    timestamp: n.timestamp || 0
                });
            }
        });

        claims.forEach(c => {
            if (c.itemId && c.itemId.toLowerCase().includes('sickle')) {
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

    transactions.sort((a, b) => a.timestamp - b.timestamp);

    transactions.forEach(t => {
        const date = new Date(t.timestamp).toLocaleString();
        if (t.type === 'NOTIFICATION') {
            console.log(`[${date}] NOTIF: ${t.charName} -> "${t.message}"`);
        } else if (t.claimType === 'SOLD_ITEM') {
            console.log(`[${date}] TRANS: VENDEDOR=${t.charName} | Item=${t.itemId} | Qtd=${t.amount} | Preço=${t.silver}`);
        } else if (t.claimType === 'BOUGHT_ITEM') {
            console.log(`[${date}] TRANS: COMPRADOR=${t.charName} | Item=${t.itemId} | Qtd=${t.amount} | Preço=${t.cost}`);
        }
    });

    // Write to JSON file for easier parsing
    import('fs').then(fs => {
        fs.writeFileSync('sickle_transactions.json', JSON.stringify(transactions, null, 2));
        console.log("Data written to sickle_transactions.json");
    });
}

findSales();
