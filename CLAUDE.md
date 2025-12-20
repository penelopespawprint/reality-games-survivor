# Survivor Fantasy League — Full Rebuild

## Project Overview

Fantasy sports app for CBS Survivor TV show. Players draft castaways, make weekly picks, and compete in leagues.

## Site Copy

### Landing Page Hero

```
SURVIVOR FANTASY LEAGUE

Bored of the same old fantasy leagues where you pick one Survivor and pray for luck?

Get ready for something completely different. Reality Games Fantasy League is launching the first-ever Survivor fantasy experience built by superfans, for superfans.

We've created a scoring system with 100+ game-tested rules that reward real strategy, not just luck. Every vote, idol play, alliance move, and blindside can earn (or cost) you points — so this league is for players who live and breathe Survivor.

[JOIN NOW]
```

### Value Props

| Headline | Copy |
|----------|------|
| 100+ Scoring Rules | Every strategic move counts. Idols, votes, challenges, social plays — we score it all. |
| Draft Your Dream Team | Pick 2 castaways in our snake draft. Build your perfect alliance. |
| Weekly Picks | Choose which castaway to play each episode. Strategy meets prediction. |
| Compete in Leagues | Create private leagues with friends or join the global rankings. |
| Real-Time Scoring | Watch your points update as the episode unfolds. |
| Built by Superfans | Created by Survivor obsessives who've watched every season. |

### CTA Variations

| Location | Primary CTA | Secondary CTA |
|----------|-------------|---------------|
| Hero | JOIN NOW | How It Works |
| After Rules | START YOUR LEAGUE | See Scoring Rules |
| Footer | JOIN SEASON 50 | Questions? Contact Us |
| Post-Episode | CHECK YOUR SCORES | Share Results |

### Taglines

- "Fantasy Survivor for people who actually watch Survivor."
- "100+ rules. Real strategy. No luck required."
- "The fantasy league Survivor deserves."
- "Draft. Pick. Dominate."

**Stack:** Supabase (PostgreSQL + Auth + Realtime) + Express API + React Native (Expo)

**Supabase Project:** `qxrgejdfxcvsfktgysop`
**MCP Server:** `https://mcp.supabase.com/mcp?project_ref=qxrgejdfxcvsfktgysop`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  React Native (iOS/Android)  |  Web (React)  |  SMS Commands    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Supabase    │    │  Express API  │    │  SimpleTexting│
│  (Auto CRUD)  │    │   (Supabase)  │    │   (Webhooks)  │
│               │    │               │    │               │
│ • Auth        │    │ • Scoring     │    │ • PICK cmd    │
│ • REST API    │    │ • Draft algo  │    │ • STATUS cmd  │
│ • Realtime    │    │ • Waivers     │    │ • TEAM cmd    │
│ • Storage     │    │ • Cron jobs   │    │               │
└───────┬───────┘    └───────┬───────┘    └───────────────┘
        │                    │
        └────────┬───────────┘
                 ▼
        ┌───────────────┐
        │   PostgreSQL  │
        │  (Supabase)   │
        │               │
        │ + RLS policies│
        │ + Triggers    │
        └───────────────┘
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
Wednesday 3:00 PM  →  Picks lock
Wednesday 8:00 PM  →  Episode airs
Friday 12:00 PM    →  Results posted
Saturday 12:00 PM  →  Waiver window opens
Wednesday 3:00 PM  →  Waiver window closes / Next picks due
```

## Game Rules

| Mechanic | Rule |
|----------|------|
| Roster Size | 2 castaways per player |
| Castaways | Up to 24 per season |
| Draft | Snake draft, async, deadline Mar 2 8pm PST |
| Weekly Picks | 1 castaway from roster per week, locks Wed 3pm |
| Auto-Pick | System picks highest-ranked available if missed |
| Waiver Priority | Inverse standings (last place picks first) |
| Waiver Format | Players submit ranked preferences, snake order if multi-elimination |
| Scoring | 100+ rules, admin enters per episode |
| Private Leagues | 12 players max, code-based join, optional password/donation |
| Global League | System-created league (is_global=true), all users auto-enrolled on signup, provides cross-league rankings |
| Roles | Player, Commissioner (own league settings only), Admin (system-wide) |

## Complete Page Map (36 pages)

### Public (7 pages)
| Page | Path | Purpose |
|------|------|---------|
| Landing | `/` | Marketing, CTA to register/login |
| Login | `/login` | Email/password + social auth |
| Register | `/register` | Create account |
| Password Reset | `/reset-password` | Supabase recovery flow |
| How to Play | `/how-to-play` | Rules, scoring, timeline |
| SMS Commands | `/sms` | Guide for PICK, STATUS, TEAM |
| Join League | `/join/:code` | Public invite link |

### Player (14 pages)
| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/dashboard` | My leagues, deadlines, phase-based CTA |
| League Home | `/leagues/:id` | Standings, my team, next pick |
| Make Pick | `/leagues/:id/pick` | Select castaway for current week |
| My Team | `/leagues/:id/team` | Roster, pick history, scores |
| Draft Room | `/leagues/:id/draft` | Async snake draft interface |
| Waiver Wire | `/leagues/:id/waivers` | Submit ranked preferences |
| Episode Results | `/leagues/:id/episodes/:episodeId` | Scoring breakdown |
| League History | `/leagues/:id/history` | Past seasons, historical standings |
| Season Schedule | `/seasons/:id/schedule` | Episode list, air dates |
| Castaways | `/seasons/:id/castaways` | All castaways, stats, status |
| Profile | `/profile` | Account settings |
| Notifications | `/profile/notifications` | Email/SMS/push preferences |
| Payment History | `/profile/payments` | Stripe transaction history |
| Public Leaderboard | `/l/:code` | Public standings (if enabled) |

### Commissioner (3 pages)
| Page | Path | Purpose |
|------|------|---------|
| League Settings | `/leagues/:id/settings` | Name, password, donation, payout method |
| Draft Settings | `/leagues/:id/draft/settings` | Set draft order (manual or random) |
| Invite Link | `/leagues/:id/invite` | Generate/copy invite link |

### Admin (12 pages)
| Page | Path | Purpose |
|------|------|---------|
| Admin Dashboard | `/admin` | System overview, metrics |
| Manage Seasons | `/admin/seasons` | Create/edit seasons |
| Season Detail | `/admin/seasons/:id` | Episodes, castaways for season |
| Manage Castaways | `/admin/seasons/:id/castaways` | Add/edit, upload photos, eliminate |
| Manage Episodes | `/admin/seasons/:id/episodes` | Create episodes, set dates |
| Scoring Session | `/admin/episodes/:id/scoring` | Enter scores per castaway |
| Scoring Rules | `/admin/scoring-rules` | Define 100+ scoring rules |
| All Leagues | `/admin/leagues` | View all leagues |
| All Users | `/admin/users` | User management, roles |
| All Payments | `/admin/payments` | Payment history, refunds |
| System Jobs | `/admin/jobs` | Cron job status |
| Global League | `/admin/global` | Global rankings, stats |

