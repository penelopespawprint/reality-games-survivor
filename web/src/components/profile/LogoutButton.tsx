/**
 * Logout Button Component
 *
 * Red logout button for profile page.
 */

import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  onLogout: () => void;
}

export function LogoutButton({ onLogout }: LogoutButtonProps) {
  return (
    <button
      onClick={onLogout}
      className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold py-3 rounded-xl transition-colors"
    >
      <LogOut className="h-5 w-5" />
      Log Out
    </button>
  );
}
