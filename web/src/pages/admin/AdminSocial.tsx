/**
 * Admin Social Media Page
 *
 * Manage social media posts via Buffer integration.
 * Allows creating, scheduling, and managing posts across platforms.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Plus,
  Send,
  Clock,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  X,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

async function apiWithAuth(endpoint: string, options?: RequestInit) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

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

interface BufferProfile {
  id: string;
  service: string;
  username: string;
  formattedUsername: string;
  avatar: string;
  default: boolean;
}

interface BufferPost {
  id: string;
  text: string;
  scheduled_at?: number;
  created_at: number;
  status: string;
  profile_id: string;
}

const SERVICE_ICONS: Record<string, any> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
};

const SERVICE_COLORS: Record<string, string> = {
  twitter: 'bg-sky-100 text-sky-600',
  facebook: 'bg-blue-100 text-blue-600',
  instagram: 'bg-pink-100 text-pink-600',
  linkedin: 'bg-indigo-100 text-indigo-600',
};

export function AdminSocial() {
  const queryClient = useQueryClient();
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeView, setActiveView] = useState<'pending' | 'sent'>('pending');

  // Check Buffer configuration status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['admin', 'social', 'status'],
    queryFn: () => apiWithAuth('/api/admin/social/status'),
  });

  // Fetch connected profiles
  const { data: profilesData, isLoading: profilesLoading } = useQuery({
    queryKey: ['admin', 'social', 'profiles'],
    queryFn: () => apiWithAuth('/api/admin/social/profiles'),
    enabled: status?.configured,
  });

  // Fetch pending posts for first profile
  const selectedProfileId = selectedProfiles[0] || profilesData?.profiles?.[0]?.id;
  
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['admin', 'social', 'posts', selectedProfileId, activeView],
    queryFn: () =>
      apiWithAuth(
        `/api/admin/social/profiles/${selectedProfileId}/${activeView}`
      ),
    enabled: !!selectedProfileId && status?.configured,
  });

  // Share post immediately
  const shareMutation = useMutation({
    mutationFn: (postId: string) =>
      apiWithAuth(`/api/admin/social/posts/${postId}/share`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'posts'] });
    },
  });

  // Delete post
  const deleteMutation = useMutation({
    mutationFn: (postId: string) =>
      apiWithAuth(`/api/admin/social/posts/${postId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'posts'] });
    },
  });

  const profiles = profilesData?.profiles || [];
  const posts = postsData?.posts || [];

  // Not configured state
  if (statusLoading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <Navigation />
        <AdminNavBar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-burgundy-500" />
        </div>
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="min-h-screen bg-cream-50">
        <Navigation />
        <AdminNavBar />

        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-800 mb-2">
              Buffer Not Configured
            </h1>
            <p className="text-neutral-600 mb-6">
              To use social media management, you need to connect Buffer to your account.
            </p>

            <div className="bg-cream-50 rounded-xl p-6 text-left mb-6">
              <h3 className="font-semibold text-neutral-800 mb-3">Setup Instructions:</h3>
              <ol className="space-y-2 text-sm text-neutral-600">
                <li className="flex items-start gap-2">
                  <span className="bg-burgundy-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                  <span>Create a Buffer account at <a href="https://buffer.com" className="text-burgundy-600 hover:underline" target="_blank" rel="noopener noreferrer">buffer.com</a></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-burgundy-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                  <span>Connect your social media profiles (Twitter, Facebook, Instagram, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-burgundy-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                  <span>Go to <a href="https://buffer.com/developers/apps" className="text-burgundy-600 hover:underline" target="_blank" rel="noopener noreferrer">Buffer Developer Portal</a> and create an app</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-burgundy-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">4</span>
                  <span>Copy your access token and add it to your environment as <code className="bg-neutral-100 px-1 py-0.5 rounded">BUFFER_ACCESS_TOKEN</code></span>
                </li>
              </ol>
            </div>

            <a
              href="https://buffer.com/developers/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open Buffer Developer Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <Navigation />
      <AdminNavBar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/content"
              className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-display font-bold text-neutral-800">
                Social Media
              </h1>
              <p className="text-neutral-600 mt-1">
                Manage posts via Buffer • Connected as {status.user?.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Post
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Profiles Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
              <div className="p-4 border-b border-cream-200">
                <h2 className="font-semibold text-neutral-800">Connected Accounts</h2>
              </div>
              {profilesLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-burgundy-500 mx-auto" />
                </div>
              ) : profiles.length === 0 ? (
                <div className="p-6 text-center text-neutral-500">
                  <p>No profiles connected</p>
                  <a
                    href="https://buffer.com/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-burgundy-600 hover:underline text-sm"
                  >
                    Connect accounts in Buffer →
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-cream-100">
                  {profiles.map((profile: BufferProfile) => {
                    const Icon = SERVICE_ICONS[profile.service] || Twitter;
                    const colors = SERVICE_COLORS[profile.service] || 'bg-neutral-100 text-neutral-600';
                    const isSelected = selectedProfiles.includes(profile.id) || 
                      (selectedProfiles.length === 0 && profile.id === profiles[0]?.id);

                    return (
                      <button
                        key={profile.id}
                        onClick={() => {
                          if (selectedProfiles.includes(profile.id)) {
                            setSelectedProfiles(selectedProfiles.filter(id => id !== profile.id));
                          } else {
                            setSelectedProfiles([...selectedProfiles, profile.id]);
                          }
                        }}
                        className={`w-full p-3 flex items-center gap-3 hover:bg-cream-50 transition-colors ${
                          isSelected ? 'bg-cream-100' : ''
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${colors}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-medium text-neutral-800 truncate">
                            {profile.formattedUsername}
                          </p>
                          <p className="text-xs text-neutral-500 capitalize">
                            {profile.service}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Posts */}
          <div className="lg:col-span-3">
            {/* View Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setActiveView('pending')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  activeView === 'pending'
                    ? 'bg-burgundy-500 text-white'
                    : 'bg-white text-neutral-700 hover:bg-cream-100'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                Pending
              </button>
              <button
                onClick={() => setActiveView('sent')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  activeView === 'sent'
                    ? 'bg-burgundy-500 text-white'
                    : 'bg-white text-neutral-700 hover:bg-cream-100'
                }`}
              >
                <CheckCircle className="h-4 w-4 inline mr-2" />
                Sent
              </button>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'posts'] })}
                className="ml-auto p-2 text-neutral-400 hover:text-neutral-600 hover:bg-white rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Posts List */}
            <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
              {postsLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-burgundy-500 mx-auto mb-3" />
                  <p className="text-neutral-500">Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-700 mb-2">
                    No {activeView} posts
                  </h3>
                  <p className="text-neutral-500 mb-4">
                    {activeView === 'pending'
                      ? 'Create a post to schedule it'
                      : 'Posts you send will appear here'}
                  </p>
                  {activeView === 'pending' && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600"
                    >
                      <Plus className="h-4 w-4" />
                      Create Post
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-cream-100">
                  {posts.map((post: BufferPost) => (
                    <div
                      key={post.id}
                      className="p-4 hover:bg-cream-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-neutral-800 whitespace-pre-wrap">
                            {post.text}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                            {post.scheduled_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(post.scheduled_at * 1000).toLocaleString()}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Created {new Date(post.created_at * 1000).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {activeView === 'pending' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (confirm('Share this post now?')) {
                                  shareMutation.mutate(post.id);
                                }
                              }}
                              disabled={shareMutation.isPending}
                              className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Share Now"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this post?')) {
                                  deleteMutation.mutate(post.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          profiles={profiles}
          selectedProfiles={selectedProfiles.length > 0 ? selectedProfiles : [profiles[0]?.id]}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'posts'] });
          }}
        />
      )}
    </div>
  );
}