---

## Complete Route Table (49 custom + Supabase)

### Supabase Auto-Generated REST
| Resource | Methods | RLS |
|----------|---------|-----|
| users | GET, PATCH | Yes |
| seasons | GET | Public |
| episodes | GET | Public |
| castaways | GET | Public |
| scoring_rules | GET | Public |
| leagues | GET, POST, PATCH, DELETE | Yes |
| league_members | GET, POST, DELETE | Yes |
| rosters | GET, POST, PATCH | Yes |
| weekly_picks | GET, POST, PATCH | Yes |
| waiver_rankings | GET, PUT, DELETE | Yes |
| waiver_results | GET | Yes |
| episode_scores | GET | Yes |
| notifications | GET, PATCH | Yes |
| payments | GET | Yes |

### Custom Express Routes (49 total)

**Auth & Profile (5)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/me` | Current user with leagues |
| PATCH | `/api/me/phone` | Update phone |
| POST | `/api/me/verify-phone` | Verify SMS code |
| PATCH | `/api/me/notifications` | Update preferences |
| GET | `/api/me/payments` | Payment history |

**Dashboard (1)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dashboard` | Phase-aware dashboard data |

**Leagues (8)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/leagues` | Create league |
| POST | `/api/leagues/:id/join` | Join (free leagues) |
| POST | `/api/leagues/:id/join/checkout` | Create Stripe session |
| GET | `/api/leagues/:id/join/status` | Check payment status |
| POST | `/api/leagues/:id/leave` | Leave league |
| GET | `/api/leagues/:id/standings` | Calculated standings |
| GET | `/api/leagues/:id/invite-link` | Get/regenerate invite |
| PATCH | `/api/leagues/:id/settings` | Update settings |

**Draft (5)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/leagues/:id/draft/state` | Draft state, order |
| GET | `/api/leagues/:id/draft/order` | Current order |
| POST | `/api/leagues/:id/draft/pick` | Make pick |
| POST | `/api/leagues/:id/draft/set-order` | Set/randomize order |
| POST | `/api/draft/finalize-all` | Auto-complete (system) |

**Weekly Picks (4)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/leagues/:id/picks` | Submit pick |
| GET | `/api/leagues/:id/picks/current` | Current week status |
| POST | `/api/picks/lock` | Lock all (cron) |
| POST | `/api/picks/auto-fill` | Auto-pick (cron) |

**Waivers (4)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/leagues/:id/waivers/available` | Available castaways |
| GET | `/api/leagues/:id/waivers/my-rankings` | User's rankings |
| PUT | `/api/leagues/:id/waivers/rankings` | Submit rankings |
| POST | `/api/waivers/process` | Process all (cron) |

**Scoring (6)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/episodes/:id/scoring/start` | Begin session |
| POST | `/api/episodes/:id/scoring/save` | Save progress |
| POST | `/api/episodes/:id/scoring/finalize` | Finalize scores |
| GET | `/api/episodes/:id/scores` | All scores |
| GET | `/api/episodes/:id/scores/:castawayId` | Castaway breakdown |
| POST | `/api/scoring/recalculate` | Recalc standings |

**Notifications (2)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/notifications/send-reminders` | Send reminders (cron) |
| POST | `/api/notifications/send-results` | Send results (cron) |

**Admin (10)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/seasons` | Create season |
| PATCH | `/api/admin/seasons/:id` | Update season |
| POST | `/api/admin/seasons/:id/activate` | Set active |
| POST | `/api/admin/castaways` | Add castaway |
| PATCH | `/api/admin/castaways/:id` | Update castaway |
| POST | `/api/admin/castaways/:id/eliminate` | Mark eliminated |
| POST | `/api/admin/episodes` | Create episode |
| PATCH | `/api/admin/episodes/:id` | Update episode |
| GET | `/api/admin/jobs` | Job status |
| POST | `/api/admin/jobs/:name/run` | Trigger job |

**Payments (2)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/payments/:id/refund` | Issue refund |
| GET | `/api/admin/payments` | All payments |

**Webhooks (2)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/webhooks/sms` | SimpleTexting inbound |
| POST | `/webhooks/stripe` | Stripe events |

---

## Database Schema (16 tables)

| Table | Purpose |
|-------|---------|
| users | Accounts, links to Supabase Auth |
| seasons | Season metadata, key dates |
| episodes | 14 per season, air dates, deadlines |
| castaways | Up to 24 per season, status, elimination tracking |
| scoring_rules | 100+ rules with point values |
| leagues | User-created + 1 global league (is_global=true) |
| league_members | Players in leagues, standings |
| rosters | Draft results (2 castaways per player) |
| weekly_picks | 1 pick per player per week |
| waiver_rankings | Player preferences during waiver window |
| waiver_results | Processed waiver transactions |
| episode_scores | Admin-entered scores per castaway per rule |
| scoring_sessions | Track scoring entry status |
| notifications | Email/SMS/push log |
| sms_commands | Inbound SMS log |
| payments | Stripe payment records |

---

## Complete SQL Schema

```sql
-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('player', 'commissioner', 'admin');
CREATE TYPE league_status AS ENUM ('forming', 'drafting', 'active', 'completed');
CREATE TYPE draft_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE pick_status AS ENUM ('pending', 'locked', 'auto_picked');
CREATE TYPE waiver_status AS ENUM ('open', 'closed', 'processing');
CREATE TYPE scoring_session_status AS ENUM ('draft', 'finalized');
CREATE TYPE notification_type AS ENUM ('email', 'sms', 'push');
CREATE TYPE castaway_status AS ENUM ('active', 'eliminated', 'winner');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'refunded', 'failed');

-- ============================================
-- 1. USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  role user_role DEFAULT 'player',
  notification_email BOOLEAN DEFAULT TRUE,
  notification_sms BOOLEAN DEFAULT FALSE,
  notification_push BOOLEAN DEFAULT TRUE,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- ============================================
-- 2. SEASONS
-- ============================================
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  registration_opens_at TIMESTAMPTZ NOT NULL,
  draft_order_deadline TIMESTAMPTZ NOT NULL,
  registration_closes_at TIMESTAMPTZ NOT NULL,
  premiere_at TIMESTAMPTZ NOT NULL,
  draft_deadline TIMESTAMPTZ NOT NULL,
  finale_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. EPISODES
