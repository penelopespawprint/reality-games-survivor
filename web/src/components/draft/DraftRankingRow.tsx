/**
 * Draft Ranking Row Component
 *
 * Single castaway row in the draft rankings list with drag support.
 */

import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import type { Castaway } from '@/types';

// Tribe tag styling map
const tribeStyles: Record<string, { bg: string; text: string }> = {
  Vatu: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Kalo: { bg: 'bg-teal-100', text: 'text-teal-700' },
  Cila: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

function TribeTag({ tribe }: { tribe: string }) {
  const style = tribeStyles[tribe] || { bg: 'bg-neutral-100', text: 'text-neutral-600' };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
      {tribe}
    </span>
  );
}

interface DraftRankingRowProps {
  castaway: Castaway;
  index: number;
  totalCount: number;
  isDragging: boolean;
  isLocked: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function DraftRankingRow({
  castaway,
  index,
  totalCount,
  isDragging,
  isLocked,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMoveUp,
  onMoveDown,
}: DraftRankingRowProps) {
  return (
    <div
      draggable={!isLocked}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`p-3 flex items-center gap-3 transition-all ${
        isDragging ? 'bg-burgundy-50 opacity-50' : 'hover:bg-cream-50'
      } ${isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {/* Rank Number */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          index < 2
            ? 'bg-burgundy-100 text-burgundy-600'
            : index < 5
              ? 'bg-amber-100 text-amber-600'
              : 'bg-cream-100 text-neutral-600'
        }`}
      >
        {index + 1}
      </div>

      {/* Drag Handle */}
      {!isLocked && <GripVertical className="h-5 w-5 text-neutral-300 flex-shrink-0" />}

      {/* Photo */}
      <img
        src={getAvatarUrl(castaway.name, castaway.photo_url)}
        alt={castaway.name}
        className="w-10 h-10 rounded-full object-cover border border-cream-200"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-neutral-800 truncate">{castaway.name}</p>
          {castaway.tribe_original && <TribeTag tribe={castaway.tribe_original} />}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          {castaway.age && <span>{castaway.age} yrs</span>}
          {castaway.hometown && (
            <>
              {castaway.age && <span>·</span>}
              <span>{castaway.hometown}</span>
            </>
          )}
          {castaway.occupation && (
            <>
              <span>·</span>
              <span className="truncate">{castaway.occupation}</span>
            </>
          )}
        </div>
      </div>

      {/* Up/Down Buttons */}
      {!isLocked && (
        <div className="flex flex-col gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 hover:bg-cream-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronUp className="h-4 w-4 text-neutral-500" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalCount - 1}
            className="p-1 hover:bg-cream-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          </button>
        </div>
      )}
    </div>
  );
}
