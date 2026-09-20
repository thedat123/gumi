// Bảo vệ định tuyến: cần đăng nhập / cần có hồ sơ / cần quyền admin. Chờ auth tải xong mới quyết định.
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loading } from '../components/Loading';
import { SystemState } from '../pages/SystemState';
import { useSession } from './session';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

/** Đã đăng nhập nhưng chưa tạo hồ sơ → đưa về onboarding. */
export function RequireProfile({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useSession();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/welcome" replace />;
  if (!profile) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useSession();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/welcome" replace />;
  if (profile?.role !== 'admin') return <SystemState fixed="forbidden" />;
  return <>{children}</>;
}
