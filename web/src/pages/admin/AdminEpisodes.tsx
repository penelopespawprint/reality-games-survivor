import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Tv,
  Plus,
  Check,
  Loader2,
  Edit2,
  Trash2,
  Star,
  Send,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Navigation } from '@/components/Navigation';

export function AdminEpisodes() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    number: '',
    title: '',
    air_date: '',
    picks_lock_at: '',
    results_posted_at: '',
    is_finale: false,
  });

  // Fetch season details
  const { data: season } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: async () => {
      if (!seasonId) throw new Error('No season ID');
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('id', seasonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!seasonId,
  });

  // Fetch episodes for this season
  const { data: episodes, isLoading } = useQuery({
    queryKey: ['admin-episodes', seasonId],
    queryFn: async () => {
      if (!seasonId) throw new Error('No season ID');
      const { data, error } = await supabase
        .from('episodes')
        .select('*, users!results_released_by(display_name)')
        .eq('season_id', seasonId)
        .order('number', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!seasonId,
  });

  // Create/update episode mutation
  const saveEpisode = useMutation({
    mutationFn: async () => {
      if (!seasonId) throw new Error('No season ID');
      const payload = {
        season_id: seasonId as string,
        number: parseInt(formData.number),
        week_number: parseInt(formData.number), // Assuming week_number matches number for now
        title: formData.title || null,
        air_date: formData.air_date,
        picks_lock_at: formData.picks_lock_at,
        results_posted_at: formData.results_posted_at || null,
        is_finale: formData.is_finale,
      };

      if (editingId) {
        const { error } = await supabase.from('episodes').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('episodes').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-episodes', seasonId] });
      resetForm();
    },
  });

  // Delete episode mutation
  const deleteEpisode = useMutation({
    mutationFn: async (episodeId: string) => {
      const { error } = await supabase.from('episodes').delete().eq('id', episodeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-episodes', seasonId] });
    },
  });

  // Lock results mutation
  const lockResults = useMutation({
    mutationFn: async (episodeId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(
        `${apiBase}/api/admin/episodes/${episodeId}/lock`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to lock results');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-episodes', seasonId] });
      alert(data.message || 'Results locked! They will be released automatically.');
    },
    onError: (error: Error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Release results mutation
  const releaseResults = useMutation({
    mutationFn: async (episodeId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(
        `${apiBase}/api/admin/episodes/${episodeId}/release-results`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to release results');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-episodes', seasonId] });
      alert(`Results released! Sent ${data.notifications_sent} spoiler-safe notifications.`);
    },
    onError: (error: Error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Generate all episodes
  const generateEpisodes = useMutation({
    mutationFn: async () => {
      if (!season) throw new Error('No season');

      const premiere = new Date(season.premiere_at);
      const episodesToCreate = [];

      for (let i = 1; i <= 14; i++) {
        const airDate = new Date(premiere);
        airDate.setDate(premiere.getDate() + (i - 1) * 7);

        const picksLock = new Date(airDate);
        picksLock.setHours(15, 0, 0, 0); // 3pm PST

        const resultsPosted = new Date(airDate);
        resultsPosted.setDate(resultsPosted.getDate() + 2);
        resultsPosted.setHours(12, 0, 0, 0); // Friday noon

        episodesToCreate.push({
          season_id: seasonId as string,
          number: i,
          week_number: i,
          title: i === 14 ? 'Finale' : `Episode ${i}`,
          air_date: airDate.toISOString(),
          picks_lock_at: picksLock.toISOString(),
          results_posted_at: resultsPosted.toISOString(),
          is_finale: i === 14,
        });
      }

      const { error } = await supabase.from('episodes').insert(episodesToCreate);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-episodes', seasonId] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      number: '',
      title: '',
      air_date: '',
      picks_lock_at: '',
      results_posted_at: '',
      is_finale: false,
    });
  };

  const startEdit = (episode: any) => {
    setEditingId(episode.id);
    setFormData({
      number: episode.number.toString(),
      title: episode.title || '',
      air_date: episode.air_date?.slice(0, 16) || '',
      picks_lock_at: episode.picks_lock_at?.slice(0, 16) || '',
      results_posted_at: episode.results_posted_at?.slice(0, 16) || '',
      is_finale: episode.is_finale || false,
    });
    setShowForm(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/seasons"
              className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
                <Tv className="h-6 w-6 text-burgundy-500" />
                Episodes
              </h1>
              <p className="text-neutral-500">
                Season {season?.number}: {season?.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="p-2 bg-burgundy-500 hover:bg-burgundy-600 rounded-xl transition-colors shadow-card"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Quick Generate */}
        {episodes?.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6 text-center">
            <Tv className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-display font-bold text-neutral-800 mb-2">
              No Episodes Yet
            </h3>
            <p className="text-neutral-500 mb-4">
              Generate all 14 episodes based on the premiere date, or add them manually.
            </p>
            <button
              onClick={() => generateEpisodes.mutate()}
              disabled={generateEpisodes.isPending}
              className="btn btn-primary"
            >
              {generateEpisodes.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Generate All Episodes
                </>
              )}
            </button>
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
            <h3 className="text-lg font-display font-bold text-neutral-800 mb-4">
              {editingId ? 'Edit Episode' : 'Add Episode'}
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="text-neutral-500 text-sm">Episode Number</span>
                <input
                  type="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <label className="block">
                <span className="text-neutral-500 text-sm">Title (Optional)</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Episode Title"
                  className="input mt-1"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="text-neutral-500 text-sm">Air Date</span>
                <input
                  type="datetime-local"
                  value={formData.air_date}
                  onChange={(e) => setFormData({ ...formData, air_date: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <label className="block">
                <span className="text-neutral-500 text-sm">Picks Lock At</span>
                <input
                  type="datetime-local"
                  value={formData.picks_lock_at}
                  onChange={(e) => setFormData({ ...formData, picks_lock_at: e.target.value })}
                  className="input mt-1"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="text-neutral-500 text-sm">Results Posted At</span>
                <input
                  type="datetime-local"
                  value={formData.results_posted_at}
                  onChange={(e) => setFormData({ ...formData, results_posted_at: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <label className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.is_finale}
                  onChange={(e) => setFormData({ ...formData, is_finale: e.target.checked })}
                  className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500"
                />
                <span className="text-neutral-700">Is Finale</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => saveEpisode.mutate()}
                disabled={saveEpisode.isPending}
                className="btn btn-primary flex-1"
              >
                {saveEpisode.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {editingId ? 'Update' : 'Create'}
                  </>
                )}
              </button>
              <button onClick={resetForm} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Episodes List */}
        <div className="space-y-3">
          {episodes?.map((episode: any) => (
            <div
              key={episode.id}
              className={`bg-white rounded-2xl shadow-card p-4 border ${
                episode.is_scored ? 'border-green-300' : 'border-cream-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cream-100 rounded-full flex items-center justify-center border border-cream-200">
                    <span className="text-burgundy-500 font-bold">{episode.number}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-neutral-800 font-medium">
                        {episode.title || `Episode ${episode.number}`}
                      </h3>
                      {episode.is_finale && <Star className="h-4 w-4 text-burgundy-500" />}
                      {episode.is_scored && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                          Scored
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-500 text-sm">
                      {formatDate(episode.air_date)} at {formatTime(episode.air_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(episode)}
                    className="p-2 hover:bg-cream-100 rounded-xl transition-colors"
                  >
                    <Edit2 className="h-4 w-4 text-neutral-500" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this episode?')) {
                        deleteEpisode.mutate(episode.id);
                      }
                    }}
                    className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500 mb-3">
                <div>
                  Picks Lock: {formatDate(episode.picks_lock_at)}{' '}
                  {formatTime(episode.picks_lock_at)}
                </div>
                <div>
                  Results: {formatDate(episode.results_posted_at)}{' '}
                  {formatTime(episode.results_posted_at)}
                </div>
              </div>

              {/* Actions based on episode status */}
              {!episode.is_scored ? (
                <Link
                  to={`/admin/episodes/${episode.id}/scoring`}
                  className="block w-full bg-burgundy-50 hover:bg-burgundy-100 text-burgundy-600 py-2 rounded-xl text-sm font-medium text-center transition-colors"
                >
                  Enter Scores
                </Link>
              ) : episode.results_released_at ? (
                <div className="flex items-center justify-center gap-2 text-green-600 text-sm py-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    Results Released {new Date(episode.results_released_at).toLocaleDateString()}
                  </span>
                </div>
              ) : episode.results_locked_at ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 text-amber-600 text-sm py-2">
                    <Lock className="h-4 w-4" />
                    <span>
                      Locked - releasing automatically
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          'Release results immediately? This will send spoiler-safe notifications to all users.'
                        )
                      ) {
                        releaseResults.mutate(episode.id);
                      }
                    }}
                    disabled={releaseResults.isPending}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {releaseResults.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Releasing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Release Now</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        'Lock results for release? They will be sent automatically within 15 minutes.'
                      )
                    ) {
                      lockResults.mutate(episode.id);
                    }
                  }}
                  disabled={lockResults.isPending}
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-600 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {lockResults.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Locking...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Lock Results for Release</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
