# Supabase Schema Comparison Report

**Generated:** December 29, 2025  
**Purpose:** Compare codebase expectations against live Supabase database catalog  
**Status:** Verification Required

---

## Executive Summary

This document compares the schema your application code expects against the live Supabase catalog. It identifies:
- Tables and columns your code uses
- Potential discrepancies between code and database
- Columns that may be missing from production
- Action items for verification

### Critical Items Requiring Immediate Verification

| Priority | Issue | Impact |
|----------|-------|--------|
| P0 | `episodes.week_number` column | Results page routing will fail if missing |
| P1 | `users` trivia columns | Trivia feature will fail if missing |
| P1 | `notifications` spoiler columns | Spoiler-safe notifications will fail |
| P2 | `users` profile columns | Profile page incomplete if missing |

---

## Schema Overview

### Schemas Your Application Uses

| Schema | Purpose | Access Method |
|--------|---------|---------------|
| `public` | All application tables | Direct queries via Supabase client |
| `auth` | User authentication | Referenced by `public.users.id` |
| `storage` | File storage | `supabase.storage.from('bucket')` |

### Schemas in Catalog (Not Directly Used by Code)

| Schema | Purpose | Notes |
|--------|---------|-------|
| `pgmq` | Message queue | Internal Supabase feature |
| `cron` | Scheduled jobs | Used via pg_cron extension |
| `vault` | Secrets management | Service role key storage |
| `realtime` | Live subscriptions | Automatic via Supabase |
| `supabase_functions` | Edge function hooks | Automatic |
| `supabase_migrations` | Migration tracking | Automatic |
| `net` | HTTP requests | Used by `call_edge_function()` |
| `extensions` | Foreign data wrappers | Internal |
| `graphql_public` | GraphQL API | Optional feature |

---

## PUBLIC Schema - Complete Table Analysis

### 1. `users` Table

**Source:** Migration 001_initial_schema.sql + subsequent migrations  
**Status:** ⚠️ REQUIRES VERIFICATION - Many columns added by later migrations

#### Expected Columns

| Column | Type | Source | In Generated Types? | Notes |
|--------|------|--------|---------------------|-------|
| `id` | UUID | 001 | ✅ Yes | PK, FK to auth.users |
| `email` | TEXT | 001 | ✅ Yes | UNIQUE NOT NULL |
| `display_name` | TEXT | 001 | ✅ Yes | NOT NULL |
| `phone` | TEXT | 001 | ✅ Yes | |
| `phone_verified` | BOOLEAN | 001 | ✅ Yes | DEFAULT FALSE |
| `avatar_url` | TEXT | 001 | ✅ Yes | |
| `role` | user_role | 001 | ✅ Yes | DEFAULT 'player' |
| `notification_email` | BOOLEAN | 001 | ✅ Yes | DEFAULT TRUE |
| `notification_sms` | BOOLEAN | 001 | ✅ Yes | DEFAULT FALSE |
| `notification_push` | BOOLEAN | 001 | ✅ Yes | DEFAULT TRUE |
| `timezone` | TEXT | 001 | ✅ Yes | DEFAULT 'America/Los_Angeles' |
| `created_at` | TIMESTAMPTZ | 001 | ✅ Yes | |
| `updated_at` | TIMESTAMPTZ | 001 | ✅ Yes | |
| `hometown` | TEXT | 006 | ❌ No | Profile field |
| `favorite_castaway` | TEXT | 006 | ❌ No | Profile field |
| `bio` | TEXT | 006 | ❌ No | Profile field |
| `favorite_season` | TEXT | 045 | ❌ No | Profile field |
| `season_50_winner_prediction` | UUID | 046 | ❌ No | FK to castaways |
| `trivia_lockout_until` | TIMESTAMPTZ | 030 | ❌ No | Legacy column name |
| `trivia_locked_until` | TIMESTAMPTZ | 031 | ❌ No | Current column name |
| `trivia_questions_answered` | INTEGER | 031 | ❌ No | DEFAULT 0 |
| `trivia_questions_correct` | INTEGER | 031 | ❌ No | DEFAULT 0 |
| `trivia_completed` | BOOLEAN | 030 | ❌ No | DEFAULT FALSE |
| `trivia_completed_at` | TIMESTAMPTZ | 030 | ❌ No | |
| `trivia_score` | INTEGER | 030 | ❌ No | |
| `trivia_attempts` | INTEGER | 034 | ❌ No | DEFAULT 0 |

#### Code Usage Examples

