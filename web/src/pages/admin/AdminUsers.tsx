import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  MapPin,
  Heart,
  ChevronDown,
  ChevronUp,
  Edit2,
  X,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Navigation } from '@/components/Navigation';

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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    display_name: '',
    email: '',
    phone: '',
    hometown: '',
    favorite_castaway: '',
    timezone: '',
  });

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
      const { data, error } = await supabase.from('league_members').select('user_id');
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
      const { error } = await supabase.from('users').update({ role }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
    },
  });

  // Update user details mutation
  const updateUser = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<EditForm> }) => {
      const { error } = await supabase.from('users').update(data).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
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
            <p className="text-neutral-500 text-xs">League Creators</p>
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
            <option value="commissioner">League Creators</option>
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
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${getRoleBadgeClass(user.role)}`}
                  >
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
                          onClick={() =>
                            updateRole.mutate({ userId: user.id, role: 'commissioner' })
                          }
                          className="w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-cream-50 flex items-center gap-2"
                        >
                          <ShieldCheck className="h-4 w-4" /> Set League Creator
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
                <button
                  onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  className="text-burgundy-500 hover:text-burgundy-700 text-sm flex items-center gap-1"
                >
                  {expandedUser === user.id ? (
                    <>
                      Hide Details <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      View Full Profile <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Expanded Profile Details */}
              {expandedUser === user.id && (
                <div className="mt-4 pt-4 border-t border-cream-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-neutral-700 text-sm">Full Profile</h4>
                    {editingUser === user.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={saveUser}
                          disabled={updateUser.isPending}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg flex items-center gap-1"
                        >
                          {updateUser.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="px-3 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs rounded-lg flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(user)}
                        className="px-3 py-1 bg-burgundy-100 hover:bg-burgundy-200 text-burgundy-700 text-xs rounded-lg flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </button>
                    )}
                  </div>

                  {editingUser === user.id ? (
                    // Edit Form
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide block mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={editForm.display_name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, display_name: e.target.value })
                          }
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide block mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide block mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="input text-sm"
                          placeholder="+1 555-123-4567"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide block mb-1">
                          Hometown
                        </label>
                        <input
                          type="text"
                          value={editForm.hometown}
                          onChange={(e) => setEditForm({ ...editForm, hometown: e.target.value })}
                          className="input text-sm"
                          placeholder="City, State"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide block mb-1">
                          Favorite Castaway
                        </label>
                        <input
                          type="text"
                          value={editForm.favorite_castaway}
                          onChange={(e) =>
                            setEditForm({ ...editForm, favorite_castaway: e.target.value })
                          }
                          className="input text-sm"
                          placeholder="Boston Rob, Parvati..."
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide block mb-1">
                          Timezone
                        </label>
                        <select
                          value={editForm.timezone}
                          onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                          className="input text-sm"
                        >
                          <option value="America/Los_Angeles">Pacific (LA)</option>
                          <option value="America/Denver">Mountain (Denver)</option>
                          <option value="America/Chicago">Central (Chicago)</option>
                          <option value="America/New_York">Eastern (NYC)</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide">
                          User ID
                        </label>
                        <p className="font-mono text-xs text-neutral-600 break-all">{user.id}</p>
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide">
                          Email
                        </label>
                        <p className="text-neutral-800">{user.email}</p>
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide">
                          Phone
                        </label>
                        <p className="text-neutral-800 flex items-center gap-1">
                          {user.phone || 'Not provided'}
                          {user.phone_verified && (
                            <span className="text-green-500 text-xs">(verified)</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide">
                          Hometown
                        </label>
                        <p className="text-neutral-800 flex items-center gap-1">
                          {user.hometown ? (
                            <>
                              <MapPin className="h-3 w-3" /> {user.hometown}
                            </>
                          ) : (
                            <span className="text-neutral-400">Not provided</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide">
                          Favorite Castaway
                        </label>
                        <p className="text-neutral-800 flex items-center gap-1">
                          {user.favorite_castaway ? (
                            <>
                              <Heart className="h-3 w-3" /> {user.favorite_castaway}
                            </>
                          ) : (
                            <span className="text-neutral-400">Not provided</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide">
                          Timezone
                        </label>
                        <p className="text-neutral-800">{user.timezone || 'America/Los_Angeles'}</p>
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide">
                          Created
                        </label>
                        <p className="text-neutral-800">
                          {new Date(user.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-neutral-400 text-xs uppercase tracking-wide">
                          Last Updated
                        </label>
                        <p className="text-neutral-800">
                          {new Date(user.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div
                      className={`p-2 rounded-lg text-center ${user.notification_email ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}
                    >
                      <Mail className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-xs">
                        Email {user.notification_email ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div
                      className={`p-2 rounded-lg text-center ${user.notification_sms ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}
                    >
                      <Phone className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-xs">SMS {user.notification_sms ? 'ON' : 'OFF'}</span>
                    </div>
                    <div
                      className={`p-2 rounded-lg text-center ${user.notification_push ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}
                    >
                      <span className="text-sm mx-auto mb-1 block">🔔</span>
                      <span className="text-xs">Push {user.notification_push ? 'ON' : 'OFF'}</span>
                    </div>
                  </div>
                </div>
              )}
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
