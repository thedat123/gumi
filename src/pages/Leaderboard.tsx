import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Card } from '../components/Card';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';

/** S12 — Bảng xếp hạng Sugar Slayer. */
export function Leaderboard() {
  const state = useAsync(() => api.getLeaderboard(), []);

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-headline font-bold">🏆 <span className="text-gradient">{vi.leaderboard.title}</span></h1>
      <AsyncView state={state} empty={<Banner kind="info">{vi.leaderboard.empty}</Banner>}>
        {(lb) => (
          <>
            {lb.top.length === 0 ? (
              <Banner kind="info">{vi.leaderboard.empty}</Banner>
            ) : (
              <ol className="flex flex-col gap-2">
                {lb.top.map((r) => {
                  const podium = ['bg-accent/20 border-accent!', 'bg-pink/20 border-pink!', 'bg-info/12 border-info!'][r.rank - 1];
                  return (
                    <li key={r.rank}>
                      <Card className={`flex items-center gap-3 p-3! ${r.isMe ? 'border-2 border-primary! bg-primary/8' : podium ?? ''}`}>
                        <span className="w-7 text-center text-title font-bold" aria-label={`Hạng ${r.rank}`}>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
                        <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-pill bg-gumi-belly text-title shadow-soft">{r.avatar}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{r.name}{r.isMe ? ` (${vi.leaderboard.me})` : ''}</span>
                        <span className="font-bold text-primary">{r.points}</span>
                      </Card>
                    </li>
                  );
                })}
              </ol>
            )}
            {lb.me && (
              <div className="grad-brand flex flex-col gap-1 rounded-card p-4 text-on-primary shadow-pop">
                <p className="font-bold">{vi.leaderboard.myRank(lb.me.rank, lb.me.points)}</p>
                <p className="text-small opacity-95">{lb.me.rank <= 10 ? vi.leaderboard.inTop : vi.leaderboard.gap(lb.me.gapToTop10, lb.me.top10LastName)}</p>
              </div>
            )}
          </>
        )}
      </AsyncView>
    </div>
  );
}
