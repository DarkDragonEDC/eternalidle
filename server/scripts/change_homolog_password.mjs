import { createClient } from '@supabase/supabase-js';

const HOMOLOG_URL = "https://pogfjnuzytzqdeuzefyv.supabase.co";
const HOMOLOG_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZ2ZqbnV6eXR6cWRldXplZnl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU3Mzc1MCwiZXhwIjoyMDg3MTQ5NzUwfQ.AUwzeR7GDPhCjqo15C93yXXMmKbDW1KKBhvnUK_lncs";

const homologClient = createClient(HOMOLOG_URL, HOMOLOG_KEY);

async function changePassword(characterName, newPassword) {
    console.log(`Searching for '${characterName}' in Homologation...`);

    // Find character
    const { data: charData, error: charErr } = await homologClient
        .from('characters')
        .select('user_id')
        .ilike('name', characterName)
        .single();

    if (charErr || !charData) {
        console.error(`Could not find character '${characterName}' in Homologation.`, charErr?.message || '');
        process.exit(1);
    }

    const userId = charData.user_id;
    console.log(`Character found! User ID: ${userId}`);

    // Update password
    console.log(`Updating password...`);
    const { data: updateData, error: updateErr } = await homologClient.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    );

    if (updateErr) {
        console.error(`Failed to update password for user ${userId}.`, updateErr.message);
        process.exit(1);
    }

    console.log(`Successfully updated password for ${characterName} to: ${newPassword}`);
}

changePassword('EternoDev', 'armario123');
