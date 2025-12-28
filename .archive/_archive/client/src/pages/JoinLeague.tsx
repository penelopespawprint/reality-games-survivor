import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { useLeague } from '@/context/LeagueContext';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe (use your publishable key from env)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const JoinLeague: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshLeagues } = useLeague();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [joinedLeague, setJoinedLeague] = useState<any>(null);
  const [leaguePreview, setLeaguePreview] = useState<any>(null);

  const [publicLeagues, setPublicLeagues] = useState<any[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);

  // Handle cancelled payment return
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      setError('Payment was cancelled. You can try again when ready.');
      const leagueId = searchParams.get('league_id');
      if (leagueId) {
        // Could load league info here
      }
    }
  }, [searchParams]);

  // Preview league before joining (to check for entry fee)
  const previewLeague = async (leagueCode: string) => {
    try {
      const response = await api.get(`/api/leagues/${leagueCode}/preview`);
      return response.data.league;
    } catch (err) {
      console.error('Failed to preview league:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // First, preview the league to check for entry fee
      const preview = await previewLeague(code);

      if (preview && preview.entryFee > 0) {
        // League has entry fee - redirect to Stripe Checkout
        setLeaguePreview(preview);
        const checkoutResponse = await api.post('/api/payments/create-checkout', {
          leagueId: preview.id,
        });

        if (checkoutResponse.data.url) {
          // Redirect to Stripe Checkout
          window.location.href = checkoutResponse.data.url;
          return;
        } else {
          throw new Error('Failed to create checkout session');
        }
      }

      // Free league - join directly
      const response = await api.post(`/api/leagues/${code}/join`, {
        code,
        password: needsPassword ? password : undefined,
      });

      setJoinedLeague(response.data.league);
      setSuccess(true);
      await refreshLeagues();
    } catch (err: any) {
      console.error('Failed to join league:', err);
      const errorMsg = err.response?.data?.error;

      if (errorMsg === 'Password required') {
        setNeedsPassword(true);
        setError('This league is password protected');
      } else if (errorMsg === 'Incorrect password') {
        setError('Incorrect password. Please try again.');
      } else if (errorMsg === 'You are already a member of this league') {
        setError('You are already a member of this league');
      } else {
        setError(errorMsg || 'Failed to join league');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPublicLeagues = async () => {
    setLoadingPublic(true);
    try {
      const response = await api.get('/api/leagues/public');
      setPublicLeagues(response.data.leagues || []);
    } catch (err) {
      console.error('Failed to load public leagues:', err);
    } finally {
      setLoadingPublic(false);
    }
  };

  if (success && joinedLeague) {
    return (
      <div className="rg-page">
        <section className="rg-hero">
          <span className="rg-pill">Success!</span>
          <h1>Welcome to {joinedLeague.name}! 🎉</h1>
          <p>You've successfully joined the league. Let the competition begin!</p>
        </section>

        <section className="rg-section">
          <div className="rg-card" style={{
            maxWidth: '500px',
            margin: '0 auto',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
            <h2 style={{ marginBottom: '1rem' }}>You're In!</h2>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              Head to your dashboard to start making picks and competing for points.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => navigate('/my-leagues')}>
                View My Leagues
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="button-secondary"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <main className="rg-page" role="main" aria-label="Join League">
      <section className="rg-hero" aria-labelledby="join-title">
        <span className="rg-pill">Join League</span>
        <h1 id="join-title">Join an Existing League</h1>
        <p>Enter a league code to join or browse open leagues below</p>
      </section>

      {/* Join by Code */}
      <section className="rg-section">
        <h2>Join with Code</h2>
        <form
          onSubmit={handleSubmit}
          className="rg-card"
          style={{ maxWidth: '600px', margin: '0 auto' }}
          aria-label="Join league with code"
        >
          {error && (
            <div className="error" role="alert" style={{ marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="code" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              League Code *
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., SMIT-ABCD1234"
              required
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '1.1rem',
                letterSpacing: '1px',
              }}
            />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              Ask the league commissioner for the code
            </div>
          </div>

          {needsPassword && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                League Password *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                This league is password protected
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1 }}
              aria-busy={loading}
              aria-label={loading ? 'Joining league' : 'Join league'}
            >
              {loading ? 'Joining...' : 'Join League'}
            </button>
            <Link to="/my-leagues" style={{ flex: 1 }}>
              <button type="button" className="button-secondary" style={{ width: '100%' }}>
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </section>

      {/* Browse Public Leagues */}
      <section className="rg-section">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ margin: 0 }}>Browse Open Leagues</h2>
          <button
            onClick={loadPublicLeagues}
            className="button-secondary"
            disabled={loadingPublic}
          >
            {loadingPublic ? 'Loading...' : publicLeagues.length > 0 ? 'Refresh' : 'Show Open Leagues'}
          </button>
        </div>

        {publicLeagues.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {publicLeagues.map(league => (
              <div
                key={league.id}
                className="rg-card"
                style={{
                  background: league.isMember ? '#f9fafb' : 'white',
                  opacity: league.isMember ? 0.6 : 1,
                  cursor: league.isMember ? 'default' : 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => {
                  if (!league.isMember) {
                    setCode(league.code);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{league.name}</h3>
                    {league.isMember && (
                      <span style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}>
                        MEMBER
                      </span>
                    )}
                  </div>
                  {league.description && (
                    <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: '#666', lineHeight: 1.4 }}>
                      {league.description}
                    </p>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: '#666',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e5e5e5'
                }}>
                  <span>{league.currentPlayers} / {league.maxPlayers} players</span>
                  <span style={{
                    background: '#e5e5e5',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    {league.code}
                  </span>
                </div>

                {/* Entry fee and charity badge */}
                {league.entryFee > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      ${Number(league.entryFee).toFixed(0)} entry
                    </span>
                    {league.charityEnabled && (
                      <span style={{
                        background: '#d1fae5',
                        color: '#065f46',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        Charity Pot
                      </span>
                    )}
                  </div>
                )}

                {!league.isMember && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCode(league.code);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      width: '100%',
                      marginTop: '1rem',
                      padding: '0.75rem',
                    }}
                  >
                    {league.entryFee > 0 ? `Join ($${Number(league.entryFee).toFixed(0)})` : 'Join This League'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : !loadingPublic && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'white',
            borderRadius: '16px',
            border: '2px dashed #e5e5e5',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              No open leagues available right now
            </p>
            <p style={{ fontSize: '0.9rem', color: '#999' }}>
              Create your own league or join with a code!
            </p>
          </div>
        )}
      </section>
    </main>
  );
};

export default JoinLeague;
