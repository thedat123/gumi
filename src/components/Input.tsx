import { useId, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; hint?: string }

/** Cỡ chữ 16px để iOS không tự phóng to khi bấm vào ô nhập. Lỗi có chữ + biểu tượng, không chỉ đổi màu. */
export function Input({ label, error, hint, className = '', ...rest }: Props) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-semibold">{label}</label>
      <input
        id={id}
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? msgId : undefined}
        className={`min-h-11 rounded-control border-2 bg-surface px-3 text-body ${error ? 'border-danger' : 'border-border-strong'} ${className}`}
      />
      {(error || hint) && (
        <p id={msgId} className={`text-caption ${error ? 'text-danger' : 'text-muted'}`}>{error ? `⚠ ${error}` : hint}</p>
      )}
    </div>
  );
}
