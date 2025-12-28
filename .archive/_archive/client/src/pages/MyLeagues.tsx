import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLeague } from '@/context/LeagueContext';
import { routes } from '@/shared/routes';

const MyLeagues: React.FC = () => {
  const { leagues, selectedLeague, loading, error, selectLeague } = useLeague();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rg-page">
        <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <div>Loading your leagues...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rg-page">
        <div className="error" style={{ textAlign: 'center', padding: '2rem' }}>
          {error}
        </div>
      </div>
    );
  }

  const officialLeagues = leagues.filter(l => l.type === 'OFFICIAL');
  const customLeagues = leagues.filter(l => l.type === 'CUSTOM');

  return (
    <main className="rg-page" role="main" aria-label="My Leagues">
      <section className="rg-hero" aria-labelledby="leagues-title">
        <span className="rg-pill">My Leagues</span>
        <h1 id="leagues-title">Your Fantasy Leagues</h1>
        <p>
          You're in {leagues.length} {leagues.length === 1 ? 'league' : 'leagues'}.
          Compete for glory in multiple leagues!
        </p>
      </section>

      {/* Quick Actions */}
      <section className="rg-section">
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '2rem'
        }}>
          <Link to="/create-league">
            <button style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
              ➕ Create Custom League
            </button>
          </Link>
          <Link to="/join-league">
            <button
              className="button-secondary"
              style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
            >
              🔗 Join League
            </button>
          </Link>
          <Link to="/global-leaderboard">
            <button
              className="button-secondary"
              style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
            >
              🌎 Global Leaderboard
            </button>
          </Link>
        </div>
      </section>

      {/* Official Leagues */}
      {officialLeagues.length > 0 && (
        <section className="rg-section">
          <h2 id="official-heading" style={{ marginBottom: '1.5rem' }}>Official League</h2>
          {officialLeagues.map(league => (
            <div
              key={league.id}
              className="rg-card"
              role="button"
              tabIndex={0}
              aria-label={`Select ${league.name} league with ${league.currentPlayers} of ${league.maxPlayers} players`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectLeague(league.id);
                  navigate(routes.dashboard);
                }
              }}
              style={{
                background: selectedLeague?.id === league.id
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'white',
                color: selectedLeague?.id === league.id ? 'white' : '#1a1a1a',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: '1rem',
              }}
              onClick={() => {
                selectLeague(league.id);
                navigate(routes.dashboard);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: selectedLeague?.id === league.id
                    ? 'rgba(255,255,255,0.2)'
                    : 'var(--brand-red)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'white',
                }}>
                  🏝️
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: '0 0 0.25rem 0',
                    fontSize: '1.25rem',
                    color: selectedLeague?.id === league.id ? 'white' : '#1a1a1a'
                  }}>
                    {league.name}
                  </h3>
                  <div style={{
                    fontSize: '0.9rem',
                    opacity: 0.8,
                    marginBottom: '0.5rem'
                  }}>
                    {league.currentPlayers} / {league.maxPlayers} players • {league.status}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    opacity: 0.7
                  }}>
                    Code: <strong>{league.code}</strong>
                  </div>
                </div>
                {selectedLeague?.id === league.id && (
                  <div style={{
                    background: 'rgba(255,255,255,0.9)',
                    color: '#667eea',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}>
                    ✓ ACTIVE
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Custom Leagues */}
      {customLeagues.length > 0 && (
        <section className="rg-section">
          <h2 id="custom-heading" style={{ marginBottom: '1.5rem' }}>Custom Leagues ({customLeagues.length})</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }} role="list" aria-labelledby="custom-heading">
            {customLeagues.map(league => (
              <div
                key={league.id}
                className="rg-card"
                role="listitem"
                tabIndex={0}
                aria-label={`Select ${league.name} league with ${league.currentPlayers} of ${league.maxPlayers} players`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectLeague(league.id);
                    navigate(routes.dashboard);
                  }
                }}
                style={{
                  background: selectedLeague?.id === league.id
                    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    : 'white',
                  color: selectedLeague?.id === league.id ? 'white' : '#1a1a1a',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => {
                  selectLeague(league.id);
                  navigate(routes.dashboard);
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '1.1rem',
                      color: selectedLeague?.id === league.id ? 'white' : '#1a1a1a'
                    }}>
                      {league.name}
                    </h3>
                    {league.myRole === 'ADMIN' && (
                      <span style={{
                        background: selectedLeague?.id === league.id
                          ? 'rgba(255,255,255,0.3)'
                          : '#f59e0b',
                        color: selectedLeague?.id === league.id ? 'white' : 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}>
                        ADMIN
                      </span>
                    )}
                  </div>
                  {league.description && (
                    <p style={{
                      margin: '0.5rem 0',
                      fontSize: '0.85rem',
                      opacity: 0.8,
                      lineHeight: 1.4
                    }}>
                      {league.description}
                    </p>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  opacity: 0.8,
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: selectedLeague?.id === league.id
                    ? '1px solid rgba(255,255,255,0.3)'
                    : '1px solid #e5e5e5'
                }}>
                  <span>{league.currentPlayers} / {league.maxPlayers} players</span>
                  <span>{league.status}</span>
                </div>

                {selectedLeague?.id === league.id && (
                  <div style={{
                    marginTop: '1rem',
                    background: 'rgba(255,255,255,0.9)',
                    color: '#f5576c',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textAlign: 'center',
                  }}>
                    ✓ CURRENTLY VIEWING
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No Leagues State */}
      {leagues.length === 0 && (
        <section className="rg-section">
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'white',
            borderRadius: '16px',
            border: '2px dashed #e5e5e5',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏝️</div>
            <h3 style={{ marginBottom: '1rem' }}>No Leagues Yet</h3>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              You're not in any leagues yet. Create your own or join an existing one!
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/create-league">
                <button>Create League</button>
              </Link>
              <Link to="/join-league">
                <button className="button-secondary">Join League</button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default MyLeagues;
