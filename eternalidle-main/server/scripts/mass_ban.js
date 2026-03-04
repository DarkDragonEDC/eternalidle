import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Erro: Credenciais do Supabase não encontradas no .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const targetNames = [
    "Chefalt", "DarkAlt", "DarkDragon", "Guthiix", "Guthiix2", "MasterChef", "Nsei", "Potmaker",
    "MAGE", "WARRIOR",
    "Tyrell", "Tyrell.",
    "Cllvkvkvkvck", "Djdjsjdjdjd", "nigger",
    "Anders", "Elandal",
    "dayrr", "Jfivivib",
    "Haring David", "Hhhh",
    "Gennyson Marinho", "Jovi", "JoviX", "Jovizeira",
    "jo31", "jp31",
    "Eert", "Ethanol",
    "Soth", "SothDK",
    "Drake", "Hildor",
    "Demovi", "dsgfghhjk",
    "Shemsii", "Shemsun"
];

async function runBans() {
    console.log(`Starting mass ban for ${targetNames.length} characters...`);

    const { data: characters, error: charError } = await supabase
        .from('characters')
        .select('name, user_id')
        .in('name', targetNames);

    if (charError) {
        console.error("Error fetching characters:", charError);
        process.exit(1);
    }

    console.log(`Found ${characters.length} matching characters in DB out of ${targetNames.length} requested.`);

    const notFound = targetNames.filter(name => !characters.find(c => c.name.toLowerCase() === name.toLowerCase()));
    if (notFound.length > 0) {
        console.log(`Warning: The following characters were NOT found: ${notFound.join(', ')}`);
    }

    let successCount = 0;

    // Some characters might belong to the same user_id, so let's get unique user_ids
    const uniqueUserIds = [...new Set(characters.map(c => c.user_id))];
    console.log(`Mapping to ${uniqueUserIds.length} unique accounts (user_ids).`);

    for (const userId of uniqueUserIds) {
        // Collect all character names for this user for logging
        const charsForUser = characters.filter(c => c.user_id === userId).map(c => c.name).join(', ');

        const { error: upsertError } = await supabase
            .from('user_bans')
            .upsert({
                user_id: userId,
                ban_level: 1, // Warning
                reason: 'Multiple accounts',
                banned_until: null,
                updated_at: new Date().toISOString()
            });

        if (upsertError) {
            console.error(`Failed to ban accounts for: ${charsForUser} (UserId: ${userId}) - ${upsertError.message}`);
        } else {
            successCount++;
            console.log(`SUCCESS: Banned Account ID ${userId} (Characters: ${charsForUser})`);
        }
    }

    console.log(`Finished processing. Successfully applied ${successCount} bans.`);
    process.exit(0);
}

runBans();
