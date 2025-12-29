import { supabaseAdmin } from './src/config/supabase.js';

async function check() {
  console.log('--- Checking Database Status ---');
  
  // 1. Check public.users
  const { count: publicCount, error: publicError } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  if (publicError) {
    console.error('Error checking public.users:', publicError);
  } else {
    console.log(`public.users count: ${publicCount}`);
  }

  // 2. Check auth.users via RPC or raw query if allowed
  // Usually we can't query auth.users directly via the client unless we have an RPC
  // but we can try to list users via the admin API
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error listing auth.users:', authError);
  } else {
    console.log(`auth.users count: ${authData.users.length}`);
    if (authData.users.length > 0) {
      console.log('Latest auth users:');
      authData.users.slice(0, 5).forEach(u => {
        console.log(`- ${u.email} (${u.id}) created at ${u.created_at}`);
      });
    }
  }

  // 3. Check for the trigger
  const { data: triggers, error: triggerError } = await supabaseAdmin.rpc('check_trigger_exists', { 
    t_name: 'on_auth_user_created' 
  });
  
  if (triggerError) {
    // If RPC doesn't exist, try a different approach to check for the trigger
    console.log('Could not check trigger via RPC (check_trigger_exists may be missing).');
  } else {
    console.log(`Trigger 'on_auth_user_created' exists: ${triggers}`);
  }
}

check();
