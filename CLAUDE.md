# Survivor Fantasy League

**Status:** Development Complete, Codebase Refactored
**Launch Target:** Dec 19, 2025 (Registration Opens)
**Last Updated:** Dec 27, 2025

## Project Overview

Fantasy sports app for CBS Survivor TV show. Players draft castaways, make weekly picks, and compete in leagues.

**Current State:**
- 6 major development phases completed (~27,000 lines of code)
- Comprehensive QA testing complete (10 parallel agents)
- Codebase refactored with modular architecture
- Infrastructure, monitoring, and spoiler prevention systems operational

## Tech Stack

| Layer | Technology | Service |
|-------|------------|---------|
| **Frontend** | React + Vite + Tailwind + React Query | Railway |
| **Backend** | Express + TypeScript | Railway (`rgfl-api`) |
| **Database** | PostgreSQL | Supabase |
| **Auth** | Supabase Auth | Supabase |
| **Realtime** | WebSocket subscriptions | Supabase Realtime |
| **Payments** | Stripe Checkout | Stripe |
| **Email** | Resend | Resend |
| **SMS** | Twilio | Twilio |

## Live URLs

| Service | URL |
|---------|-----|
| Web App | https://survivor.realitygamesfantasyleague.com |
| API | https://rgfl-api-production.up.railway.app |
| Health Check | https://rgfl-api-production.up.railway.app/health |

---

## Code Architecture

### Frontend Structure (`/web/src/`)

```
web/src/
├── types/
│   └── index.ts              # Centralized type definitions (ALL types here)
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── auth.ts               # Auth context & hooks
│   ├── api.ts                # API client helpers
│   ├── avatar.ts             # Avatar URL utilities
│   ├── date-utils.ts         # Date formatting utilities
│   ├── game-phase.ts         # Game/weekly phase detection
│   └── hooks/                # Shared React Query hooks
│       ├── index.ts          # All hooks exported here
│       ├── useUser.ts        # useCurrentUser, useUserProfile
│       ├── useSeasons.ts     # useActiveSeason, useSeasons
│       ├── useEpisodes.ts    # useNextEpisode, useCurrentEpisode
│       ├── useCastaways.ts   # useCastaways, useActiveCastaways
│       ├── useLeagues.ts     # useMyLeagues, useLeague, useLeagueMembers
│       ├── useRosters.ts     # useRoster, useMyRosters
│       ├── useScoring.ts     # useScoringRules, useEpisodeScores
│       └── usePicks.ts       # useWeeklyPick, usePicksLocked
├── components/
│   ├── dashboard/            # Dashboard sub-components
│   │   ├── index.ts          # All exports
│   │   ├── WeeklyPhaseBanner.tsx
│   │   ├── AlertBanners.tsx
│   │   ├── QuickActionsGrid.tsx
│   │   ├── StatsRow.tsx
│   │   ├── GlobalRankCard.tsx
│   │   ├── LeagueCard.tsx
│   │   ├── SeasonInfoCard.tsx
│   │   ├── WeeklyTimelineCard.tsx
│   │   └── QuickLinksCard.tsx
│   ├── admin/
│   │   ├── scoring/          # AdminScoring sub-components
│   │   │   ├── index.ts
│   │   │   ├── ScoringRuleRow.tsx
│   │   │   ├── FinalizeModal.tsx
│   │   │   ├── FinalizeResultModal.tsx
│   │   │   ├── CastawayList.tsx
│   │   │   └── CastawayHeader.tsx
│   │   ├── TimelineFeed.tsx
│   │   ├── StatsGrid.tsx
│   │   └── SystemHealthBanner.tsx
│   ├── Navigation.tsx
│   ├── Footer.tsx
│   └── SpoilerWarning.tsx
└── pages/
    ├── Dashboard.tsx         # Uses dashboard/ components
    ├── Home.tsx              # 919 lines - NEEDS REFACTORING
    ├── LeagueHome.tsx        # 770 lines - NEEDS REFACTORING
    ├── WeeklyPick.tsx        # 769 lines - NEEDS REFACTORING
    ├── Draft.tsx             # 725 lines - NEEDS REFACTORING
    └── admin/
        ├── AdminScoring.tsx  # Uses admin/scoring/ components
        └── ...
```

### Backend Structure (`/server/src/`)

