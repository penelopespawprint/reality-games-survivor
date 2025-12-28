# RGFL Custom MCP Server v2.0

A comprehensive Model Context Protocol (MCP) server for the Reality Games Fantasy League (RGFL). This server provides full access to league data, admin operations, and analytics through a unified interface.

**Version 2.0** features 30+ tools across 9 functional categories, giving you complete programmatic control over the RGFL system through Claude Code.

## Features

### Resources (Data Queries)
- **Castaways**: Complete list with status and elimination tracking
- **Users**: All league members with profiles and preferences
- **Standings**: Real-time leaderboard with rankings and points
- **Picks Summary**: Overview of weekly picks and submission rates
- **Weekly Schedule**: All weeks with dates and status
- **Participation Analytics**: User engagement and trends
- **Power Rankings**: Advanced weighted ranking system

### Tools (Operations) - 30+ Tools

#### Week Management (3 tools)
- `create_or_update_week` - Create new weeks or update existing ones
- `get_week_details` - Get detailed stats for a specific week
- `delete_week` - Delete a week and all associated data

#### Scoring (1 tool)
- `publish_weekly_scores` - Publish castaway scores and calculate user points

#### Castaway Management (6 tools)
- `create_castaway` - Add new castaways to the league
- `update_castaway` - Update castaway information
- `eliminate_castaway` - Mark castaways as eliminated
- `restore_castaway` - Restore an eliminated castaway back to active
- `delete_castaway` - Permanently delete a castaway
- `get_castaway_results` - View weekly results for any castaway

#### User Management (7 tools)
- `create_user` - Create a new league user
- `update_user` - Update user profile information
- `delete_user` - Remove users from the system
- `get_user_details` - Get comprehensive user statistics
- `reset_user_password` - Generate password reset token for a user
- `toggle_admin_status` - Toggle admin privileges on/off
- `get_user_stats` - Get advanced user statistics

#### Pick Management (3 tools)
- `view_all_picks` - View all picks by user and week
- `delete_pick` - Delete a specific pick
- `auto_pick_users` - Auto-assign picks for users

#### Ranking Management (2 tools)
- `view_rankings` - View preseason draft rankings
- `submit_ranking` - Submit draft rankings for a castaway

#### League Management (2 tools)
- `get_league_config` - Get current league configuration
- `update_league_config` - Update league settings

#### Draft Management (2 tools)
- `get_draft_status` - Get current draft status
- `view_draft_picks` - View all draft picks

#### Analytics (4 tools)
- `get_system_stats` - System-wide statistics and metrics
- `get_castaway_popularity` - Castaway pick frequency analysis
- `get_head_to_head` - Head-to-head user matchup data
- (Coming soon) Real-time dashboard data

## Setup

### Prerequisites
- Node.js 18+
- The RGFL database (PostgreSQL or SQLite via Prisma)
- Prisma client configured

### Installation

1. Navigate to the MCP server directory:
```bash
cd mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Ensure your `.env` file in the RGFL root directory contains:
```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Building

```bash
npm run build
```

### Running in Development

```bash
npm run dev
```

### Running in Production

```bash
npm start
```

## Integration with Claude Code

### Configuration

Add the RGFL MCP server to your Claude Code configuration by updating your MCP settings:

1. Get the absolute path to the MCP server:
```bash
pwd  # from mcp-server directory
# e.g., /Users/richard/Projects/RGFL/mcp-server
```

2. Configure in Claude Code settings (typically in `~/.config/Claude\ Code/config.json` or similar):

```json
{
  "mcpServers": {
    "rgfl": {
      "command": "npm",
      "args": ["start"],
      "cwd": "/Users/richard/Projects/RGFL/mcp-server"
    }
  }
}
```

### Usage Examples

Once configured, you can use the MCP server in Claude Code:

**List available resources:**
```
mcp resource list rgfl
```

**Read a resource:**
```
mcp resource read rgfl rgfl://standings
```

**Call a tool:**
```
mcp tool call rgfl publish_weekly_scores {
  "weekNumber": 5,
  "scores": {
    "castaway-id-1": 100,
    "castaway-id-2": 75
  }
}
```

## Resource Details

### rgfl://castaways
Returns all castaways with:
- Name, number, tribe, age, occupation, hometown
- Elimination status and week eliminated
- Profile image URL

### rgfl://users
Returns all users with:
- Email, name, username, display name
- Location (city, state)
- Admin status and preferences
- Account creation date

### rgfl://standings
Returns leaderboard with:
- User name and display name
- Total points
- Weeks participated
- Sorted by points (highest first)

### rgfl://picks
Returns weekly picks summary:
- Week number
- Total picks for that week
- Number of submitted picks

### rgfl://weeks
Returns all weeks with:
- Week number and active status
- Pick open/close timestamps
- Count of picks and scores

### rgfl://analytics/participation
Returns participation trends:
- Weekly user participation rate
- Average points per user
- Participation percentage

### rgfl://analytics/power-rankings
Returns advanced rankings:
- Total points (40% weight)
- Average points per week (20%)
- Recent form (20%)
- Participation rate (10%)
- Draft quality (10%)

## Tool Details

### Week Management

#### create_or_update_week
Create or update a week with dates and active status:
```json
{
  "weekNumber": 5,
  "isActive": true,
  "picksOpenAt": "2024-10-21T18:00:00Z",
  "picksCloseAt": "2024-10-27T18:00:00Z"
}
```

#### get_week_details
Get comprehensive information about a week including picks and scores:
```json
{
  "weekNumber": 5
}
```

#### delete_week
Delete a week and all associated data (use with caution):
```json
{
  "weekNumber": 5
}
```

### Scoring Operations