```typescript
// server/src/routes/trivia.ts - Uses trivia_locked_until
.select('trivia_locked_until')
.update({ trivia_locked_until: lockoutUntil.toISOString(), trivia_attempts: ... })

// web/src/pages/Profile.tsx - Uses profile fields
.select('*')  // Expects hometown, favorite_castaway, bio, etc.
```

#### Action Items
- [ ] Verify all trivia columns exist in production `users` table
- [ ] Verify all profile columns exist in production `users` table
- [ ] Regenerate `database.types.ts` to include missing columns

---

### 2. `episodes` Table

**Source:** Migration 001_initial_schema.sql + 024  
**Status:** ⚠️ CRITICAL - `week_number` column may be missing

#### Expected Columns

| Column | Type | Source | In Generated Types? | Notes |
|--------|------|--------|---------------------|-------|
| `id` | UUID | 001 | ✅ Yes | PK |
| `season_id` | UUID | 001 | ✅ Yes | FK to seasons |
| `number` | INTEGER | 001 | ✅ Yes | Episode number |
| `title` | TEXT | 001 | ✅ Yes | |
| `air_date` | TIMESTAMPTZ | 001 | ✅ Yes | |
| `picks_lock_at` | TIMESTAMPTZ | 001 | ✅ Yes | |
| `results_posted_at` | TIMESTAMPTZ | 001 | ✅ Yes | |
| `waiver_opens_at` | TIMESTAMPTZ | 001 | ✅ Yes | |
| `waiver_closes_at` | TIMESTAMPTZ | 001 | ✅ Yes | |
| `is_finale` | BOOLEAN | 001 | ✅ Yes | DEFAULT FALSE |
| `is_scored` | BOOLEAN | 001 | ✅ Yes | DEFAULT FALSE |
| `created_at` | TIMESTAMPTZ | 001 | ✅ Yes | |
| `updated_at` | TIMESTAMPTZ | 001 | ✅ Yes | |
| `results_released_at` | TIMESTAMPTZ | 024 | ✅ Yes | |
| `results_released_by` | UUID | 024 | ✅ Yes | FK to users |
| `scoring_finalized_at` | TIMESTAMPTZ | 024 | ✅ Yes | |
| `scoring_finalized_by` | UUID | 024 | ✅ Yes | FK to users |
| `week_number` | INTEGER | ??? | ✅ Yes | **NO MIGRATION FOUND** |

#### Critical Issue: `week_number` Column

The `week_number` column is:
- ✅ Present in `database.types.ts` (generated types)
- ✅ Used extensively in code
- ❌ **NOT in any migration file**

This suggests the column was added manually to production but never captured in a migration.

**Code that uses `week_number`:**

```typescript
// web/src/pages/Results.tsx
.eq('week_number', weekNum)

// server/src/jobs/releaseResults.ts
.select('id, number, week_number, season_id, scoring_finalized_at, results_released_at')

// server/src/lib/spoiler-safe-notifications.ts
const resultsUrl = `${appUrl}/results/week-${episode.week_number}?token=${token}`;
```

#### Action Items
- [ ] **CRITICAL:** Verify `week_number` column exists in production
- [ ] If missing, create migration to add it: `ALTER TABLE episodes ADD COLUMN week_number INTEGER;`
- [ ] Populate: `UPDATE episodes SET week_number = number;` (if 1:1 mapping)

---

### 3. `seasons` Table

**Source:** Migration 001_initial_schema.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `number` | INTEGER | 001 | UNIQUE NOT NULL |
| `name` | TEXT | 001 | NOT NULL |
| `is_active` | BOOLEAN | 001 | DEFAULT FALSE |
| `registration_opens_at` | TIMESTAMPTZ | 001 | NOT NULL |
| `draft_order_deadline` | TIMESTAMPTZ | 001 | NOT NULL |
| `registration_closes_at` | TIMESTAMPTZ | 001 | NOT NULL |
| `premiere_at` | TIMESTAMPTZ | 001 | NOT NULL |
| `draft_deadline` | TIMESTAMPTZ | 001 | NOT NULL |
| `finale_at` | TIMESTAMPTZ | 001 | |
| `created_at` | TIMESTAMPTZ | 001 | |
| `updated_at` | TIMESTAMPTZ | 001 | |

---

### 4. `castaways` Table

