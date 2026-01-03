/**
 * TorchStaff Icon
 *
 * A Survivor-style torch with a wooden staff and fire on top.
 * Can be lit (orange fire) or unlit (gray/dimmed).
 */

interface TorchStaffProps {
  lit: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TorchStaff({ lit, size = 'md', className = '' }: TorchStaffProps) {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const fireColor = lit ? '#F97316' : '#9CA3AF'; // orange-500 or gray-400
  const fireGlow = lit ? '#FCD34D' : '#D1D5DB'; // amber-300 or gray-300
  const staffColor = lit ? '#92400E' : '#6B7280'; // amber-800 or gray-500

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeMap[size]} ${className}`}
    >
      {/* Staff (wooden handle) */}
      <rect x="10.5" y="10" width="3" height="12" rx="1" fill={staffColor} />
      <rect x="10.5" y="20" width="3" height="2" rx="0.5" fill={staffColor} opacity="0.7" />

      {/* Fire holder/base */}
      <path d="M8 10 L16 10 L14 12 L10 12 Z" fill={staffColor} />

      {/* Fire flames */}
      {lit && (
        <>
          {/* Outer glow */}
          <ellipse cx="12" cy="5" rx="5" ry="4" fill={fireGlow} opacity="0.3" />

          {/* Main flame - center */}
          <path
            d="M12 1 C12 1 8 4 8 7 C8 9.5 9.5 10 12 10 C14.5 10 16 9.5 16 7 C16 4 12 1 12 1 Z"
            fill={fireColor}
          />

          {/* Inner flame - bright yellow */}
          <path
            d="M12 3 C12 3 10 5 10 7 C10 8.5 10.8 9 12 9 C13.2 9 14 8.5 14 7 C14 5 12 3 12 3 Z"
            fill={fireGlow}
          />

          {/* Flame tip highlight */}
          <path
            d="M12 2 C12 2 11 4 11 5.5 C11 6.5 11.5 7 12 7 C12.5 7 13 6.5 13 5.5 C13 4 12 2 12 2 Z"
            fill="#FEF3C7"
          />
        </>
      )}

      {/* Unlit/extinguished state */}
      {!lit && (
        <>
          {/* Smoke wisps */}
          <path d="M10 8 Q9 6 10 4" stroke="#9CA3AF" strokeWidth="0.5" fill="none" opacity="0.5" />
          <path d="M12 7 Q13 5 12 3" stroke="#9CA3AF" strokeWidth="0.5" fill="none" opacity="0.4" />
          <path d="M14 8 Q15 6 14 4" stroke="#9CA3AF" strokeWidth="0.5" fill="none" opacity="0.3" />

          {/* Charred top */}
          <ellipse cx="12" cy="9" rx="3" ry="1.5" fill="#4B5563" />
        </>
      )}
    </svg>
  );
}
