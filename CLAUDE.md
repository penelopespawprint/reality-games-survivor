# Survivor Fantasy League

**Status:** Development Complete, QA Testing Complete, Critical Bugs Identified
**Launch Target:** Dec 19, 2025 (Registration Opens)
**Last Updated:** Dec 27, 2025

## Project Overview

Fantasy sports app for CBS Survivor TV show. Players draft castaways, make weekly picks, and compete in leagues.

**Current State:**
- 6 major development phases completed (27,000+ lines of code)
- Comprehensive QA testing complete (10 parallel agents)
- 10 critical bugs identified and documented
- Infrastructure, monitoring, and spoiler prevention systems operational

See `/COMPLETE_SUMMARY.md` for full project status and detailed findings.

## Tech Stack

| Layer | Technology | Service |
|-------|------------|---------|
| **Frontend** | React + Vite + Tailwind | Railway |
| **Backend** | Express + TypeScript | Railway (`rgfl-api`) |
| **Database** | PostgreSQL | Supabase |
| **Auth** | Supabase Auth | Supabase |
| **Realtime** | WebSocket subscriptions | Supabase Realtime |
| **Payments** | Stripe Checkout | Stripe |
| **Email** | Resend | Resend |
| **SMS** | Twilio | Twilio |
| **DNS** | Dynu | Dynu |
| **Hosting** | Railway | Railway |

## Live URLs

| Service | URL |
|---------|-----|
| Web App | https://survivor.realitygamesfantasyleague.com |
| API | https://rgfl-api-production.up.railway.app |
| Health Check | https://rgfl-api-production.up.railway.app/health |

## Railway Configuration

**Project:** `rgfl-survivor`
**Services:**
- `rgfl-api` - Express backend (deploys from `/server`)

**Deploy Command:**
```bash
cd server && railway up --detach
```

## Supabase Configuration

**Project Ref:** `qxrgejdfxcvsfktgysop`
**MCP Server:** `https://mcp.supabase.com/mcp?project_ref=qxrgejdfxcvsfktgysop`

## Dynu DNS Configuration

Dynu manages DNS for all domains. Configure via API or dashboard.

**Domains:**
- `realitygamesfantasyleague.com` - Main domain
- `survivor.realitygamesfantasyleague.com` - App subdomain
- `rgfl.app` - Short URL (redirects)
- `rgflapp.com` - Alt domain (redirects)

**DNS Script:** `scripts/configure-dynu-dns.sh`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│           React Web (Vite + Tailwind)  |  SMS Commands          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Supabase    │    │  Express API  │    │    Twilio     │
│               │    │   (Railway)   │    │   (Webhooks)  │
│ • Auth        │    │               │    │               │
│ • REST API    │    │ • Scoring     │    │ • PICK cmd    │
│ • Realtime    │    │ • Draft algo  │    │ • STATUS cmd  │
│ • RLS         │    │ • Jobs        │    │ • TEAM cmd    │
│               │    │ • Monitoring  │    │               │
│               │    │ • Alerts      │    │               │
└───────┬───────┘    └───────┬───────┘    └───────────────┘
        │                    │
        └────────┬───────────┘
                 ▼
        ┌───────────────┐        ┌───────────────┐
        │   PostgreSQL  │◄──────►│  Resend Email │
        │  (Supabase)   │        └───────────────┘
        │ • 24 tables   │        ┌───────────────┐
        │ • 3 RPC funcs │◄──────►│ Stripe Payment│
        │ • 32 indexes  │        └───────────────┘
        └───────────────┘
