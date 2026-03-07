-- Add manage_upgrades permission to default guild roles
ALTER TABLE guilds ALTER COLUMN roles SET DEFAULT '{
    "LEADER": {
        "name": "Leader",
        "color": "#d4af37",
        "permissions": ["edit_appearance", "manage_roles", "kick_members", "manage_requests", "change_member_roles", "manage_upgrades"]
    },
    "OFFICER": {
        "name": "Co-Leader",
        "color": "#c0c0c0",
        "permissions": ["kick_members", "manage_requests", "manage_upgrades"]
    },
    "MEMBER": {
        "name": "Member",
        "color": "#808080",
        "permissions": []
    }
}'::jsonb;

-- Update existing guilds LEADER rank
UPDATE guilds SET roles = jsonb_set(
    roles,
    '{LEADER,permissions}',
    (roles->'LEADER'->'permissions') || '["manage_upgrades"]'::jsonb
) WHERE roles->'LEADER' IS NOT NULL 
  AND NOT (roles->'LEADER'->'permissions' @> '["manage_upgrades"]'::jsonb);

-- Update existing guilds OFFICER rank
UPDATE guilds SET roles = jsonb_set(
    roles,
    '{OFFICER,permissions}',
    (roles->'OFFICER'->'permissions') || '["manage_upgrades"]'::jsonb
) WHERE roles->'OFFICER' IS NOT NULL 
  AND NOT (roles->'OFFICER'->'permissions' @> '["manage_upgrades"]'::jsonb);