```
server/src/
├── server.ts                 # Entry point, error handlers
├── config/
│   ├── supabase.ts           # Supabase clients (admin + anon)
│   ├── stripe.ts             # Stripe client
│   ├── twilio.ts             # Twilio client
│   └── resend.ts             # Resend client
├── routes/
│   ├── admin.ts              # Mounts admin sub-routers
│   ├── admin/
│   │   ├── dashboard.ts      # /api/admin/dashboard/*
│   │   └── seasons.ts        # /api/admin/seasons/*
│   ├── leagues/              # Modular league routes
│   │   ├── index.ts          # Core routes (create, join, leave)
│   │   ├── payments.ts       # Stripe checkout
│   │   ├── members.ts        # Member management
│   │   └── leaderboard.ts    # Global leaderboard
│   ├── draft.ts              # 452 lines - Could split
│   ├── scoring.ts            # 432 lines - Could split
│   ├── picks.ts              # 409 lines - Could split
│   └── webhooks.ts           # Uses services/sms/
├── services/
│   ├── sms/
│   │   ├── index.ts          # SMS service exports
│   │   └── commands.ts       # PICK, STATUS, TEAM, STOP handlers
│   ├── adminDashboard.ts     # Dashboard business logic
│   ├── health.ts             # Health check logic
│   └── elimination.ts        # Elimination notifications
├── jobs/
│   ├── scheduler.ts          # Cron job definitions
│   ├── jobMonitor.ts         # Execution tracking
│   ├── jobAlerting.ts        # Email/SMS alerts
│   ├── autoPick.ts           # Auto-pick job
│   └── releaseResults.ts     # Friday 2pm results release
├── middleware/
│   ├── auth.ts               # JWT verification
│   └── rateLimit.ts          # Rate limiting
├── emails/                   # Email templates
└── lib/
    ├── api-response.ts       # Standardized API responses
    ├── email-queue.ts        # Queue with retry logic
    ├── season-config.ts      # Database-driven season dates
    └── timezone.ts           # PST/PDT handling with Luxon
```

---

## Development Guidelines

### Type Usage (Frontend)

**Always import types from `@/types`:**
```typescript
// ✅ CORRECT
import type { Season, Episode, League, UserProfile } from '@/types';

// ❌ WRONG - Don't define inline types
interface Season { id: string; ... }
```

### React Query Hooks

**Use shared hooks from `@/lib/hooks`:**
```typescript
// ✅ CORRECT
import { useActiveSeason, useMyLeagues, useCurrentUser } from '@/lib/hooks';

const { data: season } = useActiveSeason();
const { data: leagues } = useMyLeagues(user?.id);

// ❌ WRONG - Don't write inline queries
const { data: season } = useQuery({
  queryKey: ['activeSeason'],
  queryFn: async () => { ... } // 10+ lines of boilerplate
});
```

### Date Formatting

**Use `@/lib/date-utils`:**
```typescript
import { formatDate, getCountdownText, formatRelativeTime } from '@/lib/date-utils';

formatDate('2025-12-27T20:00:00Z');     // "Dec 27, 2025"
getCountdownText(new Date('2025-12-30')); // "3d 5h"
formatRelativeTime(new Date());           // "Just now"
```

### Game Phase Detection

**Use `@/lib/game-phase`:**
```typescript
import { getGamePhase, getWeeklyPhase } from '@/lib/game-phase';

const gamePhase = getGamePhase(season, nextEpisode);
// Returns: 'pre_registration' | 'registration' | 'pre_draft' | 'draft' | 'active' | 'post_season'

const weeklyPhase = getWeeklyPhase(episode, previousEpisode);
// Returns: WeeklyPhaseInfo with phase, label, description, ctaPath, countdown
```

### API Response Helpers (Backend)

**Use `lib/api-response.ts`:**
```typescript
import { sendSuccess, sendError, sendNotFound, sendForbidden } from '../lib/api-response.js';

// Success responses
sendSuccess(res, data);                    // 200
sendCreated(res, data);                    // 201

// Error responses
sendValidationError(res, 'Invalid input'); // 400
sendForbidden(res, 'Not authorized');      // 403
sendNotFound(res, 'League');               // 404
sendInternalError(res, 'Database failed'); // 500
```

### Component Extraction Pattern

When a page exceeds ~400 lines, extract sub-components:

```typescript
// components/dashboard/index.ts - Export all from one place
export { WeeklyPhaseBanner } from './WeeklyPhaseBanner';
export { StatsRow } from './StatsRow';
// ...

// pages/Dashboard.tsx - Clean imports
import { WeeklyPhaseBanner, StatsRow, LeagueCard } from '@/components/dashboard';
```

### Route Modularization Pattern (Backend)

Split large route files by domain:

```typescript
// routes/leagues/index.ts - Main router
import membersRouter from './members.js';
import paymentsRouter from './payments.js';

router.use('/members', membersRouter);
router.use('/payments', paymentsRouter);

export default router;
```

