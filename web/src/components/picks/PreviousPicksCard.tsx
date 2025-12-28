/**
 * Previous Picks Card Component
 *
 * Shows history of user's previous picks in a league.
 */

interface WeeklyPick {
  id: string;
  episode_id: string;
  castaway_id: string | null;
  status: string;
  points_earned: number;
  episodes: {
    number: number;
    title: string | null;
  };
  castaways: {
    id: string;
    name: string;
    photo_url?: string;
    status: string;
  } | null;
}

interface PreviousPicksCardProps {
  picks: WeeklyPick[];
}

export function PreviousPicksCard({ picks }: PreviousPicksCardProps) {
  if (picks.length === 0) return null;

  return (
    <div
      className="bg-white rounded-2xl shadow-elevated p-6 animate-slide-up"
      style={{ animationDelay: '0.2s' }}
    >
      <h3 className="font-semibold text-neutral-800 mb-4">Previous Picks</h3>
      <div className="space-y-3">
        {picks.map((pick) => (
          <div
            key={pick.id}
            className="flex items-center justify-between p-3 bg-cream-50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-neutral-500">
                Ep {pick.episodes?.number}
              </span>
              <span className="font-medium text-neutral-800">
                {pick.castaways?.name || 'Unknown'}
              </span>
            </div>
            <span
              className={`badge ${pick.points_earned >= 0 ? 'badge-success' : 'bg-red-100 text-red-700'}`}
            >
              {pick.points_earned >= 0 ? '+' : ''}
              {pick.points_earned} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
