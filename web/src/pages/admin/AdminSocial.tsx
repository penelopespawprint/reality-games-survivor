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
const ZAPIER_WEBHOOK_URL = import.meta.env.VITE_ZAPIER_WEBHOOK_URL || '';

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
    // If Zapier is configured, show Zapier mode
    if (ZAPIER_WEBHOOK_URL) {
      return <ZapierMode />;
    }

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
              Social Media Not Configured
            </h1>
            <p className="text-neutral-600 mb-6">
              Choose how you want to manage social media posts.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Zapier Option */}
              <div className="bg-orange-50 rounded-xl p-6 text-left border border-orange-200">
                <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-2">
                  <span className="text-orange-500">⚡</span> Zapier + Buffer
                </h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Use Zapier to connect to Buffer. Easy setup, no coding required.
                </p>
                <ol className="space-y-1 text-xs text-neutral-500 mb-4">
                  <li>1. Create a Zapier webhook trigger</li>
                  <li>2. Connect it to Buffer</li>
                  <li>3. Add webhook URL to env</li>
                </ol>
                <a
                  href="https://zapier.com/apps/buffer/integrations/webhook"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                >
                  <ExternalLink className="h-3 w-3" />
                  Setup Zapier
                </a>
              </div>

              {/* Direct Buffer Option */}
              <div className="bg-blue-50 rounded-xl p-6 text-left border border-blue-200">
                <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-2">
                  <span className="text-blue-500">📊</span> Direct Buffer API
                </h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Connect directly to Buffer for more control and features.
                </p>
                <ol className="space-y-1 text-xs text-neutral-500 mb-4">
                  <li>1. Create Buffer developer app</li>
                  <li>2. Get access token</li>
                  <li>3. Add to BUFFER_ACCESS_TOKEN</li>
                </ol>
                <a
                  href="https://buffer.com/developers/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  <ExternalLink className="h-3 w-3" />
                  Setup Buffer
                </a>
              </div>
            </div>

            <p className="text-xs text-neutral-400">
              Add <code className="bg-neutral-100 px-1 rounded">VITE_ZAPIER_WEBHOOK_URL</code> or <code className="bg-neutral-100 px-1 rounded">BUFFER_ACCESS_TOKEN</code> to your environment
            </p>
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

// Zapier Mode - Simple webhook-based posting
function ZapierMode() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [platforms, setPlatforms] = useState(['twitter', 'facebook', 'instagram']);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch post history from database
  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin', 'zapier-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const sendPost = async () => {
    if (!content.trim()) return;
    setSending(true);
    setLastResult(null);

    try {
      // Save to database first
      const { data: post, error: dbError } = await supabase
        .from('social_posts')
        .insert({
          content,
          image_url: imageUrl || null,
          link_url: linkUrl || null,
          platforms,
          status: 'sent',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Send to Zapier webhook
      const response = await fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          image_url: imageUrl || null,
          link_url: linkUrl || null,
          platforms,
          post_id: post.id,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      // Update post with webhook response
      await supabase
        .from('social_posts')
        .update({
          webhook_response: result,
          posted_at: new Date().toISOString(),
          status: response.ok ? 'sent' : 'failed',
        })
        .eq('id', post.id);

      setLastResult({
        success: response.ok,
        message: response.ok ? 'Post sent to Zapier!' : 'Failed to send to Zapier',
      });

      if (response.ok) {
        setContent('');
        setImageUrl('');
        setLinkUrl('');
      }

      queryClient.invalidateQueries({ queryKey: ['admin', 'zapier-posts'] });
    } catch (err) {
      setLastResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send post',
      });
    } finally {
      setSending(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <Navigation />
      <AdminNavBar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Send className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800">Social Media</h1>
            <p className="text-sm text-neutral-500">Post via Zapier → Buffer</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Create Post */}
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">New Post</h2>

            {lastResult && (
              <div
                className={`p-3 rounded-xl mb-4 flex items-center gap-2 ${
                  lastResult.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {lastResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {lastResult.message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  maxLength={280}
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="What's happening?"
                />
                <p className="text-xs text-neutral-500 mt-1">{content.length}/280</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Link URL (optional)
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://survivor.realitygamesfantasyleague.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Platforms</label>
                <div className="flex gap-2">
                  {['twitter', 'facebook', 'instagram'].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                        platforms.includes(platform)
                          ? 'bg-orange-50 border-orange-300 text-orange-700'
                          : 'bg-white border-cream-200 text-neutral-500'
                      }`}
                    >
                      {platform === 'twitter' && <Twitter className="h-4 w-4" />}
                      {platform === 'facebook' && <Facebook className="h-4 w-4" />}
                      {platform === 'instagram' && <Instagram className="h-4 w-4" />}
                      <span className="capitalize text-sm">{platform}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={sendPost}
                disabled={!content.trim() || sending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? 'Sending...' : 'Send to Zapier'}
              </button>
            </div>
          </div>

          {/* Post History */}
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
            <div className="p-4 border-b border-cream-200">
              <h2 className="text-lg font-semibold text-neutral-800">Recent Posts</h2>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500 mx-auto" />
              </div>
            ) : posts && posts.length > 0 ? (
              <div className="divide-y divide-cream-100 max-h-[500px] overflow-y-auto">
                {posts.map((post: any) => (
                  <div key={post.id} className="p-4">
                    <p className="text-neutral-800 text-sm whitespace-pre-wrap line-clamp-3">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          post.status === 'sent'
                            ? 'bg-green-100 text-green-700'
                            : post.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {post.status}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-neutral-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                <p className="text-sm">No posts yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSocial;
