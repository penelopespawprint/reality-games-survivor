import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

export function NotFound() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-elevated p-8 max-w-md w-full text-center border border-cream-200">
          <div className="w-20 h-20 bg-burgundy-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="h-10 w-10 text-burgundy-500" />
          </div>

          <h1 className="text-6xl font-display font-bold text-burgundy-500 mb-2">404</h1>
          <h2 className="text-xl font-display text-neutral-600 mb-4">Page Not Found</h2>

          <p className="text-neutral-500 mb-8">This page has been voted off the island.</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-cream-100 text-neutral-700 rounded-xl font-medium hover:bg-cream-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Go Back
            </button>
            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-burgundy-500 text-white rounded-xl font-medium hover:bg-burgundy-600 transition-colors"
            >
              <Home className="h-5 w-5" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
