import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { AdminNav, PlayerNav, PublicNav } from './navigation';

interface UserProfile {
  id: string;
  display_name: string;
  role: 'player' | 'commissioner' | 'admin';
}

export function Navigation() {
  const { user, signOut } = useAuth();

  // View mode toggle for admins - persisted in localStorage
  const [viewMode, setViewMode] = useState<'admin' | 'player'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('adminViewMode') as 'admin' | 'player') || 'admin';
    }
    return 'admin';
  });

  // Update localStorage when view mode changes
  useEffect(() => {
    localStorage.setItem('adminViewMode', viewMode);
  }, [viewMode]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, role')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const isAdmin = profile?.role === 'admin';
  const showAdminNav = isAdmin && viewMode === 'admin';

  // Admin navigation
  if (user && showAdminNav) {
    return (
      <AdminNav
        profile={profile}
        onSwitchToPlayer={() => setViewMode('player')}
        onSignOut={signOut}
      />
    );
  }

  // Authenticated player navigation
  if (user) {
    return (
      <PlayerNav
        profile={profile}
        isAdmin={isAdmin}
        onSwitchToAdmin={() => setViewMode('admin')}
        onSignOut={signOut}
      />
    );
  }

  // Public/unauthenticated navigation
  return <PublicNav />;
}