-- ============================================
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT,
  air_date TIMESTAMPTZ NOT NULL,
  picks_lock_at TIMESTAMPTZ NOT NULL,
  results_posted_at TIMESTAMPTZ,
  waiver_opens_at TIMESTAMPTZ,
  waiver_closes_at TIMESTAMPTZ,
  is_finale BOOLEAN DEFAULT FALSE,
  is_scored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, number)
);

CREATE INDEX idx_episodes_season ON episodes(season_id);
CREATE INDEX idx_episodes_air_date ON episodes(air_date);

-- ============================================
-- 4. CASTAWAYS
-- ============================================
CREATE TABLE castaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  hometown TEXT,
  occupation TEXT,
  photo_url TEXT,
  tribe_original TEXT,
  status castaway_status DEFAULT 'active',
  eliminated_episode_id UUID REFERENCES episodes(id),
  placement INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, name)
);

CREATE INDEX idx_castaways_season ON castaways(season_id);
CREATE INDEX idx_castaways_status ON castaways(status);

-- ============================================
-- 5. SCORING RULES
-- ============================================
CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  category TEXT,
  is_negative BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, code)
);

-- ============================================
-- 6. LEAGUES
-- ============================================
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  commissioner_id UUID NOT NULL REFERENCES users(id),
  max_players INTEGER DEFAULT 12,
  is_global BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  require_donation BOOLEAN DEFAULT FALSE,
  donation_amount DECIMAL(10,2),
  donation_notes TEXT,
  payout_method TEXT,
  status league_status DEFAULT 'forming',
  draft_status draft_status DEFAULT 'pending',
  draft_order JSONB,
  draft_started_at TIMESTAMPTZ,
  draft_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leagues_season ON leagues(season_id);
CREATE INDEX idx_leagues_code ON leagues(code);
CREATE INDEX idx_leagues_commissioner ON leagues(commissioner_id);
CREATE INDEX idx_leagues_global ON leagues(is_global) WHERE is_global = true;

-- ============================================
-- 7. LEAGUE MEMBERS
-- ============================================
CREATE TABLE league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_position INTEGER,
  total_points INTEGER DEFAULT 0,
  rank INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

CREATE INDEX idx_league_members_user ON league_members(user_id);
CREATE INDEX idx_league_members_league ON league_members(league_id);
CREATE INDEX idx_league_members_rank ON league_members(league_id, rank);

-- ============================================
-- 8. ROSTERS (2 castaways per player)
-- ============================================
CREATE TABLE rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  castaway_id UUID NOT NULL REFERENCES castaways(id) ON DELETE CASCADE,
  draft_round INTEGER NOT NULL,
  draft_pick INTEGER NOT NULL,
  acquired_via TEXT DEFAULT 'draft',
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  dropped_at TIMESTAMPTZ,
  UNIQUE(league_id, user_id, castaway_id)
);

CREATE INDEX idx_rosters_league_user ON rosters(league_id, user_id);
CREATE INDEX idx_rosters_castaway ON rosters(castaway_id);

-- ============================================
-- 9. WEEKLY PICKS
-- ============================================
CREATE TABLE weekly_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  castaway_id UUID REFERENCES castaways(id),
  status pick_status DEFAULT 'pending',
  points_earned INTEGER DEFAULT 0,
  picked_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id, episode_id)
);

CREATE INDEX idx_weekly_picks_episode ON weekly_picks(episode_id);
CREATE INDEX idx_weekly_picks_user ON weekly_picks(user_id);
CREATE INDEX idx_weekly_picks_league_episode ON weekly_picks(league_id, episode_id);

-- ============================================
-- 10. WAIVER RANKINGS
-- ============================================
CREATE TABLE waiver_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  rankings JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id, episode_id)
);

-- ============================================
-- 11. WAIVER RESULTS
-- ============================================
CREATE TABLE waiver_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  dropped_castaway_id UUID REFERENCES castaways(id),
  acquired_castaway_id UUID REFERENCES castaways(id),
  waiver_position INTEGER NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waiver_results_league_episode ON waiver_results(league_id, episode_id);

-- ============================================
-- 12. EPISODE SCORES
-- ============================================
CREATE TABLE episode_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  castaway_id UUID NOT NULL REFERENCES castaways(id) ON DELETE CASCADE,
  scoring_rule_id UUID NOT NULL REFERENCES scoring_rules(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  points INTEGER NOT NULL,
  notes TEXT,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(episode_id, castaway_id, scoring_rule_id)
);

CREATE INDEX idx_episode_scores_episode ON episode_scores(episode_id);
CREATE INDEX idx_episode_scores_castaway ON episode_scores(castaway_id);

-- ============================================
-- 13. SCORING SESSIONS
-- ============================================
CREATE TABLE scoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID UNIQUE NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  status scoring_session_status DEFAULT 'draft',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES users(id)
);

-- ============================================
-- 14. NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================
-- 15. SMS COMMANDS
-- ============================================
CREATE TABLE sms_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  command TEXT NOT NULL,
  raw_message TEXT NOT NULL,
  parsed_data JSONB,
  response_sent TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_commands_phone ON sms_commands(phone);
CREATE INDEX idx_sms_commands_user ON sms_commands(user_id);

