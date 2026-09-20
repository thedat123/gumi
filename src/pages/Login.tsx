import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
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
    <div className="mx-auto flex max-w-md flex-col gap-4 pt-2 lg:pt-10">
      {inApp && <Banner kind="info">{vi.auth.inApp}</Banner>}
      <div className="flex flex-col items-center text-center"><Gumi state="bo_pho" size={130} interactive /><h1 className="text-headline font-bold">{vi.auth.login}</h1></div>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <Input label={vi.auth.email} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error === 'email' ? vi.auth.emailInvalid : undefined} />
          <Input label={vi.auth.password} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error === 'wrong' && <Banner kind="error">{vi.auth.wrong}</Banner>}
          <Button type="submit" loading={busy} block>{vi.auth.submit}</Button>
        </form>
      </Card>
      <Link to="/signup" className="text-center text-small text-primary underline underline-offset-2">{vi.signup.title}</Link>
      <p className="text-small text-muted">{vi.auth.forgot}</p>
      <p className="text-caption text-muted">{vi.auth.consent}</p>
    </div>
  );
}
