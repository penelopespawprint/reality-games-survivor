import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Settings,
  Users,
  DollarSign,
  Lock,
  Copy,
  Check,
  Loader2,
  Trash2,
  Crown,
  Globe,
  Eye,
  EyeOff,
  UserMinus,
  ArrowRightLeft,
  X,
  AlertTriangle,
  FileText,
  ImageIcon,
  Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Navigation } from '@/components/Navigation';

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
  const [copied, setCopied] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Transfer ownership modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

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
      return data;
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
      const updates: any = {
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

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !leagueId) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leagueId}.${fileExt}`;
      const filePath = `league-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('public').getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

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
      setShowTransferModal(false);
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

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${league?.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const otherMembers = members?.filter((m: any) => m.user_id !== currentUser?.id) || [];

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
          {/* Invite Link */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
            <h3 className="text-neutral-800 font-medium mb-3">Invite Link</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-cream-50 rounded-xl px-4 py-3 text-burgundy-600 font-mono border border-cream-200">
                {league?.code}
              </div>
              <button
                onClick={copyInviteLink}
                className="p-3 bg-burgundy-500 hover:bg-burgundy-600 rounded-xl transition-colors"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <Copy className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* League Photo & Description (Always Editable) */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
            <h3 className="text-neutral-800 font-medium mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-burgundy-500" />
              League Branding
            </h3>

            {/* Photo Upload */}
            <div className="mb-6">
              <span className="text-neutral-500 text-sm mb-2 block">League Photo</span>
              <div className="flex items-center gap-4">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="League"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-cream-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-cream-100 border-2 border-dashed border-cream-300 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-neutral-300" />
                  </div>
                )}
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                  <div className="flex items-center justify-center gap-2 bg-cream-100 hover:bg-cream-200 border border-cream-200 rounded-xl py-3 px-4 cursor-pointer transition-colors">
                    {uploadingPhoto ? (
                      <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                    ) : (
                      <Upload className="h-5 w-5 text-neutral-500" />
                    )}
                    <span className="text-neutral-600 text-sm font-medium">
                      {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Description */}
            <label className="block">
              <span className="text-neutral-800 font-medium flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-burgundy-500" />
                Description
              </span>
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

          {/* Admin-Only Settings */}
          {isAdmin && (
            <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-amber-700 text-sm font-medium">Admin-only settings</p>
              </div>

              <label className="block mb-4">
                <span className="text-neutral-800 font-medium flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-burgundy-500" />
                  League Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </label>

              <label className="block">
                <span className="text-neutral-800 font-medium flex items-center gap-2 mb-2">
                  <Lock className="h-5 w-5 text-burgundy-500" />
                  New Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="input"
                />
              </label>
            </div>
          )}

          {/* Visibility & Access - Admin Only */}
          {isAdmin && (
            <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
              <h3 className="text-neutral-800 font-medium mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-burgundy-500" />
                Visibility & Access
              </h3>

              <label className="flex items-center justify-between cursor-pointer mb-4 p-3 bg-cream-50 rounded-xl border border-cream-200">
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Eye className="h-5 w-5 text-burgundy-500" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-neutral-400" />
                  )}
                  <div>
                    <span className="text-neutral-800 font-medium block">Public League</span>
                    <span className="text-neutral-500 text-sm">Anyone can view standings</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
                />
              </label>

              <label className="block">
                <span className="text-neutral-500 text-sm mb-2 block">Max Players</span>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  disabled={(members?.length || 0) > 0 && league?.draft_status !== 'pending'}
                  className="input disabled:opacity-50"
                >
                  {[4, 6, 8, 10, 12, 16, 20, 24].map((n) => (
                    <option key={n} value={n} disabled={n < (members?.length || 0)}>
                      {n} players
                    </option>
                  ))}
                </select>
                {(members?.length || 0) > 0 && (
                  <p className="text-neutral-400 text-xs mt-1">
                    Currently {members?.length} of {maxPlayers} players
                  </p>
                )}
              </label>
            </div>
          )}

          {/* Donation Settings - Admin Only */}
          {isAdmin && (
            <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
              <label className="flex items-center justify-between cursor-pointer mb-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-burgundy-500" />
                  <span className="text-neutral-800 font-medium">Require Donation</span>
                </div>
                <input
                  type="checkbox"
                  checked={requireDonation}
                  onChange={(e) => setRequireDonation(e.target.checked)}
                  disabled={league?.draft_status !== 'pending'}
                  className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500 focus:ring-burgundy-500 disabled:opacity-50"
                />
              </label>

              {requireDonation && (
                <div className="space-y-4 pt-4 border-t border-cream-200">
                  <label className="block">
                    <span className="text-neutral-500 text-sm mb-2 block">Amount ($)</span>
                    <input
                      type="number"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      disabled={league?.draft_status !== 'pending'}
                      className="input disabled:opacity-50"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Member Management */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
            <h3 className="text-neutral-800 font-medium mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-burgundy-500" />
              Members ({members?.length || 0})
            </h3>

            <div className="space-y-2">
              {members?.map((member: any) => {
                const isYou = member.user_id === currentUser?.id;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-cream-50 rounded-xl border border-cream-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-800">{member.users?.display_name}</span>
                      {isYou && (
                        <span className="inline-flex items-center gap-1 bg-burgundy-100 text-burgundy-600 text-xs px-2 py-0.5 rounded-full">
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
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
              <p className="text-red-500 text-sm mt-2">Failed to remove member</p>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={() => updateLeague.mutate()}
            disabled={updateLeague.isPending}
            className="w-full btn btn-primary flex items-center justify-center gap-2"
          >
            {updateLeague.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
          </button>

          {updateLeague.isSuccess && <p className="text-green-600 text-center">Settings saved!</p>}

          {/* Transfer Ownership */}
          {otherMembers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="text-amber-700 font-medium mb-2 flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Transfer Ownership
              </h3>
              <p className="text-amber-600 text-sm mb-4">
                Transfer ownership to another member. You will lose all creator privileges.
              </p>
              <button
                onClick={() => setShowTransferModal(true)}
                className="w-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 font-bold py-3 rounded-xl transition-colors"
              >
                Transfer Ownership
              </button>
            </div>
          )}

          {/* Delete League (only if draft pending) */}
          {league?.draft_status === 'pending' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-red-600 font-medium mb-2 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </h3>
              <p className="text-red-500 text-sm mb-4">
                Deleting the league cannot be undone. All members will be removed.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this league?')) {
                    deleteLeague.mutate();
                  }
                }}
                disabled={deleteLeague.isPending}
                className="w-full bg-red-100 hover:bg-red-200 border border-red-300 text-red-700 font-bold py-3 rounded-xl transition-colors"
              >
                {deleteLeague.isPending ? 'Deleting...' : 'Delete League'}
              </button>
            </div>
          )}
        </div>

        {/* Transfer Ownership Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-cream-200 shadow-elevated">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-neutral-800 font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Transfer Ownership
                </h3>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferTargetId(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-neutral-500 text-sm mb-4">
                Select a member to become the new league creator. This action cannot be undone.
              </p>

              <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                {otherMembers.map((member: any) => (
                  <label
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      transferTargetId === member.user_id
                        ? 'bg-burgundy-50 border-2 border-burgundy-500'
                        : 'bg-cream-50 border border-cream-200 hover:bg-cream-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transfer-target"
                      value={member.user_id}
                      checked={transferTargetId === member.user_id}
                      onChange={(e) => setTransferTargetId(e.target.value)}
                      className="text-burgundy-500 focus:ring-burgundy-500"
                    />
                    <span className="text-neutral-800">{member.users?.display_name}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferTargetId(null);
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (
                      transferTargetId &&
                      confirm('Are you sure? You will lose creator privileges.')
                    ) {
                      transferOwnership.mutate(transferTargetId);
                    }
                  }}
                  disabled={!transferTargetId || transferOwnership.isPending}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-cream-200 text-white disabled:text-neutral-400 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {transferOwnership.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Transfer'
                  )}
                </button>
              </div>

              {transferOwnership.isError && (
                <p className="text-red-500 text-sm mt-3 text-center">
                  Failed to transfer ownership
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
