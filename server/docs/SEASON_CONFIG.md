# Database-Driven Season Configuration

## Overview

Season dates (draft deadlines, registration close, etc.) are now stored in the database and loaded dynamically by the scheduler. This eliminates the need to redeploy code when updating dates for new seasons.

## Architecture

### SeasonConfig Service (`server/src/lib/season-config.ts`)

A singleton service that:
- Loads the active season from the database
- Caches season data in memory for 1 hour
- Provides timezone-aware date accessors using Luxon
- Exposes cache invalidation for admin updates

**Key Methods:**

```typescript
// Load current active season (cached)
await seasonConfig.loadCurrentSeason()

// Get specific dates as Luxon DateTime in Pacific timezone
await seasonConfig.getDraftDeadline()
await seasonConfig.getDraftOrderDeadline()
await seasonConfig.getRegistrationClose()
await seasonConfig.getPremiereDate()

// Get recurring schedule config (not date-specific)
seasonConfig.getPicksLockTime()  // { dayOfWeek: 3, hour: 15, minute: 0 }

// Cache management
seasonConfig.invalidateCache()
```

### Scheduler Updates

The scheduler now:
1. Loads season info on startup and logs dates
2. Uses database dates for one-time jobs (draft finalization, auto-randomize)
3. Skips scheduling if no active season exists
4. Supports manual date overrides for testing

### Admin API Endpoints

#### Update Season Dates with Job Rescheduling

```bash
PATCH /api/admin/seasons/:id/dates
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "draft_deadline": "2026-03-02T20:00:00-08:00",
  "draft_order_deadline": "2026-01-05T12:00:00-08:00",
  "registration_closes_at": "2026-02-25T17:00:00-08:00",
  "premiere_at": "2026-02-25T20:00:00-08:00"
}
```

**Response:**
```json
{
  "season": { ... },
  "rescheduled_jobs": [
    "auto-randomize-rankings",
    "draft-finalize"
  ]
}
```

This endpoint:
- Updates season dates in database
- Invalidates the cache
- Automatically reschedules one-time jobs if the season is active

#### General Season Update (with cache invalidation)

```bash
PATCH /api/admin/seasons/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Season 50 Updated",
  "draft_deadline": "2026-03-02T20:00:00-08:00"
}
```

Automatically invalidates cache if any date fields are updated.

#### Activate Season (with cache invalidation)

```bash
POST /api/admin/seasons/:id/activate
Authorization: Bearer <admin_token>
```

Automatically invalidates cache when activating a new season.

## Database Schema

The `seasons` table includes the following date fields (all TIMESTAMPTZ):

```sql
CREATE TABLE seasons (
  id UUID PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  registration_opens_at TIMESTAMPTZ NOT NULL,
  draft_order_deadline TIMESTAMPTZ NOT NULL,
  registration_closes_at TIMESTAMPTZ NOT NULL,
  premiere_at TIMESTAMPTZ NOT NULL,
  draft_deadline TIMESTAMPTZ NOT NULL,
  finale_at TIMESTAMPTZ,
  -- ...
);
```

## Workflow: Setting Up a New Season

1. **Create the season:**
   ```bash
   POST /api/admin/seasons
   {
     "number": 51,
     "name": "Season 51",
     "registration_opens_at": "2027-01-15T12:00:00-08:00",
     "draft_order_deadline": "2027-02-01T12:00:00-08:00",
     "registration_closes_at": "2027-03-10T17:00:00-08:00",
     "premiere_at": "2027-03-10T20:00:00-08:00",
     "draft_deadline": "2027-03-17T20:00:00-08:00",
     "finale_at": "2027-05-26T20:00:00-07:00"
   }
   ```

2. **Activate the season:**
   ```bash
   POST /api/admin/seasons/:id/activate
   ```
   This deactivates all other seasons and marks this one as active.

3. **Update dates if needed:**
   ```bash
   PATCH /api/admin/seasons/:id/dates
   {
     "draft_deadline": "2027-03-18T20:00:00-08:00"
   }
   ```

