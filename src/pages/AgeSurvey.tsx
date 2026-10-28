import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useSession } from '../app/session';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Gumi } from '../components/Gumi';
import { vi } from '../content/vi';
import { AGE_MAX, AGE_MIN, isValidAge } from '../lib/age';

const t = vi.ageSurvey;

/** Khảo sát độ tuổi: người chơi nhập CHÍNH XÁC số tuổi, hỏi 1 lần trước khi chơi. Admin tự gom nhóm khi thống kê. */
export function AgeSurvey() {
  const nav = useNavigate();
  const { refreshProfile } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const age = text === '' ? null : Number(text);
  const valid = isValidAge(age);
  const showInvalid = touched && text !== '' && !valid;

  const bump = (d: number) => {
    const base = valid ? age! : 18;
    setText(String(Math.max(AGE_MIN, Math.min(AGE_MAX, base + d))));
    setTouched(true);
  };

  const submit = async () => {
    setTouched(true);
    if (!valid || busy) { inputRef.current?.focus(); return; }
    setBusy(true); setError(null);
    try {
      await api.setAge(age!);
      await refreshProfile();
      nav('/', { replace: true });
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="mx-auto flex max-w-md flex-col gap-5 pb-6 pt-2 lg:pt-8" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-1 rounded-2xl border-2 border-border-strong bg-surface px-4 py-2 text-small font-bold shadow-soft">
          {t.bubble}
          <span aria-hidden="true" className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-border-strong bg-surface" />
        </div>
        <Gumi state="bo_pho" size={140} interactive event={valid ? 'cheer' : null} eventKey={valid ? age! : 0} />
        <p className="mt-1 text-caption font-bold uppercase tracking-[.16em] text-muted">{t.eyebrow}</p>
        <h1 className="mt-1 text-headline font-bold">{t.title}</h1>
        <p className="mt-1 max-w-sm text-small text-muted">{t.sub}</p>
      </div>

      {error && <Banner kind="error" action={<Button type="button" variant="secondary" onClick={submit}>{vi.errors.retry}</Button>}>{error}</Banner>}

      <section className={`flex flex-col items-center gap-3 rounded-card border-2 bg-surface p-5 shadow-soft transition-colors ${showInvalid ? 'border-danger' : valid ? 'border-primary' : 'border-border-strong'}`}>
        <label htmlFor="age-input" className="text-small font-semibold text-muted">{t.label}</label>
        <div className="flex w-full items-center justify-between gap-3">
          <button type="button" aria-label={t.dec} onClick={() => bump(-1)} disabled={valid && age === AGE_MIN}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-bg text-title font-black active:scale-90 disabled:opacity-40">−</button>
          <div className="flex min-w-0 flex-1 items-baseline justify-center gap-2">
            <input id="age-input" ref={inputRef} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" autoFocus
              maxLength={2} placeholder="--" value={text}
              aria-invalid={showInvalid || undefined} aria-describedby={showInvalid ? 'age-help' : undefined}
              onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 2))}
              onBlur={() => setTouched(true)}
              className="age-input w-[2.4ch] rounded-2xl border-b-4 border-dashed border-border-strong bg-bg/60 py-1 text-center text-[60px] font-black leading-none tabular-nums text-primary caret-primary outline-none transition-colors placeholder:text-border-strong focus:border-solid focus:border-primary focus:bg-primary/5 focus:outline-none focus-visible:outline-none" />
            <span className="text-title font-bold text-muted">{t.unit}</span>
          </div>
          <button type="button" aria-label={t.inc} onClick={() => bump(1)} disabled={valid && age === AGE_MAX}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-bg text-title font-black active:scale-90 disabled:opacity-40">+</button>
        </div>
        {showInvalid && <p id="age-help" role="alert" className="text-caption font-semibold text-danger">⚠ {t.invalid}</p>}
      </section>

      <Button type="submit" loading={busy} disabled={!valid} block>{t.submit}</Button>
    </form>
  );
}
