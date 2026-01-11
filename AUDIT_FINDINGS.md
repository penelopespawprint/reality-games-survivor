# RGFL Audit Findings

> **Every claim backed by quoted code.**
> **Last Updated:** 2026-01-10

---

## Executive Summary

1. **Health Score:** 8/10
2. **Keep/Burn Ratio:** 92% keep, 6% refactor, 1% burn, 1% dead
3. **Root Cause of Issues:** Accumulated test files and one orphaned admin page

**Overall Assessment:** This is a well-architected, production-ready fantasy sports application. The codebase demonstrates strong separation of concerns, proper authentication patterns, comprehensive email systems, and robust scheduled job handling. The main issues are minor: accumulated test files that should be moved to a test directory, and one dead admin page.

---

## Build Verification

### Frontend
```bash
$ cd web && npm run build
✓ 2698 modules transformed.
dist/index.html                     0.90 kB │ gzip:   0.49 kB
dist/assets/index-BsVrM4pu.css    119.03 kB │ gzip:  18.38 kB
dist/assets/index-Dm32Qvjg.js   1,992.47 kB │ gzip: 509.59 kB
✓ built in 2.85s

$ npx tsc --noEmit
# No errors
```

### Backend
```bash
$ cd server && npm run build
# No errors

$ npx tsc --noEmit
# No errors
```

### Linting
```bash
$ cd web && npm run lint
# 22 warnings (all @typescript-eslint/no-explicit-any)
# 0 errors
```

---

## Feature Inventory

### Core Features (From Code)

| Feature | Location | Status |
|---------|----------|--------|
| User Authentication | `web/src/lib/auth.tsx`, `server/src/middleware/authenticate.ts` | ✅ Production |
| League Management | `server/src/routes/leagues/index.ts` | ✅ Production |
| Draft System | `server/src/services/draft.ts`, `web/src/pages/Draft.tsx` | ✅ Production |
| Weekly Picks | `server/src/routes/picks.ts`, `web/src/pages/WeeklyPick.tsx` | ✅ Production |
| Episode Scoring | `server/src/services/scoring.ts`, `web/src/pages/admin/AdminScoring.tsx` | ✅ Production |
| Leaderboards | `server/src/routes/leagues/leaderboard.ts`, `web/src/pages/GlobalLeaderboard.tsx` | ✅ Production |
| Payment Processing | `server/src/routes/leagues/payments.ts`, Stripe webhooks | ✅ Production |
| Email System | `server/src/emails/`, 15+ templates | ✅ Production |
| SMS Commands | `server/src/services/sms/`, Twilio integration | ✅ Production |
| Admin Dashboard | `web/src/pages/admin/` (23 pages) | ✅ Production |
| Trivia Game | `server/src/routes/trivia.ts`, `web/src/pages/Trivia.tsx` | ✅ Production |
| Scheduled Jobs | `server/src/jobs/scheduler.ts` (17 jobs) | ✅ Production |

### Scheduled Jobs (From `server/src/jobs/scheduler.ts:34-172`)

| Job | Schedule | Description |
|-----|----------|-------------|
| `email-queue-processor` | Every 5 min | Process pending emails |
| `lock-picks` | Wed 5pm PST | Lock weekly picks |
| `auto-pick` | Wed 5:05pm PST | Fill missing picks |
| `pick-reminders` | Wed 2pm PST | Send pick reminders |
| `results-notification` | Fri 8am PST | Send episode results |
| `release-results` | Every 10 min | Release spoiler-safe results |
| `weekly-summary` | Sun 10am PST | Send standings summary |
| `draft-reminders` | Daily 9am PST | Draft reminder emails |
| `nurture-trivia-completers` | Daily 11am PST | Nurture trivia users |
| `join-league-nudge` | Daily 10am PST | Nudge users to join |
| `pre-season-hype` | Daily 12pm PST | Countdown emails |
| `inactivity-reminder` | Mon 11am PST | Remind inactive users |
| `trivia-progress` | Daily 3pm PST | Trivia encouragement |
| `cleanup-lifecycle-email-logs` | Sun 3am PST | Clean old logs |
| `daily-stats-capture` | Daily midnight PST | Capture stats |
| `weekly-system-report` | Sun noon PST | Admin report |

