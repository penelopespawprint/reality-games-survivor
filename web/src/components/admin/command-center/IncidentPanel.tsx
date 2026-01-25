import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Plus, X, Loader2, History, ChevronRight, ChevronLeft, Link as LinkIcon } from 'lucide-react';
import { IncidentDetailModal } from './IncidentDetailModal';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface Incident {
  id: string;
  severity: string;
  title: string;
  status: string;
}

interface IncidentPanelProps {
  incidents: Incident[];
}

const severityColors = {
  PL: 'bg-purple-600 text-white',
  P0: 'bg-red-800 text-white',
  P1: 'bg-red-600 text-white',
  P2: 'bg-orange-600 text-white',
  P3: 'bg-yellow-600 text-black',
  P4: 'bg-blue-600 text-white',
};

const severityDescriptions = {
  PL: 'Cannot launch without',
  P0: 'Critical Game Function',
  P1: 'Major Web Update',
  P2: 'Minor Web Update',
  P3: 'Minor Edits',
  P4: 'Nice to have',
};

const statusLabels = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  needs_verified: 'Needs Verified',
  verified: 'Verified',
  resolved: 'Resolved',
};

const statusColors = {
  investigating: 'bg-red-900/50 text-red-300 border-red-700',
  identified: 'bg-orange-900/50 text-orange-300 border-orange-700',
  monitoring: 'bg-blue-900/50 text-blue-300 border-blue-700',
  needs_verified: 'bg-purple-900/50 text-purple-300 border-purple-700',
  verified: 'bg-teal-900/50 text-teal-300 border-teal-700',
  resolved: 'bg-green-900/50 text-green-300 border-green-700',
};

async function apiWithAuth(endpoint: string, options?: RequestInit) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated - please log in again');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

const ITEMS_PER_PAGE = 5;