-- ============================================
-- 16. PAYMENTS
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  league_id UUID NOT NULL REFERENCES leagues(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  status payment_status DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  refunded_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_league ON payments(league_id);
CREATE INDEX idx_payments_stripe_session ON payments(stripe_session_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_castaways_updated_at BEFORE UPDATE ON castaways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_scoring_rules_updated_at BEFORE UPDATE ON scoring_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_weekly_picks_updated_at BEFORE UPDATE ON weekly_picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_waiver_rankings_updated_at BEFORE UPDATE ON waiver_rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- User sync: auth.users -> public.users + global league
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  global_league_id UUID;
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  SELECT id INTO global_league_id FROM public.leagues WHERE is_global = true LIMIT 1;
  IF global_league_id IS NOT NULL THEN
    INSERT INTO public.league_members (league_id, user_id)
    VALUES (global_league_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate 6-char league invite code
CREATE OR REPLACE FUNCTION generate_league_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate league code on insert
CREATE OR REPLACE FUNCTION set_league_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_league_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_league_code_trigger
  BEFORE INSERT ON leagues
  FOR EACH ROW EXECUTE FUNCTION set_league_code();

-- ============================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE castaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_commissioner(league_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM leagues WHERE id = league_uuid AND commissioner_id = auth.uid())
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_league_member(league_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM league_members WHERE league_id = league_uuid AND user_id = auth.uid())
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- USERS policies
CREATE POLICY users_select_own ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_update_own ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY users_select_admin ON users FOR SELECT USING (is_admin());
CREATE POLICY users_update_admin ON users FOR UPDATE USING (is_admin());
CREATE POLICY users_select_league_mates ON users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM league_members lm1
    JOIN league_members lm2 ON lm1.league_id = lm2.league_id
    WHERE lm1.user_id = auth.uid() AND lm2.user_id = users.id
  )
);

-- PUBLIC READ tables
CREATE POLICY seasons_select_all ON seasons FOR SELECT USING (true);
CREATE POLICY seasons_admin ON seasons FOR ALL USING (is_admin());

CREATE POLICY episodes_select_all ON episodes FOR SELECT USING (true);
CREATE POLICY episodes_admin ON episodes FOR ALL USING (is_admin());

CREATE POLICY castaways_select_all ON castaways FOR SELECT USING (true);
CREATE POLICY castaways_admin ON castaways FOR ALL USING (is_admin());

CREATE POLICY scoring_rules_select_all ON scoring_rules FOR SELECT USING (true);
CREATE POLICY scoring_rules_admin ON scoring_rules FOR ALL USING (is_admin());

-- LEAGUES policies
CREATE POLICY leagues_select_public ON leagues FOR SELECT USING (is_public = true);
CREATE POLICY leagues_select_member ON leagues FOR SELECT USING (is_league_member(id));
CREATE POLICY leagues_select_commissioner ON leagues FOR SELECT USING (commissioner_id = auth.uid());
CREATE POLICY leagues_insert ON leagues FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND commissioner_id = auth.uid());
CREATE POLICY leagues_update_commissioner ON leagues FOR UPDATE USING (commissioner_id = auth.uid());
CREATE POLICY leagues_delete_commissioner ON leagues FOR DELETE USING (commissioner_id = auth.uid() AND draft_status = 'pending');
CREATE POLICY leagues_admin ON leagues FOR ALL USING (is_admin());

-- LEAGUE_MEMBERS policies
CREATE POLICY league_members_select_member ON league_members FOR SELECT USING (is_league_member(league_id));
CREATE POLICY league_members_select_public ON league_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND is_public = true)
);
CREATE POLICY league_members_insert_self ON league_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY league_members_delete_self ON league_members FOR DELETE USING (user_id = auth.uid());
CREATE POLICY league_members_admin ON league_members FOR ALL USING (is_admin());

-- ROSTERS policies
CREATE POLICY rosters_select_member ON rosters FOR SELECT USING (is_league_member(league_id));
CREATE POLICY rosters_select_public ON rosters FOR SELECT USING (
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND is_public = true)
);
CREATE POLICY rosters_insert_own ON rosters FOR INSERT WITH CHECK (user_id = auth.uid() AND is_league_member(league_id));
CREATE POLICY rosters_update_own ON rosters FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY rosters_admin ON rosters FOR ALL USING (is_admin());

-- WEEKLY_PICKS policies
CREATE POLICY weekly_picks_select_own ON weekly_picks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY weekly_picks_select_locked ON weekly_picks FOR SELECT USING (
  is_league_member(league_id) AND status IN ('locked', 'auto_picked')
);
CREATE POLICY weekly_picks_select_public ON weekly_picks FOR SELECT USING (
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND is_public = true)
  AND status IN ('locked', 'auto_picked')
);
CREATE POLICY weekly_picks_insert_own ON weekly_picks FOR INSERT WITH CHECK (user_id = auth.uid() AND is_league_member(league_id));
CREATE POLICY weekly_picks_update_own ON weekly_picks FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY weekly_picks_admin ON weekly_picks FOR ALL USING (is_admin());

-- WAIVER_RANKINGS policies
CREATE POLICY waiver_rankings_select_own ON waiver_rankings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY waiver_rankings_select_commissioner ON waiver_rankings FOR SELECT USING (is_commissioner(league_id));
CREATE POLICY waiver_rankings_insert_own ON waiver_rankings FOR INSERT WITH CHECK (user_id = auth.uid() AND is_league_member(league_id));
CREATE POLICY waiver_rankings_update_own ON waiver_rankings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY waiver_rankings_delete_own ON waiver_rankings FOR DELETE USING (user_id = auth.uid());
CREATE POLICY waiver_rankings_admin ON waiver_rankings FOR ALL USING (is_admin());

-- WAIVER_RESULTS policies
CREATE POLICY waiver_results_select_member ON waiver_results FOR SELECT USING (is_league_member(league_id));
CREATE POLICY waiver_results_select_public ON waiver_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND is_public = true)
);
CREATE POLICY waiver_results_admin ON waiver_results FOR ALL USING (is_admin());

-- EPISODE_SCORES policies
CREATE POLICY episode_scores_select_finalized ON episode_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM scoring_sessions WHERE episode_id = episode_scores.episode_id AND status = 'finalized')
);
CREATE POLICY episode_scores_admin ON episode_scores FOR ALL USING (is_admin());

-- SCORING_SESSIONS policies
CREATE POLICY scoring_sessions_select_finalized ON scoring_sessions FOR SELECT USING (status = 'finalized');
CREATE POLICY scoring_sessions_admin ON scoring_sessions FOR ALL USING (is_admin());

-- NOTIFICATIONS policies
CREATE POLICY notifications_select_own ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notifications_admin ON notifications FOR ALL USING (is_admin());

-- SMS_COMMANDS policies
CREATE POLICY sms_commands_select_own ON sms_commands FOR SELECT USING (user_id = auth.uid());
CREATE POLICY sms_commands_admin ON sms_commands FOR ALL USING (is_admin());

-- PAYMENTS policies
CREATE POLICY payments_select_own ON payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY payments_admin ON payments FOR ALL USING (is_admin());

