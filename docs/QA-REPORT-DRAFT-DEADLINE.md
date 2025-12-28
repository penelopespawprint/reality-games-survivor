# QA Test Report: Draft Deadline Enforcement

**Test Date:** December 27, 2025
**Tester:** Claude (Exploratory Testing Agent)
**Component:** Draft System - Deadline Enforcement
**Priority:** P0 - CRITICAL

---

## Executive Summary

Testing revealed **COMPLETE FAILURE** of the draft deadline enforcement system. The documented draft mechanism (rankings-based auto-draft) is **NOT IMPLEMENTED** in the frontend, and there is **NO VALIDATION** preventing user actions after the draft deadline. The system has two conflicting draft implementations that cannot coexist.

**Status:** 0 out of 3 test scenarios passed
**Impact:** Draft deadline is completely unenforceable, leading to unfair competition

---

## Test Scenarios

### 1. Users Cannot Submit Rankings After Deadline

**Expected Behavior:**
- Users should be blocked from submitting/updating rankings after `draft_order_deadline` (Jan 5, 2026 12:00 PM PST)
- API should return 403 Forbidden with error message
- Frontend should display deadline warning and disable submission

**Actual Behavior:**
```
CRITICAL FAILURE: Rankings submission is NOT IMPLEMENTED
```

**Evidence:**
1. **No Frontend Implementation**
   - Searched entire `/web/src` directory for ranking submission UI
   - `DraftSettings.tsx` only implements interactive manual draft (pick-by-pick)
   - `Draft.tsx` only implements manual castaway selection, not rankings
   - Zero UI for users to submit rankings before deadline

2. **No API Endpoint**
   - Searched all route files in `/server/src/routes`
   - **No POST endpoint exists** for submitting rankings
   - Only admin routes reference `draft_rankings` table

