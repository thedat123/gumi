import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GoogleButton } from '../components/GoogleButton';
import { Gumi } from '../components/Gumi';
import { Input } from '../components/Input';
import { vi } from '../content/vi';
import { errorCode } from '../lib/errors';
import { useSession } from '../app/session';
import { rememberDataConsent } from '../lib/consent';


const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
type ErrKey = 'email' | 'passwordShort' | 'passwordMismatch' | 'emailExists' | 'consent' | 'dataConsent' | null;

/** S02 — Đăng ký. Kiểm tra email/mật khẩu/đồng ý; xong thì sang onboarding. */
export function Signup() {
  const nav = useNavigate();
  const { signUp } = useSession();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [err, setErr] = useState<ErrKey>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dataConsent) return setErr('dataConsent');
    rememberDataConsent();
    if (!emailOk(email)) return setErr('email');
    if (pw.length < 8) return setErr('passwordShort');
    if (pw !== confirm) return setErr('passwordMismatch');
    if (!consent) return setErr('consent');
    setErr(null);
    setBusy(true);
    try {
      await signUp(email, pw);
      nav('/onboarding');
    } catch (e2) {
      setErr(errorCode(e2) === 'email_exists' ? 'emailExists' : null);
      if (errorCode(e2) !== 'email_exists') setErr('email');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-hero relative mx-auto flex max-w-md flex-col gap-4 pt-2 lg:pt-8">
      <div className="auth-glow" aria-hidden="true" />
      <div className="relative flex flex-col items-center text-center">
        <div className="auth-mascot"><Gumi state="bo_pho" size={112} interactive /></div>
        <h1 className="mt-1 text-headline font-bold text-primary">{vi.signup.title}</h1>
        <p className="mt-1 max-w-xs text-small text-muted">{vi.signup.subtitle}</p>
      </div>
      <Card>
        {/* Đồng ý dữ liệu — BẮT BUỘC trước mọi cách đăng ký (email lẫn Google) nên đặt trên cùng. */}
        <label className={`mb-3 flex items-start gap-2.5 rounded-control border-2 p-3 text-small leading-snug ${err === 'dataConsent' ? 'border-danger bg-danger/5' : dataConsent ? 'border-primary/50 bg-primary/5' : 'border-border bg-surface'}`}>
          <input type="checkbox" checked={dataConsent} onChange={(e) => { setDataConsent(e.target.checked); if (e.target.checked && err === 'dataConsent') setErr(null); }}
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary" aria-invalid={err === 'dataConsent' ? true : undefined} aria-describedby={err === 'dataConsent' ? 'data-consent-err' : undefined} />
          <span>{vi.signup.dataConsentLabel}</span>
        </label>
        {err === 'dataConsent' && <p id="data-consent-err" role="alert" className="-mt-1 mb-3 text-caption text-danger">⚠ {vi.signup.dataConsentError}</p>}
        <div className="mb-3 flex flex-col gap-3">
          <GoogleButton beforeStart={() => { if (dataConsent) { rememberDataConsent(); return true; } setErr('dataConsent'); return false; }} />
          <div className="flex items-center gap-3 text-caption text-muted"><span className="h-px flex-1 bg-border" />{vi.auth.or}<span className="h-px flex-1 bg-border" /></div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <Input label={vi.signup.email} type="email" inputMode="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} error={err === 'email' ? vi.signup.errors.email : undefined} />
          <Input label={vi.signup.password} type="password" autoComplete="new-password" hint={vi.signup.passwordHint} value={pw}
            onChange={(e) => setPw(e.target.value)} error={err === 'passwordShort' ? vi.signup.errors.passwordShort : undefined} />
          <Input label={vi.signup.confirm} type="password" autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} error={err === 'passwordMismatch' ? vi.signup.errors.passwordMismatch : undefined} />
          {err === 'emailExists' && <Banner kind="error">{vi.signup.errors.emailExists}</Banner>}
          <label className="flex items-start gap-2 text-small">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" aria-invalid={err === 'consent' ? true : undefined} />
            <span>{vi.signup.consentLabel} <Link to="/terms" className="text-primary underline underline-offset-2">{vi.signup.readTerms}</Link></span>
          </label>
          {err === 'consent' && <p className="text-caption text-danger">⚠ {vi.signup.consentError}</p>}
          <Button type="submit" loading={busy} block>{vi.signup.submit}</Button>
        </form>
      </Card>
      <div className="flex flex-col items-center gap-2">
        <p className="text-small text-muted">{vi.auth.haveAccount}</p>
        <Button variant="secondary" block onClick={() => nav('/login')}>{vi.auth.login}</Button>
      </div>
    </div>
  );
}
