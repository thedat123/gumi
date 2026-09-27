import { useRef, useState } from 'react';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Gumi } from '../components/Gumi';
import { Icon, type IconName } from '../components/Icon';
import { JourneyMap } from '../components/JourneyMap';
import { StreakBoard } from '../components/StreakBoard';
import { SugarPassDialog } from '../components/SugarPassDialog';
import { vi } from '../content/vi';
import { approvedCount, gumiStage } from '../lib/scoring';
import { useAsync } from '../app/useAsync';
import type { GumiEvent } from '../api/types';

/** S05 — Trang chủ = BẢN ĐỒ HÀNH TRÌNH kiểu game: MỘT con đường liền mạch, Ngày 1 dưới chân → Ngày 21 trên đỉnh, 3 hồi nối đuôi nhau. */
export function Dashboard() {
  const state = useAsync(() => api.getJourney(), []);
  const [dialog, setDialog] = useState(false);
  const [passError, setPassError] = useState(false);
  const [event, setEvent] = useState<{ name: GumiEvent; key: number } | null>(null);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  // Ghi scrollTop vào biến CSS --sy để lớp nền xa trôi chậm (parallax); viết thẳng DOM, không re-render.
  const onMapScroll = () => { const el = mapScrollRef.current; if (el) el.style.setProperty('--sy', String(el.scrollTop)); };
  const fire = (name: GumiEvent) => setEvent((e) => ({ name, key: (e?.key ?? 0) + 1 }));

  return (
    <AsyncView state={state}>
      {(s) => {
        const finished = s.days[vi.journey.total - 1] === 'checked';
        const dying = s.days.includes('dying');
        const rejected = s.days.includes('rejected');
        const done = approvedCount(s.days);
        const progress = Math.min(1, done / vi.journey.total);

        const usePass = async () => {
          try { await api.useSugarPass(); setDialog(false); fire('revive'); state.reload(); }
          catch { setPassError(true); }
        };

        const anyBanner = s.phase === 'before' || dying || rejected || (finished && s.phase !== 'ended') || (s.phase === 'ended' && !finished);
        return (
          <>
            {/* Nền tràn viền phía sau cột — desktop không còn khoảng trống chết */}
            <div aria-hidden className="fixed inset-0 -z-10" style={{ background: 'radial-gradient(120% 80% at 50% 0%, #EAF3FB 0%, #DDE7F4 40%, #D8C8ED 68%, #EDDcc8 100%)' }} />

            {/* Bản đồ tràn viền: mobile = 1 cột; desktop = full width (cinematic full-bleed) */}
            <div className="relative mx-auto flex h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden sm:h-[calc(100dvh-4rem)]">
              {/* ===== Header cố định: HUD + banner (nội dung căn giữa dù nền tràn ngang) ===== */}
              <div className="relative z-20 shrink-0 border-b border-white/40 bg-surface/80 px-2.5 pb-2 pt-2.5 backdrop-blur-md">
               <div className="mx-auto w-full max-w-[560px]">
                <div className="flex items-center gap-2.5">
                  <Gumi state={s.gumi} size={46} progress={progress} event={event?.name ?? null} eventKey={event?.key ?? 0} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-extrabold text-primary" data-testid="gumi-caption">{vi.gumi.stage[gumiStage(s.days)]}</p>
                    <p className="truncate text-caption font-semibold text-muted">
                      <span className="tabular-nums" data-testid="journey-progress">{done}/{vi.journey.total}</span> ngày hoàn thành
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Chip icon="star" cls="text-accent" v={`${s.totalPoints}`} />
                    <Chip icon="medal" cls="text-info" v={s.rank ? `#${s.rank}` : '—'} />
                  </div>
                </div>

                <div className="mt-2.5"><StreakBoard days={s.days} today={s.day} /></div>

                {anyBanner && (
                  <div className="mt-2 flex flex-col gap-2">
                    {s.phase === 'before' && <Banner kind="info">{vi.banners.before('01/10')}</Banner>}
                    {dying && <Banner kind="error" action={s.passAvailable ? <Button onClick={() => setDialog(true)} className="shrink-0">{vi.pass.button}</Button> : undefined}>{vi.banners.dying(s.passHoursLeft ?? 0)}</Banner>}
                    {rejected && <Banner kind="error">{vi.banners.rejected(s.rejectedReason ?? 'không hợp lệ')}</Banner>}
                    {finished && s.phase !== 'ended' && <Banner kind="success">{vi.banners.finished}</Banner>}
                    {s.phase === 'ended' && !finished && <Banner kind="info">{vi.banners.ended}</Banner>}
                  </div>
                )}
               </div>
              </div>

              {/* ===== Bản đồ liền mạch 21 ngày — nền tràn full-width, lối đi ở lane giữa ===== */}
              <div ref={mapScrollRef} onScroll={onMapScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#0E4F41] pb-20">
                <JourneyMap days={s.days} today={s.day} />
              </div>
            </div>

            {dialog && <SugarPassDialog hoursLeft={s.passHoursLeft} error={passError} onCancel={() => { setDialog(false); setPassError(false); }} onConfirm={usePass} />}
          </>
        );
      }}
    </AsyncView>
  );
}

function Chip({ icon, v, cls, wide }: { icon: IconName; v: string; cls?: string; wide?: boolean }) {
  return <span className={`flex items-center justify-center gap-1 rounded-pill bg-bg/75 px-2 py-1 text-caption font-extrabold shadow-soft ${wide ? 'w-full' : ''}`}><Icon name={icon} size={13} filled className={cls} />{v}</span>;
}
