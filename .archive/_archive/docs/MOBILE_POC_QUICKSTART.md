# RGFL Mobile POC - Quick Start Guide

**Branch:** `mobile-poc`
**Status:** Ready to test
**Last Updated:** November 29, 2025

---

## What's Been Built

A React Native + Expo mobile app that connects to your existing RGFL backend API.

**Features Working:**
- ✅ Login with email/password
- ✅ JWT authentication
- ✅ Leaderboard display with real-time data
- ✅ Pull to refresh
- ✅ Logout
- ✅ Persistent login (token stored locally)

---

## How to Test (5 Minutes)

### Option 1: Quick Test on Your Phone (Easiest)

**1. Install Expo Go app:**
- iOS: [App Store - Expo Go](https://apps.apple.com/app/expo-go/id982107779)
- Android: [Play Store - Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

**2. Start the backend (if testing locally):**
```bash
# In main project directory
npm run dev:server
```

**3. Start the mobile app:**
```bash
cd mobile
npm install
npm start
```

**4. Scan QR code with Expo Go:**
- iOS: Open Camera app, scan QR code
- Android: Open Expo Go app, tap "Scan QR Code"

**5. Test the app:**
- Tap "Use Test Credentials" button
- Or manually enter: `admin@rgfl.com` / `admin123`
- You should see the leaderboard!
- Pull down to refresh

---

### Option 2: iOS Simulator (Mac Only)

**1. Install Xcode Command Line Tools:**
```bash
xcode-select --install
```

**2. Start backend:**
```bash
npm run dev:server
```

**3. Start mobile app in simulator:**
```bash
cd mobile
npm install
npm run ios
```

**4. Test:**
- App opens automatically in iOS Simulator
- Login with test credentials
- View leaderboard

---

### Option 3: Android Emulator

**1. Install Android Studio & create emulator:**
- Download [Android Studio](https://developer.android.com/studio)
- Create AVD (Android Virtual Device) via Device Manager

**2. Start backend:**
```bash
npm run dev:server
```

**3. Start mobile app in emulator:**
```bash
cd mobile
npm install
npm run android
```

**4. Test:**
- App opens automatically in Android Emulator
- Login with test credentials
- View leaderboard

---

## Testing Against Production API

To test against the live Render backend (without running locally):

**1. Update API config:**
```typescript
// mobile/src/config/api.config.ts
const getApiUrl = (): string => {
  // Comment out development logic
  // if (__DEV__) { ... }

  // Force production URL
  return 'https://rgfl-multi.onrender.com';
};
```

**2. Start mobile app:**
```bash
cd mobile
npm start
```

**3. Test on device:**
- No need to run backend locally
- App connects directly to production API
- Uses real production data

---

## Common Issues & Fixes

### "Network request failed"

**Cause:** Mobile app can't reach backend API

**Fix (Local Development):**
- Ensure backend is running: `npm run dev:server`
- Check `http://localhost:5050/` works in browser
- For Android emulator, API uses `10.0.2.2:5050` (auto-configured)
- For physical device, update IP in `mobile/src/config/api.config.ts`:
  ```typescript
  // Find your computer's IP:
  // Mac: System Settings → Network → WiFi → Details
  // Windows: ipconfig (look for IPv4)
  return 'http://192.168.1.XXX:5050'; // Replace XXX
  ```

### "Unauthorized" or login fails

**Cause:** Backend not running or wrong credentials

**Fix:**
- Verify backend is running
- Check test user exists: `admin@rgfl.com` / `admin123`
- Try creating account via web app first
- Check backend logs for errors

### Expo won't start

**Fix:**
```bash
# Clear cache
cd mobile
npm start -- --clear

# If that fails, reinstall
rm -rf node_modules
npm install
npm start
```

### App crashes on login

**Fix:**
- Check console logs in terminal
- Enable remote debugging (shake device → "Debug")
- Verify API response format matches expected User type

---

## What to Test

### Basic Flow:
1. ✅ App opens to login screen
2. ✅ Tap "Use Test Credentials" (or enter manually)
3. ✅ Login succeeds → shows leaderboard
4. ✅ See your rank and points
5. ✅ Pull down to refresh data
6. ✅ Tap Logout → returns to login
7. ✅ Close app and reopen → still logged in (token persisted)

### Things to Check:
- UI looks clean (RGFL brand colors: red #A42828, cream #F3EED9)
- Loading states work (spinners show while fetching)
- Errors display properly (try wrong password)
- Real data from backend (not dummy data)
- Your user highlighted in leaderboard

---

## Next Steps After Testing

### If POC works well:

1. **Validate with users:**
   - Share Expo Go link with 5-10 users
   - Get feedback on UI/UX
   - Confirm API performance

2. **Decide on full development:**
   - Review feasibility assessment (docs/MOBILE_FEASIBILITY_ASSESSMENT.md)
   - Check cost breakdown (docs/MOBILE_COST_BREAKDOWN_IOS.md)
   - Approve budget and timeline

3. **Plan MVP features:**
   - Multi-league selection
   - Draft picks (drag-and-drop)
   - Weekly picks
   - Push notifications
   - Profile screen

### If issues found:

1. **Document problems:**
   - Screenshot errors
   - Note device/OS version
   - Copy console logs

2. **Report:**
   - Create GitHub issue with details
   - Tag with `mobile-poc` label

---

## Project Files

**Mobile App:**
- `mobile/` - React Native app (21 files)
- `mobile/README.md` - Detailed setup instructions
- `mobile/src/` - Source code

**Documentation:**
- `docs/MOBILE_FEASIBILITY_ASSESSMENT.md` - Full analysis
- `docs/MOBILE_COST_BREAKDOWN_IOS.md` - Cost details
- `docs/CURRENT_SERVICES_COST.md` - Current infrastructure

**Branch:**
- `mobile-poc` - Isolated from main production code
- Can merge to main when ready

---

## Quick Commands Reference

```bash
# Start backend (local testing)
npm run dev:server

# Start mobile app
cd mobile && npm start

# iOS Simulator
cd mobile && npm run ios

# Android Emulator
cd mobile && npm run android

# Clear cache
cd mobile && npm start -- --clear

# Check logs
# Terminal shows all console.log() from mobile app
```

---

## Test Credentials

**Admin Account:**
- Email: `admin@rgfl.com`
- Password: `admin123`

**Other Test Users** (if seeded):
- `admin1@example.com` / `password`
- `admin2@example.com` / `password`
- `leaguecreator1@example.com` / `password`
- `leagueplayer1@example.com` / `password`

---

## Support

**Questions about:**
- Mobile setup → Check `mobile/README.md`
- Cost/timeline → Check `docs/MOBILE_FEASIBILITY_ASSESSMENT.md`
- Current services → Check `docs/CURRENT_SERVICES_COST.md`

**Issues:**
- Create GitHub issue with `mobile-poc` label
- Include device, OS, and error logs

---

**Happy Testing! 🚀**
