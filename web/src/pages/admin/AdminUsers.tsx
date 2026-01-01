import { useState } from 'react';
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
} from 'lucide-react';
import { apiWithAuth } from '@/lib/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/lib/auth';
import { AdminNavigation } from '@/components/AdminNavigation';
import { UserStats, UserFilters, UserCard } from '@/components/admin/users';

type UserRole = 'player' | 'commissioner' | 'admin';

interface EditForm {
  display_name: string;
  email: string;
  phone: string;
  hometown: string;
  favorite_castaway: string;
  timezone: string;
}

export function AdminUsers() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    display_name: '',
    email: '',
    phone: '',
    hometown: '',
    favorite_castaway: '',
    timezone: '',
  });

  // Fetch all users via admin API endpoint (properly authorized)
  const {
    data: users,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await apiWithAuth<{ users: any[]; total: number }>(
        '/admin/users?limit=1000',
        session.access_token
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data?.users || [];
    },
    enabled: !!session?.access_token,
  });

  // Fetch league counts per user (read-only, safe to use Supabase directly)
  const { data: leagueCounts } = useQuery({
    queryKey: ['admin-user-league-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('league_members').select('user_id');
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((m) => {
        counts[m.user_id] = (counts[m.user_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Update user role mutation - uses backend API with admin authorization
  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      const response = await apiWithAuth<{ user: unknown }>(
        `/admin/users/${userId}`,
        session.access_token,
        {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        }
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update user role');
    },
  });

  // Update user details mutation - uses backend API with admin authorization
  const updateUser = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<EditForm> }) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      const response = await apiWithAuth<{ user: unknown }>(
        `/admin/users/${userId}`,
        session.access_token,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update user');
    },
  });

  const startEditing = (user: any) => {
    setEditingUser(user.id);
    setEditForm({
      display_name: user.display_name || '',
      email: user.email || '',
      phone: user.phone || '',
      hometown: user.hometown || '',
      favorite_castaway: user.favorite_castaway || '',
      timezone: user.timezone || 'America/Los_Angeles',
    });
    setExpandedUser(user.id);
  };

  const saveUser = () => {
    if (!editingUser) return;
    updateUser.mutate({
      userId: editingUser,
      data: editForm,
    });
  };

  const filteredUsers = users?.filter((user: any) => {
    const matchesSearch =
      user.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.phone?.includes(search);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users?.length || 0,
    players: users?.filter((u: any) => u.role === 'player').length || 0,
    commissioners: users?.filter((u: any) => u.role === 'commissioner').length || 0,
    admins: users?.filter((u: any) => u.role === 'admin').length || 0,
    verified: users?.filter((u: any) => u.phone_verified).length || 0,
  };

  const _getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'commissioner':
        return <ShieldCheck className="h-4 w-4 text-burgundy-500" />;
      default:
        return <Shield className="h-4 w-4 text-neutral-400" />;
    }
  };

  const _getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-600';
      case 'commissioner':
        return 'bg-burgundy-100 text-burgundy-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  // Show error state
  if (fetchError) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card p-8 border border-red-200 text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral-800 mb-2">Access Denied</h2>
            <p className="text-neutral-600 mb-4">
              {fetchError instanceof Error
                ? fetchError.message
                : 'You do not have permission to view this page.'}
            </p>
            <Link
              to="/admin"
              className="inline-block px-4 py-2 bg-burgundy-500 text-white rounded-lg hover:bg-burgundy-600 transition-colors"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavigation />
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
              All Users
            </h1>
            <p className="text-neutral-500">{users?.length || 0} registered users</p>
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

        {/* Stats */}
        <UserStats stats={stats} />

        {/* Search & Filter */}
        <UserFilters
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
        />

        {/* Users List */}
        <div className="space-y-3">
          {filteredUsers?.map((user: any) => (
            <UserCard
              key={user.id}
              user={user}
              leagueCount={leagueCounts?.[user.id] || 0}
              isSelected={selectedUser === user.id}
              onSelect={setSelectedUser}
              isExpanded={expandedUser === user.id}
              onExpand={setExpandedUser}
              isEditing={editingUser === user.id}
              onEdit={startEditing}
              onCancelEdit={() => setEditingUser(null)}
              onSave={saveUser}
              onUpdateRole={(userId, role) => updateRole.mutate({ userId, role })}
              editForm={editForm}
              onEditFormChange={setEditForm}
              isSaving={updateUser.isPending}
            />
          ))}

          {filteredUsers?.length === 0 && (
            <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 text-center">
              <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-500">No users found.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