**Source:** Migration 001_initial_schema.sql + 008  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `season_id` | UUID | 001 | FK to seasons |
| `name` | TEXT | 001 | NOT NULL, UNIQUE with season_id |
| `age` | INTEGER | 001 | |
| `hometown` | TEXT | 001 | |
| `occupation` | TEXT | 001 | |
| `photo_url` | TEXT | 001 | |
| `tribe_original` | TEXT | 001 | |
| `status` | castaway_status | 001 | DEFAULT 'active' |
| `eliminated_episode_id` | UUID | 001 | FK to episodes |
| `placement` | INTEGER | 001 | |
| `created_at` | TIMESTAMPTZ | 001 | |
| `updated_at` | TIMESTAMPTZ | 001 | |
| `previous_seasons` | TEXT[] | 008 | Array of season names |
| `best_placement` | INTEGER | 008 | |
| `fun_fact` | TEXT | 008 | |

---

### 5. `leagues` Table

**Source:** Migration 001_initial_schema.sql + 003  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `season_id` | UUID | 001 | FK to seasons |
| `name` | TEXT | 001 | NOT NULL |
| `code` | TEXT | 001 | UNIQUE NOT NULL |
| `password_hash` | TEXT | 001 | |
| `commissioner_id` | UUID | 001 | FK to users |
| `max_players` | INTEGER | 001 | DEFAULT 12 |
| `is_global` | BOOLEAN | 001 | DEFAULT FALSE |
| `is_public` | BOOLEAN | 001 | DEFAULT FALSE |
| `require_donation` | BOOLEAN | 001 | DEFAULT FALSE |
| `donation_amount` | DECIMAL(10,2) | 001 | |
| `donation_notes` | TEXT | 001 | |
| `payout_method` | TEXT | 001 | |
| `status` | league_status | 001 | DEFAULT 'forming' |
| `draft_status` | draft_status | 001 | DEFAULT 'pending' |
| `draft_order` | JSONB | 001 | |
| `draft_started_at` | TIMESTAMPTZ | 001 | |
| `draft_completed_at` | TIMESTAMPTZ | 001 | |
| `created_at` | TIMESTAMPTZ | 001 | |
| `updated_at` | TIMESTAMPTZ | 001 | |
| `description` | TEXT | 003 | Commissioner feature |
| `is_closed` | BOOLEAN | 003 | DEFAULT FALSE |
| `co_commissioners` | JSONB | 003 | DEFAULT '[]' |

---

### 6. `league_members` Table

**Source:** Migration 001_initial_schema.sql + 009 + 026  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `league_id` | UUID | 001 | FK to leagues |
| `user_id` | UUID | 001 | FK to users |
| `draft_position` | INTEGER | 001 | |
| `total_points` | INTEGER | 001 | DEFAULT 0 |
| `rank` | INTEGER | 001 | |
| `joined_at` | TIMESTAMPTZ | 001 | |
| `previous_rank` | INTEGER | 009 | Rank tracking |
| `eliminated_at` | TIMESTAMPTZ | 026 | Torch snuffed tracking |

---

### 7. `rosters` Table

**Source:** Migration 001_initial_schema.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `league_id` | UUID | 001 | FK to leagues |
| `user_id` | UUID | 001 | FK to users |
| `castaway_id` | UUID | 001 | FK to castaways |
| `draft_round` | INTEGER | 001 | NOT NULL |
| `draft_pick` | INTEGER | 001 | NOT NULL |
| `acquired_via` | TEXT | 001 | DEFAULT 'draft' |
| `acquired_at` | TIMESTAMPTZ | 001 | |
| `dropped_at` | TIMESTAMPTZ | 001 | |

---

### 8. `weekly_picks` Table

**Source:** Migration 001_initial_schema.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `league_id` | UUID | 001 | FK to leagues |
| `user_id` | UUID | 001 | FK to users |
| `episode_id` | UUID | 001 | FK to episodes |
| `castaway_id` | UUID | 001 | FK to castaways |
| `status` | pick_status | 001 | DEFAULT 'pending' |
| `points_earned` | INTEGER | 001 | DEFAULT 0 |
| `picked_at` | TIMESTAMPTZ | 001 | |
| `locked_at` | TIMESTAMPTZ | 001 | |
| `created_at` | TIMESTAMPTZ | 001 | |
| `updated_at` | TIMESTAMPTZ | 001 | |

---

### 9. `scoring_rules` Table

**Source:** Migration 001_initial_schema.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `season_id` | UUID | 001 | FK to seasons |
| `code` | TEXT | 001 | NOT NULL |
| `name` | TEXT | 001 | NOT NULL |
| `description` | TEXT | 001 | |
| `points` | INTEGER | 001 | NOT NULL |
| `category` | TEXT | 001 | |
| `is_negative` | BOOLEAN | 001 | DEFAULT FALSE |
| `sort_order` | INTEGER | 001 | DEFAULT 0 |
| `is_active` | BOOLEAN | 001 | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | 001 | |
| `updated_at` | TIMESTAMPTZ | 001 | |

