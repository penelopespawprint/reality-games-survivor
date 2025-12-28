# Survivor Fantasy - Claude Code Instructions

## Project Overview

Survivor Fantasy is a fantasy sports app for the CBS TV show Survivor. Users make weekly picks, earn points based on castaway performance, and compete in leagues.

**Stack:** React Native (Expo) + Node.js + PostgreSQL + Stripe + WebSockets

## Active Skills Integration

### Development Methodology (from Superpowers)

**Always apply these skills:**

1. **Test-Driven Development** - Write tests first, watch them fail, then implement
2. **Verification Before Completion** - Never claim "tests pass" without running them
3. **Systematic Debugging** - Use parallel agents for 3+ independent failures
4. **Defense in Depth** - Multiple layers of validation

### Mobile Development

**iOS Simulator Skill** - Available at `~/.claude/skills/ios-simulator-skill/`
- Use for automated UI testing before Expo builds
- Run accessibility audits for App Store compliance
- Test push notifications locally

**Webapp Testing** - Playwright automation for web dashboard testing

### Quality & Metrics

**CTO Advisor** - For engineering metrics and architecture decisions
- Target: Deploy frequency >1/day, Lead time <1 day
- Technical debt allocation: 20% of capacity
- Use ADR templates for major decisions

### Automation

**Zapier Workflows** - See `.claude/survivor-fantasy-workflows.md`
- Episode reminder automation
- User engagement sequences
- Payment processing flows

**MCP Builder** - The existing MCP server at `mcp-server/` is production-ready

## Key Directories

```
mobile/          # React Native (Expo) mobile app
client/          # React web dashboard
server/          # Node.js Express API
mcp-server/      # MCP server for Claude integration
prisma/          # Database schema and migrations
scripts/         # Utility scripts
```

## Database

**Production:** Render PostgreSQL
**Local:** Use `DATABASE_URL` from `.env`

```bash
# Push schema changes
npx prisma db push

# Generate client
npx prisma generate
```

## Development Commands

```bash
# Mobile (Expo with tunnel mode for iOS Simulator)
cd mobile && npx expo start --tunnel --ios

# Server
npm run dev

# Build & deploy
npm run build
```

## Seasonal Context

Survivor Fantasy follows the Survivor TV schedule:
- **Pre-season:** 2-4 weeks before premiere - user acquisition, cast import
- **Active season:** Weekly episodes (usually Wednesday 8pm ET)
- **Post-season:** Final scoring, winner crowned

## MCP Tools Available

The RGFL MCP server provides these tools:
- Week management: `create_or_update_week`, `get_week_details`
- Scoring: `publish_weekly_scores`
- Castaway management: `create_castaway`, `eliminate_castaway`
- User management: `create_user`, `update_user`, `toggle_admin_status`
- Analytics: `get_system_stats`, `get_castaway_popularity`, `get_head_to_head`

## Code Style

- TypeScript strict mode
- Prisma for all database operations
- Zod for API validation
- React Query for data fetching (mobile/web)

## Stripe Payments & Charity Integration

### Payment Flow
1. User enters league code on `/join-league`
2. Frontend calls `GET /api/leagues/:code/preview` to check entry fee
3. If `entryFee > 0`, redirects to Stripe Checkout via `POST /api/payments/create-checkout`
4. On success, Stripe redirects to `/join-success?session_id=...&league_id=...`
5. Frontend calls `POST /api/payments/verify-and-join` to confirm and add user to league
6. Webhook `checkout.session.completed` also adds user (redundancy)

### Database Models
```prisma
model Payment {
  id              String        @id @default(uuid())
  userId          String
  leagueId        String
  amount          Decimal       @db.Decimal(10, 2)
  stripePaymentId String        @unique
  stripeSessionId String?       @unique
  status          PaymentStatus @default(PENDING)  # PENDING, COMPLETED, FAILED, REFUNDED
}

model CharityPayout {
  id            String       @id @default(uuid())
  leagueId      String
  winnerUserId  String
  charityName   String
  charityUrl    String?
  amount        Decimal      @db.Decimal(10, 2)
  payoutStatus  PayoutStatus @default(PENDING)  # PENDING, PAID, CANCELLED
}

# Added to League model:
entryFee          Decimal?  @default(0)
charityEnabled    Boolean   @default(false)
charityPercentage Int?      @default(100)

# Added to User model:
favoriteCharity   String?
charityUrl        String?
```

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payments/create-checkout` | POST | Create Stripe Checkout session |
| `/api/payments/webhook` | POST | Handle Stripe webhooks |
| `/api/payments/verify-and-join` | POST | Verify payment and join league |
| `/api/payments/my-payments` | GET | User's payment history |
| `/api/payments/admin/pending-payouts` | GET | Admin: pending charity payouts |
| `/api/payments/admin/mark-paid` | POST | Admin: mark payout complete |
| `/api/payments/admin/create-payout` | POST | Admin: create payout record |
| `/api/leagues/:code/preview` | GET | Preview league (includes entry fee) |

### Stripe Webhooks Required
Configure in Stripe Dashboard → Developers → Webhooks:
- `checkout.session.completed` - Payment succeeded, add user to league
- `checkout.session.expired` - Checkout timed out, mark failed
- `charge.refunded` - Refund issued, update status

Endpoint URL: `https://realitygamesfantasyleague.com/api/payments/webhook`

### Environment Variables
```bash
# Server (Render)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Client (Vite build)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

### Frontend Pages
- `CreateLeague.tsx` - "Play for a Cause" section with entry fee ($0-$50) and charity toggle
- `JoinLeague.tsx` - Detects paid leagues, redirects to Stripe Checkout
- `JoinSuccess.tsx` - Handles successful payment return from Stripe

## MCP Servers

### RGFL MCP Server (`mcp-server/`)
- Week management: `create_or_update_week`, `get_week_details`
- Scoring: `publish_weekly_scores`
- Castaway management: `create_castaway`, `eliminate_castaway`
- User management: `create_user`, `update_user`, `toggle_admin_status`
- Analytics: `get_system_stats`, `get_castaway_popularity`, `get_head_to_head`

### Stripe MCP Server
Added via: `claude mcp add stripe`
Provides direct access to Stripe API for managing webhooks, products, customers, payments.

## Security Notes

- Never commit `.env` files
- Use `httpOnly` cookies for auth tokens
- Rate limiting on all auth endpoints
- Helmet.js enabled on server
- Stripe webhook signature verification enabled

## Quick Reference

| Action | Command/Location |
|--------|------------------|
| Run mobile | `cd mobile && npx expo start --tunnel` |
| Run tests | `npm test` |
| Deploy | Push to `main` branch (Render auto-deploy) |
| View logs | `render logs` or Render dashboard |
| RGFL MCP tools | `claude mcp tools rgfl` |
| Stripe MCP tools | `claude mcp tools stripe` |
| Push schema | `npx prisma db push` |
| Test Stripe locally | `stripe listen --forward-to localhost:5050/api/payments/webhook` |
