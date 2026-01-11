/**
 * EditableText component for inline editing of CMS content
 * Only shows edit buttons when admin is logged in AND global edit mode is on
 * Supports both plain text and WYSIWYG rich text editing
 */

import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Pencil, Check, X, Loader2, Type } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEditMode } from '@/lib/hooks/useEditMode';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Lazy load the RichTextEditor to avoid bundle bloat for non-admin users
const RichTextEditor = lazy(() =>
  import('./RichTextEditor').then((m) => ({ default: m.RichTextEditor }))
);

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface EditableTextProps {
  /** The CMS key for this text */
  copyKey: string;
  /** The current text value */
  children: string;
  /** HTML element to render as */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div' | 'label';
  /** Additional className */
  className?: string;
  /** Whether this is a multiline field (textarea for plain text) */
  multiline?: boolean;
  /** Enable WYSIWYG rich text editing */
  richText?: boolean;
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
  richText = false,
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
    if (isEditing && inputRef.current && !richText) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, richText]);

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
    if (e.key === 'Enter' && !multiline && !richText) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Not admin or edit mode off - just render normally
  if (!isAdmin || !isEditMode) {
    // If richText, render HTML content
    if (richText) {
      return (
        <Component
          className={className}
          dangerouslySetInnerHTML={{ __html: children }}
        />
      );
    }
    return <Component className={className}>{children}</Component>;
  }

  // Rich text editing mode - show modal
  if (isEditing && richText) {
    return (
      <>
        <Component
          className={`${className} border-b-2 border-dashed border-burgundy-300 opacity-50`}
          dangerouslySetInnerHTML={{ __html: children }}
        />
        {/* Modal overlay */}
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-cream-200 bg-cream-50">
              <div className="flex items-center gap-2">
                <Type className="h-5 w-5 text-burgundy-500" />
                <h3 className="font-semibold text-neutral-800">Edit Rich Text</h3>
              </div>
              <span className="text-sm text-neutral-400 font-mono">{copyKey}</span>
            </div>

            {/* Editor */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-burgundy-500" />
                  </div>
                }
              >
                <RichTextEditor
                  value={editValue}
                  onChange={setEditValue}
                  placeholder="Enter your content..."
                />
              </Suspense>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between p-4 border-t border-cream-200 bg-cream-50">
              <div>
                {error && <span className="text-red-500 text-sm">{error}</span>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  disabled={mutation.isPending}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={mutation.isPending}
                  className="px-4 py-2 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Plain text editing mode
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
      {richText ? (
        <Component
          className={`${className} border-b-2 border-dashed border-burgundy-300`}
          dangerouslySetInnerHTML={{ __html: children }}
        />
      ) : (
        <Component className={`${className} border-b-2 border-dashed border-burgundy-300`}>
          {children}
        </Component>
      )}
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
