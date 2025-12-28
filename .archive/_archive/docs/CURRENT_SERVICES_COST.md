# RGFL Current Services & Costs

**Analysis Date:** November 29, 2025
**Status:** Production (live at realitygamesfantasyleague.com)

---

## Current Services You're Using

### 1. **Render** (Hosting Platform)
**Service Type:** Web Service + PostgreSQL Database

**Web Service:**
- **Plan:** Free tier
- **What it does:** Hosts your Node.js/Express backend + serves React frontend
- **URL:** rgfl-multi.onrender.com → realitygamesfantasyleague.com
- **Repo:** https://github.com/penelopespawprint/rgfl-multi
- **Auto-deploy:** Enabled (deploys on every push to main branch)
- **Current Cost:** $0/month

**PostgreSQL Database:**
- **Database Name:** rgfl_survivor_ml
- **Host:** dpg-d4kbb5k9c44c73erlpp0-a.oregon-postgres.render.com
- **User:** rgfl_survivor_ml_user
- **Region:** Oregon (US West)
- **Plan:** Likely Free tier (90 days free, then $7/month) or paid tier
- **Current Cost:** $0/month (if still in free trial) OR $7/month (if on paid tier)

**Free Tier Limitations:**
- ⚠️ Web service spins down after 15 minutes of inactivity (cold starts = slow first load)
- ⚠️ 512 MB RAM limit
- ⚠️ Shared CPU (slower performance)
- ⚠️ No custom domain SSL (uses .onrender.com subdomain)

**Paid Tier ($7-25/month):**
- ✅ Always on (no cold starts)
- ✅ 1-4 GB RAM
- ✅ Better performance
- ✅ Custom domain SSL (realitygamesfantasyleague.com)

**Your Likely Cost:** $0-7/month (database), web service appears to be free tier

---

### 2. **GitHub** (Code Repository)
**Service Type:** Version control and code hosting

**Repository:**
- **Owner:** penelopespawprint
- **Repo:** rgfl-multi
- **Branch:** main
- **Visibility:** Private (assumed)

**Plan:**
- **Free tier** (unlimited public/private repos)
- **Current Cost:** $0/month

**What you use it for:**
- Source code storage
- Version control (git)
- Auto-deploy trigger (Render watches this repo)
- Collaboration (if team members)

---

### 3. **SimpleTexting** (SMS Service)
**Service Type:** SMS/Text message delivery

**Configuration (from .env):**
- **API Token:** 7fce1874ff87e5ba7dba6b07fa6802fb
- **Account Phone:** (918) 213-3311
- **Base URL:** https://api-app2.simpletexting.com/v2
- **Feature:** SMS reminder notifications (Wed 7pm before pick deadline)

**Pricing (typical for SimpleTexting):**
- **Monthly Plan:** $25-45/month (includes 500-1000 messages)
- **Additional Messages:** $0.02-0.04 per message
- **Your Usage:** Depends on how many users opt-in to SMS

**Estimated Cost:**
- If 100 users with SMS enabled, 4 reminders/season = 400 messages
- **Cost:** $25-45/month base plan OR pay-per-message

**Current Cost:** $25-45/month (estimated, check your SimpleTexting dashboard)

---

### 4. **Auth0** (Authentication Service)
**Service Type:** User authentication and identity management

**Configuration (from .env):**
- **Domain:** dev-w01qewse7es4d0ue.us.auth0.com
- **Client ID:** yAEo8VblIwCANCgujhSQPqRYTCORR1H8
- **Callback URL:** https://www.realitygamesfantasyleague.com/callback

**Plan:**
- **Free tier:**
  - 7,500 active users
  - Unlimited logins
  - Social login (Google, Facebook, etc.)
  - JWT tokens
- **Current Cost:** $0/month (likely on free tier)

**Paid Tiers (if needed):**
- **Essential:** $35/month (up to 1,000 active users)
- **Professional:** $240/month (up to 10,000 active users)

**Your Likely Cost:** $0/month (unless you have 7,500+ active users)

---

### 5. **Domain Registration**
**Service Type:** Domain name (realitygamesfantasyleague.com)

**Registrar:** Unknown (Namecheap, GoDaddy, Google Domains, etc.)

**Typical Cost:**
- **.com domain:** $10-15/year
- **Privacy protection:** $0-10/year (optional)

**Your Likely Cost:** $10-15/year

---

### 6. **SSL/TLS Certificate**
**Service Type:** HTTPS encryption

**Provider:** Render (included free with custom domain)

**Current Cost:** $0/month (included in Render)

---

## Total Current Monthly Costs

