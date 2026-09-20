import type { ButtonHTMLAttributes, Ref } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; loading?: boolean; block?: boolean; ref?: Ref<HTMLButtonElement> }

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-pop',
  secondary: 'bg-surface text-text border-2 border-border-strong',
  danger: 'bg-danger text-on-primary shadow-soft',
  ghost: 'bg-transparent text-primary underline-offset-4 hover:underline',
  accent: 'bg-accent text-on-accent shadow-soft',
};

/** Vùng chạm ≥ 44px (min-h-11). Đang tải thì khoá để chống bấm đúp. */
export function Button({ variant = 'primary', loading = false, block = false, className = '', children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 text-body font-semibold transition-all active:scale-95 disabled:opacity-60 disabled:shadow-none ${block ? 'w-full' : ''} ${VARIANT[variant]} ${className}`}
    >
      {loading && <span aria-hidden="true">⏳</span>}
      {children}
    </button>
  );
}
