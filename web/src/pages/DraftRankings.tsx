import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import {
  ArrowLeft,
  Loader2,
  Clock,
  Check,
  AlertCircle,
  Save,
  GripVertical,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCastaways } from '@/lib/hooks';
import { useMyLeagues } from '@/lib/hooks/useLeagues';
import { formatDateTimeFull } from '@/lib/date-utils';
import type { Castaway } from '@/types';

export default function DraftRankings() {
  const { user } = useAuth();
  const { getCopy } = useSiteCopy();
  const queryClient = useQueryClient();
  const [rankings, setRankings] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check if user is in any leagues
  const { data: myLeagues, isLoading: leaguesLoading } = useMyLeagues(user?.id);
  const isInAnyLeague = myLeagues && myLeagues.length > 0;

  const { data: activeSeason } = useQuery({
    queryKey: ['active-season'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: castaways, isLoading: castawaysLoading } = useCastaways(activeSeason?.id);

  const { data: existingRankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ['draft-rankings', activeSeason?.id, user?.id],
    queryFn: async () => {
      if (!activeSeason?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from('draft_rankings')
        .select('*')
        .eq('season_id', activeSeason.id)
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!activeSeason?.id && !!user?.id,
  });

  // Shuffle array using Fisher-Yates algorithm (randomized per user session)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    if (castaways && castaways.length > 0 && rankings.length === 0) {
      if (existingRankings?.rankings && Array.isArray(existingRankings.rankings)) {
        // Cast from Json[] to string[] - rankings are stored as castaway IDs
        setRankings(existingRankings.rankings as string[]);
      } else {
        // Randomize initial order so users don't all start with the same order
        const randomizedOrder = shuffleArray(castaways.map((c) => c.id));
        setRankings(randomizedOrder);
      }
    }
  }, [castaways, existingRankings, rankings.length]);

  const saveRankings = useMutation({
    mutationFn: async () => {
      if (!activeSeason?.id || !user?.id) throw new Error('Missing season or user');
      const { error } = await supabase.from('draft_rankings').upsert({
        user_id: user.id,
        season_id: activeSeason.id,
        rankings,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-rankings', activeSeason?.id, user?.id] });
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const castawayMap = useMemo(() => {
    const map = new Map<string, Castaway>();
    castaways?.forEach((c) => map.set(c.id, c));
    return map;
  }, [castaways]);

  const deadline = activeSeason?.draft_deadline ? new Date(activeSeason.draft_deadline) : null;
  const now = new Date();
  const isPastDeadline = deadline ? now > deadline : false;

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

  if (rankingsLoading || castawaysLoading || leaguesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  // Show CTA to join a league if user is not in any league
  if (!isInAnyLeague) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <div className="mb-6">
            <Link
              to="/castaways"
              className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-800 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Castaways
            </Link>
            <h1 className="text-3xl font-display font-bold text-neutral-800 mb-2">
              {getCopy('draft-rankings.header.title', 'Draft Rankings')}
            </h1>
            <p className="text-neutral-500">
              {getCopy(
                'draft-rankings.header.subtitle',
                'Rank castaways to set your draft preferences'
              )}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-8 text-center">
            <div className="w-16 h-16 bg-burgundy-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-burgundy-600" />
            </div>
            <h2 className="text-2xl font-display font-bold text-neutral-800 mb-3">
              Join a League First
            </h2>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              To set your draft rankings, you need to be part of a league. Join an existing league
              or create your own to start ranking castaways for the draft!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/leagues" className="btn btn-primary">
                Browse Leagues
              </Link>
              <Link to="/leagues/create" className="btn btn-secondary">
                Create a League
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral-700 mb-2">No Active Season</h2>
            <p className="text-neutral-500">Check back when a new season begins!</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-display font-bold text-neutral-800 mb-2">
            {getCopy('draft-rankings.header.title', 'Draft Rankings')}
          </h1>
          <p className="text-neutral-500">
            {getCopy(
              'draft-rankings.header.subtitle',
              'Rank castaways to set your draft preferences'
            )}
          </p>
        </div>

        {deadline && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-orange-800 font-medium">
                Draft Deadline: {formatDateTimeFull(deadline.toISOString())}
              </p>
              {isPastDeadline && (
                <p className="text-orange-600 text-sm mt-1">Deadline has passed</p>
              )}
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">Rankings saved successfully!</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
          <div className="p-6 border-b border-cream-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-800">Your Rankings</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Drag to reorder or use the arrows to move castaways up/down
              </p>
            </div>
            <button
              onClick={() => {
                if (hasChanges) {
                  setShowConfirmation(true);
                } else {
                  saveRankings.mutate();
                }
              }}
              disabled={!hasChanges || saveRankings.isPending}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {saveRankings.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Rankings
                </>
              )}
            </button>
          </div>

          <div className="divide-y divide-cream-100">
            {rankings.map((castawayId, index) => {
              const castaway = castawayMap.get(castawayId);
              if (!castaway) return null;

              return (
                <div
                  key={castawayId}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-4 p-4 hover:bg-cream-50 transition-colors ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  <GripVertical className="h-5 w-5 text-neutral-400 cursor-move" />
                  <div className="w-12 text-center">
                    <span className="text-lg font-bold text-neutral-600">#{index + 1}</span>
                  </div>
                  <img
                    src={
                      castaway.photo_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${castaway.name}`
                    }
                    alt={castaway.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-neutral-800">{castaway.name}</h3>
                      {castaway.tribe_original && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            castaway.tribe_original === 'Vatu'
                              ? 'bg-purple-100 text-purple-700'
                              : castaway.tribe_original === 'Kalo'
                                ? 'bg-teal-100 text-teal-700'
                                : castaway.tribe_original === 'Cila'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {castaway.tribe_original}
                        </span>
                      )}
                    </div>
                    {castaway.occupation && (
                      <p className="text-sm text-neutral-500">{castaway.occupation}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-2 rounded-lg hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === rankings.length - 1}
                      className="p-2 rounded-lg hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col">
              <h3 className="text-xl font-semibold text-neutral-800 mb-2">Confirm Your Rankings</h3>
              <p className="text-neutral-600 mb-4 text-sm">
                This will update your global draft rankings for all leagues this season.
              </p>

              {/* Scrollable rankings list */}
              <div className="flex-1 overflow-y-auto mb-4 border border-cream-200 rounded-xl">
                <div className="divide-y divide-cream-100">
                  {rankings.map((castawayId, index) => {
                    const castaway = castawayMap.get(castawayId);
                    if (!castaway) return null;
                    const isTopPick = index < 2;

                    return (
                      <div
                        key={castawayId}
                        className={`flex items-center gap-3 p-3 ${
                          isTopPick ? 'bg-amber-50' : index % 2 === 0 ? 'bg-white' : 'bg-cream-50'
                        }`}
                      >
                        <span
                          className={`w-8 text-center font-bold ${
                            isTopPick ? 'text-amber-600' : 'text-neutral-500'
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <img
                          src={
                            castaway.photo_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${castaway.name}`
                          }
                          alt={castaway.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-medium truncate ${
                                isTopPick ? 'text-amber-800' : 'text-neutral-800'
                              }`}
                            >
                              {castaway.name}
                            </p>
                            {castaway.tribe_original && (
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  castaway.tribe_original === 'Vatu'
                                    ? 'bg-purple-100 text-purple-700'
                                    : castaway.tribe_original === 'Kalo'
                                      ? 'bg-teal-100 text-teal-700'
                                      : castaway.tribe_original === 'Cila'
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-neutral-100 text-neutral-700'
                                }`}
                              >
                                {castaway.tribe_original}
                              </span>
                            )}
                          </div>
                        </div>
                        {isTopPick && (
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                            Top Pick
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    saveRankings.mutate();
                  }}
                  className="flex-1 btn btn-primary"
                >
                  Confirm & Save
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
