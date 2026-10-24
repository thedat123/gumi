import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Gumi } from '../components/Gumi';
import { Icon, type IconName } from '../components/Icon';
import { JourneyMap, MapErrorBoundary } from '../components/JourneyMap';
import { StreakBoard } from '../components/StreakBoard';
import { SugarPassDialog } from '../components/SugarPassDialog';
import { WallFeed } from '../components/WallFeed';
import { useMediaQuery } from '../components/Pagination';
import { vi } from '../content/vi';
import { ACT_STARTS, approvedCount, gumiStage } from '../lib/scoring';
import { useAsync, useIdlePrefetch } from '../app/useAsync';
import type { DayState, GumiEvent } from '../api/types';

/** S05 — Trang chủ = BẢN ĐỒ HÀNH TRÌNH kiểu game: MỘT con đường liền mạch, Ngày 1 dưới chân → Ngày 14 trên đỉnh, 2 hồi nối đuôi nhau. */
export function Dashboard() {
  const state = useAsync(() => api.getJourney(), [], 'journey');
  useIdlePrefetch([['leaderboard', () => api.getLeaderboard()], ['summary', () => api.getSummary()]]);
  const [dialog, setDialog] = useState(false);
  const [event, setEvent] = useState<{ name: GumiEvent; key: number } | null>(null);
  const [tab, setTab] = useState<'journey' | 'wall'>('journey');
  const fire = useCallback((name: GumiEvent) => setEvent((e) => ({ name, key: (e?.key ?? 0) + 1 })), []);

  return (
    /* Bản đồ tràn viền — nền đặt trực tiếp trên container (không dùng position:fixed -z-10
       vì trên Android gây GPU compositing artifact → nhấp nháy vô hạn). */
    <div className="journey-viewport journey-bg-fixed relative mx-auto flex w-full flex-col overflow-hidden">
        <AsyncView state={state}>
          {(s) => {
            // Phòng thủ: chỉ lấy đúng số ngày của hành trình (bỏ ngày thừa nếu backend trả > total).
            const days = s.days.slice(0, vi.journey.total);
            const today = Math.min(s.day, vi.journey.total);
            const finished = days[vi.journey.total - 1] === 'checked';
            const dying = s.streakFreezeAvailable;
            const rejected = days.includes('rejected');
            const done = approvedCount(days);
            const progress = Math.min(1, done / vi.journey.total);

            // Lỗi (chưa lỡ ngày / hết Bùa / mạng) do hộp thoại tự hiển thị → ở đây chỉ xử lý khi THÀNH CÔNG.
            const usePass = async () => { await api.useStreakFreeze(); setDialog(false); fire('revive'); state.reload(); };

            const anyBanner = s.phase === 'before' || dying || rejected || (finished && s.phase !== 'ended') || (s.phase === 'ended' && !finished);
            return (
              <>
                {/* ===== Header cố định: HUD + banner (nội dung căn giữa dù nền tràn ngang) ===== */}
                <div className="journey-hud relative z-20 shrink-0 border-b border-white/40 bg-surface/80 px-2.5 pb-2 pt-2.5 backdrop-blur-md">
                 <div className="mx-auto w-full max-w-[560px]">
                  <div className="flex items-center gap-2.5">
                    <Gumi state={s.gumi} size={46} progress={progress} event={event?.name ?? null} eventKey={event?.key ?? 0} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-extrabold text-primary" data-testid="gumi-caption">{vi.gumi.stage[gumiStage(days)]}</p>
                      <p className="truncate text-caption font-semibold text-muted">
                        <span className="tabular-nums" data-testid="journey-progress">{done}/{vi.journey.total}</span> ngày hoàn thành
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Chip icon="star" cls="text-accent" v={`${s.totalPoints}`} />
                      <Chip icon="medal" cls="text-info" v={s.rank ? `#${s.rank}` : '—'} />
                    </div>
                  </div>

                  <div className="mt-2.5"><StreakBoard days={days} today={today} streak={s.streak} /></div>

                  {/* Tab switcher: Hành trình | Tường cộng đồng (chỉ hiện wall sau khi hoàn thành) */}
                  <div className="mt-2.5 flex gap-1 rounded-xl bg-bg/60 p-1">
                    <TabBtn active={tab === 'journey'} onClick={() => setTab('journey')} icon="map">Hành trình</TabBtn>
                    {finished && <TabBtn active={tab === 'wall'} onClick={() => setTab('wall')} icon="sparkle">Tường cộng đồng</TabBtn>}
                  </div>

                  {anyBanner && tab === 'journey' && (
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

                {/* ===== Nội dung chính theo tab ===== */}
                {tab === 'journey' ? (
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-none bg-[#0E4F41] pb-20">
                    <MapErrorBoundary>
                      <DeferredMap days={days} today={today} replayAll={s.replayAll} />
                    </MapErrorBoundary>
                  </div>
                ) : (
                  <WallTab />
                )}

                {dialog && <SugarPassDialog hoursLeft={s.passHoursLeft} passesLeft={s.passesLeft} canUse={s.streakFreezeAvailable} onCancel={() => setDialog(false)} onConfirm={usePass} />}
              </>
            );
          }}
        </AsyncView>
    </div>
  );
}

/** Hiển thị JourneyMap sau 1 task boundary: HUD paint trước, map render sau.
 *  Tránh long-task ANR trên Galaxy A32 (Helio G80 CPU chậm). */
function DeferredMap({ days, today, replayAll }: { days: DayState[]; today: number; replayAll?: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, []);
  // Chờ 1 nhịp: tô sẵn đúng màu dải bản đồ của hồi đang chơi → không nháy nền tối/trắng trước khi map hiện.
  if (!ready) return <div className="h-full min-h-[60vh]" style={{ background: today >= ACT_STARTS[1]! ? '#5B4E90' : '#1E8069' }} aria-hidden="true" />;
  return <JourneyMap days={days} today={today} replayAll={replayAll} />;
}

/** Tường cộng đồng: ĐIỆN THOẠI = khung cố định lấp phần còn lại trên menu dưới, bài dài thì cuộn BÊN TRONG khung;
 *  DESKTOP = chia trang 8 bài/trang. */
function WallTab() {
  const desktop = useMediaQuery('(min-width: 768px)');
  const title = (
    <p className="mb-3 flex shrink-0 items-center gap-1.5 text-caption font-bold uppercase tracking-widest text-muted">
      <Icon name="sparkle" size={13} filled className="text-accent" />Tường cộng đồng
    </p>
  );
  if (desktop) return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24">
      <div className="mx-auto max-w-[640px] px-3 pt-4">{title}<WallFeed pageSize={10} pageSizes={[5, 10, 20, 50]} storageKey="wall" /></div>
    </div>
  );
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col px-3 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      {title}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-card border border-border bg-surface/60 p-2 [-webkit-overflow-scrolling:touch]">
        <WallFeed />
      </div>
    </div>
  );
}

function Chip({ icon, v, cls, wide }: { icon: IconName; v: string; cls?: string; wide?: boolean }) {
  return <span className={`flex items-center justify-center gap-1 rounded-pill bg-bg/75 px-2 py-1 text-caption font-extrabold shadow-soft ${wide ? 'w-full' : ''}`}><Icon name={icon} size={13} filled className={cls} />{v}</span>;
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: IconName; children: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-small font-bold transition-colors ${active ? 'bg-surface shadow-soft text-primary' : 'text-muted'}`}>
      <Icon name={icon} size={13} filled={active} />{children}
    </button>
  );
}
