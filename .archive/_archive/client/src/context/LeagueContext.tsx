import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { LeagueMember, getErrorMessage } from '@/shared/types';

interface League {
  id: string;
  name: string;
  code: string;
  type: 'OFFICIAL' | 'CUSTOM';
  description?: string;
  maxPlayers: number;
  currentPlayers: number;
  status: 'OPEN' | 'FULL' | 'ACTIVE' | 'COMPLETED';
  draftStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  myRole: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  members?: LeagueMember[];
  seasonId?: string;
  seasonNumber?: number;
  seasonName?: string;
  seasonStatus?: 'COLLECTING' | 'DRAFT_WEEK' | 'ACTIVE' | 'GRACE' | 'ARCHIVED';
}

interface LeagueContextType {
  leagues: League[];
  selectedLeague: League | null;
  loading: boolean;
  error: string | null;
  selectLeague: (leagueId: string) => void;
  refreshLeagues: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/leagues/my-leagues');
      const fetchedLeagues = response.data.leagues || [];
      setLeagues(fetchedLeagues);

      // Auto-select league priority:
      // 1. Stored league from localStorage (user's previous selection)
      // 2. OFFICIAL league for the ACTIVE season
      // 3. Any league for the ACTIVE season
      // 4. First OFFICIAL league
      // 5. First league
      if (fetchedLeagues.length > 0) {
        const storedLeagueId = typeof window !== 'undefined' ? localStorage.getItem('selectedLeagueId') : null;
        const storedLeague = storedLeagueId ? fetchedLeagues.find((l: League) => l.id === storedLeagueId) : null;

        // Find leagues for the ACTIVE season (currently playing)
        const activeSeasonLeagues = fetchedLeagues.filter((l: League) => l.seasonStatus === 'ACTIVE');
        const activeSeasonOfficial = activeSeasonLeagues.find((l: League) => l.type === 'OFFICIAL');

        // Fallback to any official league
        const anyOfficialLeague = fetchedLeagues.find((l: League) => l.type === 'OFFICIAL');

        let selectedLeagueToSet: League | null = null;

        if (storedLeague) {
          selectedLeagueToSet = storedLeague;
        } else if (activeSeasonOfficial) {
          // Prefer OFFICIAL league for the ACTIVE season
          selectedLeagueToSet = activeSeasonOfficial;
        } else if (activeSeasonLeagues.length > 0) {
          // Any league for the active season
          selectedLeagueToSet = activeSeasonLeagues[0];
        } else if (anyOfficialLeague) {
          selectedLeagueToSet = anyOfficialLeague;
        } else {
          selectedLeagueToSet = fetchedLeagues[0];
        }

        setSelectedLeague(selectedLeagueToSet);
        if (typeof window !== 'undefined' && selectedLeagueToSet) {
          localStorage.setItem('selectedLeagueId', selectedLeagueToSet.id);
        }
      } else {
        setSelectedLeague(null);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch leagues:', err);
      setError(getErrorMessage(err));
      setLeagues([]);
      setSelectedLeague(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadLeagues = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/api/leagues/my-leagues');

        if (!isMounted) return;

        const fetchedLeagues = response.data.leagues || [];
        setLeagues(fetchedLeagues);

        // Auto-select league priority (same as fetchLeagues)
        if (fetchedLeagues.length > 0) {
          const storedLeagueId = typeof window !== 'undefined' ? localStorage.getItem('selectedLeagueId') : null;
          const storedLeague = storedLeagueId ? fetchedLeagues.find((l: League) => l.id === storedLeagueId) : null;

          const activeSeasonLeagues = fetchedLeagues.filter((l: League) => l.seasonStatus === 'ACTIVE');
          const activeSeasonOfficial = activeSeasonLeagues.find((l: League) => l.type === 'OFFICIAL');
          const anyOfficialLeague = fetchedLeagues.find((l: League) => l.type === 'OFFICIAL');

          let selectedLeagueToSet: League | null = null;

          if (storedLeague) {
            selectedLeagueToSet = storedLeague;
          } else if (activeSeasonOfficial) {
            selectedLeagueToSet = activeSeasonOfficial;
          } else if (activeSeasonLeagues.length > 0) {
            selectedLeagueToSet = activeSeasonLeagues[0];
          } else if (anyOfficialLeague) {
            selectedLeagueToSet = anyOfficialLeague;
          } else {
            selectedLeagueToSet = fetchedLeagues[0];
          }

          setSelectedLeague(selectedLeagueToSet);
          if (typeof window !== 'undefined' && selectedLeagueToSet) {
            localStorage.setItem('selectedLeagueId', selectedLeagueToSet.id);
          }
        } else {
          setSelectedLeague(null);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error('Failed to fetch leagues:', err);
        setError(getErrorMessage(err));
        setLeagues([]);
        setSelectedLeague(null);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    loadLeagues();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectLeague = (leagueId: string) => {
    const league = leagues.find(l => l.id === leagueId);
    if (league) {
      setSelectedLeague(league);
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedLeagueId', leagueId);
      }
    }
  };

  const refreshLeagues = async () => {
    await fetchLeagues();
  };

  return (
    <LeagueContext.Provider
      value={{
        leagues,
        selectedLeague,
        loading,
        error,
        selectLeague,
        refreshLeagues,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
}
