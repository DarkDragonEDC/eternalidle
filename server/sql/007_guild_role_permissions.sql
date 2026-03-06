-- Add roles column to guilds table
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '{
    "LEADER": {
        "name": "Leader",
        "color": "#d4af37",
        "permissions": ["edit_appearance", "manage_roles", "kick_members", "manage_requests", "change_member_roles"]
    },
    "OFFICER": {
        "name": "Co-Leader",
        "color": "#c0c0c0",
        "permissions": ["kick_members", "manage_requests"]
    },
    "MEMBER": {
        "name": "Member",
        "color": "#808080",
        "permissions": []
    }
}'::jsonb;

-- Optional: Update existing guilds to have these default roles if column was added without default previously
UPDATE guilds SET roles = '{
    "LEADER": {
        "name": "Leader",
        "color": "#d4af37",
        "permissions": ["edit_appearance", "manage_roles", "kick_members", "manage_requests", "change_member_roles"]
    },
    "OFFICER": {
        "name": "Co-Leader",
        "color": "#c0c0c0",
        "permissions": ["kick_members", "manage_requests"]
    },
    "MEMBER": {
        "name": "Member",
        "color": "#808080",
        "permissions": []
    }
}'::jsonb WHERE roles IS NULL;
