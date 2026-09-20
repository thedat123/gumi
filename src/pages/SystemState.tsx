import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Gumi } from '../components/Gumi';
import { vi } from '../content/vi';

type Kind = 'not_found' | 'offline' | 'maintenance' | 'server_error' | 'forbidden';

const COPY: Record<Kind, { icon: string; title: string; body: string; retry: boolean }> = {
  not_found: { icon: '🔍', title: vi.errors.notFoundTitle, body: vi.errors.notFound, retry: false },
  offline: { icon: '📡', title: vi.errors.offlineTitle, body: vi.errors.offline, retry: true },
  maintenance: { icon: '🛠', title: vi.errors.maintenanceTitle, body: vi.errors.maintenance, retry: true },
  server_error: { icon: '⚠️', title: vi.errors.serverTitle, body: vi.errors.server, retry: true },
  forbidden: { icon: '🔒', title: vi.admin.forbiddenTitle, body: vi.admin.forbidden, retry: false },
};

/** Trạng thái hệ thống: 404, mất mạng, bảo trì, lỗi máy chủ, không có quyền. */
export function SystemState({ fixed = 'not_found', onRetry }: { fixed?: Kind; onRetry?: () => void }) {
  const c = COPY[fixed];
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 py-10 text-center">
      <Gumi state={fixed === 'maintenance' ? 'bo_pho' : 'hap_hoi'} size={140} />
      <div role="alert" className="flex flex-col items-center gap-2">
        <span aria-hidden="true" className="text-headline">{c.icon}</span>
        <h1 className="text-title font-bold">{c.title}</h1>
        <p className="max-w-xs text-small text-muted">{c.body}</p>
      </div>
      <div className="flex gap-2">
        {c.retry && <Button variant="secondary" onClick={onRetry ?? (() => location.reload())}>{vi.errors.retry}</Button>}
        <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.errors.home}</Link>
      </div>
    </div>
  );
}
