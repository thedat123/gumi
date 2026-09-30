import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export function FeatureModal({ title, eyebrow, children, tone = 'info', onClose, action }: {
  title: string; eyebrow?: string; children: ReactNode; tone?: 'info' | 'success' | 'error' | 'fact';
  onClose: () => void; action?: ReactNode;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const palette = {
    info: 'from-[#6F3D8C] via-[#4F306D] to-[#322147]',
    success: 'from-[#167A58] via-[#135D4B] to-[#124438]',
    error: 'from-[#A73543] via-[#7C2D3E] to-[#51263A]',
    fact: 'from-[#56306F] via-[#442758] to-[#2C1D3B]',
  }[tone];
  const isFact = tone === 'fact';
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#1C1029]/75 p-3 backdrop-blur-md sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="feature-modal-title" className={`feature-modal relative max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/25 bg-gradient-to-br ${palette} p-6 text-white shadow-[0_28px_90px_rgba(20,7,30,.48)] sm:p-8 ${isFact ? 'ring-1 ring-amber-200/20' : ''}`}>
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-14 h-48 w-48 rounded-full bg-amber-300/20 blur-2xl" />
        <button type="button" onClick={onClose} aria-label="Đóng cửa sổ" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 transition-colors hover:bg-white/25"><Icon name="x" size={18} /></button>
        <div className="relative">
          {isFact && <div aria-hidden="true" className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-amber-200/35 bg-amber-200/15 text-amber-200 shadow-[0_8px_24px_rgba(0,0,0,.12)]"><Icon name="sparkle" size={25} filled /></div>}
          <span className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.13em] ${isFact ? 'border-amber-200/30 bg-amber-200/10 text-amber-100' : 'border-white/25 bg-white/10 text-white'}`}><Icon name="sparkle" size={14} filled />{eyebrow ?? 'Gumi bật mí'}</span>
          <h2 id="feature-modal-title" className="max-w-[90%] text-[clamp(1.55rem,5vw,2rem)] font-extrabold leading-[1.2] tracking-tight">{title}</h2>
          <div className={`mt-4 text-[15px] leading-relaxed sm:text-base ${isFact ? 'rounded-2xl border border-white/15 bg-white/[.08] px-4 py-4 text-white/90' : 'text-white/90'}`}>{children}</div>
          {action && <div className="mt-5">{action}</div>}
        </div>
      </section>
    </div>, document.body,
  );
}
