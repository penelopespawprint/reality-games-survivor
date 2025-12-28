import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLeague } from "@/context/LeagueContext";
import { routes } from "@/shared/routes";

interface NavLink {
  label: string;
  to?: string;
  dropdown?: { label: string; to: string }[];
  highlight?: boolean;
}

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const { leagues, selectedLeague, selectLeague } = useLeague();
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [leagueSelectorOpen, setLeagueSelectorOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const leagueRef = useRef<HTMLDivElement>(null);

  const navLinks: NavLink[] = [
    { label: "Rankings", to: routes.preseasonRank, highlight: true },
    { label: "Picks", to: routes.weeklyPicks },
    { label: "Leaderboard", to: routes.leaderboard },
    { label: "Game Tracker", to: "/game-tracker" },
    { label: "About", to: routes.about },
    { label: "Rules", to: routes.rules },
    { label: "Contact", to: routes.contact }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (leagueRef.current && !leagueRef.current.contains(event.target as Node)) {
        setLeagueSelectorOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate(routes.splash);
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="rg-nav">
      <div
        className="rg-nav__brand"
        onClick={() => navigate(user ? routes.dashboard : routes.root)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") navigate(user ? routes.dashboard : routes.root);
        }}
        role="button"
        tabIndex={0}
      >
        <img src="/images/logo/rgfl-logo.png" alt="RGFL" className="rg-nav__logo-img" />
      </div>
      <nav className="rg-nav__links">
        {navLinks.map((link) => {
          if (link.dropdown) {
            const isActive = link.to ? location.pathname === link.to || location.pathname.startsWith(`${link.to}/`) : link.dropdown.some(
              (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            );
            return (
              <div key={link.label} className="rg-nav__dropdown" ref={dropdownRef}>
                <button
                  className={`rg-nav__dropdown-trigger ${isActive ? "active" : ""}`}
                  onClick={() => link.to ? navigate(link.to) : toggleDropdown(link.label)}
                >
                  {link.label} <span className="rg-nav__dropdown-arrow">▾</span>
                </button>
                {openDropdown === link.label && (
                  <div className="rg-nav__dropdown-menu">
                    {link.dropdown.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="rg-nav__dropdown-item"
                        onClick={() => setOpenDropdown(null)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const active = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
          return (
            <Link
              key={link.to}
              to={link.to!}
              className={active ? "active" : undefined}
              style={link.highlight ? {
                background: "var(--brand-red)",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius)",
                fontWeight: 600
              } : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="rg-nav__actions">
        {user ? (
          <>
            {/* League Selector */}
            {leagues.length > 0 && (
              <div className="rg-nav__league" ref={leagueRef}>
                <button
                  className="rg-nav__league-trigger"
                  onClick={() => setLeagueSelectorOpen(!leagueSelectorOpen)}
                  title={selectedLeague?.name || 'Select League'}
                >
                  <span className="rg-nav__league-icon">
                    {selectedLeague?.type === 'OFFICIAL' ? '🏝️' : '👥'}
                  </span>
                  <span className="rg-nav__league-name">
                    {selectedLeague?.name || 'Select League'}
                  </span>
                  <span className="rg-nav__dropdown-arrow">▾</span>
                </button>
                {leagueSelectorOpen && (
                  <div className="rg-nav__dropdown-menu rg-nav__dropdown-menu--league">
                    <div className="rg-nav__dropdown-header">
                      <div className="rg-nav__dropdown-user">My Leagues</div>
                    </div>
                    {leagues.map(league => (
                      <button
                        key={league.id}
                        className={`rg-nav__dropdown-item ${selectedLeague?.id === league.id ? 'active' : ''}`}
                        onClick={() => {
                          selectLeague(league.id);
                          setLeagueSelectorOpen(false);
                        }}
                      >
                        <span style={{ marginRight: '0.5rem' }}>
                          {league.type === 'OFFICIAL' ? '🏝️' : '👥'}
                        </span>
                        {league.name}
                        {selectedLeague?.id === league.id && (
                          <span style={{ marginLeft: 'auto', color: 'var(--brand-red)' }}>✓</span>
                        )}
                      </button>
                    ))}
                    <Link
                      to="/my-leagues"
                      className="rg-nav__dropdown-item"
                      onClick={() => setLeagueSelectorOpen(false)}
                      style={{ borderTop: '1px solid #e5e5e5', marginTop: '0.5rem', paddingTop: '0.75rem' }}
                    >
                      Manage Leagues →
                    </Link>
                  </div>
                )}
              </div>
            )}
            {user.isAdmin && (
              <Link to={routes.admin.index} className="rg-nav__admin">
                Admin
              </Link>
            )}
            <div className="rg-nav__profile" ref={profileRef}>
              <button
                className="rg-nav__avatar"
                title={user.name}
                onClick={() => setProfileOpen(!profileOpen)}
                style={{
                  backgroundImage: user.profilePicture ? `url(${user.profilePicture})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
              >
                {!user.profilePicture && getInitials(user.name)}
              </button>
              {profileOpen && (
                <div className="rg-nav__dropdown-menu rg-nav__dropdown-menu--right">
                  <div className="rg-nav__dropdown-header">
                    <div className="rg-nav__dropdown-user">{user.name}</div>
                    <div className="rg-nav__dropdown-email">{user.email}</div>
                  </div>
                  <Link
                    to={routes.profile}
                    className="rg-nav__dropdown-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    Edit Profile
                  </Link>
                  <button className="rg-nav__dropdown-item" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button className="rg-nav__auth" onClick={() => navigate(routes.login)}>
              Login
            </button>
            <button className="rg-nav__cta" onClick={() => navigate(routes.signup)}>
              Sign Up
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Navigation;
