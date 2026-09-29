// Bảo vệ định tuyến: cần đăng nhập / cần có hồ sơ / cần quyền admin. Chờ auth tải xong mới quyết định.
import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Loading } from '../components/Loading';
import { SystemState } from '../pages/SystemState';
import { useAsync } from './useAsync';
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

/**
 * Chỉ cho vào chương/nhiệm vụ của CHẶNG ĐANG MỞ (trạng thái 'open'). Tiến trình tính
 * theo chặng đã hoàn thành, mỗi ngày một chặng: chặng đã xong / bị khoá / hoặc khi
 * hôm nay đã hoàn thành một chặng (không còn chặng 'open') đều bị đẩy về bản đồ.
 */
export function RequireToday({ children }: { children: ReactNode }) {
  const { day } = useParams();
  const { data, loading, error } = useAsync(() => api.getJourney(), []);
  if (loading) return <Loading />;
  if (error || !data) return <Navigate to="/journey" replace />;
  const st = data.days[Number(day) - 1];
  if (st !== 'open' && st !== 'dying') return <Navigate to="/journey" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useSession();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/welcome" replace />;
  if (profile?.role !== 'admin') return <SystemState fixed="forbidden" />;
  return <>{children}</>;
}
