# Reality Games Fantasy League: Survivor

## Project Overview

A fantasy sports-style web application for CBS's Survivor TV show. Players draft castaways, make weekly picks, and earn points based on castaway performance during episodes.

## Tech Stack

### Frontend (`/web`)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Auth**: Supabase Auth with custom AuthProvider
- **Icons**: Lucide React

### Backend (`/server`)
- **Runtime**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + JWT verification
- **Email**: Resend
- **Payments**: Stripe
- **Monitoring**: Sentry
- **Jobs**: node-cron scheduler

### Infrastructure
- **Frontend Hosting**: Railway (static site)
- **Backend Hosting**: Railway (Node.js service)
- **Database**: Supabase (managed PostgreSQL)
- **Storage**: Supabase Storage (avatars bucket)

## Key URLs

- **Production Site**: https://survivor.realitygamesfantasyleague.com
- **API**: https://rgfl-api-production.up.railway.app
- **Supabase Dashboard**: https://supabase.com/dashboard/project/qxrgejdfxcvsfktgysop

## Project Structure

```
/
├── web/                    # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── lib/            # Utilities, hooks, API helpers
│   │   └── types/          # TypeScript definitions
│   └── public/             # Static assets
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   ├── jobs/           # Cron job handlers
│   │   └── emails/         # Email templates
│   └── docs/               # Server documentation
├── supabase/               # Database migrations & seeds
├── docs/                   # Project documentation
└── scripts/                # Utility scripts
```

## Database Schema (Key Tables)

- **users**: Player profiles, roles (player/commissioner/admin)
- **seasons**: Survivor seasons (currently Season 50)
- **castaways**: Contestants with tribe assignments
- **episodes**: Episode metadata and scoring status
- **leagues**: Fantasy leagues (public/private, paid/free)
- **league_members**: League membership with commissioner flag
- **rosters**: Draft results (which castaways each player owns)
- **weekly_picks**: Player's weekly castaway selections
- **scoring_rules**: Point values for various events
- **episode_scores**: Actual scores per castaway per episode
- **league_standings**: Calculated rankings per league
- **payments**: Stripe payment records
- **league_messages**: Chat messages per league

## Authentication Flow

1. User signs up/logs in via Supabase Auth
2. `AuthProvider` in `/web/src/lib/auth.tsx` manages session state
3. `onAuthStateChange` handles session changes
4. Profile is fetched after authentication
5. Protected routes check `user`, `profile`, and `loading` states

## Admin Features

Access: Users with `role = 'admin'` in the `users` table

### Admin Pages (`/admin/*`)
- **Dashboard** (`/admin`): Overview with quick stats and actions
- **Stats** (`/admin/stats`): Comprehensive analytics dashboard
- **Seasons** (`/admin/seasons`): Manage seasons and episodes
- **Leagues** (`/admin/leagues`): View and manage all leagues
- **Users** (`/admin/users`): User management
- **Payments** (`/admin/payments`): Payment history and status
- **Scoring Rules** (`/admin/scoring-rules`): Configure point values
- **Scoring** (`/admin/scoring`): Enter episode scores
- **Scoring Grid** (`/admin/scoring/grid`): Bulk score entry
- **Jobs** (`/admin/jobs`): Monitor scheduled jobs
- **Announcements** (`/admin/announcements`): Create announcements

## Scheduled Jobs

Defined in `/server/src/jobs/scheduler.ts`:

| Job | Schedule | Description |
|-----|----------|-------------|
| `lock-picks` | Wed 5pm PST | Lock weekly picks |
| `auto-pick` | Wed 5:05pm PST | Fill missing picks |
| `pick-reminders` | Wed 2pm PST | Send reminder emails |
| `results-notification` | Wed 9pm PST | Send scoring results |
| `weekly-summary` | Thu 10am PST | Send standings summary |
| `draft-reminders` | Daily 9am PST | Draft reminder emails |
| `email-queue-processor` | Every 5 min | Process email queue |

## Scoring Rules

Points are defined in `scoring_rules` table. Key rules:
- **Confessional**: 0.5 points (RAND_CONFESSIONAL)
- **Survived Episode**: Variable points
- **Won Immunity**: Variable points
- **Found Idol**: Variable points
- **Eliminated**: Negative points

## Recent Changes (Dec 2024)

### Admin Stats Dashboard
- New comprehensive analytics page at `/admin/stats`
- Displays revenue, user engagement, league analytics, communication stats, game progress, and system metrics
- Backend API at `/api/admin/stats`

### Database Updates
- Changed `scoring_rules.points` from INTEGER to NUMERIC(5,2) to support half-points
- Changed `episode_scores.points` to NUMERIC(5,2) as well
- Updated RAND_CONFESSIONAL from 1 to 0.5 points

### Bug Fixes
- Fixed `Server is not defined` error in AdminStats (missing lucide-react import)
- Fixed admin API 403 errors by using `supabaseAdmin` for role lookups
- Fixed AdminJobs to use `apiWithAuth` instead of raw `fetch`

## Environment Variables

### Frontend (`web/.env`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_SENTRY_DSN=
```

### Backend (`server/.env`)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
SENTRY_DSN=
PORT=
```

## Debugging Protocol

Before making any fix:
1. Verify deployment reality (`git log origin/main -1`, `git status`)
2. Check Sentry for actual errors
3. Check Supabase for database/auth issues
4. Name the root cause explicitly
5. Only then suggest changes

## Common Issues & Solutions

### Auth Redirect Loop
- Check `profile_setup_complete` in users table
- Verify `onAuthStateChange` is completing before `setLoading(false)`

### RLS Policy Errors
- Use `supabaseAdmin` for admin operations
- Check `is_league_member()` function for league access

### Payment Not Processing
- Verify Stripe webhook is configured correctly
- Check `payments` table for pending status
- Verify `process_league_payment` RPC function

### Resend Email Verification Protocol

Before any email send operation, verify the following for realitygamesfantasyleague.com:

**Domain Status**: Confirm domain shows "Verified" at resend.com/domains—not pending, failed, or temporary_failure

**DNS Records**: All three must be green:
- SPF record
- DKIM record  
- DMARC record (optional but recommended)

**API Key Scope**: Verify the API key being used has permission for this specific domain

**Region Match**: Confirm sending region in code matches the region where domain was verified

**From Address**: Ensure the "from" address uses @realitygamesfantasyleague.com or a verified subdomain

**If emails aren't sending**:
1. Check resend.com/logs for delivery status and error messages
2. Run domain through dns.email to verify DNS propagation
3. Look for 403 "domain not verified" errors in API responses

**IMPORTANT**: Never assume emails are working. After any deployment or DNS change, send a test email and confirm delivery in Resend logs before marking email functionality as complete.

## Testing

### Local Development
```bash
# Frontend
cd web && npm run dev

# Backend
cd server && npm run dev
```

### Production Testing
- Use browser tools (Cursor browser extension) to test UI
- Check Sentry for errors after deployments
- Verify API responses in Network tab

## Git Workflow

- Main branch: `main`
- Never use git worktrees
- Always run pre-push checklist:
  ```bash
  git worktree list    # Must show only one entry
  git branch -a        # No unexpected branches
  git log origin/main..HEAD  # Shows what you're pushing
  git status           # Must be clean
  ```
