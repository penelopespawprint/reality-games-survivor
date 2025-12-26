import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Trophy, Star, History } from 'lucide-react';

interface Castaway {
  id: string;
  name: string;
  age: number | null;
  hometown: string | null;
  occupation: string | null;
  photo_url: string | null;
  status: 'active' | 'eliminated' | 'winner';
  placement: number | null;
  previous_seasons: string[] | null;
  best_placement: number | null;
  fun_fact: string | null;
}

interface UserProfile {
  id: string;
  display_name: string;
  role: string;
}

interface Episode {
  id: string;
  number: number;
  title: string | null;
}

export function AdminCastaways() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEliminateModal, setShowEliminateModal] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('');
  const [editForm, setEditForm] = useState<{
    name: string;
    age: string;
    hometown: string;
    occupation: string;
    photo_url: string;
    previous_seasons: string;
    best_placement: string;
    fun_fact: string;
  }>({
    name: '',
    age: '',
    hometown: '',
    occupation: '',
    photo_url: '',
    previous_seasons: '',
    best_placement: '',
    fun_fact: '',
  });

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

  const { data: castaways, isLoading } = useQuery({
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

  const { data: episodes } = useQuery({
    queryKey: ['episodes', activeSeason?.id],
    queryFn: async () => {
      if (!activeSeason?.id) return [];
      const { data, error } = await supabase
        .from('episodes')
        .select('id, number, title')
        .eq('season_id', activeSeason.id)
        .order('number');
      if (error) throw error;
      return data as Episode[];
    },
    enabled: !!activeSeason?.id,
  });

  const eliminateMutation = useMutation({
    mutationFn: async ({
      castawayId,
      episodeId,
      placement,
    }: {
      castawayId: string;
      episodeId: string;
      placement?: number;
    }) => {
      const { error } = await supabase
        .from('castaways')
        .update({
          status: 'eliminated',
          eliminated_episode_id: episodeId,
          placement: placement || null,
        })
        .eq('id', castawayId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['castaways'] });
      setShowEliminateModal(null);
      setSelectedEpisodeId('');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (castawayId: string) => {
      const { error } = await supabase
        .from('castaways')
        .update({
          status: 'active',
          eliminated_episode_id: null,
          placement: null,
        })
        .eq('id', castawayId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['castaways'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ castawayId, data }: { castawayId: string; data: Partial<Castaway> }) => {
      const { error } = await supabase.from('castaways').update(data).eq('id', castawayId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['castaways'] });
      setEditingId(null);
    },
  });

  const startEditing = (castaway: Castaway) => {
    setEditingId(castaway.id);
    setEditForm({
      name: castaway.name,
      age: castaway.age?.toString() || '',
      hometown: castaway.hometown || '',
      occupation: castaway.occupation || '',
      photo_url: castaway.photo_url || '',
      previous_seasons: castaway.previous_seasons?.join(', ') || '',
      best_placement: castaway.best_placement?.toString() || '',
      fun_fact: castaway.fun_fact || '',
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const previousSeasons = editForm.previous_seasons
      ? editForm.previous_seasons
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s)
      : null;
    updateMutation.mutate({
      castawayId: editingId,
      data: {
        name: editForm.name,
        age: editForm.age ? parseInt(editForm.age) : null,
        hometown: editForm.hometown || null,
        occupation: editForm.occupation || null,
        photo_url: editForm.photo_url || null,
        previous_seasons: previousSeasons,
        best_placement: editForm.best_placement ? parseInt(editForm.best_placement) : null,
        fun_fact: editForm.fun_fact || null,
      },
    });
  };

  const hasWonBefore = (castaway: Castaway) => castaway.best_placement === 1;

  // Generate a DiceBear avatar URL from castaway name
  const generatePhotoUrl = (name: string) => {
    const encodedName = encodeURIComponent(name);
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodedName}&backgroundColor=8B0000&textColor=ffffff&fontSize=40`;
  };

  // Bulk update all castaways with auto-generated photo URLs
  const autoPopulatePhotosMutation = useMutation({
    mutationFn: async () => {
      if (!castaways) return { updated: 0 };

      const updates = castaways
        .filter((c) => !c.photo_url)
        .map((c) => ({
          id: c.id,
          photo_url: generatePhotoUrl(c.name),
        }));

      for (const update of updates) {
        const { error } = await supabase
          .from('castaways')
          .update({ photo_url: update.photo_url })
          .eq('id', update.id);
        if (error) throw error;
      }

      return { updated: updates.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['castaways'] });
    },
  });

  const missingPhotosCount = castaways?.filter((c) => !c.photo_url).length || 0;

  const activeCastaways = castaways?.filter((c) => c.status === 'active') || [];
  const eliminatedCastaways = castaways?.filter((c) => c.status === 'eliminated') || [];

  if (profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-elevated p-12">
            <h1 className="text-2xl font-display text-neutral-800 mb-3">Access Denied</h1>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <h1 className="text-2xl font-display text-neutral-800">Manage Castaways</h1>
            </div>
            <p className="text-neutral-500">
              {activeCastaways.length} active, {eliminatedCastaways.length} eliminated
            </p>
          </div>
          {missingPhotosCount > 0 && (
            <button
              onClick={() => autoPopulatePhotosMutation.mutate()}
              disabled={autoPopulatePhotosMutation.isPending}
              className="btn bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {autoPopulatePhotosMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Populating...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  Auto-Populate {missingPhotosCount} Photos
                </>
              )}
            </button>
          )}
        </div>

        {/* Active Castaways */}
        <div className="bg-white rounded-2xl shadow-elevated overflow-hidden mb-8 animate-slide-up">
          <div className="p-6 border-b border-cream-100 bg-green-50">
            <h2 className="font-semibold text-green-800">
              Active Castaways ({activeCastaways.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 mx-auto border-2 border-burgundy-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {activeCastaways.map((castaway) => (
                <div
                  key={castaway.id}
                  className={`rounded-xl p-4 flex items-center gap-4 ${hasWonBefore(castaway) ? 'bg-yellow-50 border border-yellow-200' : 'bg-cream-50'}`}
                >
                  <div className="relative w-14 h-14 bg-cream-200 rounded-xl flex items-center justify-center overflow-hidden">
                    {castaway.photo_url ? (
                      <img
                        src={castaway.photo_url}
                        alt={castaway.name}
                        className="w-14 h-14 object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-neutral-400">
                        {castaway.name.charAt(0)}
                      </span>
                    )}
                    {hasWonBefore(castaway) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                        <Trophy className="h-3 w-3 text-yellow-900" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-800 truncate">{castaway.name}</p>
                      {castaway.previous_seasons && castaway.previous_seasons.length > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          <History className="h-3 w-3" />
                          {castaway.previous_seasons.length}x
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500">
                      {castaway.occupation || 'No occupation'}
                    </p>
                    {!castaway.photo_url && (
                      <p className="text-xs text-orange-500">Missing photo</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => startEditing(castaway)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowEliminateModal(castaway.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                      Eliminate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eliminated Castaways */}
        {eliminatedCastaways.length > 0 && (
          <div
            className="bg-white rounded-2xl shadow-elevated overflow-hidden animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="p-6 border-b border-cream-100 bg-neutral-50">
              <h2 className="font-semibold text-neutral-600">
                Eliminated ({eliminatedCastaways.length})
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {eliminatedCastaways.map((castaway) => (
                <div
                  key={castaway.id}
                  className="bg-neutral-50 rounded-xl p-4 flex items-center gap-4 opacity-75"
                >
                  <div className="relative w-14 h-14 bg-neutral-200 rounded-xl flex items-center justify-center overflow-hidden grayscale">
                    {castaway.photo_url ? (
                      <img
                        src={castaway.photo_url}
                        alt={castaway.name}
                        className="w-14 h-14 object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-neutral-400">
                        {castaway.name.charAt(0)}
                      </span>
                    )}
                    {hasWonBefore(castaway) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                        <Trophy className="h-3 w-3 text-yellow-900" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-600 truncate">{castaway.name}</p>
                      {castaway.previous_seasons && castaway.previous_seasons.length > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          <History className="h-3 w-3" />
                          {castaway.previous_seasons.length}x
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-400">
                      {castaway.placement ? `#${castaway.placement}` : 'Eliminated'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => startEditing(castaway)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => reactivateMutation.mutate(castaway.id)}
                      disabled={reactivateMutation.isPending}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      Reactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eliminate Modal */}
        {showEliminateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 animate-slide-up">
              <h3 className="text-xl font-display text-neutral-800 mb-4">Eliminate Castaway</h3>
              <p className="text-neutral-500 mb-6">
                Select the episode when {castaways?.find((c) => c.id === showEliminateModal)?.name}{' '}
                was eliminated.
              </p>

              <select
                value={selectedEpisodeId}
                onChange={(e) => setSelectedEpisodeId(e.target.value)}
                className="w-full p-3 border border-cream-200 rounded-xl mb-6 focus:ring-2 focus:ring-burgundy-500"
              >
                <option value="">Select episode...</option>
                {episodes?.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    Episode {ep.number}: {ep.title || 'TBD'}
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEliminateModal(null);
                    setSelectedEpisodeId('');
                  }}
                  className="flex-1 btn bg-cream-100 text-neutral-700 hover:bg-cream-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedEpisodeId) {
                      eliminateMutation.mutate({
                        castawayId: showEliminateModal,
                        episodeId: selectedEpisodeId,
                      });
                    }
                  }}
                  disabled={!selectedEpisodeId || eliminateMutation.isPending}
                  className="flex-1 btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {eliminateMutation.isPending ? 'Eliminating...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-elevated max-w-lg w-full p-6 animate-slide-up my-8">
              <h3 className="text-xl font-display text-neutral-800 mb-6">Edit Castaway</h3>

              <div className="space-y-4">
                {/* Photo URL */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    value={editForm.photo_url}
                    onChange={(e) => setEditForm({ ...editForm, photo_url: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
                  />
                  {editForm.photo_url && (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={editForm.photo_url}
                        alt="Preview"
                        className="w-16 h-16 rounded-xl object-cover border border-cream-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="text-xs text-green-600">Preview</span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
                  />
                </div>

                {/* Age & Hometown */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Age</label>
                    <input
                      type="number"
                      value={editForm.age}
                      onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                      className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Hometown
                    </label>
                    <input
                      type="text"
                      value={editForm.hometown}
                      onChange={(e) => setEditForm({ ...editForm, hometown: e.target.value })}
                      className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
                    />
                  </div>
                </div>

                {/* Occupation */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={editForm.occupation}
                    onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                    className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
                  />
                </div>

                {/* Returning Player Section */}
                <div className="border-t border-cream-200 pt-4 mt-4">
                  <h4 className="font-medium text-neutral-800 mb-3 flex items-center gap-2">
                    <History className="h-4 w-4 text-purple-500" />
                    Returning Player Info
                  </h4>

                  {/* Previous Seasons */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Previous Seasons{' '}
                      <span className="text-neutral-400 font-normal">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.previous_seasons}
                      onChange={(e) =>
                        setEditForm({ ...editForm, previous_seasons: e.target.value })
                      }
                      placeholder="Heroes vs. Villains, Winners at War"
                      className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
                    />
                  </div>

                  {/* Best Placement */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Best Placement{' '}
                      <span className="text-neutral-400 font-normal">(1 = winner)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.best_placement}
                      onChange={(e) => setEditForm({ ...editForm, best_placement: e.target.value })}
                      placeholder="1"
                      className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
                    />
                    {editForm.best_placement === '1' && (
                      <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> Will show winner badge
                      </p>
                    )}
                  </div>
                </div>

                {/* Fun Fact */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Fun Fact
                  </label>
                  <textarea
                    value={editForm.fun_fact}
                    onChange={(e) => setEditForm({ ...editForm, fun_fact: e.target.value })}
                    placeholder="Interesting trivia about this castaway..."
                    rows={3}
                    className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 btn bg-cream-100 text-neutral-700 hover:bg-cream-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={updateMutation.isPending || !editForm.name}
                  className="flex-1 btn bg-burgundy-600 text-white hover:bg-burgundy-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
