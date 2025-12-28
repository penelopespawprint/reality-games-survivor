# RLS Best Practices for Backend Development

## Quick Reference Guide

### When to Use Which Client

```typescript
import { supabase, supabaseAdmin } from './config/supabase';

// ✅ Use supabase (anon client) for:
// - Reading public data (seasons, episodes, castaways, scoring_rules)
// - User authentication flows
// - NEVER for user-specific writes

// ✅ Use supabaseAdmin (service role) for:
// - ALL user data writes (picks, rosters, notifications, etc.)
// - System operations (auto-pick, draft, scoring)
// - Email queue operations
// - Any operation that crosses user boundaries
```

### Critical Rules

1. **NEVER use direct Supabase writes from frontend**
   - ❌ BAD: `supabase.from('weekly_picks').insert(...)`
   - ✅ GOOD: API endpoint that validates, then uses `supabaseAdmin`

2. **Always use service role for user data mutations**
   ```typescript
   // ❌ BAD - Bypasses business logic
   await supabase.from('weekly_picks').insert({ user_id, ... });

   // ✅ GOOD - Goes through API validation
   await supabaseAdmin.from('weekly_picks').insert({
     user_id,
     castaway_id, // Validated by API
     league_id,   // Validated by API
     episode_id,  // Validated by API
     status: 'pending'
   });
   ```

3. **Exclude sensitive fields from SELECT queries**
   ```typescript
   // ❌ BAD - Exposes password_hash
   const { data } = await supabase.from('leagues').select('*');

   // ✅ GOOD - Explicit column selection
   const { data } = await supabase.from('leagues').select(`
     id,
     name,
     code,
     commissioner_id,
     max_players,
     is_public,
     status,
     draft_status,
     created_at,
     updated_at
   `);
   ```

4. **Infrastructure tables are service-only**
   ```typescript
   // These tables should NEVER be accessed from frontend:
   - email_queue
   - failed_emails
   - cron_job_logs
   - verification_codes

   // Always use supabaseAdmin:
   await supabaseAdmin.from('email_queue').insert({ ... });
   ```

### Common Patterns

#### Pattern 1: User-Specific Data (Picks, Rosters, Notifications)

```typescript
// Backend API endpoint
export async function submitWeeklyPick(req: Request, res: Response) {
  const userId = req.user.id; // From auth middleware
  const { leagueId, castawayId, episodeId } = req.body;

  // 1. Validate business rules
  const isValid = await validatePick(userId, leagueId, castawayId, episodeId);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid pick' });
  }

  // 2. Use service role to write
  const { data, error } = await supabaseAdmin
    .from('weekly_picks')
    .insert({
      user_id: userId,
      league_id: leagueId,
      castaway_id: castawayId,
      episode_id: episodeId,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
}
```

#### Pattern 2: Public Data Reads

```typescript
// Can use either client (supabase or supabaseAdmin)
export async function getActiveSeasons(req: Request, res: Response) {
  // Using anon client is fine for public data
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
}
```

#### Pattern 3: System Operations (Jobs)

```typescript
// Always use service role for scheduled jobs
export async function lockWeeklyPicks() {
  const currentEpisode = await getCurrentEpisode();

  // Service role can update all users' picks
  const { data, error } = await supabaseAdmin
    .from('weekly_picks')
    .update({ status: 'locked' })
    .eq('episode_id', currentEpisode.id)
    .eq('status', 'pending');

  console.log(`Locked ${data?.length || 0} picks`);
}
```

#### Pattern 4: Admin Operations

```typescript
// Admin endpoints should verify is_admin(), then use service role
export async function finalizeScoring(req: Request, res: Response) {
  // 1. Verify admin
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', req.user.id)
    .single();

  if (user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  // 2. Use service role for admin operations
  const { episodeId } = req.params;
  const { error } = await supabaseAdmin
    .from('scoring_sessions')
    .update({ status: 'finalized' })
    .eq('episode_id', episodeId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true });
}
```

### Testing RLS Policies

Run the comprehensive test suite:

