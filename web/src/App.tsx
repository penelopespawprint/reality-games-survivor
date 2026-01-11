import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Draft } from './pages/Draft';
import { WeeklyPick } from './pages/WeeklyPick';
import { Leaderboard } from './pages/Leaderboard';
import { NotFound } from './pages/NotFound';
import HowToPlay from './pages/HowToPlay';
import ScoringRules from './pages/ScoringRules';
import WeeklyTimeline from './pages/WeeklyTimeline';
import JoinLeague from './pages/JoinLeague';
import Profile from './pages/Profile';
import ProfileSetup from './pages/ProfileSetup';
import LeagueHome from './pages/LeagueHome';
import MyTeam from './pages/MyTeam';
import EpisodeResults from './pages/EpisodeResults';
import Results from './pages/Results';
import CreateLeague from './pages/CreateLeague';
import LeagueSettings from './pages/LeagueSettings';
import SMSCommands from './pages/SMSCommands';
import SeasonSchedule from './pages/SeasonSchedule';
import SeasonCastaways from './pages/SeasonCastaways';
import PaymentHistory from './pages/PaymentHistory';
import PublicLeaderboard from './pages/PublicLeaderboard';
import GlobalLeaderboard from './pages/GlobalLeaderboard';
import Leagues from './pages/Leagues';
import Castaways from './pages/Castaways';
import CastawayDetail from './pages/CastawayDetail';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import LeagueHistory from './pages/LeagueHistory';
import Notifications from './pages/Notifications';
import DraftSettings from './pages/DraftSettings';
import DraftRankings from './pages/DraftRankings';
import InviteLink from './pages/InviteLink';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Trivia from './pages/Trivia';

// Stats Pages
import { StatsOverview, PlayerStats, CastawayStats, LeagueStats } from './pages/stats';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminCommandCenter } from './pages/admin/AdminCommandCenter';
import { AdminPicks } from './pages/admin/AdminPicks';
import { AdminDrafts } from './pages/admin/AdminDrafts';
import { AdminScoring } from './pages/admin/AdminScoring';
import { AdminCastaways } from './pages/admin/AdminCastaways';
import { AdminSeasons } from './pages/admin/AdminSeasons';
import { AdminEpisodes } from './pages/admin/AdminEpisodes';
import { AdminLeagues } from './pages/admin/AdminLeagues';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminJobs } from './pages/admin/AdminJobs';
import { AdminGlobal } from './pages/admin/AdminGlobal';
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements';
import { AdminScoringRules } from './pages/admin/AdminScoringRules';
import { AdminScoringGrid } from './pages/admin/AdminScoringGrid';
import { AdminEmailQueue } from './pages/admin/AdminEmailQueue';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminSystemHealth } from './pages/admin/AdminSystemHealth';
import { AdminContent } from './pages/admin/AdminContent';
import { AdminCampaigns } from './pages/admin/AdminCampaigns';
import { AdminSocial } from './pages/admin/AdminSocial';
import { AdminErrorBoundary } from './components/AdminErrorBoundary';

