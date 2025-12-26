import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Tv, Clock, CheckCircle, Circle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Navigation } from '@/components/Navigation';

export default function SeasonSchedule() {
  const { seasonId } = useParams<{ seasonId: string }>();

  // Fetch season details
  const { data: season, isLoading: seasonLoading } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: async () => {
      if (!seasonId) throw new Error('No season ID');
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('id', seasonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!seasonId,
  });

  // Fetch episodes for this season
  const { data: episodes, isLoading: episodesLoading } = useQuery({
    queryKey: ['season-episodes', seasonId],
    queryFn: async () => {
      if (!seasonId) throw new Error('No season ID');
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', seasonId)
        .order('number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!seasonId,
  });

  const now = new Date();

  const getEpisodeStatus = (episode: any) => {
    const airDate = new Date(episode.air_date);
    if (episode.is_scored) return 'scored';
    if (airDate < now) return 'aired';
    return 'upcoming';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  if (seasonLoading || episodesLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </>
    );
  }

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
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-burgundy-500" />
              Episode Schedule
            </h1>
            <p className="text-neutral-500">
              Season {season?.number}: {season?.name}
            </p>
          </div>
        </div>

        {/* Key Dates */}
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 mb-6">
          <h2 className="text-lg font-display font-bold text-neutral-800 mb-3">Key Dates</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-cream-50 rounded-xl p-3 border border-cream-200">
              <p className="text-neutral-500">Premiere</p>
              <p className="text-neutral-800 font-medium">
                {season?.premiere_at ? formatDate(season.premiere_at) : '-'}
              </p>
            </div>
            <div className="bg-cream-50 rounded-xl p-3 border border-cream-200">
              <p className="text-neutral-500">Finale</p>
              <p className="text-neutral-800 font-medium">
                {season?.finale_at ? formatDate(season.finale_at) : '-'}
              </p>
            </div>
            <div className="bg-cream-50 rounded-xl p-3 border border-cream-200">
              <p className="text-neutral-500">Draft Deadline</p>
              <p className="text-neutral-800 font-medium">
                {season?.draft_deadline ? formatDate(season.draft_deadline) : '-'}
              </p>
            </div>
            <div className="bg-cream-50 rounded-xl p-3 border border-cream-200">
              <p className="text-neutral-500">Registration Closes</p>
              <p className="text-neutral-800 font-medium">
                {season?.registration_closes_at ? formatDate(season.registration_closes_at) : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Rhythm */}
        <div className="bg-burgundy-50 border border-burgundy-200 rounded-2xl p-4 mb-6">
          <h3 className="text-burgundy-500 font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Weekly Rhythm
          </h3>
          <div className="text-sm space-y-1 text-neutral-600">
            <p>
              <strong className="text-neutral-800">Wed 3:00 PM</strong> — Picks lock
            </p>
            <p>
              <strong className="text-neutral-800">Wed 8:00 PM</strong> — Episode airs
            </p>
            <p>
              <strong className="text-neutral-800">Fri 12:00 PM</strong> — Results posted
            </p>
          </div>
        </div>

        {/* Episodes List */}
        <div className="space-y-3">
          {episodes?.map((episode: any) => {
            const status = getEpisodeStatus(episode);
            return (
              <div
                key={episode.id}
                className={`bg-white rounded-2xl shadow-card p-4 border ${
                  status === 'scored'
                    ? 'border-green-300'
                    : status === 'aired'
                      ? 'border-amber-300'
                      : 'border-cream-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        status === 'scored'
                          ? 'bg-green-100'
                          : status === 'aired'
                            ? 'bg-amber-100'
                            : 'bg-cream-100'
                      }`}
                    >
                      {status === 'scored' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : status === 'aired' ? (
                        <Tv className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-neutral-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-neutral-800 font-medium">
                          Episode {episode.number}
                          {episode.is_finale && ' — Finale'}
                        </h3>
                        {status === 'scored' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Scored
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-sm">
                        {episode.title || formatDate(episode.air_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-neutral-800">{formatDate(episode.air_date)}</p>
                    <p className="text-neutral-500">{formatTime(episode.air_date)}</p>
                  </div>
                </div>

                {status === 'upcoming' && (
                  <div className="mt-3 pt-3 border-t border-cream-200 text-sm">
                    <p className="text-neutral-500">
                      Picks lock:{' '}
                      <span className="text-neutral-800">
                        {formatDate(episode.picks_lock_at)} at {formatTime(episode.picks_lock_at)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {episodes?.length === 0 && (
            <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 text-center">
              <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-500">Episode schedule not yet available.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
