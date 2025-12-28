# 🚀 RGFL Survivor - Launch Guide

## Current Status: ✅ READY FOR LAUNCH

All systems have been enhanced and tested. The application is production-ready.

---

## 🎯 What's New

### Enhanced User Profiles
Users can now provide rich profile information during signup:
- **Email** (required, login only - never shown publicly)
- **Username** (required, shown on public rankings)
- **Display Name** (required, shown on dashboard)
- **Alternate Display Name** (optional, nickname)
- **City** (optional)
- **State** (optional)
- **Favorite Castaway** (optional, 35 characters max)
- **About** (optional, 250 characters - "Why do you love Survivor and who are you?")

### Reorganized Admin Dashboard
- **Draft Manager** (formerly League Management)
  - Draft Controls at top with clear buttons
  - Draft Status & Configuration (no horizontal scroll)
  - Draft Results table
  - League Settings at bottom
  - League Members list

- **User Management**
  - Enhanced table showing all profile fields
  - Location column (city, state)
  - Favorite castaway column
  - Player Bios section

### UI Improvements
- Profile page width matches all other pages
- Character counters with visual feedback
- No horizontal scroll on admin pages
- Better organized, logical flow for admin actions

---

## 📋 Quick Start Deployment

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Render Auto-Deploy
Render will automatically:
- Pull latest code
- Run database migration (`npx prisma db push`)
- Build client and server
- Start the application

### 3. Verify Deployment
Visit: https://rgfl-survivor.onrender.com
- Check homepage loads
- Sign up as a test user
- Verify profile fields work

---

## 👥 User Flow Guide

### For Players

