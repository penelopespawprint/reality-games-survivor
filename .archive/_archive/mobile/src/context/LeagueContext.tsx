/**
 * League Context
 *
 * Manages league selection and league data across the app
 * Provides current league context to all screens
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { API_CONFIG } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// League type (matches backend)
export interface League {
  id: string;
  name: string;
  code: string;
  commissionerId: string;
  seasonNumber: number;
  createdAt: string;
  memberCount?: number;
  isCommissioner?: boolean;
}

// League member with score
export interface LeagueMember {
  id: string;
  name: string;
  email: string;
  totalPoints: number;
  rank: number;
}

// League context type
interface LeagueContextType {
  leagues: League[];
  currentLeague: League | null;
  loading: boolean;
  error: string | null;
  fetchLeagues: () => Promise<void>;
  selectLeague: (league: League) => Promise<void>;
  joinLeague: (code: string) => Promise<void>;
  leaveLeague: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

const SELECTED_LEAGUE_KEY = 'rgfl_selected_league';

export const LeagueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [currentLeague, setCurrentLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize on mount
  useEffect(() => {
    initializeLeague();
  }, []);

  /**
   * Initialize league context
   * Restores last selected league from storage
   */
  const initializeLeague = async () => {
    try {
      setLoading(true);

      // Fetch user's leagues
      await fetchLeagues();

      // Try to restore last selected league
      const savedLeagueId = await AsyncStorage.getItem(SELECTED_LEAGUE_KEY);
      if (savedLeagueId) {
        const savedLeague = leagues.find(l => l.id === savedLeagueId);
        if (savedLeague) {
          setCurrentLeague(savedLeague);
        }
      }
    } catch (err) {
      console.error('Failed to initialize league context:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch user's leagues from API
   */
  const fetchLeagues = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(API_CONFIG.ENDPOINTS.MY_LEAGUES);
      // Backend returns { leagues: [...] }, extract the array
      const fetchedLeagues = response.data?.leagues || response.data || [];
      setLeagues(fetchedLeagues);

      // Auto-select first league if none selected
      if (!currentLeague && fetchedLeagues.length > 0) {
        await selectLeague(fetchedLeagues[0]);
      }

      console.log('✅ Fetched leagues:', fetchedLeagues.length);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch leagues';
      setError(errorMessage);
      console.error('❌ Failed to fetch leagues:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Select a league as current
   */
  const selectLeague = async (league: League) => {
    try {
      setCurrentLeague(league);
      await AsyncStorage.setItem(SELECTED_LEAGUE_KEY, league.id);
      console.log('✅ Selected league:', league.name);
    } catch (err) {
      console.error('Failed to save selected league:', err);
    }
  };

  /**
   * Join a league by code
   */
  const joinLeague = async (code: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(API_CONFIG.ENDPOINTS.JOIN_LEAGUE, { code });
      const newLeague = response.data.league;

      // Add to leagues list and select it
      setLeagues(prev => [...prev, newLeague]);
      await selectLeague(newLeague);

      console.log('✅ Joined league:', newLeague.name);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to join league';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Leave current league
   */
  const leaveLeague = async () => {
    if (!currentLeague) return;

    try {
      setLoading(true);
      setError(null);

      await api.post(API_CONFIG.ENDPOINTS.LEAVE_LEAGUE);

      // Remove from leagues list
      setLeagues(prev => prev.filter(l => l.id !== currentLeague.id));

      // Clear current selection
      setCurrentLeague(null);
      await AsyncStorage.removeItem(SELECTED_LEAGUE_KEY);

      // Select another league if available
      if (leagues.length > 1) {
        const nextLeague = leagues.find(l => l.id !== currentLeague.id);
        if (nextLeague) {
          await selectLeague(nextLeague);
        }
      }

      console.log('✅ Left league');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to leave league';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LeagueContext.Provider
      value={{
        leagues,
        currentLeague,
        loading,
        error,
        fetchLeagues,
        selectLeague,
        joinLeague,
        leaveLeague,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

/**
 * Hook to access league context
 */
export const useLeague = (): LeagueContextType => {
  const context = useContext(LeagueContext);
  if (context === undefined) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
};
