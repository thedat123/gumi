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

const inApp = typeof navigator !== 'undefined' && /FBAN|FBAV|Instagram|Zalo/i.test(navigator.userAgent);
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function Login() {
  const nav = useNavigate();
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<'email' | 'wrong' | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailOk(email)) return setError('email');
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      nav('/');
    } catch (err) {
      setError(errorCode(err) === 'wrong_password' ? 'wrong' : 'wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-hero relative mx-auto flex max-w-md flex-col gap-4 pt-2 lg:pt-8">
      <div className="auth-glow" aria-hidden="true" />
      {inApp && <Banner kind="info">{vi.auth.inApp}</Banner>}
      <div className="relative flex flex-col items-center text-center">
        <div className="auth-mascot"><Gumi state="bo_pho" size={150} interactive /></div>
        <h1 className="mt-1 text-headline font-bold text-primary">{vi.auth.welcome}</h1>
        <p className="mt-1 max-w-xs text-small text-muted">{vi.auth.tagline}</p>
      </div>
      <Card>
        <div className="flex flex-col gap-3">
          {googleError && <Banner kind="error">{googleError}</Banner>}
          <GoogleButton onError={setGoogleError} />
          <div className="flex items-center gap-3 py-1 text-caption text-muted"><span className="h-px flex-1 bg-border" />{vi.auth.or}<span className="h-px flex-1 bg-border" /></div>
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <Input label={vi.auth.email} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error === 'email' ? vi.auth.emailInvalid : undefined} />
            <Input label={vi.auth.password} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error === 'wrong' && <Banner kind="error">{vi.auth.wrong}</Banner>}
            <Button type="submit" loading={busy} block>{vi.auth.submit}</Button>
          </form>
        </div>
      </Card>
      <Link to="/signup" className="text-center text-small text-primary underline underline-offset-2">{vi.signup.title}</Link>
      <p className="text-small text-muted">{vi.auth.forgot}</p>
      <p className="text-caption text-muted">{vi.auth.consent}</p>
    </div>
  );
}
