import { useState } from 'react';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';
import type { AdminCheckin, CheckinStatus } from '../api/types';

const STATUS: Record<CheckinStatus, { text: string; cls: string }> = {
  approved: { text: vi.admin.approved, cls: 'text-success' },
  rejected: { text: vi.admin.rejected, cls: 'text-danger' },
  pending: { text: vi.admin.pending, cls: 'text-muted' },
};
const DAY = 3;

/** S13 — Admin duyệt ảnh: theo ngày / ảnh bị báo cáo, hộp gỡ ảnh có lý do. */
export function Admin() {
  const [tab, setTab] = useState<'by_day' | 'flags'>('by_day');
  const byDay = useAsync(() => api.admin.listCheckins(DAY), []);
  const flags = useAsync(() => api.admin.listFlags(), []);
  const [target, setTarget] = useState<AdminCheckin | null>(null);
  const [reason, setReason] = useState<string>(vi.admin.reasons[0]!);
  const [busy, setBusy] = useState(false);

  const confirmReject = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api.admin.setCheckinStatus(target.id, 'rejected', reason);
      byDay.reload();
      flags.reload();
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { id: 'by_day' as const, label: vi.admin.tabByDay },
    { id: 'flags' as const, label: vi.admin.tabFlags },
  ];

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-headline font-bold">{vi.admin.title}</h1>
      <div className="flex gap-2" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`min-h-11 flex-1 rounded-control px-2 text-center text-small font-semibold ${tab === t.id ? 'bg-primary text-on-primary' : 'border-2 border-border-strong bg-surface'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'by_day' ? (
        <AsyncView state={byDay} empty={<Banner kind="info">{vi.admin.empty}</Banner>}>
          {(list) => (
            <>
              <h2 className="text-title font-bold">{vi.admin.day(DAY)}</h2>
              {list.length === 0 ? <Banner kind="info">{vi.admin.empty}</Banner> : (
                <div className="grid grid-cols-3 gap-2">
                  {list.map((c) => (
                    <button key={c.id} type="button" onClick={() => c.status !== 'rejected' && setTarget(c)}
                      className="flex flex-col items-center gap-1 rounded-card border border-border bg-surface p-2 text-left">
                      <span aria-hidden="true" className="flex aspect-square w-full items-center justify-center rounded-control bg-gumi-belly text-title">{c.emoji}</span>
                      <span className="text-caption font-semibold">{c.user.split(' ').slice(-1)}</span>
                      <span className={`text-caption font-semibold ${STATUS[c.status].cls}`}>{STATUS[c.status].text}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </AsyncView>
      ) : (
        <AsyncView state={flags} empty={<Banner kind="info">{vi.admin.empty}</Banner>}>
          {(list) => (
            <>
              <h2 className="text-title font-bold">{vi.admin.flagQueue}</h2>
              {list.length === 0 ? <Banner kind="info">{vi.admin.empty}</Banner> : list.map((c) => (
                <Card key={c.id} className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-card bg-gumi-belly text-headline">{c.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.user} · {vi.admin.day(c.day)}</p>
                    {c.flag && <p className="text-caption text-danger">{vi.admin.flagReason(c.flag)}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button className="px-3! py-1! text-small!" onClick={() => approve(c)}>{vi.admin.approve}</Button>
                    <Button variant="danger" className="px-3! py-1! text-small!" onClick={() => setTarget(c)}>{vi.admin.reject}</Button>
                  </div>
                </Card>
              ))}
            </>
          )}
        </AsyncView>
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
    </div>
  );

  async function approve(c: AdminCheckin) {
    // Duyệt nhanh, không cần lý do.
    try { await api.admin.setCheckinStatus(c.id, 'approved'); byDay.reload(); flags.reload(); } catch { /* bỏ qua */ }
  }
}