-- SERVICE ROLE BYPASS (for backend operations)
CREATE POLICY service_bypass_league_members ON league_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_rosters ON rosters FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_weekly_picks ON weekly_picks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_waiver_rankings ON waiver_rankings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_waiver_results ON waiver_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_episode_scores ON episode_scores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_scoring_sessions ON scoring_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_notifications ON notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_sms_commands ON sms_commands FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_payments ON payments FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- SEED: Global League (run once per season)
-- ============================================
-- INSERT INTO leagues (season_id, name, code, commissioner_id, is_global, max_players, status)
-- SELECT id, 'Global Rankings', 'GLOBAL', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), true, 10000, 'active'
-- FROM seasons WHERE is_active = true;
```

---

## Complete API Route Reference

### Supabase Auth Endpoints

| Method | Endpoint | Request | Response | Notes |
|--------|----------|---------|----------|-------|
| POST | `/auth/v1/signup` | `{email, password, data: {display_name}}` | `{user, session}` | Creates auth + public user |
| POST | `/auth/v1/token?grant_type=password` | `{email, password}` | `{access_token, refresh_token, user}` | Login |
| POST | `/auth/v1/token?grant_type=refresh_token` | `{refresh_token}` | `{access_token, refresh_token}` | Refresh session |
| POST | `/auth/v1/logout` | - | `{}` | End session |
| POST | `/auth/v1/recover` | `{email}` | `{}` | Send password reset |
| PUT | `/auth/v1/user` | `{password}` | `{user}` | Update password |
| GET | `/auth/v1/user` | - | `{user}` | Get current user |

### Supabase REST (Auto-Generated)

Base URL: `{SUPABASE_URL}/rest/v1`

| Resource | GET | POST | PATCH | DELETE | RLS |
|----------|-----|------|-------|--------|-----|
| `/users` | Own + league mates | - | Own only | - | Yes |
| `/seasons` | All | Admin | Admin | Admin | Public read |
| `/episodes` | All | Admin | Admin | Admin | Public read |
| `/castaways` | All | Admin | Admin | Admin | Public read |
| `/scoring_rules` | All | Admin | Admin | Admin | Public read |
| `/leagues` | Member/public | Auth | Commissioner | Commissioner (pre-draft) | Yes |
| `/league_members` | Member/public | Self-join | - | Self/Admin | Yes |
| `/rosters` | Member/public | Owner | Owner | - | Yes |
| `/weekly_picks` | Own + locked | Owner | Owner (pending) | - | Yes |
| `/waiver_rankings` | Own | Owner | Owner | Owner | Yes |
| `/waiver_results` | Member/public | Admin | - | - | Yes |
| `/episode_scores` | Finalized only | Admin | Admin | Admin | Yes |
| `/scoring_sessions` | Finalized | Admin | Admin | - | Yes |
| `/notifications` | Own | Admin | Own (read) | - | Yes |
| `/payments` | Own | Admin | - | - | Yes |

### Custom Express Routes (Detailed)

**Auth & Profile**

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| GET | `/api/me` | Required | - | `{user, leagues: [{id, name, role, rank}]}` |
| PATCH | `/api/me/phone` | Required | `{phone}` | `{user, verification_sent}` |
| POST | `/api/me/verify-phone` | Required | `{code}` | `{verified: true}` |
| PATCH | `/api/me/notifications` | Required | `{email?, sms?, push?}` | `{user}` |
| GET | `/api/me/payments` | Required | - | `{payments: [{id, amount, league, status, date}]}` |

**Dashboard**

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| GET | `/api/dashboard` | Required | `?league_id=` | `{phase, primaryCta, countdown, episode, userStatus, standings, alerts}` |

**Leagues**

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/api/leagues` | Required | `{name, season_id, password?, donation_amount?}` | `{league, invite_code}` |
| POST | `/api/leagues/:id/join` | Required | `{password?}` | `{membership}` |
| POST | `/api/leagues/:id/join/checkout` | Required | - | `{checkout_url, session_id}` |
| GET | `/api/leagues/:id/join/status` | Required | - | `{paid: boolean, membership?}` |
| POST | `/api/leagues/:id/leave` | Required | - | `{refund?: {amount}}` |
| GET | `/api/leagues/:id/standings` | Member | - | `{standings: [{user, rank, points, movement}]}` |
| GET | `/api/leagues/:id/invite-link` | Commissioner | - | `{code, url, expires_at?}` |
| PATCH | `/api/leagues/:id/settings` | Commissioner | `{name?, password?, donation?, payout_method?}` | `{league}` |

**Draft**

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| GET | `/api/leagues/:id/draft/state` | Member | - | `{status, current_pick, order, available, my_picks}` |
| GET | `/api/leagues/:id/draft/order` | Member | - | `{order: [{user_id, position, display_name}]}` |
| POST | `/api/leagues/:id/draft/pick` | Member | `{castaway_id}` | `{roster_entry, next_pick}` |
| POST | `/api/leagues/:id/draft/set-order` | Commissioner | `{order: [user_id]} \| {randomize: true}` | `{order}` |
| POST | `/api/draft/finalize-all` | System | - | `{finalized_leagues: number, auto_picks: number}` |

**Weekly Picks**

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/api/leagues/:id/picks` | Member | `{castaway_id, episode_id}` | `{pick, locked_at?}` |
| GET | `/api/leagues/:id/picks/current` | Member | - | `{episode, my_pick, deadline, roster}` |
| POST | `/api/picks/lock` | System | - | `{locked: number, episodes: [id]}` |
| POST | `/api/picks/auto-fill` | System | - | `{auto_picked: number, users: [id]}` |

**Waivers**

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| GET | `/api/leagues/:id/waivers/available` | Member | - | `{castaways: [{id, name, eliminated_episode}]}` |
| GET | `/api/leagues/:id/waivers/my-rankings` | Member | - | `{rankings: [castaway_id], submitted_at}` |
| PUT | `/api/leagues/:id/waivers/rankings` | Member | `{rankings: [castaway_id]}` | `{rankings, deadline}` |
| POST | `/api/waivers/process` | System | - | `{processed: number, transactions: [{user, dropped, acquired}]}` |

**Scoring**

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/api/episodes/:id/scoring/start` | Admin | - | `{session, castaways, rules}` |
| POST | `/api/episodes/:id/scoring/save` | Admin | `{scores: [{castaway_id, rule_id, quantity}]}` | `{saved: number}` |
| POST | `/api/episodes/:id/scoring/finalize` | Admin | - | `{finalized, eliminated: [castaway_id], standings_updated}` |
| GET | `/api/episodes/:id/scores` | Member | - | `{scores: [{castaway, rule, points}], totals}` |
| GET | `/api/episodes/:id/scores/:castawayId` | Member | - | `{castaway, scores: [{rule, points}], total}` |
| POST | `/api/scoring/recalculate` | Admin | `{season_id}` | `{recalculated_leagues: number}` |

