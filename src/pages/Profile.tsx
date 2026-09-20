import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { vi } from '../content/vi';
import { useSession } from '../app/session';

const AVATARS = ['🐱', '🦊', '🐰', '🐻', '🐼', '🐯', '🐨', '🦁'];

/** S16 — Hồ sơ: đổi tên, avatar, đăng xuất. */
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
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-headline font-bold">{vi.profile.title}</h1>
      {session && <p className="text-caption text-muted">{vi.session.signedInAs(session.email)}</p>}
      {saved && <Banner kind="success">{vi.profile.saved}</Banner>}

      <Input label={vi.profile.name} value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setSaved(false); }} error={!nameOk && name.length > 0 ? vi.onboarding.nameError : undefined} />

      <fieldset>
        <legend className="mb-2 font-semibold">{vi.profile.avatar}</legend>
        <div className="grid grid-cols-4 gap-2">
          {AVATARS.map((a) => (
            <button key={a} type="button" aria-pressed={avatar === a} aria-label={`Avatar ${a}`} onClick={() => { setAvatar(a); setSaved(false); }}
              className={`flex min-h-11 items-center justify-center rounded-control border-2 py-2 text-headline ${avatar === a ? 'border-primary bg-surface' : 'border-border-strong bg-surface'}`}>{a}</button>
          ))}
        </div>
      </fieldset>

      <Button onClick={save} loading={busy} disabled={!nameOk} block>{vi.profile.save}</Button>
      <Button variant="secondary" onClick={async () => { await signOut(); nav('/welcome'); }} block>{vi.profile.logout}</Button>
    </div>
  );
}
