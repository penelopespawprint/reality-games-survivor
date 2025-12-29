import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Heart, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiWithAuth } from '../lib/api';
import { Navigation } from '@/components/Navigation';
import {
  LeagueDetailsForm,
  PrivacySettings,
  CharitySettings,
  ShareLeagueModal,
} from '@/components/leagues/create';

interface League {
  id: string;
  name: string;
  code: string;
  max_players: number;
  require_donation: boolean;
  donation_amount: number | null;
  is_public: boolean;
}

interface CreateLeagueResponse {
  league: League;
  checkout_url?: string;
  requires_payment?: boolean;
}

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
  const [createdLeague, setCreatedLeague] = useState<League | null>(null);

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

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create league mutation
  const createLeague = useMutation({
    mutationFn: async () => {
      if (!currentUser || !activeSeason) {
        throw new Error('Loading season data...');
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const result = await apiWithAuth<CreateLeagueResponse>('/leagues', session.access_token, {
        method: 'POST',
        body: JSON.stringify({
          name,
          season_id: activeSeason.id,
          password: isPrivate && joinCode ? joinCode : null,
          donation_amount: requireDonation && donationAmount ? parseFloat(donationAmount) : null,
          max_players: maxPlayers,
          is_public: !isPrivate,
        }),
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const league = result.data?.league;
      if (!league) {
        throw new Error('Failed to create league');
      }

      // If requires payment, redirect to checkout
      if (result.data?.requires_payment && result.data?.checkout_url) {
        window.location.href = result.data.checkout_url;
        return { ...league, redirectingToPayment: true } as League & {
          redirectingToPayment: boolean;
        };
      }

      return league;
    },
    onSuccess: (data: League | (League & { redirectingToPayment: boolean })) => {
      setErrorMessage(null);
      if ('redirectingToPayment' in data && data.redirectingToPayment) return;
      setCreatedLeague(data);
      setShowShareModal(true);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

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
          <LeagueDetailsForm
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            maxPlayers={maxPlayers}
            setMaxPlayers={setMaxPlayers}
          />

          <PrivacySettings
            isPrivate={isPrivate}
            setIsPrivate={setIsPrivate}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
          />

          <CharitySettings
            requireDonation={requireDonation}
            setRequireDonation={setRequireDonation}
            donationAmount={donationAmount}
            setDonationAmount={setDonationAmount}
          />

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

          {(createLeague.isError || errorMessage) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm text-center">
                {errorMessage || 'Error creating league. Please try again.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showShareModal && createdLeague && (
        <ShareLeagueModal
          league={createdLeague}
          joinCode={joinCode}
          isPrivate={isPrivate}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
