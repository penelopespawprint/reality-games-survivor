import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  X,
  Clock,
  User,
  CheckCircle,
  Loader2,
  Send,
  Server,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface IncidentUpdate {
  id: string;
  status: string;
  note: string;
  created_at: string;
  created_by_user: {
    id: string;
    display_name: string;
  } | null;
}

interface IncidentDetail {
  id: string;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  affected_systems: string[] | null;
  users_affected: number | null;
  workaround: string | null;
  link: string | null;
  created_at: string;
  resolved_at: string | null;
  created_by_user: {
    id: string;
    display_name: string;
    email: string;
  } | null;
  incident_updates: IncidentUpdate[];
}

interface IncidentDetailModalProps {
  incidentId: string;
  onClose: () => void;
}

const severityColors = {
  PL: 'bg-purple-600 text-white',
  P0: 'bg-red-800 text-white',
  P1: 'bg-red-600 text-white',
  P2: 'bg-orange-600 text-white',
  P3: 'bg-yellow-600 text-black',
  P4: 'bg-blue-600 text-white',
};

const severityLabels = {
  PL: 'Cannot launch without',
  P0: 'Critical Game Function',
  P1: 'Major Web Update',
  P2: 'Minor Web Update',
  P3: 'Minor Edits',
  P4: 'Nice to have',
};

const statusColors = {
  investigating: 'bg-red-900/50 text-red-300 border-red-700',
  identified: 'bg-orange-900/50 text-orange-300 border-orange-700',
  monitoring: 'bg-blue-900/50 text-blue-300 border-blue-700',
  needs_verified: 'bg-purple-900/50 text-purple-300 border-purple-700',
  verified: 'bg-teal-900/50 text-teal-300 border-teal-700',
  resolved: 'bg-green-900/50 text-green-300 border-green-700',
};

