interface CastawayCardProps {
  id: string;
  name: string;
  photoUrl?: string;
  hometown?: string;
  age?: number;
  strength?: string;
  strategy?: string;
  selected?: boolean;
  disabled?: boolean;
  showButton?: boolean;
  buttonText?: string;
  onSelect?: (id: string) => void;
}

export function CastawayCard({
  id,
  name,
  photoUrl,
  hometown,
  strength,
  strategy,
  selected,
  disabled,
  showButton = true,
  buttonText = 'Add to Draft',
  onSelect,
}: CastawayCardProps) {
  return (
    <div
      className={`castaway-card ${selected ? 'castaway-card-selected' : ''} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      {/* Photo */}
      <div className="relative">
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="castaway-card-image" />
        ) : (
          <div className="castaway-card-image flex items-center justify-center">
            <svg
              className="w-16 h-16 text-neutral-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-burgundy-500 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="castaway-card-body">
        <h3 className="castaway-card-name">{name}</h3>
        {hometown && <p className="castaway-card-meta">{hometown}</p>}

        {/* Stats */}
        {(strength || strategy) && (
          <div className="castaway-card-stats">
            {strength && (
              <div>
                <span className="text-neutral-400">Strength</span>
                <span className="ml-1 font-medium">{strength}</span>
              </div>
            )}
            {strategy && (
              <div>
                <span className="text-neutral-400">Strategy</span>
                <span className="ml-1 font-medium">{strategy}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {showButton && (
          <button
            onClick={() => onSelect?.(id)}
            disabled={disabled}
            className={`w-full mt-3 btn btn-sm ${
              selected ? 'bg-neutral-100 text-neutral-600' : 'btn-primary'
            }`}
          >
            {selected ? 'Selected' : buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
