import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../app/session';
import { Icon, type IconName } from './Icon';

export interface AdminTab { id: string; label: string; icon: IconName }

/**
 * Khung trang ADMIN — dashboard desktop trung tính, TÁCH HẲN khỏi shell game của người chơi:
 * sidebar tối bên trái + thanh trên, không mascot/dock, bảng biểu dày đặc.
 */
export function AdminShell({ tabs, active, onSelect, children }: {
  tabs: AdminTab[]; active: string; onSelect: (id: string) => void; children: ReactNode;
}) {
  const { session, signOut } = useSession();
  return (
    <div className="min-h-dvh bg-bg text-text lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="hidden bg-text text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-black text-on-primary">G</span>
          <span className="text-body font-bold tracking-wide">GUMI ADMIN</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => onSelect(t.id)} aria-current={active === t.id}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-small font-semibold transition-colors ${active === t.id ? 'bg-primary text-on-primary' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
              <Icon name={t.icon} size={18} /> {t.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4">
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-small font-semibold text-white/60 hover:bg-white/10 hover:text-white">
            <Icon name="logout" size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Thanh trên */}
        <header className="flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2">
            <span className="rounded bg-danger/10 px-2 py-0.5 text-caption font-black uppercase tracking-wider text-danger">Admin</span>
            <span className="hidden text-small font-semibold text-muted sm:inline">{session?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-small font-semibold text-muted hover:text-text">
              <Icon name="paw" size={16} /> Về game
            </Link>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-small font-semibold text-muted hover:text-text lg:hidden">
              <Icon name="logout" size={16} /> Thoát
            </button>
          </div>
        </header>

        {/* Tabs (mobile) */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-2 lg:hidden">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => onSelect(t.id)} aria-current={active === t.id}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-small font-semibold ${active === t.id ? 'bg-primary text-on-primary' : 'text-muted'}`}>
              <Icon name={t.icon} size={16} /> {t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
