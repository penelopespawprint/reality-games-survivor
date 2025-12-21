import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AppNav } from '@/components/AppNav';

interface ScoringRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  points: number;
  category: string | null;
  is_negative: boolean;
}

interface UserProfile {
  id: string;
  display_name: string;
}

const categoryOrder = [
  'Pre-Merge Challenges',
  'Pre-Merge Tribal',
  'Post-Merge Challenges',
  'Post-Merge Tribal',
  'Advantages',
  'Hidden Immunity Idols',
  'Random',
  'Final Three',
];

export function ScoringRules() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['scoringRules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scoring_rules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as ScoringRule[];
    },
  });

  // Group rules by category
  const groupedRules = rules?.reduce((acc, rule) => {
    const category = rule.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {} as Record<string, ScoringRule[]>);

  // Get sorted categories
  const categories = groupedRules
    ? categoryOrder.filter(cat => groupedRules[cat])
    : [];

  const filteredRules = selectedCategory
    ? groupedRules?.[selectedCategory] || []
    : rules || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <AppNav
        userName={profile?.display_name}
        userInitial={profile?.display_name?.charAt(0).toUpperCase()}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                to="/dashboard"
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-display text-neutral-800">
                Scoring Rules
              </h1>
            </div>
            <p className="text-neutral-500">
              {rules?.length || 0} rules across {categories.length} categories
            </p>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6 animate-slide-up">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              !selectedCategory
                ? 'bg-burgundy-500 text-white shadow-sm'
                : 'bg-white text-neutral-600 shadow-card hover:shadow-card-hover'
            }`}
          >
            All ({rules?.length || 0})
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-burgundy-500 text-white shadow-sm'
                  : 'bg-white text-neutral-600 shadow-card hover:shadow-card-hover'
              }`}
            >
              {category} ({groupedRules?.[category]?.length || 0})
            </button>
          ))}
        </div>

        {/* Rules List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-elevated p-12 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-burgundy-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-neutral-500 mt-4">Loading rules...</p>
          </div>
        ) : selectedCategory ? (
          <div className="bg-white rounded-2xl shadow-elevated overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-cream-100 bg-cream-50">
              <h2 className="font-semibold text-neutral-800">{selectedCategory}</h2>
              <p className="text-sm text-neutral-500 mt-1">
                {groupedRules?.[selectedCategory]?.length || 0} rules
              </p>
            </div>
            <div className="divide-y divide-cream-100">
              {filteredRules.map((rule) => (
                <div key={rule.id} className="p-5 flex items-start gap-4 hover:bg-cream-50 transition-colors">
                  <div className={`px-3 py-1 rounded-lg font-bold text-lg ${
                    rule.is_negative
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {rule.points >= 0 ? '+' : ''}{rule.points}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-800">{rule.name}</h3>
                    {rule.description && (
                      <p className="text-sm text-neutral-500 mt-1">{rule.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category, catIndex) => (
              <div
                key={category}
                className="bg-white rounded-2xl shadow-elevated overflow-hidden animate-slide-up"
                style={{ animationDelay: `${catIndex * 0.05}s` }}
              >
                <div className="p-6 border-b border-cream-100 bg-cream-50">
                  <h2 className="font-semibold text-neutral-800">{category}</h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    {groupedRules?.[category]?.length || 0} rules
                  </p>
                </div>
                <div className="divide-y divide-cream-100">
                  {groupedRules?.[category]?.map((rule) => (
                    <div key={rule.id} className="p-5 flex items-start gap-4 hover:bg-cream-50 transition-colors">
                      <div className={`px-3 py-1 rounded-lg font-bold text-lg min-w-[60px] text-center ${
                        rule.is_negative
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {rule.points >= 0 ? '+' : ''}{rule.points}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-neutral-800">{rule.name}</h3>
                        {rule.description && (
                          <p className="text-sm text-neutral-500 mt-1">{rule.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
