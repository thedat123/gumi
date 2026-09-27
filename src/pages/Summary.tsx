import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Gumi } from '../components/Gumi';
import { Icon } from '../components/Icon';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';
import type { CardData } from '../lib/shareCard';

/** S11 — Card Sugar Journey 9:16 để chia sẻ Story / Facebook / Instagram. Số liệu từ get_my_summary. */
export function Summary() {
  const state = useAsync(() => api.getSummary(), []);
  const M = vi.summary.metrics;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  return (
    <AsyncView state={state}>
      {(s) => {
        if (!s.eligible) {
          return (
            <div className="flex flex-col gap-4 pt-2">
              <h1 className="text-headline font-bold">{vi.summary.title}</h1>
              <Banner kind="info">{vi.summary.notEligible}</Banner>
              <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.summary.backHome}</Link>
            </div>
          );
        }

        const card: CardData = {
          heading: vi.summary.graduated,
          caption: vi.summary.evolveCaption,
          metrics: [
            { label: M.sugarCut, value: `${M.grams(s.sugarCutGrams)} · ${M.spoons(s.sugarCutSpoons)}` },
            { label: M.lowest, value: `${s.lowestLevel}%` },
            { label: M.healthy, value: `${s.healthyCount}/${s.healthyTotal}` },
            { label: M.quiz, value: `${s.quizScore}/${s.quizMax}` },
            { label: M.streak, value: `${s.streak}/${vi.journey.total}` },
            { label: vi.summary.rank, value: `#${s.rank}` },
          ],
          totalLabel: vi.summary.totalPoints,
          totalValue: `${s.totalPoints}`,
          brand: vi.app.name,
        };

        const onShare = async () => {
          setBusy(true); setNote(null);
          try {
            const { renderCard, shareImage } = await import('../lib/shareCard');
            const blob = await renderCard(card);
            const r = await shareImage(blob, { title: vi.summary.title, text: `${vi.summary.graduated} #LevelDown #BớtNgọt`, filename: 'sugar-journey.png' });
            setNote(r === 'shared' ? vi.summary.shared : vi.summary.downloaded);
          } catch { setNote(vi.summary.shareError); } finally { setBusy(false); }
        };
        const onDownload = async () => {
          setBusy(true); setNote(null);
          try {
            const { renderCard, downloadBlob } = await import('../lib/shareCard');
            downloadBlob(await renderCard(card), 'sugar-journey.png');
            setNote(vi.summary.downloaded);
          } catch { setNote(vi.summary.shareError); } finally { setBusy(false); }
        };
        const onFacebook = async () => { const { shareFacebook } = await import('../lib/shareCard'); shareFacebook(window.location.origin); };

        return (
          <div className="flex flex-col items-center gap-3 pt-2">
            <div data-testid="story-card" className="grad-story flex aspect-[9/16] w-full max-w-xs flex-col items-center gap-2 rounded-card p-5 text-center text-on-primary shadow-pop">
              <p className="text-small font-bold">{vi.summary.graduated}</p>
              <Gumi state="tien_hoa" size={120} />
              <p className="text-caption">{vi.summary.evolveCaption}</p>
              <div className="mt-1 grid w-full grid-cols-2 gap-2 text-left">
                {card.metrics.map((mt) => <Metric key={mt.label} label={mt.label} value={mt.value} />)}
              </div>
              <p className="mt-auto text-body font-bold">{vi.summary.totalPoints}: {s.totalPoints}</p>
            </div>

            <p className="text-caption text-muted">{s.rankFinal ? vi.summary.final : vi.summary.provisional}</p>

            {/* Chia sẻ Story / Instagram / Facebook */}
            <div className="flex w-full max-w-xs flex-col gap-2">
              <Button block loading={busy} onClick={onShare}>
                <span className="inline-flex items-center gap-2"><Icon name="camera" size={18} />{vi.summary.share}</span>
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" block onClick={onDownload} disabled={busy}>{vi.summary.downloadImage}</Button>
                <Button variant="secondary" block onClick={onFacebook} disabled={busy}>{vi.summary.facebook}</Button>
              </div>
            </div>
            {note && <Banner kind="success">{note}</Banner>}
            <p className="max-w-xs text-caption text-muted">{vi.summary.shareNote}</p>
            <Link to="/" className="text-small text-primary underline underline-offset-2">{vi.summary.backHome}</Link>
          </div>
        );
      }}
    </AsyncView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control bg-on-primary/15 p-2">
      <p className="text-caption opacity-90">{label}</p>
      <p className="text-small font-bold">{value}</p>
    </div>
  );
}
