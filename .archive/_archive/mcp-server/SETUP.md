# RGFL MCP Server - Setup Guide

This guide walks you through setting up and configuring the RGFL custom MCP server for use with Claude Code.

## Step 1: Build the MCP Server

First, build the TypeScript code:

```bash
cd /Users/richard/Projects/RGFL/mcp-server
npm install
npm run build
```

You should see a `dist/` directory created with compiled JavaScript files.

## Step 2: Verify Database Configuration

Ensure your RGFL root directory has a `.env` file with the database URL:

```bash
cat /Users/richard/Projects/RGFL/.env | grep DATABASE_URL
```

Should output something like:
```
DATABASE_URL="postgresql://user:password@localhost:5432/rgfl_dev"
```

If using SQLite:
```
DATABASE_URL="file:./prisma/dev.db"
```

## Step 3: Add to Claude Code Configuration

Claude Code can be configured to use custom MCP servers. There are a few ways to do this:

### Option A: Via Claude Code Settings (Recommended)

1. In Claude Code, use the Settings command to access configuration
2. Look for the MCP servers section
3. Add a new server configuration:

```json
{
  "name": "rgfl",
  "command": "npm",
  "args": ["start"],
  "cwd": "/Users/richard/Projects/RGFL/mcp-server"
}
```

### Option B: Via Configuration File

If Claude Code uses a configuration file (typically in `~/.config/Claude\ Code/config.json` or similar):

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

### Option C: Via Environment

Set the following environment variables:

```bash
export RGFL_MCP_COMMAND="npm"
export RGFL_MCP_ARGS="start"
export RGFL_MCP_CWD="/Users/richard/Projects/RGFL/mcp-server"
```

## Step 4: Test the Connection

Once configured, test that Claude Code can connect to the RGFL MCP server:

```bash
# List available resources
mcp resource list rgfl

# Read a resource (e.g., all castaways)
mcp resource read rgfl rgfl://castaways

# Call a tool to get system stats
mcp tool call rgfl get_system_stats
```

You should see JSON responses for each command.

## Step 5: Start Using the MCP Server

Now you can use the RGFL MCP server in Claude Code. Examples:

**View the league standings:**
```
/resource rgfl://standings
```

**Check week 5 details:**
```
/tool get_week_details {"weekNumber": 5}
```

**Publish scores for week 5:**
```
/tool publish_weekly_scores {
  "weekNumber": 5,
  "scores": {
    "castaway-uuid-1": 100,
    "castaway-uuid-2": 75
  }
}
```

**Create a new castaway:**
```
/tool create_castaway {
  "name": "Jane Smith",
  "number": 15,
  "tribe": "Solewa",
  "occupation": "Doctor",
  "age": 28,
  "hometown": "Los Angeles, CA"
}
```

## Troubleshooting

### MCP server doesn't start

1. Check that Node.js is installed: `node --version`
2. Verify npm packages are installed: `ls /Users/richard/Projects/RGFL/mcp-server/node_modules`
3. Try running manually: `cd /Users/richard/Projects/RGFL/mcp-server && npm start`
4. Check for errors in the console

### Database connection errors

1. Verify `.env` file exists and has `DATABASE_URL`
2. Test database connection: `psql $DATABASE_URL -c "SELECT 1"`
3. Ensure Prisma is set up: `npx prisma db push` (from RGFL root)
4. Check database credentials are correct

### Resource not found errors

1. Ensure the URI is correct (e.g., `rgfl://standings`)
2. Check that data exists in the database
3. Look at the server logs for detailed errors

### Tool execution fails

1. Verify the tool name is correct
2. Check that input JSON matches the expected schema
3. Ensure all required parameters are provided
4. Review error messages in the console

## Development Mode

For development with auto-reload:

```bash
# Terminal 1: Start the MCP server in dev mode
cd /Users/richard/Projects/RGFL/mcp-server
npm run dev

# Terminal 2: Use Claude Code normally
# Changes to src/index.ts will automatically rebuild
```

## Production Deployment

For a production environment:

1. Build the project: `npm run build`
2. Use the compiled files: `npm start`
3. Set environment variables as needed
4. Monitor logs for errors
5. Consider using a process manager (PM2, systemd, etc.)

## Architecture Overview

```
Claude Code
    ↓
MCP Protocol
    ↓
RGFL MCP Server (Node.js)
    ↓
Prisma Client
    ↓
Database (PostgreSQL/SQLite)
    ↓
RGFL Data Models
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript |
| `npm run dev` | Start with auto-reload |
| `npm start` | Start compiled server |
| `npm install` | Install dependencies |

## What's Available

The MCP server provides:

### Resources (Read-Only Data)
- `rgfl://castaways` - All castaways
- `rgfl://users` - All users
- `rgfl://standings` - Current standings
- `rgfl://picks` - Weekly picks summary
- `rgfl://weeks` - Weekly schedule
- `rgfl://analytics/participation` - Engagement data
- `rgfl://analytics/power-rankings` - Power rankings

### Tools (Executable Actions)
- Week management (create, update, get details)
- Scoring operations (publish scores)
- Castaway management (create, eliminate, get results)
- User management (create, update, reset, delete)
- Analytics (system stats, user details)

## Advanced Usage

### Batch Operations

To perform multiple operations, create a script that calls the tools sequentially:

```bash
# Example: Publish scores and then check standings
mcp tool call rgfl publish_weekly_scores {...}
mcp resource read rgfl rgfl://standings
```

### Custom Analysis

Use resources to get data, then analyze:

```bash
# Get all castaways and pipe to analysis
mcp resource read rgfl rgfl://castaways | jq '.[] | select(.eliminated == true)'
```

### Monitoring

Check system health:

```bash
mcp tool call rgfl get_system_stats
mcp tool call rgfl get_week_details {"weekNumber": 1}
```

## Security Notes

- The MCP server uses the same database credentials as your RGFL app
- Ensure `.env` files are never committed to version control
- Restrict file permissions on configuration files
- Use strong database passwords in production
- Consider adding authentication layers for distributed access

## Next Steps

1. Start the MCP server: `npm start`
2. Configure Claude Code to use it
3. Test the resources and tools
4. Integrate with your workflow
5. Monitor and optimize as needed

For more details, see [README.md](./README.md).
