import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vi } from '../content/vi';
import { useSession } from '../app/session';

/** Nút "Tiếp tục với Google" — dùng ở màn Đăng nhập & Đăng ký. */
export function GoogleButton({ onError }: { onError?: (msg: string) => void }) {
  const nav = useNavigate();
  const { signInWithGoogle } = useSession();
  const [busy, setBusy] = useState(false);

  const click = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      nav('/');
    } catch {
      onError?.(vi.auth.googleError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={click} disabled={busy} aria-busy={busy || undefined}
      className="flex min-h-11 w-full items-center justify-center gap-3 rounded-control border-2 border-border-strong bg-surface px-4 text-body font-semibold text-text transition-transform active:scale-95 disabled:opacity-60">
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.5-4.6 2.5-7.5 2.5-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.5 5.5c-.5.4 6.2-4.5 6.2-15 0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {busy ? '…' : vi.auth.google}
    </button>
  );
}
