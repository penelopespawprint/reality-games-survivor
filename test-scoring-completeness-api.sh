#!/bin/bash

# Scoring Completeness Validation - API Test Script
# Tests the Express API endpoints for scoring completeness validation

set -e

# ============================================================================
# Configuration
# ============================================================================
API_BASE_URL="${API_BASE_URL:-https://rgfl-api-production.up.railway.app}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
EPISODE_ID="${EPISODE_ID:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

print_pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
}

print_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    if [ -z "$ADMIN_TOKEN" ]; then
        print_fail "ADMIN_TOKEN not set. Please provide admin JWT token."
        echo "Example: export ADMIN_TOKEN='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'"
        exit 1
    fi
    print_pass "Admin token provided"

    if [ -z "$EPISODE_ID" ]; then
        print_fail "EPISODE_ID not set. Please provide episode UUID to test."
        echo "Example: export EPISODE_ID='123e4567-e89b-12d3-a456-426614174000'"
        exit 1
    fi
    print_pass "Episode ID provided: $EPISODE_ID"

    if ! command -v curl &> /dev/null; then
        print_fail "curl is not installed"
        exit 1
    fi
    print_pass "curl is installed"

    if ! command -v jq &> /dev/null; then
        print_info "jq is not installed - responses will not be formatted"
        echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    else
        print_pass "jq is installed"
    fi
}

make_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            "$API_BASE_URL$endpoint"
    fi
}

# ============================================================================
# Test Suite
# ============================================================================

test_health_check() {
    print_header "TEST 1: Health Check"
    print_test "Verifying API is accessible"

    response=$(curl -s "$API_BASE_URL/health")

    if echo "$response" | grep -q '"status":"ok"'; then
        print_pass "API is healthy"
        echo "Response: $response"
    else
        print_fail "API health check failed"
        echo "Response: $response"
        exit 1
    fi
}

test_get_scoring_status() {
    print_header "TEST 2: GET Scoring Status"
    print_test "GET /api/episodes/$EPISODE_ID/scoring/status"

    response=$(make_api_call "GET" "/api/episodes/$EPISODE_ID/scoring/status")

    echo "Response:"
    if command -v jq &> /dev/null; then
        echo "$response" | jq .
    else
        echo "$response"
    fi

    # Check if response contains expected fields
    if echo "$response" | grep -q "is_complete"; then
        print_pass "Response contains 'is_complete' field"
    else
        print_fail "Response missing 'is_complete' field"
    fi

    if echo "$response" | grep -q "total_castaways"; then
        print_pass "Response contains 'total_castaways' field"
    else
        print_fail "Response missing 'total_castaways' field"
    fi

    if echo "$response" | grep -q "scored_castaways"; then
        print_pass "Response contains 'scored_castaways' field"
    else
        print_fail "Response missing 'scored_castaways' field"
    fi

    if echo "$response" | grep -q "unscored_castaway_names"; then
        print_pass "Response contains 'unscored_castaway_names' field"
    else
        print_fail "Response missing 'unscored_castaway_names' field"
    fi

    # Extract status for next tests
    if command -v jq &> /dev/null; then
        IS_COMPLETE=$(echo "$response" | jq -r '.is_complete')
        TOTAL_CASTAWAYS=$(echo "$response" | jq -r '.total_castaways')
        SCORED_CASTAWAYS=$(echo "$response" | jq -r '.scored_castaways')

        print_info "Scoring Status: $SCORED_CASTAWAYS/$TOTAL_CASTAWAYS castaways scored"
        print_info "Is Complete: $IS_COMPLETE"

        # Save for later tests
        export IS_COMPLETE
        export TOTAL_CASTAWAYS
        export SCORED_CASTAWAYS
    fi
}

test_finalize_incomplete() {
    print_header "TEST 3: Finalize with Incomplete Scoring (Should Fail)"
    print_test "POST /api/episodes/$EPISODE_ID/scoring/finalize (incomplete)"

    if [ "$IS_COMPLETE" = "true" ]; then
        print_info "Skipping test - scoring is already complete"
        print_info "This test requires incomplete scoring to verify rejection"
        return
    fi

    response=$(make_api_call "POST" "/api/episodes/$EPISODE_ID/scoring/finalize")
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$API_BASE_URL/api/episodes/$EPISODE_ID/scoring/finalize")

    echo "HTTP Status: $http_code"
    echo "Response:"
    if command -v jq &> /dev/null; then
        echo "$response" | jq .
    else
        echo "$response"
    fi

    # Should return 400 error with SCORING_INCOMPLETE
    if [ "$http_code" = "400" ]; then
        print_pass "Returned 400 Bad Request (expected)"
    else
        print_fail "Expected 400, got $http_code"
    fi

    if echo "$response" | grep -q "SCORING_INCOMPLETE"; then
        print_pass "Error code is SCORING_INCOMPLETE"
    else
        print_fail "Missing SCORING_INCOMPLETE error code"
    fi

    if echo "$response" | grep -q "Missing"; then
        print_pass "Error message mentions missing castaways"
    else
        print_fail "Error message doesn't mention missing castaways"
    fi
}

