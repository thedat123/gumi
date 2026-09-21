import { useState } from 'react';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Gumi } from '../components/Gumi';
import { JourneyMap } from '../components/JourneyMap';
import { SugarPassDialog } from '../components/SugarPassDialog';
import { vi } from '../content/vi';
import { useScenario } from '../mock/ScenarioContext';
import { checkedCount, gumiStateOf, progressOf } from '../mock/scenarios';

/** Trang chủ = BẢN ĐỒ HÀNH TRÌNH (không phải hub có tab). Mỗi ngày mở ra như một chương. */
export function Journey() {
  const { scenario: s, event, fireEvent } = useScenario();
  const [dialog, setDialog] = useState(false);
  const [rescued, setRescued] = useState(false);
  const dying = s.days.includes('dying') && !rescued;
  const gumi = rescued ? 'bo_pho' : gumiStateOf(s);
  const rejected = s.days.includes('rejected');
  const finished = s.days[vi.journey.total - 1] === 'checked';
  const done = checkedCount(s);
  const progress = progressOf(s);

  return (
    <div className="flex flex-col gap-4">
      {/* Hero: Gumi khoẻ dần theo tiến độ + thanh chỉ số */}
      <section className="flex flex-col items-center gap-1 pt-1 text-center">
        <Gumi state={gumi} size={168} interactive progress={progress} event={event?.name ?? null} eventKey={event?.key ?? 0} />
        <p className="text-small font-semibold" data-testid="gumi-caption">{vi.gumi.caption[gumi]}</p>
        <h1 className="text-title font-bold text-muted">{vi.journey.title}</h1>
        <p className="text-headline font-bold text-primary" data-testid="journey-progress">{vi.journey.progress(done)}</p>
        <p className="text-small text-muted">{vi.hero.message}</p>
      </section>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-3!"><p className="text-caption text-muted">Điểm</p><p className="text-title font-bold text-primary">{s.totalPoints}</p></Card>
        <Card className="p-3!"><p className="text-caption text-muted">Chuỗi</p><p className="text-title font-bold">🔥 {s.streak}</p></Card>
        <Card className="p-3!"><p className="text-caption text-muted">Hạng</p><p className="text-title font-bold text-info">{s.rank ? `#${s.rank}` : '—'}</p></Card>
      </div>

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

      {/* Bản đồ hành trình 21 ngày */}
      <JourneyMap days={s.days} today={s.day} />

      {dialog && (
        <SugarPassDialog hoursLeft={s.passHoursLeft} onCancel={() => setDialog(false)} onConfirm={() => { setDialog(false); setRescued(true); fireEvent('revive'); }} />
      )}
    </div>
  );
}
