import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '@/context/LeagueContext';

const LeagueSwitcher: React.FC = () => {
  const { leagues, selectedLeague, selectLeague } = useLeague();
  const navigate = useNavigate();

  if (leagues.length === 0) {
    return null;
  }

  const handleLeagueChange = (leagueId: string) => {
    selectLeague(leagueId);
  };

  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      alignItems: 'center',
      marginBottom: '2rem',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: '250px' }}>
        <label htmlFor="league-select" style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          color: '#666',
        }}>
          Viewing League:
        </label>
        <select
          id="league-select"
          value={selectedLeague?.id || ''}
          onChange={(e) => handleLeagueChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            borderRadius: '12px',
            border: '2px solid #e5e5e5',
            background: 'white',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {leagues.map(league => (
            <option key={league.id} value={league.id}>
              {league.type === 'OFFICIAL' ? '🏝️ ' : '👥 '}
              {league.name}
              {league.myRole === 'ADMIN' ? ' (Admin)' : ''}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => navigate('/my-leagues')}
        className="button-secondary"
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '0.9rem',
          whiteSpace: 'nowrap',
        }}
      >
        Manage Leagues
      </button>
    </div>
  );
};

export default LeagueSwitcher;
