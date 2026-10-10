import { useMemo, useState, type CSSProperties } from 'react';
import { api } from '../api';
import { AdminShell, type AdminTab } from '../components/AdminShell';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Card } from '../components/Card';
import { Icon, type IconName } from '../components/Icon';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';
import type { AdminCheckin, AdminPlayer, AdminStats } from '../api/types';

const TABS: AdminTab[] = [
  { id: 'overview', label: 'Tổng quan', icon: 'medal' },
  { id: 'review', label: 'Duyệt ảnh', icon: 'flag' },
  { id: 'players', label: 'Người chơi', icon: 'paw' },
];

const st = vi.admin.stats;
const TOTAL = vi.journey.total;

/** S13 — Admin = DASHBOARD THỐNG KÊ thuần (tách hẳn thế giới game): KPI + biểu đồ + bảng người chơi + duyệt ảnh. */
export function Admin() {
  const [tab, setTab] = useState('overview');
  const stats = useAsync(() => api.admin.getStats(), []);
  if (tab === 'review') return <AdminShell tabs={TABS} active={tab} onSelect={setTab}><ReviewPanel /></AdminShell>;
  return (
    <AdminShell tabs={TABS} active={tab} onSelect={setTab}>
      <AsyncView state={stats}>
        {(s) => (tab === 'overview' ? <Overview s={s} /> : <PlayersPanel s={s} />)}
      </AsyncView>
    </AdminShell>
  );
}

/* ============================ DUYỆT ẢNH (gửi admin duyệt tay) ============================ */
/** Hàng đợi ảnh check-in AI chưa xác nhận được → người chơi gửi admin duyệt tay. Duyệt / Từ chối. */
function ReviewPanel() {
  const queue = useAsync(() => api.admin.listFlags(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const act = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id); setErr(null);
    try { await api.admin.setCheckinStatus(id, status); queue.reload(); }
    catch { setErr('Không cập nhật được, thử lại.'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-title font-bold">Duyệt ảnh check-in</h2>
        <p className="mt-0.5 text-small text-muted">Ảnh AI chưa chắc chắn, người chơi gửi để ban tổ chức duyệt tay. Ảnh giả → Từ chối (trừ điểm).</p>
      </div>
      {err && <Banner kind="error">{err}</Banner>}
      <AsyncView state={queue} empty={<Banner kind="success">Không còn ảnh nào chờ duyệt. 🎉</Banner>}>
        {(items) => {
          const pending = items.filter((c) => c.status === 'pending');
          if (pending.length === 0) return <Banner kind="success">Không còn ảnh nào chờ duyệt. 🎉</Banner>;
          return (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pending.map((c) => <ReviewCard key={c.id} c={c} busy={busyId === c.id} onAct={act} />)}
            </div>
          );
        }}
      </AsyncView>
    </div>
  );
}

function ReviewCard({ c, busy, onAct }: { c: AdminCheckin; busy: boolean; onAct: (id: string, s: 'approved' | 'rejected') => void }) {
  const isUrl = /^https?:\/\//.test(c.emoji);
  const mission = vi.missions[c.day - 1];
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-control border border-border bg-bg">
        {isUrl ? <img src={c.emoji} alt={`Ảnh check-in ngày ${c.day}`} className="h-full w-full object-contain" />
          : <span className="text-[64px]" aria-hidden="true">{c.emoji}</span>}
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold">{c.user}</p>
        <p className="text-caption text-muted">Ngày {c.day}{mission ? ` · ${mission.kind}` : ''}{c.level != null ? ` · AI đọc ${c.level}%` : ''}</p>
        {c.flag && <p className="mt-1 inline-block rounded-pill bg-accent/15 px-2 py-0.5 text-caption font-semibold text-accent">⚑ {c.flag}</p>}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2">
        <button onClick={() => onAct(c.id, 'rejected')} disabled={busy}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-danger/40 bg-danger/10 text-small font-bold text-danger transition-colors hover:bg-danger/15 active:scale-95 disabled:opacity-50">
          <Icon name="x" size={16} /> Từ chối
        </button>
        <button onClick={() => onAct(c.id, 'approved')} disabled={busy}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control bg-success text-small font-bold text-white shadow-pop transition-all hover:brightness-105 active:scale-95 disabled:opacity-50">
          <Icon name="check" size={16} /> Duyệt
        </button>
      </div>
    </Card>
  );
}

