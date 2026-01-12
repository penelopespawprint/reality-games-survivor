# CLAUDE.md

## Project

**Name:** reality-games-survivor
**Languages:** JavaScript/TypeScript
**Frameworks:** Express
**Database:** Supabase, MongoDB, PostgreSQL
**Auth:** Auth0, Supabase Auth
**Hosting:** None detected

## Rules

1. Read `SESSION_STATE.md` for where you left off
2. Read `DECISIONS.md` before re-deciding anything
3. Write decisions to DECISIONS.md immediately when made
4. Update SESSION_STATE.md before session ends
5. Quote file:line for all claims

## Forbidden

- "You could..." → do it
- "Consider..." → decide
- "// rest remains the same" → complete files
- Re-litigating decisions already in DECISIONS.md

## Context

### Key Architecture Patterns

**EditableText Component Pattern**
- All user-facing text should use `<EditableText copyKey="..." as="tag">` components
- Enables inline CMS editing when logged in as admin
- Copy keys stored in `site_copy` database table
- Import: `import { EditableText } from '@/components/EditableText'`
- Requires: `import { useSiteCopy } from '@/lib/hooks/useSiteCopy'`
- Example: `<EditableText copyKey="page.header.title" as="h1">{getCopy('page.header.title', 'Default Text')}</EditableText>`

**Layout Wrapper Pattern**
- Pages in App.tsx wrapped with `<Layout />` component automatically get Navigation and Footer
- DO NOT add Navigation/Footer to pages already wrapped in Layout
- Check App.tsx routing to see which pages use Layout wrapper
- Layout component location: `web/src/components/Layout.tsx`

**Category Management (Admin Pages)**
- FAQ and Scoring Rule categories stored in `site_copy` table
- Page values: `faq_categories`, `scoring_categories`
- Auto-seed default categories on first load
- CRUD operations via standard site_copy API endpoints
- No database migration required for new categories

### Key Files

**Admin Pages** (`web/src/pages/admin/`)
- AdminFAQ.tsx - FAQ management with editable categories
- AdminScoringRules.tsx - Scoring rules with editable categories
- AdminNonprofitFunds.tsx - DEAD CODE (no route, future feature)

**Public Pages** (`web/src/pages/`)
- Castaways.tsx - Castaway listing (has EditableText)
- CastawayDetail.tsx - Individual castaway page (fully editable)
- Leagues.tsx - League listing (uses Layout wrapper)
- GlobalLeaderboard.tsx - Global rankings (uses Layout wrapper)
- ScoringRules.tsx - Public scoring rules (fully editable)

**Database Tables**
- `site_copy` - CMS content storage (key, page, content, sort_order, is_active)
- `castaways` - Survivor contestants
- `leagues` - User-created leagues
- `scoring_rules` - Point rules for gameplay
- `episode_scores` - Weekly scoring events

### Common Tasks

**Making a page editable:**
1. Import EditableText and useSiteCopy
2. Add `const { getCopy } = useSiteCopy()` to component
3. Wrap static text with `<EditableText copyKey="unique.key" as="tag">{getCopy('unique.key', 'Default')}</EditableText>`
4. Use dot notation for copy keys: `page.section.element`

**Adding to Layout wrapper:**
1. Edit `web/src/App.tsx`
2. Add route inside `<Route element={<Layout />}>` block
3. Remove Navigation/Footer from the page component

**Creating new admin categories:**
1. Use existing pattern from AdminFAQ.tsx or AdminScoringRules.tsx
2. Store in `site_copy` table with unique `page` value
3. Auto-seed defaults in useEffect
4. Add CRUD mutations with TanStack Query

---
