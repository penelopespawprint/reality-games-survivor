import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-950">
      <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="font-display text-2xl text-tribal-500">RGFL</span>
              <span className="text-neutral-400 text-sm hidden sm:block">Survivor</span>
            </Link>

            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-neutral-300 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link to="/leagues" className="text-neutral-300 hover:text-white transition-colors">
                Leagues
              </Link>
              <Link to="/picks" className="text-neutral-300 hover:text-white transition-colors">
                Picks
              </Link>

              <div className="flex items-center gap-3 pl-6 border-l border-neutral-700">
                <span className="text-sm text-neutral-400">{user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
