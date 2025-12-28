/**
 * SMS Command Handlers
 *
 * Processes incoming SMS commands from users via Twilio webhook.
 * Each command handler returns a response string.
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { EmailService } from '../../emails/index.js';

export interface SmsContext {
  phone: string;
  userId: string | null;
  rawMessage: string;
  command: string;
  args: string[];
}

export interface SmsResult {
  response: string;
  parsedData: Record<string, unknown>;
}

// ============================================================================
// STOP/UNSUBSCRIBE Commands (FCC/TCPA Compliance)
// ============================================================================

export async function handleStop(ctx: SmsContext): Promise<SmsResult> {
  const parsedData: Record<string, unknown> = { command: ctx.command, args: ctx.args };

  if (!ctx.userId) {
    return {
      response: "You've been unsubscribed from RGFL SMS. Reply START to resubscribe or visit rgfl.app to manage preferences.",
      parsedData: { ...parsedData, compliance_action: 'unsubscribe_no_user' },
    };
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ notification_sms: false })
    .eq('id', ctx.userId);

  if (updateError) {
    console.error('Failed to update SMS preference:', updateError);
    return {
      response: 'Error processing unsubscribe request. Please try again or contact support.',
      parsedData: { ...parsedData, compliance_action: 'unsubscribe_failed', error: updateError.message },
    };
  }

  await EmailService.logNotification(
    ctx.userId,
    'sms',
    'SMS Unsubscribe',
    `User unsubscribed via ${ctx.command} command`
  );

  return {
    response: "You've been unsubscribed from RGFL SMS. Reply START to resubscribe or visit rgfl.app to manage preferences.",
    parsedData: { ...parsedData, compliance_action: 'unsubscribe_success' },
  };
}

// ============================================================================
// START/SUBSCRIBE Commands
// ============================================================================

export async function handleStart(ctx: SmsContext): Promise<SmsResult> {
  const parsedData: Record<string, unknown> = { command: ctx.command, args: ctx.args };

  if (!ctx.userId) {
    return {
      response: 'Phone not registered. Visit rgfl.app to link your phone and enable SMS notifications.',
      parsedData: { ...parsedData, compliance_action: 'subscribe_no_user' },
    };
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ notification_sms: true })
    .eq('id', ctx.userId);

  if (updateError) {
    console.error('Failed to update SMS preference:', updateError);
    return {
      response: 'Error processing subscribe request. Please try again or contact support.',
      parsedData: { ...parsedData, compliance_action: 'subscribe_failed', error: updateError.message },
    };
  }

  await EmailService.logNotification(
    ctx.userId,
    'sms',
    'SMS Subscribe',
    `User subscribed via ${ctx.command} command`
  );

  return {
    response: "You've been subscribed to RGFL SMS notifications. Text STOP to unsubscribe anytime.",
    parsedData: { ...parsedData, compliance_action: 'subscribe_success' },
  };
}

// ============================================================================
// PICK Command
// ============================================================================

export async function handlePick(ctx: SmsContext): Promise<SmsResult> {
  const parsedData: Record<string, unknown> = { command: ctx.command, args: ctx.args };

  if (!ctx.userId) {
    return {
      response: 'Phone not registered. Visit rgfl.app to link your phone.',
      parsedData,
    };
  }

  const castawayName = ctx.args.join(' ');
  if (!castawayName) {
    return {
      response: 'Usage: PICK [castaway name]',
      parsedData,
    };
  }

  // Find castaway
  const { data: castaway } = await supabaseAdmin
    .from('castaways')
    .select('id, name')
    .ilike('name', `%${castawayName}%`)
    .eq('status', 'active')
    .single();

  if (!castaway) {
    return {
      response: `Castaway "${castawayName}" not found or eliminated.`,
      parsedData,
    };
  }

  parsedData.castaway = castaway;

  // Get user's leagues
  const { data: memberships } = await supabaseAdmin
    .from('league_members')
    .select('league_id')
    .eq('user_id', ctx.userId);

  if (!memberships || memberships.length === 0) {
    return {
      response: 'You are not in any leagues.',
      parsedData,
    };
  }

  // Get current episode
  const { data: episode } = await supabaseAdmin
    .from('episodes')
    .select('id, number, picks_lock_at')
    .gte('picks_lock_at', new Date().toISOString())
    .order('picks_lock_at', { ascending: true })
    .limit(1)
    .single();

  if (!episode) {
    return {
      response: 'No episode currently accepting picks.',
      parsedData,
    };
  }

  // Submit picks for all leagues where user has castaway on roster
  let pickCount = 0;
  for (const membership of memberships) {
    const { data: roster } = await supabaseAdmin
      .from('rosters')
      .select('id')
      .eq('league_id', membership.league_id)
      .eq('user_id', ctx.userId)
      .eq('castaway_id', castaway.id)
      .is('dropped_at', null)
      .single();

    if (roster) {
      await supabaseAdmin
        .from('weekly_picks')
        .upsert({
          league_id: membership.league_id,
          user_id: ctx.userId,
          episode_id: episode.id,
          castaway_id: castaway.id,
          status: 'pending',
          picked_at: new Date().toISOString(),
        }, {
          onConflict: 'league_id,user_id,episode_id',
        });
      pickCount++;
    }
  }

  return {
    response: `Picked ${castaway.name} for Episode ${episode.number} in ${pickCount} league(s).`,
    parsedData: { ...parsedData, pickCount, episodeNumber: episode.number },
  };
}

// ============================================================================
// STATUS Command
// ============================================================================

export async function handleStatus(ctx: SmsContext): Promise<SmsResult> {
  const parsedData: Record<string, unknown> = { command: ctx.command, args: ctx.args };

  if (!ctx.userId) {
    return {
      response: 'Phone not registered. Visit rgfl.app to link your phone.',
      parsedData,
    };
  }

  const { data: picks } = await supabaseAdmin
    .from('weekly_picks')
    .select('castaways(name), leagues(name)')
    .eq('user_id', ctx.userId)
    .order('picked_at', { ascending: false })
    .limit(5);

  if (!picks || picks.length === 0) {
    return {
      response: 'No recent picks found.',
      parsedData,
    };
  }

  const response = 'Recent picks:\n' + picks.map((p: any) =>
    `${p.castaways?.name} - ${p.leagues?.name}`
  ).join('\n');

  return { response, parsedData: { ...parsedData, pickCount: picks.length } };
}

// ============================================================================
// TEAM Command
// ============================================================================

export async function handleTeam(ctx: SmsContext): Promise<SmsResult> {
  const parsedData: Record<string, unknown> = { command: ctx.command, args: ctx.args };

  if (!ctx.userId) {
    return {
      response: 'Phone not registered. Visit rgfl.app to link your phone.',
      parsedData,
    };
  }

  const { data: rosters } = await supabaseAdmin
    .from('rosters')
    .select('castaways(name, status), leagues(name)')
    .eq('user_id', ctx.userId)
    .is('dropped_at', null);

  if (!rosters || rosters.length === 0) {
    return {
      response: 'No castaways on roster.',
      parsedData,
    };
  }

  const response = 'Your team:\n' + rosters.map((r: any) =>
    `${r.castaways?.name} (${r.castaways?.status}) - ${r.leagues?.name}`
  ).join('\n');

  return { response, parsedData: { ...parsedData, rosterCount: rosters.length } };
}

// ============================================================================
// HELP Command
// ============================================================================

export function handleHelp(ctx: SmsContext): SmsResult {
  return {
    response: 'RGFL SMS Commands:\n\nPICK [name] - Pick castaway\nSTATUS - View picks\nTEAM - View roster\nSTOP - Unsubscribe\nSTART - Resubscribe\nHELP - Show this message',
    parsedData: { command: ctx.command, args: ctx.args },
  };
}

// ============================================================================
// Command Router
// ============================================================================

export async function processSmsCommand(ctx: SmsContext): Promise<SmsResult> {
  switch (ctx.command) {
    case 'STOP':
    case 'UNSUBSCRIBE':
    case 'CANCEL':
    case 'END':
    case 'QUIT':
      return handleStop(ctx);

    case 'START':
    case 'SUBSCRIBE':
    case 'UNSTOP':
      return handleStart(ctx);

    case 'PICK':
      return handlePick(ctx);

    case 'STATUS':
      return handleStatus(ctx);

    case 'TEAM':
      return handleTeam(ctx);

    case 'HELP':
      return handleHelp(ctx);

    default:
      return {
        response: 'Unknown command. Text HELP for options.',
        parsedData: { command: ctx.command, args: ctx.args },
      };
  }
}