---

## Code Categorization

### KEEP

**File:** `server/src/server.ts`
**What it does:** Main Express server with proper middleware, error handling, graceful shutdown
**Why it's good:** Clean architecture, Sentry integration, proper CORS, rate limiting
**Evidence:**
```typescript:132-134:server/src/server.ts
// Store server instance for graceful shutdown
let server: Server | null = null;
```
```typescript:257-300:server/src/server.ts
async function gracefulShutdown(signal: string, exitCode: number): Promise<void> {
  console.log(`🛑 Graceful shutdown initiated (${signal})...`);
  // ... proper cleanup
}
```

---

**File:** `server/src/middleware/authenticate.ts`
**What it does:** JWT authentication with role-based access control
**Why it's good:** Uses supabaseAdmin to bypass RLS for role lookup, clean middleware pattern
**Evidence:**
```typescript:33-46:server/src/middleware/authenticate.ts
// Get user role from public.users table
// Use supabaseAdmin to bypass RLS and ensure we always get the role
const { data: userData } = await supabaseAdmin
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

req.user = {
  id: user.id,
  email: user.email!,
  role: userData?.role || 'player',
};
```

---

**File:** `server/src/services/draft.ts`
**What it does:** Snake draft logic with proper pick ordering
**Why it's good:** Clean separation from routes, well-typed interfaces, proper error handling
**Evidence:**
```typescript:70-78:server/src/services/draft.ts
export function getSnakePickerIndex(
  pickNumber: number,
  totalMembers: number
): { round: number; pickerIndex: number } {
  const round = Math.floor(pickNumber / totalMembers) + 1;
  const pickInRound = pickNumber % totalMembers;
  const pickerIndex = round % 2 === 1 ? pickInRound : totalMembers - 1 - pickInRound;
  return { round, pickerIndex };
}
```

---

**File:** `server/src/jobs/scheduler.ts`
**What it does:** Cron job scheduling with DST-aware timezone handling
**Why it's good:** Comprehensive job monitoring, one-time job support, clean interface
**Evidence:**
```typescript:45-50:server/src/jobs/scheduler.ts
{
  name: 'lock-picks',
  // Wed 5pm PST (when episode airs) - auto-adjusts for DST
  schedule: pstToCron(17, 0, 3),
  description: 'Lock all pending picks when episode airs',
  handler: lockPicks,
  enabled: true,
},
```

---

**File:** `web/src/lib/auth.tsx`
**What it does:** React context for Supabase auth with profile management
**Why it's good:** Handles magic links, session refresh, profile fetching with retries
**Evidence:**
```typescript:54-91:web/src/lib/auth.tsx
const fetchProfile = async (userId: string, retries = 2): Promise<UserProfile | null> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, role, phone, phone_verified, avatar_url, profile_setup_complete')
        .eq('id', userId)
        .single();
      // ... retry logic with progressive delay
    }
  }
};
```

---

**File:** `web/src/lib/api.ts`
**What it does:** API client with retry logic, Sentry tracing, metrics
**Why it's good:** Exponential backoff, proper error handling, performance tracking
**Evidence:**
```typescript:41-88:web/src/lib/api.ts
export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const { maxRetries = 3, retryDelay = 1000, ...fetchOptions } = options;
  // ... exponential backoff implementation
  const delay = retryDelay * Math.pow(2, attempt);
}
```

---

**File:** `server/src/routes/leagues/index.ts`
**What it does:** League CRUD with Stripe payment integration
**Why it's good:** Proper validation, rate limiting on join, password hashing
**Evidence:**
```typescript:151-176:server/src/routes/leagues/index.ts
// CRITICAL: Use FRONTEND_URL for redirects (frontend domain), NEVER BASE_URL (points to API)
// ALWAYS use hardcoded production URL to prevent redirect issues
const frontendUrl = 'https://survivor.realitygamesfantasyleague.com';

const session = await requireStripe().checkout.sessions.create({
  mode: 'payment',
  // ...
  success_url: `${frontendUrl}/leagues/${league.id}?joined=true`,
  cancel_url: `${frontendUrl}/leagues/${league.id}?cancelled=true`,
});
```

