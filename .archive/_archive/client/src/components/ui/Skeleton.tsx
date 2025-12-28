/**
 * Skeleton Component
 *
 * Loading placeholder that shows content shape while data loads.
 * Reduces perceived load time and prevents layout shift.
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'circular' ? width : undefined),
  };

  if (lines > 1 && variant === 'text') {
    return (
      <div className="space-y-2" role="status" aria-label="Loading content">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={{
              ...style,
              width: i === lines - 1 ? '75%' : '100%', // Last line shorter
            }}
            aria-hidden="true"
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Pre-built skeleton patterns for common UI elements
 */

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`bg-white rounded-lg shadow p-4 ${className}`}
    role="status"
    aria-label="Loading card"
  >
    <Skeleton variant="rectangular" height={120} className="rounded-lg mb-4" />
    <Skeleton variant="text" width="60%" className="mb-2" />
    <Skeleton variant="text" lines={2} />
    <span className="sr-only">Loading card content...</span>
  </div>
);

export const SkeletonListItem: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`flex items-center gap-4 p-4 ${className}`}
    role="status"
    aria-label="Loading list item"
  >
    <Skeleton variant="circular" width={48} height={48} />
    <div className="flex-1">
      <Skeleton variant="text" width="40%" className="mb-2" />
      <Skeleton variant="text" width="70%" />
    </div>
    <span className="sr-only">Loading list item...</span>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="w-full" role="status" aria-label="Loading table">
    {/* Header */}
    <div className="flex gap-4 p-4 border-b border-gray-200">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} variant="text" className="flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 p-4 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" className="flex-1" />
        ))}
      </div>
    ))}
    <span className="sr-only">Loading table data...</span>
  </div>
);

export const SkeletonLeaderboard: React.FC<{ rows?: number }> = ({ rows = 10 }) => (
  <div className="space-y-2" role="status" aria-label="Loading leaderboard">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 p-3 bg-white rounded-lg shadow-sm"
      >
        <Skeleton variant="text" width={24} />
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="50%" />
        </div>
        <Skeleton variant="text" width={60} />
      </div>
    ))}
    <span className="sr-only">Loading leaderboard...</span>
  </div>
);

export default Skeleton;