**Notifications**

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/api/notifications/send-reminders` | System | `{type: 'pick' \| 'draft' \| 'waiver'}` | `{sent: number}` |
| POST | `/api/notifications/send-results` | System | `{episode_id}` | `{sent: number}` |

**Admin**

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/api/admin/seasons` | Admin | `{number, name, dates...}` | `{season}` |
| PATCH | `/api/admin/seasons/:id` | Admin | `{name?, dates?}` | `{season}` |
| POST | `/api/admin/seasons/:id/activate` | Admin | - | `{season, previous_deactivated}` |
| POST | `/api/admin/castaways` | Admin | `{season_id, name, age?, hometown?, photo_url?}` | `{castaway}` |
| PATCH | `/api/admin/castaways/:id` | Admin | `{name?, photo_url?, status?}` | `{castaway}` |
| POST | `/api/admin/castaways/:id/eliminate` | Admin | `{episode_id, placement?}` | `{castaway, waiver_opened}` |
| POST | `/api/admin/episodes` | Admin | `{season_id, number, air_date, title?}` | `{episode}` |
| PATCH | `/api/admin/episodes/:id` | Admin | `{title?, air_date?, is_scored?}` | `{episode}` |
| GET | `/api/admin/jobs` | Admin | - | `{jobs: [{name, last_run, next_run, status}]}` |
| POST | `/api/admin/jobs/:name/run` | Admin | - | `{job, result}` |
| GET | `/api/admin/payments` | Admin | `?league_id=&status=` | `{payments, total}` |
| POST | `/api/admin/payments/:id/refund` | Admin | `{reason}` | `{payment, refund_id}` |

**Webhooks**

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/webhooks/sms` | Signature | SimpleTexting payload | `{processed, response_sent}` |
| POST | `/webhooks/stripe` | Signature | Stripe event | `{received: true}` |

---

## Supabase Integration

### What Supabase Handles

| Feature | Supabase Service | Notes |
|---------|------------------|-------|
| Authentication | Supabase Auth | Email/password, social OAuth, magic links |
| User Sessions | Supabase Auth | JWT tokens, refresh tokens |
| Database | Supabase PostgreSQL | Primary data store |
| Auto-generated API | PostgREST | CRUD for all tables via REST |
| Row-Level Security | RLS Policies | Enforced at database level |
| Realtime | Supabase Realtime | WebSocket subscriptions for live updates |
| File Storage | Supabase Storage | Castaway photos, league avatars |

### Supabase MCP (Development)

Use Claude's Supabase MCP tool for:
- Creating and modifying tables
- Writing and testing RLS policies
- Seeding data (seasons, castaways, scoring rules)
- Querying during development/debugging
- Managing auth users and roles

**Do NOT use MCP for:**
- Production application logic (use Prisma or Supabase client SDK)
- Anything the app itself should handle at runtime

### Realtime Subscriptions

| Channel | Table | Events | Purpose |
|---------|-------|--------|---------|
| `leaderboard:{leagueId}` | league_members | UPDATE | Live standings |
| `picks:{leagueId}` | weekly_picks | INSERT | Pick confirmations |
| `draft:{leagueId}` | rosters | INSERT | Live draft updates |
| `scores:{episodeId}` | episode_scores | INSERT, UPDATE | Score entry broadcast |

### Supabase vs Prisma

| Use Case | Tool | Why |
|----------|------|-----|
| Schema definition | Prisma | Type-safe, migrations, better DX |
| Complex queries | Prisma | Type-safe, relations, transactions |
| Simple CRUD (client) | Supabase JS | Auto-generated, RLS enforced |
| Auth | Supabase Auth | Built-in, handles tokens |
| Realtime | Supabase Realtime | Native WebSocket support |
| File uploads | Supabase Storage | CDN, policies |
| Admin/debugging | Supabase MCP | Direct DB access |

### Supabase Client Setup

```typescript
// src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

// For client-side (respects RLS)
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// For server-side (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Auth Flow

```
1. User signs up → Supabase Auth creates auth.users row
2. DB trigger → Creates public.users row with same ID
3. DB trigger → Auto-adds user to global league
4. User logs in → Supabase returns JWT
5. Client includes JWT in requests
6. Supabase RLS policies check auth.uid() against rows
7. Express API verifies JWT via supabase.auth.getUser()
```

### User Sync Trigger

```sql
-- Automatically create public.users when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  global_league_id UUID;
BEGIN
  -- Create public user profile
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  -- Auto-add to global league
  SELECT id INTO global_league_id FROM public.leagues WHERE is_global = true LIMIT 1;
  IF global_league_id IS NOT NULL THEN
    INSERT INTO public.league_members (league_id, user_id)
    VALUES (global_league_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## API Split

| Layer | Handler | Examples |
|-------|---------|----------|
| CRUD | Supabase REST | Users, leagues, picks, rosters |
| Auth | Supabase Auth | Login, signup, password reset |
| Realtime | Supabase Realtime | Leaderboards, pick confirmations |
| Complex Logic | Express API | Scoring engine, draft algo, waiver processing |
| Webhooks | Express API | SMS inbound, Stripe payments |
| Scheduled Jobs | Supabase Cron (pg_cron) | Lock picks, send reminders, process waivers |

## Scheduled Jobs (8 total)

| Job | Schedule | Action |
|-----|----------|--------|
| Draft Finalize | Mar 2, 8pm (one-time) | Auto-complete incomplete drafts |
| Lock Picks | Wed 3pm (weekly, starts Week 2) | Lock all pending picks |
| Auto-Pick | Wed 3:05pm (weekly) | Fill missing picks with auto-select |
| Pick Reminders | Wed 12pm (weekly) | Email/SMS pick reminders |
| Results Notification | Fri 12pm (weekly) | Send scoring results |
| Open Waivers | Sat 12pm (weekly) | Open waiver window |
| Process Waivers | Wed 2:55pm (weekly) | Process rankings via inverse snake |
| Weekly Summary | Sun 10am (weekly) | Send standings + preview |

**Note:** Week 1 (Feb 25 premiere) has no weekly pick — draft completes Mar 2, weekly rhythm starts Week 2 (Mar 4).

## Row-Level Security

| Role | Access |
|------|--------|
| Public | Seasons, episodes, castaways, scoring rules (read) |
| Player | Own profile, league data, picks, join/leave leagues |
| Commissioner | Own league settings only (name, password, donation, draft order) |
| Admin | Full system access |
| Service Role | Backend bypass for cron jobs and system operations |

## Folder Structure

```
rgfl-survivor/
├── supabase/
│   ├── migrations/           # SQL migrations
│   ├── seed.sql              # Seasons, scoring rules
│   └── policies/             # RLS definitions
├── prisma/
│   ├── schema.prisma         # Type-safe schema
│   └── seed.ts               # Typed seeding
├── src/
│   ├── server.ts             # Express entry
│   ├── config/
│   │   ├── supabase.ts       # Supabase client
│   │   └── database.ts       # Prisma client
│   ├── middleware/
│   │   ├── authenticate.ts   # Verify Supabase JWT
│   │   └── authorize.ts      # Role checks
│   ├── features/
│   │   ├── scoring/          # Scoring engine
│   │   ├── draft/            # Draft algorithm
│   │   ├── waivers/          # Waiver processing
│   │   └── notifications/    # Email + SMS
│   └── jobs/
│       ├── lockPicks.ts
│       ├── processWaivers.ts
│       └── sendReminders.ts
├── mobile/                   # React Native (Expo)
└── web/                      # React web app
```

## Commands

```bash
# Development
npm run dev                   # Start Express server
npm run db:push              # Push Prisma schema to Supabase
npm run db:seed              # Seed database
npm run db:studio            # Open Prisma Studio