#### publish_weekly_scores
Publish castaway scores for a week and automatically calculate user points:
```json
{
  "weekNumber": 5,
  "scores": {
    "castaway-uuid-1": 100,
    "castaway-uuid-2": 75,
    "castaway-uuid-3": 60
  }
}
```

This operation:
1. Creates `WeeklyResult` entries for each castaway
2. Finds all `Pick` entries for that week
3. Calculates user scores by summing castaway points
4. Upserts `Score` records in the database

### Castaway Management

#### create_castaway
Add a new castaway to the league:
```json
{
  "name": "John Doe",
  "number": 14,
  "tribe": "Naviti",
  "occupation": "Chef",
  "age": 32,
  "hometown": "New York, NY",
  "imageUrl": "https://example.com/john.jpg"
}
```

#### update_castaway
Update castaway information:
```json
{
  "castawayId": "uuid-here",
  "name": "John Smith",
  "tribe": "Solewa",
  "occupation": "Retired Chef",
  "imageUrl": "https://example.com/new-photo.jpg"
}
```

#### eliminate_castaway
Mark a castaway as eliminated in a specific week:
```json
{
  "castawayId": "uuid-here",
  "eliminatedWeek": 7
}
```

#### restore_castaway
Restore an eliminated castaway back to active status:
```json
{
  "castawayId": "uuid-here"
}
```

#### delete_castaway
Permanently remove a castaway from the system:
```json
{
  "castawayId": "uuid-here"
}
```

#### get_castaway_results
Get all weekly results for a castaway across all weeks:
```json
{
  "castawayId": "uuid-here"
}
```

### User Management

#### create_user
Create a new league user:
```json
{
  "email": "player@example.com",
  "name": "Player Name",
  "isAdmin": false
}
```

#### update_user
Update user profile information:
```json
{
  "email": "player@example.com",
  "name": "Updated Name",
  "isAdmin": false
}
```

#### delete_user
Remove a user from the system:
```json
{
  "email": "player@example.com"
}
```

#### get_user_details
Get comprehensive user information and statistics:
```json
{
  "email": "player@example.com"
}
```

#### get_user_stats
Get advanced user statistics including performance metrics:
```json
{
  "email": "player@example.com"
}
```

#### reset_user_password
Generate a password reset token for a user:
```json
{
  "email": "player@example.com"
}
```

#### toggle_admin_status
Toggle admin privileges on or off for a user:
```json
{
  "email": "player@example.com"
}
```

### Pick Management

#### view_all_picks
View all picks across users and weeks:
```json
{
  "userId": "optional-uuid",
  "weekNumber": "optional-number"
}
```

#### delete_pick
Delete a specific user pick:
```json
{
  "userId": "uuid-here",
  "weekNumber": 5,
  "castawayId": "castaway-uuid"
}
```

#### auto_pick_users
Auto-assign picks for users who haven't submitted:
```json
{
  "weekNumber": 5,
  "strategy": "last-week"
}
```

### Ranking Management

#### view_rankings
View preseason draft rankings:
```json
{
  "limit": 50
}
```

#### submit_ranking
Submit or update a castaway draft ranking:
```json
{
  "castawayId": "uuid-here",
  "rank": 5
}
```

### League Management

#### get_league_config
Get current league configuration settings:
```json
{}
```

#### update_league_config
Update league settings:
```json
{
  "maxPlayers": 12,
  "scoringFormat": "ppr"
}
```

### Draft Management

#### get_draft_status
Get current draft status and progress:
```json
{}
```

#### view_draft_picks
View all draft picks:
```json
{
  "userId": "optional-uuid",
  "limit": 50
}
```

### Analytics

#### get_system_stats
Get system-wide statistics:
```json
{}
```

Returns total users, castaways, picks, weeks, and more.

#### get_castaway_popularity
Get castaway pick frequency analysis:
```json
{
  "weekNumber": "optional-number"
}
```

#### get_head_to_head
Get head-to-head matchup data between users:
```json
{
  "user1Email": "player1@example.com",
  "user2Email": "player2@example.com"
}
```

## Data Models

The server works with these core Prisma models:

- **User**: League members with authentication and preferences
- **Castaway**: Players in the Survivor season
- **Pick**: User's weekly castaway selections
- **Week**: Season structure and timing
- **Score**: User points earned per week
- **WeeklyResult**: Castaway points awarded per week
- **Ranking**: Preseason draft rankings
- **DraftPick**: Draft assignments
- **League**: League configuration

## Performance Considerations

- The standings and analytics resources perform aggregation queries
- For large datasets, consider caching results externally
- Scoring calculations are transactional for data consistency
- Database indexes are optimized for common queries

## Error Handling

The server handles common errors:
- Missing resources return descriptive error messages
- User/week not found responses are clear
- Upsert operations prevent duplicate entry errors
- All operations validate input before execution

## Development

### File Structure
```
mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
└── README.md
```

### Building and Testing

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development with watch mode
npm run dev

# Run compiled version
npm start
```

## Troubleshooting

**Module not found errors:**
- Ensure `.env` file is in the RGFL root directory
- Run `npm install` in the mcp-server directory
- Check that Prisma is properly configured

**Database connection errors:**
- Verify `DATABASE_URL` environment variable is set
- Check database credentials and network access
- Ensure Prisma migrations are up to date

**Tool execution fails:**
- Verify input JSON matches the schema
- Check that IDs are valid (exist in database)
- Review error messages for specific issues

## Future Enhancements

Potential additions:
- SMS notification tools
- Batch operations for efficiency
- Real-time updates via websockets
- Export functionality (CSV, JSON)
- Advanced filtering and search
- Custom report generation

## Support

For issues or feature requests related to the MCP server, refer to the main RGFL project documentation or contact the development team.
