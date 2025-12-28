/**
 * League Tabs Component
 *
 * Tab navigation for league home page.
 */

import { BarChart3, Users, Trophy } from 'lucide-react';

export type LeagueTab = 'overview' | 'players' | 'standings';

interface LeagueTabsProps {
  activeTab: LeagueTab;
  onTabChange: (tab: LeagueTab) => void;
}

export function LeagueTabs({ activeTab, onTabChange }: LeagueTabsProps) {
  const tabs: { id: LeagueTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'players', label: 'Players', icon: <Users className="h-4 w-4" /> },
    { id: 'standings', label: 'Standings', icon: <Trophy className="h-4 w-4" /> },
  ];

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === tab.id
              ? 'bg-burgundy-500 text-white shadow-md'
              : 'bg-white text-neutral-600 border border-cream-200 hover:border-burgundy-200'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
