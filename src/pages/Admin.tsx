import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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

const TABS: AdminTab[] = [
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

/* ============================ DUYỆT ẢNH (gửi admin duyệt tay) ============================ */
const isSocialPhoto = (c: AdminCheckin) => c.kind === 'SHARE' || c.kind === 'FINAL' || /Đăng MXH|Tốt nghiệp/.test(c.flag ?? '');

function ReviewPanel() {
  const queue = useAsync(() => api.admin.listFlags(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [resolved, setResolved] = useState<string[]>([]);
  const pending = (queue.data ?? []).filter((c) => c.status === 'pending' && !resolved.includes(c.id));
  const socialCount = pending.filter(isSocialPhoto).length;
  const tabs = [
    { id: 'all', label: 'Tất cả ảnh', count: pending.length },
    { id: 'checkin', label: 'Check-in đồ uống', count: pending.length - socialCount },
    { id: 'social', label: 'Story & tốt nghiệp', count: socialCount },
  ];
  const act = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    if (busyId) return;
    setBusyId(id); setErr(null);
    try {
      await api.admin.setCheckinStatus(id, status, reason);
      setResolved((ids) => [...ids, id]);
    } catch { setErr('Không cập nhật được ảnh. Vui lòng thử lại.'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="admin-welcome flex flex-wrap items-center justify-between gap-6 rounded-[24px] p-6 sm:p-8">
        <div className="max-w-xl">
          <p className="mb-3 text-caption font-bold uppercase tracking-[.18em] text-white/60">GUMI · KIỂM DUYỆT NỘI DUNG</p>
          <h2 className="text-[28px] font-extrabold leading-tight text-white sm:text-[34px]">Mỗi bức ảnh, một bước tiến.</h2>
          <p className="mt-3 text-small leading-relaxed text-white/70">Xem ảnh check-in và Story, xác nhận nỗ lực của người chơi trên hành trình bớt ngọt.</p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#F2A9BC]"><Icon name="flag" size={24} /></span>
          <div><p className="text-[32px] font-extrabold leading-none tabular-nums text-white">{queue.loading ? '—' : pending.length}</p><p className="mt-1 text-caption text-white/65">ảnh đang chờ duyệt</p></div>
        </div>
      </section>
      {err && <div role="alert"><Banner kind="error">{err}</Banner></div>}
      <section className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5" aria-label="Loại ảnh">
            {tabs.map((t) => <button key={t.id} onClick={() => setFilter(t.id)} aria-pressed={filter === t.id}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-small font-bold transition-colors ${filter === t.id ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-bg'}`}>
              {t.label}<span className={`rounded-md px-1.5 py-0.5 text-caption tabular-nums ${filter === t.id ? 'bg-primary/10' : 'bg-bg'}`}>{t.count}</span>
            </button>)}
          </div>
          <input aria-label="Tìm ảnh theo tên người chơi" placeholder="Tìm tên người chơi…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-bg/50 px-4 text-small outline-none focus:border-primary sm:w-60" />
        </div>
        <AsyncView state={queue}>
          {() => {
            const items = pending.filter((c) => (filter === 'all' || (filter === 'social' ? isSocialPhoto(c) : !isSocialPhoto(c))) && c.user.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
            return items.length ? <div className="grid items-start gap-5 bg-bg/40 p-4 min-[700px]:grid-cols-2 sm:p-5 min-[1600px]:grid-cols-3">
              {items.map((c) => <ReviewCard key={c.id} c={c} busy={busyId === c.id} disabled={busyId !== null} onAct={act} />)}
            </div> : <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success"><Icon name={pending.length ? 'flag' : 'check'} size={30} /></span>
              <h3 className="text-title font-bold">{pending.length ? 'Không tìm thấy ảnh phù hợp' : 'Đã xử lý hết ảnh chờ duyệt'}</h3>
              <p className="mt-2 max-w-sm text-small text-muted">{pending.length ? 'Thử tên khác hoặc chọn một nhóm ảnh khác.' : 'Ảnh mới của người chơi sẽ xuất hiện tại đây.'}</p>
            </div>;
          }}
        </AsyncView>
      </section>
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
          <div className="min-w-0"><h3 className="truncate text-body font-bold" title={c.user}>{c.user}</h3><p className="mt-0.5 text-caption text-muted">{social ? 'Story & tốt nghiệp' : 'Check-in đồ uống'}</p></div>
          <span className="ml-auto shrink-0 rounded-pill bg-[#fff4df] px-2.5 py-1 text-[11px] font-bold text-[#946019]">Chờ duyệt</span>
        </div>
        <div className="rounded-xl bg-bg/70 p-3">
          <p className="text-small font-semibold">{mission?.title ?? `Nhiệm vụ ngày ${c.day}`}</p>
          <p className="mt-1 text-caption leading-relaxed text-muted">{c.flag || 'Người chơi gửi ảnh để xác nhận nhiệm vụ.'}</p>
          {c.level != null && <p className="mt-2 text-caption font-semibold text-info">Mức đường nhận diện: {c.level}%</p>}
        </div>
        {rejecting ? <form className="mt-auto space-y-3" onSubmit={(e) => { e.preventDefault(); if (reason.trim()) void onAct(c.id, 'rejected', reason.trim()); }}>
          <label className="block text-small font-bold" htmlFor={`reason-${c.id}`}>Lý do từ chối</label>
          <textarea id={`reason-${c.id}`} autoFocus required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cho người chơi biết ảnh cần sửa ở đâu…" disabled={disabled}
            className="min-h-24 w-full resize-y rounded-xl border border-border bg-surface p-3 text-small outline-none focus:border-primary" />
          <p className="text-caption text-muted">Lý do sẽ được gửi cho người chơi cùng thông báo từ chối.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRejecting(false)} disabled={disabled} className="min-h-11 rounded-xl border border-border text-small font-bold disabled:opacity-50">Huỷ</button>
            <button type="submit" disabled={disabled || !reason.trim()} className="min-h-11 rounded-xl bg-danger text-small font-bold text-white disabled:opacity-50">{busy ? 'Đang gửi…' : 'Gửi từ chối'}</button>
          </div>
        </form> : <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-4">
          <button onClick={() => setRejecting(true)} disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border text-small font-bold text-muted transition-colors hover:border-danger/40 hover:bg-danger/5 hover:text-danger disabled:opacity-50"><Icon name="x" size={16} />Từ chối</button>
          <button onClick={() => void onAct(c.id, 'approved')} disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#247758] text-small font-bold text-white transition-colors hover:bg-[#1c6248] disabled:opacity-50"><Icon name="check" size={16} />{busy ? 'Đang duyệt…' : 'Duyệt ảnh'}</button>
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
          <WallFeed onDelete={(id) => { if (!deleted.includes(id)) void handleDelete(id); }} />
        </div>
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
    </div>
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
function exportCsv(rows: AdminPlayer[]) {
  const header = ['STT', 'Tên', 'Số ngày', 'Tổng điểm', 'Chuỗi', 'Trạng thái', 'Đã dùng Bùa'];
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const body = rows.map((p, i) => [i + 1, p.name, `${p.daysDone}/${TOTAL}`, p.points, p.streak, statusText(p), p.usedPass ? 'Có' : ''].map(esc).join(','));
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

  const rows = useMemo(() => {
    const key = q.trim().toLowerCase();
    const filtered = s.players.filter((p) => (!key || p.name.toLowerCase().includes(key)) && (status === 'all' || (status === 'finished' ? p.finished : status === 'active' ? !p.finished && p.daysDone > 0 : p.daysDone === 0))); 
    return [...filtered].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name)
        : sort === 'days' ? b.daysDone - a.daysDone
          : sort === 'streak' ? b.streak - a.streak
            : b.points - a.points);
  }, [s.players, q, sort, status]);

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
        {rows.map((p, i) => {
          const b = playerBadge(p);
          return <article key={p.id} className="min-w-0 rounded-[20px] border border-border bg-surface p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bg text-title">{p.avatar}</span>
              <div className="min-w-0 flex-1"><p className="text-caption text-muted">#{i + 1}</p><h3 className="break-words text-small font-bold">{p.name}</h3></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-pill px-2.5 py-1 text-caption font-bold ${b.cls}`}>{b.text}</span>{p.usedPass && <span className="text-caption text-muted">{st.usedPass}</span>}</div>
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
          <span className="w-16 text-right">Chuỗi</span>
          <span className="w-14 text-right">{st.colDays}</span>
          <span className="w-16 text-right">{st.colPoints}</span>
          <span className="w-28 text-right">{st.colStatus}</span>
        </div>
        {rows.length === 0
          ? <p className="px-3 py-8 text-center text-small text-muted">Không tìm thấy người chơi nào.</p>
          : rows.map((p, i) => {
            const b = playerBadge(p);
            return (
              <div key={p.id} className="admin-row flex items-center gap-2 px-3 py-2 text-small">
                <span className="w-7 text-center font-bold tabular-nums text-muted/70">{i + 1}</span>
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gumi-belly text-body">{p.avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  {p.usedPass && <span className="block text-caption text-muted">{st.usedPass}</span>}
                </span>
                <span className="w-16 text-right font-semibold tabular-nums text-accent">{p.streak}🔥</span>
                <span className="w-14 text-right font-semibold tabular-nums">{p.daysDone}/{TOTAL}</span>
                <span className="w-16 text-right font-extrabold tabular-nums text-primary">{p.points}</span>
                <span className="w-28 text-right"><span className={`inline-block whitespace-nowrap rounded-pill px-2.5 py-0.5 text-caption font-bold ${b.cls}`}>{b.text}</span></span>
              </div>
            );
          })}
      </Card></div>
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
