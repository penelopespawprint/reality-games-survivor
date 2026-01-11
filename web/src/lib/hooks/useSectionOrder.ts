/**
 * Hook for fetching and managing section order
 */

import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface SectionOrderResponse {
  order: string[] | null;
}

async function fetchSectionOrder(pageId: string): Promise<string[] | null> {
  const response = await fetch(`${API_URL}/api/site-copy/section-order/${pageId}`);
  if (!response.ok) {
    return null;
  }
  const data: SectionOrderResponse = await response.json();
  return data.order;
}

/**
 * Hook to get section order for a page
 * Returns ordered section IDs or null if no custom order exists
 */
export function useSectionOrder(pageId: string) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['section-order', pageId],
    queryFn: () => fetchSectionOrder(pageId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  /**
   * Reorder items based on saved order
   * Returns items in saved order, with any new items appended at the end
   */
  function reorderItems<T extends { id: string }>(items: T[]): T[] {
    if (!order) return items;

    const ordered: T[] = [];
    const remaining = [...items];

    // Add items in saved order
    for (const id of order) {
      const index = remaining.findIndex(item => item.id === id);
      if (index !== -1) {
        ordered.push(remaining[index]);
        remaining.splice(index, 1);
      }
    }

    // Add any remaining items that weren't in the saved order
    return [...ordered, ...remaining];
  }

  return {
    order,
    isLoading,
    reorderItems,
  };
}
