import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/shared/routes";
import ReminderBar from "@/components/ReminderBar";
import "./UserLayout.css";

interface UserLayoutProps {
  children: React.ReactNode;
}

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close mobile menu
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate(routes.splash);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  };

  const navLinks = [
    { label: "Dashboard", to: routes.myLeagues },
    { label: "Leagues", to: routes.createLeague },
    { label: "Picks", to: routes.weeklyPicks },
    { label: "Standings", to: routes.globalLeaderboard },
    { label: "Game Tracker", to: "/game-tracker" },
    { label: "Rules", to: routes.rules }
  ];

  return (
    <div className="user-layout">
      {/* Reminder Bar */}
      <ReminderBar />

      {/* Top Navigation Bar */}
      <nav className="user-layout__nav">
        <div className="user-layout__nav-content">
          {/* Logo on the left */}
          <Link to={routes.root} className="user-layout__logo">
            <img src="/images/logo/rgfl-logo.png" alt="RGFL" className="user-layout__logo-img" />
          </Link>

          {/* Hamburger Menu Button (Mobile Only) */}
          <button
            className={`user-layout__hamburger ${isMobileMenuOpen ? "active" : ""}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="user-layout__hamburger-line"></span>
            <span className="user-layout__hamburger-line"></span>
            <span className="user-layout__hamburger-line"></span>
          </button>

          {/* Navigation Links and Controls */}
          <div className={`user-layout__nav-right ${isMobileMenuOpen ? "mobile-menu-open" : ""}`}>
            <div className="user-layout__nav-links">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`user-layout__nav-link ${
                    location.pathname === link.to ? "active" : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {user && (
              <div className="user-layout__profile-dropdown" ref={dropdownRef}>
                <button
                  className="user-layout__profile-avatar"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-label="User menu"
                  style={{
                    backgroundImage: user.profilePicture ? `url(${user.profilePicture})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}
                >
                  {!user.profilePicture && getInitials(user.name)}
                </button>
                {isDropdownOpen && (
                  <div className="user-layout__dropdown-menu">
                    <div className="user-layout__dropdown-header">
                      <div className="user-layout__dropdown-user">{user.name}</div>
                      <div className="user-layout__dropdown-email">{user.email}</div>
                    </div>
                    <button
                      className="user-layout__dropdown-item"
                      onClick={() => {
                        navigate(routes.profile);
                        setIsDropdownOpen(false);
                      }}
                    >
                      View Profile
                    </button>
                    <button
                      className="user-layout__dropdown-item"
                      onClick={() => {
                        navigate(routes.profile);
                        setIsDropdownOpen(false);
                      }}
                    >
                      Edit Profile
                    </button>
                    {user.isAdmin && (
                      <button
                        className="user-layout__dropdown-item"
                        onClick={() => {
                          navigate(routes.admin.dashboard);
                          setIsDropdownOpen(false);
                        }}
                      >
                        Admin Dashboard
                      </button>
                    )}
                    <button
                      className="user-layout__dropdown-item"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Panel */}
      <div className="user-layout__content-wrapper">
        <div className="user-layout__content-panel">
          {children}
        </div>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`user-layout__mobile-overlay ${isMobileMenuOpen ? "active" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Footer */}
      <footer className="user-layout__footer">
        <strong>Reality Games Fantasy League - Survivor</strong> is currently in Beta only. Email{" "}
        <a
          href="mailto:support@realitygamesfantasyleague.com"
          style={{ color: "var(--brand-red)", textDecoration: "none", fontWeight: 600 }}
        >
          support@realitygamesfantasyleague.com
        </a>
        {" "}to participate.
      </footer>
    </div>
  );
};

export default UserLayout;
