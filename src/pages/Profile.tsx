import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ReminderSettings } from '../components/ReminderSettings';
import { vi } from '../content/vi';
import { errorCode } from '../lib/errors';
import { useSession } from '../app/session';

const AVATARS = ['🐱', '🦊', '🐰', '🐻', '🐼', '🐯', '🐨', '🦁'];

/** S16 — Hồ sơ: đổi tên, avatar, đổi mật khẩu, đăng xuất. */
export function Profile() {
  const nav = useNavigate();
  const { profile, session, refreshProfile, signOut } = useSession();
  const [name, setName] = useState(profile?.name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[0]!);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const nameOk = name.trim().length >= 2 && name.trim().length <= 30;

  const save = async () => {
    if (!nameOk) return;
    setBusy(true);
    try {
      await api.updateProfile({ name: name.trim(), avatar });
      await refreshProfile();
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl pt-2">
      <h1 className="text-headline font-bold">{vi.profile.title}</h1>
      {session && <p className="mt-1 text-caption text-muted">{vi.session.signedInAs(session.email)}</p>}

      {/* Desktop: 2 cột (trái = danh tính, phải = đổi mật khẩu). Mobile: xếp dọc. */}
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {saved && <Banner kind="success">{vi.profile.saved}</Banner>}
          <Input label={vi.profile.name} value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setSaved(false); }} error={!nameOk && name.length > 0 ? vi.onboarding.nameError : undefined} />

          <fieldset>
            <legend className="mb-2 font-semibold">{vi.profile.avatar}</legend>
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((a) => (
                <button key={a} type="button" aria-pressed={avatar === a} aria-label={`Avatar ${a}`} onClick={() => { setAvatar(a); setSaved(false); }}
                  className={`relative flex min-h-11 items-center justify-center rounded-control border-2 py-2 text-headline transition-all ${avatar === a ? 'scale-105 border-primary bg-primary/10 shadow-pop ring-2 ring-primary/40' : 'border-border-strong bg-surface hover:border-primary/50 active:scale-95'}`}>
                  {a}
                  {avatar === a && <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-caption font-black text-on-primary shadow-soft">✓</span>}
                </button>
              ))}
            </div>
          </fieldset>

          <Button onClick={save} loading={busy} disabled={!nameOk} block>{vi.profile.save}</Button>
          <Button variant="secondary" onClick={async () => { await signOut(); nav('/welcome'); }} block>{vi.profile.logout}</Button>
        </div>

        <div className="flex flex-col gap-4">
          <ChangePassword />
          <ReminderSettings />
        </div>
      </div>
    </div>
  );
}

/** Đổi mật khẩu khi đang đăng nhập: xác thực mật khẩu hiện tại rồi đặt mật khẩu mới. */
function ChangePassword() {
  const { changePassword } = useSession();
  const t = vi.profile.password;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<'wrongCurrent' | 'short' | 'mismatch' | 'error' | null>(null);
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setErr('short');
    if (next !== confirm) return setErr('mismatch');
    setErr(null);
    setBusy(true);
    try {
      await changePassword(current, next);
      setChanged(true);
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e2) {
      setErr(errorCode(e2) === 'wrong_password' ? 'wrongCurrent' : 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <div>
          <h2 className="font-semibold">{t.title}</h2>
          <p className="mt-0.5 text-caption text-muted">{t.hint}</p>
        </div>
        {changed && <Banner kind="success">{t.changed}</Banner>}
        <Input label={t.current} type="password" autoComplete="current-password" value={current} onChange={(e) => { setCurrent(e.target.value); setChanged(false); }} error={err === 'wrongCurrent' ? t.wrongCurrent : undefined} />
        <Input label={t.next} type="password" autoComplete="new-password" value={next} onChange={(e) => { setNext(e.target.value); setChanged(false); }} error={err === 'short' ? t.short : undefined} />
        <Input label={t.confirm} type="password" autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setChanged(false); }} error={err === 'mismatch' ? t.mismatch : undefined} />
        {err === 'error' && <Banner kind="error">{t.error}</Banner>}
        <Button type="submit" loading={busy} disabled={!current || !next || !confirm} block>{t.submit}</Button>
      </form>
    </Card>
  );
}
