/**
 * EditableSections - Drag and drop section reordering for admin edit mode
 * Wraps page sections and allows reordering when edit mode is active
 */

import { ReactNode, useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEditMode } from '@/lib/hooks/useEditMode';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface Section {
  id: string;
  content: ReactNode;
}

interface EditableSectionsProps {
  /** Unique page identifier for saving order */
  pageId: string;
  /** Sections to render - each needs unique id */
  sections: Section[];
  /** Called when order changes (for local state update) */
  onReorder?: (newOrder: string[]) => void;
  /** Gap between sections */
  gap?: string;
}

interface SortableItemProps {
  id: string;
  children: ReactNode;
  isEditMode: boolean;
}

function SortableItem({ id, children, isEditMode }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!isEditMode) {
    return <div>{children}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'z-50' : ''}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 bg-burgundy-500 text-white rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Section border indicator */}
      <div className="border-2 border-dashed border-burgundy-200 rounded-lg p-2 hover:border-burgundy-400 transition-colors">
        {children}
      </div>
    </div>
  );
}

async function saveSectionOrder(pageId: string, order: string[]) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/site-copy/section-order`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pageId, order }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save order');
  }

  return response.json();
}

export function EditableSections({
  pageId,
  sections,
  onReorder,
  gap = 'gap-6',
}: EditableSectionsProps) {
  const { isAdmin } = useAuth();
  const { isEditMode } = useEditMode();
  const queryClient = useQueryClient();
  const [items, setItems] = useState(sections);
  const [hasChanges, setHasChanges] = useState(false);

  // Update items when sections prop changes
  useEffect(() => {
    setItems(sections);
  }, [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const saveMutation = useMutation({
    mutationFn: () => saveSectionOrder(pageId, items.map(i => i.id)),
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['section-order', pageId] });
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Notify parent of reorder
        onReorder?.(newItems.map(i => i.id));
        setHasChanges(true);

        return newItems;
      });
    }
  }

  // Not admin or edit mode off - just render normally
  if (!isAdmin || !isEditMode) {
    return (
      <div className={`flex flex-col ${gap}`}>
        {items.map((section) => (
          <div key={section.id}>{section.content}</div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Save button when changes exist */}
      {hasChanges && (
        <div className="sticky top-4 z-50 flex justify-center mb-4">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 bg-burgundy-500 hover:bg-burgundy-600 text-white px-4 py-2 rounded-full shadow-lg transition-colors"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Section Order
              </>
            )}
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={`flex flex-col ${gap} pl-10`}>
            {items.map((section) => (
              <SortableItem key={section.id} id={section.id} isEditMode={isEditMode}>
                {section.content}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
