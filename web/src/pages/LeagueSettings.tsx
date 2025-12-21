import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Settings, Users, DollarSign, Lock, Copy, Check, Loader2,
  Trash2, Shuffle, Crown, Globe, Eye, EyeOff, UserMinus, ArrowRightLeft,
  Shield, X, AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LeagueSettings() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [requireDonation, setRequireDonation] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationNotes, setDonationNotes] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');
  const [copied, setCopied] = useState(false);

  // Transfer ownership modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
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
      return data;
    },
    enabled: !!leagueId,
  });

  // Populate form when league loads
  useEffect(() => {
    if (league) {
      setName(league.name || '');
      setDescription(league.description || '');
      setIsPublic(league.is_public || false);
      setIsClosed(league.is_closed || false);
      setMaxPlayers(league.max_players || 12);
      setRequireDonation(league.require_donation || false);
      setDonationAmount(league.donation_amount?.toString() || '');
      setDonationNotes(league.donation_notes || '');
      setPayoutMethod(league.payout_method || '');
    }
  }, [league]);

  // Check if current user is commissioner
  const isCommissioner = league?.commissioner_id === currentUser?.id;

  // Update league mutation
  const updateLeague = useMutation({
    mutationFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const updates: any = {
        name,
        description: description || null,
        is_public: isPublic,
        is_closed: isClosed,
        max_players: maxPlayers,
        require_donation: requireDonation,
        donation_amount: requireDonation ? parseFloat(donationAmount) : null,
        donation_notes: requireDonation ? donationNotes : null,
        payout_method: payoutMethod || null,
      };

      if (password) {
        updates.password_hash = password;
      }

      const { error } = await supabase
        .from('leagues')
        .update(updates)
        .eq('id', leagueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
    },
  });

  // Randomize draft order mutation
  const randomizeDraftOrder = useMutation({
    mutationFn: async () => {
      if (!leagueId || !members) throw new Error('Missing data');

      const shuffled = [...members].sort(() => Math.random() - 0.5);
      const updates = shuffled.map((member, index) => ({
        id: member.id,
        draft_position: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('league_members')
          .update({ draft_position: update.draft_position })
          .eq('id', update.id);
        if (error) throw error;
      }

      // Update league draft_order
      const draftOrder = shuffled.map(m => m.user_id);
      await supabase
        .from('leagues')
        .update({ draft_order: draftOrder })
        .eq('id', leagueId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-members', leagueId] });
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
      await supabase
        .from('rosters')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', userId);

      // And weekly picks
      await supabase
        .from('weekly_picks')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', userId);
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
          co_commissioners: [] // Clear co-commissioners on transfer
        })
        .eq('id', leagueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
      setShowTransferModal(false);
      navigate(`/leagues/${leagueId}`);
    },
  });

  // Delete league mutation
  const deleteLeague = useMutation({
    mutationFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueId);
      if (error) throw error;
    },
    onSuccess: () => {
      navigate('/dashboard');
    },
  });

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${league?.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (!isCommissioner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center">
          <h1 className="text-xl font-display font-bold text-white mb-2">Access Denied</h1>
          <p className="text-burgundy-200 mb-4">Only the league commissioner can access settings.</p>
          <Link
            to={`/leagues/${leagueId}`}
            className="text-gold-500 hover:text-gold-400"
          >
            Back to League
          </Link>
        </div>
      </div>
    );
  }

  const otherMembers = members?.filter((m: any) => m.user_id !== currentUser?.id) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/leagues/${leagueId}`}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-gold-500" />
            League Settings
          </h1>
          <p className="text-burgundy-200 flex items-center gap-2">
            {league?.name}
            <span className="inline-flex items-center gap-1 bg-gold-500/20 text-gold-500 text-xs px-2 py-0.5 rounded-full">
              <Crown className="h-3 w-3" />
              Commissioner
            </span>
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Invite Link */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-white font-medium mb-3">Invite Link</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-burgundy-800 rounded-lg px-4 py-3 text-gold-500 font-mono">
              {league?.code}
            </div>
            <button
              onClick={copyInviteLink}
              className="p-3 bg-gold-500 hover:bg-gold-400 rounded-lg transition-colors"
            >
              {copied ? (
                <Check className="h-5 w-5 text-burgundy-900" />
              ) : (
                <Copy className="h-5 w-5 text-burgundy-900" />
              )}
            </button>
          </div>
        </div>

        {/* League Info */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <label className="block mb-4">
            <span className="text-white font-medium flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-gold-500" />
              League Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500"
            />
          </label>

          <label className="block mb-4">
            <span className="text-white font-medium flex items-center gap-2 mb-2">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add a description for your league..."
              className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500 resize-none"
            />
          </label>

          <label className="block">
            <span className="text-white font-medium flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-gold-500" />
              New Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
            />
          </label>
        </div>

        {/* Visibility & Access */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-gold-500" />
            Visibility & Access
          </h3>

          <label className="flex items-center justify-between cursor-pointer mb-4 p-3 bg-burgundy-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Eye className="h-5 w-5 text-gold-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-burgundy-400" />
              )}
              <div>
                <span className="text-white font-medium block">Public League</span>
                <span className="text-burgundy-300 text-sm">Anyone can view standings</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-5 h-5 rounded bg-burgundy-700 border-burgundy-500 text-gold-500 focus:ring-gold-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer mb-4 p-3 bg-burgundy-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-burgundy-400" />
              <div>
                <span className="text-white font-medium block">Close to New Members</span>
                <span className="text-burgundy-300 text-sm">Prevent new players from joining</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isClosed}
              onChange={(e) => setIsClosed(e.target.checked)}
              className="w-5 h-5 rounded bg-burgundy-700 border-burgundy-500 text-gold-500 focus:ring-gold-500"
            />
          </label>

          <label className="block">
            <span className="text-burgundy-200 text-sm mb-2 block">Max Players</span>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
              disabled={(members?.length || 0) > 0 && league?.draft_status !== 'pending'}
              className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500 disabled:opacity-50"
            >
              {[4, 6, 8, 10, 12, 16, 20, 24].map(n => (
                <option key={n} value={n} disabled={n < (members?.length || 0)}>
                  {n} players
                </option>
              ))}
            </select>
            {(members?.length || 0) > 0 && (
              <p className="text-burgundy-400 text-xs mt-1">
                Currently {members?.length} of {maxPlayers} players
              </p>
            )}
          </label>
        </div>

        {/* Donation Settings */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <label className="flex items-center justify-between cursor-pointer mb-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-gold-500" />
              <span className="text-white font-medium">Require Donation</span>
            </div>
            <input
              type="checkbox"
              checked={requireDonation}
              onChange={(e) => setRequireDonation(e.target.checked)}
              disabled={league?.draft_status !== 'pending'}
              className="w-5 h-5 rounded bg-burgundy-700 border-burgundy-500 text-gold-500 focus:ring-gold-500 disabled:opacity-50"
            />
          </label>

          {requireDonation && (
            <div className="space-y-4 pt-4 border-t border-burgundy-700">
              <label className="block">
                <span className="text-burgundy-200 text-sm mb-2 block">Amount ($)</span>
                <input
                  type="number"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  disabled={league?.draft_status !== 'pending'}
                  className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500 disabled:opacity-50"
                />
              </label>

              <label className="block">
                <span className="text-burgundy-200 text-sm mb-2 block">Distribution Notes</span>
                <textarea
                  value={donationNotes}
                  onChange={(e) => setDonationNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500 resize-none"
                />
              </label>

              <label className="block">
                <span className="text-burgundy-200 text-sm mb-2 block">Payout Method (Venmo, PayPal, etc.)</span>
                <input
                  type="text"
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  placeholder="@venmo-username"
                  className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
                />
              </label>
            </div>
          )}
        </div>

        {/* Member Management */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-gold-500" />
            Members ({members?.length || 0})
          </h3>

          <div className="space-y-2">
            {members?.map((member: any) => {
              const isYou = member.user_id === currentUser?.id;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-burgundy-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {league?.draft_status === 'pending' && member.draft_position && (
                      <span className="w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center text-burgundy-900 font-bold text-sm">
                        {member.draft_position}
                      </span>
                    )}
                    <span className="text-white">{member.users?.display_name}</span>
                    {isYou && (
                      <span className="inline-flex items-center gap-1 bg-gold-500/20 text-gold-500 text-xs px-2 py-0.5 rounded-full">
                        <Crown className="h-3 w-3" />
                        You
                      </span>
                    )}
                  </div>
                  {!isYou && league?.draft_status === 'pending' && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${member.users?.display_name} from the league?`)) {
                          removeMember.mutate(member.user_id);
                        }
                      }}
                      disabled={removeMember.isPending}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {removeMember.isError && (
            <p className="text-red-400 text-sm mt-2">Failed to remove member</p>
          )}
        </div>

        {/* Draft Order (only if draft pending) */}
        {league?.draft_status === 'pending' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Draft Order</h3>
              <button
                onClick={() => randomizeDraftOrder.mutate()}
                disabled={randomizeDraftOrder.isPending}
                className="flex items-center gap-2 text-gold-500 hover:text-gold-400 text-sm"
              >
                {randomizeDraftOrder.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4" />
                )}
                Randomize
              </button>
            </div>
            <p className="text-burgundy-300 text-sm">
              Draft positions are shown in the Members section above. Use "Randomize" to shuffle the order.
            </p>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={() => updateLeague.mutate()}
          disabled={updateLeague.isPending}
          className="w-full bg-gold-500 hover:bg-gold-400 disabled:bg-burgundy-600 text-burgundy-900 font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {updateLeague.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Save Changes'
          )}
        </button>

        {updateLeague.isSuccess && (
          <p className="text-green-400 text-center">Settings saved!</p>
        )}

        {/* Transfer Ownership */}
        {otherMembers.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
            <h3 className="text-amber-400 font-medium mb-2 flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transfer Ownership
            </h3>
            <p className="text-burgundy-200 text-sm mb-4">
              Transfer commissioner role to another member. You will lose all commissioner privileges.
            </p>
            <button
              onClick={() => setShowTransferModal(true)}
              className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-bold py-3 rounded-lg transition-colors"
            >
              Transfer Ownership
            </button>
          </div>
        )}

        {/* Delete League (only if draft pending) */}
        {league?.draft_status === 'pending' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </h3>
            <p className="text-burgundy-200 text-sm mb-4">
              Deleting the league cannot be undone. All members will be removed.
            </p>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this league?')) {
                  deleteLeague.mutate();
                }
              }}
              disabled={deleteLeague.isPending}
              className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 font-bold py-3 rounded-lg transition-colors"
            >
              {deleteLeague.isPending ? 'Deleting...' : 'Delete League'}
            </button>
          </div>
        )}
      </div>

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-burgundy-800 rounded-xl p-6 max-w-sm w-full border border-burgundy-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Transfer Ownership
              </h3>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferTargetId(null);
                }}
                className="text-burgundy-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-burgundy-200 text-sm mb-4">
              Select a member to become the new commissioner. This action cannot be undone.
            </p>

            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {otherMembers.map((member: any) => (
                <label
                  key={member.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    transferTargetId === member.user_id
                      ? 'bg-gold-500/20 border border-gold-500'
                      : 'bg-burgundy-700/50 border border-transparent hover:bg-burgundy-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="transfer-target"
                    value={member.user_id}
                    checked={transferTargetId === member.user_id}
                    onChange={(e) => setTransferTargetId(e.target.value)}
                    className="text-gold-500 focus:ring-gold-500"
                  />
                  <span className="text-white">{member.users?.display_name}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferTargetId(null);
                }}
                className="flex-1 bg-burgundy-600 hover:bg-burgundy-500 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (transferTargetId && confirm('Are you sure? You will lose commissioner privileges.')) {
                    transferOwnership.mutate(transferTargetId);
                  }
                }}
                disabled={!transferTargetId || transferOwnership.isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-burgundy-600 text-burgundy-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {transferOwnership.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Transfer'
                )}
              </button>
            </div>

            {transferOwnership.isError && (
              <p className="text-red-400 text-sm mt-3 text-center">
                Failed to transfer ownership
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
