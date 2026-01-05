/**
 * Admin Castaways Page
 *
 * Manage castaways - edit details, eliminate, reactivate.
 * Refactored to use extracted sub-components.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';
import {
  CastawayGrid,
  EliminateModal,
  EditCastawayModal,
  BulkActions,
  type EditFormData,
} from '@/components/admin/castaways';
import type { Castaway, UserProfile, Episode } from '@/types';
import type { Tribe } from '@/components/admin/castaways/types';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

async function apiWithAuth(endpoint: string, options?: RequestInit) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return response.json();
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
    tribe_original: '',
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

  // Fetch tribes for the season
  const { data: tribes } = useQuery<Tribe[]>({
    queryKey: ['tribes', activeSeason?.id],
    queryFn: async () => {
      if (!activeSeason?.id) return [];
      const { data, error } = await supabase
        .from('tribes' as 'castaways') // Type workaround until types are regenerated
        .select('*')
        .eq('season_id', activeSeason.id)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as unknown as Tribe[];
    },
    enabled: !!activeSeason?.id,
  });

  // Eliminate castaway - uses backend API for proper authorization and notifications
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
      return apiWithAuth(`/api/admin/castaways/${castawayId}/eliminate`, {
        method: 'POST',
        body: JSON.stringify({ episode_id: episodeId, placement }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['castaways'] });
      setShowEliminateModal(null);
      setSelectedEpisodeId('');
    },
  });

  // Reactivate castaway - uses backend API for proper authorization
  const reactivateMutation = useMutation({
    mutationFn: async (castawayId: string) => {
      return apiWithAuth(`/api/admin/castaways/${castawayId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'active',
          eliminated_episode_id: null,
          placement: null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['castaways'] });
    },
  });

  // Update castaway - uses backend API for proper authorization
  const updateMutation = useMutation({
    mutationFn: async ({ castawayId, data }: { castawayId: string; data: Partial<Castaway> }) => {
      return apiWithAuth(`/api/admin/castaways/${castawayId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
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
      tribe_original: castaway.tribe_original || '',
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

    // Validate age (must be positive integer or empty)
    const age = editForm.age ? parseInt(editForm.age) : null;
    if (age !== null && (isNaN(age) || age < 1 || age > 120)) {
      alert('Age must be a valid number between 1 and 120');
      return;
    }

    // Validate best_placement (must be positive integer 1-24 or empty)
    const bestPlacement = editForm.best_placement ? parseInt(editForm.best_placement) : null;
    if (
      bestPlacement !== null &&
      (isNaN(bestPlacement) || bestPlacement < 1 || bestPlacement > 24)
    ) {
      alert('Best placement must be between 1 and 24');
      return;
    }

    updateMutation.mutate({
      castawayId: editingId,
      data: {
        name: editForm.name,
        age,
        hometown: editForm.hometown || null,
        occupation: editForm.occupation || null,
        photo_url: editForm.photo_url || null,
        tribe_original: editForm.tribe_original || null,
        previous_seasons: previousSeasons,
        best_placement: bestPlacement,
        fun_fact: editForm.fun_fact || null,
      },
    });
  };

  // Generate a DiceBear avatar URL from castaway name
  const generatePhotoUrl = (name: string) => {
    const encodedName = encodeURIComponent(name);
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodedName}&backgroundColor=8B0000&textColor=ffffff&fontSize=40`;
  };

  // Bulk update all castaways with auto-generated photo URLs - uses backend API
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
        await apiWithAuth(`/api/admin/castaways/${update.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ photo_url: update.photo_url }),
        });
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
        <AdminNavBar />
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
      <AdminNavBar />

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
          <BulkActions
            missingPhotosCount={missingPhotosCount}
            onAutoPopulatePhotos={() => autoPopulatePhotosMutation.mutate()}
            isPending={autoPopulatePhotosMutation.isPending}
          />
        </div>

        {/* Active Castaways Grid */}
        <div className="mb-8">
          <CastawayGrid
            castaways={activeCastaways}
            isLoading={isLoading}
            variant="active"
            onEdit={startEditing}
            onEliminate={(id) => setShowEliminateModal(id)}
          />
        </div>

        {/* Eliminated Castaways Grid */}
        <div style={{ animationDelay: '0.1s' }}>
          <CastawayGrid
            castaways={eliminatedCastaways}
            variant="eliminated"
            onEdit={startEditing}
            onReactivate={(id) => reactivateMutation.mutate(id)}
            isReactivating={reactivateMutation.isPending}
          />
        </div>

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
            tribes={tribes}
          />
        )}
      </main>
    </div>
  );
}
