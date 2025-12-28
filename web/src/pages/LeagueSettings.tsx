/**
 * League Settings Page
 *
 * Allows commissioners and admins to manage league settings.
 * Refactored from 709 lines to use extracted sub-components.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Settings, Loader2, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Navigation } from '@/components/Navigation';
import {
  InviteLinkCard,
  LeagueBrandingSection,
  AdminSettingsSection,
  VisibilitySettings,
  DonationSettings,
  MembersList,
  TransferOwnershipSection,
  DangerZone,
} from '@/components/settings';

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

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [password, setPassword] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [requireDonation, setRequireDonation] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');

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
      return data as typeof data & { description?: string; photo_url?: string };
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
      setDescription(league.description || '');
      setPhotoUrl(league.photo_url || '');
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

  // Update league mutation
  const updateLeague = useMutation({
    mutationFn: async () => {
      if (!leagueId) throw new Error('No league ID');

      // Creators can only update description and photo after league creation
      // Admins can update everything
      const updates: Record<string, unknown> = {
        description,
        photo_url: photoUrl || null,
      };

      // Only admins can modify these settings after league is created
      if (isAdmin) {
        updates.name = name;
        updates.is_public = isPublic;
        updates.max_players = maxPlayers;
        updates.require_donation = requireDonation;
        updates.donation_amount = requireDonation ? parseFloat(donationAmount) : null;

        if (password) {
          updates.password_hash = password;
        }
      }

      const { error } = await supabase.from('leagues').update(updates).eq('id', leagueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
    },
  });

  // Remove member mutation
  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!leagueId) throw new Error('No league ID');

      // Delete from league_members
      const { error } = await supabase
        .from('league_members')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', userId);

      if (error) throw error;

      // Also clean up rosters
      await supabase.from('rosters').delete().eq('league_id', leagueId).eq('user_id', userId);

      // And weekly picks
      await supabase.from('weekly_picks').delete().eq('league_id', leagueId).eq('user_id', userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-members', leagueId] });
    },
  });

  // Transfer ownership mutation
  const transferOwnership = useMutation({
    mutationFn: async (newCommissionerId: string) => {
      if (!leagueId) throw new Error('No league ID');

      const { error } = await supabase
        .from('leagues')
        .update({
          commissioner_id: newCommissionerId,
          co_commissioners: [], // Clear co-commissioners on transfer
        })
        .eq('id', leagueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
      navigate(`/leagues/${leagueId}`);
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
          <InviteLinkCard code={league?.code} />

          <LeagueBrandingSection
            leagueId={leagueId!}
            photoUrl={photoUrl}
            description={description}
            onPhotoChange={setPhotoUrl}
            onDescriptionChange={setDescription}
          />

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
                draftStatus={league?.draft_status}
                onPublicChange={setIsPublic}
                onMaxPlayersChange={setMaxPlayers}
              />

              <DonationSettings
                requireDonation={requireDonation}
                donationAmount={donationAmount}
                draftStatus={league?.draft_status}
                onRequireDonationChange={setRequireDonation}
                onDonationAmountChange={setDonationAmount}
              />
            </>
          )}

          <MembersList
            members={members}
            currentUserId={currentUser?.id}
            draftStatus={league?.draft_status}
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