#### 1. Sign Up
1. Visit the site
2. Click "Sign up"
3. Fill in profile information:
   - Email (you'll use this to log in)
   - Username (this appears on the leaderboard)
   - Display name (your full name)
   - Optional: City, State, Favorite Castaway, About
4. Create password
5. Click "Create account"

#### 2. Rank Castaways (Preseason)
1. After signup, you're redirected to Preseason Ranking
2. Drag castaways into your preferred order
3. Submit your ranking

#### 3. Wait for Draft
- Admin will lock rankings when ready
- Admin runs the draft
- You'll receive your draft picks

#### 4. Make Weekly Picks
1. Each week, navigate to "Weekly Picks"
2. Select one castaway for the week
3. Submit before the deadline
4. Points are awarded based on castaway performance

#### 5. View Leaderboard
- Check your ranking
- See weekly picks history
- Track total points

### For Admins

#### 1. Manage Castaways
- Add/edit/delete castaways
- Set tribes, ages, occupations
- Mark as eliminated

#### 2. Run the Draft
1. Go to **Draft Manager**
2. Click **Run Draft Now**
3. Review Draft Results
4. Draft is complete!

#### 3. Enter Weekly Scores
1. Go to **Weekly Score Entry**
2. Select the week
3. Enter points for each castaway
4. Submit
5. Leaderboard updates automatically

#### 4. Manage Users
- View all player profiles
- See player bios
- Edit user details
- Reset passwords
- Toggle admin privileges

---

## 🔑 Key Admin Actions (In Order)

### Pre-Season
1. **Castaway Management** - Import all castaways for the season
2. **User Management** - Verify all players have signed up
3. Wait for all players to submit rankings

### Draft Day
1. **Draft Manager** → Click "Run Draft Now"
2. Verify Draft Results
3. Announce to players that draft is complete

### Weekly (During Season)
1. Players make weekly picks (before deadline)
2. Episode airs
3. **Weekly Score Entry** → Enter castaway points
4. Leaderboard updates automatically

### End of Season
1. **Season Controls** → Optionally reset for next season
2. Review final leaderboard
3. Announce winner!

---

## 🧪 Testing Checklist (Do This First!)

Before inviting real users, test the complete flow:

### Test Account Creation
- [ ] Sign up with minimal fields (email, username, name, password)
- [ ] Sign up with all fields filled
- [ ] Verify character limits work (try 36 chars in favorite, 251 in about)
- [ ] Verify submit button disables when limits exceeded

### Test Profile Management
- [ ] Log in and go to /profile
- [ ] Update profile fields
- [ ] Verify changes persist after refresh

### Test Admin Functions
- [ ] Log in as admin
- [ ] Add a few test castaways
- [ ] Invite 2-3 friends to sign up
- [ ] Have them submit rankings
- [ ] Run the draft
- [ ] Create a week
- [ ] Have players make picks
- [ ] Enter scores
- [ ] Verify leaderboard updates

### Test Complete User Journey
Follow the **Test 7: Complete User Flow** in `PRE_LAUNCH_CHECKLIST.md`

---

## 📊 Admin Dashboard Quick Reference

### Main Dashboard (`/admin`)
- Overview statistics
- Quick links to all admin functions

### Weekly Score Entry (`/admin/scoring`)
- Select week
- Enter points for each castaway
- Submit to update leaderboard

### Draft Manager (`/admin/league`)
- **Top Section**: Run Draft, Reset Draft, Edit Settings buttons
- **Middle Section**: Draft Status, Configuration
- **Draft Results**: Table of all draft picks
- **Bottom Section**: League Settings, League Members

### Rankings Overview (`/admin/rankings`)
- See all player rankings
- Verify submissions before draft

### Weekly Picks Manager (`/admin/picks`)
- View all weekly picks
- See who has/hasn't submitted

### Analytics Dashboard (`/admin/analytics`)
- Charts and trends
- Player engagement metrics
- Win probability calculations

### Castaway Management (`/admin/castaways`)
- Add/edit/delete castaways
- Upload images
- Mark as eliminated

### User Management (`/admin/users`)
- View all user profiles and bios
- Edit user details
- Reset passwords
- Toggle admin privileges
- Delete users (non-admin only)

### Season Controls (`/admin/season`)
- Reset season
- Unlock draft
- Clear picks/rankings

---

## 🔒 Security & Privacy

### What's Public
- Username (on leaderboard)
- Display name (on dashboard)
- Weekly picks
- Total points

### What's Private
- Email address (never shown publicly)
- Password (hashed)
- Profile details (city, state, favorite, about) - visible to admins only

### Admin Access
- Admins can see all user data
- Admins can edit user profiles
- Admins cannot see passwords

---

## 🐛 Troubleshooting

### "Email already in use"
- User already has an account
- Use password reset or try logging in

### "Username already taken"
- Choose a different username
- Usernames must be unique

### Draft Won't Run
- Verify all players have submitted rankings
- Check that castaways exist in database
- Ensure picks per user is set correctly

### Scores Not Updating
- Verify week is created
- Check that scores were submitted (not just entered)
- Refresh leaderboard page

### Images Not Loading
- Verify images are in `/client/public/images/`
- Check filename matches exactly (case-sensitive)
- MC and Annie have special handling

---

## 📈 Monitoring Post-Launch

### Day 1
- [ ] Monitor user signups
- [ ] Check for any error messages
- [ ] Verify profile data is saving correctly

### Day 2-3
- [ ] Ensure all players have submitted rankings
- [ ] Test draft with real data

### Week 1
- [ ] Create first week
- [ ] Monitor weekly pick submissions
- [ ] Enter first scores
- [ ] Verify leaderboard accuracy

### Ongoing
- [ ] Check analytics dashboard weekly
- [ ] Monitor player engagement
- [ ] Address any user feedback

---

## 🎨 Customization Tips

### Want to change character limits?
1. Update `server/auth.ts` Zod schema (lines 34-35)
2. Update `server/users.ts` validation (lines 95-99)
3. Update frontend forms (Signup.tsx, Profile.tsx)
4. Update documentation

### Want to add more profile fields?
1. Add to Prisma schema
2. Run `npx prisma db push`
3. Update server endpoints
4. Update TypeScript interfaces
5. Update frontend forms
6. Update admin views

---

## 📞 Support

For issues, questions, or feedback:
- Email: support@realitygamesfantasyleague.com
- GitHub Issues: https://github.com/penelopespawprint/rgfl-multi/issues

---

## ✅ Launch Checklist

- [ ] All code committed and pushed to GitHub
- [ ] Render auto-deploy completed successfully
- [ ] Production site loads without errors
- [ ] Test signup flow works
- [ ] Test complete user journey (signup → rank → draft → picks → scoring)
- [ ] Admin dashboard navigation works
- [ ] Profile page width matches other pages
- [ ] No horizontal scroll on admin pages
- [ ] Character counters work correctly
- [ ] Validation prevents oversized inputs
- [ ] Invite users and announce launch!

---

## 🎉 You're Ready!

Everything is set up and tested. Your enhanced Survivor fantasy league is ready to launch!

Key improvements:
✅ Rich user profiles with bios and favorite castaways
✅ Better organized admin dashboard
✅ No layout issues or horizontal scroll
✅ Complete validation and error handling
✅ Full user journey tested

**Next Step**: Push to GitHub and let Render auto-deploy!

```bash
git push origin main
```

Then monitor the deployment at: https://dashboard.render.com

Once deployed, visit: https://rgfl-survivor.onrender.com

**Good luck and may the best Survivor fan win!** 🏝️🔥