```bash
cd server
npx tsx src/tests/rls-security-test.ts
```

Manual testing with Supabase client:

```typescript
// Test as User A
const userAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {
      Authorization: `Bearer ${userAAccessToken}`
    }
  }
});

// Try to read User B's data (should fail)
const { data, error } = await userAClient
  .from('weekly_picks')
  .select('*')
  .eq('user_id', userBId);

console.log('Can User A see User B picks?', data?.length > 0 ? 'YES (BUG!)' : 'NO (GOOD)');
```

### Security Checklist for New Features

- [ ] All user data writes go through API endpoints
- [ ] API endpoints validate user ownership/permissions
- [ ] Service role used for all database writes
- [ ] Sensitive fields excluded from SELECT queries
- [ ] RLS policies defined for any new tables
- [ ] Service role bypass policy added for new tables
- [ ] Admin policies added if admin access needed
- [ ] Test with multiple users to verify isolation

### Common Mistakes to Avoid

1. **Frontend Direct Writes**
   ```typescript
   // ❌ NEVER DO THIS
   await supabase.from('rosters').insert({ user_id: myId, castaway_id: X });
   ```

2. **Returning Sensitive Fields**
   ```typescript
   // ❌ BAD
   SELECT * FROM leagues; // Includes password_hash

   // ✅ GOOD
   SELECT id, name, code FROM leagues; // Explicit fields only
   ```

3. **Forgetting Service Role Bypass**
   ```sql
   -- ❌ BAD - New table without service bypass
   CREATE TABLE my_new_table (...);
   ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;
   CREATE POLICY user_select ON my_new_table FOR SELECT USING (user_id = auth.uid());

   -- ✅ GOOD - Always add service bypass
   CREATE POLICY service_bypass_my_new_table ON my_new_table
     FOR ALL USING (auth.role() = 'service_role');
   ```

4. **Not Testing Cross-User Access**
   - Always test with 2+ users
   - Verify User A cannot see User B's data
   - Verify league members CAN see each other's rosters/picks (when appropriate)

### Emergency: RLS Bypass Detected

If you discover RLS bypass vulnerability:

1. **Assess Impact**
   - What data is exposed?
   - Who can access it?
   - Is it sensitive (emails, payments, passwords)?

2. **Immediate Fix**
   ```sql
   -- Enable RLS immediately
   ALTER TABLE vulnerable_table ENABLE ROW LEVEL SECURITY;

   -- Add restrictive policy
   CREATE POLICY temp_lockdown ON vulnerable_table
     FOR ALL USING (auth.role() = 'service_role');
   ```

3. **Verify Fix**
   ```bash
   npx tsx src/tests/rls-security-test.ts
   ```

4. **Audit Logs**
   - Check Supabase dashboard for unauthorized access
   - Review application logs for suspicious queries

5. **Create Permanent Fix**
   - Write proper RLS policies
   - Add to migration file
   - Update test suite

### Reference: All Tables and RLS Status

| Table | User Access | Service Role | Admin | Notes |
|-------|-------------|--------------|-------|-------|
| users | Own only | ✅ | ✅ | Can see league mates |
| seasons | Public read | ✅ | ✅ | - |
| episodes | Public read | ✅ | ✅ | - |
| castaways | Public read | ✅ | ✅ | - |
| scoring_rules | Public read | ✅ | ✅ | - |
| leagues | Public read | ✅ | ✅ | Exclude password_hash |
| league_members | Own + league | ✅ | ✅ | - |
| rosters | Own + league | ✅ | ✅ | - |
| weekly_picks | Own + locked | ✅ | ✅ | Trigger enforced |
| notifications | Own only | ✅ | ✅ | - |
| payments | Own only | ✅ | ✅ | - |
| email_queue | **None** | ✅ | Read only | Service-only |
| failed_emails | **None** | ✅ | Read only | Service-only |
| cron_job_logs | **None** | ✅ | ✅ | Service/admin only |

### Questions?

See full security audit: `/QA-REPORT-RLS-SECURITY.md`
