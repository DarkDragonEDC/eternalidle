import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://cxwivaxqmuzsahydekmv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4d2l2YXhxbXV6c2FoeWRla212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAyNDUwMSwiZXhwIjoyMDg4NjAwNTAxfQ.yWIbpoDQEwOYrlnGJO7fweTodnT87D2b6otrm6W7C7o";
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimulation() {
    const guildName = "adms test";
    console.log(`Starting simulation for guild: ${guildName}`);
    
    // 1. Fetch current roles
    const { data: guild, error: fetchError } = await supabase
        .from('guilds')
        .select('id, roles')
        .eq('name', guildName)
        .single();
    
    if (fetchError || !guild) {
        console.error("Guild not found:", fetchError);
        return;
    }

    console.log("Current roles keys:", Object.keys(guild.roles));

    // 2. Mock the client-side reorder: swap MEMBER and OFFICER
    // Current order from inspect_guild: LEADER(0), OFFICER(1), MEMBER(2)
    // We want: LEADER(0), MEMBER(1), OFFICER(2)
    const newRolesObject = JSON.parse(JSON.stringify(guild.roles));
    
    if (newRolesObject["MEMBER"] && newRolesObject["OFFICER"]) {
        newRolesObject["MEMBER"].order = 1;
        newRolesObject["OFFICER"].order = 2;
    }

    console.log("Saving new roles object (swapped MEMBER and OFFICER):");
    console.log(JSON.stringify(newRolesObject, null, 2));

    // 3. Perform update (simulating GuildManager.reorderGuildRoles)
    const { error: updateError } = await supabase
        .from('guilds')
        .update({ roles: newRolesObject })
        .eq('id', guild.id);

    if (updateError) {
        console.error("Update failed:", updateError);
    } else {
        console.log("Update successful!");
    }

    // 4. Verify result
    const { data: verifiedGuild } = await supabase
        .from('guilds')
        .select('roles')
        .eq('id', guild.id)
        .single();
    
    console.log("Verified Roles in DB:", JSON.stringify(verifiedGuild.roles).substring(0, 200));
    console.log("Is array?", Array.isArray(verifiedGuild.roles));
    
    process.exit(0);
}

runSimulation();