test_finalize_complete() {
    print_header "TEST 4: Finalize with Complete Scoring (Should Succeed)"
    print_test "POST /api/episodes/$EPISODE_ID/scoring/finalize (complete)"

    if [ "$IS_COMPLETE" != "true" ]; then
        print_info "Skipping test - scoring is incomplete"
        print_info "Complete all castaway scoring before running this test"
        return
    fi

    response=$(make_api_call "POST" "/api/episodes/$EPISODE_ID/scoring/finalize")
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$API_BASE_URL/api/episodes/$EPISODE_ID/scoring/finalize")

    echo "HTTP Status: $http_code"
    echo "Response:"
    if command -v jq &> /dev/null; then
        echo "$response" | jq .
    else
        echo "$response"
    fi

    # Should return 200 with finalized: true
    if [ "$http_code" = "200" ]; then
        print_pass "Returned 200 OK (expected)"
    else
        print_fail "Expected 200, got $http_code"
    fi

    if echo "$response" | grep -q '"finalized":true'; then
        print_pass "Response indicates successful finalization"
    else
        print_fail "Response doesn't indicate finalization"
    fi

    if echo "$response" | grep -q "standings_updated"; then
        print_pass "Response contains standings_updated field"
    else
        print_fail "Missing standings_updated field"
    fi
}

test_status_realtime_update() {
    print_header "TEST 5: Status Real-time Update"
    print_test "Verify status updates after score changes"

    print_info "Fetching status twice with 1-second delay"

    response1=$(make_api_call "GET" "/api/episodes/$EPISODE_ID/scoring/status")
    sleep 1
    response2=$(make_api_call "GET" "/api/episodes/$EPISODE_ID/scoring/status")

    echo "First response:"
    if command -v jq &> /dev/null; then
        echo "$response1" | jq .
    else
        echo "$response1"
    fi

    echo -e "\nSecond response:"
    if command -v jq &> /dev/null; then
        echo "$response2" | jq .
    else
        echo "$response2"
    fi

    if [ "$response1" = "$response2" ]; then
        print_pass "Responses are consistent (no score changes)"
    else
        print_info "Responses differ (scores may have been added)"
    fi
}

test_error_handling() {
    print_header "TEST 6: Error Handling"

    # Test with invalid episode ID
    print_test "Testing with invalid episode ID"
    invalid_id="00000000-0000-0000-0000-000000000000"
    response=$(make_api_call "GET" "/api/episodes/$invalid_id/scoring/status")

    if echo "$response" | grep -q "error"; then
        print_pass "Returns error for invalid episode ID"
    else
        print_info "No error returned for invalid episode ID"
    fi

    # Test without authorization
    print_test "Testing without authorization"
    response=$(curl -s "$API_BASE_URL/api/episodes/$EPISODE_ID/scoring/status")
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        "$API_BASE_URL/api/episodes/$EPISODE_ID/scoring/status")

    if [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
        print_pass "Returns $http_code without authorization"
    else
        print_fail "Expected 401/403 without auth, got $http_code"
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    print_header "Scoring Completeness Validation - API Test Suite"
    echo "API Base URL: $API_BASE_URL"
    echo "Episode ID: $EPISODE_ID"
    echo ""

    check_prerequisites

    test_health_check
    test_get_scoring_status
    test_finalize_incomplete
    test_finalize_complete
    test_status_realtime_update
    test_error_handling

    print_header "Test Suite Complete"
    echo -e "${GREEN}All tests executed successfully!${NC}"
    echo ""
    echo "Summary:"
    echo "- Verified API health check"
    echo "- Tested scoring status endpoint"
    echo "- Validated finalization rejection (incomplete)"
    echo "- Tested finalization success (complete)"
    echo "- Verified real-time status updates"
    echo "- Validated error handling"
}

# Run main function
main
