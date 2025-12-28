# RGFL Mobile App - iOS-Only Cost Breakdown

**Analysis Date:** November 29, 2025
**Platform:** iOS Only (iPhone + iPad)
**Framework:** React Native with Expo

---

## Online Services Cost Breakdown (Annual)

### Required Services

#### 1. Apple Developer Program
**Cost:** $99/year
**Required For:**
- App Store distribution
- TestFlight beta testing
- Push notification certificates (APNs)
- App signing certificates

**Notes:**
- One-time $99/year regardless of app count
- Required to publish any iOS app
- Cannot be avoided

---

#### 2. Expo EAS (Expo Application Services)
**Service:** Cloud build and deployment platform

**Pricing Tiers:**

**Free Tier** (Best for MVP):
- **Cost:** $0/month
- **Builds:** 30 iOS builds/month
- **Updates:** Unlimited OTA updates
- **Limitations:**
  - Shared build queue (slower builds, 10-30 min wait)
  - Basic priority support
  - 1GB storage for builds

**Production Tier** (Recommended for launch):
- **Cost:** $99/month = $1,188/year
- **Builds:** Unlimited iOS builds
- **Updates:** Unlimited OTA updates
- **Benefits:**
  - Priority build queue (faster builds, 5-10 min)
  - 100GB storage
  - Priority support
  - Multiple app support

**Enterprise Tier** (Not needed):
- **Cost:** $299/month
- For large teams with many apps

**Recommendation for iOS-only:** Start with Free tier during development (6 months), upgrade to Production tier at launch.

**Year 1 Cost:**
- Months 1-6 (development): $0
- Months 7-12 (post-launch): $99/month × 6 = $594
- **Total Year 1: $594**
- **Year 2+: $1,188/year**

---

#### 3. Push Notifications (APNs via Expo)
**Service:** Apple Push Notification service

**Expo Push Notification Service:**
- **Cost:** $0 (Free tier)
- **Limit:** Up to 1 million users
- **Includes:**
  - Unlimited push notifications
  - Delivery tracking
  - Expo push notification API
  - No FCM setup needed

