import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface AdminLeague {
  id: string;
  name: string;
  code: string;
  type: 'OFFICIAL' | 'CUSTOM';
  status: 'OPEN' | 'FULL' | 'ACTIVE' | 'COMPLETED';
  currentPlayers: number;
  maxPlayers: number;
  stats: {
    members: number;
    picks: number;
    scores: number;
    draftPicks: number;
    rankings: number;
  };
}

interface AdminLeagueContextType {
  leagues: AdminLeague[];
  selectedLeagueId: string | null; // null = "All Leagues"
  selectLeague: (id: string | null) => void;
  isAllLeagues: boolean;
  getQueryParams: () => { leagueId?: string };
  loading: boolean;
  error: string | null;
  refreshLeagues: () => Promise<void>;
}

const AdminLeagueContext = createContext<AdminLeagueContextType | undefined>(undefined);

export function AdminLeagueProvider({ children }: { children: ReactNode }) {
  const [leagues, setLeagues] = useState<AdminLeague[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/admin/leagues');
      const fetchedLeagues = response.data.leagues || [];
      setLeagues(fetchedLeagues);

      // Auto-select based on stored preference or default to "All Leagues"
      const storedLeagueId = localStorage.getItem('adminSelectedLeagueId');
      if (storedLeagueId === 'ALL' || storedLeagueId === null) {
        setSelectedLeagueId(null);
      } else if (fetchedLeagues.find((l: AdminLeague) => l.id === storedLeagueId)) {
        setSelectedLeagueId(storedLeagueId);
      } else {
        setSelectedLeagueId(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin leagues:', err);
      setError(err.response?.data?.error || 'Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, []);

  const selectLeague = (id: string | null) => {
    setSelectedLeagueId(id);
    localStorage.setItem('adminSelectedLeagueId', id || 'ALL');
  };

  const getQueryParams = () => {
    return selectedLeagueId ? { leagueId: selectedLeagueId } : {};
  };

  const value: AdminLeagueContextType = {
    leagues,
    selectedLeagueId,
    selectLeague,
    isAllLeagues: selectedLeagueId === null,
    getQueryParams,
    loading,
    error,
    refreshLeagues: fetchLeagues,
  };

  return (
    <AdminLeagueContext.Provider value={value}>
      {children}
    </AdminLeagueContext.Provider>
  );
}

export function useAdminLeague() {
  const context = useContext(AdminLeagueContext);
  if (context === undefined) {
    throw new Error('useAdminLeague must be used within an AdminLeagueProvider');
  }
  return context;
}
