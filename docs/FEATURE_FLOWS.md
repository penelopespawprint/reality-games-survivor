# RGFL Feature Flows

> **Complete mapping of how each feature works end-to-end.**
> **Last Updated:** 2026-01-10

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [League Management](#2-league-management)
3. [Draft System](#3-draft-system)
4. [Weekly Picks](#4-weekly-picks)
5. [Episode Scoring](#5-episode-scoring)
6. [Leaderboards](#6-leaderboards)
7. [Payment Processing](#7-payment-processing)
8. [Email System](#8-email-system)
9. [SMS Commands](#9-sms-commands)
10. [Trivia Game](#10-trivia-game)
11. [Scheduled Jobs](#11-scheduled-jobs)
12. [Admin Dashboard](#12-admin-dashboard)

---

## 1. Authentication Flow

### Overview
Users authenticate via Supabase Auth with email/password, magic links, or Google OAuth.

### Flow Diagram
```
User → Login Page → Supabase Auth → JWT Token → AuthProvider → Protected Routes
                         ↓
                    users table (profile created via trigger)
```

### Key Files
| File | Purpose |
|------|---------|
| `web/src/pages/Login.tsx` | Login form UI |
| `web/src/pages/Signup.tsx` | Registration form UI |
| `web/src/lib/auth.tsx` | AuthProvider context, session management |
| `web/src/lib/supabase.ts` | Supabase client initialization |
| `server/src/middleware/authenticate.ts` | JWT verification middleware |
| `supabase/full_schema.sql:25-39` | users table schema |

### Data Flow
1. **User submits credentials** → `Login.tsx` calls `supabase.auth.signInWithPassword()`
2. **Supabase validates** → Returns JWT token + user object
3. **AuthProvider receives** → `onAuthStateChange` fires with `SIGNED_IN` event
4. **Profile fetched** → `fetchProfile()` gets user data from `users` table
5. **State updated** → `user`, `profile`, `session` set in context
6. **Routes unlock** → `ProtectedRoute` allows access based on auth state

### Profile Setup Flow
```
New User → Signup → Supabase creates auth.users row
                         ↓
              Database trigger creates users row
                         ↓
              AuthProvider detects profile_setup_complete = false
                         ↓
              Redirect to /profile/setup
                         ↓
              User completes setup → profile_setup_complete = true
```

### Role-Based Access
| Role | Access Level |
|------|--------------|
| `player` | Standard user features |
| `commissioner` | League management for owned leagues |
| `admin` | Full admin dashboard access |

---

## 2. League Management

### Overview
Users create or join fantasy leagues for a Survivor season. Each league has a commissioner, invite code, and optional payment requirement.

### Flow Diagram
```
Create League:
User → CreateLeague.tsx → POST /api/leagues → leagues table
                                    ↓
                         league_members (commissioner added)
                                    ↓
                         Email: league-created.ts

Join League:
User → JoinLeague.tsx → GET /api/leagues/code/:code (lookup)
                              ↓
                    POST /api/leagues/:id/join
                              ↓
                    (if paid) → Stripe Checkout → webhook → league_members
                    (if free) → league_members directly
```

### Key Files
| File | Purpose |
|------|---------|
| `web/src/pages/CreateLeague.tsx` | League creation form |
| `web/src/pages/JoinLeague.tsx` | Join by code UI |
| `web/src/pages/Leagues.tsx` | Browse/search leagues |
| `web/src/pages/LeagueHome.tsx` | League dashboard |
| `server/src/routes/leagues/index.ts` | CRUD operations |
| `server/src/routes/leagues/payments.ts` | Stripe checkout |
| `server/src/routes/leagues/members.ts` | Member management |

### Database Tables
```sql
leagues (
  id, name, code, season_id, commissioner_id,
  max_players, is_public, is_global,
  require_donation, donation_amount,
  status: forming → drafting → active → completed
)

league_members (
  league_id, user_id, draft_position, total_points, rank
)
```

### League States
| Status | Description |
|--------|-------------|
| `forming` | Accepting members, no draft yet |
| `drafting` | Draft in progress |
| `active` | Season ongoing, picks enabled |
| `completed` | Season finished |

---

## 3. Draft System

### Overview
Snake draft where each player selects 2 castaways. Order is randomized or set by commissioner. Auto-completes at deadline.

### Flow Diagram
```
Pre-Draft:
User → DraftRankings.tsx → Save rankings → draft_rankings table
                                    ↓
             At deadline: autoRandomizeRankings job fills missing

Draft:
Commissioner → Start Draft → league.draft_status = 'in_progress'
                                    ↓
Players take turns → POST /api/leagues/:id/draft/pick
                                    ↓
                     rosters table (castaway assigned)
                                    ↓
             When all picks done → draft_status = 'completed'
                                    ↓
                     Email: draft-complete.ts
```

### Key Files
| File | Purpose |
|------|---------|
| `web/src/pages/Draft.tsx` | Live draft UI |
| `web/src/pages/DraftRankings.tsx` | Pre-draft ranking |
| `web/src/pages/DraftSettings.tsx` | Commissioner controls |
| `server/src/services/draft.ts` | Draft business logic |
| `server/src/routes/draft.ts` | Draft API endpoints |
| `server/src/jobs/finalizeDrafts.ts` | Auto-complete job |
| `server/src/jobs/autoRandomizeRankings.ts` | Fill missing rankings |

### Snake Draft Logic
```typescript
// server/src/services/draft.ts:70-78
function getSnakePickerIndex(pickNumber, totalMembers) {
  const round = Math.floor(pickNumber / totalMembers) + 1;
  const pickInRound = pickNumber % totalMembers;
  // Odd rounds: 0,1,2... Even rounds: ...2,1,0
  const pickerIndex = round % 2 === 1 ? pickInRound : totalMembers - 1 - pickInRound;
  return { round, pickerIndex };
}
```

### Database Tables
```sql
rosters (
  league_id, user_id, castaway_id,
  draft_round, draft_pick,
  acquired_via: 'draft' | 'waiver'
)

draft_rankings (
  user_id, season_id, rankings: JSONB [castaway_ids]
)
```

---

## 4. Weekly Picks

### Overview
Each week, players select one of their rostered castaways to earn points. Picks lock when the episode airs.

### Flow Diagram
```
Pick Flow:
User → WeeklyPick.tsx → POST /api/leagues/:id/picks/:episodeId
                              ↓
                    weekly_picks table (status: pending)
                              ↓
        At air time: lockPicks job → status: locked
                              ↓
        If no pick: autoPick job → status: auto_picked
```

### Key Files
| File | Purpose |
|------|---------|
| `web/src/pages/WeeklyPick.tsx` | Pick selection UI |
| `web/src/components/picks/` | Pick components |
| `server/src/routes/picks.ts` | Pick API |
| `server/src/services/picks.ts` | Pick business logic |
| `server/src/jobs/lockPicks.ts` | Lock at air time |
| `server/src/jobs/autoPick.ts` | Fill missing picks |
| `server/src/jobs/sendReminders.ts` | Pick reminders |

### Pick States
| Status | Description |
|--------|-------------|
| `pending` | Can be changed |
| `locked` | Episode aired, no changes |
| `auto_picked` | System selected for user |

### Database Tables
```sql
weekly_picks (
  league_id, user_id, episode_id, castaway_id,
  status, points_earned,
  picked_at, locked_at
)
```

### Auto-Pick Logic
```typescript
// server/src/jobs/autoPick.ts
// Selects the first active castaway from user's roster
// that hasn't been eliminated
```

---

## 5. Episode Scoring

### Overview
Admin enters scores per castaway per episode. Scores are calculated based on scoring rules, then propagated to player standings.

### Flow Diagram
```
Scoring Flow:
Admin → AdminScoring.tsx → POST /api/episodes/:id/scoring/start
                                 ↓
                    scoring_sessions table (status: draft)
                                 ↓
        Enter scores → POST /api/episodes/:id/scoring/save
                                 ↓
                    episode_scores table
                                 ↓
        Finalize → POST /api/episodes/:id/scoring/finalize
                                 ↓
                    scoring_sessions.status = 'finalized'
                                 ↓
                    episodes.is_scored = true
                                 ↓
                    Recalculate standings for all leagues
                                 ↓
                    Email: episode-results.ts
```

### Key Files
| File | Purpose |
|------|---------|
| `web/src/pages/admin/AdminScoring.tsx` | List view scoring |
| `web/src/pages/admin/AdminScoringGrid.tsx` | Grid view scoring |
| `web/src/pages/admin/AdminScoringRules.tsx` | Configure rules |
| `server/src/services/scoring.ts` | Scoring business logic |
| `server/src/routes/scoring.ts` | Scoring API |
| `server/src/jobs/sendResults.ts` | Results notifications |

### Scoring Rules
```sql
scoring_rules (
  season_id, code, name, description,
  points: NUMERIC(5,2),  -- Supports 0.5 points
  category, is_negative, sort_order
)

-- Example rules:
-- RAND_CONFESSIONAL: 0.5 points per confessional
-- PRE_TEAM_IMMUNITY_WIN: 2 points
-- POST_SNUFFED: -5 points
```

### Score Calculation
```
Player Weekly Score = SUM(episode_scores for picked castaway)
Player Total Score = SUM(weekly scores across all episodes)
```

---

## 6. Leaderboards

### Overview
Rankings within leagues and globally across all leagues. Global uses weighted scoring to account for league count.

### Flow Diagram
```
League Leaderboard:
LeagueHome.tsx → GET /api/leagues/:id/standings
                       ↓
                 league_members table (sorted by total_points)

Global Leaderboard:
GlobalLeaderboard.tsx → GET /api/leagues/global-leaderboard
                              ↓
                 weightedRankings service
                              ↓
                 Calculates confidence-adjusted scores
```

### Key Files
| File | Purpose |
|------|---------|
| `web/src/pages/Leaderboard.tsx` | League leaderboard |
| `web/src/pages/GlobalLeaderboard.tsx` | Cross-league rankings |
| `server/src/routes/leagues/leaderboard.ts` | Leaderboard API |
| `server/src/services/weightedRankings.ts` | Global ranking algorithm |

### Weighted Ranking Algorithm
```typescript
// server/src/services/weightedRankings.ts
function calculateConfidence(leagueCount) {
  if (leagueCount === 1) return 0.33;
  if (leagueCount === 2) return 0.55;
  if (leagueCount === 3) return 0.70;
  return 1 - (1 / (leagueCount + 1));
}

weightedScore = (rawAverage * confidence) + (globalMean * (1 - confidence))
```

---

## 7. Payment Processing

### Overview
Stripe handles payments for paid leagues. Webhooks confirm payment and add user to league.

### Flow Diagram
```
Payment Flow:
User → Join Paid League → POST /api/leagues/:id/join/checkout
                                ↓
                    Stripe Checkout Session created
                                ↓
                    Redirect to Stripe
                                ↓
                    User pays → Stripe webhook fires
                                ↓
                    POST /webhooks/stripe
                                ↓
                    payments table updated (status: completed)
                                ↓
                    league_members row created
                                ↓
                    Email: payment-confirmed.ts
```

### Key Files
| File | Purpose |
|------|---------|
| `server/src/routes/leagues/payments.ts` | Checkout creation |
| `server/src/routes/webhooks.ts` | Stripe webhook handler |
| `server/src/config/stripe.ts` | Stripe client |
| `server/src/lib/stripe-helpers.ts` | Payment utilities |

### Database Tables
```sql
payments (
  user_id, league_id, amount, currency,
  stripe_session_id, stripe_payment_intent_id,
  status: pending → completed | refunded | failed
)
```

### Refund Flow
```
User leaves before draft → POST /api/leagues/:id/leave
                                ↓
                    Check draft_status = 'pending'
                                ↓
                    Stripe refund created
                                ↓
                    payments.status = 'refunded'
                                ↓
                    Email: refund-issued.ts
```

---

## 8. Email System

### Overview
Transactional emails via Resend with queue-based sending and retry logic.

### Flow Diagram
```
Email Flow:
Any service → EmailService.sendXxx()
                    ↓
              enqueueEmail()
                    ↓
              email_queue table
                    ↓
        Every 5 min: processEmailQueue job
                    ↓
              Resend API
                    ↓
              email_queue.status = 'sent' | 'failed'
```

### Key Files
| File | Purpose |
|------|---------|
| `server/src/emails/service.ts` | EmailService class |
| `server/src/emails/base.ts` | Base template |
| `server/src/emails/transactional/` | Transaction emails |
| `server/src/emails/reminders/` | Reminder emails |
| `server/src/emails/results/` | Results emails |
| `server/src/lib/email-queue.ts` | Queue processing |
| `server/src/config/email.ts` | Resend client |

### Email Types
| Type | Trigger |
|------|---------|
| `welcome.ts` | User signup |
| `league-created.ts` | League creation |
| `league-joined.ts` | Join league |
| `draft-complete.ts` | Draft finished |
| `pick-reminder.ts` | Before pick deadline |
| `pick-confirmed.ts` | Pick submitted |
| `episode-results.ts` | Scores finalized |
| `payment-confirmed.ts` | Payment success |
| `refund-issued.ts` | Refund processed |

---

## 9. SMS Commands

### Overview
Users can interact via SMS through Twilio. Commands include checking scores, making picks, and getting help.

### Flow Diagram
```
SMS Flow:
User sends SMS → Twilio → POST /webhooks/sms
                               ↓
                    sms_commands table (logged)
                               ↓
                    SMSService.handleCommand()
                               ↓
                    Response sent via Twilio
```

### Key Files
| File | Purpose |
|------|---------|
| `server/src/routes/webhooks.ts` | SMS webhook |
| `server/src/services/sms/commands.ts` | Command handlers |
| `server/src/config/twilio.ts` | Twilio client |
| `web/src/pages/SMSCommands.tsx` | Help page |

### Available Commands
| Command | Response |
|---------|----------|
| `HELP` | List of commands |
| `SCORE` | Current standings |
| `PICK [name]` | Make weekly pick |
| `TEAM` | Your roster |
| `STOP` | Opt out of SMS |
| `START` | Opt back in |

---

## 10. Trivia Game

### Overview
Daily trivia questions about Survivor. Users earn points and can see leaderboard.

### Flow Diagram
```
Trivia Flow:
User → Trivia.tsx → GET /api/trivia/next
                         ↓
                    daily_trivia_questions table
                         ↓
        Answer → POST /api/trivia/answer
                         ↓
                    trivia_progress table
                         ↓
                    GET /api/trivia/leaderboard
```

### Key Files
| File | Purpose |
|------|---------|
| `web/src/pages/Trivia.tsx` | Trivia game UI |
| `web/src/components/trivia/` | Trivia components |
| `server/src/routes/trivia.ts` | Trivia API |
| `supabase/migrations/067_update_trivia_with_castaway_facts.sql` | Questions |

### Database Tables
```sql
daily_trivia_questions (
  question_number, question, options: TEXT[],
  correct_index, fun_fact
)

trivia_progress (
  user_id, question_number, answered_correctly, answered_at
)
```

---

## 11. Scheduled Jobs

### Overview
Cron jobs handle automated tasks like locking picks, sending reminders, and processing emails.

### Job Schedule
```
┌─────────────────────────────────────────────────────────────┐
│  Every 5 min: email-queue-processor                         │
│  Every 10 min: release-results                              │
├─────────────────────────────────────────────────────────────┤
│  Daily 9am PST: draft-reminders                             │
│  Daily 10am PST: join-league-nudge                          │
│  Daily 11am PST: nurture-trivia-completers                  │
│  Daily 12pm PST: pre-season-hype                            │
│  Daily 3pm PST: trivia-progress                             │
│  Daily midnight PST: daily-stats-capture                    │
├─────────────────────────────────────────────────────────────┤
│  Wed 2pm PST: pick-reminders                                │
│  Wed 5pm PST: lock-picks                                    │
│  Wed 5:05pm PST: auto-pick                                  │
├─────────────────────────────────────────────────────────────┤
│  Fri 8am PST: results-notification                          │
├─────────────────────────────────────────────────────────────┤
│  Sun 3am PST: cleanup-lifecycle-email-logs                  │
│  Sun 10am PST: weekly-summary                               │
│  Sun 12pm PST: weekly-system-report                         │
└─────────────────────────────────────────────────────────────┘
```

### Key Files
| File | Purpose |
|------|---------|
| `server/src/jobs/scheduler.ts` | Job definitions |
| `server/src/jobs/jobMonitor.ts` | Execution monitoring |
| `server/src/jobs/jobAlerting.ts` | Failure alerts |
| `server/src/lib/timezone-utils.ts` | DST-aware scheduling |

### One-Time Jobs
```
auto-randomize-rankings: At draft_order_deadline
draft-finalize: At draft_deadline
```

---

## 12. Admin Dashboard

### Overview
Comprehensive admin interface for managing all aspects of the fantasy league.

### Admin Pages
| Page | Route | Purpose |
|------|-------|---------|
| Command Center | `/admin/command-center` | Main dashboard |
| Scoring | `/admin/scoring` | Enter episode scores |
| Scoring Grid | `/admin/scoring/grid` | Bulk score entry |
| Scoring Rules | `/admin/scoring-rules` | Configure points |
| Seasons | `/admin/seasons` | Manage seasons |
| Episodes | `/admin/seasons/:id/episodes` | Episode management |
| Castaways | `/admin/castaways` | Castaway data |
| Leagues | `/admin/leagues` | All leagues |
| Users | `/admin/users` | User management |
| Payments | `/admin/payments` | Payment history |
| Jobs | `/admin/jobs` | Job monitoring |
| Email Queue | `/admin/email-queue` | Email status |
| Analytics | `/admin/stats` | System metrics |
| Content | `/admin/content` | CMS management |
| Announcements | `/admin/announcements` | Site announcements |

### Key Files
| File | Purpose |
|------|---------|
| `web/src/pages/admin/` | Admin page components |
| `web/src/components/admin/` | Admin UI components |
| `server/src/routes/admin/` | Admin API routes |
| `server/src/services/admin-dashboard.ts` | Dashboard data |
| `server/src/services/admin-stats.ts` | Analytics |

### Access Control
```typescript
// server/src/middleware/authenticate.ts
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

---

## Quick Reference: API Endpoints

### Public
```
GET  /health
GET  /api/leagues/code/:code
GET  /api/leagues/global-leaderboard
POST /webhooks/stripe
POST /webhooks/sms
```

### Authenticated
```
POST /api/leagues
POST /api/leagues/:id/join
POST /api/leagues/:id/leave
GET  /api/leagues/:id/standings
GET  /api/leagues/:id/draft/state
POST /api/leagues/:id/draft/pick
GET  /api/leagues/:id/picks/:episodeId
POST /api/leagues/:id/picks/:episodeId
GET  /api/trivia/next
POST /api/trivia/answer
```

### Admin Only
```
POST /api/episodes/:id/scoring/start
POST /api/episodes/:id/scoring/save
POST /api/episodes/:id/scoring/finalize
GET  /api/admin/dashboard/*
POST /api/admin/jobs/run/:jobName
```
