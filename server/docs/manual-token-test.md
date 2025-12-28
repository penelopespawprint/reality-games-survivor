# Manual Token Verification Test Instructions

## Prerequisites
Run these commands to set up test data:

```bash
# Export the service role key from Railway
export SUPABASE_SERVICE_ROLE_KEY=$(railway variables --service rgfl-api 2>/dev/null | grep "SUPABASE_SERVICE_ROLE_KEY" | awk -F '│' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')

# Run the automated test
chmod +x run-verify-token-test.sh
./run-verify-token-test.sh
```

## Manual Test Cases

### Test 1: Missing Token Parameter
```bash
curl -i "https://rgfl-api-production.up.railway.app/api/results/verify-token"
```

Expected:
- Status: 400
- Response: `{"error": "Token required"}`

### Test 2: Invalid Token
```bash
curl -i "https://rgfl-api-production.up.railway.app/api/results/verify-token?token=invalid_token_12345"
```

Expected:
- Status: 200
- Response: `{"valid": false}`

### Test 3: Valid Token
First, create a valid token in the database, then test:
```bash
# (Token created by test script)
curl -i "https://rgfl-api-production.up.railway.app/api/results/verify-token?token=<VALID_TOKEN>"
```

Expected:
- Status: 200
- Response: `{"valid": true, "userId": "<UUID>", "episodeId": "<UUID>"}`

### Test 4: Expired Token
First, create an expired token in the database, then test:
```bash
# (Token created by test script with expires_at in the past)
curl -i "https://rgfl-api-production.up.railway.app/api/results/verify-token?token=<EXPIRED_TOKEN>"
```

Expected:
- Status: 200
- Response: `{"valid": false}`

## Automated Testing
The full test suite is in `test-verify-token.js`. Run with:
```bash
./run-verify-token-test.sh
```
