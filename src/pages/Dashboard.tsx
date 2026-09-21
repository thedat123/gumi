import { useState } from 'react';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Gumi } from '../components/Gumi';
import { JourneyMap } from '../components/JourneyMap';
import { SugarPassDialog } from '../components/SugarPassDialog';
import { vi } from '../content/vi';
import { approvedCount, gumiStage } from '../lib/scoring';
import { useAsync } from '../app/useAsync';
import type { GumiEvent } from '../api/types';

/** S05 — Trang chủ = BẢN ĐỒ HÀNH TRÌNH 21 ngày (không phải hub có tab). Mỗi ngày mở ra như một chương. */
export function Dashboard() {
  const state = useAsync(() => api.getJourney(), []);
  const [dialog, setDialog] = useState(false);
  const [passError, setPassError] = useState(false);
  const [event, setEvent] = useState<{ name: GumiEvent; key: number } | null>(null);
  const fire = (name: GumiEvent) => setEvent((e) => ({ name, key: (e?.key ?? 0) + 1 }));

  return (
    <AsyncView state={state}>
      {(s) => {
        const finished = s.days[vi.journey.total - 1] === 'checked';
        const dying = s.days.includes('dying');
        const rejected = s.days.includes('rejected');
        const done = approvedCount(s.days);
        const progress = Math.min(1, done / vi.journey.total);

        const usePass = async () => {
          try {
            await api.useSugarPass();
            setDialog(false);
            fire('revive');
            state.reload();
          } catch {
            setPassError(true);
          }
        };

        return (
          <div className="lg:grid lg:min-h-[calc(100dvh-7rem)] lg:grid-cols-[340px_1fr] lg:items-center lg:gap-8">
            <div className="flex flex-col gap-4 lg:rounded-card lg:border lg:border-border lg:bg-surface/55 lg:p-5 lg:shadow-soft lg:backdrop-blur">
            {/* Hero: Gumi khoẻ dần theo tiến độ + thanh chỉ số */}
            <section className="flex flex-col items-center gap-1 pt-1 text-center">
              <Gumi state={s.gumi} size={168} interactive progress={progress} event={event?.name ?? null} eventKey={event?.key ?? 0} />
              <span className="rounded-pill bg-pink/25 px-3 py-0.5 text-caption font-semibold text-primary" data-testid="gumi-caption">{vi.gumi.stage[gumiStage(s.days)]}</span>
              <h1 className="text-title font-bold text-muted" data-testid="journey-title">{vi.journey.title}</h1>
              <p className="text-headline font-bold text-primary" data-testid="journey-progress">{vi.journey.progress(done)}</p>
              <p className="text-small text-muted">{vi.hero.message}</p>
            </section>

            <div className="grid grid-cols-3 gap-2 text-center">
              <Card className="border-accent! bg-accent/12 p-3!"><p className="text-caption text-muted">Điểm</p><p className="text-title font-bold text-primary">{s.totalPoints}</p></Card>
              <Card className="border-pink! bg-pink/15 p-3!"><p className="text-caption text-muted">Chuỗi</p><p className="text-title font-bold text-primary">🔥 {s.streak}</p></Card>
              <Card className="border-info! bg-info/12 p-3!"><p className="text-caption text-muted">Hạng</p><p className="text-title font-bold text-info">{s.rank ? `#${s.rank}` : '—'}</p></Card>
            </div>

            {s.phase === 'before' && <Banner kind="info">{vi.banners.before('01/10')}</Banner>}
            {dying && (
              <Banner kind="error" action={s.passAvailable ? <Button onClick={() => setDialog(true)} className="shrink-0">{vi.pass.button}</Button> : undefined}>
                {vi.banners.dying(s.passHoursLeft ?? 0)}
              </Banner>
            )}
            {rejected && <Banner kind="error">{vi.banners.rejected(s.rejectedReason ?? 'không hợp lệ')}</Banner>}
            {!s.passAvailable && s.days.includes('missed') && <Banner kind="info">{vi.banners.missedNoPass}</Banner>}
            {finished && s.phase !== 'ended' && <Banner kind="success">{vi.banners.finished}</Banner>}
            {s.phase === 'ended' && !finished && <Banner kind="info">{vi.banners.ended}</Banner>}

            </div>

            {/* Bản đồ hành trình 21 ngày */}
            <div className="mt-4 min-w-0 lg:mt-0">
              <JourneyMap days={s.days} today={s.day} />
            </div>

            {dialog && (
              <SugarPassDialog hoursLeft={s.passHoursLeft} error={passError} onCancel={() => { setDialog(false); setPassError(false); }} onConfirm={usePass} />
            )}
          </div>
        );
      }}
    </AsyncView>
  );
}
