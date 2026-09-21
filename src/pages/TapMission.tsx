import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChapterTease } from '../components/ChapterTease';
import { Gumi } from '../components/Gumi';
import { vi } from '../content/vi';
import { messageFor } from '../lib/errors';

/** Nhiệm vụ GAME/KNOW/TRACKER chưa có minigame riêng: chạm để hoàn thành. Gửi submit_minigame(day). */
export function TapMission() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 1;
  const m = vi.missions[day - 1];
  const [phase, setPhase] = useState<'idle' | 'busy' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;
  const badge = vi.tap.badge[m.kind] ?? '🎮 Thử tài';

  const submit = async () => {
    setPhase('busy');
    setError(null);
    try {
      await api.submitMinigame(day);
      setPhase('success');
    } catch (err) {
      setPhase('idle');
      setError(messageFor(err));
    }
  };

  if (phase === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <Gumi state="bo_pho" size={150} progress={day / vi.journey.total} event="cheer" eventKey={1} />
        <Banner kind="success">{vi.checkin.success(m.points)}</Banner>
        <ChapterTease day={day} />
        <Link to="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.tap.back}</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between text-small">
        <span className="rounded-pill bg-accent px-3 py-1 font-semibold text-on-accent">{badge}</span>
        <span className="font-semibold">{vi.story.ui.earned(m.points)}</span>
      </div>
      <h1 className="text-headline font-bold">Ngày {m.day}: {m.title}</h1>
      <p className="text-small text-muted">{m.description}</p>
      {error && <Banner kind="error">{error}</Banner>}
      <Card className="flex flex-col items-center gap-3">
        <Gumi state="bo_pho" size={130} interactive progress={(day - 1) / vi.journey.total} />
        <Banner kind="info">{vi.tap.note}</Banner>
        <Button onClick={submit} loading={phase === 'busy'} block>{vi.tap.start}</Button>
      </Card>
    </div>
  );
}
