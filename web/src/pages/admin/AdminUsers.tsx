import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Search,
  Eye,
  Mail,
  ExternalLink,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Navigation } from '@/components/Navigation';

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

type UserRole = 'player' | 'commissioner' | 'admin';
type UserSegment = 'power' | 'casual' | 'dormant' | 'churned' | 'new';
type UserHealth = 'healthy' | 'warning' | 'critical';

interface User {
  id: string;
  display_name: string;
  email: string;
  phone?: string | null;
  phone_verified?: boolean;
  role: UserRole;
  avatar_url?: string | null;
  created_at: string;
  last_active_at?: string | null;
  segment?: UserSegment;
  health?: UserHealth;
  league_count?: number;
  pick_count?: number;
}

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [hideTestAccounts, setHideTestAccounts] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleDropdownUserId, setRoleDropdownUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRoleDropdownUserId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all users with enhanced data
  const {
    data: usersData,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['admin-users-enhanced', segmentFilter, healthFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '1000' });
      if (segmentFilter !== 'all') params.append('segment', segmentFilter);
      if (healthFilter !== 'all') params.append('status', healthFilter);

      const response = await apiWithAuth(`/api/admin/users?${params.toString()}`);
      return response as { users: User[]; total: number };
    },
  });

  // Impersonate mutation
  const impersonate = useMutation({
    mutationFn: async (userId: string) => {
      return apiWithAuth(`/api/admin/users/${userId}/impersonate`, { method: 'POST' });
    },
    onSuccess: (data: { impersonationUrl?: string }) => {
      if (data?.impersonationUrl) {
        window.open(data.impersonationUrl, '_blank');
      }
      setShowImpersonateModal(false);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Update role mutation
  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      return apiWithAuth(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-enhanced'] });
      setRoleDropdownUserId(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const users = usersData?.users || [];

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Hide test accounts
    if (hideTestAccounts) {
      const isTest =
        user.display_name?.toLowerCase().includes('test') ||
        user.email?.toLowerCase().includes('test') ||
        user.display_name?.match(/^user\d+$/i);
      if (isTest) return false;
    }

    // Search
    const matchesSearch =
      !search ||
      user.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());

    // Role filter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Calculate stats
  const stats = {
    total: users.length,
    power: users.filter((u) => u.segment === 'power').length,
    casual: users.filter((u) => u.segment === 'casual').length,
    dormant: users.filter((u) => u.segment === 'dormant').length,
    churned: users.filter((u) => u.segment === 'churned').length,
    new: users.filter((u) => u.segment === 'new').length,
    healthy: users.filter((u) => u.health === 'healthy').length,
    warning: users.filter((u) => u.health === 'warning').length,
    critical: users.filter((u) => u.health === 'critical').length,
  };

  const getSegmentBadge = (segment?: UserSegment) => {
    switch (segment) {
      case 'power':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Power
          </span>
        );
      case 'casual':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Casual
          </span>
        );
      case 'dormant':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Dormant
          </span>
        );
      case 'churned':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> Churned
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-600">
            New
          </span>
        );
    }
  };

  const getHealthIndicator = (health?: UserHealth) => {
    switch (health) {
      case 'healthy':
        return <div className="w-2 h-2 rounded-full bg-green-500" title="Active" />;
      case 'warning':
        return <div className="w-2 h-2 rounded-full bg-yellow-500" title="3-7 days inactive" />;
      case 'critical':
        return <div className="w-2 h-2 rounded-full bg-red-500" title="7+ days inactive" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-neutral-300" />;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'commissioner':
        return <ShieldCheck className="h-4 w-4 text-burgundy-500" />;
      default:
        return <Shield className="h-4 w-4 text-neutral-400" />;
    }
  };

  if (fetchError) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card p-8 border border-red-200 text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral-800 mb-2">Access Denied</h2>
            <p className="text-neutral-600 mb-4">
              {fetchError instanceof Error ? fetchError.message : 'You do not have permission.'}
            </p>
            <Link
              to="/admin"
              className="inline-block px-4 py-2 bg-burgundy-500 text-white rounded-lg hover:bg-burgundy-600"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
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
              User Management
            </h1>
            <p className="text-neutral-500">{users.length} registered users</p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 text-sm">Total Users</span>
              <Users className="h-5 w-5 text-burgundy-500" />
            </div>
            <p className="text-2xl font-bold text-neutral-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 text-sm">Power Users</span>
              <Zap className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.power}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 text-sm">At Risk</span>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {stats.dormant + stats.churned}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 text-sm">Active (24h)</span>
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.healthy}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500"
            >
              <option value="all">All Roles</option>
              <option value="player">Players</option>
              <option value="commissioner">Commissioners</option>
              <option value="admin">Admins</option>
            </select>

            {/* Segment Filter */}
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="px-3 py-2 border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500"
            >
              <option value="all">All Segments</option>
              <option value="power">Power Users</option>
              <option value="casual">Casual</option>
              <option value="dormant">Dormant</option>
              <option value="churned">Churned</option>
              <option value="new">New</option>
            </select>

            {/* Health Filter */}
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="px-3 py-2 border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500"
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>

            {/* Hide Test Accounts */}
            <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={hideTestAccounts}
                onChange={(e) => setHideTestAccounts(e.target.checked)}
                className="rounded border-cream-200"
              />
              Hide test accounts
            </label>
          </div>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card border border-cream-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-50 border-b border-cream-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Segment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Leagues
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Picks
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-cream-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getHealthIndicator(user.health)}
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-cream-100 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-neutral-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-neutral-800">{user.display_name}</p>
                            <p className="text-xs text-neutral-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getSegmentBadge(user.segment)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          <span className="text-sm text-neutral-600 capitalize">{user.role}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {user.league_count || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{user.pick_count || 0}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500">
                        {user.last_active_at
                          ? new Date(user.last_active_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowImpersonateModal(true);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-burgundy-500 hover:bg-cream-100 rounded"
                            title="Impersonate"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              window.location.href = `mailto:${user.email}`;
                            }}
                            className="p-1.5 text-neutral-400 hover:text-green-500 hover:bg-cream-100 rounded"
                            title="Send Email"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          <div
                            className="relative"
                            ref={roleDropdownUserId === user.id ? dropdownRef : null}
                          >
                            <button
                              onClick={() =>
                                setRoleDropdownUserId(
                                  roleDropdownUserId === user.id ? null : user.id
                                )
                              }
                              className={`p-1.5 hover:bg-cream-100 rounded ${roleDropdownUserId === user.id ? 'text-burgundy-500 bg-cream-100' : 'text-neutral-400 hover:text-neutral-600'}`}
                              title="Change Role"
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                            {roleDropdownUserId === user.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-cream-200 rounded-lg shadow-lg z-20 min-w-[140px]">
                                <button
                                  onClick={() =>
                                    updateRole.mutate({ userId: user.id, role: 'player' })
                                  }
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-cream-50 flex items-center gap-2 ${user.role === 'player' ? 'bg-cream-100 font-medium' : ''}`}
                                >
                                  <Shield className="h-4 w-4" /> Player
                                </button>
                                <button
                                  onClick={() =>
                                    updateRole.mutate({ userId: user.id, role: 'commissioner' })
                                  }
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-cream-50 flex items-center gap-2 ${user.role === 'commissioner' ? 'bg-cream-100 font-medium' : ''}`}
                                >
                                  <ShieldCheck className="h-4 w-4" /> Commissioner
                                </button>
                                <button
                                  onClick={() =>
                                    updateRole.mutate({ userId: user.id, role: 'admin' })
                                  }
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-cream-50 flex items-center gap-2 ${user.role === 'admin' ? 'bg-cream-100 font-medium' : ''}`}
                                >
                                  <ShieldAlert className="h-4 w-4" /> Admin
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">No users found matching your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Impersonate Modal */}
      {showImpersonateModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-neutral-800 mb-4">Impersonate User</h3>
            <p className="text-neutral-600 mb-4">
              You are about to log in as <strong>{selectedUser.display_name}</strong> (
              {selectedUser.email}). This will open in a new tab.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Use with caution. All actions will be logged.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImpersonateModal(false)}
                className="flex-1 px-4 py-2 border border-cream-200 rounded-lg hover:bg-cream-50"
              >
                Cancel
              </button>
              <button
                onClick={() => impersonate.mutate(selectedUser.id)}
                disabled={impersonate.isPending}
                className="flex-1 px-4 py-2 bg-burgundy-500 text-white rounded-lg hover:bg-burgundy-600 flex items-center justify-center gap-2"
              >
                {impersonate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Open as User
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