| Service | Cost | Frequency | Notes |
|---------|------|-----------|-------|
| **Render Web Service** | $0 | Monthly | Free tier (cold starts) |
| **Render PostgreSQL** | $0-7 | Monthly | Free trial or paid tier |
| **GitHub** | $0 | Monthly | Free tier |
| **SimpleTexting** | $25-45 | Monthly | SMS notifications |
| **Auth0** | $0 | Monthly | Free tier (<7,500 users) |
| **Domain (realitygamesfantasyleague.com)** | $1.25 | Monthly ($15/year) | Annual payment |
| **SSL Certificate** | $0 | Monthly | Included in Render |
| **TOTAL** | **$26.25 - $53.25/month** | | **$315 - $639/year** |

---

## What Changes with Mobile App

### New Services Needed:

1. **Apple Developer Program**
   - **Cost:** $99/year (iOS app distribution)
   - **New cost:** +$99/year

2. **Expo EAS (Build Service)**
   - **Cost:** $0-99/month (free tier or production tier)
   - **New cost:** +$0-1,188/year

3. **Google Play Developer**
   - **Cost:** $25 one-time (Android app distribution)
   - **New cost:** +$25 (if doing Android)

### Existing Services (No Change):

- **Render:** Same backend API serves both web + mobile
- **GitHub:** Same repo, no additional cost
- **SimpleTexting:** May increase SMS usage (more users on mobile)
- **Auth0:** Same authentication, JWT works on mobile
- **Domain/SSL:** Same

### Increased Usage on Existing Services:

**Render (Backend API):**
- Mobile apps make more frequent API calls
- Real-time Socket.io connections from mobile devices
- Push notification infrastructure (minimal CPU impact)

**Potential Impact:**
- Free tier may struggle with increased load
- May need to upgrade to $7-25/month paid tier

**SimpleTexting (SMS):**
- More users may opt-in to SMS on mobile (easier to enable)
- Could increase from 400 messages/season to 1,000+ messages/season

**Potential Impact:**
- May exceed base plan message limit
- Additional $0.02-0.04 per message overage

---

## Summary: Current vs. With Mobile App

### Current (Web Only):
**Monthly:** $26-53/month
**Annual:** $315-639/year

### With Mobile App (iOS-only):
**Monthly:** $26-160/month (depending on Expo tier)
**Annual:** $1,008-1,927/year

**Breakdown:**
- Current services: $315-639/year
- Apple Developer: +$99/year
- Expo EAS Free tier (dev): +$0 for 6 months
- Expo EAS Production (after launch): +$594/year (6 months × $99)
- **Total Year 1:** $1,008-1,332/year

### With Mobile App (iOS + Android):
**Monthly:** $26-160/month
**Annual:** $1,033-1,952/year

**Only $25 more than iOS-only** (Google Play one-time fee)

---

## Key Insight

**Your current infrastructure costs are very low:** $26-53/month

This is because you're using mostly free tiers:
- ✅ Render free tier (web service)
- ✅ GitHub free tier
- ✅ Auth0 free tier
- ✅ SSL included free

**The main cost driver is SimpleTexting** ($25-45/month for SMS).

**Adding mobile will increase costs by:**
- Year 1: +$693-718 (iOS-only or iOS+Android)
- Year 2+: +$1,188-1,287/year (mostly Expo EAS Production at $99/month)

**But this is still affordable** compared to:
- Development cost: $85,000-120,000
- Potential revenue: $14,000+/year (from freemium model)

---

## Recommendations

### Short-term (Current):
1. **Check Render PostgreSQL status**
   - Verify if you're on free trial (90 days) or paid tier ($7/month)
   - Free trial may expire soon → plan for $7/month ongoing

2. **Monitor Render Web Service performance**
   - If experiencing cold starts (slow first load), consider upgrading to $7/month paid tier
   - This would eliminate cold starts and improve user experience

3. **Review SimpleTexting usage**
   - Check your actual message count per month
   - Consider if SMS is worth $25-45/month or if email notifications suffice

### Long-term (With Mobile):
1. **Budget for Expo EAS Production** ($99/month after launch)
   - This is the biggest new cost
   - Provides unlimited iOS + Android builds, OTA updates, priority support

2. **Plan for increased Render usage**
   - Mobile app launch may push you to paid tier ($7-25/month)
   - Budget $15-25/month for backend infrastructure post-launch

3. **Consider consolidating Auth0 and custom JWT**
   - You're using both Auth0 and custom JWT authentication
   - Could simplify to one approach and potentially save Auth0 costs (if you ever exceed free tier)

---

## What You Should Do Now

1. **Log into Render dashboard** → Check actual costs
   - Web service tier (free or paid?)
   - PostgreSQL tier (free trial or paid?)

2. **Log into SimpleTexting** → Check actual usage
   - How many messages sent per month?
   - What's your current plan cost?

3. **Log into Auth0 dashboard** → Check usage
   - How many active users?
   - Still within free tier limit (7,500)?

4. **Check domain registrar** → Verify renewal date
   - Who's the registrar (Namecheap, GoDaddy, etc.)?
   - When does it renew?

**Once you have these numbers, you'll know your exact current costs.**

My estimates above are based on typical pricing for these services. Your actual costs may vary.
