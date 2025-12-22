import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Loader2, Save, Grid3X3 } from 'lucide-react';

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
  tribe_original: string | null;
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
  const [showSummary, setShowSummary] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const previousCastawayRef = useRef<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Group rules by category
  const groupedRules = useMemo(() => {
    return scoringRules?.reduce((acc, rule) => {
      const category = rule.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(rule);
      return acc;
    }, {} as Record<string, ScoringRule[]>) || {};
  }, [scoringRules]);

  // Initialize scores from existing data when castaway changes
  useEffect(() => {
    // Don't reset scores while saving (could cause data loss)
    if (isSaving) return;

    if (existingScores && selectedCastawayId) {
      const castawayScores = existingScores.filter(s => s.castaway_id === selectedCastawayId);
      const scoreMap: Record<string, number> = {};
      castawayScores.forEach(s => {
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
  const saveScoresForCastaway = useCallback(async (castawayId: string, scoresToSave: Record<string, number>) => {
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
        const rule = scoringRules?.find(r => r.id === ruleId);
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
      const { error } = await supabase
        .from('episode_scores')
        .insert(scoresToInsert);
      if (error) throw error;
    }

    setLastSavedAt(new Date());
    setIsDirty(false);
    queryClient.invalidateQueries({ queryKey: ['episodeScores', selectedEpisodeId] });
  }, [selectedEpisodeId, user?.id, scoringRules, queryClient]);

  const saveScoresMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCastawayId) return;
      await saveScoresForCastaway(selectedCastawayId, scores);
    },
    onSuccess: () => {
      setLastSavedAt(new Date());
      setIsDirty(false);
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
    if (!isDirty || !selectedCastawayId) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveScoresForCastaway(selectedCastawayId, scores);
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
    setScores(prev => ({
      ...prev,
      [ruleId]: Math.max(0, value),
    }));
    setIsDirty(true);
  };

  const calculateCastawayTotal = (castawayId: string) => {
    const castawayScores = existingScores?.filter(s => s.castaway_id === castawayId) || [];
    return castawayScores.reduce((sum, s) => sum + s.points, 0);
  };

  const selectedEpisode = episodes?.find(e => e.id === selectedEpisodeId);
  const selectedCastaway = castaways?.find(c => c.id === selectedCastawayId);

  // Calculate live total as user edits
  const liveTotal = useMemo(() => {
    return Object.entries(scores).reduce((total, [ruleId, quantity]) => {
      const rule = scoringRules?.find(r => r.id === ruleId);
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
            <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
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
              <Link to="/admin" className="text-neutral-400 hover:text-neutral-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-display text-neutral-800">Score Episode</h1>
            </div>
            <p className="text-neutral-500">Enter scores for each castaway</p>
          </div>
          <Link
            to={`/admin/scoring/grid${selectedEpisodeId ? `?episode=${selectedEpisodeId}` : ''}`}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Grid3X3 className="h-4 w-4" />
            Grid View
          </Link>
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
                            <img src={castaway.photo_url} alt={castaway.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-neutral-500">{castaway.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-neutral-800">{castaway.name}</p>
                          <p className="text-xs text-neutral-500">{castaway.tribe_original}</p>
                        </div>
                        {total !== 0 && (
                          <span className={`text-sm font-bold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {total >= 0 ? '+' : ''}{total}
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
                          <img src={selectedCastaway.photo_url} alt={selectedCastaway.name} className="w-16 h-16 rounded-xl object-cover" />
                        ) : (
                          <span className="text-2xl font-bold">{selectedCastaway?.name.charAt(0)}</span>
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
                        <p className={`text-4xl font-display font-bold ${liveTotal >= 0 ? 'text-white' : 'text-red-200'}`}>
                          {liveTotal >= 0 ? '+' : ''}{liveTotal}
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
                        <p className="text-xs text-burgundy-200">
                          Auto-saves after 2 seconds
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scoring Rules */}
                {Object.entries(groupedRules).map(([category, rules]) => (
                  <div key={category} className="bg-white rounded-2xl shadow-elevated overflow-hidden">
                    <div className="p-5 border-b border-cream-100 bg-cream-50">
                      <h3 className="font-semibold text-neutral-800">{category}</h3>
                    </div>
                    <div className="divide-y divide-cream-100">
                      {rules.map((rule) => {
                        const quantity = scores[rule.id] || 0;
                        const ruleTotal = rule.points * quantity;
                        return (
                          <div key={rule.id} className="p-5 flex items-center gap-4">
                            <div className={`w-14 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                              rule.is_negative ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {rule.points >= 0 ? '+' : ''}{rule.points}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-neutral-800">{rule.name}</p>
                              {rule.description && (
                                <p className="text-xs text-neutral-500 mt-0.5">{rule.description}</p>
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
                                  onChange={(e) => updateScore(rule.id, parseInt(e.target.value) || 0)}
                                  className="w-14 h-10 text-center border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500"
                                />
                                <button
                                  onClick={() => updateScore(rule.id, quantity + 1)}
                                  className="w-8 h-8 rounded-lg bg-cream-100 text-neutral-600 hover:bg-cream-200 flex items-center justify-center font-bold"
                                >
                                  +
                                </button>
                              </div>
                              {/* Show calculated points for this rule */}
                              {quantity > 0 && (
                                <div className={`w-16 text-right font-bold ${ruleTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  = {ruleTotal >= 0 ? '+' : ''}{ruleTotal}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
