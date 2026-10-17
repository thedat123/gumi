import type { ReactNode } from 'react';
import { useSession } from '../app/session';
import { Icon, type IconName } from './Icon';

export interface AdminTab { id: string; label: string; icon: IconName }

/**
 * Khung trang ADMIN — "Control Room" cao cấp, TÁCH HẲN khỏi shell game của người chơi:
 * sidebar tối sang + user chip, topbar dính có tiêu đề mục, nội dung bảng biểu dày đặc.
 */
export function AdminShell({ tabs, active, onSelect, children }: {
  tabs: AdminTab[]; active: string; onSelect: (id: string) => void; children: ReactNode;
}) {
  const { session, profile, signOut } = useSession();
  const activeTab = tabs.find((t) => t.id === active);

  return (
    <div className="admin-portal min-h-dvh text-text md:grid md:grid-cols-[5rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)]">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className="admin-sidebar hidden text-white xl:flex xl:flex-col">
        <div className="flex items-center gap-3 px-6 pb-6 pt-7">
          <span className="admin-mark flex h-10 w-10 items-center justify-center text-lg font-black text-white">G</span>
          <span className="leading-tight">
            <span className="block text-body font-extrabold tracking-wide">GUMI</span>
            <span className="block text-[11px] font-bold tracking-[.22em] text-white/45">CONTROL ROOM</span>
          </span>
        </div>

        <div className="mx-6 mb-3 h-px bg-white/10" />
        <p className="px-6 pb-2 text-[10px] font-bold uppercase tracking-[.22em] text-white/35">Quản lý</p>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {tabs.map((t) => {
            const on = active === t.id;
            return (
              <button key={t.id} onClick={() => onSelect(t.id)} aria-current={on ? 'page' : undefined}
                className={`admin-navitem group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-small font-semibold transition-colors ${on ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/[.06] hover:text-white'}`}>
                <span className={`admin-navbar ${on ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
                <Icon name={t.icon} size={18} className={on ? 'text-[#F2A9BC]' : ''} /> {t.label}
              </button>
            );
          })}
        </nav>

        {/* User chip + đăng xuất */}
        <div className="p-3">
          <div className="admin-userchip flex items-center gap-2.5 rounded-xl p-2.5">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-body">{profile?.avatar ?? '🐱'}</span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-small font-bold text-white">{profile?.name ?? 'Admin'}</span>
              <span className="block truncate text-[11px] text-white/45">{session?.email}</span>
            </span>
            <button onClick={signOut} aria-label="Đăng xuất" title="Đăng xuất"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>

      <aside className="admin-sidebar hidden h-dvh flex-col items-center gap-6 py-5 text-white md:flex xl:hidden">
        <span className="admin-mark flex h-11 w-11 items-center justify-center text-xl font-black">G</span>
        <nav aria-label="Navigation admin" className="flex flex-1 flex-col gap-3">
          {tabs.map((t) => <button key={t.id} onClick={() => onSelect(t.id)} aria-label={t.label} title={t.label} aria-current={active === t.id ? 'page' : undefined}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${active === t.id ? 'bg-white/15 text-[#F2A9BC]' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}><Icon name={t.icon} size={22} /></button>)}
        </nav>
        <button onClick={signOut} aria-label="Đăng xuất" title="Đăng xuất" className="flex h-12 w-12 items-center justify-center rounded-xl text-white/60 hover:bg-white/10"><Icon name="logout" size={20} /></button>
      </aside>

      {/* ===== Khu nội dung ===== (h-dvh + overflow-hidden → chỉ <main> cuộn, topbar luôn đứng yên,
           nội dung KHÔNG trượt ra sau thanh tiêu đề mờ gây chồng chữ) */}
      <div className="admin-workspace flex h-dvh min-w-0 flex-col overflow-hidden">
        <header className="admin-topbar sticky top-0 z-20 flex shrink-0 items-center justify-between gap-3 px-4 py-3.5 lg:px-8">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-primary/70">Bảng điều khiển</p>
            <h1 className="truncate text-title font-extrabold leading-tight">{activeTab?.label ?? 'Admin'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-danger/10 px-2.5 py-1 text-caption font-black uppercase tracking-wider text-danger">
              <Icon name="paw" size={13} filled /> Admin
            </span>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-small font-semibold text-muted shadow-soft transition-colors hover:text-danger md:hidden">
              <Icon name="logout" size={16} /> Thoát
            </button>
          </div>
        </header>

        {/* Tabs (mobile) */}
        <nav aria-label="Navigation admin" className="grid shrink-0 grid-cols-3 gap-1.5 border-b border-border bg-surface px-3 py-2 md:hidden">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => onSelect(t.id)} aria-current={active === t.id ? 'page' : undefined}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-small font-semibold transition-colors ${active === t.id ? 'bg-primary text-on-primary shadow-pop' : 'text-muted'}`}>
              <Icon name={t.icon} size={16} /> {t.label}
            </button>
          ))}
        </nav>

        <main key={active} className="admin-main min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-5 xl:p-8">
          <div className="admin-page mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
