import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://cxwivaxqmuzsahydekmv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4d2l2YXhxbXV6c2FoeWRla212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAyNDUwMSwiZXhwIjoyMDg4NjAwNTAxfQ.yWIbpoDQEwOYrlnGJO7fweTodnT87D2b6otrm6W7C7o";

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectGuild() {
  const { data: guild, error } = await supabase
    .from('guilds')
    .select('*')
    .eq('name', 'adms test')
    .single();

  if (error) {
    console.error("Error fetching guild:", error);
    return;
  }

  console.log("GUILD_ROLES_START");
  console.log(JSON.stringify(guild.roles, null, 2));
  console.log("GUILD_ROLES_END");
}

inspectGuild();
