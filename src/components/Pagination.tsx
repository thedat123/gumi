import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';

/** Chia trang cho một danh sách. `resetKey` đổi (tìm kiếm/lọc/sắp xếp) → quay về trang 1.
 *  `sizes` có → cho chọn số dòng/trang; `storageKey` → nhớ lựa chọn cho lần sau. */
export function usePagination<T>(items: readonly T[], defaultSize: number, resetKey: unknown = null,
  opts: { sizes?: readonly number[]; storageKey?: string } = {}) {
  const { sizes, storageKey } = opts;
  const [pageSize, setSize] = useState(() => {
    if (!storageKey) return defaultSize;
    try { const v = Number(localStorage.getItem(`pg:${storageKey}`)); return sizes?.includes(v) ? v : defaultSize; } catch { return defaultSize; }
  });
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => { setPage(1); }, [resetKey]);
  // Danh sách co lại (xoá bài, duyệt ảnh) → không kẹt ở trang trống.
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = Math.min(page, pages);
  const slice = useMemo(() => items.slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize]);
  const setPageSize = (n: number) => {
    // Giữ nguyên dòng đầu đang xem khi đổi cỡ trang.
    const first = (current - 1) * pageSize;
    setSize(n); setPage(Math.floor(first / n) + 1);
    if (storageKey) { try { localStorage.setItem(`pg:${storageKey}`, String(n)); } catch { /* bỏ qua */ } }
  };
  return { page: current, pages, setPage, slice, total: items.length, pageSize, setPageSize, sizes,
    from: items.length ? (current - 1) * pageSize + 1 : 0, to: Math.min(current * pageSize, items.length) };
}

/** Bộ cỡ trang chuẩn cho mọi danh sách admin. */
export const ADMIN_PAGE_SIZES = [10, 20, 50, 100] as const;

/** Dãy số trang gọn: 1 … 4 5 [6] 7 8 … 20 */
function pageList(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const lo = Math.max(2, page - 1), hi = Math.min(pages - 1, page + 1);
  if (lo > 2) out.push('…');
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < pages - 1) out.push('…');
  out.push(pages);
  return out;
}

export function Pagination({ page, pages, setPage, from, to, total, pageSize, setPageSize, sizes, unit = 'mục', tone = 'light', className = '' }: {
  page: number; pages: number; setPage: (p: number) => void; from: number; to: number; total: number;
  pageSize?: number; setPageSize?: (n: number) => void; sizes?: readonly number[];
  unit?: string; tone?: 'light' | 'dark'; className?: string;
}) {
  if (total === 0) return null;
  const dark = tone === 'dark';
  const base = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-small font-semibold tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-35';
  const idle = dark ? 'text-white/75 hover:bg-white/10' : 'text-muted hover:bg-bg hover:text-text';
  const active = dark ? 'bg-white/15 text-white' : 'bg-primary text-on-primary shadow-sm';
  const go = (p: number) => { setPage(p); };
  return (
    <nav aria-label="Phân trang" className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-small ${dark ? 'text-white/60' : 'text-muted'}`}>
        <p>Hiển thị <b className={dark ? 'text-white' : 'text-text'}>{from}–{to}</b> trên <b className={dark ? 'text-white' : 'text-text'}>{total}</b> {unit}</p>
        {sizes && setPageSize && pageSize && (
          <label className="flex items-center gap-2 whitespace-nowrap">
            <span>Mỗi trang</span>
            <span className="relative inline-flex">
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} aria-label={`Số ${unit} mỗi trang`}
                className={`h-9 cursor-pointer appearance-none rounded-lg border py-0 pl-3 pr-8 text-small font-bold tabular-nums shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 ${dark ? 'border-white/20 bg-white/10 text-white hover:bg-white/15 [color-scheme:dark]' : 'border-border bg-surface text-text hover:border-primary/50'}`}>
                {sizes.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <Icon name="chevron-down" size={14} className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${dark ? 'text-white/70' : 'text-muted'}`} />
            </span>
          </label>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className={`${base} ${idle}`} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Trang trước"><Icon name="chevron-left" size={16} /></button>
          {pageList(page, pages).map((p, i) => p === '…'
            ? <span key={`e${i}`} className={`px-1 text-small ${dark ? 'text-white/40' : 'text-muted'}`} aria-hidden="true">…</span>
            : <button key={p} type="button" className={`${base} ${p === page ? active : idle}`} onClick={() => go(p)} aria-label={`Trang ${p}`} aria-current={p === page ? 'page' : undefined}>{p}</button>)}
          <button type="button" className={`${base} ${idle}`} onClick={() => go(page + 1)} disabled={page >= pages} aria-label="Trang sau"><Icon name="chevron-right" size={16} /></button>
        </div>
      )}
    </nav>
  );
}

/** true khi màn hình ≥ query (vd desktop). Đổi kích thước/xoay máy tự cập nhật. */
export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [on, setOn] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const f = () => setOn(mq.matches);
    f();
    mq.addEventListener?.('change', f);
    return () => mq.removeEventListener?.('change', f);
  }, [query]);
  return on;
}
