import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ScenarioProvider } from './mock/ScenarioContext';
import { ChapterFlow } from './pages/ChapterFlow';
import { CheckIn } from './pages/CheckIn';
import { Journey } from './pages/Journey';
import { Leaderboard } from './pages/Leaderboard';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Styleguide } from './pages/Styleguide';

export function App() {
  return (
    <ScenarioProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Journey />} />
          <Route path="chapter/:day" element={<ChapterFlow />} />
          <Route path="login" element={<Login />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="mission/:day" element={<CheckIn />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="styleguide" element={<Styleguide />} />
          <Route path="*" element={<p className="py-10 text-center">Không tìm thấy trang này.</p>} />
        </Route>
      </Routes>
    </ScenarioProvider>
  );
}
