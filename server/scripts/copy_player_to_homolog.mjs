import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://rozwhqxbpsxlxbkfzvce.supabase.co";
const PROD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I";

const HOMOLOG_URL = "https://pogfjnuzytzqdeuzefyv.supabase.co";
const HOMOLOG_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZ2ZqbnV6eXR6cWRldXplZnl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU3Mzc1MCwiZXhwIjoyMDg3MTQ5NzUwfQ.AUwzeR7GDPhCjqo15C93yXXMmKbDW1KKBhvnUK_lncs";

const prodClient = createClient(PROD_URL, PROD_KEY);
const homologClient = createClient(HOMOLOG_URL, HOMOLOG_KEY);

async function copyPlayer(characterName) {
    if (!characterName) {
        console.error("Please provide a character name. Usage: node copy_player_to_homolog.mjs <CharacterName>");
        process.exit(1);
    }

    console.log(`\n🔍 Searching for character '${characterName}' in Production...`);

    // 1. Get Character Data from Prod
    const { data: charData, error: charErr } = await prodClient
        .from('characters')
        .select('*')
        .ilike('name', characterName)
        .single();

    if (charErr || !charData) {
        console.error(`❌ Could not find character '${characterName}' in Production.`, charErr?.message);
        process.exit(1);
    }

    const prodUserId = charData.user_id;
    console.log(`✅ Character found! User ID: ${prodUserId}`);

    // 2. Fetch User Auth Data from Prod
    console.log("🔍 Fetching Auth Data from Production...");
    const { data: authData, error: authErr } = await prodClient.auth.admin.getUserById(prodUserId);

    if (authErr || !authData.user) {
        console.error("❌ Could not fetch auth user from Production.", authErr?.message);
        process.exit(1);
    }

    const userEmail = authData.user.email;
    console.log(`✅ Auth User found! Email: ${userEmail}`);

    // 3. Create or Find User in Homolog
    console.log("🛠️ Checking if user exists in Homologation...");

    // Try to find if user already exists in Homolog auth
    let homUserId;
    const { data: homUsers, error: listErr } = await homologClient.auth.admin.listUsers();
    const existingHomUser = homUsers?.users?.find(u => u.email === userEmail);

    if (existingHomUser) {
        console.log(`⚠️ User already exists in Homologation Auth. Reusing ID: ${existingHomUser.id}`);
        homUserId = existingHomUser.id;
    } else {
        console.log(`➕ Creating new Auth User in Homologation for ${userEmail}...`);
        const { data: newUser, error: createErr } = await homologClient.auth.admin.createUser({
            email: userEmail,
            email_confirm: true,
            password: 'password123' // Dummy password for homologation
        });

        if (createErr) {
            console.error("❌ Failed to create user in Homologation.", createErr.message);
            process.exit(1);
        }

        homUserId = newUser.user.id;
        console.log(`✅ User created! New Homolog ID: ${homUserId} (Password: password123)`);
    }

    // 4. Check if Character already exists in Homolog
    // If it exists, we might want to delete it or update it. Let's delete to ensure clean copy.
    const { data: existingChar } = await homologClient.from('characters').select('id').eq('user_id', homUserId).single();
    if (existingChar) {
        console.log(`⚠️ Cleaning up existing character data in Homologation for this user...`);
        await homologClient.from('characters').delete().eq('user_id', homUserId);
    }

    // 5. Insert Character Data into Homolog
    console.log("📦 Copying Character Data to Homologation...");

    // Create payload, swap old UUIDs for new ones if necessary
    const newCharData = {
        ...charData,
        user_id: homUserId,
        id: homUserId // Often character ID is the same as user ID in typical 1:1 setups, but let's keep it safe. If your characters table uses a different UUID logic, adjust here.
    };

    // Note: If character 'id' constraint requires it to match 'user_id', we set them equal.
    // In many Supabase setups, character.id == user_id. Let's assume this is true or they are both UUIDs.
    // If they can be different, you can let Supabase generate a new character id, but user_id MUST be the new homUserId.
    if (charData.id === prodUserId) {
        newCharData.id = homUserId;
    } else {
        // Keep the original character ID? Might cause conflicts if importing multiple. Keeping it same as Prod is usually fine unless it violates a unique constraint not attached to user.
        newCharData.id = charData.id;
    }

    // Ensure we don't copy over timestamps that might be missing in homolog
    // The previous check showed 'updated_at' is missing in Prod, but if it exists in Homolog, it will default to NOW().

    const { error: insertErr } = await homologClient.from('characters').insert([newCharData]);

    if (insertErr) {
        console.error("❌ Failed to insert character data into Homologation.", insertErr.message);
        process.exit(1);
    }

    console.log("\n🎉 SUCCESS! Player copied successfully.");
    console.log(`   - Email: ${userEmail}`);
    console.log(`   - Password: password123`);
    console.log(`   - Character Name: ${characterName}`);
}

const argName = process.argv[2];
copyPlayer(argName);
