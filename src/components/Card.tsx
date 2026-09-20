import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`rounded-card border border-border bg-surface p-4 shadow-soft ${className}`} />;
}
