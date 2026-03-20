const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase1 = createClient(
  'https://cxwivaxqmuzsahydekmv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4d2l2YXhxbXV6c2FoeWRla212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAyNDUwMSwiZXhwIjoyMDg4NjAwNTAxfQ.yWIbpoDQEwOYrlnGJO7fweTodnT87D2b6otrm6W7C7o'
);

const supabase2 = createClient(
  'https://rozwhqxbpsxlxbkfzvce.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I'
);

const ALL_TABLES = [
  'accounts', 'ban_list', 'characters', 'chat_messages', 'combat_history',
  'crafting_history', 'daily_rewards', 'dungeon_history', 'global_stats',
  'guild_invitations', 'guild_members', 'guilds', 'leaderboards',
  'market_listings', 'pending_rewards', 'push_subscriptions', 'trade_history',
  'world_boss_attempts', 'world_boss_notifications', 'world_boss_sessions',
  'world_boss_subscribers',
];

async function getTableColumns(supabase, tableName) {
  try {
    const { data, error, status } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      if (status === 404 || error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
        return { exists: false };
      }
      return { exists: true, columns: [], error: error.message };
    }
    if (data && data.length > 0) {
      return { exists: true, columns: Object.keys(data[0]).sort() };
    }
    return { exists: true, columns: [], empty: true };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

async function main() {
  const results = [];

  for (const table of ALL_TABLES) {
    const [r1, r2] = await Promise.all([
      getTableColumns(supabase1, table),
      getTableColumns(supabase2, table),
    ]);
    results.push({
      table,
      project: r1,
      newInstance: r2,
    });
  }

  const outputPath = path.join(__dirname, 'compare_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('DONE');
}

main().catch(console.error).finally(function() { process.exit(0); });
