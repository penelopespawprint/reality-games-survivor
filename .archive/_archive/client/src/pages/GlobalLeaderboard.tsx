import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner, LoadingError } from '@/components/ui';

interface GlobalStanding {
  userId: string;
  name: string;
  city?: string;
  state?: string;
  totalPoints: number;
  leaguesParticipated: number;
  rank: number;
  leagueBreakdown: {
    leagueId: string;
    leagueName: string;
    leagueType: 'OFFICIAL' | 'CUSTOM';
    points: number;
  }[];
}

const GlobalLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const [standings, setStandings] = useState<GlobalStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStandings();
  }, []);

  const loadStandings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/global/standings');
      setStandings(response.data.standings || []);
    } catch (err: any) {
      console.error('Failed to load global standings:', err);
      setError(err.response?.data?.error || 'Failed to load standings');
    } finally {
      setLoading(false);
    }
  };

  const filteredStandings = standings.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const userStanding = standings.find(s => s.userId === user?.id);

  if (loading) {
    return (
      <div className="rg-page">
        <LoadingSpinner size="lg" label="Loading global standings..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rg-page">
        <LoadingError
          resource="global standings"
          error={error}
          onRetry={loadStandings}
        />
      </div>
    );
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#667eea'; // Default
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  return (
    <main className="rg-page" role="main" aria-label="Global Leaderboard">
      <section className="rg-hero" aria-labelledby="global-title">
        <span className="rg-pill">Global Leaderboard</span>
        <h1 id="global-title">🌎 Global Rankings</h1>
        <p>All players ranked by total points across all leagues</p>
      </section>

      {/* User's Global Rank */}
      {userStanding && (
        <section className="rg-section">
          <div className="rg-card" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            textAlign: 'center',
            padding: '2rem',
            maxWidth: '800px',
            margin: '0 auto',
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
              Your Global Rank
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '2rem',
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: '3rem', fontWeight: 700 }}>
                  {getRankEmoji(userStanding.rank)} #{userStanding.rank}
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  out of {standings.length} players
                </div>
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                  {userStanding.totalPoints}
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Total Points</div>
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                  {userStanding.leaguesParticipated}
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Leagues</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search */}
      <section className="rg-section">
        <div style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
          <input
            type="text"
            placeholder="Search players by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search players by name or location"
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              borderRadius: '12px',
              border: '2px solid #e5e5e5',
            }}
          />
        </div>

        {/* Standings Table */}
        <div className="rg-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }} role="table" aria-label="Global rankings table">
              <thead>
                <tr style={{
                  background: '#f9fafb',
                  borderBottom: '2px solid #e5e5e5',
                }}>
                  <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Rank</th>
                  <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Player</th>
                  <th scope="col" style={{ padding: '1rem', textAlign: 'center', fontWeight: 700 }}>Points</th>
                  <th scope="col" style={{ padding: '1rem', textAlign: 'center', fontWeight: 700 }}>Leagues</th>
                  <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {filteredStandings.map((standing) => (
                  <tr
                    key={standing.userId}
                    style={{
                      borderBottom: '1px solid #e5e5e5',
                      background: standing.userId === user?.id ? '#f0f9ff' : 'white',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (standing.userId !== user?.id) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (standing.userId !== user?.id) {
                        e.currentTarget.style.background = 'white';
                      }
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        color: getRankColor(standing.rank),
                      }}>
                        <span>{getRankEmoji(standing.rank)}</span>
                        <span>#{standing.rank}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                          {standing.name}
                          {standing.userId === user?.id && (
                            <span style={{
                              marginLeft: '0.5rem',
                              background: '#3b82f6',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}>
                              YOU
                            </span>
                          )}
                        </div>
                        {(standing.city || standing.state) && (
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>
                            {[standing.city, standing.state].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a' }}>
                        {standing.totalPoints}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{
                        background: '#e5e5e5',
                        color: '#666',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        display: 'inline-block',
                      }}>
                        {standing.leaguesParticipated}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {standing.leagueBreakdown.map((league) => (
                          <div
                            key={league.leagueId}
                            style={{
                              background: league.leagueType === 'OFFICIAL' ? '#dbeafe' : '#fce7f3',
                              color: league.leagueType === 'OFFICIAL' ? '#1e40af' : '#be185d',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                            title={league.leagueName}
                          >
                            {league.points} pts
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredStandings.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#666',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
            <div>No players found matching "{searchTerm}"</div>
          </div>
        )}
      </section>

      {/* Back to My Leagues */}
      <section className="rg-section" style={{ textAlign: 'center' }}>
        <Link to="/my-leagues">
          <button className="button-secondary">
            ← Back to My Leagues
          </button>
        </Link>
      </section>
    </main>
  );
};

export default GlobalLeaderboard;
