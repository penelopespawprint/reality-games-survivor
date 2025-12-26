import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Check,
  Loader2,
  Star,
  Edit2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Navigation } from '@/components/Navigation';

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

  const [dateErrors, setDateErrors] = useState<string[]>([]);

  // Validate date order
  const validateDates = (): boolean => {
    const errors: string[] = [];

    const regOpens = formData.registration_opens_at
      ? new Date(formData.registration_opens_at)
      : null;
    const draftOrder = formData.draft_order_deadline
      ? new Date(formData.draft_order_deadline)
      : null;
    const regCloses = formData.registration_closes_at
      ? new Date(formData.registration_closes_at)
      : null;
    const premiere = formData.premiere_at ? new Date(formData.premiere_at) : null;
    const draftDeadline = formData.draft_deadline ? new Date(formData.draft_deadline) : null;
    const finale = formData.finale_at ? new Date(formData.finale_at) : null;

    // Required field checks
    if (!formData.number) errors.push('Season number is required');
    if (!formData.name) errors.push('Season name is required');
    if (!regOpens) errors.push('Registration opens date is required');
    if (!draftOrder) errors.push('Draft order deadline is required');
    if (!regCloses) errors.push('Registration closes date is required');
    if (!premiere) errors.push('Premiere date is required');
    if (!draftDeadline) errors.push('Draft deadline is required');

    // Date order validation
    if (regOpens && draftOrder && regOpens >= draftOrder) {
      errors.push('Registration must open before draft order deadline');
    }
    if (draftOrder && regCloses && draftOrder >= regCloses) {
      errors.push('Draft order deadline must be before registration closes');
    }
    if (regCloses && premiere && regCloses > premiere) {
      errors.push('Registration must close before or on premiere date');
    }
    if (premiere && draftDeadline && premiere > draftDeadline) {
      errors.push('Premiere must be before or on draft deadline');
    }
    if (draftDeadline && finale && draftDeadline >= finale) {
      errors.push('Draft deadline must be before finale');
    }
    if (premiere && finale && premiere >= finale) {
      errors.push('Premiere must be before finale');
    }

    setDateErrors(errors);
    return errors.length === 0;
  };

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
        const { error } = await supabase.from('seasons').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('seasons').insert(payload);
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
      // Deactivate all other seasons first
      const { error: deactivateError } = await supabase
        .from('seasons')
        .update({ is_active: false })
        .neq('id', seasonId);
      if (deactivateError) throw deactivateError;

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
      const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seasons'] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setDateErrors([]);
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

  const handleSave = () => {
    if (!validateDates()) {
      return;
    }
    saveSeason.mutate();
  };

  const startEdit = (season: any) => {
    setDateErrors([]);
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
              >
                <ArrowLeft className="h-5 w-5 text-neutral-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-orange-500" />
                  Manage Seasons
                </h1>
                <p className="text-neutral-500">{seasons?.length || 0} seasons</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              New Season
            </button>
          </div>

          {/* Create/Edit Form */}
          {showForm && (
            <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
              <h3 className="text-lg font-display font-bold text-neutral-800 mb-4">
                {editingId ? 'Edit Season' : 'Create Season'}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="text-neutral-500 text-sm">Season Number</span>
                  <input
                    type="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="input mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-neutral-500 text-sm">Season Name</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Survivor 50"
                    className="input mt-1"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="text-neutral-500 text-sm">Registration Opens</span>
                  <input
                    type="datetime-local"
                    value={formData.registration_opens_at}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_opens_at: e.target.value })
                    }
                    className="input mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-neutral-500 text-sm">Registration Closes</span>
                  <input
                    type="datetime-local"
                    value={formData.registration_closes_at}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_closes_at: e.target.value })
                    }
                    className="input mt-1"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="text-neutral-500 text-sm">Draft Order Deadline</span>
                  <input
                    type="datetime-local"
                    value={formData.draft_order_deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, draft_order_deadline: e.target.value })
                    }
                    className="input mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-neutral-500 text-sm">Draft Deadline</span>
                  <input
                    type="datetime-local"
                    value={formData.draft_deadline}
                    onChange={(e) => setFormData({ ...formData, draft_deadline: e.target.value })}
                    className="input mt-1"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="text-neutral-500 text-sm">Premiere Date</span>
                  <input
                    type="datetime-local"
                    value={formData.premiere_at}
                    onChange={(e) => setFormData({ ...formData, premiere_at: e.target.value })}
                    className="input mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-neutral-500 text-sm">Finale Date</span>
                  <input
                    type="datetime-local"
                    value={formData.finale_at}
                    onChange={(e) => setFormData({ ...formData, finale_at: e.target.value })}
                    className="input mt-1"
                  />
                </label>
              </div>

              {/* Validation Errors */}
              {dateErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Please fix the following errors:</p>
                      <ul className="mt-2 space-y-1 text-sm text-red-600">
                        {dateErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saveSeason.isPending}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
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
                  className="bg-cream-100 hover:bg-cream-200 text-neutral-700 py-2 px-4 rounded-xl font-medium transition-colors"
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
                className={`bg-white rounded-2xl shadow-card p-4 border ${
                  season.is_active ? 'border-orange-300 ring-2 ring-orange-100' : 'border-cream-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-display font-bold text-neutral-800">
                        Season {season.number}
                      </h3>
                      {season.is_active && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full flex items-center gap-1">
                          <Star className="h-3 w-3" /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-500">{season.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(season)}
                      className="p-2 hover:bg-cream-100 rounded-xl transition-colors"
                    >
                      <Edit2 className="h-4 w-4 text-neutral-500" />
                    </button>
                    {!season.is_active && (
                      <button
                        onClick={() => {
                          if (confirm('Delete this season? This cannot be undone.')) {
                            deleteSeason.mutate(season.id);
                          }
                        }}
                        className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-neutral-400">Premiere:</span>
                    <span className="text-neutral-700 ml-2">{formatDate(season.premiere_at)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Finale:</span>
                    <span className="text-neutral-700 ml-2">{formatDate(season.finale_at)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Registration:</span>
                    <span className="text-neutral-700 ml-2">
                      {formatDate(season.registration_opens_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Draft Deadline:</span>
                    <span className="text-neutral-700 ml-2">
                      {formatDate(season.draft_deadline)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!season.is_active && (
                    <button
                      onClick={() => activateSeason.mutate(season.id)}
                      disabled={activateSeason.isPending}
                      className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-600 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      Set as Active
                    </button>
                  )}
                  <Link
                    to={`/admin/seasons/${season.id}/episodes`}
                    className="flex-1 bg-cream-100 hover:bg-cream-200 text-neutral-700 py-2 rounded-xl text-sm font-medium text-center transition-colors"
                  >
                    Manage Episodes
                  </Link>
                  <Link
                    to={`/admin/seasons/${season.id}/castaways`}
                    className="flex-1 bg-cream-100 hover:bg-cream-200 text-neutral-700 py-2 rounded-xl text-sm font-medium text-center transition-colors"
                  >
                    Castaways
                  </Link>
                </div>
              </div>
            ))}

            {seasons?.length === 0 && (
              <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 text-center">
                <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-500">No seasons yet. Create your first season!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
