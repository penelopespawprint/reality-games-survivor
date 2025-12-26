import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Loader2, Save, Grid3X3, List } from 'lucide-react';

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
  sort_order: number;
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

// Grid scores map: { [castawayId]: { [ruleId]: quantity } }
type GridScores = Record<string, Record<string, number>>;

export function AdminScoringGrid() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const episodeIdParam = searchParams.get('episode');

  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(episodeIdParam);
  const [gridScores, setGridScores] = useState<GridScores>({});
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
        .eq('status', 'active') // Only show active castaways
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

  const { data: existingScores, refetch: _refetchScores } = useQuery({
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

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(scoringRules?.map((r) => r.category || 'Other'));
    return Array.from(cats);
  }, [scoringRules]);

  // Filter rules by selected category
  const filteredRules = useMemo(() => {
    if (!selectedCategory) return scoringRules || [];
    return scoringRules?.filter((r) => (r.category || 'Other') === selectedCategory) || [];
  }, [scoringRules, selectedCategory]);

  // Initialize grid scores from existing data
  useEffect(() => {
    if (isSaving) return; // Don't reset while saving

    if (existingScores && castaways) {
      const newGridScores: GridScores = {};
      castaways.forEach((c) => {
        newGridScores[c.id] = {};
      });
      existingScores.forEach((score) => {
        if (!newGridScores[score.castaway_id]) {
          newGridScores[score.castaway_id] = {};
        }
        newGridScores[score.castaway_id][score.scoring_rule_id] = score.quantity;
      });
      setGridScores(newGridScores);
      setIsDirty(false);
    }
  }, [existingScores, castaways, isSaving]);

  // Save all scores
  const saveAllScores = useCallback(async () => {
    if (!selectedEpisodeId || !user?.id || !scoringRules) return;

    setIsSaving(true);
    try {
      // Delete all existing scores for this episode
      await supabase.from('episode_scores').delete().eq('episode_id', selectedEpisodeId);

      // Insert all new scores
      const scoresToInsert: any[] = [];
      Object.entries(gridScores).forEach(([castawayId, castawayScores]) => {
        Object.entries(castawayScores).forEach(([ruleId, quantity]) => {
          if (quantity > 0) {
            const rule = scoringRules.find((r) => r.id === ruleId);
            scoresToInsert.push({
              episode_id: selectedEpisodeId,
              castaway_id: castawayId,
              scoring_rule_id: ruleId,
              quantity,
              points: (rule?.points || 0) * quantity,
              entered_by: user.id,
            });
          }
        });
      });

      if (scoresToInsert.length > 0) {
        const { error } = await supabase.from('episode_scores').insert(scoresToInsert);
        if (error) throw error;
      }

      setLastSavedAt(new Date());
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['episodeScores', selectedEpisodeId] });
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
    }, 3000); // 3 second delay for grid (more changes at once)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [gridScores, isDirty, selectedEpisodeId, saveAllScores]);

  const updateGridScore = (castawayId: string, ruleId: string, value: number) => {
    setGridScores((prev) => ({
      ...prev,
      [castawayId]: {
        ...prev[castawayId],
        [ruleId]: Math.max(0, value),
      },
    }));
    setIsDirty(true);
  };

  // Calculate totals
  const getCastawayTotal = (castawayId: string) => {
    const castawayScores = gridScores[castawayId] || {};
    return Object.entries(castawayScores).reduce((sum, [ruleId, qty]) => {
      const rule = scoringRules?.find((r) => r.id === ruleId);
      return sum + (rule?.points || 0) * qty;
    }, 0);
  };

  const _selectedEpisode = episodes?.find((e) => e.id === selectedEpisodeId);

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

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-neutral-400 hover:text-neutral-600 transition-colors">
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

        {/* Episode Selector */}
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
                {episodes?.map((ep) => (
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
                    {castaways?.map((castaway) => (
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
                      {castaways?.map((castaway) => {
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
                    {castaways?.map((castaway) => {
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
