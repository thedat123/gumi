import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Gumi } from '../components/Gumi';
import { Input } from '../components/Input';
import { vi } from '../content/vi';
import { messageFor } from '../lib/errors';
import { gramsToSpoons, weeklySugarGrams, type SugarLevel } from '../lib/sugar';
import { useSession } from '../app/session';
import { DATA_CONSENT_KEY, rememberDataConsent } from '../lib/consent';

const AVATARS = ['🐱', '🦊', '🐰', '🐻', '🐼', '🐯', '🐨', '🦁'];
const LEVELS: SugarLevel[] = [100, 70, 50];

/** S04 — Onboarding: chọn mức đường, số ly, tên, avatar; tạo hồ sơ rồi vào hành trình. */
export function Onboarding() {
  const nav = useNavigate();
  const { refreshProfile } = useSession();
  const [level, setLevel] = useState<SugarLevel | null>(null);
  const [drinks, setDrinks] = useState(7);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]!);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Ai chưa tick đồng ý dữ liệu lúc đăng ký (vd: tạo tài khoản bằng Google ở màn Đăng nhập) thì phải tick ở đây.
  const [askConsent] = useState(() => { try { return localStorage.getItem(DATA_CONSENT_KEY) !== '1'; } catch { return true; } });
  const [dataConsent, setDataConsent] = useState(false);

  const nameOk = name.trim().length >= 2 && name.trim().length <= 30;
  const grams = level !== null ? weeklySugarGrams(level, drinks) : null;

  const submit = async () => {
    setTouched(true);
    if (!nameOk || level === null || (askConsent && !dataConsent)) return;
    if (askConsent) rememberDataConsent();
    setBusy(true);
    setServerError(null);
    try {
      await api.createProfile({ name: name.trim(), avatar, level, drinksPerWeek: drinks });
      await refreshProfile();
      nav('/');
    } catch (e) {
      setServerError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 pt-2 lg:pt-8">
      <div className="flex flex-col items-center text-center">
        <Gumi state="bo_pho" size={150} interactive />
        <h1 className="text-headline font-bold">{vi.onboarding.title}</h1>
      </div>

      {serverError && <Banner kind="error" action={<Button variant="secondary" onClick={submit}>{vi.errors.retry}</Button>}>{serverError}</Banner>}

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
              className={`relative flex min-h-11 items-center justify-center rounded-control border-2 py-2 text-headline transition-all ${avatar === a ? 'scale-105 border-primary bg-primary/10 shadow-pop ring-2 ring-primary/40' : 'border-border-strong bg-surface hover:border-primary/50 active:scale-95'}`}>
              {a}
              {avatar === a && <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-caption font-black text-on-primary shadow-soft">✓</span>}
            </button>
          ))}
        </div>
      </fieldset>

      {askConsent && (
        <div>
          <label className={`flex items-start gap-2.5 rounded-control border-2 p-3 text-small leading-snug ${touched && !dataConsent ? 'border-danger bg-danger/5' : dataConsent ? 'border-primary/50 bg-primary/5' : 'border-border bg-surface'}`}>
            <input type="checkbox" checked={dataConsent} onChange={(e) => setDataConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" aria-invalid={touched && !dataConsent ? true : undefined} />
            <span>{vi.signup.dataConsentLabel}</span>
          </label>
          {touched && !dataConsent && <p role="alert" className="mt-1 text-caption text-danger">⚠ {vi.signup.dataConsentError}</p>}
        </div>
      )}

      <Button onClick={submit} loading={busy} block>{vi.onboarding.submit}</Button>
    </div>
  );
}
