# Spoiler-Safe Notification System

This service sends notifications about episode results **without revealing spoilers** to users who haven't watched yet.

## Problem Solved

Fantasy sports apps typically send results immediately after scoring, which can spoil episodes for users who haven't watched yet. This creates a dilemma:

- **Send notifications early** → High engagement but spoils episodes
- **Send notifications late** → No spoilers but low engagement

Our solution: **Spoiler-safe notifications with click-to-reveal**

## How It Works

### 1. Admin Finalizes Scoring

After an episode airs, admin enters scores and finalizes the scoring session.

### 2. Release Results

Admin (or automated job) triggers results release for the episode.

### 3. Generate Secure Tokens

For each user, we generate a unique 64-character token that:
- Links to specific user + episode
- Expires in 7 days
- Tracks when used (used_at timestamp)
- Reuses existing token if called again

### 4. Send Notifications

**Email:**
- ✅ Generic subject: "Your Survivor Fantasy results are ready (Episode 5)"
- ✅ No scores, names, or outcomes in preview text
- ✅ Spoiler warning box with click-to-reveal button
- ✅ Token-secured link to view results
- ✅ Parchment/burgundy RGFL branding

**SMS:**
- ✅ Ultra-minimal message
- ✅ No scores, names, or game events
- ✅ Just: "Episode 5 results are ready! Check the app"
- ✅ App link (no token needed, requires login)

**Push (future):**
- ✅ Generic: "Episode 5 results are ready"
- ✅ Opens app to results page

### 5. User Clicks Link

Token is verified, marked as used, and user sees full results including:
- Their pick's performance
- Points earned
- League standings
- Rank changes
- Eliminations

## Usage

### Send Notification to Single User

```typescript
import { sendSpoilerSafeNotification } from '../lib/spoiler-safe-notifications.js';

const user = {
  id: 'user-uuid',
  email: 'player@example.com',
  display_name: 'John Doe',
  phone: '+12345678900',
};

const episode = {
  id: 'episode-uuid',
  number: 5,
  season_id: 'season-uuid',
};

await sendSpoilerSafeNotification(user, episode);
```

### Release Results to All Users

```typescript
import { releaseEpisodeResults } from '../jobs/releaseResults.js';

const result = await releaseEpisodeResults('episode-uuid');

console.log(`Sent ${result.notificationsSent} notifications`);
console.log(`Errors: ${result.errors.length}`);
```

### Verify Token (Frontend)

```typescript
import { verifyResultsToken } from '../lib/spoiler-safe-notifications.js';

// Extract token from URL query params
const token = req.query.token as string;

const verification = await verifyResultsToken(token);

if (!verification.valid) {
  return res.status(401).json({ error: 'Invalid or expired token' });
}

// Token is valid, show results for verification.userId and verification.episodeId
```

## Database Tables

### `notification_preferences`

Stores per-user notification settings.

```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  email_results BOOLEAN DEFAULT true,
  sms_results BOOLEAN DEFAULT true,
  push_results BOOLEAN DEFAULT true,
  spoiler_delay_hours INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Fields:**
- `email_results` - Send email when results are released
- `sms_results` - Send SMS when results are released
- `push_results` - Send push notification (future)
- `spoiler_delay_hours` - Future: delay notifications by X hours

### `results_tokens`

Stores secure tokens for results access.

```sql
CREATE TABLE results_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  UNIQUE(user_id, episode_id)
);
```

**Fields:**
- `token` - 64-character random hex string
- `user_id` - User who can use this token
- `episode_id` - Episode results this token unlocks
- `expires_at` - Token expires 7 days after creation
- `used_at` - Timestamp when first used (allows reuse)

## Email Template Preview

**Subject:** Your Survivor Fantasy results are ready (Episode 5)

**Preview Text:** The latest episode has been scored and your results are ready to view.

**Body:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Survivor Fantasy League
  Reality Games Fantasy League
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Episode 5 Results Are In!

Hi John,

The latest episode has been scored and
your results are ready to view.

┌─────────────────────────────┐
│ ⚠️ Spoiler Warning          │
│                             │
│ Click the button below to   │
│ reveal your scores and      │
│ standings. This will show   │
│ episode results including   │
│ eliminations and gameplay   │
│ events.                     │
│                             │
│  📊 View My Results         │
└─────────────────────────────┘

Not ready to see spoilers? No
problem! Results will be available
in your app whenever you're ready.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Update notification preferences
```

## SMS Template Preview

```
[RGFL] Episode 5 results are ready!
Check the app to view your scores
and standings.
https://survivor.realitygamesfantasyleague.com/results

Reply STOP to opt out.
```

## Frontend Integration

### 1. Results Page Route

```typescript
// /results/episode-5?token=abc123...

const ResultsPage = () => {
  const [token] = useSearchParams();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        const res = await fetch(`/api/results/verify?token=${token}`);
        const data = await res.json();
        setVerified(data.valid);
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  if (loading) return <Spinner />;
  if (!verified) return <InvalidToken />;

  return <EpisodeResults />;
};
```

### 2. Notification Settings Page

