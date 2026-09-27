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

/** Đặt mật khẩu mới — mở từ link khôi phục trong email (Supabase gắn phiên tạm vào URL). */
export function ResetPassword() {
  const nav = useNavigate();
  const { updatePassword } = useSession();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<'short' | 'mismatch' | 'invalid' | 'save' | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr('short');
    if (pw !== confirm) return setErr('mismatch');
    setErr(null);
    setBusy(true);
    try {
      await updatePassword(pw);
      setDone(true);
    } catch (e2) {
      setErr(errorCode(e2) === 'forbidden' ? 'invalid' : 'save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-hero relative mx-auto flex max-w-md flex-col gap-4 pt-2 lg:pt-8">
      <div className="auth-glow" aria-hidden="true" />
      <div className="relative flex flex-col items-center text-center">
        <div className="auth-mascot"><Gumi state={done ? 'tien_hoa' : 'bo_pho'} size={140} interactive /></div>
        <h1 className="mt-1 text-headline font-bold text-primary">{done ? vi.reset.doneTitle : vi.reset.title}</h1>
        <p className="mt-1 max-w-xs text-small text-muted">{done ? vi.reset.done : vi.reset.tagline}</p>
      </div>

      <Card>
        {done ? (
          <Button onClick={() => nav('/')} block>{vi.reset.goApp}</Button>
        ) : err === 'invalid' ? (
          <div className="flex flex-col gap-3">
            <Banner kind="error">{vi.reset.invalidLink}</Banner>
            <Link to="/forgot-password"><Button variant="secondary" block>{vi.reset.requestNew}</Button></Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <Input label={vi.reset.password} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={err === 'short' ? vi.reset.passwordShort : undefined} />
            <Input label={vi.reset.confirm} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={err === 'mismatch' ? vi.reset.passwordMismatch : undefined} />
            {err === 'save' && <Banner kind="error">{vi.reset.error}</Banner>}
            <Button type="submit" loading={busy} block>{vi.reset.submit}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
