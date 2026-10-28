import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useEventResults } from './event/EventResults';
import { gameNames } from './event/data';
import type { EventResult } from './event/store';
import { api } from '../api';
import { AdminShell, type AdminTab } from '../components/AdminShell';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Card } from '../components/Card';
import { Icon, type IconName } from '../components/Icon';
import { WallFeed } from '../components/WallFeed';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';
import type { AdminCheckin, AdminPlayer, AdminStats } from '../api/types';
import { ADMIN_PAGE_SIZES, Pagination, usePagination } from '../components/Pagination';
import { AGE_GROUPS, ageGroupOf, groupByAge, medianAge } from '../lib/age';

const TABS: AdminTab[] = [
  { id: 'event', label: 'Sự kiện trực tiếp', icon: 'medal' },
  { id: 'overview', label: 'Tổng quan', icon: 'medal' },
  { id: 'review', label: 'Duyệt ảnh', icon: 'flag' },
  { id: 'players', label: 'Người chơi', icon: 'paw' },
  { id: 'wall', label: 'Tường cộng đồng', icon: 'sparkle' },
];

const st = vi.admin.stats;
const TOTAL = vi.journey.total;

/** S13 — Admin = DASHBOARD THỐNG KÊ thuần (tách hẳn thế giới game): KPI + biểu đồ + bảng người chơi + duyệt ảnh. */
export function Admin() {
  const [tab, setTab] = useState('overview');
  const stats = useAsync(() => api.admin.getStats(), []);
  if (tab === 'event') return <AdminShell tabs={TABS} active={tab} onSelect={setTab}><EventPanel /></AdminShell>;
  if (tab === 'review') return <AdminShell tabs={TABS} active={tab} onSelect={setTab}><ReviewPanel /></AdminShell>;
  if (tab === 'wall')   return <AdminShell tabs={TABS} active={tab} onSelect={setTab}><WallPanel /></AdminShell>;
  return (
    <AdminShell tabs={TABS} active={tab} onSelect={setTab}>
      <AsyncView state={stats}>
        {(s) => (tab === 'overview' ? <Overview s={s} onSelect={setTab} /> : <PlayersPanel s={s} />)}
      </AsyncView>
    </AdminShell>
  );
}

/* ============================ DUYỆT ẢNH (mọi ảnh check-in: chờ duyệt tay + AI đã duyệt) ============================ */
const isSocialPhoto = (c: AdminCheckin) => c.kind === 'SHARE' || c.kind === 'FINAL' || /Đăng MXH|Tốt nghiệp/.test(c.flag ?? '');
/** Ảnh admin cần nhìn qua: chờ duyệt tay, hoặc AI đã duyệt mà admin chưa xác nhận. */
const needsLook = (c: AdminCheckin) => c.status === 'pending' || (c.status === 'approved' && !c.reviewed);

type StatusFilter = 'todo' | 'pending' | 'ai' | 'approved' | 'rejected' | 'all';
const STATUS_MATCH: Record<StatusFilter, (c: AdminCheckin) => boolean> = {
  todo: needsLook,
  pending: (c) => c.status === 'pending',
  ai: (c) => c.status === 'approved' && !c.reviewed,
  approved: (c) => c.status === 'approved',
  rejected: (c) => c.status === 'rejected',
  all: () => true,
};

