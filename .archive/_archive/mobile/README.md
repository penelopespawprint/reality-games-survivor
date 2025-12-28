# RGFL Mobile App (POC)

React Native + Expo mobile application for Reality Games Fantasy League.

## Project Status

**🚧 Proof of Concept (POC)**

This is an early mobile POC to validate:
- API integration with existing RGFL backend
- Authentication flow (JWT)
- Basic UI (Login + Leaderboard)
- Real device testing

## Tech Stack

- **Framework:** React Native with Expo
- **Language:** TypeScript
- **API Client:** Axios
- **Storage:** AsyncStorage
- **Backend:** Connects to existing RGFL Express API

## Prerequisites

- Node.js 18+ and npm
- iOS Simulator (Mac only) or Android Emulator
- Physical iOS/Android device (optional, for real testing)
- Expo Go app (for testing on physical devices)

## Installation

```bash
# Install dependencies
npm install

# Start Expo development server
npm start
```

## Running the App

### iOS Simulator (Mac only)
```bash
npm run ios
```

### Android Emulator
```bash
npm run android
```

### Physical Device (Recommended for testing)
1. Install **Expo Go** app from App Store / Play Store
2. Run `npm start`
3. Scan QR code with Expo Go (Android) or Camera app (iOS)

## Project Structure

```
mobile/
├── src/
│   ├── config/
│   │   └── api.config.ts       # API endpoints and environment config
│   ├── services/
│   │   └── api.ts              # Axios HTTP client with JWT
│   ├── context/
│   │   └── AuthContext.tsx     # Authentication state management
│   ├── screens/
│   │   ├── LoginScreen.tsx     # Login UI
│   │   └── LeaderboardScreen.tsx # Leaderboard UI
│   └── types/                  # TypeScript type definitions
├── App.tsx                     # App entry point
└── package.json
```

## API Configuration

The app automatically connects to different backends based on environment:

**Development Mode:**
- iOS Simulator: `http://localhost:5050`
- Android Emulator: `http://10.0.2.2:5050`
- Physical Device: Update `api.config.ts` with your computer's local IP

**Production Mode:**
- Uses production Render API: `https://rgfl-multi.onrender.com`

To test against production API in development:
1. Open `src/config/api.config.ts`
2. Temporarily change `getApiUrl()` to return production URL

## Testing Login

**Test Credentials (from backend seed data):**
- Email: `admin@rgfl.com`
- Password: `admin123`

Or use the "Use Test Credentials" button (dev mode only).

## What Works

✅ Login with email/password
✅ JWT token storage (AsyncStorage)
✅ Authenticated API requests
✅ Leaderboard display
✅ Pull to refresh
✅ Logout

## What's Not Implemented (Yet)

⏳ Multi-league selection
⏳ Draft picks
⏳ Weekly picks
⏳ Push notifications
⏳ Offline mode
⏳ Navigation (tabs, stack)
⏳ Profile screen
⏳ Error boundaries
⏳ Unit tests

## Development Tips

### Running Backend Locally

For fastest development, run the RGFL backend locally:

```bash
# In main project directory (not mobile/)
npm run dev:server
```

The mobile app will automatically connect to `localhost:5050`.

### Viewing Console Logs

```bash
# Run Expo with logs
npm start

# In Expo terminal, press:
# 'i' - Open iOS simulator
# 'a' - Open Android emulator
# 'r' - Reload app
# 'j' - Open debugger
```

### Debugging

1. Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
2. Select "Debug Remote JS"
3. Opens Chrome debugger at `localhost:19000/debugger-ui`
4. View console logs, network requests, etc.

### Clearing Cache

If you encounter strange errors:

```bash
# Clear Expo cache
npm start -- --clear

# Clear npm cache
rm -rf node_modules
npm install
```

## Next Steps for Full MVP

1. **Navigation**
   - Install React Navigation
   - Create tab navigation (Leaderboard, Picks, Profile)
   - Create stack navigation (screens within each tab)

2. **League Selection**
   - Port `LeagueContext` from web app
   - Create league selector UI
   - Filter data by selected league

3. **Draft Picks**
   - Drag-and-drop castaway ranking
   - Submit draft to API
   - View submitted draft

4. **Weekly Picks**
   - Select picks for current week
   - Submit before deadline
   - Countdown timer

5. **Push Notifications**
   - Setup Expo Notifications
   - Backend: Store device tokens
   - Send reminders before deadlines

6. **Polish**
   - Loading states
   - Error handling
   - Form validation
   - Animations
   - Design system components

## Troubleshooting

### "Network request failed"
- Ensure backend is running (check `http://localhost:5050/` in browser)
- For Android emulator, verify `10.0.2.2` is correct
- For physical device, update `api.config.ts` with your computer's IP

### "Unauthorized" errors
- Check that JWT token is being sent in headers
- Verify credentials are correct
- Clear AsyncStorage: Logout and login again

### Expo won't start
```bash
# Clear watchman cache (Mac)
watchman watch-del-all

# Reset Metro bundler
npm start -- --reset-cache
```

## Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [RGFL API Docs](../docs/API.md) (if exists)

## Contributing

This is a POC branch. Major changes should be discussed before implementing.

1. Create feature branch from `mobile-poc`
2. Make changes
3. Test on both iOS and Android
4. Commit with descriptive message
5. Push and create PR

## License

Same license as main RGFL project.
