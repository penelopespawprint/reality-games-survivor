# Season Config API Examples

## Prerequisites

```bash
# Set your admin token
export ADMIN_TOKEN="your-admin-jwt-token-here"
export API_URL="https://rgfl-api-production.up.railway.app"

# Or for local testing
export API_URL="http://localhost:3001"
```

## 1. Create a New Season

```bash
curl -X POST "${API_URL}/api/admin/seasons" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "number": 51,
    "name": "Survivor 51",
    "registration_opens_at": "2027-01-15T12:00:00-08:00",
    "draft_order_deadline": "2027-02-01T12:00:00-08:00",
    "registration_closes_at": "2027-03-10T17:00:00-08:00",
    "premiere_at": "2027-03-10T20:00:00-08:00",
    "draft_deadline": "2027-03-17T20:00:00-08:00",
    "finale_at": "2027-05-26T20:00:00-07:00"
  }'
```

**Expected Response:**
```json
{
  "season": {
    "id": "uuid-here",
    "number": 51,
    "name": "Survivor 51",
    "is_active": false,
    "draft_deadline": "2027-03-18T04:00:00.000Z",
    ...
  }
}
```

## 2. Activate a Season

```bash
# Replace :id with actual season UUID
curl -X POST "${API_URL}/api/admin/seasons/:id/activate" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "season": {
    "id": "uuid-here",
    "number": 51,
    "is_active": true,
    ...
  },
  "previous_deactivated": true
}
```

**Server Logs Should Show:**
```
Season 51 activated, cache invalidated
```

## 3. Update Season Dates (with Job Rescheduling)

```bash
curl -X PATCH "${API_URL}/api/admin/seasons/:id/dates" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "draft_deadline": "2027-03-18T20:00:00-08:00",
    "draft_order_deadline": "2027-02-02T12:00:00-08:00"
  }'
```

**Expected Response:**
```json
{
  "season": {
    "id": "uuid-here",
    "draft_deadline": "2027-03-19T04:00:00.000Z",
    "draft_order_deadline": "2027-02-02T20:00:00.000Z",
    ...
  },
  "rescheduled_jobs": [
    "auto-randomize-rankings",
    "draft-finalize"
  ]
}
```

**Server Logs Should Show:**
```
Season dates updated, cache invalidated
Scheduling auto-randomize rankings for 2027-02-02T20:00:00.000Z (1234 hours)
Scheduling draft finalization for 2027-03-19T04:00:00.000Z (2345 hours)
Rescheduled jobs: auto-randomize-rankings, draft-finalize
```

## 4. Update Other Season Fields (General Update)

```bash
curl -X PATCH "${API_URL}/api/admin/seasons/:id" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Survivor 51: Island of Secrets",
    "finale_at": "2027-05-27T20:00:00-07:00"
  }'
```

**Note:** This endpoint also invalidates cache if any date fields are included.

## 5. Check Job Status

```bash
curl "${API_URL}/api/admin/jobs" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "jobs": [
    {
      "name": "email-queue-processor",
      "schedule": "*/5 * * * *",
      "description": "Process pending emails from queue with retry logic",
      "enabled": true
    },
    {
      "name": "auto-randomize-rankings",
      "schedule": "One-time: From database (draft_order_deadline)",
      "description": "Auto-generate random rankings for users who haven't submitted",
      "enabled": true
    },
    {
      "name": "draft-finalize",
      "schedule": "One-time: From database (draft_deadline)",
      "description": "Auto-complete incomplete drafts",
      "enabled": true
    }
  ]
}
```

## 6. Manually Trigger a Job (For Testing)

```bash
# Trigger draft finalization manually
curl -X POST "${API_URL}/api/admin/jobs/draft-finalize/run" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

## Testing Scenarios

### Scenario 1: Update Draft Deadline for Active Season

```bash
# 1. Get current active season
SEASON_ID=$(curl -s "${API_URL}/api/admin/seasons" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | \
  jq -r '.seasons[] | select(.is_active == true) | .id')

# 2. Update draft deadline to 1 hour from now
NEW_DEADLINE=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%S-08:00")

curl -X PATCH "${API_URL}/api/admin/seasons/${SEASON_ID}/dates" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"draft_deadline\": \"${NEW_DEADLINE}\"
  }"

# 3. Verify jobs were rescheduled
curl "${API_URL}/api/admin/jobs" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | \
  jq '.jobs[] | select(.name == "draft-finalize")'
```

### Scenario 2: Set Up Season 52 for Next Year

```bash
# Create season for 2028
curl -X POST "${API_URL}/api/admin/seasons" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "number": 52,
    "name": "Survivor 52",
    "registration_opens_at": "2028-01-15T12:00:00-08:00",
    "draft_order_deadline": "2028-02-01T12:00:00-08:00",
    "registration_closes_at": "2028-03-10T17:00:00-08:00",
    "premiere_at": "2028-03-10T20:00:00-08:00",
    "draft_deadline": "2028-03-17T20:00:00-08:00"
  }' | jq '.season.id'

# Don't activate yet - will activate when Season 51 ends
```

### Scenario 3: Emergency Date Change

```bash
# Quickly update premiere date if CBS changes schedule
curl -X PATCH "${API_URL}/api/admin/seasons/${SEASON_ID}/dates" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "premiere_at": "2027-03-17T20:00:00-08:00",
    "registration_closes_at": "2027-03-17T17:00:00-08:00"
  }'

# No redeployment needed!
```

## Error Handling Examples

### Missing Date Fields
```bash
curl -X PATCH "${API_URL}/api/admin/seasons/${SEASON_ID}/dates" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "error": "No date fields provided"
}
```

### Invalid Season ID
```bash
curl -X PATCH "${API_URL}/api/admin/seasons/invalid-uuid/dates" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"draft_deadline": "2027-03-18T20:00:00-08:00"}'
```

**Response:**
```json
{
  "error": "Season not found"
}
```

### Unauthorized Access
```bash
curl -X PATCH "${API_URL}/api/admin/seasons/${SEASON_ID}/dates" \
  -H "Content-Type: application/json" \
  -d '{"draft_deadline": "2027-03-18T20:00:00-08:00"}'
```

**Response:**
```json
{
  "error": "Unauthorized"
}
```

## Monitoring and Verification

### Check Server Logs

```bash
# Railway logs
railway logs --service rgfl-api

# Look for:
# - "Active Season: ..."
# - "Draft Order Deadline: ..."
# - "Scheduling auto-randomize rankings for..."
# - "Season dates updated, cache invalidated"
```

### Verify in Database

```bash
# Connect to Supabase
psql $DATABASE_URL

# Check active season
SELECT number, name, is_active, draft_deadline, draft_order_deadline
FROM seasons
WHERE is_active = true;

# Check all seasons
SELECT number, name, is_active, draft_deadline
FROM seasons
ORDER BY number DESC;
```

## Timezone Notes

All dates should be provided in Pacific time with timezone offset:

- **PST (Winter):** `-08:00` (UTC-8)
- **PDT (Summer):** `-07:00` (UTC-7)

Examples:
```
"2027-02-15T12:00:00-08:00"  # Feb 15 noon PST
"2027-06-15T12:00:00-07:00"  # Jun 15 noon PDT
```

The API stores these as UTC in the database and converts to Pacific time when scheduling jobs.
