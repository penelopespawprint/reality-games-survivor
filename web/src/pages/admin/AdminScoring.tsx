/**
 * Admin Scoring Page
 *
 * Enter scores for each castaway per episode.
 * Refactored to use extracted hooks and components.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';
import {
  FinalizeModal,
  FinalizeResultModal,
  CastawayList,
  CastawayHeader,
} from '@/components/admin/scoring';
import {
  useAdminProfile,
  useActiveSeasonForScoring,
  useEpisodesForScoring,
  useCastawaysForScoring,
  useScoringRulesForScoring,
  useExistingScores,
  useScoringStatus,
  groupRulesByCategory,
  getMostCommonRules,
} from '@/lib/hooks';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

// Shared API helper that ensures token is fresh and handles auth errors
async function apiWithAuthLocal(endpoint: string, options?: RequestInit) {
  // Helper to make the request with a given token
  const makeRequest = async (token: string) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response;
  };

  // Get current session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Session error:', sessionError);
    throw new Error('Session error - please refresh the page');
  }

  let token = sessionData.session?.access_token;
  
  // If no token, try to refresh
  if (!token) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session?.access_token) {
      throw new Error('Not authenticated - please log in again');
    }
    token = refreshData.session.access_token;
  }

  // Make the request
  let response = await makeRequest(token);

  // Handle 401/403 - try refreshing token once
  if (response.status === 401 || response.status === 403) {
    console.log('Auth error, attempting token refresh...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (!refreshError && refreshData.session?.access_token) {
      // Retry with fresh token
      response = await makeRequest(refreshData.session.access_token);
    }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Sub-components
import { EpisodeSelector } from '@/components/admin/scoring/EpisodeSelector';
import { ScoringHeader } from '@/components/admin/scoring/ScoringHeader';
import { ScoringCategoryAccordion } from '@/components/admin/scoring/ScoringCategoryAccordion';

export function AdminScoring() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const episodeIdParam = searchParams.get('episode');

  // State
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(episodeIdParam);
  const [selectedCastawayId, setSelectedCastawayId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [skipNextScoreReset, setSkipNextScoreReset] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Most Scored Rules': true,
  });
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<{
    success: boolean;
    eliminated: string[];
  } | null>(null);

  // Refs
  const previousCastawayRef = useRef<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoresRef = useRef<Record<string, number>>(scores);

  // Queries using extracted hooks
  const { data: profile } = useAdminProfile(user?.id);
  const { data: activeSeason } = useActiveSeasonForScoring();
  const { data: episodes } = useEpisodesForScoring(activeSeason?.id);
  const { data: castaways } = useCastawaysForScoring(activeSeason?.id);
  const { data: scoringRules } = useScoringRulesForScoring(activeSeason?.id);
  const { data: existingScores } = useExistingScores(selectedEpisodeId);
  const { data: scoringStatus, refetch: refetchStatus } = useScoringStatus(selectedEpisodeId);

  // Derived data
  const mostCommonRules = useMemo(() => getMostCommonRules(scoringRules), [scoringRules]);
  const groupedRules = useMemo(() => groupRulesByCategory(scoringRules), [scoringRules]);
  const selectedEpisode = episodes?.find((e) => e.id === selectedEpisodeId);
  const selectedCastaway = castaways?.find((c) => c.id === selectedCastawayId);

  // Keep scoresRef in sync
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Initialize scores from existing data when castaway changes
  useEffect(() => {
    if (isSaving) return;
    if (skipNextScoreReset) {
      setSkipNextScoreReset(false);
      return;
    }

    if (existingScores && selectedCastawayId) {
      const castawayScores = existingScores.filter((s) => s.castaway_id === selectedCastawayId);
      const scoreMap: Record<string, number> = {};
      castawayScores.forEach((s) => {
        scoreMap[s.scoring_rule_id] = s.quantity;
      });
      setScores(scoreMap);
      setIsDirty(false);
    } else if (selectedCastawayId) {
      setScores({});
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCastawayId, existingScores]);

  // Save scores for a specific castaway
  const saveScoresForCastaway = useCallback(
    async (castawayId: string, scoresToSave: Record<string, number>) => {
      if (!selectedEpisodeId || !castawayId || !user?.id) return;

      const scoresArray = Object.entries(scoresToSave)
        .filter(([_, quantity]) => quantity > 0)
        .map(([ruleId, quantity]) => ({
          castaway_id: castawayId,
          scoring_rule_id: ruleId,
          quantity,
        }));

      await apiWithAuthLocal(`/api/episodes/${selectedEpisodeId}/scoring/save`, {
        method: 'POST',
        body: JSON.stringify({ scores: scoresArray }),
      });

      setLastSavedAt(new Date());
      setIsDirty(false);
      setSkipNextScoreReset(true);
      // Invalidate queries to sync with server state (for grid view and other views)
      queryClient.invalidateQueries({ queryKey: ['episodeScores', selectedEpisodeId] });
      queryClient.invalidateQueries({ queryKey: ['episodeScores'] }); // Also invalidate broader key for grid view sync
      queryClient.invalidateQueries({ queryKey: ['scoringStatus', selectedEpisodeId] });
      refetchStatus();
    },
    [selectedEpisodeId, user?.id, queryClient, refetchStatus]
  );

  // Finalize scores mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEpisodeId) throw new Error('No episode selected');

      return apiWithAuthLocal(`/api/episodes/${selectedEpisodeId}/scoring/finalize`, {
        method: 'POST',
      }) as Promise<{
        finalized: boolean;
        eliminated: string[];
        standings_updated: boolean;
      }>;
    },
    onSuccess: (data) => {
      setFinalizeResult({ success: true, eliminated: data?.eliminated || [] });
      setShowFinalizeModal(false);
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      queryClient.invalidateQueries({ queryKey: ['episodeScores'] });
      queryClient.invalidateQueries({ queryKey: ['castaways'] });
      queryClient.invalidateQueries({ queryKey: ['scoringStatus'] });
      refetchStatus();
    },
    onError: () => {
      setFinalizeResult({ success: false, eliminated: [] });
      setShowFinalizeModal(false);
    },
  });

  // Auto-save when switching castaways
  useEffect(() => {
    const previousCastaway = previousCastawayRef.current;
    if (previousCastaway && previousCastaway !== selectedCastawayId && isDirty) {
      const previousScores = { ...scores };
      setIsSaving(true);
      saveScoresForCastaway(previousCastaway, previousScores).finally(() => {
        setIsSaving(false);
      });
    }
    previousCastawayRef.current = selectedCastawayId;
  }, [selectedCastawayId, isDirty, scores, saveScoresForCastaway]);

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty || !selectedCastawayId) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const castawayToSave = selectedCastawayId;
    autoSaveTimeoutRef.current = setTimeout(async () => {
      const currentScores = { ...scoresRef.current };
      setIsSaving(true);
      try {
        await saveScoresForCastaway(castawayToSave, currentScores);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [scores, isDirty, selectedCastawayId, saveScoresForCastaway]);

  const updateScore = (ruleId: string, value: number) => {
    setScores((prev) => ({ ...prev, [ruleId]: Math.max(0, value) }));
    setIsDirty(true);
  };

  // Calculate live total
  const liveTotal = useMemo(() => {
    return Object.entries(scores).reduce((total, [ruleId, quantity]) => {
      const rule = scoringRules?.find((r) => r.id === ruleId);
      return total + (rule?.points || 0) * quantity;
    }, 0);
  }, [scores, scoringRules]);

  // Access denied for non-admins
  if (profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <AdminNavBar />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-elevated p-12">
            <h1 className="text-2xl font-display text-neutral-800 mb-3">Access Denied</h1>
            <p className="text-neutral-500 mb-8">You don't have permission to access this page.</p>
            <Link to="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <Navigation />
      <AdminNavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <ScoringHeader
          scoringStatus={scoringStatus || null}
          selectedEpisodeId={selectedEpisodeId}
          selectedEpisode={selectedEpisode}
          finalizeMutation={finalizeMutation}
          onShowFinalizeModal={() => setShowFinalizeModal(true)}
        />

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Episode & Castaway Selection */}
          <div className="lg:col-span-1 space-y-6">
            <EpisodeSelector
              episodes={episodes || []}
              selectedEpisodeId={selectedEpisodeId}
              onSelect={(id) => {
                setSelectedEpisodeId(id);
                setSelectedCastawayId(null);
              }}
            />

            {selectedEpisodeId && (
              <div className="bg-white rounded-2xl shadow-elevated overflow-hidden flex flex-col h-[500px]">
                <div className="p-5 border-b border-cream-100 flex items-center justify-between">
                  <h3 className="font-semibold text-neutral-800">Castaways</h3>
                  {scoringStatus && (
                    <span className="text-[10px] bg-cream-100 text-neutral-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {scoringStatus.scored_castaways}/{scoringStatus.total_castaways}
                    </span>
                  )}
                </div>
                <CastawayList
                  castaways={castaways || []}
                  selectedCastawayId={selectedCastawayId}
                  onSelect={(id) => setSelectedCastawayId(id)}
                  existingScores={existingScores || []}
                />
              </div>
            )}
          </div>

          {/* Scoring Form */}
          <div className="lg:col-span-3">
            {!selectedEpisodeId ? (
              <div className="bg-white rounded-2xl shadow-elevated p-12 text-center">
                <p className="text-neutral-500">Select an episode to begin scoring</p>
              </div>
            ) : !selectedCastawayId ? (
              <div className="bg-white rounded-2xl shadow-elevated p-12 text-center">
                <p className="text-neutral-500">Select a castaway to enter scores</p>
              </div>
            ) : (
              <div className="space-y-6">
                <CastawayHeader
                  castaway={selectedCastaway!}
                  totalPoints={liveTotal}
                  episodeNumber={selectedEpisode?.number || 0}
                  isSaving={isSaving}
                  isDirty={isDirty}
                  lastSavedAt={lastSavedAt}
                />

                {/* Most Scored Rules */}
                {mostCommonRules.length > 0 && (
                  <ScoringCategoryAccordion
                    category="Most Scored Rules"
                    rules={mostCommonRules}
                    scores={scores}
                    isExpanded={expandedCategories['Most Scored Rules'] ?? true}
                    onToggle={() => toggleCategory('Most Scored Rules')}
                    onUpdateScore={updateScore}
                    isFeatured
                  />
                )}

                {/* Other Categories */}
                {Object.entries(groupedRules).map(([category, rules]) => (
                  <ScoringCategoryAccordion
                    key={category}
                    category={category}
                    rules={rules}
                    scores={scores}
                    isExpanded={expandedCategories[category] ?? false}
                    onToggle={() => toggleCategory(category)}
                    onUpdateScore={updateScore}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <FinalizeModal
          isOpen={showFinalizeModal}
          onClose={() => setShowFinalizeModal(false)}
          onConfirm={() => finalizeMutation.mutate()}
          isPending={finalizeMutation.isPending}
          scoringStatus={
            scoringStatus || {
              is_complete: false,
              total_castaways: 0,
              scored_castaways: 0,
              unscored_castaway_ids: [],
              unscored_castaway_names: [],
              is_finalized: false,
            }
          }
        />

        {finalizeResult && (
          <FinalizeResultModal
            isOpen={!!finalizeResult}
            onClose={() => setFinalizeResult(null)}
            result={{
              success: finalizeResult.success,
              eliminated: finalizeResult.eliminated.map(
                (id) => castaways?.find((c) => c.id === id)?.name || id
              ),
            }}
          />
        )}
      </main>
    </div>
  );
}
