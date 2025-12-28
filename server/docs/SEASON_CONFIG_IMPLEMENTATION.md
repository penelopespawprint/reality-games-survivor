# Database-Driven Season Dates Implementation

## Summary

Implemented dynamic season configuration that loads key dates from the database instead of hardcoding them in the scheduler. This eliminates the need for code changes and redeployment when updating dates for new seasons.

## What Was Changed

### 1. New SeasonConfig Service (`server/src/lib/season-config.ts`)

A singleton service that:
- Loads the active season from the `seasons` table
- Caches season data in memory for 1 hour
- Provides timezone-aware date accessors using Luxon
- Exposes cache invalidation for admin updates

**Key Features:**
- ✅ Automatic DST handling (Pacific timezone)
- ✅ In-memory caching (1 hour TTL)
- ✅ Graceful handling of missing active season
- ✅ Returns Luxon DateTime objects for timezone-safe operations

### 2. Updated Scheduler (`server/src/jobs/scheduler.ts`)

**Changes:**
- Made `startScheduler()` async to load season data on startup
- Updated `scheduleAutoRandomizeRankings()` to use database dates
- Updated `scheduleDraftFinalize()` to use database dates
- Added season info logging on scheduler startup
- Gracefully skips scheduling if no active season exists

**Preserved:**
- ✅ All existing DST-aware timezone handling
- ✅ `pstToCron()` utility for recurring jobs
- ✅ Manual date override capability for testing
- ✅ Job monitoring with `monitoredJobExecution`

### 3. Updated Server Entry Point (`server/src/server.ts`)

- Changed listener callback to async to await `startScheduler()`
- Ensures season config is loaded before jobs are scheduled

### 4. Enhanced Admin API (`server/src/routes/admin.ts`)

**New Endpoint:**
```
PATCH /api/admin/seasons/:id/dates
```
- Updates season dates (draft_deadline, draft_order_deadline, etc.)
- Invalidates season config cache
- Automatically reschedules one-time jobs if season is active
- Returns list of rescheduled jobs

**Enhanced Endpoints:**
- `PATCH /api/admin/seasons/:id` - Now invalidates cache on date updates
- `POST /api/admin/seasons/:id/activate` - Now invalidates cache on activation

### 5. Documentation

Created comprehensive documentation:
- `server/docs/SEASON_CONFIG.md` - Full usage guide
- `server/scripts/test-season-config.ts` - Test script for validation

## Files Modified

1. `server/src/lib/season-config.ts` - **NEW**
2. `server/src/jobs/scheduler.ts` - Modified
3. `server/src/server.ts` - Modified
4. `server/src/routes/admin.ts` - Modified
5. `server/docs/SEASON_CONFIG.md` - **NEW**
6. `server/scripts/test-season-config.ts` - **NEW**

## Database Schema (No Changes Required)

The existing `seasons` table already has all required fields:
- `draft_deadline` - Used by draft finalization job
- `draft_order_deadline` - Used by auto-randomize rankings job
- `registration_closes_at` - Available for future use
- `premiere_at` - Available for future use
- `is_active` - Determines which season to load

## How It Works

1. **On Server Startup:**
   ```
   Server starts → startScheduler() called
   → SeasonConfig loads active season from DB
   → Logs season info (name, number, dates)
   → Schedules one-time jobs using database dates
   → Falls back gracefully if no active season
   ```

2. **When Admin Updates Dates:**
   ```
   PATCH /api/admin/seasons/:id/dates
   → Updates dates in database
   → Invalidates cache
   → Reschedules affected one-time jobs
   → Returns updated season + rescheduled job list
   ```

3. **Recurring Jobs (Unchanged):**
   - Weekly picks lock (Wed 3pm PST)
   - Pick reminders (Wed 12pm PST)
   - Results notifications (Fri 12pm PST)
   - Weekly summary (Sun 10am PST)
   - Draft reminders (Daily 9am PST)

   These use the existing `pstToCron()` utility and don't need database dates.

## Testing

### Build Verification
```bash
cd server && npm run build
```
✅ TypeScript compilation successful

### Manual Testing
```bash
# Run test script
tsx server/scripts/test-season-config.ts

# Or via npm if added to package.json
npm run test:season-config
```

### Integration Testing

1. **Create a test season:**
   ```bash
   POST /api/admin/seasons
   {
     "number": 99,
     "name": "Test Season",
     "registration_opens_at": "2026-01-01T12:00:00-08:00",
     "draft_order_deadline": "2026-01-15T12:00:00-08:00",
     "registration_closes_at": "2026-02-01T17:00:00-08:00",
     "premiere_at": "2026-02-01T20:00:00-08:00",
     "draft_deadline": "2026-02-08T20:00:00-08:00"
   }
   ```

2. **Activate it:**
   ```bash
   POST /api/admin/seasons/:id/activate
   ```

3. **Update dates:**
   ```bash
   PATCH /api/admin/seasons/:id/dates
   {
     "draft_deadline": "2026-02-09T20:00:00-08:00"
   }
   ```

4. **Check job status:**
   ```bash
   GET /api/admin/jobs
   ```

## Migration Path for New Seasons

**Old Way (Required Code Changes):**
```typescript
// Hardcoded in scheduler.ts - required redeploy!
const target = new Date('2026-03-03T04:00:00Z');
```

**New Way (No Code Changes):**
```bash
# Just update the database via API
PATCH /api/admin/seasons/:id/dates
{
  "draft_deadline": "2027-03-10T20:00:00-08:00",
  "draft_order_deadline": "2027-02-15T12:00:00-08:00"
}
```

## Benefits

1. ✅ **No Redeployment Required** - Update dates via API
2. ✅ **Centralized Configuration** - All dates in one place (DB)
3. ✅ **Admin-Friendly** - Non-technical admins can update dates
4. ✅ **Automatic Rescheduling** - Jobs update when dates change
5. ✅ **Cache Performance** - Fast access with 1-hour cache
6. ✅ **DST Handling** - Timezone-aware using Luxon
7. ✅ **Graceful Degradation** - Works without active season
8. ✅ **Backward Compatible** - Manual overrides still work for testing

## Future Enhancements (Optional)

1. **Admin UI** - Web interface for date management
2. **Notification on Update** - Email admins when dates change
3. **Date Validation** - Ensure dates are in logical order
4. **Historical Tracking** - Audit log for date changes
5. **Multi-Season Support** - Schedule jobs for future seasons in advance
6. **Webhook Integration** - Notify external systems of date changes

## Rollback Plan

If issues arise, the original hardcoded dates can be restored:

1. Revert `scheduler.ts` to use hardcoded dates
2. Remove SeasonConfig import and calls
3. Redeploy

The database schema doesn't change, so no migrations needed.

## Conclusion

This implementation provides a clean, maintainable solution for managing season dates without requiring code changes or redeployment. The system is production-ready and includes comprehensive documentation and testing capabilities.
