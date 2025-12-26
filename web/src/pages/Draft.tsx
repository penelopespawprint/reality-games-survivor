import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { getAvatarUrl } from '@/lib/avatar';
import {
  ArrowLeft,
  GripVertical,
  Check,
  Loader2,
  Trophy,
  Users,
  Clock,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Save,
  Info,
} from 'lucide-react';

interface Castaway {
  id: string;
  name: string;
  photo_url?: string;
  hometown?: string;
  age?: number;
  occupation?: string;
  status: string;
}

interface DraftRanking {
  id: string;
  user_id: string;
  season_id: string;
  rankings: string[]; // Array of castaway IDs in ranked order
  submitted_at: string;
}

interface League {
  id: string;
  name: string;
  code: string;
  draft_status: string;
  season_id: string;
  seasons?: {
    draft_deadline: string;
    name: string;
    number: number;
  };
}

interface RosterEntry {
  id: string;
  user_id: string;
  castaway_id: string;
  draft_round: number;
  castaways?: Castaway;
}

export function Draft() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rankings, setRankings] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch league details
  const { data: league, isLoading: leagueLoading } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('*, seasons(*)')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      return data as League;
    },
    enabled: !!leagueId,
  });

  // Fetch all castaways for this season
  const { data: castaways, isLoading: castawaysLoading } = useQuery({
    queryKey: ['castaways', league?.season_id],
    queryFn: async () => {
      if (!league?.season_id) throw new Error('No season ID');
      const { data, error } = await supabase
        .from('castaways')
        .select('*')
        .eq('season_id', league.season_id)
        .order('name');
      if (error) throw error;
      return data as Castaway[];
    },
    enabled: !!league?.season_id,
  });

  // Fetch user's existing global rankings for this season
  // Note: Using type assertion until Supabase types are regenerated with draft_rankings table
  const { data: existingRankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ['draft-rankings', league?.season_id, user?.id],
    queryFn: async () => {
      if (!league?.season_id || !user?.id) return null;
      const { data, error } = await (supabase as any)
        .from('draft_rankings')
        .select('*')
        .eq('season_id', league.season_id)
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') return null; // PGRST116 = no rows
      return data as DraftRanking | null;
    },
    enabled: !!league?.season_id && !!user?.id,
  });

  // Fetch user's roster (if draft already processed)
  const { data: myRoster } = useQuery({
    queryKey: ['my-roster', leagueId, user?.id],
    queryFn: async () => {
      if (!leagueId || !user?.id) return [];
      const { data, error } = await supabase
        .from('rosters')
        .select('*, castaways(*)')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .is('dropped_at', null)
        .order('draft_round', { ascending: true });
      if (error) throw error;
      return data as RosterEntry[];
    },
    enabled: !!leagueId && !!user?.id,
  });

  // Initialize rankings from existing data or default order
  useEffect(() => {
    if (existingRankings?.rankings) {
      setRankings(existingRankings.rankings);
    } else if (castaways && castaways.length > 0 && rankings.length === 0) {
      setRankings(castaways.map((c) => c.id));
    }
  }, [existingRankings, castaways]);

  // Save rankings mutation - global rankings for the season
  // Note: Using type assertion until Supabase types are regenerated with draft_rankings table
  const saveRankings = useMutation({
    mutationFn: async () => {
      if (!league?.season_id || !user?.id) throw new Error('Missing required data');

      const { error } = await (supabase as any).from('draft_rankings').upsert(
        {
          season_id: league.season_id,
          user_id: user.id,
          rankings: rankings,
          submitted_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,season_id',
        }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-rankings', league?.season_id, user?.id] });
      setHasChanges(false);
      setShowConfirmation(false);
      setSaveSuccess(true);
      // Don't auto-dismiss - show full rankings summary
    },
  });

  // Castaway lookup map
  const castawayMap = useMemo(() => {
    const map = new Map<string, Castaway>();
    castaways?.forEach((c) => map.set(c.id, c));
    return map;
  }, [castaways]);

  // Deadline calculation
  const deadline = league?.seasons?.draft_deadline ? new Date(league.seasons.draft_deadline) : null;
  const now = new Date();
  const isPastDeadline = deadline ? now > deadline : false;
  const draftProcessed = league?.draft_status === 'completed';

  // Move castaway up/down in rankings
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newRankings = [...rankings];
    [newRankings[index - 1], newRankings[index]] = [newRankings[index], newRankings[index - 1]];
    setRankings(newRankings);
    setHasChanges(true);
  };

  const moveDown = (index: number) => {
    if (index === rankings.length - 1) return;
    const newRankings = [...rankings];
    [newRankings[index], newRankings[index + 1]] = [newRankings[index + 1], newRankings[index]];
    setRankings(newRankings);
    setHasChanges(true);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newRankings = [...rankings];
    const [draggedItem] = newRankings.splice(draggedIndex, 1);
    newRankings.splice(index, 0, draggedItem);
    setRankings(newRankings);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const isLoading = leagueLoading || castawaysLoading || rankingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Show full rankings summary after successful save
  if (saveSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />

        <div className="max-w-2xl mx-auto p-4 pb-24">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link
              to={`/leagues/${leagueId}`}
              className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold text-neutral-800">Rankings Saved!</h1>
              <p className="text-neutral-500">{league?.name}</p>
            </div>
          </div>

          {/* Success Message */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-elevated mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <Check className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">Rankings Confirmed!</h2>
                <p className="text-green-100">
                  Your draft preferences have been saved for all leagues.
                </p>
              </div>
            </div>
          </div>

          {/* Full Rankings List */}
          <div className="bg-white rounded-2xl shadow-elevated border border-cream-200 overflow-hidden mb-6">
            <div className="p-5 border-b border-cream-100">
              <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-burgundy-500" />
                Your Complete Rankings
              </h2>
              <p className="text-sm text-neutral-500 mt-1">{rankings.length} castaways ranked</p>
            </div>

            <div className="divide-y divide-cream-100 max-h-[60vh] overflow-y-auto">
              {rankings.map((castawayId, index) => {
                const castaway = castawayMap.get(castawayId);
                if (!castaway) return null;

                return (
                  <div key={castawayId} className="p-3 flex items-center gap-3">
                    {/* Rank Number */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index < 2
                          ? 'bg-burgundy-100 text-burgundy-600'
                          : index < 5
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-cream-100 text-neutral-600'
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Photo */}
                    <img
                      src={getAvatarUrl(castaway.name, castaway.photo_url)}
                      alt={castaway.name}
                      className="w-10 h-10 rounded-full object-cover border border-cream-200"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-800 truncate">{castaway.name}</p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        {castaway.age && <span>{castaway.age} yrs</span>}
                        {castaway.hometown && (
                          <>
                            {castaway.age && <span>·</span>}
                            <span>{castaway.hometown}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button onClick={() => setSaveSuccess(false)} className="flex-1 btn btn-secondary">
              Edit Rankings
            </button>
            <Link to={`/leagues/${leagueId}`} className="flex-1 btn btn-primary text-center">
              Back to League
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show roster if draft is complete
  if (draftProcessed && myRoster && myRoster.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />

        <div className="max-w-2xl mx-auto p-4 pb-24">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link
              to={`/leagues/${leagueId}`}
              className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800">Draft Results</h1>
              <p className="text-neutral-500">{league?.name}</p>
            </div>
          </div>

          {/* Success Message */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-elevated mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <Trophy className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">Draft Complete!</h2>
                <p className="text-green-100">Your team has been drafted based on your rankings.</p>
              </div>
            </div>
          </div>

          {/* Your Team */}
          <div className="bg-white rounded-2xl shadow-elevated border border-cream-200 overflow-hidden">
            <div className="p-5 border-b border-cream-100">
              <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-burgundy-500" />
                Your Team
              </h2>
            </div>

            <div className="divide-y divide-cream-100">
              {myRoster.map((roster, index) => (
                <div key={roster.id} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-burgundy-100 rounded-full flex items-center justify-center">
                    <span className="font-bold text-burgundy-600">#{index + 1}</span>
                  </div>
                  <img
                    src={getAvatarUrl(
                      roster.castaways?.name || 'Unknown',
                      roster.castaways?.photo_url
                    )}
                    alt={roster.castaways?.name || 'Castaway'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-cream-200"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-800">{roster.castaways?.name}</p>
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      {roster.castaways?.age && <span>{roster.castaways.age} yrs</span>}
                      {roster.castaways?.hometown && (
                        <>
                          {roster.castaways?.age && <span>·</span>}
                          <span>{roster.castaways.hometown}</span>
                        </>
                      )}
                      {roster.castaways?.occupation && (
                        <>
                          <span>·</span>
                          <span>{roster.castaways.occupation}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-400">Round {roster.draft_round}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to={`/leagues/${leagueId}`} className="btn btn-primary">
              Back to League
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <Navigation />

      <div className="max-w-3xl mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={`/leagues/${leagueId}`}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-neutral-800">Draft Rankings</h1>
            <p className="text-neutral-500">{league?.name}</p>
          </div>
          {hasChanges && !isPastDeadline && (
            <button
              onClick={() => setShowConfirmation(true)}
              disabled={saveRankings.isPending}
              className="btn btn-primary flex items-center gap-2"
            >
              {saveRankings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Rankings
            </button>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-5 text-white shadow-elevated mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Info className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg mb-1">How the Draft Works</h2>
              <p className="text-burgundy-100 text-sm">
                Rank all {castaways?.length || 18} castaways from your most wanted (#1) to least
                wanted.
                <strong className="text-white">
                  {' '}
                  Your rankings apply to ALL your leagues this season.
                </strong>{' '}
                At the deadline, the system runs a snake draft using everyone's rankings. You'll get
                2 castaways based on your draft position and preferences in each league.
              </p>
            </div>
          </div>
        </div>

        {/* Deadline Warning */}
        {deadline && (
          <div
            className={`rounded-2xl p-4 mb-6 flex items-center gap-4 ${
              isPastDeadline
                ? 'bg-red-50 border border-red-200'
                : 'bg-amber-50 border border-amber-200'
            }`}
          >
            <Clock className={`h-6 w-6 ${isPastDeadline ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="flex-1">
              <p className={`font-medium ${isPastDeadline ? 'text-red-700' : 'text-amber-700'}`}>
                {isPastDeadline ? 'Draft Deadline Passed' : 'Draft Deadline'}
              </p>
              <p className={`text-sm ${isPastDeadline ? 'text-red-600' : 'text-amber-600'}`}>
                {deadline.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </p>
            </div>
            {existingRankings && (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">Submitted</span>
              </div>
            )}
          </div>
        )}

        {isPastDeadline && !draftProcessed && (
          <div className="bg-neutral-100 rounded-2xl p-6 text-center mb-6 border border-neutral-200">
            <AlertCircle className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-600 font-medium">Rankings are locked</p>
            <p className="text-neutral-500 text-sm mt-1">
              The draft deadline has passed. The system will process the draft soon.
            </p>
          </div>
        )}

        {/* Rankings List */}
        <div className="bg-white rounded-2xl shadow-elevated border border-cream-200 overflow-hidden">
          <div className="p-5 border-b border-cream-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-bold text-neutral-800">Your Rankings</h2>
              <p className="text-sm text-neutral-500">
                {existingRankings
                  ? 'Last saved ' + new Date(existingRankings.submitted_at).toLocaleDateString()
                  : 'Drag to reorder or use arrows'}
              </p>
            </div>
            <div className="text-sm text-neutral-400">{rankings.length} castaways</div>
          </div>

          <div className="divide-y divide-cream-100">
            {rankings.map((castawayId, index) => {
              const castaway = castawayMap.get(castawayId);
              if (!castaway) return null;

              return (
                <div
                  key={castawayId}
                  draggable={!isPastDeadline}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 flex items-center gap-3 transition-all ${
                    draggedIndex === index ? 'bg-burgundy-50 opacity-50' : 'hover:bg-cream-50'
                  } ${isPastDeadline ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                >
                  {/* Rank Number */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index < 2
                        ? 'bg-burgundy-100 text-burgundy-600'
                        : index < 5
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-cream-100 text-neutral-600'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Drag Handle */}
                  {!isPastDeadline && (
                    <GripVertical className="h-5 w-5 text-neutral-300 flex-shrink-0" />
                  )}

                  {/* Photo */}
                  <img
                    src={getAvatarUrl(castaway.name, castaway.photo_url)}
                    alt={castaway.name}
                    className="w-10 h-10 rounded-full object-cover border border-cream-200"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-800 truncate">{castaway.name}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      {castaway.age && <span>{castaway.age} yrs</span>}
                      {castaway.hometown && (
                        <>
                          {castaway.age && <span>·</span>}
                          <span>{castaway.hometown}</span>
                        </>
                      )}
                      {castaway.occupation && (
                        <>
                          <span>·</span>
                          <span className="truncate">{castaway.occupation}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Up/Down Buttons */}
                  {!isPastDeadline && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-cream-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="h-4 w-4 text-neutral-500" />
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === rankings.length - 1}
                        className="p-1 hover:bg-cream-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="h-4 w-4 text-neutral-500" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button (Sticky Footer) */}
        {hasChanges && !isPastDeadline && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-cream-200 shadow-elevated">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <p className="text-neutral-500 text-sm">You have unsaved changes</p>
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={saveRankings.isPending}
                className="btn btn-primary flex items-center gap-2"
              >
                {saveRankings.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Rankings
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6">
              <h3 className="text-xl font-display font-bold text-neutral-800 mb-2">
                Confirm Your Rankings
              </h3>
              <p className="text-neutral-600 mb-4">
                Are you sure you want to save your rankings? This will apply to{' '}
                <strong>all your leagues</strong> this season.
              </p>

              {/* Top 5 Preview */}
              <div className="bg-cream-50 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-neutral-700 mb-3">Your Top 5 Picks:</p>
                <div className="space-y-2">
                  {rankings.slice(0, 5).map((castawayId, index) => {
                    const castaway = castawayMap.get(castawayId);
                    if (!castaway) return null;
                    return (
                      <div key={castawayId} className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index < 2
                              ? 'bg-burgundy-100 text-burgundy-600'
                              : 'bg-cream-200 text-neutral-600'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="text-neutral-800">{castaway.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveRankings.mutate()}
                  disabled={saveRankings.isPending}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  {saveRankings.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
