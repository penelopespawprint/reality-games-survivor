import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Lock,
  Unlock,
  Pause,
  Play,
  Wrench,
  RefreshCw,
  Bell,
  Power,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';

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

export function QuickActionsBar() {
  const queryClient = useQueryClient();
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [emergencyConfirmText, setEmergencyConfirmText] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fetch current status
  const { data: status } = useQuery({
    queryKey: ['quick-actions', 'status'],
    queryFn: () => apiWithAuth('/api/admin/quick-actions/status'),
    refetchInterval: 30000,
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const lockPicks = useMutation({
    mutationFn: () =>
      apiWithAuth('/api/admin/quick-actions/lock-picks', { method: 'POST', body: '{}' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quick-actions'] });
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
      showNotification('success', data.message);
    },
    onError: (err: Error) => showNotification('error', err.message),
  });

  const unlockPicks = useMutation({
    mutationFn: () =>
      apiWithAuth('/api/admin/quick-actions/unlock-picks', { method: 'POST', body: '{}' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quick-actions'] });
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
      showNotification('success', data.message);
    },
    onError: (err: Error) => showNotification('error', err.message),
  });

  const pauseDrafts = useMutation({
    mutationFn: () =>
      apiWithAuth('/api/admin/quick-actions/pause-drafts', { method: 'POST', body: '{}' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quick-actions'] });
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
      showNotification('success', data.message);
    },
    onError: (err: Error) => showNotification('error', err.message),
  });

  const resumeDrafts = useMutation({
    mutationFn: () =>
      apiWithAuth('/api/admin/quick-actions/resume-drafts', { method: 'POST', body: '{}' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quick-actions'] });
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
      showNotification('success', data.message);
    },
    onError: (err: Error) => showNotification('error', err.message),
  });

  const maintenanceMode = useMutation({
    mutationFn: (enabled: boolean) =>
      apiWithAuth('/api/admin/quick-actions/maintenance-mode', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quick-actions'] });
      showNotification('success', data.message);
    },
    onError: (err: Error) => showNotification('error', err.message),
  });

  const forceRefresh = useMutation({
    mutationFn: () =>
      apiWithAuth('/api/admin/quick-actions/force-refresh', { method: 'POST', body: '{}' }),
    onSuccess: (data) => {
      showNotification('success', data.message);
    },
    onError: (err: Error) => showNotification('error', err.message),
  });

  const emergencyShutoff = useMutation({
    mutationFn: (enabled: boolean) =>
      apiWithAuth('/api/admin/quick-actions/emergency-shutoff', {
        method: 'POST',
        body: JSON.stringify({ enabled, confirmation: emergencyConfirmText }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quick-actions'] });
      showNotification('success', data.message);
      setShowEmergencyConfirm(false);
      setEmergencyConfirmText('');
    },
    onError: (err: Error) => showNotification('error', err.message),
  });

  const isPicksLocked = status?.picks_locked?.locked;
  const isDraftsPaused = status?.drafts_paused?.paused;
  const isMaintenanceMode = status?.maintenance_mode?.enabled;
  const isEmergencyMode = status?.emergency_shutoff?.enabled;

  return (
    <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
      {/* Notification */}
      {notification && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-green-900/50 text-green-300'
              : 'bg-red-900/50 text-red-300'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {notification.message}
        </div>
      )}

      <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
        System Controls
      </h3>

      <div className="flex flex-wrap gap-3">
        {/* Lock/Unlock Picks */}
        <button
          onClick={() => (isPicksLocked ? unlockPicks.mutate() : lockPicks.mutate())}
          disabled={lockPicks.isPending || unlockPicks.isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            isPicksLocked
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-neutral-700 hover:bg-neutral-600 text-white'
          }`}
        >
          {lockPicks.isPending || unlockPicks.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPicksLocked ? (
            <Unlock className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {isPicksLocked ? 'Unlock Picks' : 'Lock Picks'}
        </button>

        {/* Pause/Resume Drafts */}
        <button
          onClick={() => (isDraftsPaused ? resumeDrafts.mutate() : pauseDrafts.mutate())}
          disabled={pauseDrafts.isPending || resumeDrafts.isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            isDraftsPaused
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-neutral-700 hover:bg-neutral-600 text-white'
          }`}
        >
          {pauseDrafts.isPending || resumeDrafts.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isDraftsPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
          {isDraftsPaused ? 'Resume Drafts' : 'Pause Drafts'}
        </button>

        {/* Maintenance Mode */}
        <button
          onClick={() => maintenanceMode.mutate(!isMaintenanceMode)}
          disabled={maintenanceMode.isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            isMaintenanceMode
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-neutral-700 hover:bg-neutral-600 text-white'
          }`}
        >
          {maintenanceMode.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wrench className="h-4 w-4" />
          )}
          {isMaintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
        </button>

        {/* Force Refresh */}
        <button
          onClick={() => forceRefresh.mutate()}
          disabled={forceRefresh.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
        >
          {forceRefresh.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Force Refresh
        </button>

        {/* Send Blast - Links to announcements page for now */}
        <a
          href="/admin/announcements"
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
        >
          <Bell className="h-4 w-4" />
          Send Blast
        </a>

        {/* Emergency Shutoff */}
        {!showEmergencyConfirm ? (
          <button
            onClick={() =>
              isEmergencyMode ? emergencyShutoff.mutate(false) : setShowEmergencyConfirm(true)
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              isEmergencyMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-700 hover:bg-red-800 text-white'
            }`}
          >
            <Power className="h-4 w-4" />
            {isEmergencyMode ? 'Disable Shutoff' : 'Emergency Shutoff'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={emergencyConfirmText}
              onChange={(e) => setEmergencyConfirmText(e.target.value)}
              placeholder='Type "SHUTDOWN"'
              className="px-3 py-2 bg-neutral-900 border border-red-700 rounded-lg text-sm text-white placeholder-neutral-500 w-36"
            />
            <button
              onClick={() => emergencyShutoff.mutate(true)}
              disabled={emergencyConfirmText !== 'SHUTDOWN' || emergencyShutoff.isPending}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 disabled:bg-neutral-600 text-white rounded-lg text-sm font-medium"
            >
              {emergencyShutoff.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm'
              )}
            </button>
            <button
              onClick={() => {
                setShowEmergencyConfirm(false);
                setEmergencyConfirmText('');
              }}
              className="px-2 py-2 text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Current State Indicators */}
      <div className="mt-4 pt-3 border-t border-neutral-700 flex flex-wrap gap-2">
        {isPicksLocked && (
          <span className="px-2 py-1 bg-amber-900/50 text-amber-300 text-xs rounded">
            Picks Locked
          </span>
        )}
        {isDraftsPaused && (
          <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">
            Drafts Paused
          </span>
        )}
        {isMaintenanceMode && (
          <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">
            Maintenance Mode
          </span>
        )}
        {isEmergencyMode && (
          <span className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded animate-pulse">
            EMERGENCY SHUTOFF ACTIVE
          </span>
        )}
        {!isPicksLocked && !isDraftsPaused && !isMaintenanceMode && !isEmergencyMode && (
          <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">
            All Systems Normal
          </span>
        )}
      </div>
    </div>
  );
}
