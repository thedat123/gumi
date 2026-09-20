import { useState } from 'react';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DayStrip } from '../components/DayStrip';
import { Gumi } from '../components/Gumi';
import { MissionCard } from '../components/MissionCard';
import { SugarPassDialog } from '../components/SugarPassDialog';
import { vi } from '../content/vi';
import { useScenario } from '../mock/ScenarioContext';
import { checkedCount, gumiStateOf } from '../mock/scenarios';

export function Dashboard() {
  const { scenario: s, event, fireEvent } = useScenario();
  const [dialog, setDialog] = useState(false);
  const [rescued, setRescued] = useState(false);
  const dying = s.days.includes('dying') && !rescued;
  const gumi = rescued ? 'bo_pho' : gumiStateOf(s);
  const rejected = s.days.includes('rejected');
  const todayDone = s.days[s.day - 1] === 'checked';
  const finished = s.days[9] === 'checked';

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col items-center gap-1 pt-2 text-center">
        <Gumi state={gumi} size={190} interactive event={event?.name ?? null} eventKey={event?.key ?? 0} />
        <p className="text-small font-semibold" data-testid="gumi-caption">{vi.gumi.caption[gumi]}</p>
        <h1 className="text-headline font-bold" data-testid="journey-title">{vi.journey.title}: {checkedCount(s)} / 10 {vi.journey.unit}</h1>
        <p className="text-small text-muted">{vi.hero.message}</p>
      </section>

      {s.phase === 'before' && <Banner kind="info">{vi.banners.before('01/10')}</Banner>}
      {dying && (
        <Banner kind="error" action={s.passAvailable ? <Button onClick={() => setDialog(true)} className="shrink-0">{vi.pass.button}</Button> : undefined}>
          {vi.banners.dying(s.passHoursLeft ?? 0)}
        </Banner>
      )}
      {rescued && <Banner kind="success">{vi.pass.success}</Banner>}
      {rejected && <Banner kind="error">{vi.banners.rejected(s.rejectedReason ?? 'không hợp lệ')}</Banner>}
      {s.id === 'missed_no_pass' && <Banner kind="info">{vi.banners.missedNoPass}</Banner>}
      {finished && s.phase !== 'ended' && <Banner kind="success">{vi.banners.finished}</Banner>}
      {s.phase === 'ended' && <Banner kind="info">{vi.banners.ended}</Banner>}

      <Card><DayStrip days={s.days} today={s.day} /></Card>

      {s.phase === 'running' && !finished && <MissionCard day={s.day} done={todayDone} />}

      <div className="grid grid-cols-3 gap-2 text-center">
        <Card><p className="text-caption text-muted">Điểm</p><p className="text-title font-bold">{s.totalPoints}</p></Card>
        <Card><p className="text-caption text-muted">Chuỗi</p><p className="text-title font-bold">{s.streak} ngày</p></Card>
        <Card><p className="text-caption text-muted">Hạng</p><p className="text-title font-bold">{s.rank ? `#${s.rank}` : '—'}</p></Card>
      </div>

      {dialog && (
        <SugarPassDialog hoursLeft={s.passHoursLeft} onCancel={() => setDialog(false)} onConfirm={() => { setDialog(false); setRescued(true); fireEvent('revive'); }} />
      )}
    </div>
  );
}