# Supabase
npx supabase start           # Local Supabase
npx supabase db push         # Push migrations
npx supabase gen types       # Generate TypeScript types

# Mobile
cd mobile && npx expo start --tunnel  # Always use tunnel mode
```

## Environment Variables

```env
# Supabase
SUPABASE_URL=https://qxrgejdfxcvsfktgysop.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:krt.zar9HDF-yud1dpm@db.qxrgejdfxcvsfktgysop.supabase.co:5432/postgres

# Email
RESEND_API_KEY=

# SMS
SIMPLETEXTING_API_KEY=
SIMPLETEXTING_WEBHOOK_SECRET=

# Stripe (Payments)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
```

## Critical Constraints

1. **No dev server** — Production only, test carefully
2. **Picks lock Wed 3pm PST** — Cannot be undone
3. **Draft deadline is hard** — Auto-complete triggers at Mar 2 8pm
4. **Waiver is inverse snake** — Last place picks first
5. **Scoring rules are global** — Same for all leagues
6. **RLS enforced** — Backend uses service role for system ops
7. **Tunnel mode required** — Expo needs `--tunnel` for iOS Simulator

## Email & Notification System

### Event-Based Triggers

| Event | Trigger Type | Email | Push | SMS |
|-------|--------------|-------|------|-----|
| User signs up | DB trigger on `users` INSERT | Welcome | - | - |
| User creates league | API: `POST /api/leagues` success | League Created | - | - |
| User joins league | DB trigger on `league_members` INSERT | League Joined | Yes | - |
| User makes draft pick | API: `POST /api/leagues/:id/draft/pick` | Draft Pick | Yes | - |
| Draft auto-completed | Cron: `draft/finalize-all` | Draft Complete | Yes | Yes |
| User submits weekly pick | API: `POST /api/leagues/:id/picks` | Pick Confirmed | Yes | - |
| Picks locked (deadline) | Cron: Wed 3pm `picks/lock` | - | Yes | - |
| Auto-pick applied | Cron: Wed 3:05pm `picks/auto-fill` | Auto-Pick Alert | Yes | Yes |
| User submits waiver rankings | API: `PUT /api/leagues/:id/waivers/rankings` | Rankings Submitted | - | - |
| Waivers processed | Cron: Wed 2:55pm `waivers/process` | Waiver Result | Yes | Yes |
| Scoring finalized | API: `POST /api/episodes/:id/scoring/finalize` | Episode Results | Yes | - |
| Castaway eliminated | Triggered by scoring finalize | Elimination Alert | Yes | Yes |

### Scheduled Reminders (Cron Jobs)

| Job | Schedule | Condition | Message |
|-----|----------|-----------|---------|
| Draft Reminder | Daily 9am during draft window | Draft incomplete | "X days left to complete your draft" |
| Draft Final Warning | Mar 2, 6pm (2hr before) | Draft incomplete | "Draft closes in 2 hours!" |
| Pick Reminder | Wed 12pm | No pick submitted | "Make your pick before 3pm PST" |
| Pick Final Warning | Wed 2:30pm | No pick submitted | "30 minutes to submit your pick!" |
| Waiver Open | Sat 12pm | Has eliminated castaway | "Waiver wire is open" |
| Waiver Reminder | Tue 12pm | Rankings not submitted | "Submit waiver rankings by Wed 3pm" |
| Weekly Leaderboard | Sun 10am | Always | "Week X standings + next episode preview" |

### Dynamic Dashboard States

Dashboard content changes based on current phase in weekly cycle:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEEKLY DASHBOARD PHASES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SAT 12pm ──────────────────────────────────────────────────► WED 3pm       │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ PHASE: WAIVER WINDOW                                                │     │
│  │ Primary CTA: "Submit Waiver Rankings"                               │     │
│  │ Shows: Available castaways, your eliminated players, ranking form   │     │
│  │ Countdown: Time until waiver closes                                 │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  WED 3pm ────────────────────────────────────────────────────► WED 8pm      │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ PHASE: PICKS LOCKED                                                 │     │
│  │ Primary CTA: "View Tonight's Episode"                               │     │
│  │ Shows: Your pick, league picks (revealed), episode preview          │     │
│  │ Countdown: Time until episode airs                                  │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  WED 8pm ────────────────────────────────────────────────────► FRI 12pm     │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ PHASE: AWAITING RESULTS                                             │     │
│  │ Primary CTA: "Episode Aired - Results Coming Friday"                │     │
│  │ Shows: Your pick, episode recap (if available), anticipation        │     │
│  │ Countdown: Time until results posted                                │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  FRI 12pm ───────────────────────────────────────────────────► SAT 12pm     │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ PHASE: RESULTS POSTED                                               │     │
│  │ Primary CTA: "View Your Scores"                                     │     │
│  │ Shows: Points earned, standings change, scoring breakdown           │     │
│  │ Alert: If castaway eliminated → "Waiver opens tomorrow"             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  (Overlapping with waiver window)                                            │
│  SAT 12pm ───────────────────────────────────────────────────► WED 3pm      │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ PHASE: MAKE YOUR PICK                                               │     │
│  │ Primary CTA: "Pick Your Castaway for Episode X"                     │     │
│  │ Shows: Your roster, available picks, pick form                      │     │
│  │ Countdown: Time until picks lock                                    │     │
│  │ Secondary: Waiver rankings (if applicable)                          │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dashboard API Response

```typescript
// GET /api/dashboard
interface DashboardResponse {
  phase: 'waiver_open' | 'picks_locked' | 'awaiting_results' | 'results_posted' | 'make_pick';
  primaryCta: {
    label: string;
    action: string; // route or action
    urgent: boolean;
  };
  countdown: {
    label: string;
    targetTime: string; // ISO timestamp
  };
  currentEpisode: {
    number: number;
    airDate: string;
    title?: string;
  };
  userStatus: {
    pickSubmitted: boolean;
    waiverRankingsSubmitted: boolean;
    needsWaiverAction: boolean; // has eliminated castaway
  };
  standings: {
    rank: number;
    totalPlayers: number;
    points: number;
    movement: number; // +2, -1, 0
  };
  alerts: Alert[];
}
```

### Phase Detection Logic

```typescript
function getCurrentPhase(now: Date, episode: Episode): Phase {
  const { picksLockAt, airDate, resultsPostedAt, waiverOpensAt, waiverClosesAt } = episode;

  if (now < picksLockAt) return 'make_pick';
  if (now < airDate) return 'picks_locked';
  if (now < resultsPostedAt) return 'awaiting_results';
  if (now < waiverOpensAt) return 'results_posted';
  if (now < waiverClosesAt) return 'waiver_open'; // overlaps with make_pick
  return 'make_pick'; // next episode
}
```

### Email Templates (19 total)

```
emails/
├── transactional/
│   ├── welcome.tsx
│   ├── league-created.tsx
│   ├── league-joined.tsx
│   ├── draft-pick-confirmed.tsx
│   ├── draft-complete.tsx
│   ├── pick-confirmed.tsx
│   ├── auto-pick-alert.tsx
│   ├── waiver-submitted.tsx
│   ├── waiver-result.tsx
│   ├── payment-confirmed.tsx
│   └── refund-issued.tsx
├── reminders/
│   ├── draft-reminder.tsx
│   ├── draft-final-warning.tsx
│   ├── pick-reminder.tsx
│   ├── pick-final-warning.tsx
│   ├── waiver-open.tsx
│   └── waiver-reminder.tsx
└── results/
    ├── episode-results.tsx
    └── elimination-alert.tsx
