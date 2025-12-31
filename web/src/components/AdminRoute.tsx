import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function AdminRoute() {
  const { user, loading, isAdmin } = useAuth();

  // Check if we are processing a magic link or OAuth callback
  // The hash contains access_token when coming from auth redirects
  const hasAuthHash = window.location.hash.includes('access_token');

  // Show loading spinner while auth is initializing OR while processing auth callback
  if (loading || hasAuthHash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-200">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-burgundy-500" />
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin - redirect to dashboard with error
  if (!isAdmin) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ error: 'Access denied. Admin privileges required.' }}
      />
    );
  }

  return <Outlet />;
}