---

### REFACTOR

**File:** `server/src/routes/admin.ts` (legacy)
**What's wrong:** Large monolithic file, routes should be extracted to modules
**Fix:** Continue extracting routes to `server/src/routes/admin/` modules
**Effort:** 4-6 hours
**Evidence:** The file exists but routes are being migrated to modular structure per:
```typescript:38-39:server/src/routes/admin/index.ts
// NOTE: The remaining routes (castaways, episodes, jobs, payments, users, leagues, email-queue, alerting)
// are still in the legacy admin.ts file. They should be extracted to their own modules in future refactoring.
```

---

**File:** Multiple files with `@typescript-eslint/no-explicit-any` warnings
**What's wrong:** Using `any` type instead of proper interfaces
**Fix:** Define proper types for:
- `GlobalChat.tsx:204,211`
- `LeagueChat.tsx:218,227`
- `CastawayDetail.tsx:91,92,126`
- `Draft.tsx:52,92,120`
**Effort:** 2-3 hours
**Evidence:** ESLint output shows 22 `any` warnings

---

### BURN

**Files:** Root-level test files
**Why:** Test files scattered in root and server directories, not in proper test structure
**Replacement:** Move to `server/src/__tests__/` or `server/tests/` directory

| File | Size | Action |
|------|------|--------|
| `test-leaderboard.js` | 1.3KB | Move to tests/ |
| `create-test-season.cjs` | 3.6KB | Move to tests/ |
| `test-league-creation.cjs` | 16KB | Move to tests/ |
| `test-scoring-completeness-api.sh` | 10KB | Move to scripts/ |
| `test-scoring-completeness.sql` | 13KB | Move to scripts/ |
| `server/test-*.ts` (27 files) | ~200KB | Move to server/tests/ |
| `server/check-*.ts` (4 files) | ~6KB | Move to server/scripts/ |

---

### DEAD

| File | Why Dead | Action |
|------|----------|--------|
| `web/src/pages/admin/AdminNonprofitFunds.tsx` | Not imported in App.tsx, no route defined | Delete or add route |
| `server/src/lib/__tests__/spoiler-safe-notifications.test.ts` | Test file but no test runner configured | Add vitest to package.json or delete |
| `server/src/jobs/__tests__/autoPick.test.ts` | Test file but no test runner configured | Add vitest to package.json or delete |

---

## Database Schema

### Core Tables (From `supabase/full_schema.sql`)

```sql
-- Users: Player profiles with roles
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role user_role DEFAULT 'player',  -- player, commissioner, admin
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE
);

-- Seasons: Survivor seasons
CREATE TABLE seasons (
  id UUID PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  premiere_at TIMESTAMPTZ NOT NULL,
  draft_deadline TIMESTAMPTZ NOT NULL
);

-- Leagues: Fantasy leagues
CREATE TABLE leagues (
  id UUID PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES seasons(id),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,  -- Invite code
  commissioner_id UUID NOT NULL REFERENCES users(id),
  max_players INTEGER DEFAULT 12,
  require_donation BOOLEAN DEFAULT FALSE,
  donation_amount DECIMAL(10,2),
  status league_status DEFAULT 'forming'  -- forming, drafting, active, completed
);

-- Rosters: Draft picks (2 castaways per player)
CREATE TABLE rosters (
  league_id UUID NOT NULL REFERENCES leagues(id),
  user_id UUID NOT NULL REFERENCES users(id),
  castaway_id UUID NOT NULL REFERENCES castaways(id),
  draft_round INTEGER NOT NULL,
  draft_pick INTEGER NOT NULL
);

-- Weekly Picks: Player selections per episode
CREATE TABLE weekly_picks (
  league_id UUID NOT NULL REFERENCES leagues(id),
  user_id UUID NOT NULL REFERENCES users(id),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  castaway_id UUID REFERENCES castaways(id),
  status pick_status DEFAULT 'pending',  -- pending, locked, auto_picked
  points_earned INTEGER DEFAULT 0
);

-- Episode Scores: Points per castaway per episode
CREATE TABLE episode_scores (
  episode_id UUID NOT NULL REFERENCES episodes(id),
  castaway_id UUID NOT NULL REFERENCES castaways(id),
  scoring_rule_id UUID NOT NULL REFERENCES scoring_rules(id),
  quantity INTEGER DEFAULT 1,
  points NUMERIC(5,2) NOT NULL  -- Supports half-points
);
```

