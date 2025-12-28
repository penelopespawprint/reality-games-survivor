import React, { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LeagueProvider } from "@/context/LeagueContext";
import { AdminLeagueProvider } from "@/context/AdminLeagueContext";
import UserLayout from "@/components/layouts/UserLayout";
import AdminLayout from "@/components/layouts/AdminLayout";
import Navigation from "@/components/Navigation";
import Splash from "@/pages/Splash";
import Season50Waitlist from "@/pages/Season50Waitlist";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Auth0Callback from "@/pages/Auth0Callback";
import Dashboard from "@/pages/Dashboard";
import UserProfile from "@/pages/UserProfile";
import Profile from "@/pages/Profile";
import PhoneSettings from "@/pages/PhoneSettings";
import WeeklyPicks from "@/pages/WeeklyPicks";
import WeeklyResults from "@/pages/WeeklyResults";
import DraftResults from "@/pages/DraftResults";
import PreseasonRank from "@/pages/PreseasonRank";
import Leaderboard from "@/pages/Leaderboard";
import CastawayProfile from "@/pages/CastawayProfile";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";

// Admin pages - lazy loaded for code splitting
// These are only loaded when an admin navigates to admin routes
const LeagueAnalytics = lazy(() => import("@/pages/admin/LeagueAnalytics"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const CastawayManager = lazy(() => import("@/pages/admin/CastawayManager"));
const UserManager = lazy(() => import("@/pages/admin/UserManager"));
const PicksManager = lazy(() => import("@/pages/admin/PicksManager"));
const PointsManager = lazy(() => import("@/pages/admin/PointsManager"));
const StatsDashboard = lazy(() => import("@/pages/admin/StatsDashboard"));
const HeadToHeadComparison = lazy(() => import("@/pages/admin/HeadToHeadComparison"));
const Feedback = lazy(() => import("@/pages/admin/Feedback"));
const SmsManager = lazy(() => import("@/pages/admin/SmsManager"));
const ScoringDashboard = lazy(() => import("@/pages/admin/ScoringDashboard"));

// Admin loading fallback
const AdminLoading = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="text-gray-500">Loading admin panel...</div>
  </div>
);

// Multi-League Pages
import MyLeagues from "@/pages/MyLeagues";
import CreateLeague from "@/pages/CreateLeague";
import JoinLeague from "@/pages/JoinLeague";
import JoinSuccess from "@/pages/JoinSuccess";
import GlobalLeaderboard from "@/pages/GlobalLeaderboard";
import { routes } from "@/shared/routes";
import About from "@/pages/About";
import HowToPlay from "@/pages/HowToPlay";
import Contact from "@/pages/Contact";
import Rules from "@/pages/Rules";
import LeagueOverview from "@/pages/LeagueOverview";
import GameTracker from "@/pages/GameTracker";
import CastawayDetail from "@/pages/CastawayDetail";

const App = () => {
  const { loading } = useAuth();
  const location = useLocation();

  const noLayoutRoutes = new Set<string>([
    routes.root,
    routes.waitlist,
    routes.login,
    routes.signup,
    routes.callback,
    routes.forgotPassword,
    routes.resetPassword
  ]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const needsLayout = !noLayoutRoutes.has(location.pathname);

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  // Routes without any layout
  const renderNoLayoutRoutes = () => (
    <Routes>
      <Route path={routes.root} element={<Splash />} />
      <Route path={routes.waitlist} element={<Season50Waitlist />} />
      <Route path={routes.login} element={<Login />} />
      <Route path={routes.signup} element={<Signup />} />
      <Route path={routes.callback} element={<Auth0Callback />} />
      <Route path={routes.forgotPassword} element={<ForgotPassword />} />
      <Route path={routes.resetPassword} element={<ResetPassword />} />
      <Route path="*" element={null} />
    </Routes>
  );

  // Admin routes with AdminLayout - wrapped in Suspense for code splitting
  const renderAdminRoutes = () => (
    <AdminLayout>
      <Suspense fallback={<AdminLoading />}>
        <Routes>
          <Route path={routes.admin.index} element={<AdminRoute><LeagueAnalytics /></AdminRoute>} />
          <Route path={routes.admin.scoring} element={<AdminRoute><PointsManager /></AdminRoute>} />
          <Route path={routes.admin.picks} element={<AdminRoute><PicksManager /></AdminRoute>} />
          <Route path={routes.admin.castaways} element={<AdminRoute><CastawayManager /></AdminRoute>} />
          <Route path={routes.admin.users} element={<AdminRoute><UserManager /></AdminRoute>} />
          <Route path={routes.admin.stats} element={<AdminRoute><StatsDashboard /></AdminRoute>} />
          <Route path={routes.admin.headToHead} element={<AdminRoute><HeadToHeadComparison /></AdminRoute>} />
          <Route path={routes.admin.feedback} element={<AdminRoute><Feedback /></AdminRoute>} />
          <Route path={routes.admin.sms} element={<AdminRoute><SmsManager /></AdminRoute>} />
          <Route path={routes.admin.scoringDashboard} element={<AdminRoute><ScoringDashboard /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );

  // User routes with UserLayout
  const renderUserRoutes = () => (
    <UserLayout>
      <Routes>
        <Route path={routes.about} element={<About />} />
        <Route path={routes.contact} element={<Contact />} />
        <Route path={routes.rules} element={<Rules />} />
        <Route path={routes.howToPlay} element={<HowToPlay />} />
        <Route path={routes.league} element={<LeagueOverview />} />
        <Route path="/game-tracker" element={<GameTracker />} />
        <Route path="/castaway/:id" element={<CastawayDetail />} />

        <Route path={routes.dashboard} element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path={routes.profile} element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/sms" element={<ProtectedRoute><PhoneSettings /></ProtectedRoute>} />
        <Route path={routes.weeklyPicks} element={<ProtectedRoute><WeeklyPicks /></ProtectedRoute>} />
        <Route path={routes.weeklyResults} element={<ProtectedRoute><WeeklyResults /></ProtectedRoute>} />
        <Route path={routes.draftResults} element={<ProtectedRoute><DraftResults /></ProtectedRoute>} />
        <Route path={routes.preseasonRank} element={<ProtectedRoute><PreseasonRank /></ProtectedRoute>} />
        <Route path={routes.leaderboard} element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />

        {/* Multi-League Routes */}
        <Route path={routes.myLeagues} element={<ProtectedRoute><MyLeagues /></ProtectedRoute>} />
        <Route path={routes.createLeague} element={<ProtectedRoute><CreateLeague /></ProtectedRoute>} />
        <Route path={routes.joinLeague} element={<ProtectedRoute><JoinLeague /></ProtectedRoute>} />
        <Route path={routes.joinSuccess} element={<ProtectedRoute><JoinSuccess /></ProtectedRoute>} />
        <Route path={routes.globalLeaderboard} element={<ProtectedRoute><GlobalLeaderboard /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </UserLayout>
  );

  if (!needsLayout) {
    return <div className="rg-app">{renderNoLayoutRoutes()}</div>;
  }

  if (isAdminRoute) {
    return (
      <AdminLeagueProvider>
        <div className="rg-app">{renderAdminRoutes()}</div>
      </AdminLeagueProvider>
    );
  }

  return (
    <LeagueProvider>
      <div className="rg-app">{renderUserRoutes()}</div>
    </LeagueProvider>
  );
};

export default App;
