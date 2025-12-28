# Pre-Launch Checklist - RGFL Survivor

## ✅ Database & Schema
- [x] New profile fields added to User model (displayName, city, state, favoriteCastaway, about)
- [x] Database schema pushed to production
- [x] Prisma Client regenerated

## ✅ Backend Enhancements
- [x] Signup endpoint validates new fields (35 char limit for favoriteCastaway, 250 for about)
- [x] Profile update endpoint handles all new fields
- [x] Auth endpoints return complete user data
- [x] Admin users endpoint returns profile fields
- [x] Server-side validation in place

## ✅ Frontend - Signup Flow
- [x] Enhanced signup form with all new fields
- [x] Character counters for favoriteCastaway (35) and about (250)
- [x] Client-side validation before submission
- [x] Submit button disabled when validation fails
- [x] Accessibility attributes (aria-invalid, aria-describedby)
- [x] Username marked as required (shown on rankings)
- [x] Email marked as login identifier
- [x] Form redirects to preseason ranking after signup

## ✅ Frontend - Profile Page
- [x] Profile page width matches other pages (removed maxWidth styles)
- [x] All new fields editable
- [x] Character counters for long fields
- [x] Client-side and server-side validation
- [x] Profile picture upload working
- [x] Password change functionality intact

## ✅ Admin Dashboard
- [x] User Manager displays all new profile fields
- [x] Username, location (city/state), favorite castaway columns added
- [x] Player bios section shows "about" field
- [x] Admin can view all user data
- [x] League Manager reorganized as "Draft Manager"
- [x] Draft controls moved to top with clear buttons
- [x] No horizontal scroll issues
- [x] League Settings at bottom with member list

## ✅ Build & Tests
- [x] TypeScript build passes with no errors
- [x] All 3 tests passing
- [x] No console errors

## 🔍 Manual Testing Checklist

### Test 1: Sign Up with Required Fields Only
- [ ] Navigate to /signup
- [ ] Fill in: email, username, name (display name), password
- [ ] Leave optional fields blank
- [ ] Click "Create account"
- [ ] Verify redirect to /preseason-rank
- [ ] Check that user is logged in

### Test 2: Sign Up with All Fields
- [ ] Navigate to /signup (in incognito/new session)
- [ ] Fill in all fields including:
  - Email: test@example.com
  - Username: testuser
  - Display name: Test User
  - Alternate display name: Testy
  - City: San Francisco
  - State: California
  - Favorite castaway: Parvati Shallow (16 chars)
  - About: I love Survivor because... (150 chars)
  - Password: password123
- [ ] Verify character counters update correctly
- [ ] Submit and verify redirect
- [ ] Go to /profile and verify all fields are saved

### Test 3: Character Limit Validation
- [ ] Go to /signup
- [ ] Try entering 36 characters in "Favorite castaway"
- [ ] Verify error message appears
- [ ] Verify submit button is disabled
- [ ] Try entering 251 characters in "About"
- [ ] Verify error message appears
- [ ] Verify submit button is disabled
- [ ] Reduce to valid lengths and verify submit enables

### Test 4: Profile Update
- [ ] Log in as existing user
- [ ] Go to /profile
- [ ] Update displayName to "New Name"
- [ ] Update city to "New York"
- [ ] Update favoriteCastaway to "Boston Rob"
- [ ] Update about to "Big Brother got me into Survivor"
- [ ] Click "Update Profile"
- [ ] Verify success message
- [ ] Refresh page
- [ ] Verify changes persisted

### Test 5: Admin View
- [ ] Log in as admin
- [ ] Go to /admin/users
- [ ] Verify table shows:
  - Name (with displayName in parentheses if present)
  - Username
  - Email
  - Location (city, state)
  - Favorite castaway
  - Role
  - Joined date
- [ ] Scroll down to "Player Bios" section
- [ ] Verify users with "about" field show their bios

### Test 6: Username in Rankings
- [ ] Navigate to /leaderboard (public endpoint)
- [ ] Verify username is displayed (not email)
- [ ] Verify display name is shown in appropriate contexts
- [ ] Verify email is NOT visible

### Test 7: Complete User Flow
- [ ] **Step 1: Sign up**
  - Create new account with all profile fields
  - Verify redirect to /preseason-rank

