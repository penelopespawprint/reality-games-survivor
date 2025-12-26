import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import {
  Loader2,
  Save,
  Grid3X3,
  ChevronDown,
  ChevronRight,
  Star,
  CheckCircle,
  AlertTriangle,
  X,
} from 'lucide-react';
import { apiWithAuth } from '@/lib/api';

interface Episode {
  id: string;
  number: number;
  title: string | null;
  air_date: string;
  is_scored: boolean;
  season_id: string;
}

interface Castaway {
  id: string;
  name: string;
  photo_url: string | null;
  status: string;
}

interface ScoringRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  points: number;
  category: string | null;
  is_negative: boolean;
}

interface EpisodeScore {
  id: string;
  episode_id: string;
  castaway_id: string;
  scoring_rule_id: string;
  quantity: number;
  points: number;
}

interface UserProfile {
  id: string;
  display_name: string;
  role: string;
}

export function AdminScoring() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const episodeIdParam = searchParams.get('episode');

  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(episodeIdParam);
  const [selectedCastawayId, setSelectedCastawayId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [_showSummary, _setShowSummary] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [skipNextScoreReset, setSkipNextScoreReset] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Most Common': true,
  });
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<{
    success: boolean;
    eliminated: string[];
  } | null>(null);
  const previousCastawayRef = useRef<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoresRef = useRef<Record<string, number>>(scores);

  // Most commonly used scoring rule codes
  const MOST_COMMON_CODES = [
    'SURVIVED_EPISODE',
    'VOTE_CORRECT',
    'VOTE_RECEIVED',
    'WON_IMMUNITY_IND',
    'WON_IMMUNITY_TRIBE',
    'WON_REWARD',
    'FOUND_IDOL',
    'PLAYED_IDOL_SELF',
    'ELIMINATED',
    'CONFESSIONAL',
  ];

  // Keep scoresRef in sync with scores state
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, role')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const { data: activeSeason } = useQuery({
    queryKey: ['activeSeason'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const { data: episodes } = useQuery({
    queryKey: ['episodes', activeSeason?.id],
    queryFn: async () => {
      if (!activeSeason?.id) return [];
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', activeSeason.id)
        .order('number', { ascending: true });
      if (error) throw error;
      return data as Episode[];
    },
    enabled: !!activeSeason?.id,
  });

  const { data: castaways } = useQuery({
    queryKey: ['castaways', activeSeason?.id],
    queryFn: async () => {
      if (!activeSeason?.id) return [];
      const { data, error } = await supabase
        .from('castaways')
        .select('*')
        .eq('season_id', activeSeason.id)
        .order('name');
      if (error) throw error;
      return data as Castaway[];
    },
    enabled: !!activeSeason?.id,
  });

  const { data: scoringRules } = useQuery({
    queryKey: ['scoringRules', activeSeason?.id],
    queryFn: async () => {
      if (!activeSeason?.id) return [];
      const { data, error } = await supabase
        .from('scoring_rules')
        .select('*')
        .eq('season_id', activeSeason.id)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as ScoringRule[];
    },
    enabled: !!activeSeason?.id,
  });

  const { data: existingScores } = useQuery({
    queryKey: ['episodeScores', selectedEpisodeId],
    queryFn: async () => {
      if (!selectedEpisodeId) return [];
      const { data, error } = await supabase
        .from('episode_scores')
        .select('*')
        .eq('episode_id', selectedEpisodeId);
      if (error) throw error;
      return data as EpisodeScore[];
    },
    enabled: !!selectedEpisodeId,
  });

  // Get most common rules
  const mostCommonRules = useMemo(() => {
    if (!scoringRules) return [];
    return MOST_COMMON_CODES.map((code) => scoringRules.find((r) => r.code === code)).filter(
      (r): r is ScoringRule => r !== undefined
    );
  }, [scoringRules]);

  // Group rules by category (excluding most common from their original categories)
  const groupedRules = useMemo(() => {
    const groups =
      scoringRules?.reduce(
        (acc, rule) => {
          const category = rule.category || 'Other';
          if (!acc[category]) acc[category] = [];
          acc[category].push(rule);
          return acc;
        },
        {} as Record<string, ScoringRule[]>
      ) || {};

    // Sort categories alphabetically, but keep a sensible order
    const categoryOrder = [
      'Survival',
      'Tribal Council',
      'Challenges',
      'Strategy',
      'Social',
      'Advantages',
      'Finale',
      'Other',
    ];
    const orderedGroups: Record<string, ScoringRule[]> = {};

    categoryOrder.forEach((cat) => {
      if (groups[cat]) orderedGroups[cat] = groups[cat];
    });

    // Add any remaining categories not in our order
    Object.keys(groups).forEach((cat) => {
      if (!orderedGroups[cat]) orderedGroups[cat] = groups[cat];
    });

    return orderedGroups;
  }, [scoringRules]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Initialize scores from existing data when castaway changes
  useEffect(() => {
    // Don't reset scores while saving (could cause data loss)
    if (isSaving) return;

    // Skip the reset if we just saved (prevents race condition)
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
  }, [selectedCastawayId, existingScores]); // Load initial scores when data is available or castaway changes

  // Save scores for a specific castaway
  const saveScoresForCastaway = useCallback(
    async (castawayId: string, scoresToSave: Record<string, number>) => {
      if (!selectedEpisodeId || !castawayId || !user?.id) {
        return;
      }

      // Delete existing scores for this castaway/episode
      await supabase
        .from('episode_scores')
        .delete()
        .eq('episode_id', selectedEpisodeId)
        .eq('castaway_id', castawayId);

      // Insert new scores
      const scoresToInsert = Object.entries(scoresToSave)
        .filter(([_, quantity]) => quantity > 0)
        .map(([ruleId, quantity]) => {
          const rule = scoringRules?.find((r) => r.id === ruleId);
          return {
            episode_id: selectedEpisodeId,
            castaway_id: castawayId,
            scoring_rule_id: ruleId,
            quantity,
            points: (rule?.points || 0) * quantity,
            entered_by: user.id,
          };
        });

      if (scoresToInsert.length > 0) {
        const { error } = await supabase.from('episode_scores').insert(scoresToInsert);
        if (error) throw error;
      }

      setLastSavedAt(new Date());
      setIsDirty(false);
      // Skip the next score reset to prevent the query invalidation from resetting local state
      setSkipNextScoreReset(true);
      queryClient.invalidateQueries({ queryKey: ['episodeScores', selectedEpisodeId] });
    },
    [selectedEpisodeId, user?.id, scoringRules, queryClient]
  );

  const _saveScoresMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCastawayId) return;
      await saveScoresForCastaway(selectedCastawayId, scores);
    },
    onSuccess: () => {
      setLastSavedAt(new Date());
      setIsDirty(false);
    },
  });

  // Finalize scores mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEpisodeId) throw new Error('No episode selected');

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const result = await apiWithAuth<{
        finalized: boolean;
        eliminated: string[];
        standings_updated: boolean;
      }>(`/episodes/${selectedEpisodeId}/scoring/finalize`, session.access_token, {
        method: 'POST',
      });

      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      setFinalizeResult({ success: true, eliminated: data?.eliminated || [] });
      setShowFinalizeModal(false);
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      queryClient.invalidateQueries({ queryKey: ['episodeScores'] });
      queryClient.invalidateQueries({ queryKey: ['castaways'] });
    },
    onError: (error: Error) => {
      setFinalizeResult({ success: false, eliminated: [] });
      console.error('Finalize error:', error);
    },
  });

  // Auto-save when switching castaways
  useEffect(() => {
    const previousCastaway = previousCastawayRef.current;

    // If we're switching from one castaway to another and have dirty scores
    if (previousCastaway && previousCastaway !== selectedCastawayId && isDirty) {
      // Save the previous castaway's scores
      const previousScores = { ...scores };
      setIsSaving(true);
      saveScoresForCastaway(previousCastaway, previousScores).finally(() => {
        setIsSaving(false);
      });
    }

    previousCastawayRef.current = selectedCastawayId;
  }, [selectedCastawayId, isDirty, scores, saveScoresForCastaway]);

  // Debounced auto-save (2 seconds after last change)
  useEffect(() => {
    // Don't start a new timeout if we're already saving
    if (!isDirty || !selectedCastawayId) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Capture current castaway ID for the timeout
    const castawayToSave = selectedCastawayId;

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      // Use ref to get the latest scores at time of save
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
    // Include scores in deps so timeout resets on each change
  }, [scores, isDirty, selectedCastawayId, saveScoresForCastaway]);

  const updateScore = (ruleId: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [ruleId]: Math.max(0, value),
    }));
    setIsDirty(true);
  };

  const calculateCastawayTotal = (castawayId: string) => {
    const castawayScores = existingScores?.filter((s) => s.castaway_id === castawayId) || [];
    return castawayScores.reduce((sum, s) => sum + s.points, 0);
  };

  const selectedEpisode = episodes?.find((e) => e.id === selectedEpisodeId);
  const selectedCastaway = castaways?.find((c) => c.id === selectedCastawayId);

  // Calculate live total as user edits
  const liveTotal = useMemo(() => {
    return Object.entries(scores).reduce((total, [ruleId, quantity]) => {
      const rule = scoringRules?.find((r) => r.id === ruleId);
      return total + (rule?.points || 0) * quantity;
    }, 0);
  }, [scores, scoringRules]);

  if (profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                to="/admin"
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
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
              <h1 className="text-2xl font-display text-neutral-800">Score Episode</h1>
            </div>
            <p className="text-neutral-500">Enter scores for each castaway</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/admin/scoring/grid${selectedEpisodeId ? `?episode=${selectedEpisodeId}` : ''}`}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              Grid View
            </Link>
            {selectedEpisodeId && !selectedEpisode?.is_scored && (
              <button
                onClick={() => setShowFinalizeModal(true)}
                className="btn btn-primary flex items-center gap-2"
                disabled={finalizeMutation.isPending}
              >
                {finalizeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Finalize Scores
              </button>
            )}
            {selectedEpisode?.is_scored && (
              <span className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="h-5 w-5" />
                Finalized
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Episode & Castaway Selection */}
          <div className="lg:col-span-1 space-y-6">
            {/* Episode Selector */}
            <div className="bg-white rounded-2xl shadow-elevated p-5">
              <h3 className="font-semibold text-neutral-800 mb-3">Select Episode</h3>
              <select
                value={selectedEpisodeId || ''}
                onChange={(e) => {
                  setSelectedEpisodeId(e.target.value || null);
                  setSelectedCastawayId(null);
                }}
                className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
              >
                <option value="">Choose episode...</option>
                {episodes?.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    Ep {ep.number}: {ep.title || 'TBD'} {ep.is_scored ? '✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Castaway List */}
            {selectedEpisodeId && (
              <div className="bg-white rounded-2xl shadow-elevated overflow-hidden">
                <div className="p-5 border-b border-cream-100">
                  <h3 className="font-semibold text-neutral-800">Castaways</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {castaways?.map((castaway) => {
                    const total = calculateCastawayTotal(castaway.id);
                    return (
                      <button
                        key={castaway.id}
                        onClick={() => setSelectedCastawayId(castaway.id)}
                        className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                          selectedCastawayId === castaway.id
                            ? 'bg-burgundy-50 border-l-4 border-burgundy-500'
                            : 'hover:bg-cream-50'
                        }`}
                      >
                        <div className="w-10 h-10 bg-cream-200 rounded-full flex items-center justify-center">
                          {castaway.photo_url ? (
                            <img
                              src={castaway.photo_url}
                              alt={castaway.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-neutral-500">
                              {castaway.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-neutral-800">{castaway.name}</p>
                        </div>
                        {total !== 0 && (
                          <span
                            className={`text-sm font-bold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {total >= 0 ? '+' : ''}
                            {total}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
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
                {/* Castaway Header with Live Total */}
                <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-6 text-white shadow-elevated">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                        {selectedCastaway?.photo_url ? (
                          <img
                            src={selectedCastaway.photo_url}
                            alt={selectedCastaway.name}
                            className="w-16 h-16 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold">
                            {selectedCastaway?.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-display">{selectedCastaway?.name}</h2>
                        <p className="text-burgundy-100">Episode {selectedEpisode?.number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Live Total */}
                      <div className="text-center">
                        <p className="text-burgundy-200 text-sm">Episode Total</p>
                        <p
                          className={`text-4xl font-display font-bold ${liveTotal >= 0 ? 'text-white' : 'text-red-200'}`}
                        >
                          {liveTotal >= 0 ? '+' : ''}
                          {liveTotal}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          {isSaving && (
                            <span className="text-xs text-burgundy-200 flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving...
                            </span>
                          )}
                          {isDirty && !isSaving && (
                            <span className="text-xs text-burgundy-200">Unsaved changes</span>
                          )}
                          {lastSavedAt && !isDirty && !isSaving && (
                            <span className="text-xs text-green-200 flex items-center gap-1">
                              <Save className="h-3 w-3" />
                              Saved
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-burgundy-200">Auto-saves after 2 seconds</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Most Common Rules (Always Expanded) */}
                {mostCommonRules.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-elevated overflow-hidden border-2 border-burgundy-200">
                    <button
                      onClick={() => toggleCategory('Most Common')}
                      className="w-full p-4 border-b border-cream-100 bg-gradient-to-r from-burgundy-50 to-cream-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-burgundy-500 fill-burgundy-500" />
                        <h3 className="font-semibold text-burgundy-700">Most Common Rules</h3>
                        <span className="text-xs bg-burgundy-100 text-burgundy-600 px-2 py-0.5 rounded-full">
                          {mostCommonRules.length} rules
                        </span>
                      </div>
                      {expandedCategories['Most Common'] ? (
                        <ChevronDown className="h-5 w-5 text-burgundy-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-burgundy-400" />
                      )}
                    </button>
                    {expandedCategories['Most Common'] && (
                      <div className="divide-y divide-cream-100">
                        {mostCommonRules.map((rule) => {
                          const quantity = scores[rule.id] || 0;
                          const ruleTotal = rule.points * quantity;
                          return (
                            <div
                              key={rule.id}
                              className="p-4 flex items-center gap-4 hover:bg-cream-50 transition-colors"
                            >
                              <div
                                className={`w-14 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                                  rule.is_negative
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {rule.points >= 0 ? '+' : ''}
                                {rule.points}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-neutral-800">{rule.name}</p>
                                {rule.description && (
                                  <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                    {rule.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateScore(rule.id, quantity - 1)}
                                    className="w-8 h-8 rounded-lg bg-cream-100 text-neutral-600 hover:bg-cream-200 flex items-center justify-center font-bold"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quantity}
                                    onChange={(e) =>
                                      updateScore(rule.id, parseInt(e.target.value) || 0)
                                    }
                                    className="w-14 h-10 text-center border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500"
                                  />
                                  <button
                                    onClick={() => updateScore(rule.id, quantity + 1)}
                                    className="w-8 h-8 rounded-lg bg-cream-100 text-neutral-600 hover:bg-cream-200 flex items-center justify-center font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                                {quantity > 0 && (
                                  <div
                                    className={`w-16 text-right font-bold ${ruleTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                  >
                                    = {ruleTotal >= 0 ? '+' : ''}
                                    {ruleTotal}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Scoring Rules by Category (Accordion) */}
                {Object.entries(groupedRules).map(([category, rules]) => {
                  const isExpanded = expandedCategories[category] ?? false;
                  const categoryTotal = rules.reduce((sum, rule) => {
                    const qty = scores[rule.id] || 0;
                    return sum + rule.points * qty;
                  }, 0);
                  const hasScores = rules.some((rule) => (scores[rule.id] || 0) > 0);

                  return (
                    <div
                      key={category}
                      className="bg-white rounded-2xl shadow-elevated overflow-hidden"
                    >
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full p-4 border-b border-cream-100 bg-cream-50 flex items-center justify-between hover:bg-cream-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-neutral-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-neutral-400" />
                          )}
                          <h3 className="font-semibold text-neutral-800">{category}</h3>
                          <span className="text-xs bg-cream-200 text-neutral-500 px-2 py-0.5 rounded-full">
                            {rules.length} rules
                          </span>
                        </div>
                        {hasScores && (
                          <span
                            className={`font-bold text-sm ${categoryTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {categoryTotal >= 0 ? '+' : ''}
                            {categoryTotal}
                          </span>
                        )}
                      </button>
                      {isExpanded && (
                        <div className="divide-y divide-cream-100">
                          {rules.map((rule) => {
                            const quantity = scores[rule.id] || 0;
                            const ruleTotal = rule.points * quantity;
                            return (
                              <div
                                key={rule.id}
                                className="p-4 flex items-center gap-4 hover:bg-cream-50 transition-colors"
                              >
                                <div
                                  className={`w-14 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                                    rule.is_negative
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {rule.points >= 0 ? '+' : ''}
                                  {rule.points}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-neutral-800">{rule.name}</p>
                                  {rule.description && (
                                    <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                      {rule.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => updateScore(rule.id, quantity - 1)}
                                      className="w-8 h-8 rounded-lg bg-cream-100 text-neutral-600 hover:bg-cream-200 flex items-center justify-center font-bold"
                                    >
                                      −
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={quantity}
                                      onChange={(e) =>
                                        updateScore(rule.id, parseInt(e.target.value) || 0)
                                      }
                                      className="w-14 h-10 text-center border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500"
                                    />
                                    <button
                                      onClick={() => updateScore(rule.id, quantity + 1)}
                                      className="w-8 h-8 rounded-lg bg-cream-100 text-neutral-600 hover:bg-cream-200 flex items-center justify-center font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                  {quantity > 0 && (
                                    <div
                                      className={`w-16 text-right font-bold ${ruleTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                    >
                                      = {ruleTotal >= 0 ? '+' : ''}
                                      {ruleTotal}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Finalize Confirmation Modal */}
        {showFinalizeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 animate-slide-up">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-neutral-800">
                      Finalize Episode {selectedEpisode?.number}?
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {selectedEpisode?.title || 'This action cannot be undone'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFinalizeModal(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> Finalizing will:
                </p>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>• Lock all scores for this episode</li>
                  <li>• Update all players' points and rankings</li>
                  <li>• Mark eliminated castaways</li>
                  <li>• Make results visible to all users</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFinalizeModal(false)}
                  className="flex-1 btn btn-secondary"
                  disabled={finalizeMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={() => finalizeMutation.mutate()}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                  disabled={finalizeMutation.isPending}
                >
                  {finalizeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Finalize Scores
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success/Error Result Modal */}
        {finalizeResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 animate-slide-up">
              {finalizeResult.success ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-neutral-800 mb-2">
                      Scores Finalized!
                    </h3>
                    <p className="text-neutral-500">
                      Episode {selectedEpisode?.number} has been scored and all standings updated.
                    </p>
                  </div>

                  {finalizeResult.eliminated.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                      <p className="text-sm font-medium text-red-800 mb-2">Eliminated Castaways:</p>
                      <div className="flex flex-wrap gap-2">
                        {finalizeResult.eliminated.map((id) => {
                          const castaway = castaways?.find((c) => c.id === id);
                          return (
                            <span
                              key={id}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm"
                            >
                              {castaway?.name || id}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-neutral-800 mb-2">
                    Finalization Failed
                  </h3>
                  <p className="text-neutral-500">
                    There was an error finalizing the scores. Please try again.
                  </p>
                </div>
              )}

              <button onClick={() => setFinalizeResult(null)} className="w-full btn btn-primary">
                {finalizeResult.success ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
