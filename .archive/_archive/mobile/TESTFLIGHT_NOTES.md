# TestFlight & App Review Notes

Reference: CEREBRO Skill #27 (App Store Connect & TestFlight)

## Demo Credentials

```
Email: playerone@realitygamesfantasyleague.com
Password: TestFlight2024!
```

## Review Notes Template

```
Demo Account:
Email: playerone@realitygamesfantasyleague.com
Password: TestFlight2024!

The app requires an active Survivor season to show live scoring.
For review purposes, we've enabled a demo season with sample data.

To test core features:
1. Log in with demo credentials
2. Join league with code "REVIEW"
3. Make draft picks (any 5 castaways)
4. View leaderboard (auto-populated with test data)
5. Check profile and settings

Push notifications require a physical device.

Contact for questions: support@realitygamesfantasyleague.com
```

## Privacy Data Collection

Data Types Collected:
- Identifiers: User ID (App functionality)
- Contact Info: Email (Account creation)
- Usage Data: Product Interaction (Analytics)
- Diagnostics: Crash Data (App functionality via Sentry)

Data Linked to User: User ID, Email
Data Used for Tracking: None

## TestFlight Groups

| Group | Purpose | Access |
|-------|---------|--------|
| Internal | Core team testing | Immediate |
| Beta Testers | Active users, superfans | After Beta Review |
| Content Creators | Influencers, streamers | After Beta Review |
| Press Preview | Media, reviewers | After Beta Review |

## Build Checklist

### Pre-Upload
- [ ] Version number incremented
- [ ] Build number incremented (never reuse)
- [ ] All debug flags disabled
- [ ] API pointing to production
- [ ] Sentry DSN configured
- [ ] Privacy policy URL current

### Post-Upload
- [ ] Build processed (green checkmark)
- [ ] Compliance questions answered
- [ ] Export compliance confirmed
- [ ] Internal testers notified
- [ ] Submit for Beta Review (external)

## Common Rejection Fixes

| Issue | Fix |
|-------|-----|
| Crashes on review device | Test on oldest supported iOS (15.0) |
| Login issues | Provide demo account that works |
| Missing privacy policy | Add URL in App Store Connect |
| IAP not working | Use sandbox tester accounts |