- [ ] **Step 2: Rank Players**
  - Drag castaways to rank them
  - Submit ranking
  - Verify confirmation

- [ ] **Step 3: Admin Runs Draft**
  - Log in as admin
  - Go to /admin/league (Draft Manager)
  - Click "Run Draft Now"
  - Verify draft completes successfully
  - Check Draft Results table

- [ ] **Step 4: Make Weekly Picks**
  - Log out of admin, log in as player
  - Go to /weekly-picks
  - Select a castaway for the active week
  - Submit pick
  - Verify confirmation

- [ ] **Step 5: Admin Scores Week**
  - Log in as admin
  - Go to /admin/scoring (Weekly Score Entry)
  - Select current week
  - Enter points for castaways
  - Submit scores
  - Verify success

- [ ] **Step 6: Repeat Weekly Picks**
  - Log in as player
  - Make pick for next week
  - Verify previous week's pick is locked

- [ ] **Step 7: View Leaderboard**
  - Navigate to /leaderboard
  - Verify scores updated
  - Verify rankings correct
  - Check Weekly Picks tab shows history

### Test 8: Draft Manager Reorganization
- [ ] Log in as admin
- [ ] Go to /admin/league (now "Draft Manager")
- [ ] Verify page layout:
  - Hero section says "Draft Manager"
  - Draft Controls section at top with buttons
  - Draft Status & Configuration section (no horizontal scroll)
  - Draft Results table (if draft run)
  - League Settings section at bottom
  - League Members table at bottom

### Test 9: Profile Page Width
- [ ] Log in as any user
- [ ] Go to /profile
- [ ] Compare width to /leaderboard
- [ ] Compare width to /weekly-picks
- [ ] Verify tan border width is consistent
- [ ] Verify no inline maxWidth styles

### Test 10: Image Paths & Game Tracker
- [ ] Navigate to /game-tracker
- [ ] Verify all castaway images load
- [ ] Verify castaways grouped by tribe
- [ ] Verify null/unknown tribes handled gracefully
- [ ] Check that MC and Annie images work

## 🚀 Pre-Deployment Steps

1. **Environment Variables**
   - [ ] DATABASE_URL set in production
   - [ ] JWT_SECRET set (not using dev default)
   - [ ] NODE_ENV=production

2. **Database Migration**
   - [ ] Run `npx prisma db push` or migration in production
   - [ ] Verify User table has new columns

3. **Build & Deploy**
   - [ ] Run `npm run build` locally first
   - [ ] Verify no TypeScript errors
   - [ ] Run `npm test` and ensure all pass
   - [ ] Commit changes
   - [ ] Push to GitHub
   - [ ] Monitor Render auto-deploy

4. **Post-Deploy Verification**
   - [ ] Visit production URL
   - [ ] Sign up as new user
   - [ ] Verify profile fields work
   - [ ] Admin login and check user management
   - [ ] Run through Test 7 (Complete User Flow) in production

## 📋 Expected User Journey

```
1. User visits site → Sign up with profile info
2. Redirected to Preseason Ranking → Rank all castaways
3. Admin locks rankings → Admin runs draft
4. Users get draft picks → Season begins
5. Each week:
   - User makes weekly pick
   - Admin enters scores
   - Leaderboard updates
6. Season ends → Winner determined by total points
```

## 🔑 Key Semantics

- **Email**: Used ONLY for login, never shown publicly
- **Username**: Required, shown on public rankings/leaderboard
- **Name (Display Name)**: Shown on dashboard, personal contexts
- **Alternate Display Name**: Optional nickname
- **About**: Player bio (250 chars max)
- **Favorite Castaway**: Fun profile detail (35 chars max)

## 🎯 Success Criteria

- [x] All builds pass without errors
- [x] All tests pass (3/3)
- [ ] Manual Test 1-10 completed successfully
- [ ] No horizontal scroll on any admin page
- [ ] Profile page width matches other pages
- [ ] Character counters work correctly
- [ ] Server validation prevents oversized inputs
- [ ] Complete user flow works end-to-end

## 📝 Notes

- Username is NOW required (changed from optional)
- Profile fields are backwards compatible (existing users won't break)
- Empty optional fields save as NULL in database
- Admin can see all profile data
- Public endpoints (leaderboard) do NOT expose email
- Draft Manager is the new home for league settings and draft controls
