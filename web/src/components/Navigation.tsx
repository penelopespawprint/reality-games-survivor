import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Menu, X, ChevronDown, ChevronRight, Star, Users, Trophy, Calendar, HelpCircle, BookOpen, Mail, Settings, LogOut, Gamepad2, User } from 'lucide-react';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';

interface UserProfile {
  id: string;
  display_name: string;
  role: 'player' | 'commissioner' | 'admin';
}

type DropdownKey = 'play' | 'season' | 'help' | 'user' | null;

export function Navigation() {
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const { getCopy } = useSiteCopy();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [mobileAccordion, setMobileAccordion] = useState<DropdownKey>(null);
  
  const navRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    setMobileAccordion(null);
  }, [location.pathname]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Escape key to close dropdowns
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const toggleDropdown = useCallback((key: DropdownKey) => {
    setOpenDropdown(prev => prev === key ? null : key);
  }, []);

  const toggleMobileAccordion = useCallback((key: DropdownKey) => {
    setMobileAccordion(prev => prev === key ? null : key);
  }, []);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setMobileMenuOpen(false);
      setOpenDropdown(null);
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      window.location.href = '/';
    }
  };

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, role, avatar_url')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as UserProfile & { avatar_url?: string };
    },
    enabled: !!user?.id,
  });

  const displayName =
    profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isAdmin = profile?.role === 'admin';

  // Dropdown component for desktop
  const DesktopDropdown = ({ 
    label, 
    dropdownKey, 
    children,
    isActiveCheck 
  }: { 
    label: string; 
    dropdownKey: DropdownKey; 
    children: React.ReactNode;
    isActiveCheck?: boolean;
  }) => (
    <div className="relative">
      <button
        onClick={() => toggleDropdown(dropdownKey)}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
          isActiveCheck
            ? 'text-burgundy-600 bg-burgundy-50'
            : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
        }`}
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${openDropdown === dropdownKey ? 'rotate-180' : ''}`}
        />
      </button>
      {openDropdown === dropdownKey && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-neutral-200 min-w-[200px] z-50 py-1">
          {children}
        </div>
      )}
    </div>
  );

  // Mobile accordion component
  const MobileAccordion = ({ 
    label, 
    accordionKey, 
    children 
  }: { 
    label: string; 
    accordionKey: DropdownKey; 
    children: React.ReactNode;
  }) => (
    <div className="border-b border-neutral-100">
      <button
        onClick={() => toggleMobileAccordion(accordionKey)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-neutral-800 uppercase tracking-wide"
      >
        <span>{label}</span>
        <ChevronRight
          className={`h-4 w-4 transition-transform ${mobileAccordion === accordionKey ? 'rotate-90' : ''}`}
        />
      </button>
      {mobileAccordion === accordionKey && (
        <div className="pb-2">
          {children}
        </div>
      )}
    </div>
  );

  // Authenticated navigation
  if (user) {
    return (
      <nav
        ref={navRef}
        className={`bg-white border-b ${isAdmin ? 'border-orange-300' : 'border-neutral-200'} shadow-sm sticky top-0 z-50`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex-shrink-0">
              <img src="/logo.png" alt="RGFL" className="h-10 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {/* Dashboard - standalone */}
              <Link
                to="/dashboard"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive('/dashboard')
                    ? 'text-burgundy-600 bg-burgundy-50'
                    : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
                }`}
              >
                <EditableText copyKey="nav.dashboard" as="span" className="">{getCopy('nav.dashboard', 'Dashboard')}</EditableText>
              </Link>

              {/* Play Dropdown */}
              <DesktopDropdown 
                label={getCopy('nav.play', 'Play')} 
                dropdownKey="play"
                isActiveCheck={isActive('/leagues') || isActive('/draft/rankings') || isActive('/trivia')}
              >
                <Link
                  to="/leagues"
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-50 ${
                    location.pathname === '/leagues' ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <Users className="h-4 w-4 text-neutral-400" />
                  <div>
                    <EditableText copyKey="nav.my_leagues" as="span" className="font-medium">{getCopy('nav.my_leagues', 'My Leagues')}</EditableText>
                  </div>
                </Link>
                <Link
                  to="/leagues?view=all"
                  onClick={() => setOpenDropdown(null)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-50 text-neutral-600"
                >
                  <Gamepad2 className="h-4 w-4 text-neutral-400" />
                  <div>
                    <EditableText copyKey="nav.all_leagues" as="span" className="font-medium">{getCopy('nav.all_leagues', 'All Leagues')}</EditableText>
                  </div>
                </Link>
                <Link
                  to="/draft/rankings"
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-50 ${
                    isActive('/draft/rankings') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <Trophy className="h-4 w-4 text-neutral-400" />
                  <div>
                    <EditableText copyKey="nav.draft_rankings" as="span" className="font-medium">{getCopy('nav.draft_rankings', 'Draft Rankings')}</EditableText>
                  </div>
                </Link>
                <hr className="my-1 border-neutral-100" />
                <Link
                  to="/trivia"
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-teal-50 ${
                    isActive('/trivia') ? 'text-teal-600 bg-teal-50' : 'text-neutral-600'
                  }`}
                >
                  <Star className="h-4 w-4 text-teal-500 fill-teal-500" />
                  <div className="flex items-center gap-2">
                    <EditableText copyKey="nav.trivia" as="span" className="font-medium text-teal-600">{getCopy('nav.trivia', 'Trivia')}</EditableText>
                    <span className="bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      <EditableText copyKey="nav.trivia_badge" as="span" className="">{getCopy('nav.trivia_badge', 'NEW')}</EditableText>
                    </span>
                  </div>
                </Link>
              </DesktopDropdown>

              {/* Season Dropdown */}
              <DesktopDropdown 
                label={getCopy('nav.season', 'Season')} 
                dropdownKey="season"
                isActiveCheck={isActive('/castaways') || isActive('/leaderboard') || isActive('/timeline')}
              >
                <Link
                  to="/castaways"
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-50 ${
                    isActive('/castaways') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <Users className="h-4 w-4 text-neutral-400" />
                  <EditableText copyKey="nav.castaways" as="span" className="font-medium">{getCopy('nav.castaways', 'Castaways')}</EditableText>
                </Link>
                <Link
                  to="/leaderboard"
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-50 ${
                    isActive('/leaderboard') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <Trophy className="h-4 w-4 text-neutral-400" />
                  <EditableText copyKey="nav.leaderboard" as="span" className="font-medium">{getCopy('nav.leaderboard', 'Leaderboard')}</EditableText>
                </Link>
                <div className="relative" ref={howToPlayRef}>
                  <button
                    onClick={() => setHowToPlayOpen(!howToPlayOpen)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                      isActive('/how-to-play') || isActive('/scoring') || isActive('/timeline')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
                    }`}
                  >
                    <EditableText copyKey="nav.how_to_play" as="span" className="">{getCopy('nav.how_to_play', 'How to Play')}</EditableText>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${howToPlayOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {howToPlayOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-neutral-200 min-w-[180px] z-50 py-1">
                      <Link
                        to="/how-to-play"
                        onClick={() => setHowToPlayOpen(false)}
                        className={`block px-4 py-2 text-sm hover:bg-neutral-50 ${
                          isActive('/how-to-play') &&
                          !isActive('/scoring') &&
                          !isActive('/timeline')
                            ? 'text-burgundy-600 bg-burgundy-50'
                            : 'text-neutral-600'
                        }`}
                      >
                        <EditableText copyKey="nav.how_to_play_overview" as="span" className="">{getCopy('nav.how_to_play_overview', 'How to Play')}</EditableText>
                      </Link>
                      <Link
                        to="/scoring-rules"
                        onClick={() => setHowToPlayOpen(false)}
                        className={`block px-4 py-2 text-sm hover:bg-neutral-50 ${
                          isActive('/scoring') || isActive('/scoring-rules')
                            ? 'text-burgundy-600 bg-burgundy-50'
                            : 'text-neutral-600'
                        }`}
                      >
                        <EditableText copyKey="nav.scoring_rules" as="span" className="">{getCopy('nav.scoring_rules', 'Sample Scoring Rules')}</EditableText>
                      </Link>
                      <Link
                        to="/sms-commands"
                        onClick={() => setHowToPlayOpen(false)}
                        className={`block px-4 py-2 text-sm hover:bg-neutral-50 ${
                          isActive('/sms-commands')
                            ? 'text-burgundy-600 bg-burgundy-50'
                            : 'text-neutral-600'
                        }`}
                      >
                        <EditableText copyKey="nav.sms_commands" as="span" className="">{getCopy('nav.sms_commands', 'SMS Commands')}</EditableText>
                      </Link>
                      <Link
                        to="/timeline"
                        onClick={() => setHowToPlayOpen(false)}
                        className={`block px-4 py-2 text-sm hover:bg-neutral-50 ${
                          isActive('/timeline')
                            ? 'text-burgundy-600 bg-burgundy-50'
                            : 'text-neutral-600'
                        }`}
                      >
                        <EditableText copyKey="nav.weekly_timeline" as="span" className="">{getCopy('nav.weekly_timeline', 'Weekly Timeline')}</EditableText>
                      </Link>
                    </div>
                  )}
                </div>
                {/* Contact Dropdown */}
                <div className="relative" ref={contactRef}>
                  <button
                    onClick={() => setContactOpen(!contactOpen)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                      isActive('/contact') || isActive('/faq')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
                    }`}
                  >
                    <EditableText copyKey="nav.contact" as="span" className="">{getCopy('nav.contact', 'Contact')}</EditableText>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${contactOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {contactOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-neutral-200 min-w-[180px] z-50 py-1">
                      <Link
                        to="/contact"
                        onClick={() => setContactOpen(false)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-50 ${
                          isActive('/contact') && !isActive('/faq')
                            ? 'text-burgundy-600 bg-burgundy-50'
                            : 'text-neutral-600'
                        }`}
                      >
                        <Mail className="h-4 w-4" />
                        <EditableText copyKey="nav.contact_us" as="span" className="">{getCopy('nav.contact_us', 'Contact Us')}</EditableText>
                      </Link>
                      <Link
                        to="/faq"
                        onClick={() => setContactOpen(false)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-50 ${
                          isActive('/faq')
                            ? 'text-burgundy-600 bg-burgundy-50'
                            : 'text-neutral-600'
                        }`}
                      >
                        <HelpCircle className="h-4 w-4" />
                        <EditableText copyKey="nav.faq" as="span" className="">{getCopy('nav.faq', 'FAQ')}</EditableText>
                      </Link>
                    </div>
                  )}
                </div>
                {/* TRIVIA - Highlighted with animation */}
                <Link
                  to="/timeline"
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-50 ${
                    isActive('/timeline') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <Calendar className="h-4 w-4 text-neutral-400" />
                  <EditableText copyKey="nav.weekly_timeline" as="span" className="font-medium">{getCopy('nav.weekly_timeline', 'Weekly Timeline')}</EditableText>
                </Link>
              </DesktopDropdown>

              {/* Help Dropdown */}
              <DesktopDropdown 
                label={getCopy('nav.help', 'Help')} 
                dropdownKey="help"
                isActiveCheck={isActive('/how-to-play') || isActive('/scoring') || isActive('/faq') || isActive('/contact')}
              >
                <Link
                  to="/how-to-play"
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-50 ${
                    isActive('/how-to-play') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <BookOpen className="h-4 w-4 text-neutral-400" />
                  <EditableText copyKey="nav.how_to_play" as="span" className="font-medium">{getCopy('nav.how_to_play', 'How to Play')}</EditableText>
                </Link>
                <Link
                  to="/scoring-rules"
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-50 ${
                    isActive('/scoring') || isActive('/scoring-rules') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <Trophy className="h-4 w-4 text-neutral-400" />
                  <EditableText copyKey="nav.scoring_rules" as="span" className="font-medium">{getCopy('nav.scoring_rules', 'Sample Scoring Rules')}</EditableText>
                </Link>
                <Link
                  to="/faq"
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-50 ${
                    isActive('/faq') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <HelpCircle className="h-4 w-4 text-neutral-400" />
                  <EditableText copyKey="nav.faq" as="span" className="font-medium">{getCopy('nav.faq', 'FAQ')}</EditableText>
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-50 ${
                    isActive('/contact') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <Mail className="h-4 w-4 text-neutral-400" />
                  <EditableText copyKey="nav.contact_us" as="span" className="font-medium">{getCopy('nav.contact_us', 'Contact Us')}</EditableText>
                </Link>
              </DesktopDropdown>
            </div>

            {/* Right side: Admin + User Menu */}
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-neutral-600 hover:text-burgundy-600"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              {/* Admin link */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="hidden sm:flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}

              {/* User Avatar Dropdown - Desktop */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => toggleDropdown('user')}
                  className="flex items-center gap-2 p-1 pr-2 text-neutral-600 hover:bg-neutral-50 rounded-full transition-all"
                  aria-haspopup="true"
                >
                  <div className="w-9 h-9 bg-burgundy-500 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(displayName) || '?'
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${openDropdown === 'user' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'user' && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-200"
                    role="menu"
                  >
                    <div className="p-4 border-b border-neutral-100">
                      <p className="font-semibold text-neutral-800">{displayName || 'Survivor'}</p>
                      <p className="text-sm text-neutral-400">
                        <EditableText copyKey="nav.user_role" as="span" className="">{getCopy('nav.user_role', 'Fantasy Player')}</EditableText>
                      </p>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/profile"
                        onClick={() => setOpenDropdown(null)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 rounded-lg"
                        role="menuitem"
                      >
                        <User className="h-4 w-4 text-neutral-400" />
                        <EditableText copyKey="nav.profile" as="span" className="">{getCopy('nav.profile', 'Profile')}</EditableText>
                      </Link>
                      <Link
                        to="/profile/settings"
                        onClick={() => setOpenDropdown(null)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 rounded-lg"
                        role="menuitem"
                      >
                        <Settings className="h-4 w-4 text-neutral-400" />
                        <EditableText copyKey="nav.settings" as="span" className="">{getCopy('nav.settings', 'Settings')}</EditableText>
                      </Link>
                      <hr className="my-2 border-neutral-100" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        <EditableText copyKey="nav.logout" as="span" className="">{getCopy('nav.logout', 'Logout')}</EditableText>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div
              ref={mobileMenuRef}
              className="lg:hidden border-t border-neutral-100 py-2 bg-white max-h-[calc(100vh-4rem)] overflow-y-auto"
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-burgundy-500 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(displayName) || '?'
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-800">{displayName || 'Survivor'}</p>
                    <p className="text-sm text-neutral-400">
                      <EditableText copyKey="nav.user_role" as="span" className="">{getCopy('nav.user_role', 'Fantasy Player')}</EditableText>
                    </p>
                  </div>
                </div>
              </div>

              {/* Dashboard */}
              <Link
                to="/dashboard"
                className={`block px-4 py-3 text-sm font-semibold uppercase tracking-wide border-b border-neutral-100 ${
                  isActive('/dashboard') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                }`}
              >
                <EditableText copyKey="nav.dashboard" as="span" className="">{getCopy('nav.dashboard', 'Dashboard')}</EditableText>
              </Link>

              {/* Play Accordion */}
              <MobileAccordion label={getCopy('nav.play', 'Play')} accordionKey="play">
                <Link
                  to="/leagues"
                  className={`block px-8 py-2.5 text-sm ${
                    location.pathname === '/leagues' ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <EditableText copyKey="nav.my_leagues" as="span" className="">{getCopy('nav.my_leagues', 'My Leagues')}</EditableText>
                </Link>
                <Link
                  to="/leagues?view=all"
                  className="block px-8 py-2.5 text-sm text-neutral-600"
                >
                  <EditableText copyKey="nav.all_leagues" as="span" className="">{getCopy('nav.all_leagues', 'All Leagues')}</EditableText>
                </Link>
                <Link
                  to="/draft/rankings"
                  className={`block px-8 py-2.5 text-sm ${
                    isActive('/draft/rankings') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <EditableText copyKey="nav.draft_rankings" as="span" className="">{getCopy('nav.draft_rankings', 'Draft Rankings')}</EditableText>
                </Link>
                <Link
                  to="/trivia"
                  className="flex items-center gap-2 px-8 py-2.5 text-sm text-teal-600 font-medium"
                >
                  <Star className="h-4 w-4 text-teal-500 fill-teal-500" />
                  <EditableText copyKey="nav.trivia" as="span" className="">{getCopy('nav.trivia', 'Trivia')}</EditableText>
                  <span className="bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    <EditableText copyKey="nav.trivia_badge" as="span" className="">{getCopy('nav.trivia_badge', 'NEW')}</EditableText>
                  </span>
                </Link>
              </MobileAccordion>

              {/* Season Accordion */}
              <MobileAccordion label={getCopy('nav.season', 'Season')} accordionKey="season">
                <Link
                  to="/castaways"
                  className={`block px-8 py-2.5 text-sm ${
                    isActive('/castaways') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <EditableText copyKey="nav.castaways" as="span" className="">{getCopy('nav.castaways', 'Castaways')}</EditableText>
                </Link>
                <Link
                  to="/leaderboard"
                  className={`block px-8 py-2.5 text-sm ${
                    isActive('/leaderboard') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <EditableText copyKey="nav.leaderboard" as="span" className="">{getCopy('nav.leaderboard', 'Leaderboard')}</EditableText>
                </Link>
                <div>
                  <div className="px-4 py-2 text-sm font-semibold text-neutral-800 uppercase tracking-wide">
                    <EditableText copyKey="nav.how_to_play" as="span" className="">{getCopy('nav.how_to_play', 'How to Play')}</EditableText>
                  </div>
                  <Link
                    to="/how-to-play"
                    className={`block px-8 py-2 text-sm ${
                      isActive('/how-to-play') && !isActive('/scoring') && !isActive('/timeline')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600'
                    }`}
                  >
                    <EditableText copyKey="nav.overview" as="span" className="">{getCopy('nav.overview', 'Overview')}</EditableText>
                  </Link>
                  <Link
                    to="/scoring-rules"
                    className={`block px-8 py-2 text-sm ${
                      isActive('/scoring') || isActive('/scoring-rules')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600'
                    }`}
                  >
                    <EditableText copyKey="nav.scoring_rules" as="span" className="">{getCopy('nav.scoring_rules', 'Sample Scoring Rules')}</EditableText>
                  </Link>
                  <Link
                    to="/timeline"
                    className={`block px-8 py-2 text-sm ${
                      isActive('/timeline')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600'
                    }`}
                  >
                    <EditableText copyKey="nav.weekly_timeline" as="span" className="">{getCopy('nav.weekly_timeline', 'Weekly Timeline')}</EditableText>
                  </Link>
                  <Link
                    to="/sms-commands"
                    className={`block px-8 py-2 text-sm ${
                      isActive('/sms-commands')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600'
                    }`}
                  >
                    <EditableText copyKey="nav.sms_commands" as="span" className="">{getCopy('nav.sms_commands', 'SMS Commands')}</EditableText>
                  </Link>
                </div>
                <div>
                  <div className="px-4 py-2 text-sm font-semibold text-neutral-800 uppercase tracking-wide">
                    <EditableText copyKey="nav.contact" as="span" className="">{getCopy('nav.contact', 'Contact')}</EditableText>
                  </div>
                  <Link
                    to="/contact"
                    className={`block px-8 py-2 text-sm ${
                      isActive('/contact') && !isActive('/faq')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600'
                    }`}
                  >
                    <EditableText copyKey="nav.contact_us" as="span" className="">{getCopy('nav.contact_us', 'Contact Us')}</EditableText>
                  </Link>
                  <Link
                    to="/faq"
                    className={`block px-8 py-2 text-sm ${
                      isActive('/faq')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600'
                    }`}
                  >
                    <EditableText copyKey="nav.faq" as="span" className="">{getCopy('nav.faq', 'FAQ')}</EditableText>
                  </Link>
                </div>
                {/* Admin link for mobile */}
                {isAdmin && (
                  <>
                    <hr className="my-2 border-burgundy-100" />
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-orange-600 bg-orange-50"
                    >
                      <Shield className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  </>
                )}
                <hr className="my-2 border-burgundy-100" />
                <Link to="/profile" className="block px-4 py-3 text-sm text-neutral-600">
                  <EditableText copyKey="nav.profile_settings" as="span" className="">{getCopy('nav.profile_settings', 'Profile Settings')}</EditableText>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 font-semibold"
                >
                  <LogOut className="h-4 w-4" />
                  <EditableText copyKey="nav.logout" as="span" className="">{getCopy('nav.logout', 'Logout')}</EditableText>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    );
  }

  // Loading state
  if (loading) {
    return (
      <nav className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex-shrink-0">
              <img src="/logo.png" alt="RGFL" className="h-10 w-auto" />
            </Link>
            <div className="w-24" />
          </div>
        </div>
      </nav>
    );
  }

  // Public/unauthenticated navigation
  return (
    <nav ref={navRef} className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img src="/logo.png" alt="RGFL" className="h-10 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === '/'
                  ? 'text-burgundy-600 bg-burgundy-50'
                  : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
              }`}
            >
              <EditableText copyKey="nav.home" as="span" className="">{getCopy('nav.home', 'Home')}</EditableText>
            </Link>
            <Link
              to="/how-to-play"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/how-to-play')
                  ? 'text-burgundy-600 bg-burgundy-50'
                  : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
              }`}
            >
              <EditableText copyKey="nav.how_to_play" as="span" className="">{getCopy('nav.how_to_play', 'How to Play')}</EditableText>
            </Link>
            <Link
              to="/scoring-rules"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/scoring-rules') || isActive('/scoring')
                  ? 'text-burgundy-600 bg-burgundy-50'
                  : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
              }`}
            >
              <EditableText copyKey="nav.scoring_rules" as="span" className="">{getCopy('nav.scoring_rules', 'Sample Scoring Rules')}</EditableText>
            </Link>
          </div>

          {/* Right: Login + Sign Up */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-600 hover:text-burgundy-600"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link
              to="/login"
              className="hidden sm:block text-neutral-600 hover:text-burgundy-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <EditableText copyKey="nav.login" as="span" className="">{getCopy('nav.login', 'Login')}</EditableText>
            </Link>
            <Link
              to="/signup"
              className="bg-burgundy-500 hover:bg-burgundy-600 text-white font-semibold text-sm px-5 py-2 rounded-full transition-colors shadow-sm"
            >
              <EditableText copyKey="nav.signup_free" as="span" className="">{getCopy('nav.signup_free', 'Sign Up Free')}</EditableText>
            </Link>
          </div>
        </div>

        {/* Mobile Menu - Public */}
        {mobileMenuOpen && (
          <div ref={mobileMenuRef} className="md:hidden border-t border-neutral-100 py-2 bg-white">
            <Link
              to="/"
              className={`block px-4 py-3 text-sm font-medium rounded-lg mx-2 ${
                location.pathname === '/'
                  ? 'text-burgundy-600 bg-burgundy-50'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <EditableText copyKey="nav.home" as="span" className="">{getCopy('nav.home', 'Home')}</EditableText>
            </Link>
            <Link
              to="/how-to-play"
              className={`block px-4 py-3 text-sm font-medium rounded-lg mx-2 ${
                isActive('/how-to-play')
                  ? 'text-burgundy-600 bg-burgundy-50'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <EditableText copyKey="nav.how_to_play" as="span" className="">{getCopy('nav.how_to_play', 'How to Play')}</EditableText>
            </Link>
            <Link
              to="/scoring-rules"
              className={`block px-4 py-3 text-sm font-medium rounded-lg mx-2 ${
                isActive('/scoring-rules') || isActive('/scoring')
                  ? 'text-burgundy-600 bg-burgundy-50'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <EditableText copyKey="nav.scoring_rules" as="span" className="">{getCopy('nav.scoring_rules', 'Sample Scoring Rules')}</EditableText>
            </Link>
            <Link
              to="/contact"
              className={`block px-4 py-3 text-sm font-medium rounded-lg mx-2 ${
                isActive('/contact') && !isActive('/faq')
                  ? 'text-burgundy-600 bg-burgundy-50'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <EditableText copyKey="nav.contact_us" as="span" className="">{getCopy('nav.contact_us', 'Contact Us')}</EditableText>
            </Link>
            <Link
              to="/faq"
              className={`block px-4 py-3 text-sm font-medium rounded-lg mx-2 ${
                isActive('/faq')
                  ? 'text-burgundy-600 bg-burgundy-50'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <EditableText copyKey="nav.faq" as="span" className="">{getCopy('nav.faq', 'FAQ')}</EditableText>
            </Link>
            <Link
              to="/contact"
              className={`block px-4 py-3 text-sm font-medium rounded-lg mx-2 ${
                isActive('/contact')
                  ? 'text-burgundy-600 bg-burgundy-50'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <EditableText copyKey="nav.contact_us" as="span" className="">{getCopy('nav.contact_us', 'Contact Us')}</EditableText>
            </Link>
            <hr className="my-2 border-neutral-100 mx-4" />
            <Link to="/login" className="block px-4 py-3 text-sm font-medium text-neutral-600 mx-2">
              <EditableText copyKey="nav.login" as="span" className="">{getCopy('nav.login', 'Login')}</EditableText>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
