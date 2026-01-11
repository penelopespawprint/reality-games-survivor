/**
 * Hook for managing admin edit mode
 * When enabled, editable text fields show inline edit buttons
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EditModeState {
  isEditMode: boolean;
  toggleEditMode: () => void;
  setEditMode: (enabled: boolean) => void;
}

export const useEditMode = create<EditModeState>()(
  persist(
    (set) => ({
      isEditMode: false,
      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
      setEditMode: (enabled) => set({ isEditMode: enabled }),
    }),
    {
      name: 'admin-edit-mode',
    }
  )
);