---

### 10. `episode_scores` Table

**Source:** Migration 001_initial_schema.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `episode_id` | UUID | 001 | FK to episodes |
| `castaway_id` | UUID | 001 | FK to castaways |
| `scoring_rule_id` | UUID | 001 | FK to scoring_rules |
| `quantity` | INTEGER | 001 | DEFAULT 1 |
| `points` | INTEGER | 001 | NOT NULL |
| `notes` | TEXT | 001 | |
| `entered_by` | UUID | 001 | FK to users |
| `created_at` | TIMESTAMPTZ | 001 | |

---

### 11. `scoring_sessions` Table

**Source:** Migration 001_initial_schema.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `episode_id` | UUID | 001 | FK to episodes, UNIQUE |
| `status` | scoring_session_status | 001 | DEFAULT 'draft' |
| `started_at` | TIMESTAMPTZ | 001 | |
| `finalized_at` | TIMESTAMPTZ | 001 | |
| `finalized_by` | UUID | 001 | FK to users |

---

### 12. `notifications` Table

**Source:** Migration 001_initial_schema.sql + 023  
**Status:** ⚠️ REQUIRES VERIFICATION

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `user_id` | UUID | 001 | FK to users |
| `type` | notification_type | 001 | NOT NULL |
| `subject` | TEXT | 001 | |
| `body` | TEXT | 001 | NOT NULL |
| `sent_at` | TIMESTAMPTZ | 001 | |
| `read_at` | TIMESTAMPTZ | 001 | |
| `metadata` | JSONB | 001 | |
| `spoiler_safe` | BOOLEAN | 023 | DEFAULT FALSE |
| `scheduled_for` | TIMESTAMPTZ | 023 | For delayed notifications |

#### Action Items
- [ ] Verify `spoiler_safe` and `scheduled_for` columns exist

---

### 13. `notification_preferences` Table

**Source:** Migration 022_notification_preferences.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `user_id` | UUID | 022 | PK, FK to users |
| `email_results` | BOOLEAN | 022 | DEFAULT TRUE |
| `sms_results` | BOOLEAN | 022 | DEFAULT TRUE |
| `push_results` | BOOLEAN | 022 | DEFAULT TRUE |
| `spoiler_delay_hours` | INTEGER | 022 | DEFAULT 0, CHECK 0-72 |
| `created_at` | TIMESTAMPTZ | 022 | |
| `updated_at` | TIMESTAMPTZ | 022 | |

---

### 14. `results_tokens` Table

**Source:** Migration 023_results_tokens.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 023 | PK |
| `token` | TEXT | 023 | UNIQUE NOT NULL |
| `user_id` | UUID | 023 | FK to users |
| `episode_id` | UUID | 023 | FK to episodes |
| `created_at` | TIMESTAMPTZ | 023 | |
| `expires_at` | TIMESTAMPTZ | 023 | NOT NULL |
| `used_at` | TIMESTAMPTZ | 023 | |

---

### 15. `payments` Table

**Source:** Migration 001_initial_schema.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `user_id` | UUID | 001 | FK to users |
| `league_id` | UUID | 001 | FK to leagues |
| `amount` | DECIMAL(10,2) | 001 | NOT NULL |
| `currency` | TEXT | 001 | DEFAULT 'usd' |
| `stripe_session_id` | TEXT | 001 | UNIQUE |
| `stripe_payment_intent_id` | TEXT | 001 | |
| `stripe_refund_id` | TEXT | 001 | |
| `status` | payment_status | 001 | DEFAULT 'completed' |
| `created_at` | TIMESTAMPTZ | 001 | |
| `refunded_at` | TIMESTAMPTZ | 001 | |

---

### 16. `sms_commands` Table

**Source:** Migration 001_initial_schema.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `phone` | TEXT | 001 | NOT NULL |
| `user_id` | UUID | 001 | FK to users |
| `command` | TEXT | 001 | NOT NULL |
| `raw_message` | TEXT | 001 | NOT NULL |
| `parsed_data` | JSONB | 001 | |
| `response_sent` | TEXT | 001 | |
| `processed_at` | TIMESTAMPTZ | 001 | |

---

### 17. `waiver_rankings` Table

**Source:** Migration 001_initial_schema.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `league_id` | UUID | 001 | FK to leagues |
| `user_id` | UUID | 001 | FK to users |
| `episode_id` | UUID | 001 | FK to episodes |
| `rankings` | JSONB | 001 | NOT NULL |
| `submitted_at` | TIMESTAMPTZ | 001 | |
| `updated_at` | TIMESTAMPTZ | 001 | |

