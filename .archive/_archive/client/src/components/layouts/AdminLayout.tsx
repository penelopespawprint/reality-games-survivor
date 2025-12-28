import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/shared/routes";
import AdminLeagueSelector from "@/components/AdminLeagueSelector";
import "./AdminLayout.css";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
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

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const adminModules = [
    { label: "League Insights & Trends", to: routes.admin.index, icon: "📊" },
    { label: "Weekly Scoring", to: routes.admin.scoring, icon: "🎯" },
    { label: "Scoring Dashboard", to: routes.admin.scoringDashboard, icon: "⚡" },
    { label: "Picks Manager", to: routes.admin.picks, icon: "🎲" },
    { label: "Castaway Management", to: routes.admin.castaways, icon: "👥" },
    { label: "User Management", to: routes.admin.users, icon: "👤" },
    { label: "SMS Manager", to: routes.admin.sms, icon: "📱" },
    { label: "System Stats", to: routes.admin.stats, icon: "💾" },
    { label: "User Feedback", to: routes.admin.feedback, icon: "💬" }
  ];

  return (
    <div className="admin-layout">
      {/* Mobile Menu Toggle */}
      <button
        className="admin-layout__mobile-toggle"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Overlay */}
      <div
        className={`admin-layout__mobile-overlay ${isMobileMenuOpen ? "active" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Fixed Left Sidebar */}
      <aside className={`admin-layout__sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="admin-layout__sidebar-header">
          <Link to={routes.root} className="admin-layout__logo">
            <img src="/images/logo/rgfl-logo.png" alt="RGFL" style={{ height: "40px", width: "auto" }} />
          </Link>
        </div>

        <nav className="admin-layout__sidebar-nav">
          {adminModules.map((module) => (
            <Link
              key={module.to}
              to={module.to}
              className={`admin-layout__sidebar-link ${
                location.pathname === module.to ? "active" : ""
              }`}
            >
              <span className="admin-layout__sidebar-icon">{module.icon}</span>
              <span className="admin-layout__sidebar-label">{module.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-layout__sidebar-footer">
          <Link to={routes.dashboard} className="admin-layout__view-site-btn">
            ← View Site
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-layout__main">
        {/* Top Bar with User Info */}
        <header className="admin-layout__topbar">
          <div className="admin-layout__topbar-content">
            <div className="admin-layout__topbar-left">
              <AdminLeagueSelector />
            </div>
            <div className="admin-layout__topbar-right">
              {user && (
                <div className="admin-layout__profile-dropdown" ref={dropdownRef}>
                  <button
                    className="admin-layout__profile-avatar"
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
                    <div className="admin-layout__dropdown-menu">
                      <div className="admin-layout__dropdown-header">
                        <div className="admin-layout__dropdown-user">{user.name}</div>
                        <div className="admin-layout__dropdown-email">{user.email}</div>
                      </div>
                      <button
                        className="admin-layout__dropdown-item"
                        onClick={() => {
                          navigate(routes.profile);
                          setIsDropdownOpen(false);
                        }}
                      >
                        View Profile
                      </button>
                      <button
                        className="admin-layout__dropdown-item"
                        onClick={() => {
                          navigate(routes.profile);
                          setIsDropdownOpen(false);
                        }}
                      >
                        Edit Profile
                      </button>
                      <button
                        className="admin-layout__dropdown-item"
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
        </header>

        {/* Content Panel */}
        <div className="admin-layout__content-wrapper">
          <div className="admin-layout__content-panel">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