// Wrapper to add error boundary to admin pages
const withAdminErrorBoundary = (Component: React.ComponentType) => (
  <AdminErrorBoundary>
    <Component />
  </AdminErrorBoundary>
);

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/register" element={<Signup />} />
            <Route path="/how-to-play" element={<HowToPlay />} />
            <Route path="/scoring" element={<ScoringRules />} />
            <Route path="/scoring-rules" element={<ScoringRules />} />
            <Route path="/timeline" element={<WeeklyTimeline />} />
            <Route path="/sms" element={<SMSCommands />} />
            <Route path="/l/:code" element={<PublicLeaderboard />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/trivia" element={<Trivia />} />
            <Route path="/castaways" element={<Castaways />} />
            <Route path="/castaways/:id" element={<CastawayDetail />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/results/:weekNumber" element={<Results />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              {/* Profile setup - no layout wrapper */}
              <Route path="/profile/setup" element={<ProfileSetup />} />
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/leagues/:leagueId/leaderboard" element={<Leaderboard />} />
                <Route path="/leaderboard" element={<GlobalLeaderboard />} />
                <Route path="/leagues" element={<Leagues />} />
              </Route>
              {/* Full-page protected routes (no Layout wrapper) */}
              <Route path="/join" element={<Navigate to="/signup" replace />} />
              <Route path="/join/:code" element={<JoinLeague />} />
              <Route path="/leagues/create" element={<CreateLeague />} />
              <Route path="/leagues/:id" element={<LeagueHome />} />
              <Route path="/leagues/:leagueId/draft" element={<Draft />} />
              <Route path="/leagues/:leagueId/draft/settings" element={<DraftSettings />} />
              <Route path="/draft/rankings" element={<DraftRankings />} />
              <Route path="/leagues/:leagueId/pick" element={<WeeklyPick />} />
              <Route path="/leagues/:leagueId/team" element={<MyTeam />} />
              <Route path="/leagues/:leagueId/settings" element={<LeagueSettings />} />
              <Route path="/leagues/:leagueId/invite" element={<InviteLink />} />
              <Route path="/leagues/:leagueId/history" element={<LeagueHistory />} />
              <Route path="/leagues/:leagueId/episodes/:episodeId" element={<EpisodeResults />} />
              <Route path="/profile/payments" element={<PaymentHistory />} />
              <Route path="/profile/notifications" element={<Notifications />} />
              <Route path="/seasons/:seasonId/schedule" element={<SeasonSchedule />} />
              <Route path="/seasons/:seasonId/castaways" element={<SeasonCastaways />} />
            </Route>

            {/* Admin routes - require admin role */}
            <Route element={<AdminRoute />}>
              {/* /admin redirects to command-center as the main admin entry point */}
              <Route path="/admin" element={<Navigate to="/admin/command-center" replace />} />
              <Route
                path="/admin/command-center"
                element={withAdminErrorBoundary(AdminCommandCenter)}
              />
              <Route path="/admin/dashboard" element={withAdminErrorBoundary(AdminDashboard)} />
              <Route path="/admin/picks" element={withAdminErrorBoundary(AdminPicks)} />
              <Route path="/admin/drafts" element={withAdminErrorBoundary(AdminDrafts)} />
              <Route path="/admin/scoring" element={withAdminErrorBoundary(AdminScoring)} />
              <Route path="/admin/castaways" element={withAdminErrorBoundary(AdminCastaways)} />
              <Route path="/admin/seasons" element={withAdminErrorBoundary(AdminSeasons)} />
              <Route
                path="/admin/seasons/:seasonId"
                element={withAdminErrorBoundary(AdminSeasons)}
              />
              <Route
                path="/admin/seasons/:seasonId/episodes"
                element={withAdminErrorBoundary(AdminEpisodes)}
              />
              <Route
                path="/admin/seasons/:seasonId/castaways"
                element={withAdminErrorBoundary(AdminCastaways)}
              />
              <Route
                path="/admin/episodes/:episodeId/scoring"
                element={withAdminErrorBoundary(AdminScoring)}
              />
              <Route path="/admin/leagues" element={withAdminErrorBoundary(AdminLeagues)} />
              <Route path="/admin/users" element={withAdminErrorBoundary(AdminUsers)} />
              <Route path="/admin/payments" element={withAdminErrorBoundary(AdminPayments)} />
              <Route path="/admin/jobs" element={withAdminErrorBoundary(AdminJobs)} />
              <Route path="/admin/global" element={withAdminErrorBoundary(AdminGlobal)} />
              <Route
                path="/admin/announcements"
                element={withAdminErrorBoundary(AdminAnnouncements)}
              />
              <Route
                path="/admin/scoring-rules"
                element={withAdminErrorBoundary(AdminScoringRules)}
              />
              <Route
                path="/admin/scoring/grid"
                element={withAdminErrorBoundary(AdminScoringGrid)}
              />
              <Route path="/admin/stats" element={withAdminErrorBoundary(AdminAnalytics)} />
              <Route path="/admin/analytics" element={<Navigate to="/admin/stats" replace />} />
              <Route path="/admin/email-queue" element={withAdminErrorBoundary(AdminEmailQueue)} />
              <Route path="/admin/health" element={withAdminErrorBoundary(AdminSystemHealth)} />
              <Route path="/admin/content" element={withAdminErrorBoundary(AdminContent)} />
              <Route path="/admin/campaigns" element={withAdminErrorBoundary(AdminCampaigns)} />
              <Route path="/admin/social" element={withAdminErrorBoundary(AdminSocial)} />
              {/* Fun Stats (admin only) */}
              <Route path="/admin/fun-stats" element={<StatsOverview />} />
              <Route path="/admin/fun-stats/players" element={<PlayerStats />} />
              <Route path="/admin/fun-stats/castaways" element={<CastawayStats />} />
              <Route path="/admin/fun-stats/leagues" element={<LeagueStats />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
