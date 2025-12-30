/**
 * League Settings Page
 *
 * Allows commissioners and admins to manage league settings.
 * Refactored from 709 lines to use extracted sub-components.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Settings, Loader2, Crown, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/lib/auth';
import { apiWithAuth } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import {
  InviteLinkCard,
  AdminSettingsSection,
  VisibilitySettings,
  DonationSettings,
  MembersList,
  TransferOwnershipSection,
  DangerZone,
} from '@/components/settings';
// import type { League, Season, UserProfile, DraftStatus } from '@/types';

interface LeagueMember {
  id: string;
  user_id: string;
  users?: {
    id: string;
    display_name: string;
    email?: string;
  };
}

export default function LeagueSettings() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [requireDonation, setRequireDonation] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch user profile to check admin status
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id,
  });

  // Fetch league details
  const { data: league, isLoading } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('*, seasons(*)')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
  });

  // Fetch league members
  const { data: members } = useQuery({
    queryKey: ['league-members', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('league_members')
        .select('*, users(id, display_name, email)')
        .eq('league_id', leagueId)
        .order('draft_position', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as LeagueMember[];
    },
    enabled: !!leagueId,
  });

  // Populate form when league loads
  useEffect(() => {
    if (league) {
      setName(league.name || '');
      setDescription((league as { description?: string }).description || '');
      setIsPublic(league.is_public || false);
      setMaxPlayers(league.max_players || 12);
      setRequireDonation(league.require_donation || false);
      setDonationAmount(league.donation_amount?.toString() || '');
    }
  }, [league]);

  // Check if current user is commissioner or admin
  const isCommissioner = league?.commissioner_id === currentUser?.id;
  const isAdmin = userProfile?.role === 'admin';
  const canManageLeague = isCommissioner || isAdmin;

  // Update league mutation - uses backend API for proper password hashing
  const updateLeague = useMutation({
    mutationFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      if (!session?.access_token) throw new Error('Not authenticated');

      // Build updates object - backend handles password hashing
      const updates: Record<string, unknown> = {
        description,
      };

      // Only admins can modify these settings after league is created
      if (isAdmin) {
        updates.name = name;
        updates.is_public = isPublic;
        updates.max_players = maxPlayers;
        updates.donation_amount = requireDonation ? parseFloat(donationAmount) : null;

        // Send raw password - backend will hash it securely
        if (password) {
          updates.password = password;
        }
      }

      const response = await apiWithAuth<{ league: unknown }>(
        `/leagues/${leagueId}/settings`,
        session.access_token,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
      setPassword(''); // Clear password field after save
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update league settings');
    },
  });

  // Remove member mutation - uses backend API for proper authorization
  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!leagueId) throw new Error('No league ID');
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await apiWithAuth<{ success: boolean; refund?: { amount: number } }>(
        `/leagues/${leagueId}/members/${userId}`,
        session.access_token,
        { method: 'DELETE' }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-members', leagueId] });
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to remove member');
    },
  });

  // Transfer ownership mutation - uses backend API for proper authorization
  const transferOwnership = useMutation({
    mutationFn: async (newCommissionerId: string) => {
      if (!leagueId) throw new Error('No league ID');
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await apiWithAuth<{ league: unknown; message: string }>(
        `/leagues/${leagueId}/transfer`,
        session.access_token,
        {
          method: 'POST',
          body: JSON.stringify({ new_commissioner_id: newCommissionerId }),
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
      navigate(`/leagues/${leagueId}`);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to transfer ownership');
    },
  });

  // Delete league mutation
  const deleteLeague = useMutation({
    mutationFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { error } = await supabase.from('leagues').delete().eq('id', leagueId);
      if (error) throw error;
    },
    onSuccess: () => {
      navigate('/dashboard');
    },
  });

  const handleRemoveMember = (userId: string, displayName: string) => {
    if (confirm(`Remove ${displayName} from the league?`)) {
      removeMember.mutate(userId);
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

  if (!canManageLeague) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <h1 className="text-xl font-display font-bold text-neutral-800 mb-2">Access Denied</h1>
            <p className="text-neutral-500 mb-4">
              Only the league creator or admin can access settings.
            </p>
            <Link to={`/leagues/${leagueId}`} className="text-burgundy-500 hover:text-burgundy-600">
              Back to League
            </Link>
          </div>
        </div>
      </>
    );
  }

  const otherMembers = members?.filter((m) => m.user_id !== currentUser?.id) || [];

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={`/leagues/${leagueId}`}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <Settings className="h-6 w-6 text-burgundy-500" />
              League Settings
            </h1>
            <p className="text-neutral-500 flex items-center gap-2">
              {league?.name}
              <span className="inline-flex items-center gap-1 bg-burgundy-100 text-burgundy-600 text-xs px-2 py-0.5 rounded-full">
                <Crown className="h-3 w-3" />
                {isCommissioner ? 'Creator' : 'Admin'}
              </span>
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                ×
              </button>
            </div>
          )}

          <InviteLinkCard code={league?.code} />

          {/* Description Only - photo_url column not in database */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
            <label className="block">
              <span className="text-neutral-800 font-medium mb-2 block">League Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell members what your league is about..."
                className="input min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-neutral-400 text-xs mt-1 text-right">{description.length}/500</p>
            </label>
          </div>

          {isAdmin && (
            <>
              <AdminSettingsSection
                name={name}
                password={password}
                onNameChange={setName}
                onPasswordChange={setPassword}
              />

              <VisibilitySettings
                isPublic={isPublic}
                maxPlayers={maxPlayers}
                currentMemberCount={members?.length || 0}
                draftStatus={league?.draft_status || 'pending'}
                onPublicChange={setIsPublic}
                onMaxPlayersChange={setMaxPlayers}
              />

              <DonationSettings
                requireDonation={requireDonation}
                donationAmount={donationAmount}
                draftStatus={league?.draft_status || 'pending'}
                onRequireDonationChange={setRequireDonation}
                onDonationAmountChange={setDonationAmount}
              />
            </>
          )}

          <MembersList
            members={members}
            currentUserId={currentUser?.id}
            draftStatus={league?.draft_status || 'pending'}
            onRemoveMember={handleRemoveMember}
            isRemoving={removeMember.isPending}
            removeError={removeMember.isError}
          />

          {/* Save Button */}
          <button
            onClick={() => updateLeague.mutate()}
            disabled={updateLeague.isPending}
            className="w-full btn btn-primary flex items-center justify-center gap-2"
          >
            {updateLeague.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
          </button>

          {updateLeague.isSuccess && <p className="text-green-600 text-center">Settings saved!</p>}

          <TransferOwnershipSection
            otherMembers={otherMembers}
            onTransfer={(id) => transferOwnership.mutate(id)}
            isPending={transferOwnership.isPending}
            isError={transferOwnership.isError}
          />

          {league?.draft_status === 'pending' && (
            <DangerZone onDelete={() => deleteLeague.mutate()} isPending={deleteLeague.isPending} />
          )}
        </div>
      </div>
    </>
  );
}