---

## Files Needing Refactoring

### High Priority (>700 lines)

| File | Lines | Recommendation |
|------|-------|----------------|
| `pages/Home.tsx` | 919 | Extract HeroSection, FeatureGrid, HowToPlay, Testimonials |
| `pages/LeagueHome.tsx` | 770 | Extract LeagueHeader, StandingsTable, RosterPanel |
| `pages/WeeklyPick.tsx` | 769 | Extract PickCard, RosterDisplay, LockCountdown |
| `pages/Draft.tsx` | 725 | Extract DraftBoard, PickQueue, DraftTimer |
| `pages/LeagueSettings.tsx` | 709 | Extract SettingsForm, MemberManagement, DangerZone |
| `routes/admin.ts` | 834 | Continue splitting into admin/* modules |

### Medium Priority (500-700 lines)

| File | Lines | Recommendation |
|------|-------|----------------|
| `pages/Profile.tsx` | 694 | Extract ProfileForm, NotificationSettings |
| `pages/admin/AdminCastaways.tsx` | 676 | Extract CastawayGrid, EditModal |
| `pages/admin/AdminUsers.tsx` | 586 | Extract UserTable, UserFilters |
| `pages/Castaways.tsx` | 571 | Extract CastawayCard, FilterBar |
| `pages/admin/AdminScoringGrid.tsx` | 560 | Extract GridRow, CategoryHeader |

### Backend Route Candidates

| File | Lines | Recommendation |
|------|-------|----------------|
| `routes/draft.ts` | 452 | Extract draft logic to services/draft.ts |
| `routes/scoring.ts` | 432 | Extract scoring logic to services/scoring.ts |
| `routes/picks.ts` | 409 | Extract pick validation to services/picks.ts |
| `routes/notifications.ts` | 408 | Consider splitting by notification type |

---

## Available Hooks Reference

### User Hooks (`useUser.ts`)
```typescript
useCurrentUser()                    // Current auth user's profile
useUserProfile(userId)              // Any user by ID
useNotificationPreferences(userId)  // User's notification settings
```

### Season Hooks (`useSeasons.ts`)
```typescript
useActiveSeason()          // Current active season
useSeasons()               // All seasons
useSeason(seasonId)        // Specific season
```

### Episode Hooks (`useEpisodes.ts`)
```typescript
useEpisodes(seasonId)           // All episodes for season
useNextEpisode(seasonId)        // Next upcoming episode
useCurrentEpisode(seasonId)     // Current/active episode
useEpisode(episodeId)           // Specific episode
usePreviousEpisode(seasonId)    // Most recent scored episode
```

### Castaway Hooks (`useCastaways.ts`)
```typescript
useCastaways(seasonId)           // All castaways
useActiveCastaways(seasonId)     // Only active (not eliminated)
useCastaway(castawayId)          // Specific castaway
useEliminatedCastaways(seasonId) // Only eliminated
```

### League Hooks (`useLeagues.ts`)
```typescript
useMyLeagues(userId)                        // User's league memberships
useLeague(leagueId)                         // Specific league
useLeagueMembers(leagueId)                  // All members with standings
useLeagueMembership(leagueId, userId)       // User's membership in league
useGlobalLeague(seasonId)                   // The global league
```

### Roster Hooks (`useRosters.ts`)
```typescript
useRoster(leagueId, userId)    // User's roster in league
useLeagueRosters(leagueId)     // All rosters in league
useMyRosters(userId)           // All user's rosters across leagues
useRosterComplete(leagueId, userId) // Has 2 castaways?
```

### Scoring Hooks (`useScoring.ts`)
```typescript
useScoringRules(seasonId)              // All scoring rules
useScoringRulesByCategory(seasonId)    // Rules grouped by category
useEpisodeScores(episodeId)            // All scores for episode
useEpisodeCastawayScores(episodeId)    // Scores per castaway
useUserLeaguePoints(leagueId, userId)  // User's points in league
```

### Pick Hooks (`usePicks.ts`)
```typescript
useWeeklyPick(leagueId, userId, episodeId)  // Specific pick
useUserLeaguePicks(leagueId, userId)        // All user picks in league
useEpisodePicks(leagueId, episodeId)        // All picks for episode
usePicksLocked(episodeId)                   // Are picks locked?
useCurrentPickStatus(leagueId, userId)      // Current episode pick status
```

---

## Key Configuration

### Railway
- **Project:** `rgfl-survivor`
- **Service:** `rgfl-api` (deploys from `/server`)
- **Deploy:** `cd server && railway up --detach`

### Supabase
- **Project Ref:** `qxrgejdfxcvsfktgysop`
- **MCP Server:** `https://mcp.supabase.com/mcp?project_ref=qxrgejdfxcvsfktgysop`

### Key Dates (Season 50)

| Event | Date | Time (PST) |
|-------|------|------------|
| Registration Opens | Dec 19, 2025 | 12:00 PM |
| Draft Order Deadline | Jan 5, 2026 | 12:00 PM |
| Premiere | Feb 25, 2026 | 8:00 PM |
| Draft Deadline | Mar 2, 2026 | 8:00 PM |
| Finale | May 27, 2026 | 8:00 PM |

### Weekly Rhythm

```
Wednesday 3:00 PM PST  →  Picks lock (auto-pick job runs)
Wednesday 8:00 PM EST  →  Episode airs
Friday 2:00 PM PST     →  Results released (spoiler-safe notifications)
```

---

## Commands

```bash
# Development
cd server && npm run dev        # Start API server
cd web && npm run dev           # Start web frontend

# Build
cd server && npm run build      # Build TypeScript
cd web && npm run build         # Build React app

# Deploy
cd server && railway up --detach  # Deploy API to Railway

# Database
npx supabase db push            # Push migrations
npx supabase gen types          # Generate TypeScript types
```

---

## Game Rules

| Mechanic | Rule |
|----------|------|
| Roster Size | 2 castaways per player - FIXED for entire season |
| Draft | After Episode 1: Users rank preferences, snake draft assigns 2 castaways |
| Weekly Picks | 1 castaway from your 2-person roster per week, locks Wed 3pm |
| Auto-Pick | System picks highest-ranked available from YOUR roster if missed |
| Elimination | When both castaways eliminated, your torch is snuffed (out of league) |
| NO ROSTER CHANGES | You keep your 2 castaways all season |
| Scoring | 100+ rules, admin enters per episode |
| Private Leagues | 12 players max, code-based join |
| Global League | All users auto-enrolled |

---

## Critical Constraints

1. **Picks lock Wed 3pm PST** — Cannot be undone, auto-pick runs
2. **Draft happens ONCE after Episode 1** — Users rank preferences, snake draft assigns 2 castaways
3. **Draft deadline is hard** — Auto-complete triggers at Mar 2 8pm
4. **NO ROSTER CHANGES** — Your 2 castaways are FIXED for entire season
5. **Both eliminated = Torch snuffed** — You're out of the league
6. **Results release Friday 2pm PST** — Automated spoiler-safe notifications
7. **All times in PST/PDT** — Use Luxon for timezone handling
8. **RLS enforced** — Backend uses service role for system ops

---

## API Routes

### Health & Status
```
GET  /health                    → { status: 'ok' }
```

### Auth & Profile
```
GET   /api/me                   → Current user + leagues
PATCH /api/me/phone             → Update phone
PATCH /api/me/notifications     → Update preferences
```

### Leagues
```
POST  /api/leagues              → Create league
POST  /api/leagues/:id/join     → Join league
GET   /api/leagues/:id/standings → League standings
```

### Draft
```
GET   /api/leagues/:id/draft/state  → Draft state
POST  /api/leagues/:id/draft/pick   → Make pick
```

### Weekly Picks
```
POST  /api/leagues/:id/picks        → Submit pick
GET   /api/leagues/:id/picks/current → Current week status
```

### Scoring (Admin)
```
POST  /api/episodes/:id/scoring/start    → Begin session
POST  /api/episodes/:id/scoring/save     → Save progress
POST  /api/episodes/:id/scoring/finalize → Finalize scores
```

### Admin Dashboard
```
GET   /api/admin/timeline          → Upcoming events
GET   /api/admin/stats             → Platform stats
GET   /api/admin/system-health     → System diagnostics
GET   /api/admin/jobs/history      → Job execution history
```

### Webhooks
```
POST  /webhooks/sms      → Twilio inbound (uses services/sms/)
POST  /webhooks/stripe   → Stripe events
```

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| users | Accounts, links to Supabase Auth |
| seasons | Season metadata, key dates (database-driven) |
| episodes | 14 per season, air dates, deadlines |
| castaways | Up to 24 per season, status |
| leagues | User-created + global league |
| league_members | Players in leagues, standings |
| rosters | Draft results (2 per player) |
| weekly_picks | 1 pick per player per week |
| scoring_rules | 100+ rules with point values |
| episode_scores | Scores per castaway per rule |

**24 Tables** | **3 RPC Functions** | **32 Indexes** | **24 Migrations**