export function IncidentPanel({ incidents: propIncidents }: IncidentPanelProps) {
  const queryClient = useQueryClient();
  const [showDeclareForm, setShowDeclareForm] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [resolvedPage, setResolvedPage] = useState(0);
  const [newIncident, setNewIncident] = useState({
    severity: 'P2',
    title: '',
    description: '',
    affectedSystems: [] as string[],
    link: '',
  });

  // Fetch all active incidents (not resolved)
  const { data: activeData } = useQuery<{ incidents: Incident[]; total: number }>({
    queryKey: ['incidents', 'active'],
    queryFn: () =>
      apiWithAuth('/api/admin/incidents?includeResolved=false&limit=100'),
    refetchInterval: 10000,
  });

  // Fetch resolved incidents when toggle is on
  const { data: resolvedData } = useQuery<{ incidents: Incident[] }>({
    queryKey: ['incidents', 'resolved'],
    queryFn: () =>
      apiWithAuth('/api/admin/incidents?status=resolved&limit=50'),
    enabled: showResolved,
  });

  // Use fetched incidents, fallback to prop
  const incidents = activeData?.incidents || propIncidents;

  // Paginate active incidents
  const totalActivePages = Math.ceil(incidents.length / ITEMS_PER_PAGE);
  const paginatedActiveIncidents = incidents.slice(
    activePage * ITEMS_PER_PAGE,
    (activePage + 1) * ITEMS_PER_PAGE
  );

  // Paginate resolved incidents
  const resolvedIncidents = resolvedData?.incidents || [];
  const totalResolvedPages = Math.ceil(resolvedIncidents.length / ITEMS_PER_PAGE);
  const paginatedResolvedIncidents = resolvedIncidents.slice(
    resolvedPage * ITEMS_PER_PAGE,
    (resolvedPage + 1) * ITEMS_PER_PAGE
  );

  const [declareError, setDeclareError] = useState<string | null>(null);

  const declareIncident = useMutation({
    mutationFn: (data: typeof newIncident) =>
      apiWithAuth('/api/admin/incidents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', 'active'] });
      setShowDeclareForm(false);
      setDeclareError(null);
      setNewIncident({ severity: 'P2', title: '', description: '', affectedSystems: [], link: '' });
    },
    onError: (error) => {
      setDeclareError(error instanceof Error ? error.message : 'Failed to declare incident');
    },
  });

  const systems = [
    'Authentication',
    'Payments',
    'Scoring',
    'Drafts',
    'Picks',
    'Notifications',
    'Storage',
  ];

  return (
    <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
          Incident Panel
        </h3>
        <button
          onClick={() => setShowDeclareForm(!showDeclareForm)}
          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
        >
          {showDeclareForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showDeclareForm ? 'Cancel' : 'Declare'}
        </button>
      </div>

      {/* Declare Form */}
      {showDeclareForm && (
        <div className="mb-4 p-4 bg-neutral-900 rounded-lg border border-neutral-700">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Severity</label>
              <div className="flex flex-wrap gap-2">
                {['PL', 'P0', 'P1', 'P2', 'P3', 'P4'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setNewIncident((n) => ({ ...n, severity: sev }))}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors relative group ${
                      newIncident.severity === sev
                        ? severityColors[sev as keyof typeof severityColors]
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    }`}
                    title={severityDescriptions[sev as keyof typeof severityDescriptions]}
                  >
                    {sev}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-neutral-200 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {severityDescriptions[sev as keyof typeof severityDescriptions]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Title</label>
              <input
                type="text"
                value={newIncident.title}
                onChange={(e) => setNewIncident((n) => ({ ...n, title: e.target.value }))}
                placeholder="Brief description of the issue"
                className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm text-white placeholder-neutral-500"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Affected Systems</label>
              <div className="flex flex-wrap gap-1">
                {systems.map((sys) => (
                  <button
                    key={sys}
                    onClick={() =>
                      setNewIncident((n) => ({
                        ...n,
                        affectedSystems: n.affectedSystems.includes(sys)
                          ? n.affectedSystems.filter((s) => s !== sys)
                          : [...n.affectedSystems, sys],
                      }))
                    }
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      newIncident.affectedSystems.includes(sys)
                        ? 'bg-red-600 text-white'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    }`}
                  >
                    {sys}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                <span className="flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  Link (optional)
                </span>
              </label>
              <input
                type="url"
                value={newIncident.link}
                onChange={(e) => setNewIncident((n) => ({ ...n, link: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm text-white placeholder-neutral-500"
              />
            </div>

            {declareError && (
              <div className="p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-xs">
                {declareError}
              </div>
            )}

            <button
              onClick={() => {
                setDeclareError(null);
                declareIncident.mutate(newIncident);
              }}
              disabled={!newIncident.title || declareIncident.isPending}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {declareIncident.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              Declare Incident
            </button>
          </div>
        </div>
      )}

      {/* Active Incidents */}
      {incidents.length > 0 ? (
        <div className="space-y-2">
          {paginatedActiveIncidents.map((incident) => (
            <button
              key={incident.id}
              onClick={() => setSelectedIncidentId(incident.id)}
              className="w-full flex items-center gap-3 p-3 bg-neutral-900 rounded-lg border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 transition-colors text-left"
            >
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  severityColors[incident.severity as keyof typeof severityColors]
                }`}
              >
                {incident.severity}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs border ${
                  statusColors[incident.status as keyof typeof statusColors]
                }`}
              >
                {statusLabels[incident.status as keyof typeof statusLabels]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{incident.title}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-500" />
            </button>
          ))}
          {/* Active Incidents Pagination */}
          {totalActivePages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setActivePage((p) => Math.max(0, p - 1))}
                disabled={activePage === 0}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white disabled:opacity-50 disabled:hover:text-neutral-400 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span className="text-xs text-neutral-500">
                {activePage + 1} / {totalActivePages}
              </span>
              <button
                onClick={() => setActivePage((p) => Math.min(totalActivePages - 1, p + 1))}
                disabled={activePage >= totalActivePages - 1}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white disabled:opacity-50 disabled:hover:text-neutral-400 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-900/30 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-sm text-neutral-400">No active incidents</p>
          <p className="text-xs text-neutral-500 mt-1">All systems operational</p>
        </div>
      )}

      {/* Resolved Incidents Toggle */}
      <div className="mt-4 pt-4 border-t border-neutral-700">
        <button
          onClick={() => setShowResolved(!showResolved)}
          className="w-full flex items-center justify-between text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Resolved Incidents
          </span>
          <ChevronRight
            className={`h-4 w-4 transition-transform ${showResolved ? 'rotate-90' : ''}`}
          />
        </button>

        {showResolved && (
          <div className="mt-3 space-y-2">
            {resolvedIncidents.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-2">
                No resolved incidents
              </p>
            ) : (
              <>
                {paginatedResolvedIncidents.map((incident) => (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncidentId(incident.id)}
                    className="w-full flex items-center gap-3 p-2 bg-neutral-900/50 rounded-lg border border-neutral-700/50 hover:border-neutral-600 hover:bg-neutral-800/50 transition-colors text-left opacity-75"
                  >
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        severityColors[incident.severity as keyof typeof severityColors]
                      }`}
                    >
                      {incident.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-300 truncate">{incident.title}</p>
                      <p className="text-xs text-green-600">Resolved</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-600" />
                  </button>
                ))}
                {/* Resolved Incidents Pagination */}
                {totalResolvedPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setResolvedPage((p) => Math.max(0, p - 1))}
                      disabled={resolvedPage === 0}
                      className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white disabled:opacity-50 disabled:hover:text-neutral-400 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </button>
                    <span className="text-xs text-neutral-500">
                      {resolvedPage + 1} / {totalResolvedPages}
                    </span>
                    <button
                      onClick={() => setResolvedPage((p) => Math.min(totalResolvedPages - 1, p + 1))}
                      disabled={resolvedPage >= totalResolvedPages - 1}
                      className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white disabled:opacity-50 disabled:hover:text-neutral-400 transition-colors"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncidentId && (
        <IncidentDetailModal
          incidentId={selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
        />
      )}
    </div>
  );
}
