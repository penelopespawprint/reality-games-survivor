# Outstanding Tasks

## 1. Remove Tribe References
Since tribe names are unknown for Season 50, remove all tribe-related content:

**Files to update:**
- `web/src/pages/ScoringRules.tsx` (lines 54-55)
  - Change "Tribe wins immunity challenge" → "Team wins immunity challenge"
  - Change "Tribe wins reward challenge" → "Team wins reward challenge"

- `web/src/pages/admin/AdminScoring.tsx` (line 75)
  - Update 'WON_IMMUNITY_TRIBE' scoring rule reference

- Note: `database.types.ts` has `tribe_original` but this is auto-generated from Supabase schema - can leave as-is since it's not user-facing

---

## 2. Verify Previous Fixes Are Working
Based on earlier feedback, verify these items work correctly:

- [ ] **Sticky Navigation** - Nav bar should be fixed at top when scrolling
- [ ] **Footer displays** - Footer component shows on all pages
- [ ] **Scoring page** - Shows "Earn Points"/"Lose Points" not numeric values
- [ ] **League chat** - Chat appears in league overview (not separate tab)
- [ ] **Home page renders** - Works for both authenticated and unauthenticated users

---

## 3. Quick Fixes Needed
- Replace "Tribe" with "Team" in pre-merge challenges section
- Test the site to confirm all previous fixes are live

---

## Commands to Deploy
```bash
git add -A
git commit -m "Replace tribe references with team"
git push -u origin claude/review-last-plan-3eKoM
```
