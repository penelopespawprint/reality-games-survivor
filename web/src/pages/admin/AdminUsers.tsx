import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, Search, Shield, ShieldCheck, ShieldAlert, Loader2, Mail, Phone, Calendar, MoreVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Navigation } from '@/components/Navigation';

type UserRole = 'player' | 'commissioner' | 'admin';

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Fetch all users
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch league counts per user
  const { data: leagueCounts } = useQuery({
    queryKey: ['admin-user-league-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_members')
        .select('user_id');
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((m) => {
        counts[m.user_id] = (counts[m.user_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Update user role mutation
  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
    },
  });

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

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-600';
      case 'commissioner':
        return 'bg-burgundy-100 text-burgundy-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
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
            All Users
          </h1>
          <p className="text-neutral-500">{users?.length || 0} registered users</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        <div className="bg-white rounded-2xl shadow-card p-3 border border-cream-200 text-center">
          <p className="text-xl font-bold text-neutral-800">{stats.total}</p>
          <p className="text-neutral-500 text-xs">Total</p>
        </div>
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-neutral-600">{stats.players}</p>
          <p className="text-neutral-500 text-xs">Players</p>
        </div>
        <div className="bg-burgundy-50 border border-burgundy-200 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-burgundy-600">{stats.commissioners}</p>
          <p className="text-neutral-500 text-xs">Commissioners</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-red-600">{stats.admins}</p>
          <p className="text-neutral-500 text-xs">Admins</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-green-600">{stats.verified}</p>
          <p className="text-neutral-500 text-xs">Verified</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="input pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input px-3 py-2 w-36"
        >
          <option value="all">All Roles</option>
          <option value="player">Players</option>
          <option value="commissioner">Commissioners</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers?.map((user: any) => (
          <div
            key={user.id}
            className="bg-white rounded-2xl shadow-card p-4 border border-cream-200"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-cream-100 rounded-full flex items-center justify-center border border-cream-200">
                    <Users className="h-5 w-5 text-neutral-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-neutral-800 font-medium">{user.display_name}</h3>
                  <p className="text-neutral-500 text-sm">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${getRoleBadgeClass(user.role)}`}>
                  {getRoleIcon(user.role)}
                  {user.role}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                    className="p-1 hover:bg-cream-100 rounded"
                  >
                    <MoreVertical className="h-4 w-4 text-neutral-400" />
                  </button>
                  {selectedUser === user.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-cream-200 rounded-xl shadow-card z-10 min-w-32">
                      <button
                        onClick={() => updateRole.mutate({ userId: user.id, role: 'player' })}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-cream-50 flex items-center gap-2 rounded-t-xl"
                      >
                        <Shield className="h-4 w-4" /> Set Player
                      </button>
                      <button
                        onClick={() => updateRole.mutate({ userId: user.id, role: 'commissioner' })}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-cream-50 flex items-center gap-2"
                      >
                        <ShieldCheck className="h-4 w-4" /> Set Commissioner
                      </button>
                      <button
                        onClick={() => updateRole.mutate({ userId: user.id, role: 'admin' })}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-cream-50 flex items-center gap-2 rounded-b-xl"
                      >
                        <ShieldAlert className="h-4 w-4" /> Set Admin
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm text-neutral-500">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>
                  {user.phone || 'No phone'}
                  {user.phone_verified && <span className="text-green-500 ml-1">✓</span>}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-neutral-400 text-sm">
                {leagueCounts?.[user.id] || 0} leagues
              </span>
              <div className="flex gap-2">
                <button className="text-neutral-500 hover:text-neutral-800 text-sm">
                  View Activity
                </button>
              </div>
            </div>
          </div>
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