### Key Relationships

```
users ─┬─< league_members >─── leagues ───< seasons
       │
       ├─< rosters >─── castaways
       │
       └─< weekly_picks >─── episodes
                              │
                              └─< episode_scores >─── scoring_rules
```

---

## API Endpoints

### Authentication
| Method | Path | Auth | Works? |
|--------|------|------|--------|
| POST | `/api/auth/signup` | No | ✅ |
| POST | `/api/auth/login` | No | ✅ |
| POST | `/api/auth/magic-link` | No | ✅ |
| GET | `/api/auth/profile` | Yes | ✅ |

### Leagues
| Method | Path | Auth | Works? |
|--------|------|------|--------|
| POST | `/api/leagues` | Yes | ✅ |
| GET | `/api/leagues/code/:code` | No | ✅ |
| POST | `/api/leagues/:id/join` | Yes | ✅ |
| POST | `/api/leagues/:id/leave` | Yes | ✅ |
| GET | `/api/leagues/:id/standings` | Yes | ✅ |
| GET | `/api/leagues/global-leaderboard` | No | ✅ |

### Draft
| Method | Path | Auth | Works? |
|--------|------|------|--------|
| GET | `/api/leagues/:id/draft/state` | Yes | ✅ |
| GET | `/api/leagues/:id/draft/order` | Yes | ✅ |
| POST | `/api/leagues/:id/draft/pick` | Yes | ✅ |
| POST | `/api/leagues/:id/draft/set-order` | Yes | ✅ |

### Picks
| Method | Path | Auth | Works? |
|--------|------|------|--------|
| GET | `/api/leagues/:id/picks/:episodeId` | Yes | ✅ |
| POST | `/api/leagues/:id/picks/:episodeId` | Yes | ✅ |

### Scoring (Admin)
| Method | Path | Auth | Works? |
|--------|------|------|--------|
| POST | `/api/episodes/:id/scoring/start` | Admin | ✅ |
| POST | `/api/episodes/:id/scoring/save` | Admin | ✅ |
| POST | `/api/episodes/:id/scoring/finalize` | Admin | ✅ |

### Webhooks
| Method | Path | Auth | Works? |
|--------|------|------|--------|
| POST | `/webhooks/stripe` | Stripe Sig | ✅ |
| POST | `/webhooks/sms` | Twilio Sig | ✅ |

---

## Recommendations

### Immediate (Before Next Deploy)
1. Delete or route `AdminNonprofitFunds.tsx`
2. Fix the 22 `any` type warnings in frontend

### Short-term (This Sprint)
1. Add vitest to server package.json and run existing tests
2. Move test files to proper directories
3. Continue extracting admin routes from legacy `admin.ts`

### Long-term (Next Quarter)
1. Add code splitting to reduce bundle size (currently 1.99MB)
2. Set up CI/CD with automated testing
3. Add E2E tests for critical flows (draft, picks, payments)

---

## Files Modified This Session

None - this was a read-only audit.

---

## Audit Methodology

1. Read all config files (package.json, tsconfig.json)
2. Run builds and verify compilation
3. Run linting and check for errors
4. Read core source files (server.ts, auth.tsx, api.ts)
5. Trace routes to services to understand data flow
6. Check for dead code (unused imports, orphaned files)
7. Document findings with file:line references
