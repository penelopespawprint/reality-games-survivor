import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { SystemStatusPanel } from '@/components/admin/command-center/SystemStatusPanel';
import { ActiveWindowPanel } from '@/components/admin/command-center/ActiveWindowPanel';
import { IncidentPanel } from '@/components/admin/command-center/IncidentPanel';
import { QuickActionsBar } from '@/components/admin/command-center/QuickActionsBar';
import { LiveActivityFeed } from '@/components/admin/command-center/LiveActivityFeed';
import { AttentionPanel } from '@/components/admin/command-center/AttentionPanel';
import { OperationsPanel } from '@/components/admin/command-center/OperationsPanel';
import { supabase } from '@/lib/supabase';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface SystemStatus {
  status: 'operational' | 'degraded' | 'down';
  services: {
    api: { status: string; latencyMs: number | null; message: string };
    database: { status: string; latencyMs: number; message: string };
    email: { status: string; pending: number; failed: number; message: string };
    payments: { status: string; message: string };
    jobs: { status: string; failedLast24h: number; message: string };
  };
  activeIncidents: Array<{ id: string; severity: string; title: string; status: string }>;
  lastChecked: string;
}

interface ActiveWindow {
  mode: 'normal' | 'episode' | 'scoring' | 'draft' | 'incident' | 'off-cycle';
  title: string;
  subtitle: string;
  data: Record<string, any>;
}

interface AttentionItem {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  actionLabel: string;
  actionEndpoint: string;
  actionType: 'link' | 'mutation';
  count?: number;
  createdAt: string;
}

interface Operations {
  usersOnline: number;
  activeDrafts: number;
  draftsInProgress: Array<{ id: string; name: string; draft_started_at: string }>;
  picks: { submitted: number; total: number };
  timestamp: string;
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

export function AdminCommandCenter() {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch system status
  const {
    data: systemStatus,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery<SystemStatus>({
    queryKey: ['command-center', 'status'],
    queryFn: () => apiWithAuth('/api/admin/command-center/status'),
    refetchInterval: 10000, // Every 10 seconds
    retry: 2,
  });

  // Fetch active window
  const {
    data: activeWindow,
    isLoading: windowLoading,
    error: windowError,
  } = useQuery<ActiveWindow>({
    queryKey: ['command-center', 'active-window'],
    queryFn: () => apiWithAuth('/api/admin/command-center/active-window'),
    refetchInterval: 30000, // Every 30 seconds
    retry: 2,
  });

  // Fetch attention items
  const {
    data: attention,
    isLoading: attentionLoading,
    error: attentionError,
  } = useQuery<{
    items: AttentionItem[];
    totalCount: number;
  }>({
    queryKey: ['command-center', 'attention'],
    queryFn: () => apiWithAuth('/api/admin/command-center/attention'),
    refetchInterval: 30000,
    retry: 2,
  });

  // Fetch operations
  const {
    data: operations,
    isLoading: opsLoading,
    error: opsError,
  } = useQuery<Operations>({
    queryKey: ['command-center', 'operations'],
    queryFn: () => apiWithAuth('/api/admin/command-center/operations'),
    refetchInterval: 10000,
    retry: 2,
  });

  // Track overall error state
  const hasErrors = statusError || windowError || attentionError || opsError;

  // Refresh all data
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['command-center'] });
  };

  // Determine command center mode
  const mode = activeWindow?.mode || 'normal';
  const isIncidentMode = mode === 'incident' || (systemStatus?.activeIncidents?.length ?? 0) > 0;

  return (
    <div className={`min-h-screen ${isIncidentMode ? 'bg-red-950' : 'bg-neutral-900'}`}>
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-display text-white">Command Center</h1>
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                systemStatus?.status === 'operational'
                  ? 'bg-green-900/50 text-green-400'
                  : systemStatus?.status === 'degraded'
                    ? 'bg-amber-900/50 text-amber-400'
                    : 'bg-red-900/50 text-red-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  systemStatus?.status === 'operational'
                    ? 'bg-green-400'
                    : systemStatus?.status === 'degraded'
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                }`}
              />
              {systemStatus?.status?.toUpperCase() || 'LOADING'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg font-mono text-white">
              {currentTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <button
              onClick={refreshAll}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title="Refresh all"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {hasErrors && (
          <div className="mb-6 p-4 bg-amber-900/50 border border-amber-700 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              <div>
                <span className="font-semibold text-amber-300">API Connection Issues</span>
                <span className="ml-2 text-amber-400 text-sm">
                  Some data may not be loading. Check server logs or try refreshing.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Incident Banner */}
        {isIncidentMode &&
          systemStatus?.activeIncidents &&
          systemStatus.activeIncidents.length > 0 && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                <div>
                  <span className="font-semibold text-red-300">
                    {systemStatus.activeIncidents.length} Active Incident
                    {systemStatus.activeIncidents.length > 1 ? 's' : ''}
                  </span>
                  <span className="ml-2 text-red-400">
                    {systemStatus.activeIncidents[0]?.title}
                  </span>
                </div>
              </div>
            </div>
          )}

        {/* Top Row: Status, Active Window, Incident Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <SystemStatusPanel status={systemStatus} isLoading={statusLoading} />
          <ActiveWindowPanel window={activeWindow} isLoading={windowLoading} />
          <IncidentPanel incidents={systemStatus?.activeIncidents || []} />
        </div>

        {/* Quick Actions Bar */}
        <div className="mb-6">
          <QuickActionsBar />
        </div>

        {/* Bottom Row: Live Feed, Attention, Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <LiveActivityFeed />
          </div>
          <div className="space-y-4">
            <AttentionPanel
              items={attention?.items || []}
              totalCount={attention?.totalCount || 0}
              isLoading={attentionLoading}
            />
            <OperationsPanel data={operations} isLoading={opsLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
