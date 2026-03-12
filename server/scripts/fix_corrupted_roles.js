import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://cxwivaxqmuzsahydekmv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4d2l2YXhxbXV6c2FoeWRla212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAyNDUwMSwiZXhwIjoyMDg4NjAwNTAxfQ.yWIbpoDQEwOYrlnGJO7fweTodnT87D2b6otrm6W7C7o";

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_ROLES = {
  "LEADER": {
    "name": "Leader",
    "color": "#d4af37",
    "order": 0,
    "permissions": ["edit_appearance", "manage_roles", "kick_members", "manage_requests", "change_member_roles", "manage_upgrades", "manage_guild"]
  },
  "OFFICER": {
    "name": "Co-Leader",
    "color": "#c0c0c0",
    "order": 1,
    "permissions": ["kick_members", "manage_requests", "manage_upgrades", "change_member_roles"]
  },
  "MEMBER": {
    "name": "Member",
    "color": "#808080",
    "order": 2,
    "permissions": []
  }
};

async function fixGuilds() {
  console.log("Fetching all guilds...");
  const { data: guilds, error } = await supabase.from('guilds').select('id, roles, name');

  if (error) {
    console.error("Error fetching guilds:", error);
    return;
  }

  console.log(`Analyzing ${guilds.length} guilds...`);

  for (const guild of guilds) {
    let roles = guild.roles;
    let needsUpdate = false;

    console.log(`[DEBUG] Guild: ${guild.name}, roles type: ${typeof roles}, isArray: ${Array.isArray(roles)}`);
    if (roles) console.log(`[DEBUG] roles keys/content: ${JSON.stringify(roles).substring(0, 100)}`);

    // If roles is an array, it's definitely corrupted
    if (Array.isArray(roles)) {
      console.log(`Guild "${guild.name}" (${guild.id}) has array roles. Fixing...`);
      const newRoles = { ...DEFAULT_ROLES };
      
      // Try to preserve any existing custom role IDs mentioned in the array
      roles.forEach((id, idx) => {
        if (typeof id === 'string' && !newRoles[id]) {
          newRoles[id] = {
            name: "Restored Role",
            color: "#ffffff",
            permissions: [],
            order: idx + 3
          };
        }
      });
      
      roles = newRoles;
      needsUpdate = true;
    } else if (roles && typeof roles === 'object') {
        // Even if it's an object, check if system roles have permissions (lost during corruption if re-added as empty)
        if (!roles.LEADER || !roles.LEADER.permissions || roles.LEADER.permissions.length === 0) {
             console.log(`Guild "${guild.name}" (${guild.id}) LEADER role missing permissions. Fixing...`);
             if(!roles.LEADER) roles.LEADER = { ...DEFAULT_ROLES.LEADER };
             roles.LEADER.permissions = [...DEFAULT_ROLES.LEADER.permissions];
             needsUpdate = true;
        }
        if (!roles.OFFICER || !roles.OFFICER.permissions || roles.OFFICER.permissions.length < 2) {
             console.log(`Guild "${guild.name}" (${guild.id}) OFFICER role missing permissions. Fixing...`);
             if(!roles.OFFICER) roles.OFFICER = { ...DEFAULT_ROLES.OFFICER };
             roles.OFFICER.permissions = [...DEFAULT_ROLES.OFFICER.permissions];
             needsUpdate = true;
        }
    } else if (!roles) {
        console.log(`Guild "${guild.name}" (${guild.id}) has NULL roles. Initializing...`);
        roles = { ...DEFAULT_ROLES };
        needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`Updating guild ${guild.id}...`);
      const { error: updateError } = await supabase
        .from('guilds')
        .update({ roles })
        .eq('id', guild.id);

      if (updateError) {
        console.error(`Failed to update guild ${guild.id}:`, updateError);
      } else {
        console.log(`Successfully fixed guild ${guild.id}`);
      }
    }
  }

  console.log("Done!");
  process.exit(0);
}

fixGuilds();
