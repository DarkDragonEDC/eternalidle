import { createClient } from '@supabase/supabase-js';

// Project Supabase (current)
const supabase1 = createClient(
  'https://cxwivaxqmuzsahydekmv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4d2l2YXhxbXV6c2FoeWRla212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAyNDUwMSwiZXhwIjoyMDg4NjAwNTAxfQ.yWIbpoDQEwOYrlnGJO7fweTodnT87D2b6otrm6W7C7o'
);

// New Supabase (to compare)
const supabase2 = createClient(
  'https://rozwhqxbpsxlxbkfzvce.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I'
);

// All tables referenced in the project code
const ALL_TABLES = [
  'accounts',
  'ban_list',
  'characters',
  'chat_messages',
  'combat_history',
  'crafting_history',
  'daily_rewards',
  'dungeon_history',
  'global_stats',
  'guild_invitations',
  'guild_members',
  'guilds',
  'leaderboards',
  'market_listings',
  'pending_rewards',
  'push_subscriptions',
  'trade_history',
  'world_boss_attempts',
  'world_boss_notifications',
  'world_boss_sessions',
  'world_boss_subscribers',
];

async function getTableColumns(supabase, tableName) {
  try {
    const { data, error, status } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (status === 404 || error.code === '42P01' || error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return { exists: false };
      }
      // Permission or other error - table likely exists
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
  console.log('=== SUPABASE SCHEMA COMPARISON ===');
  console.log('Project:  cxwivaxqmuzsahydekmv.supabase.co');
  console.log('New:      rozwhqxbpsxlxbkfzvce.supabase.co');
  console.log('');

  let hasIssues = false;

  for (const table of ALL_TABLES) {
    const [r1, r2] = await Promise.all([
      getTableColumns(supabase1, table),
      getTableColumns(supabase2, table),
    ]);

    // Check existence
    if (!r1.exists && !r2.exists) {
      continue; // skip - neither has it
    }
    if (r1.exists && !r2.exists) {
      console.log(`\n❌ TABLE "${table}": EXISTS in Project, MISSING in New`);
      if (r1.columns?.length > 0) console.log(`   Project columns: [${r1.columns.join(', ')}]`);
      hasIssues = true;
      continue;
    }
    if (!r1.exists && r2.exists) {
      console.log(`\n❌ TABLE "${table}": MISSING in Project, EXISTS in New`);
      if (r2.columns?.length > 0) console.log(`   New columns: [${r2.columns.join(', ')}]`);
      hasIssues = true;
      continue;
    }

    // Both exist - handle empty tables
    if (r1.empty && r2.empty) {
      console.log(`\n⚠️  TABLE "${table}": Both EMPTY (columns unknown - table exists in both)`);
      continue;
    }
    if (r1.empty) {
      console.log(`\n⚠️  TABLE "${table}": Project EMPTY, New has ${r2.columns.length} columns: [${r2.columns.join(', ')}]`);
      continue;
    }
    if (r2.empty) {
      console.log(`\n⚠️  TABLE "${table}": New EMPTY, Project has ${r1.columns.length} columns: [${r1.columns.join(', ')}]`);
      continue;
    }

    // Both have data - compare columns
    const cols1 = r1.columns;
    const cols2 = r2.columns;
    const onlyIn1 = cols1.filter(c => !cols2.includes(c));
    const onlyIn2 = cols2.filter(c => !cols1.includes(c));

    if (onlyIn1.length === 0 && onlyIn2.length === 0 && cols1.length === cols2.length) {
      console.log(`\n✅ TABLE "${table}": IDENTICAL (${cols1.length} columns)`);
    } else {
      hasIssues = true;
      console.log(`\n❌ TABLE "${table}": COLUMNS DIFFER`);
      if (onlyIn1.length > 0) console.log(`   Only in Project: [${onlyIn1.join(', ')}]`);
      if (onlyIn2.length > 0) console.log(`   Only in New:     [${onlyIn2.join(', ')}]`);
      console.log(`   Project (${cols1.length}): [${cols1.join(', ')}]`);
      console.log(`   New     (${cols2.length}): [${cols2.join(', ')}]`);
    }
  }

  console.log('\n\n' + (hasIssues ? '❌ DIFFERENCES FOUND!' : '✅ ALL IDENTICAL!'));
}

main().catch(console.error).finally(() => process.exit(0));
