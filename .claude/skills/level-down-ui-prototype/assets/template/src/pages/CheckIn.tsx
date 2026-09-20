import { useEffect, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Gumi } from '../components/Gumi';
import { vi } from '../content/vi';
import { useScenario, type CheckinMode } from '../mock/ScenarioContext';

const LEVELS = [70, 50, 30, 0];
const ERR: Partial<Record<CheckinMode, string>> = {
  error_network: vi.checkin.errors.network, not_today: vi.checkin.errors.notToday, already_done: vi.checkin.errors.already,
  level_not_allowed: vi.checkin.errors.level, photo_too_large_or_not_image: vi.checkin.errors.tooLarge,
};

export function CheckIn() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 1;
  const m = vi.missions[day - 1];
  const { checkinMode: mode, event, fireEvent } = useScenario();
  const [file, setFile] = useState<string | null>(mode === 'photo_selected' || mode === 'uploading' ? 'ly-tra-dao.jpg' : null);
  const [level, setLevel] = useState<number>(70);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'success'>(mode === 'uploading' ? 'uploading' : mode === 'success' ? 'success' : 'idle');

  useEffect(() => { // đồng bộ khi đổi chế độ từ thanh công cụ
    setPhase(mode === 'uploading' ? 'uploading' : mode === 'success' ? 'success' : 'idle');
    setFile(mode === 'photo_selected' || mode === 'uploading' || mode === 'success' ? 'ly-tra-dao.jpg' : null);
  }, [mode]);

  const submit = () => { setPhase('uploading'); setTimeout(() => { setPhase('success'); fireEvent('cheer'); }, 1200); };
  const pick = (e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0]?.name ?? null);
  const error = ERR[mode];
  const needsLevel = [1, 3, 6, 9].includes(day);

  if (!m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;
  if (phase === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <Gumi state="bo_pho" size={150} event={event?.name ?? 'cheer'} eventKey={event?.key ?? 1} />
        <Banner kind="success">{vi.checkin.success(m.points)}</Banner>
        <Link to="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.checkin.back}</Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-headline font-bold">Ngày {m.day}: {m.title}</h1>
      <p className="text-small text-muted">{m.description}</p>
      {error && <Banner kind="error" action={mode === 'error_network' ? <Button variant="secondary" onClick={submit}>{vi.checkin.retry}</Button> : undefined}>{error}</Banner>}
      <Card className="flex flex-col gap-3">
        <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-control border-2 border-dashed border-border-strong p-4 text-center font-semibold">
          {file ? `📷 ${file} · ${vi.checkin.change}` : `📷 ${vi.checkin.pick}`}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} />
        </label>
        {needsLevel && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-small font-semibold">{vi.checkin.level}</legend>
            <div className="grid grid-cols-4 gap-2">
              {LEVELS.map((l) => (
                <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={level === l}
                  className={`min-h-11 rounded-control border-2 font-semibold ${level === l ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface'}`}>{l}%</button>
              ))}
            </div>
          </fieldset>
        )}
        <Button onClick={submit} loading={phase === 'uploading'} disabled={!file} block>{phase === 'uploading' ? vi.checkin.uploading : vi.checkin.submit}</Button>
      </Card>
    </div>
  );
}