// Create Post Modal
function CreatePostModal({
  profiles,
  selectedProfiles: initialProfiles,
  onClose,
  onSuccess,
}: {
  profiles: BufferProfile[];
  selectedProfiles: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [text, setText] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>(initialProfiles);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sendNow, setSendNow] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim() || selectedProfiles.length === 0) {
      setError('Please enter text and select at least one profile');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiWithAuth('/api/admin/social/posts', {
        method: 'POST',
        body: JSON.stringify({
          text,
          profile_ids: selectedProfiles,
          scheduled_at: scheduledAt || undefined,
          now: sendNow,
          media: mediaUrl ? { photo: mediaUrl } : undefined,
        }),
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setSaving(false);
    }
  };

  // Character count with platform limits
  const charLimits: Record<string, number> = {
    twitter: 280,
    facebook: 63206,
    instagram: 2200,
    linkedin: 3000,
  };

  const selectedServices = profiles
    .filter(p => selectedProfiles.includes(p.id))
    .map(p => p.service);
  
  const minLimit = Math.min(
    ...selectedServices.map(s => charLimits[s] || 2048)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cream-200 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-neutral-800">
            Create Post
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-cream-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4 max-h-[calc(90vh-140px)] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Post Text */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Post Content ({text.length}/{minLimit})
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, minLimit))}
              placeholder="What's happening?"
              rows={5}
              className="w-full px-4 py-3 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500 resize-none"
            />
            {text.length > minLimit * 0.9 && (
              <p className="text-xs text-amber-600 mt-1">
                Approaching character limit for {selectedServices.find(s => charLimits[s] === minLimit)}
              </p>
            )}
          </div>

          {/* Media URL */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Image URL (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
              />
              {mediaUrl && (
                <button
                  onClick={() => setMediaUrl('')}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {mediaUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border border-cream-200">
                <img
                  src={mediaUrl}
                  alt="Preview"
                  className="max-h-40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Profile Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Post to
            </label>
            <div className="flex flex-wrap gap-2">
              {profiles.map((profile) => {
                const Icon = SERVICE_ICONS[profile.service] || Twitter;
                const colors = SERVICE_COLORS[profile.service] || 'bg-neutral-100 text-neutral-600';
                const isSelected = selectedProfiles.includes(profile.id);

                return (
                  <button
                    key={profile.id}
                    onClick={() => {
                      if (isSelected && selectedProfiles.length > 1) {
                        setSelectedProfiles(selectedProfiles.filter(id => id !== profile.id));
                      } else if (!isSelected) {
                        setSelectedProfiles([...selectedProfiles, profile.id]);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-burgundy-500 bg-burgundy-50'
                        : 'border-cream-200 hover:border-cream-300'
                    }`}
                  >
                    <div className={`p-1 rounded ${colors}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <span className="text-sm">{profile.formattedUsername}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scheduling */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              When to post
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendNow}
                  onChange={(e) => {
                    setSendNow(e.target.checked);
                    if (e.target.checked) setScheduledAt('');
                  }}
                  className="rounded border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
                />
                <span className="text-sm text-neutral-700">Post immediately</span>
              </label>

              {!sendNow && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                />
              )}

              {!sendNow && !scheduledAt && (
                <p className="text-xs text-neutral-500">
                  Leave empty to add to Buffer's queue
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cream-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-600 hover:bg-cream-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !text.trim() || selectedProfiles.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : sendNow ? (
              <Send className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            {saving ? 'Posting...' : sendNow ? 'Post Now' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminSocial;
