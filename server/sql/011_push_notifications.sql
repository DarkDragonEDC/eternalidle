-- Table to store user push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    settings JSONB DEFAULT '{
        "daily_spin": true,
        "character_death": true,
        "world_boss": true,
        "dungeon_complete": true,
        "guild_task": true,
        "new_member": true,
        "market_sale": true,
        "item_bought": true,
        "activity_complete": true,
        "inventory_full": true,
        "hp_recovered": true
    }',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, endpoint)
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
