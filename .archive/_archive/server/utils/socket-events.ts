/**
 * Socket.io event utilities for broadcasting to specific rooms
 */

import { io } from '../index.js';

/**
 * Event types for type-safe socket emissions
 */
export const SocketEvents = {
  // League events
  LEAGUE_UPDATED: 'league:updated',
  LEAGUE_MEMBER_JOINED: 'league:memberJoined',
  LEAGUE_MEMBER_LEFT: 'league:memberLeft',
  LEAGUE_STANDINGS_UPDATED: 'league:standingsUpdated',

  // Draft events
  DRAFT_STARTED: 'draft:started',
  DRAFT_PICK_MADE: 'draft:pickMade',
  DRAFT_COMPLETED: 'draft:completed',

  // Scoring events
  SCORES_UPDATED: 'scores:updated',
  WEEK_FINALIZED: 'week:finalized',

  // Global events
  LEADERBOARD_UPDATED: 'leaderboard:updated',
} as const;

export type SocketEvent = typeof SocketEvents[keyof typeof SocketEvents];

/**
 * Emit an event to a specific league room
 */
export function emitToLeague(leagueId: string, event: SocketEvent, data: unknown): void {
  io.to(`league:${leagueId}`).emit(event, data);
}

/**
 * Emit an event to the global leaderboard room
 */
export function emitToLeaderboard(event: SocketEvent, data: unknown): void {
  io.to('leaderboard').emit(event, data);
}

/**
 * Emit an event to all connected clients
 */
export function emitToAll(event: SocketEvent, data: unknown): void {
  io.emit(event, data);
}

/**
 * Emit league standings update to both league room and global leaderboard
 */
export function emitStandingsUpdate(leagueId: string, data: unknown): void {
  emitToLeague(leagueId, SocketEvents.LEAGUE_STANDINGS_UPDATED, data);
  emitToLeaderboard(SocketEvents.LEADERBOARD_UPDATED, { leagueId, ...data as object });
}

/**
 * Emit draft pick to league room
 */
export function emitDraftPick(leagueId: string, pick: {
  userId: string;
  userName: string;
  castawayId: string;
  castawayName: string;
  round: number;
  pickNumber: number;
}): void {
  emitToLeague(leagueId, SocketEvents.DRAFT_PICK_MADE, pick);
}

/**
 * Emit scores update to league room and leaderboard
 */
export function emitScoresUpdate(leagueId: string, weekNumber: number, scores: unknown): void {
  emitToLeague(leagueId, SocketEvents.SCORES_UPDATED, { weekNumber, scores });
  emitToLeaderboard(SocketEvents.LEADERBOARD_UPDATED, { leagueId, weekNumber });
}
