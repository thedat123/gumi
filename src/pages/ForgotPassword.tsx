import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Gumi } from '../components/Gumi';
import { Input } from '../components/Input';
import { vi } from '../content/vi';
import { useSession } from '../app/session';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Quên mật khẩu — nhập email để nhận link đặt lại. Không tiết lộ email có tồn tại hay không. */
export function ForgotPassword() {
  const { resetPassword } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<'email' | 'send' | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailOk(email)) return setError('email');
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch {
      setError('send');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-hero relative mx-auto flex max-w-md flex-col gap-4 pt-2 lg:pt-8">
      <div className="auth-glow" aria-hidden="true" />
      <div className="relative flex flex-col items-center text-center">
        <div className="auth-mascot"><Gumi state="bo_pho" size={140} interactive /></div>
        <h1 className="mt-1 text-headline font-bold text-primary">{vi.forgot.title}</h1>
        <p className="mt-1 max-w-xs text-small text-muted">{sent ? vi.forgot.sent(email) : vi.forgot.tagline}</p>
      </div>

      <Card>
        {sent ? (
          <div className="flex flex-col gap-3">
            <Banner kind="success">{vi.forgot.sentTitle}</Banner>
            <Button variant="secondary" onClick={() => setSent(false)} block>{vi.forgot.resend}</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <Input label={vi.forgot.email} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error === 'email' ? vi.forgot.emailInvalid : undefined} />
            {error === 'send' && <Banner kind="error">{vi.forgot.error}</Banner>}
            <Button type="submit" loading={busy} block>{vi.forgot.submit}</Button>
          </form>
        )}
      </Card>

      <Link to="/login" className="text-center text-small text-primary underline underline-offset-2">{vi.forgot.backToLogin}</Link>
    </div>
  );
}
