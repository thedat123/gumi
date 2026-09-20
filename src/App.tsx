import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireAdmin, RequireAuth, RequireProfile } from './app/guards';
import { SessionProvider } from './app/session';
import { Admin } from './pages/Admin';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { Leaderboard } from './pages/Leaderboard';
import { Login } from './pages/Login';
import { MissionRouter } from './pages/MissionRouter';
import { Onboarding } from './pages/Onboarding';
import { Profile } from './pages/Profile';
import { Signup } from './pages/Signup';
import { Summary } from './pages/Summary';
import { SystemState } from './pages/SystemState';
import { Terms } from './pages/Terms';

export function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route element={<AppShell />}>
          {/* Công khai */}
          <Route path="welcome" element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="terms" element={<Terms />} />
          {/* Đã đăng nhập, chưa cần hồ sơ */}
          <Route path="onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          {/* Cần hồ sơ */}
          <Route index element={<RequireProfile><Dashboard /></RequireProfile>} />
          <Route path="mission/:day" element={<RequireProfile><MissionRouter /></RequireProfile>} />
          <Route path="leaderboard" element={<RequireProfile><Leaderboard /></RequireProfile>} />
          <Route path="summary" element={<RequireProfile><Summary /></RequireProfile>} />
          <Route path="me" element={<RequireProfile><Profile /></RequireProfile>} />
          {/* Admin */}
          <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          {/* 404 */}
          <Route path="*" element={<SystemState fixed="not_found" />} />
        </Route>
      </Routes>
    </SessionProvider>
  );
}
