import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Link2,
  Copy,
  Check,
  Share2,
  QrCode,
  Users,
  Loader2,
  AlertCircle,
  Crown,
  Lock,
  Globe,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Navigation } from '@/components/Navigation';

export default function InviteLink() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

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
      } catch {
        // User cancelled or share failed
        copyToClipboard();
      }
    } else {
      copyToClipboard();
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

  if (!isCommissioner) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <Link
              to={`/leagues/${leagueId}`}
              className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <h1 className="text-2xl font-display font-bold text-neutral-800">Invite Link</h1>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-2">Access Denied</h2>
            <p className="text-neutral-600">Only the league creator can manage invites.</p>
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
            to={`/leagues/${leagueId}/settings`}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <Link2 className="h-6 w-6 text-burgundy-500" />
              Invite Link
            </h1>
            <p className="text-neutral-500">{league?.name}</p>
          </div>
        </div>

        {/* League Status */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-burgundy-500" />
              <span className="text-neutral-500 text-sm">Members</span>
            </div>
            <p className="text-2xl font-bold text-neutral-800">
              {memberCount}/{league?.max_players}
            </p>
          </div>
          <div
            className={`rounded-2xl p-4 border ${
              spotsRemaining > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-burgundy-500" />
              <span className="text-neutral-500 text-sm">Spots Left</span>
            </div>
            <p
              className={`text-2xl font-bold ${spotsRemaining > 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {spotsRemaining}
            </p>
          </div>
        </div>

        {/* Invite Code */}
        <div className="bg-burgundy-50 border border-burgundy-200 rounded-2xl p-6 mb-6 text-center">
          <p className="text-burgundy-600 text-sm mb-2">League Code</p>
          <p className="text-4xl font-mono font-bold text-burgundy-500 tracking-widest mb-4">
            {league?.code}
          </p>
          <p className="text-neutral-600 text-sm">
            Share this code with friends to join your league
          </p>
        </div>

        {/* Invite URL */}
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 mb-6">
          <p className="text-neutral-500 text-sm mb-2">Invite URL</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteUrl}
              readOnly
              className="input flex-1 font-mono text-sm"
            />
            <button
              onClick={copyToClipboard}
              className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-burgundy-500 hover:bg-burgundy-600 text-white'
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
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            <Share2 className="h-5 w-5" />
            Share Invite
          </button>
          <button
            onClick={() => setShowQR(!showQR)}
            className="btn btn-secondary flex items-center justify-center gap-2"
          >
            <QrCode className="h-5 w-5" />
            {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        </div>

        {/* QR Code Placeholder */}
        {showQR && (
          <div className="bg-white rounded-2xl shadow-card p-8 mb-6 text-center border border-cream-200">
            <div className="w-48 h-48 mx-auto bg-cream-50 rounded-xl flex items-center justify-center border border-cream-200">
              <QrCode className="h-24 w-24 text-neutral-400" />
            </div>
            <p className="text-neutral-600 text-sm mt-4">Scan to join {league?.name}</p>
          </div>
        )}

        {/* League Settings Info */}
        <div className="bg-white rounded-2xl shadow-card border border-cream-200">
          <div className="px-4 py-3 border-b border-cream-200">
            <h2 className="text-neutral-800 font-medium">Join Requirements</h2>
          </div>
          <div className="divide-y divide-cream-100">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-neutral-400" />
                <span className="text-neutral-800">Password Protected</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  league?.password_hash
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {league?.password_hash ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-neutral-400" />
                <span className="text-neutral-800">Public League</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  league?.is_public
                    ? 'bg-green-100 text-green-700'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {league?.is_public ? 'Yes' : 'No'}
              </span>
            </div>
            {league?.require_donation && (
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-burgundy-500" />
                  <span className="text-neutral-800">Entry Fee</span>
                </div>
                <span className="text-burgundy-500 font-bold">${league.donation_amount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h3 className="text-neutral-800 font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Invite Tips
          </h3>
          <ul className="space-y-2 text-sm text-neutral-600">
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
            className="btn btn-secondary w-full flex items-center justify-center gap-2"
          >
            Manage League Settings
          </Link>
        </div>
      </div>
    </>
  );
}