```typescript
const NotificationSettings = () => {
  const [prefs, setPrefs] = useState({
    email_results: true,
    sms_results: true,
    push_results: true,
  });

  const handleSave = async () => {
    await fetch('/api/me/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  };

  return (
    <div>
      <h2>Results Notifications</h2>
      <p>Get notified when episode results are ready (spoiler-free)</p>

      <Checkbox
        checked={prefs.email_results}
        onChange={(v) => setPrefs({ ...prefs, email_results: v })}
        label="Email notifications"
      />

      <Checkbox
        checked={prefs.sms_results}
        onChange={(v) => setPrefs({ ...prefs, sms_results: v })}
        label="SMS notifications"
      />

      <Button onClick={handleSave}>Save Preferences</Button>
    </div>
  );
};
```

## Security Considerations

### Token Security

- ✅ 64-character cryptographically random hex (256 bits entropy)
- ✅ One token per user+episode (prevents token spam)
- ✅ 7-day expiration (prevents long-term access)
- ✅ Single-use tracking (monitors usage patterns)
- ✅ User-specific (can't be shared)

### Database Indexes

```sql
-- Fast token lookup
CREATE INDEX idx_results_tokens_token ON results_tokens(token);

-- Fast user+episode lookup for deduplication
CREATE INDEX idx_results_tokens_user_episode ON results_tokens(user_id, episode_id);

-- Fast expiration cleanup
CREATE INDEX idx_results_tokens_expires ON results_tokens(expires_at) WHERE used_at IS NULL;
```

### Token Cleanup Job

```typescript
// Clean up expired tokens weekly
cron.schedule('0 0 * * 0', async () => {
  const { data } = await supabaseAdmin
    .from('results_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());

  console.log(`Cleaned up ${data?.length || 0} expired tokens`);
});
```

## Testing

Run tests:

```bash
npm test spoiler-safe-notifications
```

Test coverage:
- ✅ Email sent when email_results enabled
- ✅ SMS sent when sms_results enabled AND user has phone
- ✅ No SMS when user has no phone number
- ✅ Token generation and deduplication
- ✅ Token verification (valid, expired, nonexistent)
- ✅ Token usage tracking

## Environment Variables

Uses existing variables:

```bash
# App URL for email links
APP_URL=https://survivor.realitygamesfantasyleague.com

# Email service (via email-queue.ts)
RESEND_API_KEY=re_xxx

# SMS service (via twilio.ts)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+14247227529
```

## Migration Path

### Phase 1: Launch (Current)
- ✅ Default: all users get spoiler-safe notifications
- ✅ Users can opt out via notification preferences

### Phase 2: Delayed Release (Future)
- Add `spoiler_delay_hours` support
- Users set custom delay (0-72 hours)
- System holds notifications until delay expires
- Useful for West Coast vs East Coast viewers

### Phase 3: Push Notifications (Future)
- Implement mobile push via Expo
- Use same token system for in-app results
- Supports both web and mobile

## Monitoring

Track notification delivery:

```sql
-- Check notification success rate
SELECT
  COUNT(*) as total_sent,
  COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as successful,
  COUNT(CASE WHEN failed_at IS NOT NULL THEN 1 END) as failed
FROM email_queue
WHERE created_at > NOW() - INTERVAL '7 days'
  AND subject LIKE '%results are ready%';
```

Track token usage:

```sql
-- See how many users click through
SELECT
  COUNT(*) as tokens_generated,
  COUNT(used_at) as tokens_used,
  ROUND(COUNT(used_at)::numeric / COUNT(*)::numeric * 100, 1) as usage_rate
FROM results_tokens
WHERE created_at > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Notifications not sending

1. Check notification preferences:
   ```sql
   SELECT * FROM notification_preferences WHERE user_id = 'xxx';
   ```

2. Check email queue:
   ```sql
   SELECT * FROM email_queue WHERE to_email = 'user@example.com' ORDER BY created_at DESC LIMIT 5;
   ```

3. Check failed emails:
   ```sql
   SELECT * FROM failed_emails ORDER BY failed_at DESC LIMIT 10;
   ```

### Token not working

1. Verify token exists:
   ```sql
   SELECT * FROM results_tokens WHERE token = 'xxx';
   ```

2. Check expiration:
   ```sql
   SELECT token, expires_at, expires_at < NOW() as is_expired FROM results_tokens WHERE token = 'xxx';
   ```

3. Check usage:
   ```sql
   SELECT token, used_at, created_at FROM results_tokens WHERE token = 'xxx';
   ```

## Related Files

- `/server/src/lib/spoiler-safe-notifications.ts` - Core service
- `/server/src/lib/email-queue.ts` - Email queueing system
- `/server/src/config/twilio.ts` - SMS service
- `/server/src/emails/base.ts` - Email templates
- `/server/src/jobs/releaseResults.example.ts` - Example integration

## Support

Questions? Contact the development team or see:
- Email templates: `/server/src/emails/`
- Notification preferences API: `/server/src/routes/profile.ts`
- Results release admin UI: `/web/src/pages/admin/scoring/`
