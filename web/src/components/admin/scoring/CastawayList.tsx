/**
 * Castaway List Component
 *
 * Sidebar list of castaways for the scoring interface.
 */

interface Castaway {
  id: string;
  name: string;
  photo_url: string | null;
  status: string;
}

interface CastawayListProps {
  castaways: Castaway[] | undefined;
  selectedCastawayId: string | null;
  onSelectCastaway: (castawayId: string) => void;
  calculateCastawayTotal: (castawayId: string) => number;
}

export function CastawayList({
  castaways,
  selectedCastawayId,
  onSelectCastaway,
  calculateCastawayTotal,
}: CastawayListProps) {
  return (
    <div className="bg-white rounded-2xl shadow-elevated overflow-hidden">
      <div className="p-5 border-b border-cream-100">
        <h3 className="font-semibold text-neutral-800">Castaways</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {castaways?.map((castaway) => {
          const total = calculateCastawayTotal(castaway.id);
          return (
            <button
              key={castaway.id}
              onClick={() => onSelectCastaway(castaway.id)}
              className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                selectedCastawayId === castaway.id
                  ? 'bg-burgundy-50 border-l-4 border-burgundy-500'
                  : 'hover:bg-cream-50'
              }`}
            >
              <div className="w-10 h-10 bg-cream-200 rounded-full flex items-center justify-center">
                {castaway.photo_url ? (
                  <img
                    src={castaway.photo_url}
                    alt={castaway.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-neutral-500">
                    {castaway.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-neutral-800">{castaway.name}</p>
              </div>
              {total !== 0 && (
                <span
                  className={`text-sm font-bold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {total >= 0 ? '+' : ''}
                  {total}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
