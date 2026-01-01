/**
 * Admin Announcements Page
 *
 * CRUD interface for managing announcements displayed on the dashboard.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Megaphone,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Save,
  Clock,
} from 'lucide-react';
import { apiWithAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AdminNavigation } from '@/components/AdminNavigation';
import { formatDistanceToNow, format } from 'date-fns';

type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: Priority;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  created_by: string | null;
}

interface AnnouncementForm {
  title: string;
  content: string;
  priority: Priority;
  is_active: boolean;
  expires_at: string;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
];

const getPriorityStyle = (priority: Priority) => {
  const option = PRIORITY_OPTIONS.find((p) => p.value === priority);
  return option?.color || 'bg-gray-100 text-gray-700';
};

const getPriorityIcon = (priority: Priority) => {
  switch (priority) {
    case 'urgent':
      return <AlertTriangle className="h-4 w-4" />;
    case 'high':
      return <Megaphone className="h-4 w-4" />;
    case 'medium':
      return <Info className="h-4 w-4" />;
    default:
      return <CheckCircle2 className="h-4 w-4" />;
  }
};

export function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementForm>({
    title: '',
    content: '',
    priority: 'medium',
    is_active: true,
    expires_at: '',
  });

  // Fetch announcements
  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await apiWithAuth<{ announcements: Announcement[]; total: number }>(
        '/admin/announcements',
        session.access_token
      );

      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: !!session?.access_token,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: AnnouncementForm) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await apiWithAuth<{ announcement: Announcement }>(
        '/admin/announcements',
        session.access_token,
        {
          method: 'POST',
          body: JSON.stringify({
            ...data,
            expires_at: data.expires_at || null,
          }),
        }
      );

      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setIsCreating(false);
      resetForm();
    },
    onError: (err: Error) => setError(err.message),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnnouncementForm> }) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await apiWithAuth<{ announcement: Announcement }>(
        `/admin/announcements/${id}`,
        session.access_token,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...data,
            expires_at: data.expires_at || null,
          }),
        }
      );

      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setEditingId(null);
      resetForm();
    },
    onError: (err: Error) => setError(err.message),
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await apiWithAuth<{ announcement: Announcement }>(
        `/admin/announcements/${id}/toggle`,
        session.access_token,
        { method: 'POST' }
      );

      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await apiWithAuth(`/admin/announcements/${id}`, session.access_token, {
        method: 'DELETE',
      });

      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      priority: 'medium',
      is_active: true,
      expires_at: '',
    });
  };

  const startEditing = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      is_active: announcement.is_active,
      expires_at: announcement.expires_at
        ? format(new Date(announcement.expires_at), "yyyy-MM-dd'T'HH:mm")
        : '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const announcements = data?.announcements || [];
  const activeCount = announcements.filter((a) => a.is_active).length;

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminNavigation />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 hover:bg-cream-200 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-burgundy-500" />
                Announcements
              </h1>
              <p className="text-neutral-500 text-sm">
                {announcements.length} total · {activeCount} active
              </p>
            </div>
          </div>

          {!isCreating && !editingId && (
            <button
              onClick={() => setIsCreating(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Announcement
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 mb-8">
            <h2 className="font-display font-bold text-lg text-neutral-800 mb-4">
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
                  placeholder="Announcement title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Content *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
                  placeholder="Announcement content..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                    className="w-full px-4 py-2 border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Expires At (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full px-4 py-2 border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 text-burgundy-500 border-cream-300 rounded focus:ring-burgundy-500"
                    />
                    <span className="text-sm text-neutral-700">Active immediately</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Announcements List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-burgundy-500" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-12 text-center">
            <Megaphone className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="font-semibold text-neutral-800 mb-2">No announcements yet</h3>
            <p className="text-neutral-500 mb-6">
              Create your first announcement to display on user dashboards.
            </p>
            {!isCreating && (
              <button onClick={() => setIsCreating(true)} className="btn btn-primary">
                Create Announcement
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`bg-white rounded-2xl shadow-card border overflow-hidden ${
                  announcement.is_active ? 'border-cream-200' : 'border-neutral-200 opacity-60'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityStyle(
                            announcement.priority
                          )}`}
                        >
                          {getPriorityIcon(announcement.priority)}
                          {announcement.priority.charAt(0).toUpperCase() +
                            announcement.priority.slice(1)}
                        </span>
                        {!announcement.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                            Inactive
                          </span>
                        )}
                        {announcement.expires_at &&
                          new Date(announcement.expires_at) < new Date() && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                              Expired
                            </span>
                          )}
                      </div>

                      <h3 className="font-semibold text-neutral-800 mb-1">{announcement.title}</h3>
                      <p className="text-neutral-600 text-sm mb-3">{announcement.content}</p>

                      <div className="flex items-center gap-4 text-xs text-neutral-400">
                        <span>
                          Created{' '}
                          {formatDistanceToNow(new Date(announcement.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        {announcement.expires_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires{' '}
                            {format(new Date(announcement.expires_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMutation.mutate(announcement.id)}
                        disabled={toggleMutation.isPending}
                        className="p-2 hover:bg-cream-100 rounded-lg transition-colors"
                        title={announcement.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {announcement.is_active ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-neutral-400" />
                        )}
                      </button>
                      <button
                        onClick={() => startEditing(announcement)}
                        className="p-2 hover:bg-cream-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4 text-neutral-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id, announcement.title)}
                        disabled={deleteMutation.isPending}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
