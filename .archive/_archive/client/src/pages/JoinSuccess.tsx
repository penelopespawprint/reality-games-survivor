import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { useLeague } from '@/context/LeagueContext';

const JoinSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshLeagues } = useLeague();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const leagueId = searchParams.get('league_id');

      if (!sessionId || !leagueId) {
        setError('Missing payment information');
        setLoading(false);
        return;
      }

      try {
        const response = await api.post('/api/payments/verify-and-join', {
          sessionId,
          leagueId,
        });

        if (response.data.success) {
          setLeague(response.data.league);
          await refreshLeagues();
        } else {
          setError('Payment verification failed');
        }
      } catch (err: any) {
        console.error('Failed to verify payment:', err);
        setError(err.response?.data?.error || 'Failed to verify payment');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, refreshLeagues]);

  if (loading) {
    return (
      <div className="rg-page">
        <section className="rg-hero">
          <h1>Verifying Payment...</h1>
          <p>Please wait while we confirm your payment</p>
        </section>

        <section className="rg-section">
          <div className="rg-card" style={{
            maxWidth: '500px',
            margin: '0 auto',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              <div className="loading-spinner" style={{
                width: '60px',
                height: '60px',
                border: '4px solid #e5e5e5',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto',
              }} />
            </div>
            <p style={{ color: '#666' }}>
              This should only take a moment...
            </p>
          </div>
        </section>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rg-page">
        <section className="rg-hero">
          <span className="rg-pill" style={{ background: '#fee2e2', color: '#dc2626' }}>Error</span>
          <h1>Something went wrong</h1>
          <p>We couldn't complete your league membership</p>
        </section>

        <section className="rg-section">
          <div className="rg-card" style={{
            maxWidth: '500px',
            margin: '0 auto',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>!</div>
            <h2 style={{ marginBottom: '1rem', color: '#dc2626' }}>Payment Issue</h2>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              {error}
            </p>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem' }}>
              If you were charged, please contact support and we'll help sort this out.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => navigate('/join-league')}>
                Try Again
              </button>
              <button
                onClick={() => navigate('/my-leagues')}
                className="button-secondary"
              >
                View My Leagues
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <main role="main" aria-label="Join league success" className="rg-page">
      <section className="rg-hero">
        <span className="rg-pill">Payment Complete</span>
        <h1>Welcome to {league?.name}!</h1>
        <p>Your payment was successful and you've joined the league</p>
      </section>

      <section className="rg-section">
        <div className="rg-card" style={{
          maxWidth: '600px',
          margin: '0 auto',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '2rem',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>$</div>
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>Payment Successful!</h2>

          {league?.charityEnabled && (
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                Your entry fee is part of the charity pot! At season end, the pot goes to the winner's chosen charity.
              </p>
            </div>
          )}

          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
              You've joined
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
            }}>
              {league?.name}
            </div>
            {league?.code && (
              <div style={{
                fontSize: '0.9rem',
                opacity: 0.8,
                marginTop: '0.5rem',
                fontFamily: 'monospace',
              }}>
                Code: {league.code}
              </div>
            )}
          </div>

          <p style={{ marginBottom: '2rem', opacity: 0.9 }}>
            Head to your dashboard to view your league standings and make your picks!
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/my-leagues')}
              style={{
                background: 'white',
                color: '#059669',
                border: 'none',
              }}
            >
              View My Leagues
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '2px solid white',
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default JoinSuccess;
