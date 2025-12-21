import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Plus, Check, Loader2, Star, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function AdminSeasons() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    number: '',
    name: '',
    registration_opens_at: '',
    draft_order_deadline: '',
    registration_closes_at: '',
    premiere_at: '',
    draft_deadline: '',
    finale_at: '',
  });

  // Fetch all seasons
  const { data: seasons, isLoading } = useQuery({
    queryKey: ['admin-seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('number', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create/update season mutation
  const saveSeason = useMutation({
    mutationFn: async () => {
      const payload = {
        number: parseInt(formData.number),
        name: formData.name,
        registration_opens_at: formData.registration_opens_at,
        draft_order_deadline: formData.draft_order_deadline,
        registration_closes_at: formData.registration_closes_at,
        premiere_at: formData.premiere_at,
        draft_deadline: formData.draft_deadline,
        finale_at: formData.finale_at || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('seasons')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('seasons')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seasons'] });
      resetForm();
    },
  });

  // Activate season mutation
  const activateSeason = useMutation({
    mutationFn: async (seasonId: string) => {
      // Deactivate all seasons first
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .neq('id', 'placeholder');

      // Activate the selected season
      const { error } = await supabase
        .from('seasons')
        .update({ is_active: true })
        .eq('id', seasonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seasons'] });
    },
  });

  // Delete season mutation
  const deleteSeason = useMutation({
    mutationFn: async (seasonId: string) => {
      const { error } = await supabase
        .from('seasons')
        .delete()
        .eq('id', seasonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seasons'] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      number: '',
      name: '',
      registration_opens_at: '',
      draft_order_deadline: '',
      registration_closes_at: '',
      premiere_at: '',
      draft_deadline: '',
      finale_at: '',
    });
  };

  const startEdit = (season: any) => {
    setEditingId(season.id);
    setFormData({
      number: season.number.toString(),
      name: season.name,
      registration_opens_at: season.registration_opens_at?.slice(0, 16) || '',
      draft_order_deadline: season.draft_order_deadline?.slice(0, 16) || '',
      registration_closes_at: season.registration_closes_at?.slice(0, 16) || '',
      premiere_at: season.premiere_at?.slice(0, 16) || '',
      draft_deadline: season.draft_deadline?.slice(0, 16) || '',
      finale_at: season.finale_at?.slice(0, 16) || '',
    });
    setShowForm(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <Calendar className="h-6 w-6 text-gold-500" />
              Manage Seasons
            </h1>
            <p className="text-burgundy-200">{seasons?.length || 0} seasons</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="p-2 bg-gold-500 hover:bg-gold-400 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5 text-burgundy-900" />
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
          <h3 className="text-lg font-display font-bold text-white mb-4">
            {editingId ? 'Edit Season' : 'Create Season'}
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="text-burgundy-200 text-sm">Season Number</span>
              <input
                type="number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white mt-1"
              />
            </label>
            <label className="block">
              <span className="text-burgundy-200 text-sm">Season Name</span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Survivor 50"
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white mt-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="text-burgundy-200 text-sm">Registration Opens</span>
              <input
                type="datetime-local"
                value={formData.registration_opens_at}
                onChange={(e) => setFormData({ ...formData, registration_opens_at: e.target.value })}
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white mt-1"
              />
            </label>
            <label className="block">
              <span className="text-burgundy-200 text-sm">Registration Closes</span>
              <input
                type="datetime-local"
                value={formData.registration_closes_at}
                onChange={(e) => setFormData({ ...formData, registration_closes_at: e.target.value })}
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white mt-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="text-burgundy-200 text-sm">Draft Order Deadline</span>
              <input
                type="datetime-local"
                value={formData.draft_order_deadline}
                onChange={(e) => setFormData({ ...formData, draft_order_deadline: e.target.value })}
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white mt-1"
              />
            </label>
            <label className="block">
              <span className="text-burgundy-200 text-sm">Draft Deadline</span>
              <input
                type="datetime-local"
                value={formData.draft_deadline}
                onChange={(e) => setFormData({ ...formData, draft_deadline: e.target.value })}
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white mt-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="text-burgundy-200 text-sm">Premiere Date</span>
              <input
                type="datetime-local"
                value={formData.premiere_at}
                onChange={(e) => setFormData({ ...formData, premiere_at: e.target.value })}
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white mt-1"
              />
            </label>
            <label className="block">
              <span className="text-burgundy-200 text-sm">Finale Date</span>
              <input
                type="datetime-local"
                value={formData.finale_at}
                onChange={(e) => setFormData({ ...formData, finale_at: e.target.value })}
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white mt-1"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => saveSeason.mutate()}
              disabled={saveSeason.isPending}
              className="flex-1 bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saveSeason.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {editingId ? 'Update' : 'Create'}
                </>
              )}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-burgundy-700 hover:bg-burgundy-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Seasons List */}
      <div className="space-y-3">
        {seasons?.map((season: any) => (
          <div
            key={season.id}
            className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border ${
              season.is_active ? 'border-gold-500/50' : 'border-white/10'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-display font-bold text-white">
                    Season {season.number}
                  </h3>
                  {season.is_active && (
                    <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-xs rounded-full flex items-center gap-1">
                      <Star className="h-3 w-3" /> Active
                    </span>
                  )}
                </div>
                <p className="text-burgundy-200">{season.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(season)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4 text-burgundy-300" />
                </button>
                {!season.is_active && (
                  <button
                    onClick={() => {
                      if (confirm('Delete this season? This cannot be undone.')) {
                        deleteSeason.mutate(season.id);
                      }
                    }}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <span className="text-burgundy-400">Premiere:</span>
                <span className="text-white ml-2">{formatDate(season.premiere_at)}</span>
              </div>
              <div>
                <span className="text-burgundy-400">Finale:</span>
                <span className="text-white ml-2">{formatDate(season.finale_at)}</span>
              </div>
              <div>
                <span className="text-burgundy-400">Registration:</span>
                <span className="text-white ml-2">{formatDate(season.registration_opens_at)}</span>
              </div>
              <div>
                <span className="text-burgundy-400">Draft Deadline:</span>
                <span className="text-white ml-2">{formatDate(season.draft_deadline)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {!season.is_active && (
                <button
                  onClick={() => activateSeason.mutate(season.id)}
                  disabled={activateSeason.isPending}
                  className="flex-1 bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Set as Active
                </button>
              )}
              <Link
                to={`/admin/seasons/${season.id}/episodes`}
                className="flex-1 bg-burgundy-700 hover:bg-burgundy-600 text-white py-2 rounded-lg text-sm font-medium text-center transition-colors"
              >
                Manage Episodes
              </Link>
              <Link
                to={`/admin/seasons/${season.id}/castaways`}
                className="flex-1 bg-burgundy-700 hover:bg-burgundy-600 text-white py-2 rounded-lg text-sm font-medium text-center transition-colors"
              >
                Castaways
              </Link>
            </div>
          </div>
        ))}

        {seasons?.length === 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
            <Calendar className="h-12 w-12 text-burgundy-400 mx-auto mb-4" />
            <p className="text-burgundy-200">No seasons yet. Create your first season!</p>
          </div>
        )}
      </div>
    </div>
  );
}
