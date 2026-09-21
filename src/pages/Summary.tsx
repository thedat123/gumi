import { Link } from 'react-router-dom';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Gumi } from '../components/Gumi';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';

/** S11 — Card Sugar Journey 9:16 để chia sẻ. Số liệu từ get_my_summary. */
export function Summary() {
  const state = useAsync(() => api.getSummary(), []);
  const M = vi.summary.metrics;

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
        return (
          <div className="flex flex-col items-center gap-3 pt-2">
            <div data-testid="story-card" className="grad-story flex aspect-[9/16] w-full max-w-xs flex-col items-center gap-2 rounded-card p-5 text-center text-on-primary shadow-pop">
              <p className="text-small font-bold">{vi.summary.graduated}</p>
              <Gumi state="tien_hoa" size={120} />
              <p className="text-caption">{vi.summary.evolveCaption}</p>
              <div className="mt-1 grid w-full grid-cols-2 gap-2 text-left">
                <Metric label={M.sugarCut} value={`${M.grams(s.sugarCutGrams)} · ${M.spoons(s.sugarCutSpoons)}`} />
                <Metric label={M.lowest} value={`${s.lowestLevel}%`} />
                <Metric label={M.healthy} value={`${s.healthyCount}/${s.healthyTotal}`} />
                <Metric label={M.quiz} value={`${s.quizScore}/${s.quizMax}`} />
                <Metric label={M.streak} value={`${s.streak}/${vi.journey.total}`} />
                <Metric label={vi.summary.rank} value={`#${s.rank}`} />
              </div>
              <p className="mt-auto text-body font-bold">{vi.summary.totalPoints}: {s.totalPoints}</p>
            </div>

            <p className="text-caption text-muted">{s.rankFinal ? vi.summary.final : vi.summary.provisional}</p>
            <Button block>{vi.summary.download}</Button>
            <p className="text-caption text-muted">{vi.summary.downloadNote}</p>
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
