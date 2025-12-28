/**
 * API Configuration for RGFL Mobile App
 *
 * Manages API endpoints for different environments:
 * - Local development: Connect to localhost backend
 * - Production: Connect to Render production API
 */

import { Platform } from 'react-native';

/**
 * API Base URL
 *
 * Always use production API for consistent testing.
 * To test against local backend, temporarily change to:
 *   return `http://${YOUR_IP}:5050`;
 */
const getApiUrl = (): string => {
  // Production server is live
  // For local development, change to: return 'http://YOUR_IP:5050';
  return 'https://www.realitygamesfantasyleague.com';
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  TIMEOUT: 10000, // 10 seconds

  // API Endpoints
  ENDPOINTS: {
    // Authentication (Auth0)
    AUTH0_SYNC: '/api/auth/auth0-sync',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    // Legacy endpoints (removed - using Auth0 now)
    // LOGIN: '/api/auth/login',
    // SIGNUP: '/api/auth/signup',
    // FORGOT_PASSWORD: '/api/auth/forgot-password',
    // RESET_PASSWORD: '/api/auth/reset-password',

    // User
    USER_ME: '/api/users/me',
    UPDATE_PROFILE: '/api/users/me',
    CHANGE_PASSWORD: '/api/users/me/password',
    USER_STATS: '/api/users/profile-stats',

    // Leagues - Core
    MY_LEAGUES: '/api/leagues/my-leagues',
    CREATE_LEAGUE: '/api/leagues',
    JOIN_LEAGUE: '/api/leagues/join',
    LEAVE_LEAGUE: '/api/leagues/leave',

    // Leagues - League-scoped endpoints (require leagueId)
    LEAGUE_DETAILS: (leagueId: string) => `/api/leagues/${leagueId}`,
    LEAGUE_STANDINGS: (leagueId: string) => `/api/leagues/${leagueId}/standings`,
    LEAGUE_MEMBERS: (leagueId: string) => `/api/leagues/${leagueId}/members`,
    LEAGUE_PICKS: (leagueId: string) => `/api/leagues/${leagueId}/picks`,

    // Picks - League-scoped
    MY_DRAFT: '/api/picks/my-draft',
    SUBMIT_DRAFT: '/api/picks/draft',
    MY_WEEKLY: '/api/picks/me',
    SUBMIT_WEEKLY: '/api/picks/me',
    WEEK_PICKS: (weekNum: number) => `/api/picks/week/${weekNum}`,

    // Rankings
    MY_RANKINGS: '/api/rankings/me',
    SUBMIT_RANKINGS: '/api/rankings/me',

    // Weeks
    WEEKS: '/api/weeks',
    ACTIVE_WEEK: '/api/weeks/active',

    // Leaderboard
    LEAGUE_LEADERBOARD: '/api/league',
    GLOBAL_LEADERBOARD: '/api/global/leaderboard',
    GLOBAL_STANDINGS: '/api/global/standings',
    GLOBAL_STATS: '/api/global/stats',

    // Castaways
    CASTAWAYS: '/api/castaways',
    CASTAWAY_DETAIL: (id: string) => `/api/castaways/${id}`,
    CASTAWAY_OWNER: (id: string) => `/api/castaways/${id}/owner`,

    // Admin endpoints
    ADMIN_LEAGUES: '/api/admin/leagues',
    ADMIN_USERS: '/api/admin/users',
    ADMIN_WEEKS: '/api/admin/weeks',
    ADMIN_WEEKS_ACTIVE: '/api/admin/weeks/active',
    ADMIN_SCORING: (weekNum: number) => `/api/admin/scoring/week/${weekNum}`,
    ADMIN_SCORING_PUBLISH: '/api/admin/scoring/publish',
    ADMIN_CASTAWAYS: '/api/admin/castaways',
    ADMIN_CASTAWAY: (id: string) => `/api/admin/castaway/${id}`,
    ADMIN_STATS: '/api/admin/stats',
    ADMIN_ANALYTICS: '/api/admin/analytics',
  },
};

/**
 * Get the full API URL for an endpoint
 */
export const getFullApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = (): boolean => {
  return __DEV__;
};

/**
 * Log API configuration (useful for debugging)
 */
export const logApiConfig = (): void => {
  if (__DEV__) {
    console.log('=== API Configuration ===');
    console.log('Base URL:', API_CONFIG.BASE_URL);
    console.log('Platform:', Platform.OS);
    console.log('Environment:', __DEV__ ? 'Development' : 'Production');
    console.log('========================');
  }
};