function ReviewPanel() {
  const queue = useAsync(() => api.admin.listPhotos(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('todo');
  const [kind, setKind] = useState<'all' | 'checkin' | 'social'>('all');
  const [search, setSearch] = useState('');
  // Kết quả duyệt/gỡ cập nhật tại chỗ (không tải lại cả danh sách).
  const [changes, setChanges] = useState<Record<string, Partial<AdminCheckin>>>({});
  const photos = (queue.data ?? []).map((c) => (changes[c.id] ? { ...c, ...changes[c.id] } : c));
  const count = (f: StatusFilter) => photos.filter(STATUS_MATCH[f]).length;
  const tabs: { id: StatusFilter; label: string }[] = [
    { id: 'todo', label: 'Cần xem' },
    { id: 'pending', label: 'Chờ duyệt tay' },
    { id: 'ai', label: 'AI đã duyệt' },
    { id: 'approved', label: 'Đã duyệt' },
    { id: 'rejected', label: 'Đã gỡ / từ chối' },
    { id: 'all', label: 'Tất cả' },
  ];
  const act = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    if (busyId) return;
    setBusyId(id); setErr(null);
    try {
      await api.admin.setCheckinStatus(id, status, reason);
      setChanges((m) => ({ ...m, [id]: { status, reason: reason ?? null, reviewed: true } }));
    } catch { setErr('Không cập nhật được ảnh. Vui lòng thử lại.'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="admin-welcome flex flex-wrap items-center justify-between gap-6 rounded-[24px] p-6 sm:p-8">
        <div className="max-w-xl">
          <p className="mb-3 text-caption font-bold uppercase tracking-[.18em] text-white/60">GUMI · KIỂM DUYỆT NỘI DUNG</p>
          <h2 className="text-[28px] font-extrabold leading-tight text-white sm:text-[34px]">Mỗi bức ảnh, một bước tiến.</h2>
          <p className="mt-3 text-small leading-relaxed text-white/70">Xem mọi ảnh check-in và Story, kể cả ảnh AI đã tự duyệt. Ảnh không đạt thì gỡ, người chơi sẽ được báo và mất điểm ngày đó.</p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#F2A9BC]"><Icon name="flag" size={24} /></span>
          <div><p className="text-[32px] font-extrabold leading-none tabular-nums text-white">{queue.loading ? '—' : count('todo')}</p><p className="mt-1 text-caption text-white/65">ảnh cần xem</p></div>
        </div>
      </section>
      {err && <div role="alert"><Banner kind="error">{err}</Banner></div>}
      <section className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5" aria-label="Trạng thái ảnh">
            {tabs.map((t) => <button key={t.id} onClick={() => setFilter(t.id)} aria-pressed={filter === t.id}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-small font-bold transition-colors ${filter === t.id ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-bg'}`}>
              {t.label}<span className={`rounded-md px-1.5 py-0.5 text-caption tabular-nums ${filter === t.id ? 'bg-primary/10' : 'bg-bg'}`}>{queue.loading ? '—' : count(t.id)}</span>
            </button>)}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <select aria-label="Loại ảnh" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}
              className="min-h-11 rounded-xl border border-border bg-bg/50 px-3 text-small outline-none focus:border-primary">
              <option value="all">Mọi loại ảnh</option>
              <option value="checkin">Check-in đồ uống</option>
              <option value="social">Story & tốt nghiệp</option>
            </select>
            <input aria-label="Tìm ảnh theo tên người chơi" placeholder="Tìm tên người chơi…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg/50 px-4 text-small outline-none focus:border-primary sm:w-60 sm:flex-none" />
          </div>
        </div>
        <AsyncView state={queue}>
          {() => {
            const q = search.trim().toLocaleLowerCase('vi');
            const items = photos.filter((c) => STATUS_MATCH[filter](c)
              && (kind === 'all' || (kind === 'social' ? isSocialPhoto(c) : !isSocialPhoto(c)))
              && c.user.toLocaleLowerCase('vi').includes(q));
            return items.length ? <ReviewGrid items={items} resetKey={`${filter}|${kind}|${search}`} render={(c) => <ReviewCard key={c.id} c={c} busy={busyId === c.id} disabled={busyId !== null} onAct={act} />} /> : <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success"><Icon name={photos.length ? 'flag' : 'check'} size={30} /></span>
              <h3 className="text-title font-bold">{filter === 'todo' && !q && kind === 'all' ? 'Đã xem hết ảnh' : 'Không có ảnh phù hợp'}</h3>
              <p className="mt-2 max-w-sm text-small text-muted">{filter === 'todo' ? 'Ảnh mới của người chơi sẽ xuất hiện tại đây.' : 'Thử tên khác hoặc chọn nhóm ảnh khác.'}</p>
            </div>;
          }}
        </AsyncView>
      </section>
    </div>
  );
}

/** Lưới ảnh chờ duyệt, 12 ảnh/trang (duyệt xong ảnh biến mất, trang tự lùi nếu trống). */
function ReviewGrid<T>({ items, resetKey, render }: { items: T[]; resetKey: string; render: (c: T) => ReactNode }) {
  const pg = usePagination(items, 12, resetKey, { sizes: [12, 24, 48, 96], storageKey: 'admin-review' });
  return (
    <div className="flex flex-col">
      <div className="grid items-start gap-5 bg-bg/40 p-4 min-[700px]:grid-cols-2 sm:p-5 min-[1600px]:grid-cols-3">{pg.slice.map(render)}</div>
      <Pagination {...pg} unit="ảnh" className="border-t border-border px-4 py-3 sm:px-5" />
    </div>
  );
}

function ReviewCard({ c, busy, disabled, onAct }: {
  c: AdminCheckin; busy: boolean; disabled: boolean;
  onAct: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const isUrl = /^https?:\/\//.test(c.emoji);
  const isPath = !isUrl && c.emoji.includes('/');
  const photo = useAsync(async () => isUrl ? c.emoji : isPath ? api.admin.photoUrl(c.emoji) : null, [c.emoji]);
  const imageUrl = photo.data;

  const mission = vi.missions[c.day - 1];
  const social = isSocialPhoto(c);
  const badge = c.status === 'pending' ? { label: 'Chờ duyệt tay', cls: 'bg-[#fff4df] text-[#946019]' }
    : c.status === 'rejected' ? { label: 'Đã gỡ', cls: 'bg-danger/10 text-danger' }
    : c.reviewed ? { label: 'Admin đã duyệt', cls: 'bg-success/10 text-success' }
    : { label: 'AI đã duyệt', cls: 'bg-info/10 text-info' };
  const sentAt = c.createdAt ? new Date(c.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : null;
  const approveLabel = c.status === 'approved' ? 'Ảnh OK' : c.status === 'rejected' ? 'Khôi phục' : 'Duyệt ảnh';
  const rejectLabel = c.status === 'approved' ? 'Gỡ ảnh' : 'Từ chối';
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-caption font-semibold text-muted">Ảnh minh chứng</span>
        <span className="rounded-md bg-bg px-2 py-1 text-caption font-semibold text-text">Ngày {c.day}</span>
      </div>
      <div className="bg-[#eef2f6]">
        {imageUrl && !imageFailed ? <img src={imageUrl} alt={`Ảnh của ${c.user}, ngày ${c.day}`} loading="lazy" onError={() => setImageFailed(true)} className="block h-auto w-full" />
          : photo.loading ? <p role="status" className="px-5 py-12 text-center text-small text-muted">Đang tải ảnh…</p>
          : isPath || isUrl || imageFailed ? <div className="px-5 py-12 text-center">
            <p className="text-small text-muted">Không tải được ảnh minh chứng.</p>
            <button onClick={() => { setImageFailed(false); photo.reload(); }} className="mt-3 min-h-11 rounded-lg border border-border bg-surface px-4 text-small font-semibold">Tải lại ảnh</button>
          </div> : <div className="flex min-h-48 items-center justify-center text-[64px]" aria-label="Ảnh minh hoạ">{c.emoji}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-small font-extrabold text-primary">{c.user.charAt(0).toLocaleUpperCase('vi')}</span>
          <div className="min-w-0"><h3 className="truncate text-body font-bold" title={c.user}>{c.user}</h3><p className="mt-0.5 text-caption text-muted">{social ? 'Story & tốt nghiệp' : 'Check-in đồ uống'}{sentAt && ` · ${sentAt}`}</p></div>
          <span className={`ml-auto shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}>{badge.label}</span>
        </div>
        <div className="rounded-xl bg-bg/70 p-3">
          <p className="text-small font-semibold">{mission?.title ?? `Nhiệm vụ ngày ${c.day}`}</p>
          <p className="mt-1 text-caption leading-relaxed text-muted">{c.flag || (c.status === 'approved' && !c.reviewed ? 'AI đã nhận diện đạt và cộng điểm. Kiểm tra lại, không đạt thì gỡ.' : 'Người chơi gửi ảnh để xác nhận nhiệm vụ.')}</p>
          {c.level != null && <p className="mt-2 text-caption font-semibold text-info">Mức đường nhận diện: {c.level}%</p>}
          {c.status === 'rejected' && c.reason && <p className="mt-2 text-caption font-semibold text-danger">Lý do gỡ: {c.reason}</p>}
        </div>
        {rejecting ? <form className="mt-auto space-y-3" onSubmit={(e) => { e.preventDefault(); if (reason.trim()) void onAct(c.id, 'rejected', reason.trim()); }}>
          <label className="block text-small font-bold" htmlFor={`reason-${c.id}`}>Lý do {c.status === 'approved' ? 'gỡ ảnh' : 'từ chối'}</label>
          <textarea id={`reason-${c.id}`} autoFocus required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cho người chơi biết ảnh cần sửa ở đâu…" disabled={disabled}
            className="min-h-24 w-full resize-y rounded-xl border border-border bg-surface p-3 text-small outline-none focus:border-primary" />
          <p className="text-caption text-muted">Người chơi sẽ nhận thông báo kèm lý do và mất điểm ngày này.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRejecting(false)} disabled={disabled} className="min-h-11 rounded-xl border border-border text-small font-bold disabled:opacity-50">Huỷ</button>
            <button type="submit" disabled={disabled || !reason.trim()} className="min-h-11 rounded-xl bg-danger text-small font-bold text-white disabled:opacity-50">{busy ? 'Đang gửi…' : c.status === 'approved' ? 'Gỡ ảnh' : 'Gửi từ chối'}</button>
          </div>
        </form> : <div className={`mt-auto grid gap-2 border-t border-border pt-4 ${c.status === 'approved' && c.reviewed ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {c.status !== 'rejected' && <button onClick={() => setRejecting(true)} disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border text-small font-bold text-muted transition-colors hover:border-danger/40 hover:bg-danger/5 hover:text-danger disabled:opacity-50"><Icon name="x" size={16} />{rejectLabel}</button>}
          {!(c.status === 'approved' && c.reviewed) && <button onClick={() => void onAct(c.id, 'approved')} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#247758] text-small font-bold text-white transition-colors hover:bg-[#1c6248] disabled:opacity-50 ${c.status === 'rejected' ? 'col-span-2' : ''}`}><Icon name="check" size={16} />{busy ? 'Đang lưu…' : approveLabel}</button>}
        </div>}
      </div>
    </article>
  );
}

/* ============================ TƯỜNG CỘNG ĐỒNG ============================ */
function WallPanel() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string[]>([]);

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id); setErr(null);
    try {
      await api.admin.deleteWallPost(id);
      setDeleted((prev) => [...prev, id]);
    } catch { setErr('Không xoá được bài. Thử lại.'); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="admin-welcome flex flex-wrap items-center justify-between gap-6 rounded-[24px] p-6 sm:p-8">
        <div className="max-w-xl">
          <p className="mb-3 text-caption font-bold uppercase tracking-[.18em] text-white/60">GUMI · CỘNG ĐỒNG</p>
          <h2 className="text-[28px] font-extrabold leading-tight text-white sm:text-[34px]">Tiếng nói từ hành trình.</h2>
          <p className="mt-3 text-small leading-relaxed text-white/70">Bài chia sẻ của người chơi sau khi hoàn thành thử thách. Xoá bài vi phạm nếu cần.</p>
        </div>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#F2A9BC]">
          <Icon name="sparkle" size={28} filled />
        </span>
      </section>
      {err && <div role="alert"><Banner kind="error">{err}</Banner></div>}
      <section className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-soft">
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-small font-bold">Tất cả bài đăng</p>
        </div>
        <div className="p-4 sm:p-5">
          <WallFeed pageSize={10} pageSizes={ADMIN_PAGE_SIZES} storageKey="admin-wall" hiddenIds={deleted} onDelete={(id) => { if (!deleted.includes(id)) void handleDelete(id); }} />
        </div>
      </section>
    </div>
  );
}

/* ============================ SỰ KIỆN TRỰC TIẾP ============================ */
type EvRow = EventResult & { pending?: boolean; rank: number };
type EvSort = 'total' | 0 | 1 | 2 | 3;
const GAME_SHORT = ['Phân loại', 'Truy vết', 'Sự thật', 'Flappy'];
const FLAPPY_GOAL = 40; // Flappy Gumi: bay qua đủ 40 cột là hoàn thành
const MEDAL = [
  { color: '#C9962B', chip: 'bg-[#C9962B]/15 text-[#9A6F12]', label: 'Vô địch' },
  { color: '#7D8A9C', chip: 'bg-[#7D8A9C]/15 text-[#566273]', label: 'Á quân' },
  { color: '#B0703F', chip: 'bg-[#B0703F]/15 text-[#8A5126]', label: 'Hạng ba' },
];

function RankChip({ rank }: { rank: number }) {
  const m = MEDAL[rank - 1];
  return m
    ? <span className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 text-caption font-extrabold tabular-nums ${m.chip}`} aria-label={`Hạng ${rank}`}><Icon name="medal" size={14} filled />{rank}</span>
    : <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-bg px-1.5 text-caption font-bold tabular-nums text-muted" aria-label={`Hạng ${rank}`}>{rank}</span>;
}

function PendingTag() {
  return <span className="ml-2 inline-flex items-center gap-1 rounded-pill bg-accent/15 px-2 py-0.5 align-middle text-[11px] font-bold text-accent"><Icon name="clock" size={11} />Đang đồng bộ</span>;
}

function exportEventCsv(rows: EvRow[]) {
  const header = ['Hạng', 'Tên đội', ...gameNames, 'Tổng', 'Thời gian'];
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const when = (iso?: string) => iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
  const body = rows.map((r) => [r.rank, r.team, ...gameNames.map((_, g) => r.scores[g] ?? 0), r.total, when(r.created_at)].map(esc).join(','));
  const csv = '﻿' + [header.join(','), ...body].join('\r\n'); // BOM để Excel đọc đúng tiếng Việt
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `su-kien-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function EventPanel() {
  const { rows, error } = useEventResults();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<EvSort>('total');

  // Hạng luôn theo TỔNG điểm (hoà điểm: đội chơi trước xếp trên), dù đang sắp xếp theo cột khác.
  const ranked: EvRow[] = useMemo(() => [...rows]
    .sort((a, b) => b.total - a.total || (a.created_at ?? '￿').localeCompare(b.created_at ?? '￿'))
    .map((r, i) => ({ ...r, rank: i + 1 })), [rows]);
  const colMax = useMemo(() => gameNames.map((_, g) => Math.max(0, ...ranked.map((r) => r.scores[g] ?? 0))), [ranked]);
  const view = useMemo(() => {
    const key = q.trim().toLowerCase();
    const list = ranked.filter((r) => !key || r.team.toLowerCase().includes(key));
    return sort === 'total' ? list : [...list].sort((a, b) => (b.scores[sort] ?? 0) - (a.scores[sort] ?? 0) || a.rank - b.rank);
  }, [ranked, q, sort]);
  const pg = usePagination(view, 20, `${q}|${sort}`, { sizes: ADMIN_PAGE_SIZES, storageKey: 'admin-event' });

  const top = ranked[0];
  const avg = ranked.length ? Math.round(ranked.reduce((a, r) => a + r.total, 0) / ranked.length) : 0;
  const flappyDone = ranked.filter((r) => (r.scores[3] ?? 0) >= FLAPPY_GOAL).length;
  const SORTS: { k: EvSort; label: string }[] = [{ k: 'total', label: 'Tổng' }, ...GAME_SHORT.map((label, g) => ({ k: g as EvSort, label }))];

  const bar = (g: number, v: number) => (
    <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-border/50" aria-hidden="true">
      <span className="block h-full rounded-full bg-primary/70" style={{ width: `${colMax[g] ? Math.round((v / colMax[g]) * 100) : 0}%` }} />
    </span>
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="admin-welcome flex flex-wrap items-center justify-between gap-6 rounded-[24px] p-6 sm:p-8">
        <div className="max-w-xl">
          <p className="mb-3 text-caption font-bold uppercase tracking-[.18em] text-white/60">GUMI · SỰ KIỆN TRỰC TIẾP</p>
          <h2 className="text-[28px] font-extrabold leading-tight tracking-tight text-white sm:text-[34px]">Bảng vàng sự kiện.</h2>
          <p className="mt-3 text-small leading-relaxed text-white/70">Điểm 4 thử thách của từng đội — tự cập nhật ngay khi một đội chơi xong.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-2 text-caption font-bold uppercase tracking-[.14em] text-white">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5BD08F] opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#5BD08F]" />
          </span>
          Trực tiếp
        </span>
      </section>

      {error && <div role="status"><Banner kind="info">{error}</Banner></div>}

      <section>
        <h2 className="mb-3 text-small font-bold uppercase tracking-wide text-muted">Chỉ số chính</h2>
        <div className="grid grid-cols-2 gap-3 min-[1100px]:grid-cols-4">
          <StatCard icon="flag" cls="text-primary" accent="#B83556" value={ranked.length} label="Đội đã thi đấu" />
          <StatCard icon="trophy" cls="text-accent" accent="#C9962B" value={top?.total ?? 0} label="Điểm cao nhất" hint={top ? top.team : undefined} />
          <StatCard icon="star" cls="text-info" accent="#55768C" value={avg} label="Điểm trung bình" />
          <StatCard icon="medal" cls="text-success" accent="#1F7A4D" value={`${flappyDone}/${ranked.length}`} label={`Qua đủ ${FLAPPY_GOAL} cột Flappy`} />
        </div>
      </section>

      {ranked.length > 0 && (
        <section>
          <h2 className="mb-3 text-small font-bold uppercase tracking-wide text-muted">Bục vinh quang</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {ranked.slice(0, 3).map((r, i) => (
              <article key={r.id} className="admin-kpi flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-5 shadow-soft" style={{ '--kpi': MEDAL[i]!.color } as CSSProperties}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-caption font-extrabold ${MEDAL[i]!.chip}`}><Icon name="medal" size={14} filled />{MEDAL[i]!.label}</span>
                  <span className="text-caption font-bold tabular-nums text-muted">#{r.rank}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-title font-extrabold" title={r.team}>{r.team}{r.pending && <PendingTag />}</h3>
                  <p className="mt-1 text-[30px] font-extrabold leading-none tabular-nums text-text">{r.total}<span className="ml-1 text-small font-semibold text-muted">điểm</span></p>
                </div>
                <dl className="grid grid-cols-4 gap-1.5 rounded-xl bg-bg/60 p-2 text-center">
                  {GAME_SHORT.map((g, gi) => (
                    <div key={g} className="min-w-0"><dt className="truncate text-[11px] text-muted">{g}</dt><dd className="text-small font-extrabold tabular-nums">{r.scores[gi] ?? 0}</dd></div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5"><h2 className="admin-section-title">Tất cả đội</h2><span className="admin-result-count">{view.length}/{ranked.length}</span></div>
          <div className="admin-player-tools flex w-full flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên đội…" aria-label="Tìm đội"
              className="h-9 w-52 rounded-lg border border-border bg-surface px-3 text-small font-medium text-text outline-none focus:border-primary/60" />
            <div className="admin-sort flex items-center gap-1 overflow-x-auto rounded-lg p-1" role="group" aria-label="Sắp xếp theo">
              {SORTS.map((o) => (
                <button key={String(o.k)} onClick={() => setSort(o.k)} aria-pressed={sort === o.k}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 transition-colors ${sort === o.k ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}>
                  {o.label}
                </button>
              ))}
            </div>
            <button onClick={() => exportEventCsv(view)} disabled={view.length === 0}
              className="admin-export flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-small font-semibold text-text transition-colors hover:bg-bg disabled:opacity-40">
              <Icon name="arrow-right" size={15} className="rotate-90" /> Xuất CSV
            </button>
          </div>
        </div>

        {ranked.length === 0 ? (
          <div className="flex flex-col items-center rounded-[20px] border border-border bg-surface px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg text-accent"><Icon name="trophy" size={28} filled /></span>
            <p className="mt-4 text-body font-bold">Chưa có đội nào thi đấu</p>
            <p className="mt-1 max-w-sm text-small text-muted">Bảng sẽ tự cập nhật ngay khi đội đầu tiên hoàn thành 4 thử thách.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 min-[1100px]:hidden">
              {view.length === 0 && <p className="col-span-full rounded-2xl border border-border bg-surface px-4 py-10 text-center text-small text-muted">Không tìm thấy đội nào.</p>}
              {pg.slice.map((r) => (
                <article key={r.id} className="min-w-0 rounded-[20px] border border-border bg-surface p-4 shadow-soft">
                  <div className="flex items-center gap-3">
                    <RankChip rank={r.rank} />
                    <h3 className="min-w-0 flex-1 break-words text-small font-bold">{r.team}{r.pending && <PendingTag />}</h3>
                    <span className="text-title font-extrabold tabular-nums text-primary">{r.total}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-bg/60 p-3">
                    {gameNames.map((g, gi) => (
                      <div key={g} className="min-w-0">
                        <dt className="flex items-baseline justify-between gap-2 text-caption text-muted"><span className="truncate">{g}</span><span className={`font-extrabold tabular-nums ${sort === gi ? 'text-primary' : 'text-text'}`}>{r.scores[gi] ?? 0}</span></dt>
                        <dd>{bar(gi, r.scores[gi] ?? 0)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-[20px] border border-border bg-surface min-[1100px]:block"><Card className="min-w-[860px] divide-y divide-border/60 border-0 p-0">
              <div className="sticky top-0 z-10 flex items-center gap-4 bg-bg/80 px-4 py-2.5 text-caption font-bold uppercase tracking-wide text-muted backdrop-blur">
                <span className="w-14">Hạng</span>
                <span className="min-w-0 flex-1">Đội</span>
                {gameNames.map((g, gi) => <span key={g} className={`w-32 ${sort === gi ? 'text-primary' : ''}`}>{g}</span>)}
                <span className={`w-20 text-right ${sort === 'total' ? 'text-primary' : ''}`}>Tổng</span>
              </div>
              {view.length === 0
                ? <p className="px-4 py-8 text-center text-small text-muted">Không tìm thấy đội nào.</p>
                : pg.slice.map((r) => (
                  <div key={r.id} className="admin-row flex items-center gap-4 px-4 py-2.5 text-small">
                    <span className="w-14"><RankChip rank={r.rank} /></span>
                    <span className="min-w-0 flex-1 truncate font-semibold" title={r.team}>{r.team}{r.pending && <PendingTag />}</span>
                    {gameNames.map((g, gi) => {
                      const v = r.scores[gi] ?? 0;
                      const best = v > 0 && v === colMax[gi];
                      return <span key={g} className="w-32">
                        <span className={`tabular-nums ${best ? 'font-extrabold text-primary' : 'font-semibold'}`} title={best ? 'Điểm cao nhất ở thử thách này' : undefined}>{v}</span>
                        {bar(gi, v)}
                      </span>;
                    })}
                    <span className="w-20 text-right text-body font-extrabold tabular-nums text-text">{r.total}</span>
                  </div>
                ))}
            </Card></div>
            <Pagination {...pg} unit="đội" />
          </>
        )}
      </section>
    </div>
  );
}

/* ============================ TỔNG QUAN ============================ */
function Overview({ s, onSelect }: { s: AdminStats; onSelect: (tab: string) => void }) {
  const rate = s.totalPlayers ? Math.round((s.finishedCount / s.totalPlayers) * 100) : 0;

  // Phân bố tiến độ theo nhóm ngày hoàn thành.
  const buckets = useMemo(() => {
    const b = [
      { label: 'Chưa bắt đầu', hit: (d: number) => d === 0, color: '#9AA3B2' },
      { label: '1–7 ngày', hit: (d: number) => d >= 1 && d <= 7, color: '#EF9F2A' },
      { label: '8–13 ngày', hit: (d: number) => d >= 8 && d <= 13, color: '#55768C' },
      { label: `Hoàn thành (${TOTAL})`, hit: (d: number) => d >= TOTAL, color: '#1F7A4D' },
    ];
    return b.map((x) => ({ label: x.label, color: x.color, count: s.players.filter((p) => x.hit(p.daysDone)).length }));
  }, [s.players]);

  return (
    <div className="flex flex-col gap-6">
      <section className="admin-welcome flex flex-wrap items-center justify-between gap-6 rounded-[24px] p-6 sm:p-8">
        <div className="max-w-lg">
          <p className="mb-3 text-caption font-bold uppercase tracking-[.2em] text-white/60">GUMI · QUẢN LÝ HÀNH TRÌNH</p>
          <h2 className="text-[28px] font-extrabold leading-tight tracking-tight text-white sm:text-[34px]">Một góc nhìn, toàn bộ hành trình.</h2>
          <p className="mt-3 text-small leading-relaxed text-white/70">Theo dõi tiến độ, kết nối người chơi và xử lý ảnh check-in trong cùng một không gian.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => onSelect('review')} className="rounded-xl bg-white px-4 py-2.5 text-small font-bold text-[#263247] hover:bg-white/90">Duyệt ảnh <span aria-hidden="true">→</span></button>
            <button onClick={() => onSelect('players')} className="rounded-xl border border-white/25 px-4 py-2.5 text-small font-bold text-white hover:bg-white/10">Xem người chơi</button>
          </div>
        </div>
        <div className="admin-completion flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-full border-[8px] border-white/15">
          <span className="text-[32px] font-extrabold text-white">{rate}%</span>
          <span className="text-caption text-white/65">Hoàn thành</span>
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-small font-bold uppercase tracking-wide text-muted">Chỉ số chính</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 min-[1500px]:grid-cols-6">
          <StatCard icon="paw" cls="text-primary" accent="#B83556" value={s.totalPlayers} label={st.totalPlayers} />
          <StatCard icon="play" cls="text-accent" accent="#EF9F2A" value={s.activePlayers} label={st.activePlayers} />
          <StatCard icon="medal" cls="text-info" accent="#55768C" value={s.eligibleCount} label={st.eligible} hint={st.eligibleHint} />
          <StatCard icon="trophy" cls="text-success" accent="#1F7A4D" value={s.finishedCount} label={st.finished} />
          <StatCard icon="star" cls="text-accent" accent="#EF9F2A" value={s.avgPoints} label={st.avgPoints} />
          <StatCard icon="flag" cls="text-primary" accent="#B83556" value={`${rate}%`} label="Tỉ lệ hoàn thành" />
        </div>
      </section>

      <div className="grid gap-5 min-[1100px]:grid-cols-2">
        {/* Phễu chuyển đổi */}
        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-body font-bold">Phễu người chơi</h3>
          <div className="flex flex-col gap-3">
            <FunnelRow label={st.totalPlayers} value={s.totalPlayers} max={s.totalPlayers} color="#B83556" />
            <FunnelRow label={st.activePlayers} value={s.activePlayers} max={s.totalPlayers} color="#EF9F2A" />
            <FunnelRow label={st.eligible} value={s.eligibleCount} max={s.totalPlayers} color="#55768C" />
            <FunnelRow label={st.finished} value={s.finishedCount} max={s.totalPlayers} color="#1F7A4D" />
          </div>
        </Card>

        {/* Phân bố tiến độ */}
        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-body font-bold">Phân bố tiến độ</h3>
          <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
            {buckets.map((b) => {
              const max = Math.max(1, ...buckets.map((x) => x.count));
              return (
                <div key={b.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-small font-extrabold tabular-nums" style={{ color: b.color }}>{b.count}</span>
                  <div className="w-full rounded-t-md transition-all" style={{ height: `${(b.count / max) * 120 + 2}px`, background: b.color, opacity: 0.9 }} />
                  <span className="text-center text-[10px] font-semibold leading-tight text-muted">{b.label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Xu hướng theo ngày — bao nhiêu người đạt tới từng ngày trong hành trình (thấy rơi rụng). */}
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-body font-bold">Xu hướng theo ngày</h3>
          <span className="text-caption text-muted">Số người đạt tới mỗi ngày · tối đa {s.totalPlayers}</span>
        </div>
        <div className="sm:hidden"><DailyTrend players={s.players} compact /></div>
        <div className="hidden sm:block"><DailyTrend players={s.players} /></div>
      </Card>

      <AgeInsights players={s.players} />
    </div>
  );
}

/* ============================ THỐNG KÊ ĐỘ TUỔI (từ khảo sát trước khi chơi) ============================ */
const UNKNOWN_COLOR = '#C9CED8';

function AgeInsights({ players }: { players: AdminPlayer[] }) {
  const data = useMemo(() => {
    const { rows, unknown } = groupByAge(players);
    const answered = players.length - unknown.length;
    const ages = players.map((p) => p.age);
    const valid = ages.filter((a): a is number => typeof a === 'number');
    const top = [...rows].sort((a, b) => b.items.length - a.items.length)[0];
    return {
      rows: rows.map((r) => {
        const n = r.items.length;
        const avg = (f: (p: AdminPlayer) => number) => (n ? r.items.reduce((t, p) => t + f(p), 0) / n : 0);
        return {
          ...r.group, count: n,
          share: answered ? Math.round((n / answered) * 100) : 0,
          avgPoints: Math.round(avg((p) => p.points)),
          avgDays: Math.round(avg((p) => p.daysDone) * 10) / 10,
          finishRate: n ? Math.round((r.items.filter((p) => p.finished).length / n) * 100) : 0,
        };
      }),
      unknown: unknown.length,
      answered,
      answerRate: players.length ? Math.round((answered / players.length) * 100) : 0,
      median: medianAge(ages),
      avg: valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null,
      top: top && top.items.length ? top.group : null,
      valid,
    };
  }, [players]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-small font-bold uppercase tracking-wide text-muted">Độ tuổi người chơi</h2>
          <p className="mt-0.5 text-caption text-muted">Từ khảo sát 1 câu trước khi chơi · {data.answered}/{players.length} người đã trả lời</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="paw" cls="text-primary" accent="#B83556" value={data.median ?? '—'} label="Tuổi trung vị" />
        <StatCard icon="star" cls="text-accent" accent="#EF9F2A" value={data.avg ?? '—'} label="Tuổi trung bình" />
        <StatCard icon="medal" cls="text-info" accent={data.top?.color ?? '#55768C'} value={data.top ? data.top.label : '—'} label="Nhóm đông nhất" hint={data.top?.hint} />
        <StatCard icon="check" cls="text-success" accent="#1F7A4D" value={`${data.answerRate}%`} label="Tỉ lệ trả lời" />
      </div>

      <div className="grid gap-5 min-[1100px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card className="flex min-w-0 flex-col gap-4 p-5">
          <h3 className="text-body font-bold">Cơ cấu theo nhóm tuổi</h3>
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <AgeDonut rows={data.rows} unknown={data.unknown} total={players.length} />
            <ul className="flex w-full flex-1 flex-col gap-2.5">
              {data.rows.map((r) => (
                <li key={r.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-small">
                    <span className="flex min-w-0 items-center gap-2 font-semibold"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />{r.emoji} {r.label}<span className="truncate text-caption font-medium text-muted">{r.hint}</span></span>
                    <span className="shrink-0 font-extrabold tabular-nums" style={{ color: r.color }}>{r.count} <span className="text-caption font-semibold text-muted">· {r.share}%</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(r.share, r.count ? 2 : 0)}%`, background: r.color }} /></div>
                </li>
              ))}
              {data.unknown > 0 && <li className="flex items-center justify-between text-caption text-muted"><span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: UNKNOWN_COLOR }} />Chưa trả lời</span><span className="font-bold tabular-nums">{data.unknown}</span></li>}
            </ul>
          </div>
        </Card>

        <Card className="flex min-w-0 flex-col gap-4 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-body font-bold">Hiệu quả theo nhóm tuổi</h3>
            <span className="text-caption text-muted">Nhóm nào chơi chăm & về đích nhiều nhất</span>
          </div>
          <AgePerformance rows={data.rows} />
        </Card>
      </div>

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-body font-bold">Phân bố theo từng tuổi</h3>
          <span className="text-caption text-muted">Số người ở mỗi độ tuổi · màu theo nhóm</span>
        </div>
        <div className="sm:hidden"><AgeHistogram ages={data.valid} compact /></div>
        <div className="hidden sm:block"><AgeHistogram ages={data.valid} /></div>
      </Card>
    </section>
  );
}

type AgeRowStat = (typeof AGE_GROUPS)[number] & { count: number; share: number; avgPoints: number; avgDays: number; finishRate: number };

function AgeDonut({ rows, unknown, total }: { rows: AgeRowStat[]; unknown: number; total: number }) {
  const R = 54, C = 2 * Math.PI * R;
  const segs = [...rows.map((r) => ({ id: r.id, color: r.color, n: r.count })), { id: 'unknown', color: UNKNOWN_COLOR, n: unknown }].filter((x) => x.n > 0);
  let acc = 0;
  return (
    <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label="Biểu đồ tròn cơ cấu nhóm tuổi">
      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-border)" strokeWidth="18" />
      {total > 0 && segs.map((sg) => {
        const len = (sg.n / total) * C;
        const el = <circle key={sg.id} cx="70" cy="70" r={R} fill="none" stroke={sg.color} strokeWidth="18"
          strokeDasharray={`${Math.max(len - 1.5, 0.5)} ${C}`} strokeDashoffset={-acc} />;
        acc += len;
        return el;
      })}
      <g className="rotate-90" style={{ transformOrigin: '70px 70px' }}>
        <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="800" className="fill-[color:var(--color-text)]">{total}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" className="fill-[color:var(--color-muted)]">người chơi</text>
      </g>
    </svg>
  );
}

function AgePerformance({ rows }: { rows: AgeRowStat[] }) {
  const maxPts = Math.max(1, ...rows.map((r) => r.avgPoints));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-small">
        <thead>
          <tr className="text-left text-caption font-bold uppercase tracking-wide text-muted">
            <th className="pb-2 font-bold">Nhóm</th>
            <th className="pb-2 text-right font-bold">Người</th>
            <th className="w-[38%] pb-2 pl-4 font-bold">Điểm TB</th>
            <th className="pb-2 text-right font-bold">Ngày TB</th>
            <th className="pb-2 text-right font-bold">Về đích</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2.5 font-semibold"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: r.color }} />{r.label}</td>
              <td className="py-2.5 text-right tabular-nums">{r.count}</td>
              <td className="py-2.5 pl-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full" style={{ width: `${(r.avgPoints / maxPts) * 100}%`, background: r.color }} /></div>
                  <span className="w-10 text-right font-extrabold tabular-nums" style={{ color: r.color }}>{r.count ? r.avgPoints : '—'}</span>
                </div>
              </td>
              <td className="py-2.5 text-right tabular-nums">{r.count ? `${r.avgDays}/${TOTAL}` : '—'}</td>
              <td className="py-2.5 text-right font-bold tabular-nums">{r.count ? `${r.finishRate}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgeHistogram({ ages, compact = false }: { ages: number[]; compact?: boolean }) {
  if (!ages.length) return <p className="py-8 text-center text-small text-muted">Chưa có ai trả lời khảo sát tuổi.</p>;
  const lo = Math.min(...ages, 12), hi = Math.max(...ages, 45);
  const bins = Array.from({ length: hi - lo + 1 }, (_, i) => ({ age: lo + i, n: ages.filter((a) => a === lo + i).length }));
  const max = Math.max(1, ...bins.map((b) => b.n));
  const W = compact ? 340 : 660, H = compact ? 200 : 170, pad = { l: 22, r: 6, t: 14, b: 22 };
  const fs = compact ? 10 : 9;
  const bw = (W - pad.l - pad.r) / bins.length;
  const ih = H - pad.t - pad.b;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Biểu đồ số người theo từng tuổi">
      {[0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih - (v / max) * ih} y2={pad.t + ih - (v / max) * ih} stroke="var(--color-border)" />
          <text x={pad.l - 5} y={pad.t + ih - (v / max) * ih + 3} textAnchor="end" fontSize={fs} className="fill-[color:var(--color-muted)]">{v}</text>
        </g>
      ))}
      {bins.map((b, i) => {
        const h = (b.n / max) * ih;
        const x = pad.l + i * bw;
        return (
          <g key={b.age}>
            <title>{`${b.age} tuổi: ${b.n} người`}</title>
            <rect x={x + bw * 0.12} y={pad.t + ih - h} width={bw * 0.76} height={h} rx={Math.min(3, bw * 0.3)} fill={ageGroupOf(b.age)?.color ?? UNKNOWN_COLOR} />
            {b.age % 5 === 0 && <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={fs} className="fill-[color:var(--color-muted)]">{b.age}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function DailyTrend({ players, compact = false }: { players: AdminPlayer[]; compact?: boolean }) {
  const data = useMemo(
    () => Array.from({ length: TOTAL }, (_, i) => ({ day: i + 1, count: players.filter((p) => p.daysDone >= i + 1).length })),
    [players],
  );
  const W = compact ? 340 : 660, H = 180, pad = { l: 26, r: 10, t: 12, b: 24 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(1, players.length, ...data.map((d) => d.count));
  const x = (day: number) => pad.l + ((day - 1) / (TOTAL - 1)) * iw;
  const y = (c: number) => pad.t + ih - (c / max) * ih;
  const line = data.map((d) => `${x(d.day).toFixed(1)},${y(d.count).toFixed(1)}`).join(' ');
  const area = `M${x(1)},${pad.t + ih} L${line.replace(/ /g, ' L')} L${x(TOTAL)},${pad.t + ih} Z`;
  const gy = [...new Set([0, Math.round(max / 2), max])];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Biểu đồ số người đạt tới mỗi ngày">
      <defs>
        <linearGradient id={`trendFill-${compact ? 'compact' : 'wide'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B83556" stopOpacity="0.28" />
          <stop offset="1" stopColor="#B83556" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gy.map((v) => (
        <g key={v}>
          <line x1={pad.l} y1={y(v)} x2={W - pad.r} y2={y(v)} stroke="var(--color-border)" strokeWidth="1" />
          <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" className="fill-[color:var(--color-muted)]" fontSize="9">{v}</text>
        </g>
      ))}
      <path d={area} fill={`url(#trendFill-${compact ? 'compact' : 'wide'})`} />
      <polyline points={line} fill="none" stroke="#B83556" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d) => (
        <circle key={d.day} cx={x(d.day)} cy={y(d.count)} r={d.day === 1 || d.day === TOTAL || d.day % 7 === 0 ? 3 : 0} fill="#B83556" />
      ))}
      {[1, 7, 14].map((d) => (
        <text key={d} x={x(d)} y={H - 6} textAnchor={d === 1 ? 'start' : d === TOTAL ? 'end' : 'middle'} className="fill-[color:var(--color-muted)]" fontSize="9">Ngày {d}</text>
      ))}
    </svg>
  );
}

function FunnelRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-small">
        <span className="font-semibold text-text">{label}</span>
        <span className="font-extrabold tabular-nums" style={{ color }}>{value} <span className="text-caption font-semibold text-muted">· {pct}%</span></span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-bg">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
      </div>
    </div>
  );
}

