/**
 * Centralized Hook Exports
 *
 * All shared React Query hooks exported from a single location.
 * Usage: import { useCurrentUser, useActiveSeason, ... } from '@/lib/hooks';
 */

// User hooks
export {
  useCurrentUser,
  useUserProfile,
  useNotificationPreferences,
} from './useUser';

// Season hooks
export {
  useActiveSeason,
  useSeasons,
  useSeason,
} from './useSeasons';

// Episode hooks
export {
  useEpisodes,
  useNextEpisode,
  useCurrentEpisode,
  useEpisode,
  usePreviousEpisode,
} from './useEpisodes';

// Castaway hooks
export {
  useCastaways,
  useActiveCastaways,
  useCastaway,
  useEliminatedCastaways,
} from './useCastaways';

// League hooks
export {
  useMyLeagues,
  useLeague,
  useLeagueMembers,
  useLeagueMembership,
  useGlobalLeague,
} from './useLeagues';

// Roster hooks
export {
  useRoster,
  useLeagueRosters,
  useMyRosters,
  useRosterComplete,
} from './useRosters';

// Scoring hooks
export {
  useScoringRules,
  useScoringRulesByCategory,
  useEpisodeScores,
  useEpisodeCastawayScores,
  useUserLeaguePoints,
} from './useScoring';

// Weekly pick hooks
export {
  useWeeklyPick,
  useUserLeaguePicks,
  useEpisodePicks,
  usePicksLocked,
  useCurrentPickStatus,
} from './usePicks';
