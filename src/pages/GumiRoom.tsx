import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Gumi } from '../components/Gumi';
import { Icon, type IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { FoodTray } from '../components/FoodTray';
import { SugarPassDialog } from '../components/SugarPassDialog';
import { SkinPicker } from '../components/SkinPicker';
import { StreakFlame } from '../components/StreakFlame';
import { RoomDecorLayer } from '../components/RoomDecorLayer';
import { useRoomDecor } from '../app/room-decor';
import { isMuted, setMuted, setAmbience, stopAmbience } from '../lib/sfx';
import { vi } from '../content/vi';
import { actOfDay, approvedCount, gumiStage } from '../lib/scoring';
import { useAsync } from '../app/useAsync';
import type { GumiEvent } from '../api/types';
import type { Weather } from '../components/RoomScene3D';

const RoomScene2D = lazy(() => import('../components/RoomScene').then((m) => ({ default: m.RoomScene })));
const FurnitureDrawer = lazy(() => import('../components/FurnitureDrawer').then((m) => ({ default: m.FurnitureDrawer })));

// Đã bỏ hẳn hệ thời tiết. Chỉ còn ngày/đêm, điều khiển bằng chính nút sáng/tối (sun/moon) trên HUD.
// Mặc định theo giờ thật: 6h–18h là ban ngày.
const initIsDay = () => (new Date().getHours() >= 6 && new Date().getHours() < 18);

const ROOMS: { v: 'living' | 'kitchen' | 'garden'; name: string; icon: IconName }[] = [
  { v: 'living', name: 'Phòng khách', icon: 'sofa' },
  { v: 'kitchen', name: 'Nhà bếp', icon: 'utensils' },
  { v: 'garden', name: 'Ban công', icon: 'leaf' },
];

/** Cỡ Gumi tự co theo màn hình (vmin) → điện thoại nhỏ không bị tràn/che chân, desktop vẫn to. */
function useGumiSize() {
  const calc = () => {
    if (typeof window === 'undefined') return 200;
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    return Math.round(Math.max(150, Math.min(240, vmin * 0.46)));
  };
  const [size, setSize] = useState(calc);
  useEffect(() => {
    const on = () => setSize(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return size;
}

/** S05 — MÀN CHÍNH kiểu thú cưng ảo: Gumi sống trong phòng, nhiệm vụ là các nút quanh nhân vật. */
export function GumiRoom() {
  const state = useAsync(() => api.getJourney(), []);
  const { decor } = useRoomDecor();
  const nav = useNavigate();
  const [wardrobe, setWardrobe] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [warnMission, setWarnMission] = useState(false); // hỏi trước khi vào màn lúc hấp hối (tránh mất chuỗi oan)
  const [roomIdx, setRoomIdx] = useState(0);
  const [slide, setSlide] = useState<'left' | 'right' | ''>('');
  const [feed, setFeed] = useState<{ food: string; key: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [isDay, setIsDay] = useState(initIsDay); // true = ban ngày, false = ban đêm (nút sun/moon trên HUD)
  const [decorate, setDecorate] = useState(false); // chế độ trang trí (kéo-sắp nội thất) — chỉ ở phòng 2D
  const [drawerOpen, setDrawerOpen] = useState(false); // tủ nội thất (bottom sheet)
  const [event, setEvent] = useState<{ name: GumiEvent; key: number } | null>(null);
  // Keep the mascot above the action tray as cards wrap or viewport text size changes.
  const observeActions = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const roomRoot = node.closest<HTMLElement>('.full-room');
    const update = () => roomRoot?.style.setProperty('--room-actions-height', `${node.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => { observer.disconnect(); roomRoot?.style.removeProperty('--room-actions-height'); };
  }, []);
  const gumiSize = useGumiSize();
  const fire = (name: GumiEvent) => setEvent((e) => ({ name, key: (e?.key ?? 0) + 1 }));
  const feedGumi = (food: string) => setFeed((f) => ({ food, key: (f?.key ?? 0) + 1 }));
  const toggleMute = () => { const m = !muted; setMuted(m); setMutedState(m); };
  const changeRoom = (dir: 1 | -1) => { setSlide(dir > 0 ? 'left' : 'right'); setRoomIdx((i) => (i + dir + ROOMS.length) % ROOMS.length); };
  const exitDecorate = () => { setDecorate(false); setDrawerOpen(false); };

  // Âm thanh nền theo ngày/đêm (null khi tắt tiếng).
  useEffect(() => {
    setAmbience(muted ? null : (isDay ? 'day' : 'night'));
  }, [isDay, muted]);
  useEffect(() => () => stopAmbience(), []);

  return (
    <AsyncView state={state}>
      {(s) => {
        const done = approvedCount(s.days);
        const progress = Math.min(1, done / vi.journey.total);
        const stage = gumiStage(s.days);
        const roomAct = actOfDay(Math.min(Math.max(s.day, 1), vi.journey.total));
        const room = ROOMS[roomIdx]!.v;
        const todayIdx = s.day - 1;
        const todayDone = s.days[todayIdx] === 'checked';
        const m = vi.missions[todayIdx];
        const running = s.phase === 'running' && s.day >= 1 && s.day <= vi.journey.total;
        const weather: Weather = isDay ? 'day' : 'night';
        const roomBrightness = isDay ? 1 : 0.7;

        const useFreeze = async () => {
          try { await api.useStreakFreeze(); fire('revive'); state.reload(); }
          catch { state.reload(); }
        };

        return (
          <div data-room={room} className={`gumi-room game-room full-room ${decorate ? 'is-decorating' : ''} ${s.gumi === 'hap_hoi' ? 'is-dying' : ''}`}>
            <div className="room-shell">
              <header className="room-game-header">
                <div className="room-title"><span className="room-title-icon"><Icon name="paw" size={24} /></span><div><p>NGÔI NHÀ NHỎ CỦA BẠN</p><h1>Gumi Room<span>✦</span></h1></div></div>
                <span className="room-collection"><Icon name="sofa" size={15} />{decor[room].length} món đã bày</span>
              </header>
              {!decorate && <div className="room-status">                <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                  <span className="flex h-14 w-14 flex-col items-center justify-center rounded-card border-2 border-surface bg-primary text-on-primary shadow-pop sm:h-16 sm:w-16">
                    <span className="text-[10px] font-semibold uppercase leading-none opacity-85 sm:text-caption">Ngày</span>
                    <span className="text-title font-bold leading-none sm:text-headline">{Math.max(s.day, 0)}</span>
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <div className="flex gap-1.5 sm:gap-2">
                      <Stat icon="star" iconClass="text-accent" value={`${s.totalPoints}`} />
                      <Stat icon="flame" iconClass="text-primary" value={`${s.streak}`} />
                      <Stat icon="medal" iconClass="text-info" value={s.rank ? `#${s.rank}` : '—'} />
                    </div>
                    <button type="button" onClick={() => setDialog(true)} aria-label={`Bùa Hồi Sinh: còn ${s.passesLeft}. Bấm để xem`}
                      className="flex items-center gap-1 rounded-pill bg-surface/85 px-2.5 py-1 shadow-soft backdrop-blur transition-transform hover:brightness-95 active:scale-95">
                      {[0, 1].map((i) => <Icon key={i} name="heart" size={15} filled={i < s.passesLeft} className={i < s.passesLeft ? 'text-primary' : 'text-border-strong/40'} />)}
                    </button>
                  </div>

                  <Link to="/me" className="flex h-14 w-14 items-center justify-center rounded-card border border-border bg-surface text-muted shadow-soft transition-transform active:scale-95 sm:h-16 sm:w-16" aria-label="Hồ sơ"><Icon name="paw" size={24} className="text-primary" /></Link>
                </div>

</div>}
              {!decorate &&                 <div className="room-controls flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  <span className="inline-flex items-center gap-2 rounded-pill bg-surface/85 px-3 py-1.5 text-small font-bold shadow-soft backdrop-blur">
                    <Icon name={ROOMS[roomIdx]!.icon} size={17} className="text-primary" />{ROOMS[roomIdx]!.name}
                    <span className="ml-1 flex gap-1">{ROOMS.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === roomIdx ? 'bg-primary' : 'bg-border-strong/30'}`} />)}</span>
                  </span>
                  <button type="button" onClick={() => { setDecorate(true); setDrawerOpen(true); }} aria-label={vi.furniture.decorate} title={vi.furniture.decorate} className="flex h-9 items-center gap-1.5 rounded-pill bg-surface/85 px-3 text-caption font-semibold text-muted shadow-soft backdrop-blur active:scale-90"><Icon name="sofa" size={16} className="text-primary" />{vi.furniture.decorate}</button>
                  <button type="button" onClick={() => setIsDay((v) => !v)} aria-label={isDay ? 'Chuyển sang ban đêm' : 'Chuyển sang ban ngày'} title={isDay ? 'Ban ngày' : 'Ban đêm'} className="flex h-9 w-9 items-center justify-center rounded-pill bg-surface/85 text-muted shadow-soft backdrop-blur active:scale-90"><Icon name={isDay ? 'sun' : 'moon'} size={18} className={isDay ? 'text-accent' : 'text-info'} /></button>
                  <button type="button" onClick={toggleMute} aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'} className="flex h-9 w-9 items-center justify-center rounded-pill bg-surface/85 text-muted shadow-soft backdrop-blur active:scale-90"><Icon name={muted ? 'volume-off' : 'volume'} size={18} /></button>
                </div>

}
              <div className="room-play-layout">
                <section className="room-stage" aria-label={ROOMS[roomIdx]!.name}>
                  <div key={roomIdx} className={`room-world absolute inset-0 ${slide === 'left' ? 'room-in-left' : slide === 'right' ? 'room-in-right' : ''}`}>
                    <Suspense fallback={<div className="room-scene-placeholder absolute inset-0" />}>
                      <RoomScene2D act={roomAct} variant={room} weather={weather} lights={isDay} />
                    </Suspense>
                    <RoomDecorLayer room={room} act={roomAct} edit={decorate} brightness={Math.max(0.85, roomBrightness)} lightsOn={isDay} />
                  </div>
                  {!decorate && <>
                    <span className="room-stage-tag"><span />{ROOMS[roomIdx]!.name}</span>
                    <button type="button" onClick={() => changeRoom(-1)} aria-label="Phòng trước" className="room-switch room-switch-prev"><Icon name="chevron-left" size={22} /></button>
                    <button type="button" onClick={() => changeRoom(1)} aria-label="Phòng sau" className="room-switch room-switch-next"><Icon name="chevron-right" size={22} /></button>
                                    <div data-feed-target className="room-mascot flex flex-col items-center justify-end">
                  <div className="room-gumi-grounded relative" >
                    {/* Nhãn "Sugar …" bám ngay trên đầu Gumi (không trôi lên che TV), nhỏ gọn vừa đủ đọc */}
                    <span className="pointer-events-none absolute left-1/2 top-[4%] z-10 -translate-x-1/2 whitespace-nowrap rounded-pill bg-surface/92 px-2.5 py-0.5 text-caption font-bold text-primary shadow-soft backdrop-blur" data-testid="gumi-caption">{vi.gumi.stage[stage]}</span>
                    <Gumi state={s.gumi} size={gumiSize} interactive progress={progress} event={event?.name ?? null} eventKey={event?.key ?? 0} feed={feed} />
                  </div>
                </div>


                    <div className="room-stage-footer"><span>Chạm Gumi để chơi cùng</span><span>{ROOMS.map((r, i) => <button key={r.v} type="button" aria-label={r.name} aria-pressed={i === roomIdx} onClick={() => { setSlide('left'); setRoomIdx(i); }} />)}</span></div>
                  </>}
                  {decorate && <>
                    <div className="room-edit-tabs" aria-label="Chọn phòng để trang trí">{ROOMS.map((r, i) => <button key={r.v} type="button" aria-pressed={roomIdx === i} onClick={() => setRoomIdx(i)}><Icon name={r.icon} size={15} />{r.name}</button>)}</div>
                    <div className="room-edit-header"><span><Icon name="sofa" size={16} />Trang trí · {ROOMS[roomIdx]!.name}</span><Button onClick={exitDecorate}>{vi.furniture.done}</Button></div>
                    {!drawerOpen && <div className="room-edit-open"><Button onClick={() => setDrawerOpen(true)}><Icon name="plus" size={16} />{vi.furniture.open}</Button></div>}
                  </>}
                </section>
                {!decorate &&                 <div ref={observeActions} className="room-actions flex flex-col gap-2">
                  <FoodTray onFeed={feedGumi} />
                  {/* Trạng thái HẤP HỐI: hiện tình trạng + số giờ còn lại; còn Bùa thì cho cứu chuỗi */}
                  {s.gumi === 'hap_hoi' && (
                    <div className="rounded-control border-2 border-danger bg-surface/95 p-2 text-center text-small shadow-soft">
                      <p className="font-semibold text-danger">{vi.banners.dying(s.passHoursLeft ?? 0)}</p>
                      {s.streakFreezeAvailable && <Button onClick={useFreeze} className="mt-1">{vi.pass.button}</Button>}
                    </div>
                  )}
                  {running && !todayDone && m && (
                    <Link to={`/chapter/${s.day}`} onClick={(e) => { if (s.gumi === 'hap_hoi') { e.preventDefault(); setWarnMission(true); } }} className="node-today flex items-center gap-3 rounded-card border border-primary/70 bg-surface/95 p-2 pr-3 shadow-pop backdrop-blur transition-transform active:scale-[0.99]">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-primary text-on-primary"><Icon name="gamepad" size={24} /></span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block text-caption font-bold uppercase tracking-wide text-primary">Nhiệm vụ hôm nay · +{m.points}đ</span>
                        <span className="block truncate text-small font-semibold">{m.title}</span>
                      </span>
                      <Icon name="chevron-right" size={20} className="text-primary" />
                    </Link>
                  )}
                  {running && todayDone && (
                    <div className="rounded-card border-2 border-success bg-surface/95 p-2 text-center text-small font-semibold text-success shadow-soft">🎉 Hôm nay xong rồi! Hẹn Gumi ngày mai nhé.</div>
                  )}
                  {s.phase === 'before' && <div className="rounded-card border-2 border-info bg-surface/95 p-2 text-center text-small font-semibold text-info shadow-soft">{vi.banners.before('01/10')}</div>}
                  {s.phase === 'ended' && <Link to="/summary" className="rounded-card border-2 border-primary bg-surface/95 p-2 text-center text-small font-bold text-primary shadow-soft">Xem Sugar Journey của bạn →</Link>}

                  {decor[room].length === 0 && (
                    <button type="button" onClick={() => { setDecorate(true); setDrawerOpen(true); }} className="flex items-center justify-center gap-1.5 rounded-pill border border-primary/40 bg-surface/85 px-3 py-1.5 text-center text-caption font-semibold text-primary shadow-soft backdrop-blur transition-transform active:scale-95">
                      <Icon name="sofa" size={14} />{vi.furniture.emptyHint}
                    </button>
                  )}

                  <div className="room-dock flex justify-center gap-2 sm:gap-2.5">
                    <Dock to="/journey" icon="map" label="Bản đồ" badge={`${done}/${vi.journey.total}`} />
                    <Dock to="/leaderboard" icon="trophy" label="Xếp hạng" badge={s.rank ? `#${s.rank}` : undefined} />
                    <DockButton icon="shirt" label={vi.wardrobe.dock} onClick={() => setWardrobe(true)} />
                    <Dock to="/summary" icon="camera" label="Card" />
                  </div>
                </div>
}
              </div>
            </div>
            {decorate && drawerOpen && <Suspense fallback={null}><FurnitureDrawer room={room} act={roomAct} daysDone={done} onClose={() => setDrawerOpen(false)} /></Suspense>}

            {dialog && (
              <SugarPassDialog
                passesLeft={s.passesLeft}
                canUse={s.streakFreezeAvailable}
                hoursLeft={s.passHoursLeft}
                onConfirm={() => { setDialog(false); void useFreeze(); }}
                onCancel={() => setDialog(false)}
              />
            )}
            {warnMission && (
              <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-text/50 p-4 sm:items-center" onClick={() => setWarnMission(false)}>
                <div role="dialog" aria-modal="true" className="safe-bottom w-full max-w-sm rounded-card bg-surface p-5" onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-title font-bold">{vi.pass.warnTitle}</h2>
                  <p className="mt-2 text-small text-muted">{s.streakFreezeAvailable ? vi.pass.warnBody(s.streakAtRisk) : vi.pass.warnBodyNoPass}</p>
                  <div className="mt-4 flex flex-col gap-2">
                    {s.streakFreezeAvailable && (
                      <Button block onClick={async () => { setWarnMission(false); await useFreeze(); nav(`/chapter/${s.day}`); }}>{vi.pass.rescuePlay}</Button>
                    )}
                    <Button variant="danger" block onClick={() => { setWarnMission(false); nav(`/chapter/${s.day}`); }}>{vi.pass.playAnyway}</Button>
                    <Button variant="secondary" block onClick={() => setWarnMission(false)}>{vi.pass.cancel}</Button>
                  </div>
                </div>
              </div>
            )}
            {wardrobe && <SkinPicker daysDone={done} onClose={() => setWardrobe(false)} />}
          </div>
        );
      }}
    </AsyncView>
  );
}

function Stat({ icon, iconClass, value, label }: { icon: IconName; iconClass?: string; value: string; label?: string }) {
  return (
    <span className="flex min-w-0 flex-col items-center rounded-card border border-border bg-surface/92 px-2.5 py-1.5 shadow-soft backdrop-blur sm:px-3">
      <span className="flex items-center gap-1 text-body font-bold leading-none sm:text-title">
        {icon === 'flame' ? <StreakFlame size={20} /> : <Icon name={icon} size={16} filled className={iconClass} />}{value}
      </span>
      {label && <span className="text-caption font-semibold text-muted">{label}</span>}
    </span>
  );
}

function Dock({ to, icon, label, badge }: { to: string; icon: IconName; label: string; badge?: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1">
      <span className="relative flex h-12 w-12 items-center justify-center rounded-card border border-border bg-surface/95 text-muted shadow-pop transition-transform active:scale-90 sm:h-14 sm:w-14">
        <Icon name={icon} size={22} />
        {badge && <span className="absolute -right-1.5 -top-1.5 rounded-pill bg-primary px-1.5 py-0.5 text-caption font-bold leading-none text-on-primary shadow-soft">{badge}</span>}
      </span>
      <span className="rounded-pill bg-surface/80 px-2 py-0.5 text-caption font-semibold text-text backdrop-blur">{label}</span>
    </Link>
  );
}

function DockButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1">
      <span className="flex h-12 w-12 items-center justify-center rounded-card border border-border bg-surface/95 text-muted shadow-pop transition-transform active:scale-90 sm:h-14 sm:w-14"><Icon name={icon} size={22} /></span>
      <span className="rounded-pill bg-surface/80 px-2 py-0.5 text-caption font-semibold text-text backdrop-blur">{label}</span>
    </button>
  );
}