---

### 18. `waiver_results` Table

**Source:** Migration 001_initial_schema.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 001 | PK |
| `league_id` | UUID | 001 | FK to leagues |
| `user_id` | UUID | 001 | FK to users |
| `episode_id` | UUID | 001 | FK to episodes |
| `dropped_castaway_id` | UUID | 001 | FK to castaways |
| `acquired_castaway_id` | UUID | 001 | FK to castaways |
| `waiver_position` | INTEGER | 001 | NOT NULL |
| `processed_at` | TIMESTAMPTZ | 001 | |

---

### 19. `announcements` Table

**Source:** Migration 005_announcements.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 005 | PK |
| `title` | TEXT | 005 | NOT NULL |
| `body` | TEXT | 005 | NOT NULL |
| `type` | TEXT | 005 | DEFAULT 'info' |
| `is_active` | BOOLEAN | 005 | DEFAULT TRUE |
| `starts_at` | TIMESTAMPTZ | 005 | |
| `expires_at` | TIMESTAMPTZ | 005 | |
| `created_by` | UUID | 005 | FK to users |
| `created_at` | TIMESTAMPTZ | 005 | |
| `updated_at` | TIMESTAMPTZ | 005 | |

---

### 20. `draft_rankings` Table

**Source:** Migration 007_global_draft_rankings.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 007 | PK |
| `user_id` | UUID | 007 | FK to users |
| `season_id` | UUID | 007 | FK to seasons |
| `rankings` | JSONB | 007 | NOT NULL |
| `submitted_at` | TIMESTAMPTZ | 007 | |
| `updated_at` | TIMESTAMPTZ | 007 | |

---

### 21. `league_messages` Table

**Source:** Migration 010_league_chat.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 010 | PK |
| `league_id` | UUID | 010 | FK to leagues |
| `user_id` | UUID | 010 | FK to users |
| `content` | TEXT | 010 | NOT NULL |
| `created_at` | TIMESTAMPTZ | 010 | |

---

### 22. `verification_codes` Table

**Source:** Migration 013_verification_codes.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 013 | PK |
| `user_id` | UUID | 013 | FK to users, UNIQUE |
| `phone` | TEXT | 013 | NOT NULL |
| `code` | TEXT | 013 | NOT NULL |
| `expires_at` | TIMESTAMPTZ | 013 | NOT NULL |
| `created_at` | TIMESTAMPTZ | 013 | |
| `used_at` | TIMESTAMPTZ | 013 | |

---

### 23. `email_queue` Table

**Source:** Migration 017_email_queue.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 017 | PK |
| `type` | TEXT | 017 | CHECK ('critical', 'normal') |
| `to_email` | TEXT | 017 | NOT NULL |
| `subject` | TEXT | 017 | NOT NULL |
| `html` | TEXT | 017 | NOT NULL |
| `text` | TEXT | 017 | |
| `attempts` | INTEGER | 017 | DEFAULT 0 |
| `max_attempts` | INTEGER | 017 | DEFAULT 3 |
| `last_error` | TEXT | 017 | |
| `next_retry_at` | TIMESTAMPTZ | 017 | |
| `created_at` | TIMESTAMPTZ | 017 | |
| `sent_at` | TIMESTAMPTZ | 017 | |
| `failed_at` | TIMESTAMPTZ | 017 | |

---

### 24. `failed_emails` Table

**Source:** Migration 017_email_queue.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 017 | PK |
| `email_job` | JSONB | 017 | NOT NULL |
| `failed_at` | TIMESTAMPTZ | 017 | |
| `retry_attempted` | BOOLEAN | 017 | DEFAULT FALSE |
| `retry_succeeded` | BOOLEAN | 017 | DEFAULT FALSE |
| `retry_at` | TIMESTAMPTZ | 017 | |
| `notes` | TEXT | 017 | |

---

### 25. `cron_job_logs` Table

**Source:** Migration 004_pg_cron_jobs.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 004 | PK |
| `job_name` | TEXT | 004 | NOT NULL |
| `started_at` | TIMESTAMPTZ | 004 | |
| `completed_at` | TIMESTAMPTZ | 004 | |
| `success` | BOOLEAN | 004 | DEFAULT FALSE |
| `result` | JSONB | 004 | |
| `error` | TEXT | 004 | |

---

### 26. `daily_trivia_questions` Table

