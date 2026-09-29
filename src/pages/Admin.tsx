import { useState } from 'react';
import { api } from '../api';
import { AdminShell, type AdminTab } from '../components/AdminShell';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon, type IconName } from '../components/Icon';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';
import type { AdminCheckin, AdminPlayer, AdminStats, CheckinStatus, MissionKind } from '../api/types';

const STATUS: Record<CheckinStatus, { text: string; cls: string }> = {
  approved: { text: vi.admin.approved, cls: 'bg-success/12 text-success' },
  rejected: { text: vi.admin.rejected, cls: 'bg-danger/10 text-danger' },
  pending: { text: vi.admin.pending, cls: 'bg-border/50 text-muted' },
};

const KIND_CLS: Record<MissionKind, string> = {
  DRINK: 'bg-primary/10 text-primary', KNOW: 'bg-info/12 text-info', SHARE: 'bg-accent/15 text-accent',
  GAME: 'bg-success/12 text-success', FINAL: 'bg-danger/10 text-danger',
};

const TABS: AdminTab[] = [
  { id: 'stats', label: vi.admin.tabStats, icon: 'medal' },
  { id: 'by_day', label: vi.admin.tabByDay, icon: 'camera' },
  { id: 'flags', label: vi.admin.tabFlags, icon: 'flag' },
];
const DAYS = Array.from({ length: vi.journey.total }, (_, i) => i + 1);

