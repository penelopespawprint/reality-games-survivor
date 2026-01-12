import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { Shield, Menu, X, ChevronDown, Lightbulb, Mail, HelpCircle } from 'lucide-react';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';

interface UserProfile {
  id: string;
  display_name: string;
  role: 'player' | 'commissioner' | 'admin';
}

export function Navigation() {
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const { getCopy } = useSiteCopy();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [leaguesOpen, setLeaguesOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const howToPlayRef = useRef<HTMLDivElement>(null);
  const leaguesRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (howToPlayRef.current && !howToPlayRef.current.contains(event.target as Node)) {
        setHowToPlayOpen(false);
      }
      if (leaguesRef.current && !leaguesRef.current.contains(event.target as Node)) {
        setLeaguesOpen(false);
      }
      if (contactRef.current && !contactRef.current.contains(event.target as Node)) {
        setContactOpen(false);
      }
    };
    if (mobileMenuOpen || howToPlayOpen || leaguesOpen || contactOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen, howToPlayOpen, leaguesOpen, contactOpen]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setMobileMenuOpen(false);
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      // Force clear local state even if API fails
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

  // Get display name with fallbacks: profile -> user metadata -> email prefix
  const displayName =
    profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';

  // Get initials from display name
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

  // Authenticated player navigation - clean horizontal layout
  // Admin sub-nav appears underneath when in admin mode
  if (user) {
    return (
      <>
        <nav
          className={`bg-white border-b ${isAdmin ? 'border-orange-300' : 'border-neutral-200'} shadow-sm sticky top-0 z-50`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo only - no text */}
              <Link to="/dashboard" className="flex-shrink-0">
                <img src="/logo.png" alt="RGFL" className="h-10 w-auto" />
              </Link>

              {/* Center Nav Links - clean horizontal style */}
              <div className="hidden lg:flex items-center gap-1">
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
                <div className="relative" ref={leaguesRef}>
                  <button
                    onClick={() => setLeaguesOpen(!leaguesOpen)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                      isActive('/leagues') || isActive('/my-leagues')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
                    }`}
                  >
                    <EditableText copyKey="nav.leagues" as="span" className="">{getCopy('nav.leagues', 'Leagues')}</EditableText>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${leaguesOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {leaguesOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-neutral-200 min-w-[180px] z-50 py-1">
                      <Link
                        to="/leagues"
                        onClick={() => setLeaguesOpen(false)}
                        className={`block px-4 py-2 text-sm hover:bg-neutral-50 ${
                          isActive('/leagues') && !isActive('/draft/rankings')
                            ? 'text-burgundy-600 bg-burgundy-50'
                            : 'text-neutral-600'
                        }`}
                      >
                        <EditableText copyKey="nav.all_leagues" as="span" className="">{getCopy('nav.all_leagues', 'All Leagues')}</EditableText>
                      </Link>
                      <Link
                        to="/draft/rankings"
                        onClick={() => setLeaguesOpen(false)}
                        className={`block px-4 py-2 text-sm hover:bg-neutral-50 ${
                          isActive('/draft/rankings')
                            ? 'text-burgundy-600 bg-burgundy-50'
                            : 'text-neutral-600'
                        }`}
                      >
                        <EditableText copyKey="nav.draft_rankings" as="span" className="">{getCopy('nav.draft_rankings', 'Draft Rankings')}</EditableText>
                      </Link>
                    </div>
                  )}
                </div>
                <Link
                  to="/castaways"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/castaways')
                      ? 'text-burgundy-600 bg-burgundy-50'
                      : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
                  }`}
                >
                  <EditableText copyKey="nav.castaways" as="span" className="">{getCopy('nav.castaways', 'Castaways')}</EditableText>
                </Link>
                <Link
                  to="/leaderboard"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/leaderboard')
                      ? 'text-burgundy-600 bg-burgundy-50'
                      : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
                  }`}
                >
                  <EditableText copyKey="nav.leaderboard" as="span" className="">{getCopy('nav.leaderboard', 'Leaderboard')}</EditableText>
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
                        <EditableText copyKey="nav.scoring_rules" as="span" className="">{getCopy('nav.scoring_rules', 'Scoring Rules')}</EditableText>
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
                  to="/trivia"
                  className="trivia-pulse ml-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-full text-sm flex items-center gap-2 hover:from-teal-600 hover:to-teal-700 transition-all shadow-md"
                >
                  <Lightbulb className="w-4 h-4" />
                  <EditableText copyKey="nav.trivia" as="span" className="">{getCopy('nav.trivia', 'Trivia')}</EditableText>
                  <span className="bg-white/25 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <EditableText copyKey="nav.trivia_badge" as="span" className="">{getCopy('nav.trivia_badge', 'NEW')}</EditableText>
                  </span>
                </Link>
              </div>

              {/* Right: User Menu */}
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

                {/* Admin link (only for admins) */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </Link>
                )}

                {/* User Menu - Desktop */}
                <div className="relative group hidden md:flex items-center">
                  <button
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
                    <span className="text-neutral-700 text-sm font-medium max-w-[100px] truncate">
                      {displayName?.split(' ')[0] || 'Player'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  </button>
                  <div
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all"
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
                        className="block px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 rounded-lg"
                        role="menuitem"
                      >
                        <EditableText copyKey="nav.profile_settings" as="span" className="">{getCopy('nav.profile_settings', 'Profile Settings')}</EditableText>
                      </Link>
                      <Link
                        to="/profile/payments"
                        className="block px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 rounded-lg"
                        role="menuitem"
                      >
                        <EditableText copyKey="nav.payment_history" as="span" className="">{getCopy('nav.payment_history', 'Payment History')}</EditableText>
                      </Link>
                      {/* SMS Notifications - Coming Soon */}
                      <div className="px-3 py-2 text-sm text-neutral-400 flex items-center justify-between rounded-lg">
                        <span><EditableText copyKey="nav.sms_notifications" as="span" className="">{getCopy('nav.sms_notifications', 'SMS Notifications')}</EditableText></span>
                        <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
                          <EditableText copyKey="nav.coming_soon" as="span" className="">{getCopy('nav.coming_soon', 'Coming Soon')}</EditableText>
                        </span>
                      </div>
                      <hr className="my-2 border-neutral-100" />
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        role="menuitem"
                      >
                        <EditableText copyKey="nav.sign_out" as="span" className="">{getCopy('nav.sign_out', 'Sign out')}</EditableText>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Menu - Player */}
            {mobileMenuOpen && (
              <div
                ref={mobileMenuRef}
                className="lg:hidden border-t border-burgundy-100 py-2 bg-white"
              >
                <div className="px-4 py-3 border-b border-burgundy-100">
                  <p className="font-semibold text-neutral-800">{displayName || 'Survivor'}</p>
                  <p className="text-sm text-neutral-400">
                    <EditableText copyKey="nav.user_role" as="span" className="">{getCopy('nav.user_role', 'Fantasy Player')}</EditableText>
                  </p>
                </div>

                {/* Trivia - Highlighted on Mobile */}
                <Link
                  to="/trivia"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mx-4 mt-3 mb-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  <Lightbulb className="w-5 h-5" />
                  <EditableText copyKey="nav.play_trivia" as="span" className="">{getCopy('nav.play_trivia', 'Play Trivia')}</EditableText>
                  <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                    <EditableText copyKey="nav.trivia_badge" as="span" className="">{getCopy('nav.trivia_badge', 'NEW')}</EditableText>
                  </span>
                </Link>

                <Link
                  to="/dashboard"
                  className={`block px-4 py-3 text-sm font-semibold uppercase tracking-wide ${
                    isActive('/dashboard') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                  }`}
                >
                  <EditableText copyKey="nav.dashboard" as="span" className="">{getCopy('nav.dashboard', 'Dashboard')}</EditableText>
                </Link>
                <div>
                  <div className="px-4 py-2 text-sm font-semibold text-neutral-800 uppercase tracking-wide">
                    <EditableText copyKey="nav.leagues" as="span" className="">{getCopy('nav.leagues', 'Leagues')}</EditableText>
                  </div>
                  <Link
                    to="/leagues"
                    className={`block px-8 py-2 text-sm ${
                      isActive('/leagues') && !isActive('/draft/rankings')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600'
                    }`}
                  >
                    <EditableText copyKey="nav.all_leagues" as="span" className="">{getCopy('nav.all_leagues', 'All Leagues')}</EditableText>
                  </Link>
                  <Link
                    to="/draft/rankings"
                    className={`block px-8 py-2 text-sm ${
                      isActive('/draft/rankings')
                        ? 'text-burgundy-600 bg-burgundy-50'
                        : 'text-neutral-600'
                    }`}
                  >
                    <EditableText copyKey="nav.draft_rankings" as="span" className="">{getCopy('nav.draft_rankings', 'Draft Rankings')}</EditableText>
                  </Link>
                </div>
                <Link
                  to="/castaways"
                  className={`block px-4 py-3 text-sm font-semibold uppercase tracking-wide ${
                    isActive('/castaways')
                      ? 'text-burgundy-600 bg-burgundy-50'
                      : 'text-neutral-600'
                  }`}
                >
                  <EditableText copyKey="nav.castaways" as="span" className="">{getCopy('nav.castaways', 'Castaways')}</EditableText>
                </Link>
                <Link
                  to="/leaderboard"
                  className={`block px-4 py-3 text-sm font-semibold uppercase tracking-wide ${
                    isActive('/leaderboard')
                      ? 'text-burgundy-600 bg-burgundy-50'
                      : 'text-neutral-600'
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
                    <EditableText copyKey="nav.scoring_rules" as="span" className="">{getCopy('nav.scoring_rules', 'Scoring Rules')}</EditableText>
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
                {/* SMS Notifications - Coming Soon */}
                <div className="px-4 py-3 text-sm text-neutral-400 flex items-center justify-between">
                  <span><EditableText copyKey="nav.sms_notifications" as="span" className="">{getCopy('nav.sms_notifications', 'SMS Notifications')}</EditableText></span>
                  <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
                    <EditableText copyKey="nav.coming_soon" as="span" className="">{getCopy('nav.coming_soon', 'Coming Soon')}</EditableText>
                  </span>
                </div>
                <hr className="my-2 border-burgundy-100" />
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 font-semibold"
                >
                  <EditableText copyKey="nav.sign_out" as="span" className="">{getCopy('nav.sign_out', 'Sign out')}</EditableText>
                </button>
              </div>
            )}
          </div>
        </nav>
      </>
    );
  }

  // While auth is loading, show a minimal nav to prevent flash of logged-out state
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

  // Public/unauthenticated navigation - clean horizontal layout
  return (
    <nav className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo only */}
          <Link to="/" className="flex-shrink-0">
            <img src="/logo.png" alt="RGFL" className="h-10 w-auto" />
          </Link>

          {/* Center Nav Links */}
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
              <EditableText copyKey="nav.scoring_rules" as="span" className="">{getCopy('nav.scoring_rules', 'Scoring Rules')}</EditableText>
            </Link>
            <div className="relative group">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  isActive('/contact') || isActive('/faq')
                    ? 'text-burgundy-600 bg-burgundy-50'
                    : 'text-neutral-600 hover:text-burgundy-600 hover:bg-neutral-50'
                }`}
              >
                <EditableText copyKey="nav.contact" as="span" className="">{getCopy('nav.contact', 'Contact')}</EditableText>
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-neutral-200 min-w-[160px] z-50 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link
                  to="/contact"
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
            </div>
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
              <EditableText copyKey="nav.scoring_rules" as="span" className="">{getCopy('nav.scoring_rules', 'Scoring Rules')}</EditableText>
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
