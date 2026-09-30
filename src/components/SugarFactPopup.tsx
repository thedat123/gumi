import { useState } from 'react';
import { SUGAR_FACTS } from '../content/sugarFacts';
import { FeatureModal } from './FeatureModal';

export function SugarFactPopup({ day }: { day: number }) {
  const [open, setOpen] = useState(true);
  const fact = SUGAR_FACTS[day];
  if (!fact) return null;
  return <>
    <button type="button" onClick={() => setOpen(true)} className="w-full rounded-card border-2 border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-left shadow-[0_8px_24px_rgba(217,119,6,.16)] transition-transform hover:-translate-y-0.5">
      <span className="text-xs font-black uppercase tracking-[.14em] text-amber-700">✦ Gumi bật mí · Chạm để xem</span>
      <span className="mt-1 block text-base font-extrabold text-[#713623]">{fact.title}</span>
    </button>
    {open && <FeatureModal title={fact.title} eyebrow={`Fact về đường · Ngày ${day}`} tone="fact" onClose={() => setOpen(false)}
      action={<button type="button" onClick={() => setOpen(false)} className="min-h-12 w-full rounded-2xl bg-[#FFD98C] px-5 py-3 font-extrabold text-[#3B2645] shadow-[0_8px_24px_rgba(0,0,0,.18)] transition-colors hover:bg-[#FFE5AC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">Tiếp tục hành trình <span aria-hidden="true">→</span></button>}>
      <p>{fact.body}</p>
    </FeatureModal>}
  </>;
}
