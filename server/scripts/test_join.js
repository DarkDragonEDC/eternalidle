import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://cxwivaxqmuzsahydekmv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4d2l2YXhxbXV6c2FoeWRla212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAyNDUwMSwiZXhwIjoyMDg4NjAwNTAxfQ.yWIbpoDQEwOYrlnGJO7fweTodnT87D2b6otrm6W7C7o";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testJoin() {
  const { data: member, error } = await supabase
    .from('guild_members')
    .select('guild_id, role, guilds(roles)')
    .eq('guild_id', 'd98576bc-76b1-4bcb-a090-a67d015fc1b')
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching member:", error);
    return;
  }

  console.log("MEMBER_DATA_START");
  console.log(JSON.stringify(member, null, 2));
  console.log("MEMBER_DATA_END");
}

testJoin();
