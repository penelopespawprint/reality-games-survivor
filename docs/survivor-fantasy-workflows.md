# Survivor Fantasy Zapier Workflows

## Webhook-Triggered Automations

### Episode Night Workflows

| Workflow | Trigger | Actions | Webhook |
|----------|---------|---------|---------|
| **Episode Reminder** | 2 hours before picks close | Push notification + Email reminder to users without picks | `TODO: Add webhook URL` |
| **Picks Closed** | Picks deadline passed | Lock picks + Send confirmation emails | `TODO: Add webhook URL` |
| **Live Scoring Alert** | After elimination | Push notification with live scoring updates | `TODO: Add webhook URL` |
| **Weekly Results** | After scoring published | Email weekly standings + Push notification | `TODO: Add webhook URL` |

### User Engagement Workflows

| Workflow | Trigger | Actions | Webhook |
|----------|---------|---------|---------|
| **Welcome Sequence** | New user signup | Day 0: Welcome email, Day 1: How to play, Day 3: Pick reminder | `TODO: Add webhook URL` |
| **Inactive User** | No picks for 2 weeks | Re-engagement email with standings | `TODO: Add webhook URL` |
| **League Leader** | User takes #1 spot | Celebratory push notification | `TODO: Add webhook URL` |
| **Close Race Alert** | Within 10 points of leader | Weekly motivation email | `TODO: Add webhook URL` |

### Administrative Workflows

| Workflow | Trigger | Actions | Webhook |
|----------|---------|---------|---------|
| **Payment Success** | Stripe payment complete | Send receipt + Activate premium features | `TODO: Add webhook URL` |
| **Payment Failed** | Stripe payment failed | Retry notification + Support email | `TODO: Add webhook URL` |
| **New Season Prep** | Admin trigger | Reset database + Import new castaways | `TODO: Add webhook URL` |

## MCP Tool Preferences

When using Zapier MCP tools, prefer these patterns:

### Email Sending
- **Provider:** Resend (already integrated in server)
- **Template source:** `/client/public/email-preview.html`
- **Format:** HTML with inline styles

### Data Storage
- **Spreadsheets:** Google Sheets for analytics exports
- **CRM:** Notion for user notes and feedback
- **Logs:** Linear for issues/bugs

### Notifications
- **Push:** Expo Push Notifications (via server API)
- **SMS:** Twilio (for smsEnabled users only)
- **Email:** Resend transactional emails

## Seasonal Rhythm Integration

```
PRE-SEASON (2-4 weeks before premiere)
├── Import new cast data
├── Reset rankings
├── Open preseason predictions
└── Marketing push for signups

ACTIVE SEASON (weekly)
├── Monday: Open picks for new week
├── Wednesday 8pm ET: Episode airs
│   ├── 6pm: Pick reminder (2 hours before close)
│   ├── 8pm: Lock picks
│   └── 10pm: Publish live scoring
├── Thursday: Weekly standings email
└── Sunday: Re-engagement for inactive users

POST-SEASON (finale week)
├── Final scoring
├── Crown winner
├── Export analytics
└── Teaser for next season
```

## Integration with MCP Server

The RGFL MCP Server (mcp-server/src/index.ts) provides these tools that Zapier workflows can trigger:

**Scoring:**
- `publish_weekly_scores` - After episode scoring

**User Management:**
- `get_user_details` - For personalized emails
- `reset_user_password` - Self-service password reset

**Analytics:**
- `get_system_stats` - Weekly dashboard data
- `get_castaway_popularity` - Content for social media
- `get_head_to_head` - Rivalry content generation
