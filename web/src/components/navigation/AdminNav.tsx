import { Link, useLocation } from 'react-router-dom';
import { Shield, UserCircle } from 'lucide-react';

interface AdminNavProps {
  profile: { display_name: string } | null;
  onSwitchToPlayer: () => void;
  onSignOut: () => void;
}

export function AdminNav({ profile, onSwitchToPlayer, onSignOut }: AdminNavProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const adminLinks = [
    { path: '/admin/seasons', label: 'Seasons' },
    { path: '/admin/leagues', label: 'Leagues' },
    { path: '/admin/users', label: 'Users' },
    { path: '/admin/payments', label: 'Payments' },
    { path: '/admin/scoring-rules', label: 'Scoring' },
    { path: '/admin/jobs', label: 'Jobs' },
  ];

  return (
    <>
      {/* Very prominent Admin Mode Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white py-3 px-4 sticky top-0 z-[60]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <Shield className="h-4 w-4" />
              <span className="font-bold text-sm tracking-wide">ADMIN CONTROL PANEL</span>
            </div>
            <span className="text-white/80 text-sm hidden sm:inline">Full system access enabled</span>
          </div>
          <button
            onClick={onSwitchToPlayer}
            className="flex items-center gap-2 bg-white text-orange-600 px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-orange-50 transition-colors"
          >
            <UserCircle className="h-4 w-4" />
            Switch to Player View
          </button>
        </div>
      </div>

      <nav className="bg-cream-50 border-b-4 border-orange-400 shadow-lg sticky top-[52px] z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/admin" className="flex items-center gap-3">
              <img src="/logo.png" alt="RGFL" className="h-8 w-auto" />
              <div className="flex items-center gap-2">
                <span className="text-neutral-800 font-bold">RGFL</span>
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">ADMIN</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {adminLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-orange-500 text-white'
                      : 'text-neutral-600 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-neutral-800 text-sm font-medium">{profile?.display_name}</p>
                <p className="text-orange-600 text-xs font-semibold">Administrator</p>
              </div>
              <button
                onClick={onSignOut}
                className="text-neutral-500 hover:text-neutral-800 text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
