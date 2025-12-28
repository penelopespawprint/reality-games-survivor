#!/bin/bash
# Script to run verify-token tests with Railway environment variables

echo "Fetching environment variables from Railway..."
export SUPABASE_SERVICE_ROLE_KEY=$(railway variables --service rgfl-api 2>/dev/null | grep "SUPABASE_SERVICE_ROLE_KEY" | awk -F '│' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Failed to get SUPABASE_SERVICE_ROLE_KEY from Railway"
  echo "Please run manually: railway variables --service rgfl-api"
  exit 1
fi

echo "Running tests..."
node test-verify-token.js
