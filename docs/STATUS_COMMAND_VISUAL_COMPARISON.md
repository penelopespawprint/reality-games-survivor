# SMS STATUS Command - Visual Comparison

## What Users Expect vs. What They Actually Get

---

## Scenario 1: User Texts "STATUS" on Tuesday Before Picks Lock

### Context:
- User in 2 leagues
- Current week: Episode 5
- Picks lock Wednesday 3pm PST (tomorrow)
- User submitted pick in League 1, forgot League 2

---

### 📱 WHAT USER EXPECTS TO SEE:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
RGFL SURVIVOR - Week 5 Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━

MY LEAGUE:
  ✓ Pick submitted
  Tony Vlachos
  245 points (#3 of 12)

GLOBAL LEAGUE:
  ⚠ NO PICK YET!
  198 points (#47 of 2,483)

⏰ Picks lock tomorrow 3pm PST
   Submit at rgfl.app or
   text: PICK [name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**User Action:** Immediately texts "PICK Sarah Lacina" for Global League

---

### 📱 WHAT USER ACTUALLY GETS:

```
Recent picks:
Tony Vlachos - My League
Sarah Lacina - My League
Parvati Shallow - My League
Sandra Diaz-Twine - Global League
Rob Mariano - Global League
```

**User Confusion:**
- "Wait, did I already pick for this week?"
- "Which league is this for?"
- "When were these picks from?"
- "Do I need to do anything?"

**User Action:** Logs into web app to check, defeating purpose of SMS

---

## Scenario 2: User Texts "STATUS" After Episode Airs (Thursday)

### Context:
- User in 1 league
- Just watched Episode 5
- Wants to know their score

---

### 📱 WHAT USER EXPECTS TO SEE:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
RGFL SURVIVOR - My League
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Week 5 Results:
  Your pick: Tony Vlachos
  Points earned: 38

SEASON STANDINGS:
  Total: 245 points
  Rank: #3 of 12 players

Next pick due: Wed Dec 10, 3pm
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**User Feeling:** Satisfied, knows exactly where they stand

---

### 📱 WHAT USER ACTUALLY GETS:

```
Recent picks:
Tony Vlachos - My League
Sarah Lacina - My League
Parvati Shallow - My League
Sandra Diaz-Twine - My League
Rob Mariano - My League
```

**User Confusion:**
- "How many points did I get?"
- "Am I winning?"
- "What place am I in?"

**User Feeling:** Frustrated, no useful information

---

## Scenario 3: User Auto-Picked Last Week (Missed Deadline)

### Context:
- User missed Week 4 deadline
- System auto-picked for them
- User doesn't know this happened

---

### 📱 WHAT USER EXPECTS TO SEE:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
RGFL SURVIVOR - Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Week 5: ✓ Tony Vlachos
Week 4: Sarah Lacina [AUTO]

⚠ You missed the Week 4
   deadline. System auto-
   picked for you.

Total: 245 points (#3)
Next pick: Wed 3pm PST
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**User Learning:** "Oh! I need to submit earlier"

---

### 📱 WHAT USER ACTUALLY GETS:

```
Recent picks:
Tony Vlachos - My League
Sarah Lacina - My League
Parvati Shallow - My League
```

**User Belief:** "I submitted all of these manually"

**Reality:** Week 4 was auto-picked, user has no idea

**Impact:** User will miss deadline again next week

---

## Scenario 4: New User Just Joined League

### Context:
- User joined league yesterday
- Draft hasn't happened yet (premiere is next week)
- User doesn't understand game flow yet

---

### 📱 WHAT USER EXPECTS TO SEE:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
RGFL SURVIVOR - Welcome!
━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're in: My League

NEXT STEPS:
  1. Season 50 premieres
     Wed Feb 25, 8pm

  2. After Episode 1, rank
     your castaway preferences
     at rgfl.app

  3. Draft happens Mar 2
     You'll get 2 castaways

  4. Make weekly picks
     starting Week 2

Questions? Text HELP
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**User Feeling:** Informed, knows what to expect

---

### 📱 WHAT USER ACTUALLY GETS:

```
No recent picks found.
```

**User Confusion:**
- "Why no picks?"
- "Am I doing something wrong?"
- "Is my account broken?"

**User Action:** Texts support asking if something is wrong

---

## Scenario 5: User's Castaway Just Got Eliminated

### Context:
- User had 2 castaways, 1 just eliminated
- Now only has 1 castaway left
- One more elimination = out of league

---

### 📱 WHAT USER EXPECTS TO SEE:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
RGFL SURVIVOR - Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR ROSTER:
  Tony Vlachos ✓ ACTIVE
  Sarah Lacina ✗ ELIMINATED
                  (Week 4)

⚠ WARNING: If Tony is
   eliminated, your torch
   is snuffed!

Total: 245 points (#3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**User Feeling:** Anxious but informed

---

### 📱 WHAT USER ACTUALLY GETS:

```
Recent picks:
Tony Vlachos - My League
Sarah Lacina - My League
Tony Vlachos - My League
```

**User Confusion:**
- "Why is Sarah showing? She was eliminated"
- "Can I still pick her?"
- "What's my roster status?"

**User Action:** Has to use TEAM command to see roster

---

## Scenario 6: Picks Lock in 30 Minutes (URGENT)

### Context:
- Wednesday 2:30pm PST
- Picks lock at 3:00pm (30 minutes)
- User hasn't submitted pick yet

---

### 📱 WHAT USER EXPECTS TO SEE:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 URGENT - PICKS LOCK SOON 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Week 5 - 30 MINUTES LEFT!

MY LEAGUE:
  ⚠ NO PICK SUBMITTED!

SUBMIT NOW:
  - Text: PICK [name]
  - Web: rgfl.app

If you don't pick, system
will auto-pick for you.
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**User Action:** IMMEDIATELY submits pick

---

### 📱 WHAT USER ACTUALLY GETS:

```
Recent picks:
Tony Vlachos - My League
Sarah Lacina - My League
Parvati Shallow - My League
```

**User Belief:** "I already picked this week"

**Reality:** Those are old picks, deadline is 30 min away

**Outcome:** User misses deadline, gets auto-picked AGAIN

---

## Scenario 7: User in 5 Leagues (Power User)

### Context:
- User is commissioner of own league
- Plus 4 other leagues
- Different pick status in each

---

### 📱 WHAT USER EXPECTS TO SEE:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
RGFL - Week 5 Status (5 Lgues)
━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ My League: Tony (245pts #2)
✓ Work: Sarah (198pts #5)
✓ Friends: Tony (167pts #8)
⚠ Family: NO PICK!
✓ Alumni: Parvati (301pts #1)

ACTION NEEDED: Family League

Picks lock Wed 3pm PST
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**User Action:** Submits pick for Family League

---

### 📱 WHAT USER ACTUALLY GETS:

```
Recent picks:
Tony Vlachos - My League
Sarah Lacina - Work League
Tony Vlachos - Friends League
Parvati Shallow - Alumni League
Sandra Diaz-Twine - My League
```

**User Confusion:**
- "Did I pick for Family League?"
- "I can't remember which leagues I already picked for"
- "This is 5 picks but I have 5 leagues... did I pick twice in one?"

**User Action:** Logs into web app, checks each league manually

---

## Side-by-Side Comparison

| Feature | Expected | Actual | Gap |
|---------|----------|--------|-----|
| **Current Week Status** | Shows if pick submitted for THIS week | Shows last 5 picks from ANY week | ❌ CRITICAL |
| **Points Total** | Shows total points & rank | Not shown | ❌ CRITICAL |
| **Actionable Info** | Tells user what to do next | No guidance | ❌ CRITICAL |
| **Episode Context** | Shows which week each pick is for | No episode numbers | ❌ HIGH |
| **Pick Status** | Shows auto-pick vs manual | All picks look same | ❌ HIGH |
| **Urgency Indicator** | Warns if deadline approaching | No deadline awareness | ❌ HIGH |
| **Multi-League UX** | Per-league breakdown | Mixed list of picks | ❌ MEDIUM |
| **Elimination Status** | Shows if castaways eliminated | No status shown | ❌ MEDIUM |
| **Error Messages** | Helpful context for new users | Generic "no picks found" | ❌ LOW |

---

## The Core Problem

### User Mental Model:
> "STATUS means: What's my current situation? What do I need to do?"

### System Mental Model:
> "STATUS means: Here's your pick history"

### The Gap:
Users want **actionable status**. System provides **historical data**.

It's like asking "Am I on time for my flight?" and being told "Here are your last 5 flights."

---

## What Makes a Good Status Response?

1. **Current State** - Where am I right now?
2. **Progress** - How am I doing? (points, rank)
3. **Action Required** - What do I need to do?
4. **Deadline** - When do I need to do it by?
5. **Context** - What week/episode are we on?

Current implementation: **0 out of 5**

---

## Real-World Analogy

### Bank Account Balance (Good Status)
```
Checking Account:
Balance: $2,450.32
Recent: +$500 deposit (Dec 26)
Pending: -$125 (rent, due Jan 1)
Alert: Low balance warning at $500
```

### If Bank Did It Like RGFL STATUS
```
Recent transactions:
Coffee Shop
Gas Station
Grocery Store
Restaurant
Online Purchase
```

**User:** "Cool, but... how much money do I have?"

**Bank:** "Check the website."

**User:** "Why did I text you then?!"

---

## SMS Character Limits & UX Considerations

Standard SMS: 160 characters
Concatenated SMS: 1600 characters (10 messages)

### Current Response (~120 chars):
```
Recent picks:
Tony Vlachos - My League
Sarah Lacina - Global League
Parvati Shallow - My League
```

Fits in 1 SMS ✓

### Recommended Response (~240 chars):
```
Week 5 Status:
✓ Tony (My League) - 245pts #3
⚠ No pick (Global) - 198pts #47

Picks lock Wed 3pm PST
Submit: PICK [name]
```

Fits in 2 SMS (concatenated) ✓

**Cost:** Minimal (1 extra SMS)
**Value:** MASSIVE (actually useful information)

---

## Conclusion

The current STATUS command is like a broken compass:
- It provides *some* information
- But not the information users need
- At the wrong level of detail
- With no context or guidance

Users text "STATUS" when they're:
- Away from computer
- Need quick answer
- Want to know if action is needed

Current response forces them to:
- Log into web app anyway
- Guess at their situation
- Miss deadlines

**Fix Priority:** MEDIUM
**Fix Complexity:** LOW
**Fix Impact:** HIGH

The irony: The PICK command has better status awareness than STATUS itself.

---

## Files Generated

1. **QA_REPORT_SMS_STATUS_COMMAND.md** - Full technical analysis
2. **QA_STATUS_COMMAND_SUMMARY.txt** - Executive summary
3. **STATUS_COMMAND_VISUAL_COMPARISON.md** - This document

**Next Steps:**
Fix implementation in Week 2 (after P0 blockers resolved)

**Estimated Fix Time:** 4-6 hours
**Testing Time:** 2 hours
**Total:** ~1 day
