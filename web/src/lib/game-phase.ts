/**
 * Game Phase Utilities
 *
 * Functions for determining the current game and weekly phase.
 */

import type { Season, Episode, GamePhase, WeeklyPhaseInfo } from '@/types';

/**
 * Determine the current game phase based on season and episode data
 */
export function getGamePhase(season: Season | null, nextEpisode: Episode | null): GamePhase {
  if (!season) return 'pre_registration';

  const now = new Date();
  const registrationOpens = new Date(season.registration_opens_at);
  const premiere = new Date(season.premiere_at);

  if (now < registrationOpens) return 'pre_registration';
  if (now < premiere) return 'pre_draft';
  if (nextEpisode) return 'active';
  return 'post_season';
}

/**
 * Determine the current weekly phase based on episode timing
 */
export function getWeeklyPhase(
  episode: Episode | null,
  previousEpisode: Episode | null
): WeeklyPhaseInfo | null {
  if (!episode) return null;

  const now = new Date();
  const picksLock = new Date(episode.picks_lock_at);
  const airDate = new Date(episode.air_date);

  // Calculate approximate times (using typical schedule from CLAUDE.md)
  const resultsPosted = new Date(airDate);
  resultsPosted.setDate(resultsPosted.getDate() + 2); // Friday (2 days after Wednesday air)
  resultsPosted.setHours(12, 0, 0, 0);

  const nextPickOpens = new Date(resultsPosted);
  nextPickOpens.setDate(nextPickOpens.getDate() + 1); // Saturday
  nextPickOpens.setHours(12, 0, 0, 0);

  // Check if previous episode was just scored (results posted phase)
  if (previousEpisode?.is_scored && now < nextPickOpens) {
    return {
      phase: 'results_posted',
      label: 'Results Posted',
      description: `Episode ${previousEpisode.number} scores are in! Check your points.`,
      ctaLabel: 'View Results',
      ctaPath: '/episodes',
      color: 'green',
    };
  }

  // Before picks lock - make your pick
  if (now < picksLock) {
    return {
      phase: 'make_pick',
      label: 'Make Your Pick',
      description: `Choose your castaway for Episode ${episode.number}`,
      ctaLabel: 'Make Pick',
      ctaPath: '/pick',
      color: 'burgundy',
      countdown: { label: 'Picks lock in', targetTime: picksLock },
    };
  }

  // Between picks lock and episode airing
  if (now < airDate) {
    return {
      phase: 'picks_locked',
      label: 'Picks Locked',
      description: 'Your pick is locked. Episode airs tonight!',
      ctaLabel: 'View Pick',
      ctaPath: '/pick',
      color: 'orange',
      countdown: { label: 'Episode airs in', targetTime: airDate },
    };
  }

  // After episode aired but before results
  if (!episode.is_scored) {
    return {
      phase: 'awaiting_results',
      label: 'Awaiting Results',
      description: 'Episode has aired. Results coming Friday!',
      ctaLabel: 'View Teams',
      ctaPath: '/team',
      color: 'amber',
    };
  }

  return null;
}

/**
 * Get a user-friendly label for a game phase
 */
export function getGamePhaseLabel(phase: GamePhase): string {
  const labels: Record<GamePhase, string> = {
    pre_registration: 'Pre-Registration',
    registration: 'Registration Open',
    pre_draft: 'Pre-Draft',
    draft: 'Draft In Progress',
    pre_season: 'Pre-Season',
    active: 'Season Active',
    post_season: 'Season Complete',
  };
  return labels[phase];
}

/**
 * Check if the game is in a playable state
 */
export function isGameActive(phase: GamePhase): boolean {
  return phase === 'active' || phase === 'draft';
}

/**
 * Check if registration is open
 */
export function isRegistrationOpen(phase: GamePhase): boolean {
  return phase === 'registration' || phase === 'pre_draft';
}
