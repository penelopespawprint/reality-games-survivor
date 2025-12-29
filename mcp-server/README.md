# RGFL MCP Server

Model Context Protocol (MCP) server for Reality Games Fantasy League - Survivor. This server provides AI assistants with comprehensive access to game data and admin operations.

## Features

### Resources (Read-only data)

| Resource | URI | Description |
|----------|-----|-------------|
| Active Season | `season://active` | Current active season info |
| Castaways | `castaways://active` | All castaways for active season |
| Episodes | `episodes://active` | Episode list for active season |
| Leagues | `leagues://overview` | Overview of all leagues |
| Announcements | `announcements://all` | All announcements |
| Scoring Rules | `scoring-rules://all` | All scoring rules |
| Email Queue | `email-queue://status` | Email queue status |
| Recent Users | `users://recent` | Recent user signups |

### Tools - User Management

| Tool | Description |
|------|-------------|
| `get_user` | Get user profile by ID or email |
| `search_users` | Search users by name or email |
| `update_user_role` | Change user role (player/commissioner/admin) |
| `delete_user` | Delete a user and all their data |

### Tools - League Management

| Tool | Description |
|------|-------------|
| `get_league` | Get league details with members |
| `update_league` | Update league settings |
| `delete_league` | Delete a league |
| `remove_league_member` | Remove a member from a league |

### Tools - Castaway Management

| Tool | Description |
|------|-------------|
| `get_castaway` | Get castaway details with stats |
| `update_castaway` | Update castaway information |
| `eliminate_castaway` | Mark castaway as eliminated |
| `create_castaway` | Create a new castaway |

### Tools - Episode Management

| Tool | Description |
|------|-------------|
| `get_episode` | Get episode with scoring events |
| `create_episode` | Create a new episode |
| `update_episode` | Update episode information |

### Tools - Announcement Management

| Tool | Description |
|------|-------------|
| `create_announcement` | Create a new announcement |
| `update_announcement` | Update an announcement |
| `delete_announcement` | Delete an announcement |

### Tools - Scoring

| Tool | Description |
|------|-------------|
| `add_score` | Add scoring event for a castaway |
| `get_scoring_rules` | Get scoring rules by category |

### Tools - Dashboard & Stats

| Tool | Description |
|------|-------------|
| `get_dashboard_stats` | Get overall statistics |
| `get_leaderboard` | Get league leaderboard |

### Tools - Email Queue

| Tool | Description |
|------|-------------|
| `get_email_queue` | Get pending/failed emails |
| `retry_failed_email` | Retry a failed email |

### Tools - Database

| Tool | Description |
|------|-------------|
| `run_query` | Run read-only SQL queries |

### Prompts (Templates)

| Prompt | Description |
|--------|-------------|
| `analyze_league` | Analyze a league's performance |
| `weekly_recap` | Generate weekly recap |
| `admin_report` | Generate admin status report |
| `scoring_audit` | Audit scoring for an episode |

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

Set environment variables:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
SENTRY_DSN=https://your-sentry-dsn
```

## Usage with Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "rgfl-survivor": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://qxrgejdfxcvsfktgysop.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key"
      }
    }
  }
}
```

## Usage with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rgfl-survivor": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://qxrgejdfxcvsfktgysop.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key"
      }
    }
  }
}
```

## Development

```bash
npm run dev    # Development with hot reload
npm run build  # Build for production
npm start      # Run production build
```

## Example Usage

### User Management
```
Search for user "blake" and show their league memberships
```

### Castaway Updates
```
Eliminate "Eva Erickson" with placement 18 in episode 1
```

### Create Announcement
```
Create an urgent announcement titled "Draft Deadline Tonight" 
with content "Complete your rankings by 8pm PST!"
```

### Admin Report
```
Use the admin_report prompt to generate a status report
```

### Scoring Audit
```
Use the scoring_audit prompt for episode 3
```

## Security

- Uses Supabase service role key for admin access
- `run_query` only allows SELECT statements
- Dangerous SQL keywords are blocked
- Delete operations require explicit confirmation
- All operations are logged via Sentry

## Sentry Monitoring

Enable with `SENTRY_DSN` for:
- Request tracing for all MCP operations
- Error capture with context
- Performance monitoring
