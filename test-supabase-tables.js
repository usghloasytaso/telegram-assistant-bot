const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testTables() {
  const tables = ['group_settings', 'group_admins', 'user_profiles', 'messages_history', 'predictions_track'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    console.log(`Table '${t}':`, error ? error.message : "Exists!");
  }
}

testTables();
