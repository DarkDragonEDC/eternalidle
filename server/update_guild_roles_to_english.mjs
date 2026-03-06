import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente do server
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateGuildRoles() {
    console.log('Fetching all guilds...');
    const { data: guilds, error } = await supabase
        .from('guilds')
        .select('id, name, roles');

    if (error) {
        console.error('Error fetching guilds:', error);
        return;
    }

    console.log(`Found ${guilds.length} guilds. Checking for old portuguese role names...`);
    let updatedCount = 0;

    for (const guild of guilds) {
        if (!guild.roles) continue;

        let needsUpdate = false;
        const newRoles = { ...guild.roles };

        if (newRoles.LEADER && newRoles.LEADER.name === 'Líder') {
            newRoles.LEADER.name = 'Leader';
            needsUpdate = true;
        }

        if (newRoles.OFFICER && newRoles.OFFICER.name === 'Vice-líder') {
            newRoles.OFFICER.name = 'Co-Leader';
            needsUpdate = true;
        }

        if (newRoles.MEMBER && newRoles.MEMBER.name === 'Membro') {
            newRoles.MEMBER.name = 'Member';
            needsUpdate = true;
        }

        if (needsUpdate) {
            console.log(`Updating guild: ${guild.name} (${guild.id})`);
            const { error: updateError } = await supabase
                .from('guilds')
                .update({ roles: newRoles })
                .eq('id', guild.id);

            if (updateError) {
                console.error(`Failed to update ${guild.name}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`\nMigration complete. Updated ${updatedCount} guilds.`);
}

migrateGuildRoles().catch(console.error);
