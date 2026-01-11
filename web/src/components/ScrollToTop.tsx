import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to top of page on route changes.
 * Place inside <BrowserRouter> to restore scroll position.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  // Disable browser's native scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Use useLayoutEffect to scroll before paint, avoiding flash of wrong position
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