/* ============================ NGƯỜI CHƠI ============================ */
type SortKey = 'points' | 'days' | 'streak' | 'name';

const statusText = (p: AdminPlayer) => (p.finished ? st.badgeFinished : p.eligible ? st.badgeEligible : p.daysDone > 0 ? st.badgeActive : st.badgeIdle);

/** Xuất danh sách (theo bộ lọc/sắp xếp hiện tại) ra CSV — mở được bằng Excel/Google Sheets. */
function AgeChip({ age }: { age?: number | null }) {
  const g = ageGroupOf(age);
  if (!g) return <span className="text-caption text-muted">—</span>;
  return <span title={`${g.hint} · ${g.label}`} className="inline-block whitespace-nowrap rounded-pill px-2 py-0.5 text-caption font-bold tabular-nums" style={{ background: `${g.color}1F`, color: g.color }}>{age} tuổi</span>;
}

function exportCsv(rows: AdminPlayer[]) {
  const header = ['STT', 'Tên', 'Tuổi', 'Nhóm tuổi', 'Số ngày', 'Tổng điểm', 'Chuỗi', 'Trạng thái', 'Đã dùng Bùa'];
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const body = rows.map((p, i) => [i + 1, p.name, p.age ?? '', ageGroupOf(p.age)?.label ?? '', `${p.daysDone}/${TOTAL}`, p.points, p.streak, statusText(p), p.usedPass ? 'Có' : ''].map(esc).join(','));
  const csv = '﻿' + [header.join(','), ...body].join('\r\n'); // BOM để Excel đọc đúng tiếng Việt
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `nguoi-choi-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function PlayerStatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang tham gia' },
    { value: 'finished', label: 'Hoàn thành' },
    { value: 'idle', label: 'Chưa bắt đầu' },
  ];
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!open) return;
    optionRefs.current[options.findIndex((o) => o.value === value)]?.focus();
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open, value]);
  return <div ref={root} className="admin-status-select" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
    <button ref={trigger} type="button" aria-label="Lọc trạng thái người chơi" aria-haspopup="listbox" aria-expanded={open} aria-controls="player-status-options"
      onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); } }} className="admin-status-trigger">
      {options.find((o) => o.value === value)?.label}<Icon name="chevron-right" size={18} className={open ? '-rotate-90' : 'rotate-90'} />
    </button>
    {open && <div id="player-status-options" role="listbox" aria-label="Trạng thái người chơi" className="admin-status-options">
      {options.map((o, i) => <button key={o.value} ref={(el) => { optionRefs.current[i] = el; }} type="button" role="option" aria-selected={value === o.value} tabIndex={value === o.value ? 0 : -1}
        onClick={() => { onChange(o.value); setOpen(false); trigger.current?.focus(); }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); setOpen(false); trigger.current?.focus(); }
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
            optionRefs.current[next]?.focus();
          }
        }}>
        <span>{o.label}</span>{value === o.value && <Icon name="check" size={20} />}
      </button>)}
    </div>}
  </div>;
}

function PlayersPanel({ s }: { s: AdminStats }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('points');
  const [status, setStatus] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');

  const rows = useMemo(() => {
    const key = q.trim().toLowerCase();
    const filtered = s.players.filter((p) => (!key || p.name.toLowerCase().includes(key))
      && (status === 'all' || (status === 'finished' ? p.finished : status === 'active' ? !p.finished && p.daysDone > 0 : p.daysDone === 0))
      && (ageFilter === 'all' || (ageGroupOf(p.age)?.id ?? 'unknown') === ageFilter));
    return [...filtered].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name)
        : sort === 'days' ? b.daysDone - a.daysDone
          : sort === 'streak' ? b.streak - a.streak
            : b.points - a.points);
  }, [s.players, q, sort, status, ageFilter]);

  const pg = usePagination(rows, 20, `${q}|${sort}|${status}|${ageFilter}`, { sizes: ADMIN_PAGE_SIZES, storageKey: 'admin-players' });
  const offset = pg.from - 1; // số thứ tự liên tục qua các trang

  const SORTS: { k: SortKey; label: string }[] = [
    { k: 'points', label: 'Điểm' }, { k: 'days', label: 'Ngày' }, { k: 'streak', label: 'Chuỗi' }, { k: 'name', label: 'Tên' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5"><h2 className="admin-section-title">{st.tableTitle}</h2><span className="admin-result-count">{rows.length}/{s.totalPlayers}</span></div>
        <div className="admin-player-tools flex w-full flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên người chơi…" aria-label="Tìm người chơi"
            className="h-9 w-52 rounded-lg border border-border bg-surface px-3 text-small font-medium text-text outline-none focus:border-primary/60" />
          <PlayerStatusSelect value={status} onChange={setStatus} />
          <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} aria-label="Lọc theo độ tuổi"
            className="h-9 rounded-lg border border-border bg-surface px-2.5 text-small font-medium text-text outline-none focus:border-primary/60">
            <option value="all">Mọi độ tuổi</option>
            {AGE_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label} · {g.hint}</option>)}
            <option value="unknown">Chưa trả lời</option>
          </select>
          <div className="admin-sort flex items-center gap-1 rounded-lg p-1">
            {SORTS.map((o) => (
              <button key={o.k} onClick={() => setSort(o.k)} aria-pressed={sort === o.k}
                className={`rounded-md px-2.5 py-1 transition-colors ${sort === o.k ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={() => exportCsv(rows)} disabled={rows.length === 0}
            className="admin-export flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-small font-semibold text-text transition-colors hover:bg-bg disabled:opacity-40">
            <Icon name="arrow-right" size={15} className="rotate-90" /> Xuất CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 min-[1100px]:hidden">
        {rows.length === 0 && <p className="col-span-full rounded-2xl border border-border bg-surface px-4 py-10 text-center text-small text-muted">Không tìm thấy người chơi nào.</p>}
        {pg.slice.map((p, j) => {
          const i = offset + j;
          const b = playerBadge(p);
          return <article key={p.id} className="min-w-0 rounded-[20px] border border-border bg-surface p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bg text-title">{p.avatar}</span>
              <div className="min-w-0 flex-1"><p className="text-caption text-muted">#{i + 1}</p><h3 className="break-words text-small font-bold">{p.name}</h3></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-pill px-2.5 py-1 text-caption font-bold ${b.cls}`}>{b.text}</span><AgeChip age={p.age} />{p.usedPass && <span className="text-caption text-muted">{st.usedPass}</span>}</div>
            <dl className="mt-4 grid grid-cols-3 divide-x divide-border rounded-xl bg-bg/60 py-3 text-center">
              <div><dt className="text-caption text-muted">Tiến độ</dt><dd className="mt-1 text-small font-extrabold tabular-nums">{p.daysDone}/{TOTAL}</dd></div>
              <div><dt className="text-caption text-muted">Tổng điểm</dt><dd className="mt-1 text-small font-extrabold tabular-nums text-primary">{p.points}</dd></div>
              <div><dt className="text-caption text-muted">Chuỗi ngày</dt><dd className="mt-1 text-small font-extrabold tabular-nums">{p.streak} 🔥</dd></div>
            </dl>
          </article>;
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-[20px] border border-border bg-surface min-[1100px]:block"><Card className="min-w-[640px] divide-y divide-border/60 border-0 p-0">
        <div className="sticky top-0 z-10 flex items-center gap-2 bg-bg/80 px-3 py-2.5 text-caption font-bold uppercase tracking-wide text-muted backdrop-blur">
          <span className="w-7 text-center">#</span>
          <span className="flex-1">{st.colPlayer}</span>
          <span className="w-20 text-center">Tuổi</span>
          <span className="w-16 text-right">Chuỗi</span>
          <span className="w-14 text-right">{st.colDays}</span>
          <span className="w-16 text-right">{st.colPoints}</span>
          <span className="w-28 text-right">{st.colStatus}</span>
        </div>
        {rows.length === 0
          ? <p className="px-3 py-8 text-center text-small text-muted">Không tìm thấy người chơi nào.</p>
          : pg.slice.map((p, j) => {
            const i = offset + j;
            const b = playerBadge(p);
            return (
              <div key={p.id} className="admin-row flex items-center gap-2 px-3 py-2 text-small">
                <span className="w-7 text-center font-bold tabular-nums text-muted/70">{i + 1}</span>
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gumi-belly text-body">{p.avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  {p.usedPass && <span className="block text-caption text-muted">{st.usedPass}</span>}
                </span>
                <span className="w-20 text-center"><AgeChip age={p.age} /></span>
                <span className="w-16 text-right font-semibold tabular-nums text-accent">{p.streak}🔥</span>
                <span className="w-14 text-right font-semibold tabular-nums">{p.daysDone}/{TOTAL}</span>
                <span className="w-16 text-right font-extrabold tabular-nums text-primary">{p.points}</span>
                <span className="w-28 text-right"><span className={`inline-block whitespace-nowrap rounded-pill px-2.5 py-0.5 text-caption font-bold ${b.cls}`}>{b.text}</span></span>
              </div>
            );
          })}
      </Card></div>
      <Pagination {...pg} unit="người chơi" />
    </div>
  );
}

/* ============================ Dùng chung ============================ */
function StatCard({ icon, cls, value, label, hint, accent }: { icon: IconName; cls: string; value: string | number; label: string; hint?: string; accent?: string }) {
  return (
    <Card className="admin-kpi flex flex-col gap-2 p-4" style={accent ? ({ '--kpi': accent } as CSSProperties) : undefined}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-bg/70 ${cls}`}><Icon name={icon} size={20} filled /></span>
      <span className="text-[30px] font-extrabold leading-none tabular-nums text-text">{value}</span>
      <span className="text-caption font-semibold text-muted">{label}</span>
      {hint && <span className="text-caption text-muted/80">{hint}</span>}
    </Card>
  );
}

function playerBadge(p: AdminPlayer): { text: string; cls: string } {
  if (p.finished) return { text: st.badgeFinished, cls: 'bg-success/15 text-success' };
  if (p.eligible) return { text: st.badgeEligible, cls: 'bg-info/15 text-info' };
  if (p.daysDone > 0) return { text: st.badgeActive, cls: 'bg-accent/15 text-accent' };
  return { text: st.badgeIdle, cls: 'bg-border/50 text-muted' };
}
