# RGFL Rollback Procedures

## Quick Reference

| Scenario | Action | Time to Recover |
|----------|--------|-----------------|
| Bad deploy | Render Dashboard → Redeploy previous | ~2 min |
| Database schema issue | Prisma migrate rollback | ~5 min |
| Env var misconfiguration | Render Dashboard → Update vars | ~1 min |
| Complete outage | Follow Emergency Procedure | ~10 min |

---

## 1. Code Rollback (Render)

### Via Dashboard (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select **rgfl-multi** service
3. Click **Deployments** tab
4. Find last successful deployment (green checkmark)
5. Click **⋮** menu → **Redeploy**
6. Wait for deployment to complete (~2 min)

### Via API
```bash
# List recent deployments
curl -s "https://api.render.com/v1/services/srv-d3fohhvfte5s73dafgig/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" | jq '.[] | {id, status, createdAt}'

# Trigger redeploy of specific commit
curl -X POST "https://api.render.com/v1/services/srv-d3fohhvfte5s73dafgig/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"commitId": "abc123"}'
```

### Via Git Revert
```bash
# Revert the problematic commit
git revert HEAD --no-edit
git push origin main

# Or reset to known good state (destructive)
git reset --hard <good-commit>
git push origin main --force  # DANGER: only if you're certain
```

---

## 2. Database Rollback

### Check Current Migration Status
```bash
DATABASE_URL="postgresql://..." npx prisma migrate status
```

### Rollback Last Migration
Prisma doesn't have a built-in rollback command. Use these strategies:

#### Option A: Create Reverse Migration
```bash
# Generate SQL to reverse changes
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma.backup \
  --script > rollback.sql

# Apply rollback
psql $DATABASE_URL < rollback.sql
```

#### Option B: Restore from Backup
```bash
# Render PostgreSQL backups are available for 7 days
# Contact support or use dashboard to restore

# Manual backup before risky changes
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

#### Option C: Manual SQL Fixes
```sql
-- Example: Remove a column that was added
ALTER TABLE "User" DROP COLUMN IF EXISTS "newColumn";

-- Example: Restore a dropped column
ALTER TABLE "User" ADD COLUMN "restoredColumn" TEXT;

-- Example: Revert data changes
UPDATE "User" SET status = 'ACTIVE' WHERE status = 'MIGRATED';
```

### Mark Migration as Rolled Back
```bash
# After manual rollback, mark migration as not applied
npx prisma migrate resolve --rolled-back <migration_name>
```

---

## 3. Environment Variable Rollback

### Via Dashboard
1. Render Dashboard → rgfl-multi → Environment
2. Update/revert the problematic variable
3. Service auto-restarts with new values

### Via API
```bash
# Get current env vars
curl -s "https://api.render.com/v1/services/srv-d3fohhvfte5s73dafgig/env-vars" \
  -H "Authorization: Bearer $RENDER_API_KEY"

# Update specific var
curl -X PUT "https://api.render.com/v1/services/srv-d3fohhvfte5s73dafgig/env-vars/VAR_NAME" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"value": "previous-value"}'
```

### Keep Backup of Env Vars
```bash
# Before making changes, export current state
curl -s "https://api.render.com/v1/services/srv-d3fohhvfte5s73dafgig/env-vars" \
  -H "Authorization: Bearer $RENDER_API_KEY" > env_backup_$(date +%Y%m%d).json
```

---

## 4. Emergency Procedure

If the site is completely down:

### Step 1: Verify the Issue (1 min)
```bash
# Check if it's a DNS/CDN issue
curl -I https://test.realitygamesfantasyleague.com

# Check health endpoint
curl https://test.realitygamesfantasyleague.com/api/health

# Check Render status
open https://status.render.com
```

### Step 2: Check Render Logs (1 min)
```bash
# Via API
curl -s "https://api.render.com/v1/services/srv-d3fohhvfte5s73dafgig/logs" \
  -H "Authorization: Bearer $RENDER_API_KEY"

# Or via Dashboard → Logs tab
```

### Step 3: Quick Fixes

#### If startup is failing:
```bash
# Redeploy previous working version
# Dashboard → Deployments → Previous success → Redeploy
```

#### If database connection is failing:
```bash
# Verify database is up
psql $DATABASE_URL -c "SELECT 1"

# Check if connection string is correct in env vars
```

#### If out of memory:
```bash
# Upgrade plan temporarily via Dashboard
# Or optimize the problematic code and redeploy
```

### Step 4: Communicate (1 min)
- Update status in Slack/Discord if applicable
- If extended outage, post to social media

### Step 5: Post-Incident
- Document what happened
- Create Linear issue for root cause analysis
- Update this runbook if needed

---

## 5. Post-Rollback Verification

After any rollback, verify:

```bash
# 1. Health check
curl https://test.realitygamesfantasyleague.com/api/health

# 2. Auth is working
curl -X POST https://test.realitygamesfantasyleague.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# 3. API responds
curl https://test.realitygamesfantasyleague.com/api/leagues/my-leagues \
  -H "Authorization: Bearer <token>"

# 4. Database queries work
curl https://test.realitygamesfantasyleague.com/api/castaways

# 5. Static assets load
curl -I https://test.realitygamesfantasyleague.com/assets/index.js
```

### Manual Verification Checklist
- [ ] Homepage loads
- [ ] Login works
- [ ] Dashboard displays correctly
- [ ] League data appears
- [ ] Picks can be submitted (if season active)
- [ ] Admin panel accessible (if admin)

---

## 6. Prevention

### Before Deploying
1. Run tests locally: `npm test`
2. Build locally: `npm run build`
3. Check for TypeScript errors: `npm run check`
4. Review changes in PR

### Deployment Best Practices
1. Deploy during low-traffic times (not during Survivor episodes)
2. Keep deployments small and focused
3. Have rollback plan ready before deploying
4. Monitor logs after deployment

### Backup Schedule
- Database: Render auto-backups daily (7 day retention)
- Code: Git history
- Env vars: Export before changes

---

## Contacts

- **Render Support**: support@render.com
- **Project Lead**: richard@realitygamesfantasyleague.com
- **Render Status**: https://status.render.com
