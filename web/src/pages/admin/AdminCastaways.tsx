import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AppNav } from '@/components/AppNav';

interface Castaway {
  id: string;
  name: string;
  age: number | null;
  hometown: string | null;
  occupation: string | null;
  photo_url: string | null;
  tribe_original: string | null;
  status: 'active' | 'eliminated' | 'winner';
  placement: number | null;
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
    mutationFn: async ({ castawayId, episodeId, placement }: { castawayId: string; episodeId: string; placement?: number }) => {
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

  const activeCastaways = castaways?.filter(c => c.status === 'active') || [];
  const eliminatedCastaways = castaways?.filter(c => c.status === 'eliminated') || [];

  if (profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <AppNav userName={profile?.display_name} userInitial={profile?.display_name?.charAt(0).toUpperCase()} />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-elevated p-12">
            <h1 className="text-2xl font-display text-neutral-800 mb-3">Access Denied</h1>
            <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <AppNav
        userName={profile?.display_name}
        userInitial={profile?.display_name?.charAt(0).toUpperCase()}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/admin" className="text-neutral-400 hover:text-neutral-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-display text-neutral-800">Manage Castaways</h1>
            </div>
            <p className="text-neutral-500">
              {activeCastaways.length} active, {eliminatedCastaways.length} eliminated
            </p>
          </div>
        </div>

        {/* Active Castaways */}
        <div className="bg-white rounded-2xl shadow-elevated overflow-hidden mb-8 animate-slide-up">
          <div className="p-6 border-b border-cream-100 bg-green-50">
            <h2 className="font-semibold text-green-800">Active Castaways ({activeCastaways.length})</h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 mx-auto border-2 border-burgundy-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {activeCastaways.map((castaway) => (
                <div key={castaway.id} className="bg-cream-50 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-14 h-14 bg-cream-200 rounded-xl flex items-center justify-center overflow-hidden">
                    {castaway.photo_url ? (
                      <img src={castaway.photo_url} alt={castaway.name} className="w-14 h-14 object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-neutral-400">{castaway.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-800 truncate">{castaway.name}</p>
                    <p className="text-sm text-neutral-500">{castaway.tribe_original}</p>
                  </div>
                  <button
                    onClick={() => setShowEliminateModal(castaway.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    Eliminate
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eliminated Castaways */}
        {eliminatedCastaways.length > 0 && (
          <div className="bg-white rounded-2xl shadow-elevated overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="p-6 border-b border-cream-100 bg-neutral-50">
              <h2 className="font-semibold text-neutral-600">Eliminated ({eliminatedCastaways.length})</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {eliminatedCastaways.map((castaway) => (
                <div key={castaway.id} className="bg-neutral-50 rounded-xl p-4 flex items-center gap-4 opacity-75">
                  <div className="w-14 h-14 bg-neutral-200 rounded-xl flex items-center justify-center overflow-hidden grayscale">
                    {castaway.photo_url ? (
                      <img src={castaway.photo_url} alt={castaway.name} className="w-14 h-14 object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-neutral-400">{castaway.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-600 truncate">{castaway.name}</p>
                    <p className="text-sm text-neutral-400">
                      {castaway.placement ? `#${castaway.placement}` : 'Eliminated'}
                    </p>
                  </div>
                  <button
                    onClick={() => reactivateMutation.mutate(castaway.id)}
                    disabled={reactivateMutation.isPending}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    Reactivate
                  </button>
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
                Select the episode when {castaways?.find(c => c.id === showEliminateModal)?.name} was eliminated.
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
      </main>
    </div>
  );
}
