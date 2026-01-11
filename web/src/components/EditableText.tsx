/**
 * EditableText component for inline editing of CMS content
 * Only shows edit buttons when admin is logged in AND global edit mode is on
 */

import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEditMode } from '@/lib/hooks/useEditMode';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface EditableTextProps {
  /** The CMS key for this text */
  copyKey: string;
  /** The current text value */
  children: string;
  /** HTML element to render as */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  /** Additional className */
  className?: string;
  /** Whether this is a multiline field */
  multiline?: boolean;
}

async function updateSiteCopy(key: string, value: string) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/site-copy/update`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, value }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update');
  }

  return response.json();
}

export function EditableText({
  copyKey,
  children,
  as: Component = 'span',
  className = '',
  multiline = false,
}: EditableTextProps) {
  const { isAdmin } = useAuth();
  const { isEditMode } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(children);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (value: string) => updateSiteCopy(copyKey, value),
    onSuccess: () => {
      setIsEditing(false);
      setError(null);
      // Invalidate site copy queries to refresh content
      queryClient.invalidateQueries({ queryKey: ['site-copy'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to save');
    },
  });

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edit value when children change, but not while editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(children);
    }
  }, [children, isEditing]);

  const handleSave = () => {
    if (editValue !== children) {
      setError(null);
      mutation.mutate(editValue);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(children);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Not admin or edit mode off - just render normally
  if (!isAdmin || !isEditMode) {
    return <Component className={className}>{children}</Component>;
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className="relative inline-flex items-center gap-2">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-white border-2 border-burgundy-400 rounded-lg px-3 py-2 text-neutral-800 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-burgundy-500"
            rows={3}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`bg-white border-2 border-burgundy-400 rounded-lg px-3 py-1 text-neutral-800 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-burgundy-500`}
          />
        )}
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={handleCancel}
          disabled={mutation.isPending}
          className="p-1.5 bg-neutral-400 hover:bg-neutral-500 text-white rounded-lg transition-colors"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
        {error && (
          <span className="text-red-500 text-sm ml-2">{error}</span>
        )}
      </div>
    );
  }

  // Show text with edit button (edit mode is on)
  return (
    <span className="group relative inline-flex items-center gap-1">
      <Component className={`${className} border-b-2 border-dashed border-burgundy-300`}>
        {children}
      </Component>
      <button
        onClick={() => setIsEditing(true)}
        className="p-1 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded transition-all"
        title={`Edit: ${copyKey}`}
      >
        <Pencil className="h-3 w-3" />
      </button>
    </span>
  );
}
