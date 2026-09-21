import type { ReactNode } from 'react';

type Kind = 'success' | 'error' | 'info';
const STYLE: Record<Kind, { box: string; icon: string; label: string }> = {
  success: { box: 'border-success text-success', icon: '✔', label: 'Thành công' },
  error: { box: 'border-danger text-danger', icon: '⚠', label: 'Lỗi' },
  info: { box: 'border-info text-info', icon: 'ℹ', label: 'Thông tin' },
};

/** Thông báo dùng biểu tượng + chữ, không chỉ dựa vào màu. Lỗi dùng role="alert". */
export function Banner({ kind = 'info', children, action }: { kind?: Kind; children: ReactNode; action?: ReactNode }) {
  const s = STYLE[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-control border-2 bg-surface p-3 text-small ${s.box}`}>
      <span aria-hidden="true" className="text-title leading-none">{s.icon}</span>
      <div className="flex-1 text-text"><span className="sr-only">{s.label}: </span>{children}</div>
      {action}
    </div>
  );
}