/* ============================ TỔNG QUAN ============================ */
function Overview({ s }: { s: AdminStats }) {
  const rate = s.totalPlayers ? Math.round((s.finishedCount / s.totalPlayers) * 100) : 0;

  // Phân bố tiến độ theo nhóm ngày hoàn thành.
  const buckets = useMemo(() => {
    const b = [
      { label: 'Chưa bắt đầu', hit: (d: number) => d === 0, color: '#9AA3B2' },
      { label: '1–7 ngày', hit: (d: number) => d >= 1 && d <= 7, color: '#EF9F2A' },
      { label: '8–14 ngày', hit: (d: number) => d >= 8 && d <= 14, color: '#55768C' },
      { label: '15–20 ngày', hit: (d: number) => d >= 15 && d <= 20, color: '#B83556' },
      { label: `Hoàn thành (${TOTAL})`, hit: (d: number) => d >= TOTAL, color: '#1F7A4D' },
    ];
    return b.map((x) => ({ label: x.label, color: x.color, count: s.players.filter((p) => x.hit(p.daysDone)).length }));
  }, [s.players]);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-small font-bold uppercase tracking-wide text-muted">Chỉ số chính</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard icon="paw" cls="text-primary" accent="#B83556" value={s.totalPlayers} label={st.totalPlayers} />
          <StatCard icon="play" cls="text-accent" accent="#EF9F2A" value={s.activePlayers} label={st.activePlayers} />
          <StatCard icon="medal" cls="text-info" accent="#55768C" value={s.eligibleCount} label={st.eligible} hint={st.eligibleHint} />
          <StatCard icon="trophy" cls="text-success" accent="#1F7A4D" value={s.finishedCount} label={st.finished} />
          <StatCard icon="star" cls="text-accent" accent="#EF9F2A" value={s.avgPoints} label={st.avgPoints} />
          <StatCard icon="flag" cls="text-primary" accent="#B83556" value={`${rate}%`} label="Tỉ lệ hoàn thành" />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
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
        <div className="flex items-center justify-between">
          <h3 className="text-body font-bold">Xu hướng theo ngày</h3>
          <span className="text-caption text-muted">Số người đạt tới mỗi ngày · tối đa {s.totalPlayers}</span>
        </div>
        <DailyTrend players={s.players} />
      </Card>
    </div>
  );
}

function DailyTrend({ players }: { players: AdminPlayer[] }) {
  const data = useMemo(
    () => Array.from({ length: TOTAL }, (_, i) => ({ day: i + 1, count: players.filter((p) => p.daysDone >= i + 1).length })),
    [players],
  );
  const W = 660, H = 180, pad = { l: 26, r: 10, t: 12, b: 24 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(1, players.length, ...data.map((d) => d.count));
  const x = (day: number) => pad.l + ((day - 1) / (TOTAL - 1)) * iw;
  const y = (c: number) => pad.t + ih - (c / max) * ih;
  const line = data.map((d) => `${x(d.day).toFixed(1)},${y(d.count).toFixed(1)}`).join(' ');
  const area = `M${x(1)},${pad.t + ih} L${line.replace(/ /g, ' L')} L${x(TOTAL)},${pad.t + ih} Z`;
  const gy = [0, Math.round(max / 2), max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Biểu đồ số người đạt tới mỗi ngày">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
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
      <path d={area} fill="url(#trendFill)" />
      <polyline points={line} fill="none" stroke="#B83556" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d) => (
        <circle key={d.day} cx={x(d.day)} cy={y(d.count)} r={d.day === 1 || d.day === TOTAL || d.day % 7 === 0 ? 3 : 0} fill="#B83556" />
      ))}
      {[1, 7, 14, 21].map((d) => (
        <text key={d} x={x(d)} y={H - 6} textAnchor="middle" className="fill-[color:var(--color-muted)]" fontSize="9">Ngày {d}</text>
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

function PlayersPanel({ s }: { s: AdminStats }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('points');

  const rows = useMemo(() => {
    const key = q.trim().toLowerCase();
    const filtered = key ? s.players.filter((p) => p.name.toLowerCase().includes(key)) : s.players;
    return [...filtered].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name)
        : sort === 'days' ? b.daysDone - a.daysDone
          : sort === 'streak' ? b.streak - a.streak
            : b.points - a.points);
  }, [s.players, q, sort]);

  const SORTS: { k: SortKey; label: string }[] = [
    { k: 'points', label: 'Điểm' }, { k: 'days', label: 'Ngày' }, { k: 'streak', label: 'Chuỗi' }, { k: 'name', label: 'Tên' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title font-bold">{st.tableTitle} · {rows.length}/{s.totalPlayers}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍  Tìm tên người chơi…" aria-label="Tìm người chơi"
            className="h-9 w-52 rounded-lg border border-border bg-surface px-3 text-small font-medium text-text outline-none focus:border-primary/60" />
          <div className="flex items-center gap-1 rounded-lg bg-bg p-1">
            {SORTS.map((o) => (
              <button key={o.k} onClick={() => setSort(o.k)} aria-pressed={sort === o.k}
                className={`rounded-md px-2.5 py-1 text-caption font-bold transition-colors ${sort === o.k ? 'bg-surface text-primary shadow-soft' : 'text-muted hover:text-text'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={() => exportCsv(rows)} disabled={rows.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-small font-bold text-on-primary shadow-pop transition-all hover:brightness-[1.05] active:scale-95 disabled:opacity-40">
            <Icon name="arrow-right" size={15} className="rotate-90" /> Xuất CSV
          </button>
        </div>
      </div>

      <Card className="divide-y divide-border/60 p-0">
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
      </Card>
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
