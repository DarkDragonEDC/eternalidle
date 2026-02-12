import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function removeIdentity() {
    const identityId = '109934178055755679936';
    const userId = '5093ffaa-4770-4123-a83b-fca97a30601b';

    console.log(`[DELETE] Attempting to remove identity using expanded path...`);

    // Try multiple possible endpoints
    const endpoints = [
        `${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}/identities/${identityId}`,
        `${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}/identities/google/${identityId}`
    ];

    for (const url of endpoints) {
        console.log(`- Trying: ${url}`);
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'apikey': process.env.SUPABASE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log(`[DELETE] Success with ${url}`);
            process.exit(0);
        } else {
            const text = await response.text();
            console.warn(`- Failed (${response.status}): ${text}`);
        }
    }

    console.error('[DELETE] All endpoints failed.');
    process.exit(1);
}

removeIdentity();
