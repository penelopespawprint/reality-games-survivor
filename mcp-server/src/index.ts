#!/usr/bin/env node
/**
 * RGFL MCP Server
 *
 * Model Context Protocol server for Reality Games Fantasy League - Survivor.
 * Provides AI assistants with access to game data and admin operations.
 */

import * as Sentry from '@sentry/node';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import 'dotenv/config';

// Initialize Sentry
const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
  });
}

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Create MCP server
const server = new McpServer({
  name: 'rgfl-survivor',
  version: '1.0.0',
});

// Wrap with Sentry if available
const wrappedServer = sentryDsn ? Sentry.wrapMcpServerWithSentry(server) : server;

// Helper to get active season
async function getActiveSeason() {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true)
    .single();
  
  if (error) throw new Error(`No active season: ${error.message}`);
  return data;
}

// ============================================
// RESOURCES - Read-only data access
// ============================================

// Resource: Active Season
server.resource(
  'season/active',
  'season://active',
  async (uri) => {
    const data = await getActiveSeason();
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
);

// Resource: All Castaways for Active Season
server.resource(
  'castaways/active',
  'castaways://active',
  async (uri) => {
    const season = await getActiveSeason();
    const { data, error } = await supabase
      .from('castaways')
      .select('id, name, tribe_original, tribe_current, status, occupation, hometown, age, photo_url')
      .eq('season_id', season.id)
      .order('name');

    if (error) throw new Error(`Failed to fetch castaways: ${error.message}`);

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
);

// Resource: Episodes for Active Season
server.resource(
  'episodes/active',
  'episodes://active',
  async (uri) => {
    const season = await getActiveSeason();
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', season.id)
      .order('number');

    if (error) throw new Error(`Failed to fetch episodes: ${error.message}`);

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
);

// Resource: Leagues Overview
server.resource(
  'leagues/overview',
  'leagues://overview',
  async (uri) => {
    const season = await getActiveSeason();
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, code, is_public, max_members, draft_status, created_at')
      .eq('season_id', season.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch leagues: ${error.message}`);

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
);

// Resource: Announcements
server.resource(
  'announcements/all',
  'announcements://all',
  async (uri) => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch announcements: ${error.message}`);

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
);

// Resource: Scoring Rules
server.resource(
  'scoring-rules/all',
  'scoring-rules://all',
  async (uri) => {
    const { data, error } = await supabase
      .from('scoring_rules')
      .select('*')
      .order('category')
      .order('name');

    if (error) throw new Error(`Failed to fetch scoring rules: ${error.message}`);

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
);

// Resource: Email Queue Status
server.resource(
  'email-queue/status',
  'email-queue://status',
  async (uri) => {
    const [pending, failed] = await Promise.all([
      supabase.from('email_queue').select('*', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('failed_emails').select('*', { count: 'exact' }),
    ]);

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({
          pendingCount: pending.count || 0,
          failedCount: failed.count || 0,
          pendingEmails: pending.data?.slice(0, 10) || [],
          recentFailed: failed.data?.slice(0, 10) || [],
        }, null, 2),
      }],
    };
  }
);

// Resource: Recent User Signups
server.resource(
  'users/recent',
  'users://recent',
  async (uri) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw new Error(`Failed to fetch users: ${error.message}`);

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
);

// ============================================
// TOOLS - User Management
// ============================================

server.tool(
  'get_user',
  'Get a user profile by ID or email',
  {
    identifier: z.string().describe('User ID (UUID) or email address'),
  },
  async ({ identifier }) => {
    const isEmail = identifier.includes('@');
    
    const query = supabase
      .from('users')
      .select('*');
    
    const { data, error } = isEmail
      ? await query.eq('email', identifier).single()
      : await query.eq('id', identifier).single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    // Get league memberships
    const { data: memberships } = await supabase
      .from('league_members')
      .select('league_id, total_points, rank, leagues(name, code)')
      .eq('user_id', data.id);

    return {
      content: [{ type: 'text', text: JSON.stringify({ user: data, memberships }, null, 2) }],
    };
  }
);

server.tool(
  'search_users',
  'Search for users by display name or email',
  {
    query: z.string().describe('Search query'),
    limit: z.number().default(10).describe('Maximum results'),
  },
  async ({ query, limit }) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, role, created_at')
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `Found ${data.length} users:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

server.tool(
  'update_user_role',
  'Update a user\'s role (player, commissioner, admin)',
  {
    user_id: z.string().uuid().describe('User ID'),
    role: z.enum(['player', 'commissioner', 'admin']).describe('New role'),
  },
  async ({ user_id, role }) => {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', user_id)
      .select()
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `User role updated to ${role}:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

server.tool(
  'delete_user',
  'Delete a user and all their data (DANGEROUS - use with caution)',
  {
    user_id: z.string().uuid().describe('User ID to delete'),
    confirm: z.literal(true).describe('Must be true to confirm deletion'),
  },
  async ({ user_id, confirm }) => {
    if (!confirm) {
      return { content: [{ type: 'text', text: 'Error: Must confirm deletion' }], isError: true };
    }

    // Delete from league_members first (cascade should handle this, but be explicit)
    await supabase.from('league_members').delete().eq('user_id', user_id);
    await supabase.from('rosters').delete().eq('user_id', user_id);
    await supabase.from('weekly_picks').delete().eq('user_id', user_id);
    await supabase.from('draft_rankings').delete().eq('user_id', user_id);
    await supabase.from('notification_preferences').delete().eq('user_id', user_id);
    
    const { error } = await supabase.from('users').delete().eq('id', user_id);

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `User ${user_id} deleted successfully` }],
    };
  }
);

// ============================================
// TOOLS - League Management
// ============================================

server.tool(
  'get_league',
  'Get detailed league information including members',
  {
    league_id: z.string().uuid().describe('League ID'),
  },
  async ({ league_id }) => {
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select(`*, commissioner:users!leagues_commissioner_id_fkey(id, display_name, email)`)
      .eq('id', league_id)
      .single();

    if (leagueError) {
      return { content: [{ type: 'text', text: `Error: ${leagueError.message}` }], isError: true };
    }

    const { data: members } = await supabase
      .from('league_members')
      .select(`user_id, total_points, rank, eliminated_at, users(display_name, email)`)
      .eq('league_id', league_id)
      .order('rank');

    return {
      content: [{ type: 'text', text: JSON.stringify({ league, members }, null, 2) }],
    };
  }
);

server.tool(
  'update_league',
  'Update league settings',
  {
    league_id: z.string().uuid().describe('League ID'),
    name: z.string().optional().describe('New league name'),
    is_public: z.boolean().optional().describe('Make league public/private'),
    max_members: z.number().optional().describe('Maximum members'),
    draft_status: z.enum(['pending', 'in_progress', 'completed']).optional().describe('Draft status'),
  },
  async ({ league_id, ...updates }) => {
    const updateData = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(updateData).length === 0) {
      return { content: [{ type: 'text', text: 'Error: No updates provided' }], isError: true };
    }

    const { data, error } = await supabase
      .from('leagues')
      .update(updateData)
      .eq('id', league_id)
      .select()
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `League updated:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

server.tool(
  'delete_league',
  'Delete a league and all associated data',
  {
    league_id: z.string().uuid().describe('League ID'),
    confirm: z.literal(true).describe('Must be true to confirm deletion'),
  },
  async ({ league_id, confirm }) => {
    if (!confirm) {
      return { content: [{ type: 'text', text: 'Error: Must confirm deletion' }], isError: true };
    }

    const { error } = await supabase.from('leagues').delete().eq('id', league_id);

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `League ${league_id} deleted successfully` }],
    };
  }
);

server.tool(
  'remove_league_member',
  'Remove a member from a league',
  {
    league_id: z.string().uuid().describe('League ID'),
    user_id: z.string().uuid().describe('User ID to remove'),
  },
  async ({ league_id, user_id }) => {
    // Delete rosters first
    await supabase.from('rosters').delete().eq('league_id', league_id).eq('user_id', user_id);
    await supabase.from('weekly_picks').delete().eq('league_id', league_id).eq('user_id', user_id);
    
    const { error } = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', league_id)
      .eq('user_id', user_id);

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `User ${user_id} removed from league ${league_id}` }],
    };
  }
);

// ============================================
// TOOLS - Castaway Management
// ============================================

server.tool(
  'get_castaway',
  'Get castaway details with scoring stats',
  {
    castaway_id: z.string().uuid().describe('Castaway ID'),
  },
  async ({ castaway_id }) => {
    const { data: castaway, error } = await supabase
      .from('castaways')
      .select('*')
      .eq('id', castaway_id)
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    const { data: scores } = await supabase
      .from('episode_scores')
      .select(`episode_id, points, episodes(number, title)`)
      .eq('castaway_id', castaway_id);

    const totalPoints = scores?.reduce((sum, s) => sum + (s.points || 0), 0) || 0;

    return {
      content: [{ type: 'text', text: JSON.stringify({ castaway, totalPoints, scores }, null, 2) }],
    };
  }
);

server.tool(
  'update_castaway',
  'Update castaway information',
  {
    castaway_id: z.string().uuid().describe('Castaway ID'),
    name: z.string().optional().describe('Castaway name'),
    tribe_original: z.string().optional().describe('Original tribe'),
    tribe_current: z.string().optional().describe('Current tribe'),
    status: z.enum(['active', 'eliminated', 'winner']).optional().describe('Status'),
    placement: z.number().optional().describe('Final placement'),
    occupation: z.string().optional().describe('Occupation'),
    hometown: z.string().optional().describe('Hometown'),
    age: z.number().optional().describe('Age'),
    photo_url: z.string().optional().describe('Photo URL'),
  },
  async ({ castaway_id, ...updates }) => {
    const updateData = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(updateData).length === 0) {
      return { content: [{ type: 'text', text: 'Error: No updates provided' }], isError: true };
    }

    const { data, error } = await supabase
      .from('castaways')
      .update(updateData)
      .eq('id', castaway_id)
      .select()
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `Castaway updated:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

server.tool(
  'eliminate_castaway',
  'Mark a castaway as eliminated with placement',
  {
    castaway_id: z.string().uuid().describe('Castaway ID'),
    placement: z.number().describe('Final placement (e.g., 18 for 18th place)'),
    episode_number: z.number().optional().describe('Episode number of elimination'),
  },
  async ({ castaway_id, placement, episode_number }) => {
    const updateData: Record<string, any> = {
      status: 'eliminated',
      placement,
    };

    if (episode_number) {
      const season = await getActiveSeason();
      const { data: episode } = await supabase
        .from('episodes')
        .select('id')
        .eq('season_id', season.id)
        .eq('number', episode_number)
        .single();
      
      if (episode) {
        updateData.eliminated_episode_id = episode.id;
      }
    }

    const { data, error } = await supabase
      .from('castaways')
      .update(updateData)
      .eq('id', castaway_id)
      .select()
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `Castaway eliminated:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

server.tool(
  'create_castaway',
  'Create a new castaway for the active season',
  {
    name: z.string().describe('Castaway name'),
    tribe_original: z.string().describe('Original tribe'),
    occupation: z.string().optional().describe('Occupation'),
    hometown: z.string().optional().describe('Hometown'),
    age: z.number().optional().describe('Age'),
    photo_url: z.string().optional().describe('Photo URL'),
  },
  async ({ name, tribe_original, occupation, hometown, age, photo_url }) => {
    const season = await getActiveSeason();

    const { data, error } = await supabase
      .from('castaways')
      .insert({
        season_id: season.id,
        name,
        tribe_original,
        tribe_current: tribe_original,
        status: 'active',
        occupation,
        hometown,
        age,
        photo_url,
      })
      .select()
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `Castaway created:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

// ============================================
// TOOLS - Episode Management
// ============================================

server.tool(
  'get_episode',
  'Get episode details with scoring events',
  {
    episode_number: z.number().describe('Episode number'),
  },
  async ({ episode_number }) => {
    const season = await getActiveSeason();
    
    const { data: episode, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', season.id)
      .eq('number', episode_number)
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    const { data: scores } = await supabase
      .from('episode_scores')
      .select(`castaway_id, points, castaways(name)`)
      .eq('episode_id', episode.id)
      .order('points', { ascending: false });

    return {
      content: [{ type: 'text', text: JSON.stringify({ episode, scores }, null, 2) }],
    };
  }
);

server.tool(
  'create_episode',
  'Create a new episode for the active season',
  {
    number: z.number().describe('Episode number'),
    title: z.string().describe('Episode title'),
    air_date: z.string().describe('Air date (YYYY-MM-DD)'),
  },
  async ({ number, title, air_date }) => {
    const season = await getActiveSeason();

    const { data, error } = await supabase
      .from('episodes')
      .insert({
        season_id: season.id,
        number,
        title,
        air_date,
        is_scored: false,
      })
      .select()
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `Episode created:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

server.tool(
  'update_episode',
  'Update episode information',
  {
    episode_number: z.number().describe('Episode number'),
    title: z.string().optional().describe('Episode title'),
    air_date: z.string().optional().describe('Air date'),
    is_scored: z.boolean().optional().describe('Whether scoring is complete'),
  },
  async ({ episode_number, ...updates }) => {
    const season = await getActiveSeason();
    
    const updateData = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from('episodes')
      .update(updateData)
      .eq('season_id', season.id)
      .eq('number', episode_number)
      .select()
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `Episode updated:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

// ============================================
// TOOLS - Announcement Management
// ============================================

server.tool(
  'create_announcement',
  'Create a new announcement',
  {
    title: z.string().describe('Announcement title'),
    content: z.string().describe('Announcement content'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('Priority'),
    expires_at: z.string().optional().describe('Expiration date (ISO 8601)'),
  },
  async ({ title, content, priority, expires_at }) => {
    const { data, error } = await supabase
      .from('announcements')
      .insert({ title, content, priority, is_active: true, expires_at: expires_at || null })
      .select()
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `Announcement created:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

server.tool(
  'update_announcement',
  'Update an announcement',
  {
    announcement_id: z.string().uuid().describe('Announcement ID'),
    title: z.string().optional().describe('Title'),
    content: z.string().optional().describe('Content'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Priority'),
    is_active: z.boolean().optional().describe('Active status'),
    expires_at: z.string().optional().describe('Expiration date'),
  },
  async ({ announcement_id, ...updates }) => {
    const updateData = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', announcement_id)
      .select()
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `Announcement updated:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

server.tool(
  'delete_announcement',
  'Delete an announcement',
  {
    announcement_id: z.string().uuid().describe('Announcement ID'),
  },
  async ({ announcement_id }) => {
    const { error } = await supabase.from('announcements').delete().eq('id', announcement_id);

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `Announcement ${announcement_id} deleted` }],
    };
  }
);

// ============================================
// TOOLS - Scoring Management
// ============================================

server.tool(
  'add_score',
  'Add a scoring event for a castaway in an episode',
  {
    episode_number: z.number().describe('Episode number'),
    castaway_name: z.string().describe('Castaway name'),
    points: z.number().describe('Points to add'),
    reason: z.string().optional().describe('Reason for the score'),
  },
  async ({ episode_number, castaway_name, points, reason }) => {
    const season = await getActiveSeason();
    
    // Get episode
    const { data: episode } = await supabase
      .from('episodes')
      .select('id')
      .eq('season_id', season.id)
      .eq('number', episode_number)
      .single();

    if (!episode) {
      return { content: [{ type: 'text', text: `Error: Episode ${episode_number} not found` }], isError: true };
    }

    // Get castaway
    const { data: castaway } = await supabase
      .from('castaways')
      .select('id')
      .eq('season_id', season.id)
      .ilike('name', `%${castaway_name}%`)
      .single();

    if (!castaway) {
      return { content: [{ type: 'text', text: `Error: Castaway "${castaway_name}" not found` }], isError: true };
    }

    // Upsert score
    const { data, error } = await supabase
      .from('episode_scores')
      .upsert({
        episode_id: episode.id,
        castaway_id: castaway.id,
        points,
        notes: reason,
      }, { onConflict: 'episode_id,castaway_id' })
      .select()
      .single();

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: `Score added:\n${JSON.stringify(data, null, 2)}` }],
    };
  }
);

server.tool(
  'get_scoring_rules',
  'Get all scoring rules, optionally filtered by category',
  {
    category: z.string().optional().describe('Filter by category'),
  },
  async ({ category }) => {
    let query = supabase.from('scoring_rules').select('*').order('category').order('points', { ascending: false });
    
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ============================================
// TOOLS - Dashboard & Stats
// ============================================

server.tool(
  'get_dashboard_stats',
  'Get overall dashboard statistics',
  {},
  async () => {
    const season = await getActiveSeason();

    const [users, leagues, castaways, episodes, announcements] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('leagues').select('id', { count: 'exact', head: true }).eq('season_id', season.id),
      supabase.from('castaways').select('id', { count: 'exact', head: true }).eq('season_id', season.id),
      supabase.from('episodes').select('id', { count: 'exact', head: true }).eq('season_id', season.id).eq('is_scored', true),
      supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    const { data: activeCastaways } = await supabase
      .from('castaways')
      .select('id', { count: 'exact', head: true })
      .eq('season_id', season.id)
      .eq('status', 'active');

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          season,
          totalUsers: users.count || 0,
          totalLeagues: leagues.count || 0,
          totalCastaways: castaways.count || 0,
          activeCastaways: activeCastaways?.count || 0,
          episodesScored: episodes.count || 0,
          activeAnnouncements: announcements.count || 0,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_leaderboard',
  'Get league leaderboard',
  {
    league_id: z.string().uuid().describe('League ID'),
  },
  async ({ league_id }) => {
    const { data, error } = await supabase
      .from('league_members')
      .select(`
        user_id,
        total_points,
        rank,
        eliminated_at,
        users(display_name)
      `)
      .eq('league_id', league_id)
      .order('total_points', { ascending: false });

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ============================================
// TOOLS - Email Queue Management
// ============================================

server.tool(
  'get_email_queue',
  'Get pending and failed emails',
  {
    status: z.enum(['pending', 'failed', 'all']).default('all').describe('Filter by status'),
    limit: z.number().default(20).describe('Maximum results'),
  },
  async ({ status, limit }) => {
    let pending: any[] = [];
    let failed: any[] = [];

    if (status === 'pending' || status === 'all') {
      const { data } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(limit);
      pending = data || [];
    }

    if (status === 'failed' || status === 'all') {
      const { data } = await supabase
        .from('failed_emails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      failed = data || [];
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ pending, failed }, null, 2) }],
    };
  }
);

server.tool(
  'retry_failed_email',
  'Retry a failed email by moving it back to the queue',
  {
    failed_email_id: z.string().uuid().describe('Failed email ID'),
  },
  async ({ failed_email_id }) => {
    const { data: failedEmail, error: fetchError } = await supabase
      .from('failed_emails')
      .select('*')
      .eq('id', failed_email_id)
      .single();

    if (fetchError || !failedEmail) {
      return { content: [{ type: 'text', text: `Error: Failed email not found` }], isError: true };
    }

    // Add back to queue
    const { error: insertError } = await supabase.from('email_queue').insert({
      to_email: failedEmail.to_email,
      subject: failedEmail.subject,
      html_content: failedEmail.html_content,
      text_content: failedEmail.text_content,
      status: 'pending',
    });

    if (insertError) {
      return { content: [{ type: 'text', text: `Error: ${insertError.message}` }], isError: true };
    }

    // Delete from failed
    await supabase.from('failed_emails').delete().eq('id', failed_email_id);

    return {
      content: [{ type: 'text', text: `Email requeued for ${failedEmail.to_email}` }],
    };
  }
);

// ============================================
// TOOLS - SQL Query (Read-only)
// ============================================

server.tool(
  'run_query',
  'Run a read-only SQL query (SELECT only)',
  {
    sql: z.string().describe('SQL SELECT query'),
  },
  async ({ sql }) => {
    const trimmedSql = sql.trim().toLowerCase();
    if (!trimmedSql.startsWith('select')) {
      return { content: [{ type: 'text', text: 'Error: Only SELECT queries allowed' }], isError: true };
    }

    const dangerous = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate', 'grant', 'revoke'];
    for (const keyword of dangerous) {
      if (trimmedSql.includes(keyword)) {
        return { content: [{ type: 'text', text: `Error: Forbidden keyword: ${keyword}` }], isError: true };
      }
    }

    const { data, error } = await supabase.rpc('execute_readonly_query', { query_text: sql });

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ============================================
// PROMPTS - Reusable templates
// ============================================

server.prompt(
  'analyze_league',
  'Analyze a league\'s performance',
  { league_id: z.string().uuid().describe('League ID') },
  async ({ league_id }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Analyze league ${league_id}. Use get_league to fetch details, then provide insights on:
1. Member engagement and activity
2. Point distribution
3. Draft strategy effectiveness
4. Recommendations for the commissioner`,
      },
    }],
  })
);

server.prompt(
  'weekly_recap',
  'Generate a weekly recap',
  {},
  async () => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Generate a weekly recap for the Survivor Fantasy League:
1. Summarize latest episode results
2. Highlight top performers
3. Note leaderboard changes
4. Preview next week

Make it engaging and fun!`,
      },
    }],
  })
);

server.prompt(
  'admin_report',
  'Generate an admin status report',
  {},
  async () => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Generate an admin status report. Use get_dashboard_stats and other tools to:
1. Summarize current season status
2. Report on user growth and engagement
3. Check email queue status
4. List active announcements
5. Identify any issues or concerns`,
      },
    }],
  })
);

server.prompt(
  'scoring_audit',
  'Audit scoring for an episode',
  { episode_number: z.number().describe('Episode number') },
  async ({ episode_number }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Audit the scoring for episode ${episode_number}:
1. Get episode details and all scores
2. Compare against scoring rules
3. Identify any missing or incorrect scores
4. Suggest corrections if needed`,
      },
    }],
  })
);

// ============================================
// START SERVER
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await wrappedServer.connect(transport);
  console.error('RGFL MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  Sentry.captureException(error);
  process.exit(1);
});