/** S13 — Admin dashboard: thống kê người chơi + duyệt ảnh theo ngày (hiện mức đường AI đọc) + ảnh bị gắn cờ. */
export function Admin() {
  const [tab, setTab] = useState('stats');
  const [day, setDay] = useState(1);
  const stats = useAsync(() => api.admin.getStats(), []);
  const byDay = useAsync(() => api.admin.listCheckins(day), [day]);
  const flags = useAsync(() => api.admin.listFlags(), []);
  const [target, setTarget] = useState<AdminCheckin | null>(null);
  const [reason, setReason] = useState<string>(vi.admin.reasons[0]!);
  const [busy, setBusy] = useState(false);

  const approve = async (c: AdminCheckin) => {
    try { await api.admin.setCheckinStatus(c.id, 'approved'); byDay.reload(); flags.reload(); } catch { /* bỏ qua */ }
  };
  const confirmReject = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api.admin.setCheckinStatus(target.id, 'rejected', reason);
      byDay.reload(); flags.reload();
      setTarget(null);
    } finally { setBusy(false); }
  };

  return (
    <AdminShell tabs={TABS} active={tab} onSelect={setTab}>
      {tab === 'stats' && <AsyncView state={stats}>{(s) => <StatsPanel s={s} />}</AsyncView>}

      {tab === 'by_day' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-title font-bold">{vi.admin.tabByDay}</h1>
            <label className="flex items-center gap-2 text-small font-semibold text-muted">
              {vi.admin.day(day).split(':')[0]}
              <select value={day} onChange={(e) => setDay(Number(e.target.value))}
                className="rounded-md border border-border bg-surface px-3 py-1.5 font-semibold text-text">
                {DAYS.map((d) => <option key={d} value={d}>Ngày {d} · {vi.missions[d - 1]?.title}</option>)}
              </select>
            </label>
          </div>
          <AsyncView state={byDay} empty={<Banner kind="info">{vi.admin.empty}</Banner>}>
            {(list) => list.length === 0
              ? <Banner kind="info">{vi.admin.empty}</Banner>
              : <CheckinTable list={list} onApprove={approve} onReject={setTarget} />}
          </AsyncView>
        </div>
      )}

      {tab === 'flags' && (
        <div className="flex flex-col gap-4">
          <h1 className="text-title font-bold">{vi.admin.flagQueue}</h1>
          <AsyncView state={flags} empty={<Banner kind="info">{vi.admin.empty}</Banner>}>
            {(list) => list.length === 0
              ? <Banner kind="info">{vi.admin.empty}</Banner>
              : <CheckinTable list={list} onApprove={approve} onReject={setTarget} showFlag />}
          </AsyncView>
        </div>
      )}

      {target && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-text/50 p-4 sm:items-center" onClick={() => setTarget(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="reject-title" className="safe-bottom w-full max-w-sm rounded-card bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h2 id="reject-title" className="text-title font-bold">{vi.admin.rejectTitle}</h2>
            <p className="mt-2 text-small text-muted">{vi.admin.rejectBody}</p>
            <div className="mt-3 flex flex-col gap-2">
              {vi.admin.reasons.map((r) => (
                <label key={r} className="flex min-h-11 items-center gap-2 rounded-control border-2 border-border-strong px-3 text-small">
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="h-5 w-5" />{r}
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="danger" loading={busy} onClick={confirmReject} block>{vi.admin.confirmReject}</Button>
              <Button variant="secondary" onClick={() => setTarget(null)} block>{vi.admin.cancel}</Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

/** Bảng ảnh check-in: ảnh + người chơi + loại nhiệm vụ + mức đường AI + trạng thái + thao tác duyệt/gỡ. */
function CheckinTable({ list, onApprove, onReject, showFlag }: {
  list: AdminCheckin[]; onApprove: (c: AdminCheckin) => void; onReject: (c: AdminCheckin) => void; showFlag?: boolean;
}) {
  return (
    <Card className="divide-y divide-border/60 p-0">
      {list.map((c) => (
        <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-gumi-belly text-title">{c.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate font-semibold">
              {c.user}
              {c.kind && <span className={`rounded px-1.5 py-0.5 text-caption font-bold ${KIND_CLS[c.kind]}`}>{c.kind}</span>}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-muted">
              <span>{vi.admin.day(c.day)}</span>
              {c.level != null && <span className="flex items-center gap-1 font-semibold text-info"><Icon name="drop" size={12} filled />{c.level}% đường</span>}
              {showFlag && c.flag && <span className="font-semibold text-danger">{vi.admin.flagReason(c.flag)}</span>}
            </p>
          </div>
          <span className={`hidden shrink-0 rounded-pill px-2 py-0.5 text-caption font-bold sm:inline ${STATUS[c.status].cls}`}>{STATUS[c.status].text}</span>
          {c.status !== 'rejected' && (
            <div className="flex shrink-0 gap-1">
              <Button className="px-2.5! py-1! text-small!" onClick={() => onApprove(c)}>{vi.admin.approve}</Button>
              <Button variant="danger" className="px-2.5! py-1! text-small!" onClick={() => onReject(c)}>{vi.admin.reject}</Button>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}

const st = vi.admin.stats;

function StatCard({ icon, cls, value, label, hint }: { icon: IconName; cls: string; value: string | number; label: string; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1 p-3">
      <span className={`flex h-8 w-8 items-center justify-center rounded-control bg-bg/70 ${cls}`}><Icon name={icon} size={18} filled /></span>
      <span className="text-headline font-extrabold leading-none tabular-nums">{value}</span>
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

function StatsPanel({ s }: { s: AdminStats }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="mb-2 text-title font-bold">{st.title}</h1>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatCard icon="paw" cls="text-primary" value={s.totalPlayers} label={st.totalPlayers} />
          <StatCard icon="play" cls="text-accent" value={s.activePlayers} label={st.activePlayers} />
          <StatCard icon="medal" cls="text-info" value={s.eligibleCount} label={st.eligible} hint={st.eligibleHint} />
          <StatCard icon="trophy" cls="text-success" value={s.finishedCount} label={st.finished} />
          <StatCard icon="star" cls="text-accent" value={s.avgPoints} label={st.avgPoints} />
          <StatCard icon="flag" cls="text-danger" value={s.pendingCheckins} label={st.pending} />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-title font-bold">{st.tableTitle} · {s.totalPlayers}</h2>
        <Card className="divide-y divide-border/60 p-0">
          <div className="flex items-center gap-2 px-3 py-2 text-caption font-bold text-muted">
            <span className="flex-1">{st.colPlayer}</span>
            <span className="w-14 text-right">{st.colDays}</span>
            <span className="w-16 text-right">{st.colPoints}</span>
            <span className="w-24 text-right">{st.colStatus}</span>
          </div>
          {s.players.map((p) => {
            const b = playerBadge(p);
            return (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-small">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gumi-belly text-body">{p.avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  {p.usedPass && <span className="block text-caption text-muted">{st.usedPass}</span>}
                </span>
                <span className="w-14 text-right font-semibold tabular-nums">{p.daysDone}/{vi.journey.total}</span>
                <span className="w-16 text-right font-extrabold tabular-nums text-primary">{p.points}</span>
                <span className="w-24 text-right"><span className={`inline-block rounded-pill px-2 py-0.5 text-caption font-bold ${b.cls}`}>{b.text}</span></span>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