```

## Folder Structure

```
rgfl-survivor/
├── server/                   # Express API (Railway) - ~15,000 lines
│   ├── src/
│   │   ├── server.ts         # Entry point with error handlers
│   │   ├── config/           # Supabase, Stripe, Twilio, Resend
│   │   ├── routes/           # API routes (admin, leagues, picks, results, etc.)
│   │   ├── middleware/       # Auth, rate limiting
│   │   ├── emails/           # Email templates (spoiler-safe)
│   │   ├── jobs/             # Scheduled tasks + monitoring
│   │   │   ├── scheduler.ts       # Cron job definitions
│   │   │   ├── jobMonitor.ts      # Execution tracking
│   │   │   ├── jobAlerting.ts     # Email/SMS alerts
│   │   │   └── releaseResults.ts  # Friday 2pm results release
│   │   ├── services/         # Business logic (admin dashboard, health)
│   │   └── lib/              # Utilities (email queue, season config, timezone)
│   ├── Dockerfile            # Railway build
│   └── package.json
├── web/                      # React frontend - ~12,000 lines
│   ├── src/
│   │   ├── App.tsx           # React Router setup
│   │   ├── pages/            # Route components
│   │   │   ├── admin/        # Admin dashboard, scoring, jobs monitoring
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Draft.tsx
│   │   │   ├── WeeklyPick.tsx
│   │   │   └── Results.tsx   # Spoiler-safe results viewer
│   │   ├── components/       # Shared UI components
│   │   │   ├── admin/        # TimelineFeed, StatsGrid, SystemHealthBanner
│   │   │   └── SpoilerWarning.tsx
│   │   └── lib/              # Supabase client, utilities
│   └── package.json
├── supabase/migrations/      # Database schema (24 migrations)
├── scripts/                  # DNS, deployment, testing scripts
├── Dockerfile                # Root Dockerfile
├── railway.json              # Railway config
├── CLAUDE.md                 # This file (project documentation)
├── COMPLETE_SUMMARY.md       # Full project status, QA findings, bugs
└── *_TEST_REPORT.md          # QA test reports (10 files)
```

## Environment Variables

### Server (.env)
```env
# Supabase
SUPABASE_URL=https://qxrgejdfxcvsfktgysop.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Server
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://rgfl.app
BASE_URL=https://api.rgfl.app
APP_URL=https://rgfl.app
ENABLE_SCHEDULER=true

# Email (Resend)
RESEND_API_KEY=

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+14247227529

# Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# DNS (Dynu) - for scripts only
DYNU_API_KEY=
DYNU_CLIENT_ID=
DYNU_CLIENT_SECRET=

