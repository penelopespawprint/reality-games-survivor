import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Plus, X, Loader2, History, ChevronRight } from 'lucide-react';
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
  P1: 'bg-red-600 text-white',
  P2: 'bg-orange-600 text-white',
  P3: 'bg-yellow-600 text-black',
  P4: 'bg-blue-600 text-white',
};

const statusLabels = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
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

export function IncidentPanel({ incidents }: IncidentPanelProps) {
  const queryClient = useQueryClient();
  const [showDeclareForm, setShowDeclareForm] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [newIncident, setNewIncident] = useState({
    severity: 'P2',
    title: '',
    description: '',
    affectedSystems: [] as string[],
  });

  // Fetch resolved incidents when toggle is on
  const { data: resolvedData } = useQuery<{ incidents: Incident[] }>({
    queryKey: ['incidents', 'resolved'],
    queryFn: () =>
      apiWithAuth('/api/admin/incidents?status=resolved&limit=10'),
    enabled: showResolved,
  });

  const declareIncident = useMutation({
    mutationFn: (data: typeof newIncident) =>
      apiWithAuth('/api/admin/incidents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['command-center'] });
      setShowDeclareForm(false);
      setNewIncident({ severity: 'P2', title: '', description: '', affectedSystems: [] });
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
              <div className="flex gap-2">
                {['P1', 'P2', 'P3', 'P4'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setNewIncident((n) => ({ ...n, severity: sev }))}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      newIncident.severity === sev
                        ? severityColors[sev as keyof typeof severityColors]
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    }`}
                  >
                    {sev}
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

            <button
              onClick={() => declareIncident.mutate(newIncident)}
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
          {incidents.map((incident) => (
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
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{incident.title}</p>
                <p className="text-xs text-neutral-500">
                  {statusLabels[incident.status as keyof typeof statusLabels]}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-500" />
            </button>
          ))}
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

        {showResolved && resolvedData?.incidents && (
          <div className="mt-3 space-y-2">
            {resolvedData.incidents.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-2">
                No resolved incidents
              </p>
            ) : (
              resolvedData.incidents.map((incident) => (
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
              ))
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
