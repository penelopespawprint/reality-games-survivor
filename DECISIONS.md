# Decisions Log

> **Every decision gets logged here with WHY and ALTERNATIVES_REJECTED.**
> **Check here before re-litigating settled decisions.**

---

## Template

### [DECISION TITLE]
**Date:** YYYY-MM-DD
**Context:** [What prompted this decision]
**Decision:** [What we decided]
**Why:** [Reasoning]
**Alternatives Rejected:** [What we didn't do and why]
**Revisit When:** [Conditions that would change this]

---

## Decisions

### Keep AdminNonprofitFunds.tsx (Mark as Future Feature)
**Date:** 2026-01-10
**Context:** Found `AdminNonprofitFunds.tsx` is not imported in App.tsx - appears to be dead code
**Decision:** Keep the file but mark as future feature, do not delete
**Why:** 
- The file appears intentionally created for nonprofit fund tracking
- Deleting working code is more destructive than leaving it
- May be needed when nonprofit features are enabled
**Alternatives Rejected:**
- Delete immediately: Too destructive, might lose intentional work
- Add route now: Would expose unfinished feature
**Revisit When:** Nonprofit features are prioritized or after 6 months if still unused

---

### Move Test Files to Dedicated Directory (Not Delete)
**Date:** 2026-01-10
**Context:** Found 27 test files in server root and 5 in project root
**Decision:** Move files to proper test directories rather than delete
**Why:**
- Test files have value for regression testing
- Moving preserves git history better than delete+recreate
- Follows standard project structure conventions
**Alternatives Rejected:**
- Delete all: Tests have value, would lose coverage
- Leave as-is: Clutters project root, confuses new developers
**Revisit When:** Test framework is properly configured

---

### Use supabaseAdmin for Role Lookups in Auth Middleware
**Date:** 2026-01-10 (documenting existing decision)
**Context:** Auth middleware needs to fetch user role from users table
**Decision:** Use `supabaseAdmin` (service role) to bypass RLS for role lookup
**Why:**
- RLS policies might prevent users from reading their own role
- Admin client ensures reliable role lookup regardless of RLS configuration
- Security: Only used server-side, never exposed to client
**Alternatives Rejected:**
- Use regular supabase client: Could fail due to RLS policies
- Store role in JWT: Would require token refresh on role change
**Revisit When:** RLS policies are simplified or role management changes

---

### Hardcode Production URL for Stripe Redirects
**Date:** 2026-01-10 (documenting existing decision)
**Context:** Stripe checkout needs success/cancel URLs
**Decision:** Hardcode `https://survivor.realitygamesfantasyleague.com` instead of using env vars
**Why:**
- Env vars can be misconfigured (e.g., pointing to API URL instead of frontend)
- Payment flows are critical - must never redirect to wrong domain
- Production URL is stable and known
**Alternatives Rejected:**
- Use BASE_URL env var: Risk of pointing to API domain
- Use FRONTEND_URL env var: Still risk of misconfiguration
**Revisit When:** Multi-environment deployment is needed (staging, etc.)

---

### Keep Legacy admin.ts While Extracting Routes
**Date:** 2026-01-10 (documenting existing decision)
**Context:** Admin routes are partially migrated to modular structure
**Decision:** Keep both legacy `admin.ts` and new modular routes during migration
**Why:**
- Gradual migration reduces risk of breaking changes
- Can validate new modules work before removing legacy code
- Documented in code comments for future developers
**Alternatives Rejected:**
- Big bang migration: Too risky for production system
- Never migrate: Technical debt accumulates
**Revisit When:** All routes are extracted to modules
