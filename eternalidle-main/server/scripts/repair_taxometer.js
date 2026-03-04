import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function repair() {
    console.log('--- REPAIRING GLOBAL TAXOMETER ---');

    try {
        // 1. Calculate Market Taxes
        console.log('Calculating Market historical taxes...');
        const { data: marketData, error: marketError } = await supabase
            .from('market_history')
            .select('tax_paid');

        if (marketError) throw marketError;
        const marketTotal = marketData.reduce((acc, row) => acc + (Number(row.tax_paid) || 0), 0);
        console.log(`> Market Total: ${marketTotal.toLocaleString()} Silver`);

        // 2. Calculate Trade Taxes
        console.log('Calculating Trade historical taxes...');
        const { data: tradeData, error: tradeError } = await supabase
            .from('trade_history')
            .select('sender_tax, receiver_tax');

        if (tradeError) throw tradeError;
        const tradeTotal = tradeData.reduce((acc, row) => acc + (Number(row.sender_tax) || 0) + (Number(row.receiver_tax) || 0), 0);
        console.log(`> Trade Total: ${tradeTotal.toLocaleString()} Silver`);

        const grandTotal = marketTotal + tradeTotal;
        console.log(`> GRAND TOTAL: ${grandTotal.toLocaleString()} Silver`);

        // 3. Upsert Global Record
        console.log('Checking global_stats table...');
        const { data: current, error: fetchError } = await supabase
            .from('global_stats')
            .select('*')
            .eq('id', 'global')
            .maybeSingle();

        const now = new Date().toISOString();
        const payload = {
            id: 'global',
            total_market_tax: grandTotal,
            market_tax_total: marketTotal,
            trade_tax_total: tradeTotal,
            updated_at: now
        };

        if (!current) {
            console.log('Global record missing. Creating...');
            payload.tax_24h_ago = grandTotal; // Set baseline to current so growth starts from 0 today
            payload.last_snapshot_at = now;
            payload.history = [];

            const { error: insertError } = await supabase
                .from('global_stats')
                .insert(payload);

            if (insertError) throw insertError;
            console.log('Successfully created record!');
        } else {
            console.log('Global record exists. Updating totals...');
            // We preserve tax_24h_ago and history unless they are zero
            if ((Number(current.tax_24h_ago) || 0) === 0) {
                payload.tax_24h_ago = grandTotal;
            }

            const { error: updateError } = await supabase
                .from('global_stats')
                .update(payload)
                .eq('id', 'global');

            if (updateError) throw updateError;
            console.log('Successfully updated record!');
        }

        console.log('--- REPAIR COMPLETE ---');
    } catch (err) {
        console.error('CRITICAL ERROR:', err.message);
        process.exit(1);
    }
}

repair();
