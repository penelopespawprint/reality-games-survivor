/**
 * WebSocket Service for Live Scoring
 *
 * Real-time updates during Survivor episodes
 * Skills: 5 (WebSocket implementation), 44 (Retention mechanics)
 *
 * Events:
 * - score:update - Live score changes
 * - castaway:eliminated - Elimination announcements
 * - picks:locked - Picks deadline reached
 * - leaderboard:update - Rankings changed
 */

import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api.config';
import { getAuthToken } from './api';

// Socket instance
let socket: Socket | null = null;

// Event callbacks
type EventCallback = (data: any) => void;
const eventListeners: Map<string, Set<EventCallback>> = new Map();

/**
 * Connect to WebSocket server
 */
export async function connect(): Promise<Socket | null> {
  if (socket?.connected) {
    console.log('ℹ️ Socket already connected');
    return socket;
  }

  const token = await getAuthToken();

  socket = io(API_CONFIG.BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('⚠️ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
  });

  // Forward events to registered listeners
  socket.onAny((event, data) => {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  });

  return socket;
}

/**
 * Disconnect from WebSocket server
 */
export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('✅ Socket disconnected');
  }
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Subscribe to an event
 */
export function on(event: string, callback: EventCallback): () => void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(callback);

  // Return unsubscribe function
  return () => {
    eventListeners.get(event)?.delete(callback);
  };
}

/**
 * Emit an event to server
 */
export function emit(event: string, data?: any): void {
  if (!socket?.connected) {
    console.warn('⚠️ Cannot emit - socket not connected');
    return;
  }
  socket.emit(event, data);
}

/**
 * Join a league room for updates
 */
export function joinLeague(leagueId: string): void {
  emit('league:join', { leagueId });
  console.log(`✅ Joined league room: ${leagueId}`);
}

/**
 * Leave a league room
 */
export function leaveLeague(leagueId: string): void {
  emit('league:leave', { leagueId });
  console.log(`✅ Left league room: ${leagueId}`);
}

// Event type definitions
export interface ScoreUpdate {
  castawayId: string;
  castawayName: string;
  points: number;
  weekNumber: number;
  reason: string;
}

export interface EliminationEvent {
  castawayId: string;
  castawayName: string;
  weekNumber: number;
}

export interface LeaderboardUpdate {
  leagueId: string;
  rankings: Array<{
    userId: string;
    userName: string;
    totalPoints: number;
    rank: number;
  }>;
}

// Convenience subscription methods
export const subscribeToScores = (callback: (data: ScoreUpdate) => void) =>
  on('score:update', callback);

export const subscribeToEliminations = (callback: (data: EliminationEvent) => void) =>
  on('castaway:eliminated', callback);

export const subscribeToLeaderboard = (callback: (data: LeaderboardUpdate) => void) =>
  on('leaderboard:update', callback);

export const subscribeToPicksLocked = (callback: (data: { weekNumber: number }) => void) =>
  on('picks:locked', callback);

export default {
  connect,
  disconnect,
  isConnected,
  on,
  emit,
  joinLeague,
  leaveLeague,
  subscribeToScores,
  subscribeToEliminations,
  subscribeToLeaderboard,
  subscribeToPicksLocked,
};
