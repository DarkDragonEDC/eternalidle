import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function findIdentities() {
    const searchTerms = ['idle.edc', 'euller.edc'];

    let page = 1;
    let found = false;

    console.log(`Searching for users with pagination...`);

    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 50
        });

        if (error) {
            console.error('Error listing users:', error);
            break;
        }

        if (!users || users.length === 0) break;

        console.log(`Checking page ${page} (${users.length} users)...`);

        const matches = users.filter(user => {
            const emailMatch = searchTerms.some(term => user.email?.toLowerCase().includes(term));
            const identityMatch = user.identities?.some(id =>
                searchTerms.some(term => id.identity_data?.email?.toLowerCase().includes(term))
            );
            return emailMatch || identityMatch;
        });

        if (matches.length > 0) {
            found = true;
            for (const user of matches) {
                console.log(`\nFound User ID: ${user.id}`);
                console.log(`Primary Email: ${user.email}`);

                // Fetch full user details to be sure about identities
                const { data: { user: fullUser }, error: fetchError } = await supabase.auth.admin.getUserById(user.id);

                if (fetchError) {
                    console.error(`- Error fetching full user ${user.id}:`, fetchError.message);
                    continue;
                }

                console.log('Identities:');
                if (fullUser.identities && fullUser.identities.length > 0) {
                    fullUser.identities.forEach(id => {
                        console.log(`- Type: ${id.provider}, Email: ${id.identity_data?.email}, IdentityID: ${id.id}`);
                    });
                } else {
                    console.log('- No identities found.');
                }
            }
        }

        if (users.length < 50) break;
        page++;
    }

    if (!found) {
        console.log('No matching users found in any page.');
    }

    process.exit(0);
}

findIdentities();
