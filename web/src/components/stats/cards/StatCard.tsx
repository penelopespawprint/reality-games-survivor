/**
 * Stat Card Component
 *
 * Wrapper card for displaying a single stat with title, chart, and optional footer.
 */

import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface StatCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  children: ReactNode;
  footer?: ReactNode;
}

export function StatCard({
  title,
  subtitle,
  icon,
  isLoading = false,
  error = null,
  children,
  footer,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      <div className="p-4 border-b border-cream-100">
        <div className="flex items-center gap-2">
          {icon && <div className="text-burgundy-500">{icon}</div>}
          <div>
            <h3 className="font-display font-bold text-neutral-800">{title}</h3>
            {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-burgundy-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {footer && (
        <div className="px-4 py-3 bg-cream-50 border-t border-cream-100 text-xs text-neutral-500">
          {footer}
        </div>
      )}
    </div>
  );
}
