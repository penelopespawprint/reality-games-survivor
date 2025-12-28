import React, { useState, useRef, useEffect } from 'react';
import { useAdminLeague } from '@/context/AdminLeagueContext';

const AdminLeagueSelector: React.FC = () => {
  const { leagues, selectedLeagueId, selectLeague, isAllLeagues, loading } = useAdminLeague();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
  const displayText = isAllLeagues
    ? 'All Leagues'
    : selectedLeague
      ? `${selectedLeague.name} (${selectedLeague.currentPlayers}/${selectedLeague.maxPlayers})`
      : 'Select League';

  const getLeagueIcon = (type: 'OFFICIAL' | 'CUSTOM') => {
    return type === 'OFFICIAL' ? '🏝️' : '👥';
  };

  const getLeagueTypeColor = (type: 'OFFICIAL' | 'CUSTOM') => {
    return type === 'OFFICIAL' ? 'var(--brand-red)' : 'var(--accent-blue)';
  };

  if (loading) {
    return (
      <div style={{
        padding: '0.75rem 1.5rem',
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '8px',
        color: 'var(--text-muted)'
      }}>
        Loading leagues...
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.75rem 1.5rem',
          background: 'white',
          border: '2px solid var(--brand-red)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.95rem',
          color: 'var(--text-dark)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          minWidth: '250px',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(164, 40, 40, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>
            {isAllLeagues ? '🌐' : selectedLeague ? getLeagueIcon(selectedLeague.type) : '📋'}
          </span>
          <span>{displayText}</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '0.5rem',
          background: 'white',
          border: '2px solid var(--brand-red)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {/* All Leagues Option */}
          <div
            onClick={() => {
              selectLeague(null);
              setIsOpen(false);
            }}
            style={{
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-light)',
              background: isAllLeagues ? 'rgba(164, 40, 40, 0.1)' : 'transparent',
              fontWeight: isAllLeagues ? 600 : 400,
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isAllLeagues) e.currentTarget.style.background = 'var(--bg-cream)';
            }}
            onMouseLeave={(e) => {
              if (!isAllLeagues) e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🌐</span>
              <div>
                <div style={{ fontWeight: 600 }}>All Leagues</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  View aggregated data across all leagues
                </div>
              </div>
            </div>
          </div>

          {/* League List */}
          {leagues.map((league) => (
            <div
              key={league.id}
              onClick={() => {
                selectLeague(league.id);
                setIsOpen(false);
              }}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-light)',
                background: selectedLeagueId === league.id ? 'rgba(164, 40, 40, 0.1)' : 'transparent',
                fontWeight: selectedLeagueId === league.id ? 600 : 400,
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedLeagueId !== league.id) e.currentTarget.style.background = 'var(--bg-cream)';
              }}
              onMouseLeave={(e) => {
                if (selectedLeagueId !== league.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{getLeagueIcon(league.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{league.name}</span>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      background: getLeagueTypeColor(league.type),
                      color: 'white',
                      textTransform: 'uppercase'
                    }}>
                      {league.type}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.25rem',
                    display: 'flex',
                    gap: '1rem'
                  }}>
                    <span>👤 {league.currentPlayers}/{league.maxPlayers}</span>
                    <span>📊 {league.stats.picks} picks</span>
                    <span>🏆 {league.stats.scores} scores</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {leagues.length === 0 && (
            <div style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              No leagues found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminLeagueSelector;
