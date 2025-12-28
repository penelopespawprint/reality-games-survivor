#!/bin/bash

# Render API Deployment Script
# This script will create and deploy the rgfl-multi service to Render

set -e

echo "🚀 Render Deployment Script"
echo "============================"
echo ""

# Check if RENDER_API_KEY is set
if [ -z "$RENDER_API_KEY" ]; then
    echo "❌ Error: RENDER_API_KEY environment variable not set"
    echo ""
    echo "To get your Render API key:"
    echo "1. Go to https://dashboard.render.com/u/settings/api-keys"
    echo "2. Click 'Create API Key'"
    echo "3. Copy the key"
    echo "4. Run: export RENDER_API_KEY='your-key-here'"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Render API key found"
echo ""

# Service configuration
SERVICE_NAME="rgfl-multi"
REPO_URL="https://github.com/penelopespawprint/rgfl-multi"
BRANCH="main"
REGION="oregon"

echo "📋 Service Configuration:"
echo "   Name: $SERVICE_NAME"
echo "   Repo: $REPO_URL"
echo "   Branch: $BRANCH"
echo "   Region: $REGION"
echo ""

# Create service via Render API
echo "🔧 Creating web service..."

RESPONSE=$(curl -s -X POST \
  https://api.render.com/v1/services \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "web_service",
    "name": "'"$SERVICE_NAME"'",
    "repo": "'"$REPO_URL"'",
    "branch": "'"$BRANCH"'",
    "region": "'"$REGION"'",
    "plan": "free",
    "buildCommand": "npm install && npx prisma generate && npm run build",
    "startCommand": "npm start",
    "healthCheckPath": "/",
    "autoDeploy": true,
    "envVars": [
      {
        "key": "NODE_ENV",
        "value": "production"
      },
      {
        "key": "DATABASE_URL",
        "value": "postgresql://rgfl_survivor_ml_user:yhyJlseYWgor248l8jcb70hFMsdoLB1K@dpg-d4kbb5k9c44c73erlpp0-a.oregon-postgres.render.com/rgfl_survivor_ml?sslmode=require"
      },
      {
        "key": "PORT",
        "value": "5050"
      },
      {
        "key": "CLIENT_ORIGIN",
        "value": "https://test.realitygamesfantasyleague.com"
      },
      {
        "key": "CLIENT_URL",
        "value": "https://test.realitygamesfantasyleague.com"
      },
      {
        "key": "JWT_SECRET",
        "generateValue": true
      },
      {
        "key": "SESSION_SECRET",
        "generateValue": true
      }
    ]
  }')

# Check if creation was successful
if echo "$RESPONSE" | grep -q '"id"'; then
    SERVICE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    SERVICE_URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)

    echo "✅ Service created successfully!"
    echo "   Service ID: $SERVICE_ID"
    echo "   Service URL: $SERVICE_URL"
    echo ""
    echo "🔄 Render is now building and deploying your service..."
    echo "   This will take 2-5 minutes"
    echo ""
    echo "📊 Monitor deployment:"
    echo "   Dashboard: https://dashboard.render.com"
    echo "   Logs: https://dashboard.render.com/web/$SERVICE_ID/logs"
    echo ""
    echo "🌐 Once deployed, your site will be at:"
    echo "   $SERVICE_URL"
    echo ""
    echo "🔐 Admin credentials:"
    echo "   Email: admin@rgfl.com"
    echo "   Password: admin123"
    echo ""
else
    echo "❌ Error creating service"
    echo ""
    echo "Response from Render API:"
    echo "$RESPONSE"
    echo ""
    exit 1
fi
