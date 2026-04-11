import { createClient } from '@supabase/supabase-js';

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc('exec_sql', { 
    sql: "SELECT * FROM pg_policies WHERE tablename = 'objects';" 
  });
  console.log(JSON.stringify(data, null, 2));
  console.log('Error:', error);
}
run();
