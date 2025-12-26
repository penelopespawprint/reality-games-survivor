import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Heart,
  Lock,
  Loader2,
  Copy,
  Check,
  FileText,
  Globe,
  X,
  MessageCircle,
  Mail,
  Twitter,
  Facebook,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Navigation } from '@/components/Navigation';

const DONATION_AMOUNTS = [10, 25, 50, 100];
const MAX_PLAYER_OPTIONS = [4, 6, 8, 10, 12];

export default function CreateLeague() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [requireDonation, setRequireDonation] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [createdLeague, setCreatedLeague] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Fetch active season
  const { data: activeSeason } = useQuery({
    queryKey: ['active-season'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

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

  // Create league mutation - uses Express API for proper password hashing
  const createLeague = useMutation({
    mutationFn: async () => {
      if (!currentUser || !activeSeason) throw new Error('Missing data');

      // Get session for API calls
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Use Express API which properly hashes passwords and adds creator as member
      const response = await fetch('/api/leagues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name,
          season_id: activeSeason.id,
          password: isPrivate && joinCode ? joinCode : null,
          donation_amount: requireDonation ? parseFloat(donationAmount) : null,
          max_players: maxPlayers,
          is_public: !isPrivate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create league');
      }

      const { league } = await response.json();

      // If donation required, redirect creator to Stripe checkout
      if (requireDonation && parseFloat(donationAmount) > 0) {
        const checkoutResponse = await fetch(`/api/leagues/${league.id}/join/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (checkoutResponse.ok) {
          const { checkout_url } = await checkoutResponse.json();
          // Redirect to Stripe - creator is already a member, payment tracked separately
          window.location.href = checkout_url;
          return { ...league, redirectingToPayment: true };
        }
        // If checkout fails, still return league - creator can pay later
        console.error('Failed to create checkout session');
      }

      return league;
    },
    onSuccess: (data: any) => {
      // Don't navigate if redirecting to Stripe
      if (data?.redirectingToPayment) return;

      setCreatedLeague(data);
      // Navigate to league page and show share modal
      navigate(`/leagues/${data.id}`, { state: { showShare: true } });
    },
  });

  const getInviteLink = () => {
    if (!createdLeague) return '';
    return `${window.location.origin}/join/${createdLeague.code}`;
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(getInviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaTwitter = () => {
    const text = `Join my Survivor Fantasy League "${createdLeague?.name}"! 🏝️🔥`;
    const url = getInviteLink();
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const shareViaFacebook = () => {
    const url = getInviteLink();
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const shareViaSMS = () => {
    const text = `Join my Survivor Fantasy League! ${getInviteLink()}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Join my Survivor Fantasy League: ${createdLeague?.name}`;
    const body = `Hey!\n\nI created a Survivor Fantasy League and want you to join!\n\nLeague: ${createdLeague?.name}\nJoin here: ${getInviteLink()}\n\nLet's see who can outwit, outplay, and outlast! 🏝️`;
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_blank'
    );
  };

  // Show share modal after navigation (if coming back)
  useEffect(() => {
    if (createdLeague) {
      setShowShareModal(true);
    }
  }, [createdLeague]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <Navigation />
      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800">Create League</h1>
            <p className="text-neutral-500">
              Season {activeSeason?.number}: {activeSeason?.name}
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          {/* League Details */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
            <h2 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-burgundy-500" />
              League Details
            </h2>

            <label className="block mb-4">
              <span className="text-neutral-700 text-sm font-medium mb-2 block">League Name *</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Tribal Council"
                className="input"
                maxLength={50}
              />
            </label>

            <label className="block mb-4">
              <span className="text-neutral-700 text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-neutral-400" />
                Description (Optional)
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A league for true Survivor superfans..."
                className="input min-h-[80px] resize-none"
                maxLength={200}
              />
              <p className="text-neutral-400 text-xs mt-1 text-right">{description.length}/200</p>
            </label>

            <label className="block">
              <span className="text-neutral-700 text-sm font-medium mb-2 block">Max Players</span>
              <div className="grid grid-cols-5 gap-2">
                {MAX_PLAYER_OPTIONS.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMaxPlayers(num)}
                    className={`py-2 px-3 rounded-xl font-semibold text-sm transition-all ${
                      maxPlayers === num
                        ? 'bg-burgundy-500 text-white shadow-md'
                        : 'bg-cream-100 text-neutral-700 hover:bg-cream-200 border border-cream-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </label>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
            <h2 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-burgundy-500" />
              Privacy
            </h2>

            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  !isPrivate
                    ? 'border-burgundy-500 bg-burgundy-50'
                    : 'border-cream-200 bg-white hover:border-cream-300'
                }`}
              >
                <Globe
                  className={`h-6 w-6 mx-auto mb-2 ${!isPrivate ? 'text-burgundy-500' : 'text-neutral-400'}`}
                />
                <p
                  className={`font-medium text-sm ${!isPrivate ? 'text-burgundy-700' : 'text-neutral-600'}`}
                >
                  Public
                </p>
                <p className="text-xs text-neutral-400 mt-1">Anyone can join</p>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  isPrivate
                    ? 'border-burgundy-500 bg-burgundy-50'
                    : 'border-cream-200 bg-white hover:border-cream-300'
                }`}
              >
                <Lock
                  className={`h-6 w-6 mx-auto mb-2 ${isPrivate ? 'text-burgundy-500' : 'text-neutral-400'}`}
                />
                <p
                  className={`font-medium text-sm ${isPrivate ? 'text-burgundy-700' : 'text-neutral-600'}`}
                >
                  Private
                </p>
                <p className="text-xs text-neutral-400 mt-1">Requires code</p>
              </button>
            </div>

            {isPrivate && (
              <label className="block animate-fade-in">
                <span className="text-neutral-700 text-sm font-medium mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-neutral-400" />
                  Join Code *
                </span>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="SECRET123"
                  className="input uppercase tracking-wider font-mono"
                  maxLength={20}
                />
                <p className="text-neutral-400 text-xs mt-2">
                  Players will need this code to join your league.
                </p>
              </label>
            )}
          </div>

          {/* Charity Entry Fee */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-burgundy-500" />
                <div>
                  <p className="text-neutral-800 font-medium">Play for a Cause</p>
                  <p className="text-neutral-400 text-sm">Entry fees go to charity</p>
                </div>
              </div>
              <div
                onClick={() => setRequireDonation(!requireDonation)}
                className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  requireDonation ? 'bg-burgundy-500' : 'bg-neutral-200'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform mt-0.5 ${
                    requireDonation ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>

            {requireDonation && (
              <div className="mt-6 pt-4 border-t border-cream-200 animate-fade-in">
                <div className="bg-gradient-to-br from-burgundy-50 to-cream-50 rounded-xl p-4 mb-4 border border-burgundy-100">
                  <p className="text-neutral-700 text-sm leading-relaxed">
                    <span className="font-semibold text-burgundy-600">
                      The winner of your league will recommend a charity
                    </span>{' '}
                    of their choice for the full donation pool. Outwit, outplay, outlast — for good.
                  </p>
                </div>

                <p className="text-neutral-500 text-sm mb-3 font-medium">
                  Entry fee per player (minimum $10):
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {DONATION_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setDonationAmount(amount.toString())}
                      className={`py-3 px-4 rounded-xl font-bold text-lg transition-all ${
                        donationAmount === amount.toString()
                          ? 'bg-burgundy-500 text-white shadow-elevated'
                          : 'bg-cream-100 text-neutral-700 hover:bg-cream-200 border border-cream-200'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                <p className="text-neutral-400 text-xs mt-3 text-center">
                  100% of entry fees are donated — zero platform fees
                </p>
              </div>
            )}
          </div>

          {/* Create Button */}
          <button
            onClick={() => createLeague.mutate()}
            disabled={
              !name.trim() ||
              createLeague.isPending ||
              (requireDonation && !donationAmount) ||
              (isPrivate && !joinCode.trim())
            }
            className="w-full btn btn-primary btn-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createLeague.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {requireDonation ? 'Redirecting to payment...' : 'Creating...'}
              </>
            ) : requireDonation && donationAmount ? (
              <>
                <Heart className="h-5 w-5" />
                Create & Pay ${donationAmount}
              </>
            ) : (
              <>
                <Users className="h-5 w-5" />
                Create League
              </>
            )}
          </button>

          {createLeague.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm text-center">
                Error creating league. Please try again.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && createdLeague && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold text-neutral-800">Share Your League</h2>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  navigate(`/leagues/${createdLeague.id}`);
                }}
                className="p-2 hover:bg-cream-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-neutral-800">{createdLeague.name}</h3>
              <p className="text-neutral-500 text-sm">League created successfully!</p>
            </div>

            {/* Invite Code */}
            <div className="bg-cream-50 rounded-xl p-4 mb-6 border border-cream-200">
              <p className="text-neutral-500 text-xs mb-1 text-center">Invite Code</p>
              <p className="text-2xl font-mono font-bold text-burgundy-500 tracking-wider text-center">
                {createdLeague.code}
              </p>
              {isPrivate && joinCode && (
                <p className="text-neutral-400 text-xs mt-2 text-center">
                  Join Password: <span className="font-mono">{joinCode}</span>
                </p>
              )}
            </div>

            {/* Copy Link Button */}
            <button
              onClick={copyInviteLink}
              className="w-full btn btn-primary mb-4 flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  Copy Invite Link
                </>
              )}
            </button>

            {/* Social Share Buttons */}
            <p className="text-neutral-500 text-sm text-center mb-3">Or share via:</p>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={shareViaSMS}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
              >
                <MessageCircle className="h-6 w-6 text-green-600" />
                <span className="text-xs text-neutral-600">SMS</span>
              </button>
              <button
                onClick={shareViaEmail}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Mail className="h-6 w-6 text-blue-600" />
                <span className="text-xs text-neutral-600">Email</span>
              </button>
              <button
                onClick={shareViaTwitter}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-sky-50 hover:bg-sky-100 transition-colors"
              >
                <Twitter className="h-6 w-6 text-sky-500" />
                <span className="text-xs text-neutral-600">Twitter</span>
              </button>
              <button
                onClick={shareViaFacebook}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Facebook className="h-6 w-6 text-indigo-600" />
                <span className="text-xs text-neutral-600">Facebook</span>
              </button>
            </div>

            {/* Go to League */}
            <button
              onClick={() => {
                setShowShareModal(false);
                navigate(`/leagues/${createdLeague.id}`);
              }}
              className="w-full btn btn-secondary mt-4"
            >
              Go to League
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
