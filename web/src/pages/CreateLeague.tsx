import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Heart, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';
import { apiWithAuth } from '../lib/api';
import { Navigation } from '@/components/Navigation';
import { Sentry } from '../lib/sentry';
import {
  LeagueDetailsForm,
  PrivacySettings,
  CharitySettings,
  ShareLeagueModal,
} from '@/components/leagues/create';

// Validation constants (match server-side schema)
const VALIDATION = {
  name: { min: 3, max: 50 },
  password: { max: 100 },
  donation: { min: 0, max: 10000 },
  maxPlayers: { min: 2, max: 24 },
};

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
  const { getCopy } = useSiteCopy();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [requireDonation, setRequireDonation] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [createdLeague, setCreatedLeague] = useState<League | null>(null);

  // Fetch active season
  const { data: activeSeason, isLoading: isLoadingSeason } = useQuery({
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
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  const isPageLoading = isLoadingSeason || isLoadingUser;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validation errors
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // Name validation
    if (name.trim().length > 0 && name.trim().length < VALIDATION.name.min) {
      errors.push(`League name must be at least ${VALIDATION.name.min} characters`);
    }
    if (name.length > VALIDATION.name.max) {
      errors.push(`League name must be at most ${VALIDATION.name.max} characters`);
    }

    // Password validation (if private)
    if (isPrivate && joinCode && joinCode.length > VALIDATION.password.max) {
      errors.push(`Join code must be at most ${VALIDATION.password.max} characters`);
    }

    // Donation validation
    if (requireDonation && donationAmount) {
      const amount = parseFloat(donationAmount);
      if (isNaN(amount) || amount < VALIDATION.donation.min) {
        errors.push('Donation amount must be a positive number');
      }
      if (amount > VALIDATION.donation.max) {
        errors.push(`Donation amount cannot exceed $${VALIDATION.donation.max.toLocaleString()}`);
      }
    }

    return errors;
  }, [name, isPrivate, joinCode, requireDonation, donationAmount]);

  // Check if form is valid for submission
  // Note: Private leagues don't require a password - server generates unique code automatically
  // Password is optional additional protection on top of the invite code
  const isFormValid = useMemo(() => {
    return (
      name.trim().length >= VALIDATION.name.min &&
      name.length <= VALIDATION.name.max &&
      validationErrors.length === 0 &&
      (!requireDonation || (donationAmount && parseFloat(donationAmount) > 0))
    );
  }, [name, validationErrors, requireDonation, donationAmount]);

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
          max_players: 12, // Fixed at 12
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
      // Send to Sentry for monitoring
      Sentry.captureException(error, {
        tags: { operation: 'create_league' },
        extra: {
          name,
          isPrivate,
          requireDonation,
          donationAmount,
        },
      });
    },
  });

  // Show loading state while fetching initial data
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 className="h-10 w-10 text-burgundy-500 animate-spin mx-auto mb-4" />
            <p className="text-neutral-500">Loading season data...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-display font-bold text-neutral-800">
              {getCopy('create-league.header.title', 'Create a League')}
            </h1>
            <p className="text-neutral-500">
              {getCopy(
                'create-league.header.subtitle',
                'Start your own fantasy league and invite friends'
              )}
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          <LeagueDetailsForm
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
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

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <ul className="text-amber-700 text-sm space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <button
            onClick={() => createLeague.mutate()}
            disabled={!isFormValid || createLeague.isPending}
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
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">
                  {errorMessage || 'Error creating league. Please try again.'}
                </p>
              </div>
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
