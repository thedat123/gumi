import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { vi } from '../content/vi';
import { useScenario } from '../mock/ScenarioContext';
import { TOP10 } from '../mock/scenarios';

export function Leaderboard() {
  const { scenario: s, leaderboardMode: mode } = useScenario();
  const rows = mode === 'empty' ? [] : TOP10;
  const rank = mode === 'in_top10' ? Math.min(s.rank || 6, 10) : Math.max(s.rank, 24);
  const gap = (TOP10[9]?.points ?? 0) - s.totalPoints + 1;

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-headline font-bold">🏆 {vi.leaderboard.title}</h1>
      {mode === 'loading' && <Banner kind="info">{vi.leaderboard.loading}</Banner>}
      {mode === 'error' && <Banner kind="error" action={<Button variant="secondary">{vi.leaderboard.retry}</Button>}>{vi.leaderboard.error}</Banner>}
      {mode === 'empty' && <Banner kind="info">{vi.leaderboard.empty}</Banner>}
      {rows.length > 0 && mode !== 'loading' && mode !== 'error' && (
        <ol className="flex flex-col gap-2">
          {rows.map((r) => {
            const me = mode === 'in_top10' && r.rank === rank;
            return (
              <li key={r.rank}>
                <Card className={`flex items-center gap-3 p-3! ${me ? 'border-2 border-primary!' : ''}`}>
                  <span className="w-7 text-center font-bold" aria-label={`Hạng ${r.rank}`}>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
                  <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-pill bg-gumi-belly text-title">{r.avatar}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{r.name}{me ? ` (${vi.leaderboard.me})` : ''}</span>
                  <span className="font-bold">{r.points}</span>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
      {mode !== 'empty' && mode !== 'loading' && mode !== 'error' && (
        <Card className="flex flex-col gap-1 bg-accent border-accent! text-on-accent">
          <p className="font-bold">{vi.leaderboard.myRank(rank, s.totalPoints)}</p>
          <p className="text-small">{mode === 'in_top10' ? vi.leaderboard.inTop : vi.leaderboard.gap(gap, TOP10[9]?.name ?? '')}</p>
        </Card>
      )}
    </div>
  );
}
