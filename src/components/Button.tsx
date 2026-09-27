import type { ButtonHTMLAttributes, Ref } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; loading?: boolean; block?: boolean; ref?: Ref<HTMLButtonElement> }

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-pop hover:brightness-[1.06]',
  secondary: 'bg-surface text-text border border-border-strong/55 shadow-soft hover:border-border-strong',
  danger: 'bg-danger text-on-primary shadow-soft hover:brightness-[1.06]',
  ghost: 'bg-transparent text-primary underline-offset-4 hover:underline',
  accent: 'bg-accent text-on-accent shadow-soft hover:brightness-[1.04]',
};

function Spinner() {
  return (
    <svg className="spinner" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Vùng chạm ≥ 44px (min-h-11). Đang tải thì khoá để chống bấm đúp. */
export function Button({ variant = 'primary', loading = false, block = false, className = '', children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 text-body font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.97] disabled:opacity-60 disabled:shadow-none ${block ? 'w-full' : ''} ${VARIANT[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