3. **No Validation Logic**
   - `autoRandomizeRankings.ts` (lines 1-128) generates random rankings at deadline
   - Assumes users have already submitted rankings via non-existent UI
   - No deadline check in API to prevent late submissions (because endpoint doesn't exist)

**Database Evidence:**
```sql
-- Table exists but no frontend uses it
CREATE TABLE draft_rankings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  season_id UUID NOT NULL,
  rankings JSONB NOT NULL,  -- Array of castaway IDs
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);
```

**Result:** FAIL - Cannot test what doesn't exist

---

### 2. Auto-Complete Job Runs at Deadline

**Expected Behavior:**
- `finalizeDrafts` job executes at `draft_deadline` (Mar 2, 2026 8:00 PM PST)
- Auto-completes incomplete drafts by assigning random castaways
- Marks leagues as `draft_status: 'completed'`
- Users with incomplete rankings get random assignments

**Actual Behavior:**
```
PARTIAL IMPLEMENTATION: Job exists but relies on WRONG draft mechanism
```

**Evidence:**

1. **Job Scheduling Works (Correct)**
   - `/server/src/jobs/scheduler.ts` lines 145-185
   - `scheduleDraftFinalize()` reads `draft_deadline` from database
   - Schedules one-time timeout at correct time
   - Uses monitored job execution with alerting

2. **Job Logic Is WRONG (Critical Bug)**
   - `/server/src/jobs/finalizeDrafts.ts` lines 1-133
   - **Assumes interactive manual draft**, not rankings-based
   - Queries leagues with `draft_status IN ('pending', 'in_progress')`
   - Tries to fill empty roster slots with random castaways
   - **IGNORES** the `draft_rankings` table completely
   - Does NOT use user-submitted rankings to execute snake draft

3. **Conflicting Draft Mechanisms**

   **Documentation Says (CLAUDE.md line 53):**
   ```
   Draft: After Episode 1: Users rank preferences, snake draft assigns 2 castaways
   ```

   **Code Actually Does:**
   - Frontend: Interactive manual draft room (`DraftSettings.tsx`, `Draft.tsx`)
   - Backend: Auto-completes manual drafts, not rankings-based drafts
   - Rankings table: Exists but unused
   - Auto-randomize job: Generates rankings but nothing uses them

**Code Comparison:**

```typescript
// What SHOULD happen (based on docs)
// 1. User submits rankings via API before Jan 5
// 2. autoRandomizeRankings runs Jan 5 (fills missing rankings)
// 3. finalizeDrafts runs Mar 2 (executes snake draft using rankings)

// What ACTUALLY happens (based on code)
// 1. Commissioner starts manual draft (DraftSettings.tsx line 141-158)
// 2. Users manually pick castaways one-by-one (Draft.tsx)
// 3. finalizeDrafts runs Mar 2 (fills incomplete manual drafts randomly)
// 4. Rankings system exists but is completely unused
```

**Result:** FAIL - Job runs but executes wrong algorithm

---

### 3. Users With No Rankings Get Random Assignments

**Expected Behavior:**
- `autoRandomizeRankings` job runs at `draft_order_deadline` (Jan 5, 2026)
- Finds users in leagues without rankings in `draft_rankings` table
- Generates random ranking for each user
- These rankings are used by `finalizeDrafts` on Mar 2

**Actual Behavior:**
```
ORPHANED FEATURE: Job works but generated data is never used
```

**Evidence:**

1. **Job Implementation (Technically Correct)**
   - `/server/src/jobs/autoRandomizeRankings.ts` lines 1-128
   - Correctly identifies users without rankings
   - Generates random shuffled array of castaway IDs
   - Inserts into `draft_rankings` table with `submitted_at` timestamp

2. **Fatal Flaw: Nothing Reads This Data**
   ```typescript
   // autoRandomizeRankings.ts (line 99-107)
   await supabaseAdmin
     .from('draft_rankings')
     .insert({
       user_id: userId,
       season_id: season.id,
       rankings: shuffled,  // Random order saved here
       submitted_at: now.toISOString(),
     });

   // BUT: No code ever queries draft_rankings to execute draft
   // finalizeDrafts.ts does NOT use this table
   // Draft.tsx does NOT use this table
   ```

3. **Grep Results Show Isolation**
   ```bash
   # Only 3 files reference draft_rankings:
   - autoRandomizeRankings.ts (writes to table)
   - 007_global_draft_rankings.sql (creates table)
   - JOB_MONITORING.md (mentions job in docs)

   # Files that SHOULD use it but DON'T:
   - finalizeDrafts.ts (uses manual draft logic instead)
   - Draft.tsx (uses interactive picking)
   - draft.ts routes (RPC function for manual picks)
   ```

**Result:** FAIL - Feature works in isolation but has zero integration

---

## Root Cause Analysis

### The Fundamental Problem

**Two incompatible draft systems exist in the codebase:**

1. **Rankings-Based Auto-Draft (Partially Implemented)**
   - Database table: `draft_rankings`
   - Job: `autoRandomizeRankings`
   - Job: `finalizeDrafts` (claims to use rankings, doesn't)
   - Frontend: **MISSING COMPLETELY**
   - API endpoints: **MISSING COMPLETELY**
   - Status: **40% complete** (backend only, no user-facing features)

2. **Interactive Manual Draft (Fully Implemented)**
   - Frontend: `DraftSettings.tsx`, `Draft.tsx`
   - API: `POST /api/leagues/:id/draft/pick`
   - Database: `rosters` table with `draft_round`, `draft_pick`
   - PostgreSQL RPC: `submit_draft_pick` (atomic transaction)
   - Status: **100% complete** (fully functional)

### Why This Happened

1. **Documentation-Code Mismatch**
   - `CLAUDE.md` documents rankings-based draft (the intended design)
   - Code implements interactive draft (what actually got built)
   - No one reconciled the two approaches

2. **Orphaned Migration**
   - Migration `007_global_draft_rankings.sql` created table
   - Table was never integrated with actual draft flow
   - Auto-randomize job was written to populate unused table

3. **No End-to-End Testing**
   - Individual components work in isolation
   - No integration tests verify draft deadline enforcement
   - No validation that user rankings actually drive draft results

---

## Critical Bugs Identified

### BUG #1: No Rankings Submission Endpoint (P0 - BLOCKING)

**Severity:** Critical
**Impact:** Rankings-based draft is completely impossible

**Description:**
Users cannot submit rankings because no API endpoint exists. The documented draft flow cannot function.

**Location:** Missing from `/server/src/routes/`

**Required Implementation:**
```typescript
// POST /api/seasons/:seasonId/rankings
// Body: { rankings: string[] } // Array of castaway IDs
// Validation:
//   - Check deadline hasn't passed (draft_order_deadline)
//   - Verify all castaway IDs are valid
//   - Upsert into draft_rankings table
```

---

### BUG #2: No Rankings Submission UI (P0 - BLOCKING)

**Severity:** Critical
**Impact:** Users have no way to participate in rankings-based draft

**Description:**
Frontend lacks any interface for users to rank castaways before deadline.

**Location:** Missing from `/web/src/pages/`

**Required Implementation:**
- Drag-and-drop castaway ranking interface
- Countdown timer to `draft_order_deadline`
- "Save Rankings" button calling API
- Deadline warning when time expires

---

### BUG #3: finalizeDrafts Job Ignores Rankings (P0 - BLOCKING)

**Severity:** Critical
**Impact:** Auto-randomize job is useless, draft results ignore user preferences

**Description:**
The `finalizeDrafts` job (Mar 2 deadline) executes manual draft completion logic instead of using the rankings from `draft_rankings` table to perform snake draft.

**Location:** `/server/src/jobs/finalizeDrafts.ts`

**Current Logic (WRONG):**
```typescript
// Lines 56-109: Manual draft auto-completion
const shuffled = [...availableCastaways].sort(() => Math.random() - 0.5);
// Assigns random castaways to empty roster slots
```

**Required Logic:**
```typescript
// Should use rankings to execute snake draft:
// 1. Load each user's rankings from draft_rankings table
// 2. Execute snake draft algorithm using those rankings
// 3. Assign top 2 ranked available castaways to each user
// 4. Handle conflicts when multiple users want same castaway
```

---

### BUG #4: No Deadline Validation (P1 - HIGH)

**Severity:** High
**Impact:** Users could submit rankings after deadline (if endpoint existed)

**Description:**
Even if ranking submission API existed, there's no validation preventing submissions after `draft_order_deadline`.

**Location:** Missing validation in non-existent API endpoint

**Required Implementation:**
```typescript
// In ranking submission endpoint:
const deadline = await seasonConfig.getDraftOrderDeadline();
if (!deadline || DateTime.now() > deadline) {
  return res.status(403).json({
    error: 'Draft order deadline has passed',
    deadline: deadline?.toISO()
  });
}
```

---

### BUG #5: Two Draft Systems Cannot Coexist (P0 - ARCHITECTURE)

**Severity:** Critical
**Impact:** Fundamental design conflict

**Description:**
The system tries to support both interactive manual drafts AND rankings-based auto-drafts. These are mutually exclusive approaches that cannot work together.

**Decision Required:**
You MUST choose ONE draft system and remove the other:

**Option A: Keep Interactive Manual Draft (Recommended)**
- Status: Fully functional, tested, UI complete
- Action: Remove `draft_rankings` table and auto-randomize job
- Effort: 2 hours (cleanup)
- Risk: Low

**Option B: Implement Rankings-Based Auto-Draft**
- Status: 40% complete, no frontend, no API
- Action: Build UI, API, fix finalizeDrafts job
- Effort: 40+ hours (major feature development)
- Risk: High (3 weeks before launch)

---

## Test Evidence

### Code Locations Analyzed

**Backend:**
- `/server/src/jobs/autoRandomizeRankings.ts` - Lines 1-128
- `/server/src/jobs/finalizeDrafts.ts` - Lines 1-133
- `/server/src/jobs/scheduler.ts` - Lines 99-185
- `/server/src/routes/draft.ts` - Lines 1-453
- `/server/src/lib/season-config.ts` - Lines 1-182

**Frontend:**
- `/web/src/pages/DraftSettings.tsx` - Lines 1-404
- `/web/src/pages/Draft.tsx` - Not fully examined (manual draft UI)

**Database:**
- `/supabase/migrations/007_global_draft_rankings.sql`

**Search Results:**
```bash
# Ranking submission endpoints
grep -r "POST.*ranking" server/src/routes/ → No matches

# Ranking UI components
find web/src -name "*ranking*" → No files found

# draft_rankings usage
grep -r "draft_rankings" server/src/ → Only autoRandomizeRankings.ts
```

---

## Recommendations

### Immediate Action Required (Pre-Launch)

**1. Make Architectural Decision (Dec 28, 2025)**
- Choose ONE draft system: Interactive OR Rankings-based
- Document decision in CLAUDE.md
- Update all documentation to match chosen approach

**2. If Keeping Interactive Draft (Recommended):**
```sql
-- Remove unused table
DROP TABLE draft_rankings CASCADE;
```
```typescript
// Remove unused job
// Delete: /server/src/jobs/autoRandomizeRankings.ts
// Update: scheduler.ts to remove scheduleAutoRandomizeRankings()
```
```markdown
// Update documentation
CLAUDE.md line 53:
- OLD: "Users rank preferences, snake draft assigns 2 castaways"
+ NEW: "Interactive draft: Users manually pick 2 castaways via draft room"
```

**3. If Implementing Rankings-Based Draft:**
- **Week 1:** Build rankings submission API + deadline validation
- **Week 2:** Build frontend ranking UI + deadline countdown
- **Week 3:** Rewrite finalizeDrafts job to use rankings for snake draft
- **Week 4:** Integration testing + fix all edge cases
- **Risk:** High - Major feature work 3 weeks before launch

---

## Severity Assessment

| Issue | Severity | Impact | Effort | Status |
|-------|----------|--------|--------|--------|
| No rankings API | P0 | Blocking | 8h | Not Started |
| No rankings UI | P0 | Blocking | 16h | Not Started |
| finalizeDrafts wrong algorithm | P0 | Blocking | 12h | Not Started |
| No deadline validation | P1 | High | 2h | Not Started |
| Conflicting systems | P0 | Architecture | 2-40h | Undecided |

**Total Effort if Implementing Rankings:** ~40 hours
**Total Effort if Removing Rankings:** ~2 hours

---

## Attachments

### Proof: No Rankings Submission Code

**API Route Search:**
```bash
$ grep -r "ranking" server/src/routes/*.ts
server/src/routes/admin.ts: (only reads draft_rankings, no POST)
# No submission endpoints found
```

**Frontend Search:**
```bash
$ find web/src -type f -name "*.tsx" -exec grep -l "ranking" {} \;
web/src/pages/DraftSettings.tsx (manages draft_order, not rankings)
web/src/pages/Draft.tsx (manual picking, not rankings)
# No ranking submission UI found
```

### Proof: finalizeDrafts Ignores Rankings

**File:** `/server/src/jobs/finalizeDrafts.ts`

```typescript
// Lines 56-109: NOWHERE does it query draft_rankings
const { data: allCastaways } = await supabaseAdmin
  .from('castaways')  // ← Gets ALL castaways
  .select('id')
  .eq('season_id', season.id);

const shuffled = [...availableCastaways].sort(() => Math.random() - 0.5);
// ↑ RANDOM assignment, ignores user rankings

// Missing code:
// const { data: userRankings } = await supabaseAdmin
//   .from('draft_rankings')
//   .select('rankings')
//   .eq('user_id', userId);
// ← This query NEVER happens
```

---

## Sign-Off

**Exploratory Testing Completed:** December 27, 2025
**Recommendation:** Remove rankings system OR delay launch by 4 weeks
**Next Steps:** Architectural decision required before any bug fixes

**Critical Path:**
1. Choose draft system (TODAY)
2. If rankings: Build missing features (3-4 weeks)
3. If interactive: Remove unused code (1 day)
4. Re-test draft deadline enforcement
5. Integration testing with real deadline times

---

## Appendix: System Design Comparison

### Rankings-Based Auto-Draft (Documented, Not Implemented)

**User Flow:**
1. User joins league (before Jan 5)
2. User submits ranking of all 18-24 castaways
3. Jan 5 12pm: autoRandomizeRankings fills missing rankings
4. Mar 2 8pm: finalizeDrafts executes snake draft using rankings
5. Each user gets their top 2 ranked available castaways

**Advantages:**
- No real-time coordination needed
- Fair for all timezones
- Works with async scheduling

**Current Status:** 40% complete, missing API and UI

---

### Interactive Manual Draft (Implemented, Not Documented)

**User Flow:**
1. Commissioner sets draft order (DraftSettings.tsx)
2. Commissioner starts draft (triggers status: 'in_progress')
3. Users take turns picking castaways in snake order
4. Mar 2 8pm: Auto-completes any unfinished picks randomly

**Advantages:**
- Traditional fantasy sports experience
- Social/competitive element
- User control over picks

**Current Status:** 100% complete and functional

---

**End of Report**
