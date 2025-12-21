import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Link2, Copy, Check, Share2, QrCode, Users, Loader2, AlertCircle, Crown, Lock, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function InviteLink() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

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

  // Fetch member count
  const { data: memberCount } = useQuery({
    queryKey: ['league-member-count', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { count, error } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!leagueId,
  });

  const isCommissioner = currentUser?.id === league?.commissioner_id;
  const inviteUrl = `${window.location.origin}/join/${league?.code}`;
  const spotsRemaining = (league?.max_players || 12) - (memberCount || 0);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${league?.name}`,
          text: `Join my Survivor Fantasy league! Season ${league?.seasons?.number}: ${league?.seasons?.name}`,
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
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
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={`/leagues/${leagueId}`}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <h1 className="text-2xl font-display font-bold text-white">Invite Link</h1>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-white mb-2">Access Denied</h2>
          <p className="text-burgundy-200">Only the league commissioner can manage invites.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/leagues/${leagueId}/settings`}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Link2 className="h-6 w-6 text-gold-500" />
            Invite Link
          </h1>
          <p className="text-burgundy-200">{league?.name}</p>
        </div>
      </div>

      {/* League Status */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-gold-500" />
            <span className="text-burgundy-300 text-sm">Members</span>
          </div>
          <p className="text-2xl font-bold text-white">{memberCount}/{league?.max_players}</p>
        </div>
        <div className={`rounded-xl p-4 border ${
          spotsRemaining > 0
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-gold-500" />
            <span className="text-burgundy-300 text-sm">Spots Left</span>
          </div>
          <p className={`text-2xl font-bold ${spotsRemaining > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {spotsRemaining}
          </p>
        </div>
      </div>

      {/* Invite Code */}
      <div className="bg-gradient-to-r from-gold-500/20 to-amber-500/20 border border-gold-500/30 rounded-xl p-6 mb-6 text-center">
        <p className="text-gold-300 text-sm mb-2">League Code</p>
        <p className="text-4xl font-mono font-bold text-gold-500 tracking-widest mb-4">
          {league?.code}
        </p>
        <p className="text-burgundy-200 text-sm">
          Share this code with friends to join your league
        </p>
      </div>

      {/* Invite URL */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
        <p className="text-burgundy-300 text-sm mb-2">Invite URL</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteUrl}
            readOnly
            className="flex-1 bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white text-sm font-mono"
          />
          <button
            onClick={copyToClipboard}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-gold-500 hover:bg-gold-400 text-burgundy-900'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={shareInvite}
          className="bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Share2 className="h-5 w-5" />
          Share Invite
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="bg-burgundy-700 hover:bg-burgundy-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <QrCode className="h-5 w-5" />
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      {/* QR Code Placeholder */}
      {showQR && (
        <div className="bg-white rounded-xl p-8 mb-6 text-center">
          <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
            <QrCode className="h-24 w-24 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm mt-4">
            Scan to join {league?.name}
          </p>
        </div>
      )}

      {/* League Settings Info */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="text-white font-medium">Join Requirements</h2>
        </div>
        <div className="divide-y divide-white/5">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-burgundy-400" />
              <span className="text-white">Password Protected</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              league?.password_hash
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-green-500/20 text-green-400'
            }`}>
              {league?.password_hash ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-burgundy-400" />
              <span className="text-white">Public League</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              league?.is_public
                ? 'bg-green-500/20 text-green-400'
                : 'bg-burgundy-500/20 text-burgundy-300'
            }`}>
              {league?.is_public ? 'Yes' : 'No'}
            </span>
          </div>
          {league?.require_donation && (
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-gold-500" />
                <span className="text-white">Entry Fee</span>
              </div>
              <span className="text-gold-400 font-bold">
                ${league.donation_amount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h3 className="text-white font-medium mb-2 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-400" />
          Invite Tips
        </h3>
        <ul className="space-y-2 text-sm text-blue-200">
          <li>• Share the invite link via text, email, or social media</li>
          <li>• New members must create an account to join</li>
          <li>• The league code can be entered manually at /join</li>
          {league?.require_donation && (
            <li>• Members will need to pay the ${league.donation_amount} entry fee via Stripe</li>
          )}
        </ul>
      </div>

      {/* Manage Settings Link */}
      <div className="mt-6">
        <Link
          to={`/leagues/${leagueId}/settings`}
          className="w-full bg-burgundy-700 hover:bg-burgundy-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Manage League Settings
        </Link>
      </div>
    </div>
  );
}
