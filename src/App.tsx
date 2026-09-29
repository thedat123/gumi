import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireAdmin, RequireAuth, RequireProfile, RequireToday } from './app/guards';
import { SessionProvider } from './app/session';
import { SkinProvider } from './app/skin';
import { Admin } from './pages/Admin';
import { ChapterIntro } from './pages/ChapterIntro';
import { Dashboard } from './pages/Dashboard';
import { ForgotPassword } from './pages/ForgotPassword';
import { GumiRoom } from './pages/GumiRoom';
import { Landing } from './pages/Landing';
import { Leaderboard } from './pages/Leaderboard';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
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
      <SkinProvider>
      <Routes>
        <Route element={<AppShell />}>
          {/* Công khai */}
          <Route path="welcome" element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="terms" element={<Terms />} />
          {/* Đã đăng nhập, chưa cần hồ sơ */}
          <Route path="onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          {/* Cần hồ sơ */}
          <Route index element={<RequireProfile><GumiRoom /></RequireProfile>} />
          <Route path="journey" element={<RequireProfile><Dashboard /></RequireProfile>} />
          <Route path="chapter/:day" element={<RequireProfile><RequireToday><ChapterIntro /></RequireToday></RequireProfile>} />
          <Route path="mission/:day" element={<RequireProfile><RequireToday><MissionRouter /></RequireToday></RequireProfile>} />
          <Route path="leaderboard" element={<RequireProfile><Leaderboard /></RequireProfile>} />
          <Route path="summary" element={<RequireProfile><Summary /></RequireProfile>} />
          <Route path="me" element={<RequireProfile><Profile /></RequireProfile>} />
          {/* Admin */}
          <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          {/* 404 */}
          <Route path="*" element={<SystemState fixed="not_found" />} />
        </Route>
      </Routes>
      </SkinProvider>
    </SessionProvider>
  );
}
