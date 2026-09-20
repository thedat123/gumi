import { useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Gumi } from '../components/Gumi';
import { vi } from '../content/vi';
import { errorCode, messageFor } from '../lib/errors';
import type { SugarLevel } from '../lib/sugar';

const LEVELS: SugarLevel[] = [70, 50, 30, 0];

/** S06 — Nhiệm vụ có ảnh (Day 1/3/6/9 có chọn mức đường; Day 5/8 chỉ ảnh). */
export function CheckIn() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 1;
  const m = vi.missions[day - 1];
  const [file, setFile] = useState<string | null>(null);
  const [level, setLevel] = useState<SugarLevel>(70);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);

  const needsLevel = [1, 3, 6, 9].includes(day);
  const pick = (e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0]?.name ?? null);

  const submit = async () => {
    setPhase('uploading');
    setError(null);
    try {
      await api.submitCheckin(day, level, file ?? '');
      setPhase('success');
    } catch (err) {
      setPhase('idle');
      setError(messageFor(err));
      setRetryable(errorCode(err) === 'network');
    }
  };

  if (!m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;

  if (phase === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <Gumi state="bo_pho" size={150} event="cheer" eventKey={1} />
        <Banner kind="success">{vi.checkin.success(m.points)}</Banner>
        <Link to="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.checkin.back}</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-headline font-bold">Ngày {m.day}: {m.title}</h1>
      <p className="text-small text-muted">{m.description}</p>
      {error && <Banner kind="error" action={retryable ? <Button variant="secondary" onClick={submit}>{vi.checkin.retry}</Button> : undefined}>{error}</Banner>}
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
