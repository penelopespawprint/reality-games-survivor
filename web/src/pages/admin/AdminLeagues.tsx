import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Search,
  Loader2,
  Globe,
  Lock,
  Eye,
  Trash2,
  Mail,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

async function apiWithAuth(endpoint: string, options?: RequestInit) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

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

type SortField = 'created' | 'name' | 'members' | 'revenue';

interface League {
  id: string;
  name: string;
  code: string;
  is_public: boolean;
  is_global: boolean;
  status: string;
  max_players: number;
  entry_fee: number;
  require_donation: boolean;
  donation_amount: number;
  created_at: string;
  season_id: string;
  commissioner_id: string;
  seasons?: { id: string; name: string; number: number };
  users?: { id: string; display_name: string; email: string };
  member_count: number;
  pick_stats: { submitted: number; total: number; percentage: number };
  revenue: { gross: number; net: number };
}

export function AdminLeagues() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  // Fetch leagues with enhanced data from API
  const { data: leaguesData, isLoading } = useQuery({
    queryKey: ['admin-leagues-enhanced', statusFilter, typeFilter, sortField],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '100',
        sort: sortField,
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter === 'paid') params.append('type', 'paid');
      if (typeFilter === 'free') params.append('type', 'free');

      const response = await apiWithAuth(`/api/admin/leagues?${params.toString()}`);
      return response as { leagues: League[]; total: number };
    },
  });

  // Delete league mutation
  const deleteLeague = useMutation({
    mutationFn: async (leagueId: string) => {
      return apiWithAuth(`/api/admin/leagues/${leagueId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leagues-enhanced'] });
      setActionMenu(null);
    },
  });

  const leagues = leaguesData?.leagues || [];

  // Filter and sort
  const filteredLeagues = leagues
    .filter((league) => {
      const matchesSearch =
        !search ||
        league.name.toLowerCase().includes(search.toLowerCase()) ||
        league.code.toLowerCase().includes(search.toLowerCase()) ||
        league.users?.display_name?.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'members':
          comparison = (a.member_count || 0) - (b.member_count || 0);
          break;
        case 'revenue':
          comparison = (a.revenue?.gross || 0) - (b.revenue?.gross || 0);
          break;
        default:
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return sortAsc ? comparison : -comparison;
    });

  // Stats
  const stats = {
    total: leagues.length,
    active: leagues.filter((l) => l.status === 'active').length,
    paid: leagues.filter((l) => l.entry_fee > 0).length,
    totalRevenue: leagues.reduce((sum, l) => sum + (l.revenue?.gross || 0), 0),
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getPickColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600 bg-green-100';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <AdminNavBar />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <AdminNavBar />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/admin"
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <Users className="h-6 w-6 text-burgundy-500" />
              League Management
            </h1>
            <p className="text-neutral-500">{stats.total} total leagues</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-card p-4 border border-cream-200">
            <p className="text-2xl font-bold text-neutral-800">{stats.total}</p>
            <p className="text-xs text-neutral-500">Total Leagues</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-4 border border-cream-200">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-neutral-500">Active</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-4 border border-cream-200">
            <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
            <p className="text-xs text-neutral-500">Paid Leagues</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-4 border border-cream-200">
            <p className="text-2xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-neutral-500">Total Revenue</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-card p-4 border border-cream-200 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name, code, or commissioner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-cream-200 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="forming">Forming</option>
              <option value="drafting">Drafting</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-cream-200 rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="paid">Paid</option>
              <option value="free">Free</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-card border border-cream-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream-50 border-b border-cream-200">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-cream-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      League
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-cream-100"
                    onClick={() => handleSort('members')}
                  >
                    <div className="flex items-center gap-1">
                      Members
                      <SortIcon field="members" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Picks
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-cream-100"
                    onClick={() => handleSort('revenue')}
                  >
                    <div className="flex items-center gap-1">
                      Revenue
                      <SortIcon field="revenue" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {filteredLeagues.map((league) => (
                  <>
                    <tr
                      key={league.id}
                      className="hover:bg-cream-50 transition-colors cursor-pointer"
                      onClick={() =>
                        setExpandedLeague(expandedLeague === league.id ? null : league.id)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {league.is_global && <Globe className="h-4 w-4 text-burgundy-500" />}
                          {!league.is_public && <Lock className="h-4 w-4 text-neutral-400" />}
                          <div>
                            <p className="font-medium text-neutral-800">{league.name}</p>
                            <p className="text-xs text-neutral-500">
                              {league.users?.display_name} · {league.code}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-neutral-800">
                          {league.member_count}/{league.max_players}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {league.pick_stats && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getPickColor(league.pick_stats.percentage)}`}
                          >
                            {league.pick_stats.percentage}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              league.status === 'active'
                                ? 'bg-green-100 text-green-600'
                                : league.status === 'drafting'
                                  ? 'bg-amber-100 text-amber-600'
                                  : league.status === 'completed'
                                    ? 'bg-neutral-100 text-neutral-600'
                                    : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            {league.status}
                          </span>
                          {league.entry_fee > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-600">
                              ${league.entry_fee}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {league.entry_fee > 0 ? (
                          <div>
                            <p className="text-green-600 font-medium">
                              ${league.revenue?.gross?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-neutral-500">
                              Net: ${league.revenue?.net?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/leagues/${league.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-neutral-400 hover:text-burgundy-500 hover:bg-cream-100 rounded"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenu(actionMenu === league.id ? null : league.id);
                              }}
                              className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-cream-100 rounded"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {actionMenu === league.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-cream-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = `mailto:${league.users?.email}`;
                                    setActionMenu(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-cream-50 flex items-center gap-2"
                                >
                                  <Mail className="h-4 w-4" /> Message League Creator
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      confirm(`Delete "${league.name}"? This cannot be undone.`)
                                    ) {
                                      deleteLeague.mutate(league.id);
                                    }
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" /> Delete League
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedLeague === league.id && (
                      <tr key={`${league.id}-expanded`}>
                        <td colSpan={6} className="px-4 py-4 bg-cream-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-neutral-500 uppercase">League Creator</p>
                              <p className="font-medium text-neutral-800">
                                {league.users?.display_name}
                              </p>
                              <p className="text-xs text-neutral-500">{league.users?.email}</p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-500 uppercase">Code</p>
                              <p className="font-mono text-burgundy-500">{league.code}</p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-500 uppercase">Season</p>
                              <p className="text-neutral-800">{league.seasons?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-500 uppercase">Created</p>
                              <p className="text-neutral-800">
                                {new Date(league.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {league.entry_fee > 0 && league.revenue && (
                            <div className="mt-4 p-3 bg-white rounded-lg border border-cream-200">
                              <p className="text-xs text-neutral-500 uppercase mb-2">
                                Revenue Breakdown
                              </p>
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-neutral-500">Gross</p>
                                  <p className="font-medium text-neutral-800">
                                    ${league.revenue.gross.toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-neutral-500">Stripe Fee</p>
                                  <p className="font-medium text-red-600">
                                    -${(league.revenue.gross * 0.029 + 0.3).toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-neutral-500">RGFL Fee (7%)</p>
                                  <p className="font-medium text-orange-600">
                                    -${(league.revenue.gross * 0.07).toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-neutral-500">Net to League</p>
                                  <p className="font-medium text-green-600">
                                    ${league.revenue.net.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeagues.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">No leagues found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
