import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Draft } from './pages/Draft';
import { WeeklyPick } from './pages/WeeklyPick';
import { Leaderboard } from './pages/Leaderboard';
import { ScoringRules } from './pages/ScoringRules';
import { NotFound } from './pages/NotFound';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminScoring } from './pages/admin/AdminScoring';
import { AdminCastaways } from './pages/admin/AdminCastaways';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
          {/* Full-page protected routes (no Layout wrapper) */}
          <Route path="/leagues/:leagueId/draft" element={<Draft />} />
          <Route path="/leagues/:leagueId/pick" element={<WeeklyPick />} />
          <Route path="/leagues/:leagueId/leaderboard" element={<Leaderboard />} />
          <Route path="/rules" element={<ScoringRules />} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/scoring" element={<AdminScoring />} />
          <Route path="/admin/castaways" element={<AdminCastaways />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
