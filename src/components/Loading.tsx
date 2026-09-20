import { vi } from '../content/vi';

/** Chỉ báo đang tải, tôn trọng giảm chuyển động (spinner tắt qua CSS ở gumi/theme nếu cần). */
export function Loading({ label = vi.common.loading }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" role="status" aria-live="polite">
      <span className="spinner h-8 w-8 rounded-pill border-4 border-border border-t-primary" aria-hidden="true" />
      <span className="text-small text-muted">{label}</span>
    </div>
  );
}
