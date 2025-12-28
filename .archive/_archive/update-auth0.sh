#!/bin/bash

# Auth0 Configuration Update Script
# This script updates the callback URLs, logout URLs, and web origins for your Auth0 application

CLIENT_ID="yAEo8VblIwCANCgujhSQPqRYTCORR1H8"
DOMAIN="dev-w01qewse7es4d0ue.us.auth0.com"

# The URLs we need to add
CALLBACK_URLS='["https://www.realitygamesfantasyleague.com/callback","https://realitygamesfantasyleague.com/callback","https://rgfl-survivor.onrender.com/callback","http://localhost:5000/callback"]'
LOGOUT_URLS='["https://www.realitygamesfantasyleague.com","https://realitygamesfantasyleague.com","https://rgfl-survivor.onrender.com","http://localhost:5000"]'
WEB_ORIGINS='["https://www.realitygamesfantasyleague.com","https://rgfl-survivor.onrender.com"]'

echo "============================================"
echo "Auth0 Configuration Update Instructions"
echo "============================================"
echo ""
echo "Since the Management API isn't enabled, please manually update your Auth0 application:"
echo ""
echo "1. Go to: https://manage.auth0.com/dashboard/us/$DOMAIN/applications/$CLIENT_ID/settings"
echo ""
echo "2. Find 'Allowed Callback URLs' and paste this:"
echo "$CALLBACK_URLS" | jq -r '.[]' | paste -sd ',' -
echo ""
echo "3. Find 'Allowed Logout URLs' and paste this:"
echo "$LOGOUT_URLS" | jq -r '.[]' | paste -sd ',' -
echo ""
echo "4. Find 'Allowed Web Origins' and paste this:"
echo "$WEB_ORIGINS" | jq -r '.[]' | paste -sd ',' -
echo ""
echo "5. Scroll to the bottom and click 'Save Changes'"
echo ""
echo "============================================"