const statusLabels = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  needs_verified: 'Needs Verified',
  verified: 'Verified',
  resolved: 'Resolved',
};

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

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: string, end?: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours < 24) {
    return `${hours}h ${mins}m`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

export function IncidentDetailModal({ incidentId, onClose }: IncidentDetailModalProps) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<string | null>(null);

  const {
    data: incident,
    isLoading,
    error,
  } = useQuery<IncidentDetail>({
    queryKey: ['incident', incidentId],
    queryFn: () => apiWithAuth(`/api/admin/incidents/${incidentId}`),
  });

  const addNote = useMutation({
    mutationFn: (data: { note: string; status?: string }) =>
      apiWithAuth(`/api/admin/incidents/${incidentId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
      setNewNote('');
      setNewStatus(null);
    },
  });

  const resolveIncident = useMutation({
    mutationFn: (note?: string) =>
      apiWithAuth(`/api/admin/incidents/${incidentId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
    },
  });

  const updateSeverity = useMutation({
    mutationFn: (severity: string) =>
      apiWithAuth(`/api/admin/incidents/${incidentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ severity }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      apiWithAuth(`/api/admin/incidents/${incidentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
      setNewStatus(null);
    },
  });

  const reopenIncident = useMutation({
    mutationFn: () =>
      apiWithAuth(`/api/admin/incidents/${incidentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'investigating' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  const handleSubmitNote = () => {
    // If no note but status changed, just update status
    if (!newNote.trim() && newStatus) {
      updateStatus.mutate(newStatus);
      return;
    }
    if (!newNote.trim()) return;
    addNote.mutate({
      note: newNote,
      status: newStatus || undefined,
    });
  };

  const handleResolve = () => {
    const note = newNote.trim() || undefined;
    resolveIncident.mutate(note);
    setNewNote('');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-neutral-800 rounded-xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-neutral-800 rounded-xl p-8 max-w-md">
          <p className="text-red-400">Failed to load incident details</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-neutral-700 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isResolved = incident.status === 'resolved';
  const sortedUpdates = [...(incident.incident_updates || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-700 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span
              className={`px-2 py-1 rounded text-sm font-bold ${
                severityColors[incident.severity as keyof typeof severityColors]
              }`}
            >
              {incident.severity}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">{incident.title}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-neutral-400">
                <span
                  className={`px-2 py-0.5 rounded border text-xs ${
                    statusColors[incident.status as keyof typeof statusColors]
                  }`}
                >
                  {statusLabels[incident.status as keyof typeof statusLabels]}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(incident.created_at, incident.resolved_at)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Details Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Severity</label>
              {!isResolved ? (
                <div className="flex items-center gap-2">
                  <select
                    value={incident.severity}
                    onChange={(e) => updateSeverity.mutate(e.target.value)}
                    disabled={updateSeverity.isPending}
                    className={`px-2 py-1 rounded text-sm font-bold border-0 cursor-pointer ${
                      severityColors[incident.severity as keyof typeof severityColors]
                    } ${updateSeverity.isPending ? 'opacity-50' : ''}`}
                  >
                    {['PL', 'P0', 'P1', 'P2', 'P3', 'P4'].map((sev) => (
                      <option key={sev} value={sev} className="bg-neutral-800 text-white">
                        {sev} - {severityLabels[sev as keyof typeof severityLabels]}
                      </option>
                    ))}
                  </select>
                  {updateSeverity.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                  )}
                </div>
              ) : (
                <p className="text-sm text-white">
                  {incident.severity} - {severityLabels[incident.severity as keyof typeof severityLabels]}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Created</label>
              <p className="text-sm text-white">{formatDateTime(incident.created_at)}</p>
            </div>
            {incident.resolved_at && (
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Resolved</label>
                <p className="text-sm text-white">{formatDateTime(incident.resolved_at)}</p>
              </div>
            )}
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Reported By</label>
              <p className="text-sm text-white">
                {incident.created_by_user?.display_name || 'Unknown'}
              </p>
            </div>
          </div>

          {/* Description */}
          {incident.description && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Description</label>
              <p className="text-sm text-neutral-300 bg-neutral-900 rounded-lg p-3">
                {incident.description}
              </p>
            </div>
          )}

          {/* Affected Systems */}
          {incident.affected_systems && incident.affected_systems.length > 0 && (
            <div>
              <label className="block text-xs text-neutral-500 mb-2">Affected Systems</label>
              <div className="flex flex-wrap gap-2">
                {incident.affected_systems.map((system) => (
                  <span
                    key={system}
                    className="flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs"
                  >
                    <Server className="h-3 w-3" />
                    {system}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Users Affected */}
          {incident.users_affected && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Users Affected</label>
              <p className="text-sm text-white">{incident.users_affected.toLocaleString()}</p>
            </div>
          )}

          {/* Workaround */}
          {incident.workaround && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Workaround</label>
              <p className="text-sm text-neutral-300 bg-neutral-900 rounded-lg p-3">
                {incident.workaround}
              </p>
            </div>
          )}

          {/* Link */}
          {incident.link && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Related Link</label>
              <a
                href={incident.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 bg-neutral-900 rounded-lg p-3 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                {incident.link}
              </a>
            </div>
          )}

          {/* Timeline */}
          <div>
            <label className="block text-xs text-neutral-500 mb-3">Update Timeline</label>
            <div className="space-y-3">
              {sortedUpdates.length === 0 ? (
                <p className="text-sm text-neutral-500 italic">No updates yet</p>
              ) : (
                sortedUpdates.map((update) => (
                  <div
                    key={update.id}
                    className="flex gap-3 p-3 bg-neutral-900 rounded-lg border border-neutral-700"
                  >
                    <div className="flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          update.status === 'resolved'
                            ? 'bg-green-900/50'
                            : 'bg-neutral-700'
                        }`}
                      >
                        {update.status === 'resolved' ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <User className="h-4 w-4 text-neutral-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {update.created_by_user?.display_name || 'System'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs border ${
                            statusColors[update.status as keyof typeof statusColors]
                          }`}
                        >
                          {statusLabels[update.status as keyof typeof statusLabels]}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {formatDateTime(update.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-300">{update.note}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer - Add Note Form */}
        {!isResolved && (
          <div className="p-5 border-t border-neutral-700 space-y-3">
            <div className="flex gap-2">
              <select
                value={newStatus || ''}
                onChange={(e) => setNewStatus(e.target.value || null)}
                className="bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Keep Status</option>
                <option value="investigating">Investigating</option>
                <option value="identified">Identified</option>
                <option value="monitoring">Monitoring</option>
                <option value="needs_verified">Needs Verified</option>
                <option value="verified">Verified</option>
              </select>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add an update note..."
                className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitNote();
                  }
                }}
              />
              <button
                onClick={handleSubmitNote}
                disabled={(!newNote.trim() && !newStatus) || addNote.isPending || updateStatus.isPending}
                className="px-4 py-2 bg-survivor-orange hover:bg-survivor-orange/80 disabled:bg-neutral-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {(addNote.isPending || updateStatus.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              onClick={handleResolve}
              disabled={resolveIncident.isPending}
              className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {resolveIncident.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Resolve Incident
            </button>
          </div>
        )}

        {/* Resolved Footer */}
        {isResolved && (
          <div className="p-5 border-t border-neutral-700 space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span>Incident Resolved</span>
              {incident.resolved_at && (
                <span className="text-neutral-500">
                  ({formatDuration(incident.created_at, incident.resolved_at)} total)
                </span>
              )}
            </div>
            <button
              onClick={() => reopenIncident.mutate()}
              disabled={reopenIncident.isPending}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {reopenIncident.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reopen Incident
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