```

### Notification Preferences

| Category | Default | Can Disable | Channels |
|----------|---------|-------------|----------|
| Transactional | On | No | Email only |
| Pick Reminders | On | Yes | Email, Push, SMS |
| Waiver Alerts | On | Yes | Email, Push, SMS |
| Results | On | Yes | Email, Push |
| Weekly Summary | On | Yes | Email only |

## Stripe Integration & Donations

### League Donation Model

Commissioners can optionally require donations to join their league:

| Setting | Type | Description |
|---------|------|-------------|
| `require_donation` | boolean | If true, payment required to join |
| `donation_amount` | decimal | Amount in USD (e.g., 25.00) |
| `donation_notes` | text | What the money is for (e.g., "Winner takes all") |

### Payment Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              JOIN LEAGUE FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User clicks invite link → /join/:code                                   │
│  2. If logged out → redirect to login/signup                                 │
│  3. Check league settings:                                                   │
│     ├── require_donation = false → Join immediately                         │
│     └── require_donation = true → Show payment form                         │
│                                                                              │
│  4. Payment Flow (if required):                                              │
│     ├── Display: League name, amount, notes                                  │
│     ├── Create Stripe Checkout Session                                       │
│     ├── Redirect to Stripe Checkout                                          │
│     ├── On success → Stripe webhook fires                                    │
│     └── Webhook adds user to league                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stripe Checkout Session

```typescript
// POST /api/leagues/:id/join/checkout
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${league.name} - League Entry`,
        description: league.donationNotes || 'League entry fee',
      },
      unit_amount: league.donationAmount * 100, // cents
    },
    quantity: 1,
  }],
  metadata: {
    league_id: league.id,
    user_id: userId,
    type: 'league_donation',
  },
  success_url: `${BASE_URL}/leagues/${league.id}?joined=true`,
  cancel_url: `${BASE_URL}/join/${league.code}?cancelled=true`,
});
```

### Webhook Handling

```typescript
// POST /webhooks/stripe
switch (event.type) {
  case 'checkout.session.completed':
    const session = event.data.object;
    if (session.metadata.type === 'league_donation') {
      await addUserToLeague(session.metadata.user_id, session.metadata.league_id);
      await recordPayment({
        userId: session.metadata.user_id,
        leagueId: session.metadata.league_id,
        amount: session.amount_total / 100,
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
      });
      await sendLeagueJoinedEmail(session.metadata.user_id, session.metadata.league_id);
    }
    break;

  case 'checkout.session.expired':
    // Optional: notify user payment window expired
    break;
}
```

### API Routes (Stripe)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/leagues/:id/join/checkout` | Create Stripe Checkout session | Required |
| GET | `/api/leagues/:id/join/status` | Check if payment complete | Required |
| POST | `/webhooks/stripe` | Handle Stripe events | Signature |
| GET | `/api/me/payments` | User's payment history | Required |
| POST | `/api/admin/payments/:id/refund` | Issue refund | Admin |

### Commissioner Payout (Manual)

Stripe Connect is **not** implemented for MVP. Payouts to commissioners are handled manually:

1. Commissioner provides payout method in league settings (Venmo, PayPal, etc.)
2. At season end, admin reviews payment totals
3. Admin initiates manual payout to commissioner
4. Commissioner distributes to winners

**Future:** Stripe Connect for automatic payouts to commissioners.

### Refund Policy

| Scenario | Refund? |
|----------|---------|
| User leaves before draft | Full refund (auto) |
| User leaves after draft | No refund |
| League cancelled by commissioner | Full refund (admin manual) |
| Season cancelled | Full refund (admin manual) |

### Stripe Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_... # Client-side
```

### Payment Emails

| Email | Trigger | Content |
|-------|---------|---------|
| Payment Confirmed | Checkout success | Receipt, league details, next steps |
| Refund Issued | Refund processed | Amount, reason, timeline |

## SMS Commands

| Command | Format | Example |
|---------|--------|---------|
| PICK | `PICK [name]` | `PICK Boston Rob` |
| STATUS | `STATUS` | Shows current pick status |
| TEAM | `TEAM` | Shows current roster |

## Deliverables Completed

1. **Page Map** — 36 pages (public, player, commissioner, admin)
2. **Route Table** — 49 custom routes + Supabase auto + 8 cron jobs
3. **Database Schema** — 16 tables, SQL + Prisma
4. **RLS Policies** — Full row-level security with service role bypass
5. **Email System** — 19 templates, event triggers, dynamic dashboard
6. **Stripe Integration** — Checkout, webhooks, refund policy

## Next Steps

1. Set up Supabase project
2. Run migrations
3. Implement Express API (scoring, draft, waivers)
4. Build mobile app
5. Set up cron jobs with Supabase pg_cron
6. Configure SimpleTexting webhooks
7. Test end-to-end with Season 50 data
