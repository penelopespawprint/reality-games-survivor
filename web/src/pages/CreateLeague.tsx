import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Users, DollarSign, Lock, Loader2, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function CreateLeague() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [requireDonation, setRequireDonation] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationNotes, setDonationNotes] = useState('');
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
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Create league mutation
  const createLeague = useMutation({
    mutationFn: async () => {
      if (!currentUser || !activeSeason) throw new Error('Missing data');

      const { data, error } = await supabase
        .from('leagues')
        .insert({
          name,
          season_id: activeSeason.id,
          commissioner_id: currentUser.id,
          password_hash: password || null,
          require_donation: requireDonation,
          donation_amount: requireDonation ? parseFloat(donationAmount) : null,
          donation_notes: requireDonation ? donationNotes : null,
          max_players: 12,
          status: 'forming',
          draft_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-add creator as member
      await supabase
        .from('league_members')
        .insert({
          league_id: data.id,
          user_id: currentUser.id,
        });

      return data;
    },
    onSuccess: (data) => {
      setCreatedLeague(data);
    },
  });

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${createdLeague.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdLeague) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
        <div className="max-w-md mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white mb-2">League Created!</h1>
            <p className="text-burgundy-200 mb-6">{createdLeague.name}</p>

            <div className="bg-burgundy-800/50 rounded-lg p-4 mb-6">
              <p className="text-burgundy-300 text-sm mb-2">Invite Code</p>
              <p className="text-2xl font-mono font-bold text-gold-500 tracking-wider">
                {createdLeague.code}
              </p>
            </div>

            <button
              onClick={copyInviteLink}
              className="w-full bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  Copy Invite Link
                </>
              )}
            </button>

            <button
              onClick={() => navigate(`/leagues/${createdLeague.id}`)}
              className="w-full bg-burgundy-700 hover:bg-burgundy-600 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Go to League
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Create League</h1>
          <p className="text-burgundy-200">Season {activeSeason?.number}: {activeSeason?.name}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* League Name */}
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
              placeholder="The Tribal Council"
              className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
            />
          </label>

          <label className="block">
            <span className="text-white font-medium flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-gold-500" />
              Password (Optional)
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for no password"
              className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
            />
            <p className="text-burgundy-300 text-sm mt-2">
              Anyone with the invite link can join if no password is set.
            </p>
          </label>
        </div>

        {/* Donation Settings */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <label className="flex items-center justify-between cursor-pointer mb-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-gold-500" />
              <div>
                <p className="text-white font-medium">Require Donation</p>
                <p className="text-burgundy-300 text-sm">Players pay to join</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={requireDonation}
              onChange={(e) => setRequireDonation(e.target.checked)}
              className="w-5 h-5 rounded bg-burgundy-700 border-burgundy-500 text-gold-500 focus:ring-gold-500"
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
                  placeholder="25"
                  min="1"
                  step="1"
                  className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
                />
              </label>

              <label className="block">
                <span className="text-burgundy-200 text-sm mb-2 block">Notes (how winnings distributed)</span>
                <textarea
                  value={donationNotes}
                  onChange={(e) => setDonationNotes(e.target.value)}
                  placeholder="Winner takes 70%, runner-up 30%"
                  rows={3}
                  className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500 resize-none"
                />
              </label>
            </div>
          )}
        </div>

        {/* Create Button */}
        <button
          onClick={() => createLeague.mutate()}
          disabled={!name.trim() || createLeague.isPending || (requireDonation && !donationAmount)}
          className="w-full bg-gold-500 hover:bg-gold-400 disabled:bg-burgundy-600 text-burgundy-900 font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {createLeague.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Create League'
          )}
        </button>

        {createLeague.isError && (
          <p className="text-red-400 text-center">
            Error creating league. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