**Source:** Migration 029_daily_trivia_tracking.sql + 031  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 029 | PK |
| `question_date` | DATE | 029 | (UNIQUE constraint dropped in 031) |
| `question` | TEXT | 029 | NOT NULL |
| `options` | TEXT[] | 029 | NOT NULL |
| `correct_index` | INTEGER | 029 | NOT NULL |
| `fun_fact` | TEXT | 029 | |
| `castaway_name` | TEXT | 029 | |
| `created_at` | TIMESTAMPTZ | 029 | |
| `updated_at` | TIMESTAMPTZ | 029 | |
| `question_number` | INTEGER | 031 | For ordering (1-24) |

---

### 27. `daily_trivia_answers` Table

**Source:** Migration 029_daily_trivia_tracking.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 029 | PK |
| `user_id` | UUID | 029 | FK to users |
| `question_id` | UUID | 029 | FK to daily_trivia_questions |
| `selected_index` | INTEGER | 029 | NOT NULL |
| `is_correct` | BOOLEAN | 029 | NOT NULL |
| `answered_at` | TIMESTAMPTZ | 029 | |
| `created_at` | TIMESTAMPTZ | 029 | |

---

### 28. `daily_trivia_leaderboard` Table

**Source:** Migration 029_daily_trivia_tracking.sql + 034  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `user_id` | UUID | 029 | PK, FK to users |
| `display_name` | TEXT | 029 | NOT NULL |
| `days_to_complete` | INTEGER | 029 | NOT NULL |
| `completed_at` | TIMESTAMPTZ | 029 | NOT NULL |
| `rank` | INTEGER | 029 | GENERATED |
| `created_at` | TIMESTAMPTZ | 029 | |
| `updated_at` | TIMESTAMPTZ | 029 | |
| `attempts` | INTEGER | 034 | DEFAULT 1 |

---

### 29. `trivia_answers` Table

**Source:** Migration 030_trivia_lockout_system.sql  
**Status:** ✅ Complete

#### Expected Columns

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID | 030 | PK |
| `user_id` | UUID | 030 | FK to users |
| `question_index` | INTEGER | 030 | CHECK 0-23 |
| `is_correct` | BOOLEAN | 030 | NOT NULL |
| `answered_at` | TIMESTAMPTZ | 030 | |
| `created_at` | TIMESTAMPTZ | 030 | |

---

## ENUM Types

Your application uses these custom enum types:

| Enum | Values | Source |
|------|--------|--------|
| `user_role` | 'player', 'commissioner', 'admin' | 001 |
| `league_status` | 'forming', 'drafting', 'active', 'completed' | 001 |
| `draft_status` | 'pending', 'in_progress', 'completed' | 001 |
| `pick_status` | 'pending', 'locked', 'auto_picked' | 001 |
| `waiver_status` | 'open', 'closed', 'processing' | 001 |
| `scoring_session_status` | 'draft', 'finalized' | 001 |
| `notification_type` | 'email', 'sms', 'push' | 001 |
| `castaway_status` | 'active', 'eliminated', 'winner' | 001 |
| `payment_status` | 'pending', 'completed', 'refunded', 'failed' | 001 |

---

## Database Functions

Your application uses these custom functions:

| Function | Purpose | Source |
|----------|---------|--------|
| `update_updated_at()` | Auto-update timestamp trigger | 001 |
| `handle_new_user()` | Sync auth.users to public.users | 001 |
| `generate_league_code()` | Generate 6-char invite codes | 001 |
| `set_league_code()` | Auto-generate code on insert | 001 |
| `is_admin()` | Check if user is admin | 001 |
| `is_commissioner(uuid)` | Check if user is commissioner | 001 |
| `is_league_member(uuid)` | Check league membership | 001 |
| `is_commissioner_or_co(uuid)` | Check commissioner or co-commissioner | 003 |
| `cleanup_expired_verification_codes()` | Delete expired codes | 013 |
| `create_notification_preferences_for_new_user()` | Auto-create prefs | 022 |
| `get_user_trivia_stats(uuid)` | Get trivia statistics | 029 |
| `is_user_trivia_locked(uuid)` | Check trivia lockout | 031 |
| `get_next_trivia_question(uuid)` | Get next unanswered question | 031 |
| `get_trivia_progress(uuid)` | Get user trivia progress | 031 |
| `call_edge_function(text, text, jsonb)` | Call Edge Functions via pg_net | 004 |

---

## Storage Buckets

Your application uses Supabase Storage:

| Bucket | Purpose | Code Reference |
|--------|---------|----------------|
| `public` | League photos | `web/src/components/settings/LeagueBrandingSection.tsx` |
| `castaways` | Castaway photos | Various scripts in `server/scripts/` |

