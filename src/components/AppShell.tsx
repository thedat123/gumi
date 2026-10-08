import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { vi } from '../content/vi';
import { Icon } from './Icon';
import { InstallButton } from './InstallButton';
import { ReminderNotifier } from './ReminderNotifier';
import { Loading } from './Loading';
import { useSession } from '../app/session';

/**
 * Vỏ ứng dụng dạng "một cột" giống app điện thoại trên MỌI kích thước màn hình:
 * - Không còn sidebar trái. Nội dung luôn căn giữa trong cột hẹp dễ đọc.
 * - Màn chính (Phòng Gumi) hiện thẳng nhân vật, chiếm trọn khung, tự có dock riêng.
 * - Các trang khác dùng thanh điều hướng dạng viên thuốc nổi ở dưới.
 */
export function AppShell() {
  const { session, profile, signOut } = useSession();
  const { pathname } = useLocation();
  const isAdmin = profile?.role === 'admin';
  const isRoom = pathname === '/'; // màn chính đã có dock riêng → ẩn thanh điều hướng dưới
  const isMission = pathname.startsWith('/mission'); // màn nhiệm vụ: cột hẹp kiểu game mobile (GameShell tự bung full-bleed trên điện thoại)
  const isChapter = pathname.startsWith('/chapter'); // màn kể chuyện: full-bleed, tự căn max-w bên trong
  const isGame = isMission || isChapter; // nhập vai: ẩn nav, có nút Thoát riêng
  const isJourney = pathname === '/journey'; // bản đồ hành trình chạy rộng hơn trên desktop
  const isOnboarding = pathname === '/onboarding'; // chưa có hồ sơ → không hiện nav (các mục cần hồ sơ)
  const immersive = isRoom || isGame;

  // Bề rộng khung nội dung dùng CHUNG cho header + main (+ thanh nav dưới cùng max-w-md)
  // → logo/nút trên header thẳng mép với khối nội dung, nhìn cân giữa & ăn khớp hơn.
  const contentMax = isRoom || isChapter || isMission || isJourney ? 'max-w-none' : !session ? 'max-w-3xl' : 'max-w-md';
  // Trang full-bleed (phòng/màn chơi/bản đồ) giữ header gọn max-w-6xl thay vì tràn kín.
  const headerMax = isRoom || isChapter || isMission || isJourney ? 'max-w-6xl' : contentMax;
  // Trang dạng cột (landing, đăng nhập, hồ sơ…): canh GIỮA theo chiều dọc khi còn chỗ trống,
  // nội dung dài hơn màn thì tự về trên & cuộn (nhờ my-auto) — đẹp cả desktop lẫn mobile.
  const columnLayout = !immersive && !isJourney;

  const items = [
    { to: '/', end: true, label: vi.nav.home },
    { to: '/journey', end: false, label: vi.nav.journey },
    { to: '/leaderboard', end: false, label: vi.nav.leaderboard },
  ];
  const barLink = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 flex-1 items-center justify-center rounded-control px-2 text-small font-semibold transition-colors ${isActive ? 'bg-primary text-on-primary shadow-pop' : 'text-muted'}`;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header dính trên — thanh chuẩn: chiều cao cố định, nội dung căn giữa, có max-width */}
      <header className="safe-top sticky top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-md">
        <div className={`mx-auto flex h-14 w-full ${headerMax} items-center justify-between gap-2 px-4 sm:h-16 sm:px-6`}>
          <NavLink to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/icons/icon.svg" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 rounded-[11px] shadow-pop ring-2 ring-surface" />
            {/* Mobile: tên ngắn gọn 1 dòng; từ sm trở lên: tên đầy đủ. Không xuống dòng. */}
            <span className="text-gradient truncate whitespace-nowrap text-body font-extrabold tracking-tight sm:text-title">
              <span className="sm:hidden">{vi.app.shortName}</span>
              <span className="hidden sm:inline">{vi.app.name}</span>
            </span>
          </NavLink>
          <div className="flex items-center gap-2">
            <InstallButton />
            {isAdmin && (
              <NavLink to="/admin" aria-label="Trang quản trị"
                className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-danger/30 bg-danger/10 px-3 text-caption font-black uppercase tracking-wider text-danger shadow-soft transition-colors hover:bg-danger/15 active:scale-95">
                <Icon name="paw" size={14} filled /> <span className="hidden sm:inline">Admin</span>
              </NavLink>
            )}
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
        </div>
      </header>

      <main className={`flex-1 ${columnLayout ? 'flex flex-col' : ''} ${isRoom || isJourney ? '' : isGame || isOnboarding ? 'px-4 pb-6 pt-1' : 'px-4 pb-28 pt-1'}`}>
        <div key={pathname} className={`mx-auto w-full ${columnLayout ? 'my-auto' : ''} ${immersive || isJourney ? '' : 'page-in'} ${contentMax}`}>
          {/* Giữ header + nav khi trang con (chunk lazy) đang tải, chỉ vùng nội dung hiện spinner. */}
          <Suspense fallback={<Loading />}><Outlet /></Suspense>
        </div>
      </main>

      <ReminderNotifier />

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
