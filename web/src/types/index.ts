/**
 * Centralized Type Definitions
 *
 * Shared types used across the frontend application.
 * Reduces duplication and ensures consistency.
 */

// ============================================================================
// User Types
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: 'player' | 'commissioner' | 'admin';
  avatar_url?: string;
  phone?: string;
  phone_verified?: boolean;
  notification_email?: boolean;
  notification_sms?: boolean;
  notification_push?: boolean;
  created_at?: string;
}

// ============================================================================
// Season Types
// ============================================================================

export interface Season {
  id: string;
  number: number;
  name: string;
  is_active: boolean;
  registration_opens_at: string;
  registration_closes_at: string;
  draft_order_deadline: string;
  draft_deadline: string;
  premiere_at: string;
  finale_at?: string;
}

// ============================================================================
// Episode Types
// ============================================================================

export interface Episode {
  id: string;
  season_id: string;
  number: number;
  week_number?: number;
  title?: string;
  air_date: string;
  picks_lock_at: string;
  results_posted_at?: string;
  is_scored: boolean;
  results_released_at?: string;
}

// ============================================================================
// Castaway Types
// ============================================================================

export type CastawayStatus = 'active' | 'eliminated' | 'winner';

export interface Castaway {
  id: string;
  season_id: string;
  name: string;
  age?: number;
  hometown?: string;
  occupation?: string;
  photo_url?: string;
  tribe_original?: string;
  tribe_current?: string;
  status: CastawayStatus;
  placement?: number;
  eliminated_episode_id?: string;
}

// ============================================================================
// League Types
// ============================================================================

export type LeagueStatus = 'pending' | 'active' | 'completed' | 'archived';
export type DraftStatus = 'pending' | 'in_progress' | 'completed';

export interface League {
  id: string;
  season_id: string;
  name: string;
  code: string;
  status: LeagueStatus;
  is_global: boolean;
  is_public: boolean;
  is_closed: boolean;
  commissioner_id: string;
  co_commissioners?: string[];
  max_players: number;
  require_donation: boolean;
  donation_amount?: number;
  donation_notes?: string;
  payout_method?: string;
  draft_status: DraftStatus;
  password_hash?: string;
  created_at?: string;
}

export interface LeagueMembership {
  league_id: string;
  user_id: string;
  total_points: number;
  rank: number | null;
  draft_position?: number;
  is_eliminated?: boolean;
  joined_at?: string;
  league?: League;
}

export interface LeagueWithSeason extends League {
  seasons?: Season;
}

// ============================================================================
// Roster & Pick Types
// ============================================================================

export interface RosterEntry {
  id: string;
  league_id: string;
  user_id: string;
  castaway_id: string;
  draft_position?: number;
  pick_number?: number;
  dropped_at?: string;
  castaway?: Castaway;
}

export type PickStatus = 'pending' | 'locked' | 'scored';

export interface WeeklyPick {
  id: string;
  league_id: string;
  user_id: string;
  episode_id: string;
  castaway_id: string;
  status: PickStatus;
  is_auto_pick?: boolean;
  picked_at?: string;
  points_earned?: number;
  castaway?: Castaway;
  episode?: Episode;
}

// ============================================================================
// Scoring Types
// ============================================================================

export interface ScoringRule {
  id: string;
  season_id: string;
  name: string;
  description?: string;
  category: string;
  points: number;
  is_active: boolean;
  sort_order?: number;
}

export interface EpisodeScore {
  id: string;
  episode_id: string;
  castaway_id: string;
  scoring_rule_id: string;
  count: number;
  points: number;
  created_at?: string;
}

export interface ScoringSession {
  id: string;
  episode_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  scores: Record<string, Record<string, number>>;
}

// ============================================================================
// Game Phase Types
// ============================================================================

export type GamePhase =
  | 'pre_registration'
  | 'registration'
  | 'pre_draft'
  | 'draft'
  | 'pre_season'
  | 'active'
  | 'post_season';

export type WeeklyPhase =
  | 'make_pick'
  | 'picks_locked'
  | 'awaiting_results'
  | 'results_posted';

export interface WeeklyPhaseInfo {
  phase: WeeklyPhase;
  label: string;
  description: string;
  ctaLabel: string;
  ctaPath: string;
  color: 'burgundy' | 'orange' | 'amber' | 'green' | 'blue';
  countdown?: { label: string; targetTime: Date };
}

// ============================================================================
// Payment Types
// ============================================================================

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  user_id: string;
  league_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  stripe_refund_id?: string;
  refunded_at?: string;
  created_at: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 'email' | 'sms' | 'push';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  subject: string;
  body: string;
  sent_at?: string;
  created_at: string;
}

// ============================================================================
// Admin/Stats Types
// ============================================================================

export interface DashboardStats {
  totalUsers: number;
  activeLeagues: number;
  totalPicks: number;
  activeCastaways: number;
}

export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  scheduler: 'running' | 'stopped';
  emailQueue: number;
  lastJobRun?: string;
}

// ============================================================================
// Notification Preferences Types
// ============================================================================

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  spoiler_delay_hours: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Legacy/Alias Types (for backward compatibility)
// ============================================================================

// Alias for components still using 'Roster' name
export type Roster = RosterEntry;

// Alias for LeagueMember
export type LeagueMember = LeagueMembership;