**Notes:**
- APNs (Apple's service) is free
- Expo handles the infrastructure for free up to 1M users
- RGFL unlikely to exceed free tier limits (unless massively viral)

**Cost:** $0/year (unless you exceed 1M users)

---

#### 4. Backend Hosting (Current: Render)
**Service:** PostgreSQL + Web Service

**Current Setup (from render.yaml):**
- Web Service: Free tier or paid tier
- PostgreSQL: Free tier or paid tier

**Estimated Current Cost:** $0 - $25/month (based on tier)

**Additional Load from iOS App:**
- Minimal increase in API calls
- Push notification token storage (negligible DB impact)
- Socket.io connections (slight increase)

**Recommendation:** No upgrade needed for iOS-only app initially

**Additional Cost for Mobile:** $0/month (existing infrastructure handles it)

---

#### 5. Image/Asset Storage (CDN)
**Service:** Image hosting for profile photos, league avatars

**Current:** Likely storing on Render or local filesystem

**Options for Mobile:**

**Option A: Cloudinary (Recommended)**
- **Free Tier:**
  - 25 GB storage
  - 25 GB bandwidth/month
  - 25,000 transformations/month
- **Cost:** $0/month (free tier sufficient for MVP)
- **Paid Tier (if needed):** $89/month for 100GB

**Option B: AWS S3 + CloudFront**
- **S3 Storage:** $0.023/GB/month (first 50 TB)
- **CloudFront Transfer:** $0.085/GB (first 10 TB)
- **Estimate:** 10GB storage + 50GB transfer = ~$5/month
- **Cost:** ~$60/year

**Recommendation:** Start with Cloudinary free tier, upgrade only if needed

**Cost:** $0/year (free tier), $1,068/year if paid tier needed

---

#### 6. Analytics & Crash Reporting

**Expo Analytics (Built-in):**
- **Cost:** $0 (included in Expo)
- **Includes:** Basic usage analytics

**Sentry (Crash Reporting):**
- **Free Tier:**
  - 5,000 errors/month
  - 10,000 transactions/month
  - 500 MB attachments
- **Cost:** $0/month (likely sufficient)
- **Developer Tier:** $26/month if free tier exceeded

**Firebase Analytics (Optional):**
- **Cost:** $0 (completely free)
- **Unlimited events**

**Recommendation:** Use Expo Analytics + Sentry free tier

**Cost:** $0/year (unless error volume exceeds 5k/month, then $312/year)

---

#### 7. Database (Additional Requirements)

**Push Token Storage:**
- Additional table for device tokens
- ~100 bytes per user
- 2,000 users = 200 KB (negligible)

**Offline Sync (Future):**
- Timestamps on existing tables
- No additional storage needed

**Cost:** $0/month (current PostgreSQL handles it)

---

## Total Annual Cost Summary (iOS Only)

### Year 1 (Development + Launch)

| Service | Cost | Notes |
|---------|------|-------|
| Apple Developer Program | $99 | Required |
| Expo EAS (6 months dev, 6 months prod) | $594 | Free → $99/mo after launch |
| Push Notifications (Expo) | $0 | Free up to 1M users |
| Backend Hosting (Render) | $0 | Existing infrastructure |
| CDN (Cloudinary) | $0 | Free tier |
| Analytics & Crash Reporting | $0 | Free tiers |
| **TOTAL YEAR 1** | **$693** | **~$58/month average** |

---

### Year 2+ (Ongoing)

| Service | Cost | Notes |
|---------|------|-------|
| Apple Developer Program | $99 | Annual renewal |
| Expo EAS Production | $1,188 | $99/month |
| Push Notifications (Expo) | $0 | Free up to 1M users |
| Backend Hosting (Render) | $0 | Existing infrastructure |
| CDN (Cloudinary) | $0 | Free tier (or $1,068 if upgraded) |
| Analytics & Crash Reporting | $0 | Free tiers (or $312 if upgraded) |
| **TOTAL YEAR 2+** | **$1,287/year** | **~$107/month** |

---

## Cost Optimization Strategies

### Option 1: Minimize Costs (Start with Free Tiers)

**Year 1:**
- Use Expo Free tier during development (6 months)
- Upgrade to Expo Production only after 500+ downloads
- Stay on free tiers for CDN, analytics, crash reporting
- **Total: $99 - $594** (Apple fee + optional Expo upgrade)

**Risk:** Slower build times, limited support

---

### Option 2: Production-Ready from Day 1

**Year 1:**
- Expo Production tier from start ($1,188)
- Cloudinary free tier
- Sentry free tier
- **Total: $1,287/year** ($107/month)

**Benefit:** Fast builds, priority support, professional setup

---

### Option 3: Self-Hosted Alternative (Advanced)

**Replace Expo EAS with:**
- GitHub Actions for builds (free for public repos, $0.008/min for private)
- Fastlane for deployment automation (free, open-source)
- Self-managed certificates

**Savings:** $1,188/year (Expo Production cost)

**Trade-offs:**
- Significant DevOps complexity
- Mac required for iOS builds (~$1,000 Mac Mini)
- 20-40 hours setup time
- Ongoing maintenance burden

**Recommendation:** Not worth it for iOS-only app. Expo simplifies too much.

---

## Cost Comparison: iOS-only vs iOS + Android

| Service | iOS Only | iOS + Android | Difference |
|---------|----------|---------------|------------|
| Apple Developer | $99/year | $99/year | $0 |
| Google Play Store | $0 | $25 one-time | +$25 |
| Expo EAS Production | $99/month | $99/month | $0 (same tier) |
| Push Notifications | $0 | $0 | $0 |
| Backend/CDN | $0 | $0 | $0 |
| **TOTAL (Year 1)** | **$693** | **$718** | **+$25** |
| **TOTAL (Year 2+)** | **$1,287** | **$1,287** | **+$0** |

**Key Insight:** Adding Android only costs $25 one-time (Google Play fee). Since Expo EAS Production tier includes unlimited builds for both platforms, there's minimal cost difference.

**Recommendation:** If building iOS app, add Android for only $25 more. You get 2x the market reach for essentially the same cost.

---

## Hidden/Unexpected Costs to Watch

### 1. Increased API Usage
If your backend hosting (Render) charges for bandwidth/requests:
- Mobile apps typically make 2-3x more API calls than web
- Real-time Socket.io connections consume more resources
- **Potential cost:** $10-50/month if free tier exceeded

### 2. SMS Notifications (Existing Feature)
If using SimpleTexting for SMS reminders:
- Mobile users may trigger more SMS notifications
- Current SMS cost: ~$0.02-0.04/message
- 2,000 users × 4 SMS/season = 8,000 SMS = $160-320/season
- **This cost exists regardless of mobile app**

### 3. Storage Growth (User Content)
If allowing profile photos, league avatars:
- Estimate 500 KB/photo × 2,000 users = 1 GB
- Cloudinary free tier: 25 GB (plenty of room)
- **Potential cost:** $0 until you hit 25GB

### 4. App Review Delays
Apple App Store review takes 1-3 days (sometimes rejected):
- First submission often rejected for minor issues
- Resubmissions take another 1-3 days
- **Cost:** Developer time (not money), but impacts launch timeline

### 5. iOS Version Support
Apple typically supports last 3 iOS versions:
- Must test on iOS 15, 16, 17 (current)
- Physical devices or paid testing services
- **Cost:** $0 (use simulators) or $100-500 for physical test devices

---

## Final Recommendation

### For RGFL iOS-Only App:

**Start with Minimal Cost Setup (Year 1):**
1. Apple Developer Program: $99/year ✅ Required
2. Expo Free tier during development (6 months): $0
3. Expo Production tier after launch (6 months): $594
4. Everything else: Free tiers

**Total Year 1: $693** (~$58/month average)

**Ongoing (Year 2+): $1,287/year** (~$107/month)

---

### Better Strategy: Launch iOS + Android Together

**Additional cost for Android:** Only $25 (Google Play one-time fee)

**Benefits:**
- 2x market reach (Android = 70% of US smartphone market)
- Same Expo EAS tier covers both platforms
- Same push notification infrastructure
- React Native builds both from same codebase

**Total Year 1 (iOS + Android): $718** (~$60/month)
**Ongoing (Year 2+): $1,287/year** (~$107/month)

**Recommendation:** Build for both platforms. The $25 difference is negligible compared to 2x user acquisition potential.

---

## Cost vs. Revenue Projection

**Costs:**
- Year 1: $693 (iOS-only) or $718 (iOS + Android)
- Year 2+: $1,287/year

**Potential Revenue (from main assessment):**
- Year 1: $14,136 (freemium model, 2,000 users)
- Break-even: Month 2 of operation

**ROI:** Infrastructure costs are minimal compared to development costs ($85k-120k). Online services are not a limiting factor.

---

## Summary

**iOS-only online services cost:**
- **Year 1: $693/year** (~$58/month)
- **Year 2+: $1,287/year** (~$107/month)

**This is very affordable** compared to:
- Development cost: $85,000-120,000 (one-time)
- Developer salary: $60,000-80,000 for 6 months

**Bottom line:** Online service costs are ~1% of total project cost. Not a significant financial concern.

**Smart move:** Spend the extra $25 to include Android and double your potential user base.