# Admin Monitoring
ADMIN_EMAIL=
ADMIN_PHONE=
```

## Key Dates (Season 50)

| Event | Date | Time (PST) |
|-------|------|------------|
| Registration Opens | Dec 19, 2025 | 12:00 PM |
| Draft Order Deadline | Jan 5, 2026 | 12:00 PM |
| Registration Closes | Feb 25, 2026 | 5:00 PM |
| Premiere | Feb 25, 2026 | 8:00 PM |
| Draft Deadline | Mar 2, 2026 | 8:00 PM |
| Finale | May 27, 2026 | 8:00 PM |

## Weekly Rhythm

```
Wednesday 3:00 PM  →  Picks lock (auto-pick job runs)
Wednesday 8:00 PM  →  Episode airs
Friday 2:00 PM     →  Results released (spoiler-safe notifications sent)
```

## Game Rules

| Mechanic | Rule |
|----------|------|
| Roster Size | 2 castaways per player - FIXED for entire season |
| Draft | After Episode 1: Users rank preferences, snake draft assigns 2 castaways |
| Draft Deadline | Mar 2, 2026 8pm PST (hard deadline) |
| Weekly Picks | 1 castaway from your 2-person roster per week, locks Wed 3pm |
| Auto-Pick | System picks highest-ranked available from YOUR roster if missed |
| Elimination | When both castaways eliminated, your torch is snuffed (out of league) |
| NO ROSTER CHANGES | You keep your 2 castaways all season - no trades, no swaps, no additions |
| Scoring | 100+ rules, admin enters per episode |
| Private Leagues | 12 players max, code-based join |
| Global League | All users auto-enrolled |

## API Routes

### Health & Status
```
GET  /health                    → { status: 'ok' }
```

### Auth & Profile
```
GET   /api/me                   → Current user + leagues
PATCH /api/me/phone             → Update phone
POST  /api/me/verify-phone      → Verify SMS code
PATCH /api/me/notifications     → Update preferences
GET   /api/me/payments          → Payment history
```

### Leagues
```
POST  /api/leagues              → Create league
POST  /api/leagues/:id/join     → Join league
GET   /api/leagues/:id/standings → League standings
PATCH /api/leagues/:id/settings → Update settings (commissioner)
```

### Draft
```
GET   /api/leagues/:id/draft/state  → Draft state
POST  /api/leagues/:id/draft/pick   → Make pick
POST  /api/leagues/:id/draft/set-order → Set draft order
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
GET   /api/admin/timeline          → Upcoming events feed
GET   /api/admin/stats             → Platform stats (players, leagues, game)
GET   /api/admin/activity          → Recent activity (20 items)
GET   /api/admin/system-health     → System health diagnostics
GET   /api/admin/jobs/history      → Job execution history
POST  /api/admin/jobs/test-alert   → Test email/SMS alerts
GET   /api/admin/jobs/alerting/config → Alerting configuration
```

### Spoiler Prevention
```
POST  /api/admin/episodes/:id/release-results  → Manual result release
GET   /api/admin/episodes/:id/release-status   → Check release status
GET   /api/admin/notification-preferences/stats → Notification stats
GET   /api/results/verify-token                → Verify results token
```

### Webhooks
```
POST  /webhooks/sms      → Twilio inbound
POST  /webhooks/stripe   → Stripe events
```

## Database Schema

**24 Production Tables** | **3 RPC Functions** | **32 Strategic Indexes** | **24 Migrations Applied**

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| users | Accounts, links to Supabase Auth | Phone verification, notification prefs |
| seasons | Season metadata, key dates | Database-driven config (no hardcoded dates) |
| episodes | 14 per season, air dates, deadlines | Results release tracking, scoring status |
| castaways | Up to 24 per season, status | Elimination tracking |
| scoring_rules | 100+ rules with point values | Global scoring system |

### League & Game Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| leagues | User-created + global league | Private (code), paid (Stripe), commissioner |
| league_members | Players in leagues, standings | Total points, rank, join timestamp |
| rosters | Draft results (2 per player) | Draft order, pick number, FIXED all season |
| weekly_picks | 1 pick per player per week | Lock status, auto-pick tracking |
| draft_rankings | Pre-draft castaway preferences | User ranks all castaways before snake draft |
| episode_scores | Scores per castaway per rule | Admin-entered, finalized status |
| scoring_sessions | Track scoring entry status | In-progress sessions |

### Communication & Payments

| Table | Purpose | Key Features |
|-------|---------|--------------|
| notifications | Email/SMS/push log | Type, status, sent_at tracking |
| notification_preferences | User notification settings | Spoiler delay (0-72 hours), opt-outs |
| results_tokens | Secure results viewing | 64-char tokens, 7-day expiration, usage tracking |
| sms_commands | Inbound SMS log | Command type, user_id, response |
| payments | Stripe payment records | Webhook events, amount verification |

### Monitoring & Jobs

| Table | Purpose | Key Features |
|-------|---------|--------------|
| job_executions | Scheduled job history | In-memory (last 100), not persisted |
| email_queue | Outbound email queue | Retry logic, exponential backoff |

### PostgreSQL RPC Functions

| Function | Purpose | Performance |
|----------|---------|-------------|
| get_snake_picker_index | Draft snake order calculation | ⚠️ BUG: Integer division error |
| get_global_leaderboard_stats | Optimized leaderboard query | 4.4ms (99.8% improvement) |
| calculate_bayesian_score | Weighted league scoring | Prevents small-league dominance |

## Development Phases Completed

### Phase 1-3: Core Reliability & Game Mechanics
- ✅ Payment & Auth fixes (Stripe double-charging prevention, magic link auth)
- ✅ Email reliability (queue system with retry logic)
- ✅ Core game mechanics (draft atomicity, timezone handling)

### Phase 4: Infrastructure & Monitoring
- ✅ Job monitoring system (execution tracking for all scheduled jobs)
- ✅ Email/SMS alerting for job failures
- ✅ Process error handlers (graceful shutdown, error recovery)
- ✅ Enhanced health check endpoint (database, scheduler, job failures)
- ✅ Global leaderboard optimization (99.8% query reduction, 4.4ms execution)
- ✅ Database-driven season dates (no code changes for new seasons)

### Phase 5: Enhanced Admin Dashboard
- ✅ Timeline feed with chronological upcoming events
- ✅ Comprehensive stats dashboard (players, leagues, game, system health)
- ✅ System health banner with real-time monitoring
- ✅ Recent activity feed (signups, leagues, payments, admin actions)
- ✅ Auto-refresh every 30 seconds

### Phase 6: Spoiler Prevention System
- ✅ Database migrations (notification_preferences, results_tokens, episodes tracking)
- ✅ Results release job (Friday 2pm PST scheduled)
- ✅ Spoiler-safe notifications (email/SMS with zero spoilers)
- ✅ Frontend spoiler warning component (click-to-reveal with token support)
- ✅ Admin controls for manual result release

## Critical Bugs Found (QA Testing)

**Status:** 10 parallel QA agents completed comprehensive testing, found 10 critical bugs

### P0 - BLOCKING (Must Fix Before Launch)

1. **Frontend Application Down (502 Error)**
   - URL: https://survivor.realitygamesfantasyleague.com
   - Impact: Complete service outage, no users can access app
   - Cause: Railway deployment configuration issue
   - Next: Check logs, verify env vars, add railway.json

2. **Snake Draft Logic Completely Broken**
   - Location: `get_snake_picker_index()` SQL function
   - Impact: Draft results are unfair, only 1 player gets all picks
   - Evidence: Test league shows alternating rounds instead of sequential
   - Fix: Correct integer division in SQL function

3. **Missing `draft_rankings` Table**
   - Impact: Core draft feature non-functional
   - Evidence: Frontend references table that doesn't exist
   - Fix: Create table OR remove rankings UI entirely

4. **Frontend Bypasses API Validation (Weekly Picks)**
   - Location: `/web/src/pages/WeeklyPick.tsx:237-260`
   - Impact: Users can pick castaways not on roster, eliminated players
   - Fix: Refactor to use Express API endpoints

5. **Missing `week_number` Field on Episodes**
   - Impact: Results page routing will 100% fail
   - Evidence: Route uses `/results/week-X` but table lacks field
   - Fix: Add column or change routing logic

6. **League Commissioner Payment Bypass**
   - Impact: Commissioners get free access to paid leagues
   - Evidence: Member added before payment redirect
   - Fix: Don't add commissioner until payment completes

### P1 - HIGH (Required for Production)

7. **No RLS Roster Validation** - Database doesn't verify castaway is on user's roster
8. **Auto-Pick Silent Failure** - Users with zero active castaways get no notification
9. **No Completeness Validation Before Scoring Finalization** - Admin can finalize without scoring all castaways
10. **Missing STOP Command (SMS)** - Legal compliance issue (FCC/TCPA requirement)

**Test Reports:**
- `/COMPLETE_SUMMARY.md` - Full project status
- `/web/EXPLORATORY_TEST_REPORT_LEAGUES.md`
- `/web/ADMIN_SCORING_TEST_REPORT.md`
- `/web/SPOILER_PREVENTION_TEST_REPORT.md`
- `/web/SMS_INTEGRATION_TEST_REPORT.md`
- `/web/ADMIN_DASHBOARD_TEST_REPORT.md`
- Additional test reports delivered inline during QA

## Systems Implemented

### Job Monitoring & Alerting
- **Execution Tracking**: Circular buffer (last 100 jobs), <1ms overhead
- **Email Alerts**: All job failures sent to admin email
- **SMS Alerts**: Critical jobs only (lock-picks, auto-pick, draft-finalize, release-results)
- **Admin Endpoint**: `/api/admin/jobs/history` with stats and failure details

### Spoiler Prevention
- **Token-Based Security**: 64-character random tokens, 7-day expiration
- **Spoiler-Safe Emails**: Generic subject, warning box, no scores/names in preview
- **Spoiler-Safe SMS**: Ultra-safe, just "Week X results ready, check app"
- **Click-to-Reveal UI**: Premium amber-themed warning with confirmation checkbox
- **User Preferences**: Email/SMS opt-outs, spoiler delay (0-72 hours)
- **Scheduled Release**: Friday 2pm PST automated job

### Enhanced Admin Dashboard
- **Timeline Feed**: Chronological upcoming events (episodes, deadlines, draft, jobs)
- **Stats Grid**: Players, leagues, game metrics, system health
- **Activity Feed**: Recent 20 platform events (signups, leagues, payments, admin actions)
- **System Health Banner**: Real-time status (DB, jobs, email queue)
- **Auto-Refresh**: Every 30 seconds
- **Manual Controls**: Release results, view job history, test alerts

### Performance Optimizations
- **Global Leaderboard**: PostgreSQL RPC with CTEs, 99.8% improvement (5000ms → 4.4ms)
- **Strategic Indexes**: 32 indexes on high-traffic queries
- **Email Queue**: Database-backed with exponential backoff retry logic
- **Database-Driven Dates**: Season configuration loaded from database (1-hour cache)

### Process Reliability
- **Graceful Shutdown**: 30-second timeout, closes HTTP server, drains DB connections
- **Error Handlers**: unhandledRejection, uncaughtException, SIGTERM, SIGINT
- **Health Checks**: Simple (200 OK) + detailed (?detailed=true with diagnostics)
- **Critical Alerts**: Email + SMS for system failures

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

## SMS Commands

| Command | Format | Example | Status |
|---------|--------|---------|--------|
| PICK | `PICK [name]` | `PICK Boston Rob` | ⚠️ Bug with multiple matches |
| STATUS | `STATUS` | Shows current pick status | ✅ Working |
| TEAM | `TEAM` | Shows current roster | ✅ Working |
| STOP | `STOP` | Unsubscribe from SMS | ❌ Missing (P1 bug) |

## Tools & Technologies

### Languages & Frameworks
- **Backend**: TypeScript 5.x, Node.js 20.x, Express 4.x
- **Frontend**: React 18, TypeScript, Vite 5.x, Tailwind CSS 3.x
- **Database**: PostgreSQL 15 (via Supabase)

### Core External Services
- **Hosting**: Railway (auto-deploy from GitHub)
  - Backend: `rgfl-api` service
  - Frontend: Static build deployment
- **Database**: Supabase
  - PostgreSQL 15 with extensions (pgcrypto, uuid-ossp)
  - Auth (OAuth + Magic Links)
  - Realtime subscriptions
  - Row Level Security (RLS)
- **Payments**: Stripe
  - Checkout Sessions
  - Webhooks (payment_intent.succeeded)
- **Email**: Resend API
  - Queue system with retry logic
  - Spoiler-safe templates
- **SMS**: Twilio
  - Inbound webhooks
  - Commands (PICK, STATUS, TEAM)
  - Alert notifications
- **DNS**: Dynu
  - API-based configuration
  - Multiple domains (rgfl.app, rgflapp.com, realitygamesfantasyleague.com)

### Backend Libraries & Packages
```json
{
  "express": "Web framework",
  "stripe": "Payment processing",
  "twilio": "SMS integration",
  "@supabase/supabase-js": "Database client",
  "node-cron": "Job scheduling",
  "bcrypt": "Password hashing",
  "luxon": "Timezone handling (PST/PDT)",
  "cors": "CORS middleware",
  "helmet": "Security headers",
  "dotenv": "Environment variables"
}
```

### Frontend Libraries & Packages
```json
{
  "react": "UI library",
  "react-router-dom": "Routing",
  "@tanstack/react-query": "Data fetching & caching",
  "@supabase/auth-helpers-react": "Authentication",
  "lucide-react": "Icon library",
  "date-fns": "Date formatting",
  "tailwindcss": "Utility-first CSS"
}
```

### Development & Deployment Tools
- **Version Control**: Git + GitHub
  - Auto-deploy to Railway on push to main
- **Package Manager**: npm (backend + frontend)
- **Build Tools**:
  - TypeScript Compiler (tsc) - Backend
  - Vite - Frontend bundler
- **Testing**:
  - Manual QA with Claude Code CLI
  - 10 parallel exploratory testing agents
  - Playwright for web automation testing
- **AI Development**: Claude Code CLI
  - 10+ specialized agents (QA, security, performance, etc.)
  - Parallel agent deployment for complex tasks
- **Monitoring**:
  - Railway logs
  - Custom job monitoring system (in-memory)
  - Email/SMS alerting for failures
- **Database Management**:
  - Supabase Dashboard
  - Supabase MCP Server (Claude integration)
  - Migration files (24 applied)

### Infrastructure
- **CI/CD**: Railway auto-deploy from GitHub main branch
- **Database Backups**: Supabase automated daily backups
- **Monitoring**: Custom job monitoring + email/SMS alerts
- **Logging**: Railway logs + console output
- **Environment Variables**: Railway secrets management

## Launch Timeline & Next Steps

### Critical Dates

| Date | Event | Days Away | Status |
|------|-------|-----------|--------|
| Dec 19, 2025 | Registration Opens | -8 days | ⚠️ BLOCKED (502) |
| Jan 5, 2026 | Draft Order Deadline | 9 days | ⏳ Waiting |
| Feb 25, 2026 | Registration Closes / Premiere | 60 days | ⏳ Waiting |
| Mar 2, 2026 | Draft Deadline | 65 days | ⏳ Waiting |
| May 27, 2026 | Finale | 151 days | ⏳ Waiting |

### Week 1: Fix Blocking Issues (P0)

**Days 1-2: Infrastructure & Deployment**
- [ ] Fix frontend 502 error (Railway deployment)
- [ ] Verify all environment variables set
- [ ] Test signup/login flow end-to-end
- [ ] Deploy to staging environment

**Days 3-4: Draft System Fixes**
- [ ] Fix snake draft SQL function
- [ ] Decide: Rankings OR Interactive draft (pick one)
- [ ] Create `draft_rankings` table OR remove UI
- [ ] Test draft with 4+ users

**Day 5: Weekly Picks Security**
- [ ] Refactor WeeklyPick.tsx to use API
- [ ] Add RLS policies for roster validation
- [ ] Test pick submission flow

### Week 2: High Priority Fixes (P1)

**Days 1-2: Payment & Auth**
- [ ] Fix commissioner payment bypass
- [ ] Add payment amount verification to webhook
- [ ] Test Stripe integration in test mode
- [ ] Create admin payment dashboard

**Days 3-4: Admin Tools**
- [ ] Add scoring completeness validation
- [ ] Fix auto-pick error handling
- [ ] Test admin scoring workflow

**Day 5: SMS & Notifications**
- [ ] Implement STOP command
- [ ] Fix PICK command multiple castaway crash
- [ ] Add SMS rate limiting
- [ ] Test all SMS commands

### Week 3: Testing & Launch Prep

**Days 1-2: Results & Spoiler Prevention**
- [ ] Add `week_number` to episodes table
- [ ] Test spoiler prevention flow end-to-end
- [ ] Verify email templates (no spoilers)
- [ ] Test manual result release

**Days 3-5: Final Testing & Launch**
- [ ] Run full regression test suite
- [ ] Load testing (simulate 1000+ users)
- [ ] Security audit
- [ ] Prepare rollback plan
- [ ] Create launch runbook

## Pre-Launch Checklist

### Infrastructure
- [ ] Frontend deployment working (currently 502)
- [ ] Backend health check passing
- [ ] Database backups configured
- [ ] Monitoring alerts set up (admin email/SMS)
- [ ] Railway environment variables verified

### Core Features
- [ ] User signup works (OAuth + Magic Link)
- [ ] League creation works (free + paid)
- [ ] Draft system functional (snake draft correct)
- [ ] Weekly picks secure (API validation, no direct Supabase)
- [ ] Admin scoring complete (validation added)
- [ ] Payment processing secure (no commissioner bypass)

### Communication
- [ ] Email queue operational
- [ ] SMS commands working (PICK, STATUS, TEAM, STOP)
- [ ] Spoiler prevention tested
- [ ] Notification preferences functional

### Admin Tools
- [ ] Admin dashboard accessible
- [ ] Job monitoring active
- [ ] Manual result release tested
- [ ] System health checks passing

### Testing
- [ ] All P0 bugs fixed
- [ ] All P1 bugs fixed
- [ ] Load testing completed
- [ ] Security audit passed

## Critical Constraints

1. **Picks lock Wed 3pm PST** — Cannot be undone, auto-pick runs
2. **Draft happens ONCE after Episode 1** — Users rank preferences, snake draft assigns 2 castaways
3. **Draft deadline is hard** — Auto-complete triggers at Mar 2 8pm
4. **NO ROSTER CHANGES** — Your 2 castaways are FIXED for entire season
5. **Elimination = Down to 1** — When castaway eliminated, you have 1 left
6. **Both eliminated = Torch snuffed** — You're out of the league
7. **Results release Friday 2pm PST** — Automated spoiler-safe notifications
8. **Scoring rules are global** — Same for all leagues
9. **RLS enforced** — Backend uses service role for system ops
10. **All times in PST/PDT** — Use Luxon for timezone handling
