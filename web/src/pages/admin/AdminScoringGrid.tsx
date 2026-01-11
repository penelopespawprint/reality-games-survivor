/**
 * Admin Scoring Grid Page
 *
 * Grid view for scoring all castaways at once.
 * Refactored to use shared hooks.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';

// Shared API helper that ensures token is fresh and handles auth errors
async function apiWithAuthLocal(endpoint: string, options?: RequestInit) {
  const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';
  
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
import {
  Loader2,
  Save,
  Grid3X3,
  List,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  useAdminProfile,
  useActiveSeasonForScoring,
  useEpisodesForScoring,
  useCastawaysForScoring,
  useScoringRulesForScoring,
  useExistingScores,
  useScoringStatus,
  getMostCommonRules,
} from '@/lib/hooks';

// Grid scores map: { [castawayId]: { [ruleId]: quantity } }
type GridScores = Record<string, Record<string, number>>;

export function AdminScoringGrid() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const episodeIdParam = searchParams.get('episode');

  // State
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(episodeIdParam);
  const [gridScores, setGridScores] = useState<GridScores>({});
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [skipNextScoreReset, setSkipNextScoreReset] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Queries using shared hooks
  const { data: profile } = useAdminProfile(user?.id);
  const { data: activeSeason } = useActiveSeasonForScoring();
  const { data: episodes } = useEpisodesForScoring(activeSeason?.id);
  const { data: castaways } = useCastawaysForScoring(activeSeason?.id);
  const { data: scoringRules } = useScoringRulesForScoring(activeSeason?.id);
  const { data: existingScores } = useExistingScores(selectedEpisodeId);
  const { data: scoringStatus } = useScoringStatus(selectedEpisodeId);

  // Get most scored rules
  const mostScoredRules = useMemo(() => getMostCommonRules(scoringRules), [scoringRules]);

  // Get unique categories with "Most Scored Rules" first
  const categories = useMemo(() => {
    const cats = new Set(scoringRules?.map((r) => r.category || 'Other'));
    return ['Most Scored Rules', ...Array.from(cats)];
  }, [scoringRules]);

  // Filter rules by selected category
  const filteredRules = useMemo(() => {
    if (!selectedCategory) return scoringRules || [];
    if (selectedCategory === 'Most Scored Rules') return mostScoredRules;
    return scoringRules?.filter((r) => (r.category || 'Other') === selectedCategory) || [];
  }, [scoringRules, selectedCategory, mostScoredRules]);

  // Filter to only active castaways
  const activeCastaways = useMemo(() => {
    return castaways?.filter((c) => c.status === 'active') || [];
  }, [castaways]);

  // Initialize grid scores from existing data
  useEffect(() => {
    if (isSaving) return;

    // Skip reset after successful save to preserve local state
    if (skipNextScoreReset) {
      setSkipNextScoreReset(false);
      return;
    }

    if (existingScores && activeCastaways.length > 0) {
      const newGridScores: GridScores = {};
      activeCastaways.forEach((c) => {
        newGridScores[c.id] = {};
      });
      existingScores.forEach((score) => {
        if (newGridScores[score.castaway_id]) {
          newGridScores[score.castaway_id][score.scoring_rule_id] = score.quantity;
        }
      });
      setGridScores(newGridScores);
      setIsDirty(false);
    }
  }, [existingScores, activeCastaways, isSaving, skipNextScoreReset]);

  // Save all scores
  const saveAllScores = useCallback(async () => {
    if (!selectedEpisodeId || !user?.id || !scoringRules) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const scoresArray: Array<{ castaway_id: string; scoring_rule_id: string; quantity: number }> =
        [];
      Object.entries(gridScores).forEach(([castawayId, castawayScores]) => {
        Object.entries(castawayScores).forEach(([ruleId, quantity]) => {
          if (quantity > 0) {
            scoresArray.push({ castaway_id: castawayId, scoring_rule_id: ruleId, quantity });
          }
        });
      });

      await apiWithAuthLocal(`/api/episodes/${selectedEpisodeId}/scoring/save`, {
        method: 'POST',
        body: JSON.stringify({ scores: scoresArray }),
      });

      setLastSavedAt(new Date());
      setIsDirty(false);
      setSkipNextScoreReset(true); // Prevent the useEffect from resetting gridScores

      // Invalidate queries to sync with server state (for list view and other views)
      queryClient.invalidateQueries({ queryKey: ['episodeScores', selectedEpisodeId] });
      queryClient.invalidateQueries({ queryKey: ['episodeScores'] }); // Also invalidate broader key for list view sync
      queryClient.invalidateQueries({ queryKey: ['scoringStatus', selectedEpisodeId] });
      queryClient.invalidateQueries({ queryKey: ['scoringStatus'] }); // Also invalidate broader key
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save scores');
    } finally {
      setIsSaving(false);
    }
  }, [selectedEpisodeId, user?.id, gridScores, scoringRules, queryClient]);

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty || !selectedEpisodeId) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveAllScores();
    }, 3000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [gridScores, isDirty, selectedEpisodeId, saveAllScores]);

  const updateGridScore = (castawayId: string, ruleId: string, value: number) => {
    setGridScores((prev) => ({
      ...prev,
      [castawayId]: { ...prev[castawayId], [ruleId]: Math.max(0, value) },
    }));
    setIsDirty(true);
  };

  const getCastawayTotal = (castawayId: string) => {
    const castawayScores = gridScores[castawayId] || {};
    return Object.entries(castawayScores).reduce((sum, [ruleId, qty]) => {
      const rule = scoringRules?.find((r) => r.id === ruleId);
      return sum + (rule?.points || 0) * qty;
    }, 0);
  };

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

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Back to admin"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-display text-neutral-800 flex items-center gap-2">
                <Grid3X3 className="h-6 w-6 text-burgundy-500" />
                Grid Scoring
              </h1>
              <p className="text-neutral-500 text-sm">Score all castaways at once</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {scoringStatus && selectedEpisodeId && !scoringStatus.is_finalized && (
              <div
                className={`px-4 py-2 rounded-xl flex items-center gap-2 ${
                  scoringStatus.is_complete
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {scoringStatus.is_complete ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <span className="font-medium">
                  {scoringStatus.scored_castaways}/{scoringStatus.total_castaways} castaways scored
                </span>
              </div>
            )}
            <Link
              to={`/admin/scoring${selectedEpisodeId ? `?episode=${selectedEpisodeId}` : ''}`}
              className="btn btn-secondary flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              List View
            </Link>
            {isDirty && (
              <button
                onClick={saveAllScores}
                disabled={isSaving}
                className="btn btn-primary flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save All
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {saveError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Save Error</p>
              <p className="text-red-600 text-sm">{saveError}</p>
            </div>
            <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-elevated p-5 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="font-medium text-neutral-700">Episode:</label>
              <select
                value={selectedEpisodeId || ''}
                onChange={(e) => setSelectedEpisodeId(e.target.value || null)}
                className="p-2 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
              >
                <option value="">Choose episode...</option>
                {/* Filter out episode 1 - no scoring in week 1 (premiere) */}
                {episodes
                  ?.filter((ep) => ep.number > 1)
                  .map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      Ep {ep.number}: {ep.title || 'TBD'} {ep.is_scored ? '✓' : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="font-medium text-neutral-700">Category:</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="p-2 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1" />
            {isSaving && (
              <span className="text-sm text-neutral-500 flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            )}
            {lastSavedAt && !isDirty && !isSaving && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Save className="h-4 w-4" />
                Saved at {lastSavedAt.toLocaleTimeString()}
              </span>
            )}
            {isDirty && !isSaving && (
              <span className="text-sm text-amber-600">Unsaved changes (auto-saves in 3s)</span>
            )}
          </div>
        </div>

        {/* Grid */}
        {!selectedEpisodeId ? (
          <div className="bg-white rounded-2xl shadow-elevated p-12 text-center">
            <p className="text-neutral-500">Select an episode to begin scoring</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-cream-50">
                    <th className="sticky left-0 bg-cream-50 z-10 p-3 text-left font-semibold text-neutral-700 border-b border-r border-cream-200 min-w-[200px]">
                      Rule ({filteredRules.length})
                    </th>
                    {activeCastaways.map((castaway) => (
                      <th
                        key={castaway.id}
                        className="p-2 text-center border-b border-cream-200 min-w-[80px]"
                      >
                        <div className="flex flex-col items-center gap-1">
                          {castaway.photo_url ? (
                            <img
                              src={castaway.photo_url}
                              alt={castaway.name}
                              className="w-10 h-10 rounded-full object-cover border border-cream-200"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-cream-200 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-neutral-500">
                                {castaway.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-xs font-medium text-neutral-700 max-w-[70px] truncate">
                            {castaway.name.split(' ')[0]}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule, idx) => (
                    <tr key={rule.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-cream-50/50'}>
                      <td className="sticky left-0 bg-inherit z-10 p-3 border-r border-cream-200">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              rule.is_negative
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {rule.points >= 0 ? '+' : ''}
                            {rule.points}
                          </span>
                          <span className="text-sm font-medium text-neutral-800">{rule.name}</span>
                        </div>
                      </td>
                      {activeCastaways.map((castaway) => {
                        const value = gridScores[castaway.id]?.[rule.id] || 0;
                        return (
                          <td key={castaway.id} className="p-1 text-center">
                            <input
                              type="number"
                              min="0"
                              value={value || ''}
                              onChange={(e) =>
                                updateGridScore(castaway.id, rule.id, parseInt(e.target.value) || 0)
                              }
                              className={`w-12 h-8 text-center text-sm border rounded focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500 ${
                                value > 0
                                  ? 'border-burgundy-300 bg-burgundy-50'
                                  : 'border-cream-200'
                              }`}
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-burgundy-50 border-t-2 border-burgundy-200">
                    <td className="sticky left-0 bg-burgundy-50 z-10 p-3 font-bold text-burgundy-700 border-r border-burgundy-200">
                      TOTAL
                    </td>
                    {activeCastaways.map((castaway) => {
                      const total = getCastawayTotal(castaway.id);
                      return (
                        <td key={castaway.id} className="p-2 text-center">
                          <span
                            className={`font-bold text-lg ${
                              total > 0
                                ? 'text-green-600'
                                : total < 0
                                  ? 'text-red-600'
                                  : 'text-neutral-400'
                            }`}
                          >
                            {total !== 0 ? (total > 0 ? '+' : '') + total : '–'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
