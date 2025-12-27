import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { SpoilerWarning } from '@/components/SpoilerWarning';
import { supabase } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/avatar';
import {
  ArrowLeft,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Star,
  Target,
  Flame,
  XCircle,
} from 'lucide-react';

// Category colors and icons
const categoryConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  Challenges: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: <Target className="h-3 w-3" />,
  },
  Strategy: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: <Zap className="h-3 w-3" />,
  },
  Social: { color: 'text-pink-600', bgColor: 'bg-pink-50', icon: <Users className="h-3 w-3" /> },
  Survival: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: <Shield className="h-3 w-3" />,
  },
  Tribal: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: <Flame className="h-3 w-3" />,
  },
  Bonus: { color: 'text-amber-600', bgColor: 'bg-amber-50', icon: <Star className="h-3 w-3" /> },
};

export default function Results() {
  const { weekNumber } = useParams<{ weekNumber?: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [revealed, setRevealed] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [expandedCastaway, setExpandedCastaway] = useState<string | null>(null);

  // Verify token if present (from email link)
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  async function verifyToken(tokenStr: string) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/results/verify-token?token=${tokenStr}`);
      const data = await response.json();

      if (data.valid) {
        setTokenVerified(true);
        // Auto-reveal after brief warning
        setTimeout(() => setRevealed(true), 2000);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }
  }

  // Get current user
  const { data: _currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch episode by week number
  const { data: episode, isLoading: episodeLoading } = useQuery({
    queryKey: ['episode-by-week', weekNumber],
    queryFn: async () => {
      if (!weekNumber) return null;
      const weekNum = parseInt(weekNumber.replace('week-', ''));
      const { data, error } = await supabase
        .from('episodes')
        .select('*, seasons(*)')
        .eq('week_number', weekNum)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!weekNumber && revealed,
  });

  // Fetch episode scores with castaways and rules
  const { data: scores } = useQuery({
    queryKey: ['episode-scores', episode?.id],
    queryFn: async () => {
      if (!episode?.id) return [];
      const { data, error } = await supabase
        .from('episode_scores')
        .select('*, castaways(*), scoring_rules(*)')
        .eq('episode_id', episode.id)
        .order('castaways(name)');
      if (error) throw error;
      return data || [];
    },
    enabled: !!episode?.id && revealed,
  });

  // Fetch castaways eliminated in this episode
  const { data: eliminatedCastaways } = useQuery({
    queryKey: ['eliminated-castaways', episode?.id],
    queryFn: async () => {
      if (!episode?.id) return [];
      const { data, error } = await supabase
        .from('castaways')
        .select('id, name, photo_url')
        .eq('eliminated_episode_id', episode.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!episode?.id && revealed,
  });

  // Group scores by castaway
  const scoresByCastaway =
    scores?.reduce((acc: Record<string, any>, score) => {
      const castawayId = score.castaway_id;
      if (!acc[castawayId]) {
        acc[castawayId] = {
          castaway: score.castaways,
          scores: [],
          total: 0,
        };
      }
      acc[castawayId].scores.push(score);
      acc[castawayId].total += score.points;
      return acc;
    }, {}) || {};

  // Show spoiler warning if not revealed
  if (!revealed) {
    return (
      <SpoilerWarning
        weekNumber={parseInt(weekNumber?.replace('week-', '') || '0')}
        onReveal={() => setRevealed(true)}
        autoReveal={tokenVerified}
      />
    );
  }

  // Loading state
  if (episodeLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin mx-auto mb-4" />
            <p className="text-neutral-600">Loading results...</p>
          </div>
        </div>
      </>
    );
  }

  // Show results content (after reveal)
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/dashboard"
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800">
              Week {weekNumber?.replace('week-', '')} Results
            </h1>
            <p className="text-neutral-500">{episode?.title || 'Episode Results'}</p>
          </div>
        </div>

        {/* Elimination Alert */}
        {eliminatedCastaways && eliminatedCastaways.length > 0 && (
          <div className="rounded-xl p-4 mb-6 bg-orange-50 border border-orange-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-orange-100">
                <XCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-bold text-orange-800">
                  {eliminatedCastaways.length === 1
                    ? 'Castaway Eliminated'
                    : `${eliminatedCastaways.length} Castaways Eliminated`}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {eliminatedCastaways.map((castaway) => (
                    <div
                      key={castaway.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-orange-200"
                    >
                      <img
                        src={getAvatarUrl(castaway.name, castaway.photo_url)}
                        alt={castaway.name}
                        className="w-6 h-6 rounded-full object-cover grayscale"
                      />
                      <span className="text-sm font-medium text-neutral-700">{castaway.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Castaway Scoring Breakdown */}
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200">
          <h2 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-burgundy-500" />
            Scoring Breakdown
          </h2>

          {Object.keys(scoresByCastaway).length > 0 ? (
            <div className="space-y-3">
              {Object.values(scoresByCastaway)
                .sort((a: any, b: any) => b.total - a.total)
                .map((data: any) => {
                  const isExpanded = expandedCastaway === data.castaway.id;

                  // Group scores by category
                  const scoresByCategory = data.scores.reduce(
                    (acc: Record<string, any[]>, score: any) => {
                      const category = score.scoring_rules?.category || 'Other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(score);
                      return acc;
                    },
                    {}
                  );

                  return (
                    <div
                      key={data.castaway.id}
                      className="rounded-xl border bg-cream-50 border-cream-200"
                    >
                      <button
                        onClick={() => setExpandedCastaway(isExpanded ? null : data.castaway.id)}
                        className="w-full p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatarUrl(data.castaway.name, data.castaway.photo_url)}
                            alt={data.castaway.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <div className="text-left">
                            <p className="text-neutral-800 font-medium">{data.castaway.name}</p>
                            <p className="text-neutral-500 text-sm">
                              {data.scores.length} scoring event
                              {data.scores.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xl font-bold ${
                              data.total > 0
                                ? 'text-green-600'
                                : data.total < 0
                                  ? 'text-red-600'
                                  : 'text-neutral-800'
                            }`}
                          >
                            {data.total > 0 ? '+' : ''}
                            {data.total}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-neutral-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4">
                          {Object.entries(scoresByCategory).map(([category, categoryScores]) => {
                            const config = categoryConfig[category] || {
                              color: 'text-neutral-600',
                              bgColor: 'bg-neutral-50',
                              icon: null,
                            };
                            const categoryTotal = (categoryScores as any[]).reduce(
                              (sum, s) => sum + s.points,
                              0
                            );

                            return (
                              <div key={category}>
                                <div className={`flex items-center gap-2 mb-2 ${config.color}`}>
                                  {config.icon}
                                  <span className="text-sm font-medium">{category}</span>
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor}`}
                                  >
                                    {categoryTotal > 0 ? '+' : ''}
                                    {categoryTotal}
                                  </span>
                                </div>
                                <div className="space-y-1 pl-5">
                                  {(categoryScores as any[]).map((score) => (
                                    <div
                                      key={score.id}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-neutral-700">
                                          {score.scoring_rules?.name}
                                        </span>
                                        {score.quantity > 1 && (
                                          <span className="text-xs bg-cream-200 text-neutral-600 px-1.5 py-0.5 rounded">
                                            ×{score.quantity}
                                          </span>
                                        )}
                                      </div>
                                      <span
                                        className={`font-medium ${
                                          score.points >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}
                                      >
                                        {score.points >= 0 ? '+' : ''}
                                        {score.points}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-500">
                {episode?.is_scored
                  ? 'No scores recorded for this episode.'
                  : 'Scoring not yet finalized. Check back after Friday at noon!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