---

## Verification Checklist

Run these queries in your Supabase SQL Editor to verify schema:

### Check `episodes.week_number`

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'episodes' AND column_name = 'week_number';
-- Should return 1 row if exists
```

### Check `users` trivia columns

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN (
    'trivia_locked_until', 
    'trivia_questions_answered', 
    'trivia_questions_correct',
    'trivia_attempts',
    'trivia_completed',
    'trivia_completed_at',
    'trivia_score'
  );
-- Should return 7 rows if all exist
```

### Check `users` profile columns

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN (
    'hometown', 
    'favorite_castaway', 
    'bio',
    'favorite_season',
    'season_50_winner_prediction'
  );
-- Should return 5 rows if all exist
```

### Check `notifications` spoiler columns

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND column_name IN ('spoiler_safe', 'scheduled_for');
-- Should return 2 rows if both exist
```

### Full column count per table

```sql
SELECT table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
```

---

## Recommended Actions

### Immediate (P0)

1. **Verify `episodes.week_number` exists**
   - If missing, run: `ALTER TABLE episodes ADD COLUMN week_number INTEGER;`
   - Then populate: `UPDATE episodes SET week_number = number;`

### High Priority (P1)

2. **Regenerate TypeScript types**
   ```bash
   npx supabase gen types typescript --project-id qxrgejdfxcvsfktgysop > supabase/types.ts
   cp supabase/types.ts web/src/lib/database.types.ts
   ```

3. **Create missing column migration**
   - If any columns are missing, create a migration to add them
   - Capture any manually-added columns in version control

### Medium Priority (P2)

4. **Document manual schema changes**
   - If `week_number` was added manually, create a migration file to document it
   - Ensures reproducibility across environments

---

## Appendix A: System Schemas (Full Reference)

These schemas are managed by Supabase or extensions. **Do not alter structures unless following official guidance.**

### auth Schema

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, email, phone, encrypted_password, email_confirmed_at, phone_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_anonymous, role, banned_until, deleted_at | Primary user authentication |
| `identities` | id, user_id (FK), identity_data, provider, last_sign_in_at | OAuth/social identities |
| `sessions` | id, user_id (FK), created_at, not_after | Active sessions |
| `refresh_tokens` | id, token, user_id, revocation_reason | JWT refresh tokens |
| `audit_log_entries` | id, payload, created_at | Security audit trail |
| `mfa_factors` | id, user_id, factor_type, status, secret | MFA configuration |
| `mfa_challenges` | id, factor_id, verified_at, otp_code | MFA verification |
| `mfa_amr_claims` | id, session_id, authentication_method | Auth method references |
| `flow_state` | id, user_id, auth_code, code_challenge | OAuth flow state |
| `sso_providers` | id, resource_id, disabled | SSO provider config |
| `sso_domains` | id, sso_provider_id, domain | SSO domain mapping |
| `saml_providers` | id, sso_provider_id, entity_id, metadata_xml | SAML configuration |
| `saml_relay_states` | id, sso_provider_id, request_id, for_email | SAML relay |
| `one_time_tokens` | id, user_id, token_type, token_hash | Magic links, etc. |
| `oauth_clients` | id, client_secret_hash, client_name | OAuth client apps |
| `oauth_authorizations` | id, client_id, user_id, scope, status | OAuth grants |
| `oauth_consents` | id, user_id, client_id, scopes | User consents |

### storage Schema

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `buckets` | id (pk), name (unique), owner, public, file_size_limit, allowed_mime_types | Storage bucket config |
| `objects` | id, bucket_id (FK), name, owner, metadata, path_tokens | Stored files |
| `prefixes` | bucket_id, name, level | Directory prefixes |
| `s3_multipart_uploads` | id, bucket_id, key, upload_signature | Multipart upload tracking |
| `s3_multipart_uploads_parts` | id, upload_id, part_number, etag | Upload parts |
| `migrations` | id, name, hash, executed_at | Storage schema versions |

**Your buckets:**
- `public` - League photos
- `castaways` - Castaway photos (referenced in scripts)

### realtime Schema

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `messages` | id, topic, event, payload, inserted_at, private | Broadcast messages |
| `subscription` | id, subscription_id, entity, filters, claims | Channel subscriptions |
| `schema_migrations` | version, inserted_at | Realtime schema versions |

**Your realtime usage:** `league_messages` table is added to `supabase_realtime` publication.

