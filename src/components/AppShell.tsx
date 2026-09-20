import { NavLink, Outlet } from 'react-router-dom';
import { vi } from '../content/vi';
import { useSession } from '../app/session';

/**
 * Vỏ ứng dụng responsive:
 * - Desktop (lg+) khi đã đăng nhập: sidebar trái cố định + cột nội dung căn giữa.
 * - Desktop khi chưa đăng nhập: thanh trên có logo + nút đăng nhập/đăng ký (trang giới thiệu chạy rộng).
 * - Mobile: header dính trên + thanh điều hướng dạng viên thuốc nổi ở dưới.
 */
export function AppShell() {
  const { profile, session, signOut } = useSession();
  const isAdmin = profile?.role === 'admin';

  const items = [
    { to: '/', end: true, label: vi.nav.home, icon: '🗺️' },
    { to: '/leaderboard', end: false, label: vi.nav.leaderboard, icon: '🏆' },
    ...(isAdmin ? [{ to: '/admin', end: false, label: vi.nav.admin, icon: '🛡️' }] : []),
  ];
  const sideLink = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-3 rounded-control px-3 text-body font-semibold transition-colors ${isActive ? 'bg-primary text-on-primary shadow-pop' : 'text-muted hover:bg-pink/15 hover:text-primary'}`;
  const barLink = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 flex-1 items-center justify-center rounded-control px-2 text-small font-semibold transition-colors ${isActive ? 'bg-primary text-on-primary shadow-pop' : 'text-muted'}`;

  return (
    <div className={`min-h-dvh ${session ? 'lg:grid lg:grid-cols-[264px_1fr]' : ''}`}>
      {session && (
        <aside className="hidden border-r border-border bg-surface/70 backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-1 lg:p-4">
          <div className="flex items-center gap-2 px-2 pb-3 pt-1">
            <span aria-hidden="true" className="grad-brand flex h-9 w-9 items-center justify-center rounded-pill text-body shadow-pop">🐱</span>
            <span className="text-gradient text-title font-bold leading-tight">{vi.app.name}</span>
          </div>
          <nav className="flex flex-col gap-1" aria-label="Điều hướng chính">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={sideLink}>
                <span aria-hidden="true">{i.icon}</span>{i.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1" />
          {profile && (
            <div className="rounded-card border border-border bg-surface p-3 shadow-soft">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-pill bg-gumi-belly text-title">{profile.avatar}</span>
                <div className="min-w-0">
                  <p className="truncate text-small font-bold">{profile.name}</p>
                  <p className="truncate text-caption text-muted">{session.email}</p>
                </div>
              </div>
              <button onClick={() => signOut()} className="mt-2 min-h-11 w-full rounded-control border-2 border-border-strong text-small font-semibold">{vi.common.logout}</button>
            </div>
          )}
        </aside>
      )}

      <div className="flex min-h-dvh flex-col">
        {/* Header mobile */}
        <header className="safe-top sticky top-0 z-20 flex items-center justify-between gap-2 bg-bg/80 px-4 pb-2 pt-3 backdrop-blur lg:hidden">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="grad-brand flex h-8 w-8 items-center justify-center rounded-pill text-small shadow-pop">🐱</span>
            <span className="text-gradient text-title font-bold">{vi.app.name}</span>
          </span>
          {session ? (
            <button onClick={() => signOut()} className="min-h-11 rounded-pill px-3 text-caption font-semibold text-muted">{vi.common.logout}</button>
          ) : (
            <span className="text-caption text-muted">{vi.app.tagline}</span>
          )}
        </header>

        {/* Thanh trên desktop cho trang công khai */}
        {!session && (
          <header className="safe-top sticky top-0 z-20 hidden items-center justify-between bg-bg/80 px-8 py-4 backdrop-blur lg:flex">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="grad-brand flex h-9 w-9 items-center justify-center rounded-pill text-body shadow-pop">🐱</span>
              <span className="text-gradient text-title font-bold">{vi.app.name}</span>
            </span>
            <div className="flex items-center gap-2">
              <NavLink to="/login" className="inline-flex min-h-11 items-center rounded-control px-4 text-small font-semibold text-primary">{vi.auth.login}</NavLink>
              <NavLink to="/signup" className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 text-small font-semibold text-on-primary shadow-pop">{vi.signup.title}</NavLink>
            </div>
          </header>
        )}

        <main className="flex-1 px-4 pb-28 pt-1 lg:px-8 lg:pb-10 lg:pt-6">
          <div className={`mx-auto w-full ${session ? 'max-w-2xl' : 'max-w-5xl'}`}>
            <Outlet />
          </div>
        </main>

        {/* Thanh điều hướng dưới (mobile) */}
        {session && (
          <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4 pb-3 lg:hidden" aria-label="Điều hướng chính">
            <div className="flex gap-1 rounded-pill border border-border bg-surface/95 p-1.5 shadow-soft backdrop-blur">
              {items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className={barLink}>{i.label}</NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
