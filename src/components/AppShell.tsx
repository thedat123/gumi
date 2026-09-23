import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { vi } from '../content/vi';
import { Icon } from './Icon';
import { useSession } from '../app/session';

/**
 * Vỏ ứng dụng dạng "một cột" giống app điện thoại trên MỌI kích thước màn hình:
 * - Không còn sidebar trái. Nội dung luôn căn giữa trong cột hẹp dễ đọc.
 * - Màn chính (Phòng Gumi) hiện thẳng nhân vật, chiếm trọn khung, tự có dock riêng.
 * - Các trang khác dùng thanh điều hướng dạng viên thuốc nổi ở dưới.
 */
export function AppShell() {
  const { profile, session, signOut } = useSession();
  const isAdmin = profile?.role === 'admin';
  const { pathname } = useLocation();
  const isRoom = pathname === '/'; // màn chính đã có dock riêng → ẩn thanh điều hướng dưới
  const isMission = pathname.startsWith('/mission'); // màn nhiệm vụ: cột hẹp kiểu game mobile (GameShell tự bung full-bleed trên điện thoại)
  const isChapter = pathname.startsWith('/chapter'); // màn kể chuyện: full-bleed, tự căn max-w bên trong
  const isGame = isMission || isChapter; // nhập vai: ẩn nav, có nút Thoát riêng
  const isJourney = pathname === '/journey'; // bản đồ hành trình chạy rộng hơn trên desktop
  const isOnboarding = pathname === '/onboarding'; // chưa có hồ sơ → không hiện nav (các mục cần hồ sơ)
  const immersive = isRoom || isGame;

  const items = [
    { to: '/', end: true, label: vi.nav.home },
    { to: '/journey', end: false, label: vi.nav.journey },
    { to: '/leaderboard', end: false, label: vi.nav.leaderboard },
    ...(isAdmin ? [{ to: '/admin', end: false, label: vi.nav.admin }] : []),
  ];
  const barLink = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 flex-1 items-center justify-center rounded-control px-2 text-small font-semibold transition-colors ${isActive ? 'bg-primary text-on-primary shadow-pop' : 'text-muted'}`;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header dính trên — thanh chuẩn: chiều cao cố định, nội dung căn giữa, có max-width */}
      <header className="safe-top sticky top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grad-brand flex h-9 w-9 items-center justify-center rounded-[11px] text-body shadow-pop ring-2 ring-surface">🐱</span>
            <span className="text-gradient text-body font-extrabold tracking-tight sm:text-title">{vi.app.name}</span>
          </NavLink>
          {session ? (
            <button
              onClick={() => signOut()}
              aria-label={vi.common.logout}
              className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border bg-surface/80 px-3.5 text-caption font-semibold text-muted shadow-soft backdrop-blur transition-colors hover:border-danger/40 hover:text-danger active:scale-95"
            >
              <Icon name="logout" size={15} strokeWidth={2} />
              <span className="hidden sm:inline">{vi.common.logout}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5">
              {pathname !== '/login' && <NavLink to="/login" className={`h-9 items-center whitespace-nowrap rounded-control px-3 text-small font-semibold text-primary transition-colors hover:bg-primary/5 ${pathname !== '/signup' ? 'hidden sm:inline-flex' : 'inline-flex'}`}>{vi.auth.login}</NavLink>}
              {pathname !== '/signup' && <NavLink to="/signup" className="inline-flex h-9 items-center whitespace-nowrap rounded-control bg-primary px-3.5 text-small font-semibold text-on-primary shadow-pop transition-all hover:brightness-[1.06] active:scale-95">{vi.signup.title}</NavLink>}
            </span>
          )}
        </div>
      </header>

      <main className={`flex-1 ${isRoom ? '' : isGame || isOnboarding ? 'px-4 pb-6 pt-1' : 'px-4 pb-28 pt-1'}`}>
        <div key={pathname} className={`mx-auto w-full ${immersive ? '' : 'page-in'} ${isRoom || isChapter ? 'max-w-none' : isMission ? 'max-w-md' : isJourney ? 'max-w-3xl' : !session ? 'max-w-3xl' : 'max-w-md'}`}>
          <Outlet />
        </div>
      </main>

      {/* Thanh điều hướng dưới (nổi) — ẩn ở màn Phòng Gumi, màn chơi & onboarding (chưa có hồ sơ) */}
      {session && !immersive && !isOnboarding && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4 pb-3" aria-label="Điều hướng chính">
          <div className="flex gap-1 rounded-pill border border-border bg-surface/95 p-1.5 shadow-soft backdrop-blur">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={barLink}>{i.label}</NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
