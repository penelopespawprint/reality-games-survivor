#!/bin/bash
cd /Users/richard/Projects/rgfl-multi

git add render.yaml DEPLOYMENT.md DEPLOYMENT_SUMMARY.md README.md commit-updates.sh
git commit -m "Update service name from rgfl-survivor-ml to rgfl-multi

Updated all references:
- render.yaml: Changed service name to rgfl-multi
- DEPLOYMENT.md: Updated service name and CNAME record
- DEPLOYMENT_SUMMARY.md: Updated service name and CNAME record
- README.md: Updated CNAME record for custom domain

Service URL will be: rgfl-multi.onrender.com
Custom domain: test.realitygamesfantasyleague.com

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main

echo ""
echo "✅ Changes committed and pushed!"
echo ""
echo "Next steps:"
echo "1. Render should auto-deploy to rgfl-multi service"
echo "2. Once deployed, configure custom domain:"
echo "   - Go to Render Dashboard → rgfl-multi → Settings → Custom Domains"
echo "   - Add: test.realitygamesfantasyleague.com"
echo "   - Update DNS CNAME: test → rgfl-multi.onrender.com"
echo ""
