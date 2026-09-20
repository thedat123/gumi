// Phiên đăng nhập + hồ sơ người chơi, dùng chung toàn app. Bọc api.auth để component không gọi trực tiếp.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { Profile, Session } from '../api/types';

interface SessionCtx {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return; }
    try { setProfile(await api.getProfile()); } catch { setProfile(null); }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await api.auth.getSession();
      if (!alive) return;
      setSession(s);
      await loadProfile(s);
      if (alive) setLoading(false);
    })();
    const unsub = api.auth.onChange(async (s) => {
      setSession(s);
      await loadProfile(s);
    });
    return () => { alive = false; unsub(); };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const s = await api.auth.signIn(email, password);
    setSession(s);
    await loadProfile(s);
  }, [loadProfile]);

  const signUp = useCallback(async (email: string, password: string) => {
    const s = await api.auth.signUp(email, password);
    setSession(s);
    await loadProfile(s);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await api.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(() => loadProfile(session), [loadProfile, session]);

  const value = useMemo<SessionCtx>(
    () => ({ session, profile, loading, signIn, signUp, signOut, refreshProfile }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSession phải nằm trong SessionProvider');
  return c;
}
