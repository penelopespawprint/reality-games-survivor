# RGFL Audit Master Prompt

> **Purpose:** Comprehensive codebase audit for Reality Games Fantasy League
> **Copy this entire prompt into Claude Code CLI**

---

## Part 0: Knowledge Persistence

Compaction loses nuance. Files are permanent memory.

1. **Read first:** Any existing .md context files in the repo
2. **Write immediately:** Decisions go to DECISIONS.md the moment they're made
3. **Update on exit:** SESSION_STATE.md with completed/blocked/partial/next
4. **Never assume:** If you can't read it in a file, you don't know it

---

## Part 1: Project Info

**Repository:** `~/Projects/reality-games-survivor/`

**That's all you get. Read the code to learn everything else.**

---

## Part 2: Audit Process

### Phase 1: Explore
1. List directory structure
2. Read all config files (package.json, tsconfig, etc.)
3. Read any existing documentation in the repo
4. Understand what this project actually is

### Phase 2: Build
1. Install dependencies
2. Run builds
3. Run tests (if they exist)
4. Document all output

### Phase 3: Read
1. Read every source file
2. Document what each file does
3. Quote file:line for claims

### Phase 4: Categorize
| Category | Criteria |
|----------|----------|
| **KEEP** | Works, production-ready |
| **REFACTOR** | Fixable issues |
| **BURN** | Rebuild cheaper than fix |
| **DEAD** | No callers, delete |

---

## Part 3: Output

Create `AUDIT_FINDINGS.md` with:
- Executive summary
- Build results
- Feature inventory (from code)
- Code categorization (with evidence)
- Database schema (from code)
- API endpoints (from code)

---

## Part 4: Rules

**Do:**
- Read code before claiming anything
- Quote file:line for every claim
- Create persistence files (AUDIT_FINDINGS.md, SESSION_STATE.md, DECISIONS.md)

**Don't:**
- Assume features exist
- Assume how things work
- Say "you could" — just do it
- Output partial code

---

## Part 5: Execute

```
cd ~/Projects/reality-games-survivor
```

Start reading. The code tells you what this project is.
