import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Gumi } from '../components/Gumi';
import { Input } from '../components/Input';
import { vi } from '../content/vi';
import { gramsToSpoons, weeklySugarGrams, type SugarLevel } from '../lib/sugar';

const AVATARS = ['🐱', '🦊', '🐰', '🐻', '🐼', '🐯', '🐨', '🦁'];
const LEVELS: SugarLevel[] = [100, 70, 50];

export function Onboarding() {
  const nav = useNavigate();
  const [level, setLevel] = useState<SugarLevel | null>(null);
  const [drinks, setDrinks] = useState(7);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]!);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const nameOk = name.trim().length >= 2 && name.trim().length <= 30;
  const grams = level !== null ? weeklySugarGrams(level, drinks) : null;
  const submit = () => { setTouched(true); if (!nameOk || level === null) return; setBusy(true); setTimeout(() => nav('/'), 700); };

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex flex-col items-center text-center">
        <Gumi state="bo_pho" size={150} interactive />
        <h1 className="text-headline font-bold">{vi.onboarding.title}</h1>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{vi.onboarding.levelTitle}</legend>
        {LEVELS.map((l) => {
          const t = vi.onboarding.levels[l as 100 | 70 | 50];
          const on = level === l;
          return (
            <button key={l} type="button" aria-pressed={on} onClick={() => setLevel(l)}
              className={`flex min-h-11 items-center gap-3 rounded-card border-2 p-3 text-left ${on ? 'border-primary bg-surface' : 'border-border-strong bg-surface'}`}>
              <span aria-hidden="true" className="text-headline">{t.icon}</span>
              <span className="flex-1"><span className="block font-semibold">{t.name}</span><span className="text-small text-muted">{t.hint}</span></span>
              <span aria-hidden="true" className="text-title">{on ? '✔' : ''}</span>
            </button>
          );
        })}
        {touched && level === null && <p className="text-caption text-danger">⚠ Hãy chọn một mức đường.</p>}
      </fieldset>

      <Card className="flex flex-col gap-2">
        <label htmlFor="drinks" className="font-semibold">{vi.onboarding.drinksTitle}</label>
        <div className="flex items-center gap-3">
          <Button variant="secondary" aria-label="Giảm 1 ly" onClick={() => setDrinks((d) => Math.max(1, d - 1))}>−</Button>
          <output id="drinks" className="min-w-10 text-center text-title font-bold">{drinks}</output>
          <Button variant="secondary" aria-label="Tăng 1 ly" onClick={() => setDrinks((d) => Math.min(50, d + 1))}>+</Button>
        </div>
        {grams !== null && <p className="rounded-control bg-accent p-2 text-small font-semibold text-on-accent" data-testid="estimate">{vi.onboarding.estimate(grams, gramsToSpoons(grams))}</p>}
      </Card>

      <Input label={vi.onboarding.nameTitle} hint={vi.onboarding.nameHint} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} error={touched && !nameOk ? vi.onboarding.nameError : undefined} />

      <fieldset>
        <legend className="mb-2 font-semibold">{vi.onboarding.avatarTitle}</legend>
        <div className="grid grid-cols-4 gap-2">
          {AVATARS.map((a) => (
            <button key={a} type="button" aria-pressed={avatar === a} aria-label={`Avatar ${a}`} onClick={() => setAvatar(a)}
              className={`flex min-h-11 items-center justify-center rounded-control border-2 py-2 text-headline ${avatar === a ? 'border-primary bg-surface' : 'border-border-strong bg-surface'}`}>{a}</button>
          ))}
        </div>
      </fieldset>

      <Button onClick={submit} loading={busy} block>{vi.onboarding.submit}</Button>
    </div>
  );
}
