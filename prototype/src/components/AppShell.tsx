import { NavLink, Outlet } from 'react-router-dom';
import { vi } from '../content/vi';
import { DevToolbar } from './DevToolbar';

/** Cột chính hẹp căn giữa (mobile-first). Thanh điều hướng dưới có chừa vùng an toàn. */
export function AppShell() {
  const link = ({ isActive }: { isActive: boolean }) => `flex min-h-11 flex-1 items-center justify-center rounded-control text-small font-semibold ${isActive ? 'bg-primary text-on-primary' : 'text-text'}`;
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      <header className="safe-top flex items-center justify-between px-4 pb-2 pt-3">
        <span className="text-title font-bold">{vi.app.name}</span>
        <span className="text-caption text-muted">{vi.app.tagline}</span>
      </header>
      <main className="flex-1 px-4 pb-40"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-11 z-30 mx-auto flex max-w-md gap-2 border-t border-border bg-surface p-2" aria-label="Điều hướng chính">
        <NavLink to="/" end className={link}>{vi.nav.home}</NavLink>
        <NavLink to="/leaderboard" className={link}>{vi.nav.leaderboard}</NavLink>
      </nav>
      <DevToolbar />
    </div>
  );
}
