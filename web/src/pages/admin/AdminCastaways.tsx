/**
 * Admin Castaways Page
 *
 * Manage castaways - edit details, eliminate, reactivate.
 * Refactored from 676 lines to use extracted sub-components.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Star } from 'lucide-react';
import { CastawayCard, EliminateModal, EditCastawayModal } from '@/components/admin/castaways';

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

interface EditFormData {
  name: string;
  age: string;
  hometown: string;
  occupation: string;
  photo_url: string;
  previous_seasons: string;
  best_placement: string;
  fun_fact: string;
}

export function AdminCastaways() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEliminateModal, setShowEliminateModal] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('');
  const [editForm, setEditForm] = useState<EditFormData>({
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
                <CastawayCard
                  key={castaway.id}
                  castaway={castaway}
                  onEdit={() => startEditing(castaway)}
                  onEliminate={() => setShowEliminateModal(castaway.id)}
                />
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
                <CastawayCard
                  key={castaway.id}
                  castaway={castaway}
                  isEliminated
                  onEdit={() => startEditing(castaway)}
                  onReactivate={() => reactivateMutation.mutate(castaway.id)}
                  isReactivating={reactivateMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Eliminate Modal */}
        {showEliminateModal && (
          <EliminateModal
            castawayName={castaways?.find((c) => c.id === showEliminateModal)?.name || ''}
            episodes={episodes || []}
            selectedEpisodeId={selectedEpisodeId}
            onEpisodeChange={setSelectedEpisodeId}
            onConfirm={() => {
              if (selectedEpisodeId) {
                eliminateMutation.mutate({
                  castawayId: showEliminateModal,
                  episodeId: selectedEpisodeId,
                });
              }
            }}
            onCancel={() => {
              setShowEliminateModal(null);
              setSelectedEpisodeId('');
            }}
            isPending={eliminateMutation.isPending}
          />
        )}

        {/* Edit Modal */}
        {editingId && (
          <EditCastawayModal
            formData={editForm}
            onFormChange={setEditForm}
            onSave={saveEdit}
            onCancel={() => setEditingId(null)}
            isPending={updateMutation.isPending}
          />
        )}
      </main>
    </div>
  );
}
