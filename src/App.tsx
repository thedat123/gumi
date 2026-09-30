import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Loading } from './components/Loading';
import { RequireAdmin, RequireAuth, RequireProfile, RequireToday } from './app/guards';
import { SessionProvider } from './app/session';
import { SkinProvider } from './app/skin';
import { SystemState } from './pages/SystemState'; // nhẹ + guards đã import sẵn → giữ tĩnh, không tách chunk

// Mỗi trang thành một chunk riêng: màn đầu (login/landing) không còn kéo theo toàn bộ app.
// Trang nặng (Phòng 3D, minigame, Admin) chỉ tải khi người dùng thật sự vào.
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const ChapterIntro = lazy(() => import('./pages/ChapterIntro').then((m) => ({ default: m.ChapterIntro })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const GumiRoom = lazy(() => import('./pages/GumiRoom').then((m) => ({ default: m.GumiRoom })));
const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));
const Leaderboard = lazy(() => import('./pages/Leaderboard').then((m) => ({ default: m.Leaderboard })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const MissionRouter = lazy(() => import('./pages/MissionRouter').then((m) => ({ default: m.MissionRouter })));
const Onboarding = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Signup = lazy(() => import('./pages/Signup').then((m) => ({ default: m.Signup })));
const Summary = lazy(() => import('./pages/Summary').then((m) => ({ default: m.Summary })));
const Terms = lazy(() => import('./pages/Terms').then((m) => ({ default: m.Terms })));

export function App() {
  return (
    <SessionProvider>
      <SkinProvider>
      <Routes>
        {/* Admin: shell riêng (dashboard), KHÔNG dùng AppShell game của người chơi. */}
        <Route path="admin" element={<RequireAdmin><Suspense fallback={<Loading />}><Admin /></Suspense></RequireAdmin>} />
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
          {/* 404 */}
          <Route path="*" element={<SystemState fixed="not_found" />} />
        </Route>
      </Routes>
      </SkinProvider>
    </SessionProvider>
  );
}
