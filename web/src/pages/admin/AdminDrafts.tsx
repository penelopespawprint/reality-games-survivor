import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';
import { supabase } from '@/lib/supabase';
import {
  Shuffle,
  Clock,
  Users,
  Pause,
  StopCircle,
  SkipForward,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface ActiveDraft {
  id: string;
  name: string;
  code: string;
  commissioner: { id: string; display_name: string } | null;
  memberCount: number;
  draftType: string;
  timePerPick: number;
  startedAt: string;
  durationMinutes: number;
  currentPick: number;
  totalPicks: number;
  progress: number;
  currentPicker: { id: string; display_name: string } | null;
  round: number;
  isStalled: boolean;
}

interface PendingDraft {
  id: string;
  name: string;
  code: string;
  commissioner: { id: string; display_name: string } | null;
  memberCount: number;
  createdAt: string;
  isReady: boolean;
}

interface CompletedDraft {
  id: string;
  name: string;
  code: string;
  commissioner: { id: string; display_name: string } | null;
  memberCount: number;
  startedAt: string;
  completedAt: string;
  durationMinutes: number | null;
}

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
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export function AdminDrafts() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'history'>('active');

  // Fetch active drafts
  const {
    data: activeData,
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['admin', 'drafts', 'active'],
    queryFn: () => apiWithAuth('/api/admin/drafts/active'),
    refetchInterval: 10000, // Every 10 seconds
    enabled: activeTab === 'active',
  });

  // Fetch pending drafts
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'drafts', 'pending'],
    queryFn: () => apiWithAuth('/api/admin/drafts/queue'),
    enabled: activeTab === 'pending',
  });

  // Fetch completed drafts
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['admin', 'drafts', 'history'],
    queryFn: () => apiWithAuth('/api/admin/drafts/history'),
    enabled: activeTab === 'history',
  });

  // Draft stats
  const { data: statsData } = useQuery({
    queryKey: ['admin', 'drafts', 'stats'],
    queryFn: () => apiWithAuth('/api/admin/drafts/stats/overview'),
  });

  // Mutations
  const pauseDraft = useMutation({
    mutationFn: (id: string) => apiWithAuth(`/api/admin/drafts/${id}/pause`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drafts'] });
    },
  });

  const _resumeDraft = useMutation({
    mutationFn: (id: string) => apiWithAuth(`/api/admin/drafts/${id}/resume`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drafts'] });
    },
  });

  const endDraft = useMutation({
    mutationFn: (id: string) =>
      apiWithAuth(`/api/admin/drafts/${id}/end`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drafts'] });
    },
  });

  const skipPick = useMutation({
    mutationFn: (id: string) => apiWithAuth(`/api/admin/drafts/${id}/skip`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drafts'] });
    },
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <Navigation />
      <AdminNavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display text-white">Draft Monitoring</h1>
            <p className="text-neutral-400 text-sm mt-1">Monitor and manage active drafts</p>
          </div>
          <button
            onClick={() => refetchActive()}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
            <div className="text-2xl font-bold text-amber-400">{statsData?.inProgress || 0}</div>
            <div className="text-sm text-neutral-400">Active</div>
          </div>
          <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
            <div className="text-2xl font-bold text-blue-400">{statsData?.pending || 0}</div>
            <div className="text-sm text-neutral-400">Pending</div>
          </div>
          <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
            <div className="text-2xl font-bold text-purple-400">{statsData?.paused || 0}</div>
            <div className="text-sm text-neutral-400">Paused</div>
          </div>
          <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
            <div className="text-2xl font-bold text-green-400">{statsData?.completed || 0}</div>
            <div className="text-sm text-neutral-400">Completed</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-amber-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            Active ({activeData?.totalActive || 0})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            Pending ({pendingData?.totalPending || statsData?.pending || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-green-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            History
          </button>
        </div>

        {/* Active Drafts Tab */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 text-neutral-500 animate-spin" />
              </div>
            ) : !activeData?.drafts || activeData.drafts.length === 0 ? (
              <div className="bg-neutral-800 rounded-xl p-12 text-center">
                <Shuffle className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-white mb-2">No Active Drafts</h2>
                <p className="text-neutral-400">No drafts are currently in progress.</p>
              </div>
            ) : (
              activeData.drafts.map((draft: ActiveDraft) => (
                <div
                  key={draft.id}
                  className={`bg-neutral-800 rounded-xl p-5 border ${
                    draft.isStalled ? 'border-red-700' : 'border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{draft.name}</h3>
                        <span className="text-xs text-neutral-500 font-mono">{draft.code}</span>
                        {draft.isStalled && (
                          <span className="px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded">
                            STALLED
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-400 mt-1">
                        League Creator: {draft.commissioner?.display_name || 'Unknown'} •
                        {draft.memberCount} members •
                        {draft.draftType === 'snake' ? 'Snake' : 'Linear'} draft
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => pauseDraft.mutate(draft.id)}
                        disabled={pauseDraft.isPending}
                        className="p-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded-lg"
                        title="Pause draft"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => skipPick.mutate(draft.id)}
                        disabled={skipPick.isPending}
                        className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg"
                        title="Skip current pick"
                      >
                        <SkipForward className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm('Force end this draft? Remaining picks will be auto-selected.')
                          ) {
                            endDraft.mutate(draft.id);
                          }
                        }}
                        disabled={endDraft.isPending}
                        className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg"
                        title="Force end draft"
                      >
                        <StopCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-neutral-400">
                        Pick {draft.currentPick} of {draft.totalPicks} (Round {draft.round})
                      </span>
                      <span className="text-neutral-500">{draft.progress}%</span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all"
                        style={{ width: `${draft.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Current Picker & Time */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-neutral-500" />
                      <span className="text-neutral-400">Current Picker:</span>
                      <span className="text-white font-medium">
                        {draft.currentPicker?.display_name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400">
                      <Clock className="h-4 w-4" />
                      {formatDuration(draft.durationMinutes)} elapsed
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pending Drafts Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 text-neutral-500 animate-spin" />
              </div>
            ) : !pendingData?.drafts || pendingData.drafts.length === 0 ? (
              <div className="bg-neutral-800 rounded-xl p-12 text-center">
                <Shuffle className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-white mb-2">No Pending Drafts</h2>
                <p className="text-neutral-400">All leagues have completed their drafts.</p>
              </div>
            ) : (
              <div className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-700">
                      <th className="px-4 py-3">League</th>
                      <th className="px-4 py-3">League Creator</th>
                      <th className="px-4 py-3">Members</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700">
                    {pendingData.drafts.map((draft: PendingDraft) => (
                      <tr key={draft.id} className="hover:bg-neutral-700/50">
                        <td className="px-4 py-3">
                          <div className="text-sm text-white font-medium">{draft.name}</div>
                          <div className="text-xs text-neutral-500 font-mono">{draft.code}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-400">
                          {draft.commissioner?.display_name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-400">{draft.memberCount}</td>
                        <td className="px-4 py-3 text-sm text-neutral-500">
                          {new Date(draft.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {draft.isReady ? (
                            <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded">
                              Ready
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-neutral-700 text-neutral-400 text-xs rounded">
                              Waiting
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 text-neutral-500 animate-spin" />
              </div>
            ) : !historyData?.drafts || historyData.drafts.length === 0 ? (
              <div className="bg-neutral-800 rounded-xl p-12 text-center">
                <Shuffle className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-white mb-2">No Completed Drafts</h2>
                <p className="text-neutral-400">No drafts have been completed yet.</p>
              </div>
            ) : (
              <div className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-700">
                      <th className="px-4 py-3">League</th>
                      <th className="px-4 py-3">Members</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700">
                    {historyData.drafts.map((draft: CompletedDraft) => (
                      <tr key={draft.id} className="hover:bg-neutral-700/50">
                        <td className="px-4 py-3">
                          <div className="text-sm text-white font-medium">{draft.name}</div>
                          <div className="text-xs text-neutral-500">
                            {draft.commissioner?.display_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-400">{draft.memberCount}</td>
                        <td className="px-4 py-3 text-sm text-neutral-400">
                          {draft.durationMinutes ? formatDuration(draft.durationMinutes) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-500">
                          {new Date(draft.completedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
