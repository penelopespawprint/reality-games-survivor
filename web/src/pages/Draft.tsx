/**
 * Draft Page
 *
 * Allows users to rank castaways for the snake draft.
 * Refactored from 725 lines to use extracted sub-components.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { ArrowLeft, Loader2, Clock, Check, AlertCircle, Save, Info } from 'lucide-react';
import {
  DraftRankingRow,
  DraftSuccessView,
  DraftResultsView,
  DraftConfirmModal,
} from '@/components/draft';
import { useLeague, useRoster, useCastaways } from '@/lib/hooks';
import type { Castaway } from '@/types';

interface DraftRanking {
  id: string;
  user_id: string;
  season_id: string;
  rankings: string[];
  submitted_at: string;
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

  // Use shared hooks
  const { data: league, isLoading: leagueLoading } = useLeague(leagueId);
  const { data: castaways, isLoading: castawaysLoading } = useCastaways(league?.season_id);
  const { data: myRoster } = useRoster(leagueId, user?.id);

  // Fetch user's existing global rankings for this season
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
      if (error && error.code !== 'PGRST116') return null;
      return data as DraftRanking | null;
    },
    enabled: !!league?.season_id && !!user?.id,
  });

  // Shuffle array using Fisher-Yates algorithm (deterministic per user session)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Initialize rankings from existing data or randomized default order
  useEffect(() => {
    if (existingRankings?.rankings) {
      setRankings(existingRankings.rankings);
    } else if (castaways && castaways.length > 0 && rankings.length === 0) {
      // Randomize initial order so users don't all start with the same order
      setRankings(shuffleArray(castaways.map((c) => c.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRankings, castaways]);
  // Note: rankings is intentionally excluded from deps to prevent infinite loop
  // We only want to initialize once when data loads

  // Save rankings mutation
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
        { onConflict: 'user_id,season_id' }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-rankings', league?.season_id, user?.id] });
      setHasChanges(false);
      setShowConfirmation(false);
      setSaveSuccess(true);
    },
  });

  // Castaway lookup map
  const castawayMap = useMemo(() => {
    const map = new Map<string, Castaway>();
    castaways?.forEach((c) => map.set(c.id, c));
    return map;
  }, [castaways]);

  // Deadline calculation
  const deadline = (league as any)?.seasons?.draft_deadline
    ? new Date((league as any).seasons.draft_deadline)
    : null;
  const now = new Date();
  const isPastDeadline = deadline ? now > deadline : false;
  const draftProcessed = league?.draft_status === 'completed';

  // Move handlers
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

  // Drag handlers
  const handleDragStart = (index: number) => setDraggedIndex(index);

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

  const handleDragEnd = () => setDraggedIndex(null);

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

  // Success view after save
  if (saveSuccess) {
    return (
      <DraftSuccessView
        leagueId={leagueId!}
        league={league || undefined}
        rankings={rankings}
        castawayMap={castawayMap}
        onEditRankings={() => setSaveSuccess(false)}
      />
    );
  }

  // Draft results view
  if (draftProcessed && myRoster && myRoster.length > 0) {
    return <DraftResultsView leagueId={leagueId!} league={league || undefined} roster={myRoster} />;
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
                <DraftRankingRow
                  key={castawayId}
                  castaway={castaway}
                  index={index}
                  totalCount={rankings.length}
                  isDragging={draggedIndex === index}
                  isLocked={isPastDeadline}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onMoveUp={() => moveUp(index)}
                  onMoveDown={() => moveDown(index)}
                />
              );
            })}
          </div>
        </div>

        {/* Sticky Footer */}
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
          <DraftConfirmModal
            rankings={rankings}
            castawayMap={castawayMap}
            isPending={saveRankings.isPending}
            onConfirm={() => saveRankings.mutate()}
            onCancel={() => setShowConfirmation(false)}
          />
        )}
      </div>
    </div>
  );
}