4. **Restart server (or wait for cache to expire):**
   The scheduler will automatically pick up the new dates on next restart or cache refresh.

## Testing

### Manual Testing with Custom Dates

You can test the scheduling functions with custom dates:

```typescript
import { scheduleAutoRandomizeRankings, scheduleDraftFinalize } from './jobs/index.js';

// Schedule for 5 minutes from now
const testDate = new Date(Date.now() + 5 * 60 * 1000);
await scheduleAutoRandomizeRankings(testDate);
await scheduleDraftFinalize(testDate);
```

### Verify Scheduler Status

Check job status via admin API:

```bash
GET /api/admin/jobs
Authorization: Bearer <admin_token>
```

Look for the one-time jobs in the response:
```json
{
  "jobs": [
    {
      "name": "auto-randomize-rankings",
      "schedule": "One-time: From database (draft_order_deadline)",
      "enabled": true
    },
    {
      "name": "draft-finalize",
      "schedule": "One-time: From database (draft_deadline)",
      "enabled": true
    }
  ]
}
```

### Check Logs

On server startup, you'll see:
```
Starting RGFL job scheduler...
Active Season: Season 50 (Season 50)
  Draft Order Deadline: 2026-01-05T12:00:00.000-08:00
  Draft Deadline: 2026-03-02T20:00:00.000-08:00
  Registration Close: 2026-02-25T17:00:00.000-08:00
Scheduling auto-randomize rankings for 2026-01-05T20:00:00.000Z (1234 hours)
Scheduling draft finalization for 2026-03-03T04:00:00.000Z (2345 hours)
```

## Timezone Handling

All dates are stored as UTC timestamps in PostgreSQL (`TIMESTAMPTZ`). The SeasonConfig service:
- Converts dates to Pacific timezone using Luxon
- Handles DST transitions automatically
- Uses `America/Los_Angeles` as the timezone

Weekly recurring jobs (picks lock, reminders, etc.) use the `pstToCron()` utility which:
- Converts Pacific time to UTC for cron expressions
- Auto-adjusts for PST (UTC-8) vs PDT (UTC-7)

## Cache Behavior

- **Cache Duration:** 1 hour
- **Cache Invalidation:** Automatic on season date updates
- **Cache Miss:** Database query on first access or after invalidation

This ensures:
- Fast access to season config (no DB query per job)
- Updates are reflected quickly (within 1 hour max, instant with invalidation)
- Resilient to database connectivity issues (uses last cached value)

## Migration from Hardcoded Dates

**Before:**
```typescript
const target = new Date('2026-03-03T04:00:00Z'); // Hardcoded!
```

**After:**
```typescript
const draftDeadline = await seasonConfig.getDraftDeadline();
if (!draftDeadline) {
  console.log('No active season, skipping');
  return;
}
const target = draftDeadline.toJSDate();
```

## Error Handling

- **No active season:** Jobs skip scheduling gracefully
- **Missing dates:** Returns `null`, jobs skip scheduling
- **Database errors:** Throws error, logged to console
- **Invalid cache:** Re-queries database on next access

## Best Practices

1. **Always use Pacific timezone for input:** When creating seasons via API
2. **Invalidate cache explicitly:** Use the `/dates` endpoint for updates
3. **Test with future dates:** Use date overrides in development
4. **Monitor logs:** Check scheduler output for scheduling confirmations
5. **Verify active season:** Only one season should have `is_active = true`

## Troubleshooting

**Jobs not scheduling on startup:**
- Check if there's an active season: `SELECT * FROM seasons WHERE is_active = true`
- Verify dates are in the future
- Check server logs for error messages

**Cache not updating after date change:**
- Use `PATCH /api/admin/seasons/:id/dates` instead of direct DB updates
- Or restart the server to force cache refresh

**Timezone confusion:**
- All times in DB are UTC
- SeasonConfig converts to Pacific automatically
- Use ISO 8601 format with timezone offset when updating via API
