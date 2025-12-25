import { Link, useLocation } from 'react-router-dom';
import { Mail, Home, BookOpen } from 'lucide-react';

export function PublicNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { path: '/', label: 'Home', icon: Home, exact: true },
    { path: '/how-to-play', label: 'How to Play', icon: BookOpen },
    { path: '/contact', label: 'Contact', icon: Mail },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-cream-200/50 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="RGFL" className="h-10 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? location.pathname === item.path
                : isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'text-burgundy-600'
                      : 'text-neutral-600 hover:text-burgundy-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-neutral-600 hover:text-burgundy-600 font-medium text-sm">
              Login
            </Link>
            <Link to="/signup" className="btn btn-primary shadow-elevated">
              Sign Up Free
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
