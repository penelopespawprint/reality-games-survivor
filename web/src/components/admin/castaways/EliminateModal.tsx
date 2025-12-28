/**
 * Eliminate Modal Component
 *
 * Modal for eliminating a castaway.
 */

interface Episode {
  id: string;
  number: number;
  title: string | null;
}

interface EliminateModalProps {
  castawayName: string;
  episodes: Episode[];
  selectedEpisodeId: string;
  onEpisodeChange: (episodeId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function EliminateModal({
  castawayName,
  episodes,
  selectedEpisodeId,
  onEpisodeChange,
  onConfirm,
  onCancel,
  isPending,
}: EliminateModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 animate-slide-up">
        <h3 className="text-xl font-display text-neutral-800 mb-4">Eliminate Castaway</h3>
        <p className="text-neutral-500 mb-6">
          Select the episode when {castawayName} was eliminated.
        </p>

        <select
          value={selectedEpisodeId}
          onChange={(e) => onEpisodeChange(e.target.value)}
          className="w-full p-3 border border-cream-200 rounded-xl mb-6 focus:ring-2 focus:ring-burgundy-500"
        >
          <option value="">Select episode...</option>
          {episodes.map((ep) => (
            <option key={ep.id} value={ep.id}>
              Episode {ep.number}: {ep.title || 'TBD'}
            </option>
          ))}
        </select>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 btn bg-cream-100 text-neutral-700 hover:bg-cream-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!selectedEpisodeId || isPending}
            className="flex-1 btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Eliminating...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