### cron Schema (pg_cron)

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `job` | jobid (pk), schedule, command, database, username, active, jobname | Scheduled jobs |
| `job_run_details` | runid (pk), jobid, status, return_message, start_time, end_time, pid | Job execution history |

**Your cron usage:** `cron_job_logs` table in public schema for custom logging.

### pgmq Schema

| Table | Notes |
|-------|-------|
| `meta` | Queue metadata (queue_name, is_partitioned, is_unlogged) |
| `q_<queue_name>` | Per-queue message tables (created dynamically) |
| `q_<queue_name>_dlq` | Dead-letter queues |

**Your usage:** Not directly used in application code.

### vault Schema

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `secrets` | id, name, description, secret, key_id, nonce | Encrypted secrets |

**Your usage:** Service role key potentially stored here for `call_edge_function()`.

### net Schema

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `http_request_queue` | id, method, url, headers, body, timeout_milliseconds | Pending HTTP requests |
| `_http_response` | id, status_code, content_type, headers, content, timed_out, error_msg | HTTP responses |

**Your usage:** Used by `call_edge_function()` in migration 004.

### supabase_migrations Schema

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `schema_migrations` | version (pk), statements, name, idempotency_key, rollback | Migration tracking |

**Your usage:** Referenced by verification scripts to check applied migrations.

### supabase_functions Schema

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `migrations` | version (pk), inserted_at | Edge function schema versions |
| `hooks` | id, hook_table_id, hook_name, request_id | Triggered hook audit trail |

### Other Schemas

| Schema | Purpose | Notes |
|--------|---------|-------|
| `extensions` | Extension objects (wrappers_fdw_stats) | Managed by extensions |
| `graphql_public` | GraphQL API views/functions | PostGraphile artifacts |
| `graphql` | GraphQL metadata | Internal |
| `pgbouncer` | Connection pooler views | Read-only admin views |

---

## Appendix B: RLS Policy Analysis

Based on your migration 052_optimize_rls_performance.sql, here's an analysis:

### Policies Verified ✅

| Table | Policy | Status |
|-------|--------|--------|
| `users` | `users_insert_own` | ✅ Correct - uses `(SELECT auth.uid())` |
| `notification_preferences` | SELECT/UPDATE own | ✅ Correct |
| `league_messages` | INSERT/DELETE own | ✅ Correct - uses `is_league_member()` |
| `results_tokens` | SELECT own | ✅ Correct |
| `daily_trivia_answers` | INSERT/SELECT own | ✅ Correct |
| `draft_rankings` | Full CRUD own | ✅ Correct |
| `users` | `users_prevent_self_role_update` | ⚠️ See notes |

### RLS Best Practices Applied

1. **Scalar Subqueries:** All `auth.uid()` calls wrapped in `(SELECT auth.uid())` - prevents per-row re-evaluation
2. **TO authenticated:** Policies scoped to authenticated role
3. **Function Stability:** `is_league_member()` should be marked `STABLE SECURITY DEFINER`

### Role Update Policy Notes

The `users_prevent_self_role_update` policy:

```sql
WITH CHECK (
  role = (SELECT role FROM users WHERE id = (SELECT auth.uid())) 
  OR (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
)
```

**Behavior:**
- ✅ Non-admins cannot change their own role
- ✅ Admins can change their own role (including self-demotion)
- ⚠️ Does NOT allow admins to change OTHER users' roles via this policy

**Recommendation:** If admins need to update other users' roles, add a separate policy:

```sql
CREATE POLICY users_admin_update_roles ON users
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
);
```

### Required Indexes for RLS Performance

Ensure these indexes exist:

```sql
-- Already in migrations
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_league_members_user ON league_members(user_id);
CREATE INDEX idx_league_members_league ON league_members(league_id);

-- Recommended additions (if not present)
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_results_tokens_user ON results_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_rankings_user ON draft_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_trivia_answers_user ON daily_trivia_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_league_messages_user ON league_messages(user_id);
```

### Table Name Clarification

The migration file `029_daily_trivia_tracking.sql` creates these tables:
- `daily_trivia_questions` (not `daily_trivia_tracking`)
- `daily_trivia_answers`
- `daily_trivia_leaderboard`

RLS policies correctly target `daily_trivia_answers`, not a non-existent `daily_trivia_tracking` table.

---

## Appendix C: Verification Queries

### Full Column Audit

```sql
-- All columns in public schema with types
SELECT 
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### Check RLS Status

```sql
-- Verify RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Check Indexes

```sql
-- List all indexes on public tables
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Check Functions

```sql
-- List custom functions
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE p.provolatile 
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END as volatility,
  p.prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

### Check Policies

```sql
-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
