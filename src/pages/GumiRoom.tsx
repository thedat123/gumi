import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Button } from '../components/Button';
import { Gumi } from '../components/Gumi';
import { Icon, type IconName } from '../components/Icon';
import { FoodTray } from '../components/FoodTray';
import { RoomCritters } from '../components/RoomCritters';
import { SkinPicker } from '../components/SkinPicker';
import { SugarPassDialog } from '../components/SugarPassDialog';
import { isMuted, setMuted, setAmbience, stopAmbience } from '../lib/sfx';
import { vi } from '../content/vi';
import { actOfDay, approvedCount, gumiStage } from '../lib/scoring';
import { useAsync } from '../app/useAsync';
import type { GumiEvent } from '../api/types';
import type { Weather } from '../components/RoomScene3D';

const RoomScene3D = lazy(() => import('../components/RoomScene3D').then((m) => ({ default: m.RoomScene3D })));

// Chu kỳ thời tiết cho nút đổi (null = tự động theo giờ thật). Định nghĩa tại đây để không phá lazy-load scene.
const WEATHERS: { w: Weather | null; label: string; icon: IconName }[] = [
  { w: null, label: 'Tự động', icon: 'sparkle' },
  { w: 'day', label: 'Ban ngày', icon: 'sun' },
  { w: 'cloudy', label: 'Nhiều mây', icon: 'cloud' },
  { w: 'sunset', label: 'Hoàng hôn', icon: 'sun' },
  { w: 'rain', label: 'Mưa', icon: 'drop' },
  { w: 'snow', label: 'Tuyết', icon: 'sparkle' },
  { w: 'fog', label: 'Sương mù', icon: 'cloud' },
  { w: 'night', label: 'Ban đêm', icon: 'moon' },
];

const ROOMS: { v: 'living' | 'kitchen' | 'garden'; name: string; icon: IconName }[] = [
  { v: 'living', name: 'Phòng khách', icon: 'sofa' },
  { v: 'kitchen', name: 'Nhà bếp', icon: 'utensils' },
  { v: 'garden', name: 'Ban công', icon: 'leaf' },
];

/** S05 — MÀN CHÍNH kiểu thú cưng ảo: Gumi sống trong phòng, nhiệm vụ là các nút quanh nhân vật. */
export function GumiRoom() {
  const state = useAsync(() => api.getJourney(), []);
  const [dialog, setDialog] = useState(false);
  const [wardrobe, setWardrobe] = useState(false);
  const [passError, setPassError] = useState(false);
  const [roomIdx, setRoomIdx] = useState(0);
  const [slide, setSlide] = useState<'left' | 'right' | ''>('');
  const [feed, setFeed] = useState<{ food: string; key: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [weatherIdx, setWeatherIdx] = useState(0);
  const cycleWeather = () => setWeatherIdx((i) => (i + 1) % WEATHERS.length);
  const [event, setEvent] = useState<{ name: GumiEvent; key: number } | null>(null);
  const fire = (name: GumiEvent) => setEvent((e) => ({ name, key: (e?.key ?? 0) + 1 }));
  const feedGumi = (food: string) => setFeed((f) => ({ food, key: (f?.key ?? 0) + 1 }));
  const toggleMute = () => { const m = !muted; setMuted(m); setMutedState(m); };
  const changeRoom = (dir: 1 | -1) => { setSlide(dir > 0 ? 'left' : 'right'); setRoomIdx((i) => (i + dir + ROOMS.length) % ROOMS.length); };

  // Âm thanh nền theo thời tiết (null khi tắt tiếng). Auto (w=null) → suy theo giờ thật.
  useEffect(() => {
    const w = WEATHERS[weatherIdx]!.w ?? (() => { const h = new Date().getHours(); return h >= 5 && h < 16 ? 'day' as const : h >= 16 && h < 19 ? 'sunset' as const : 'night' as const; })();
    setAmbience(muted ? null : w);
  }, [weatherIdx, muted]);
  useEffect(() => () => stopAmbience(), []);

  return (
    <AsyncView state={state}>
      {(s) => {
        const done = approvedCount(s.days);
        const progress = Math.min(1, done / vi.journey.total);
        const stage = gumiStage(s.days);
        const roomAct = actOfDay(Math.min(Math.max(s.day, 1), vi.journey.total));
        const dying = s.days.includes('dying');
        const todayIdx = s.day - 1;
        const todayDone = s.days[todayIdx] === 'checked';
        const m = vi.missions[todayIdx];
        const running = s.phase === 'running' && s.day >= 1 && s.day <= vi.journey.total;

        const usePass = async () => {
          try { await api.useSugarPass(); setDialog(false); fire('revive'); state.reload(); }
          catch { setPassError(true); }
        };

        return (
          <div className="relative min-h-[calc(100dvh-3.25rem)] w-full overflow-hidden">
            <div key={roomIdx} className={`absolute inset-0 ${slide === 'left' ? 'room-in-left' : slide === 'right' ? 'room-in-right' : ''}`}>
              <Suspense fallback={<div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#F7E6DC,#E9C7B8)' }} />}>
                <RoomScene3D act={roomAct} variant={ROOMS[roomIdx]!.v} weather={WEATHERS[weatherIdx]!.w ?? undefined} />
              </Suspense>
              <RoomCritters outdoor={ROOMS[roomIdx]!.v === 'garden'} />
            </div>

            {/* Đổi phòng */}
            <button type="button" onClick={() => changeRoom(-1)} aria-label="Phòng trước" className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-pill border border-border bg-surface/85 text-muted shadow-pop backdrop-blur transition-transform active:scale-90"><Icon name="chevron-left" size={22} /></button>
            <button type="button" onClick={() => changeRoom(1)} aria-label="Phòng sau" className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-pill border border-border bg-surface/85 text-muted shadow-pop backdrop-blur transition-transform active:scale-90"><Icon name="chevron-right" size={22} /></button>

            <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3.25rem)] w-full max-w-2xl flex-col justify-between p-4 lg:p-6">
                {/* HUD trên: ngày · điểm/chuỗi/hạng · Bùa + hồ sơ */}
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-16 w-16 flex-col items-center justify-center rounded-card border-2 border-surface bg-primary text-on-primary shadow-pop">
                    <span className="text-caption font-semibold uppercase leading-none opacity-85">Ngày</span>
                    <span className="text-headline font-bold leading-none">{Math.max(s.day, 0)}</span>
                  </span>

                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex gap-2">
                      <Stat icon="star" iconClass="text-accent" value={`${s.totalPoints}`} label="Điểm" />
                      <Stat icon="flame" iconClass="text-primary" value={`${s.streak}`} label="Chuỗi" />
                      <Stat icon="medal" iconClass="text-info" value={s.rank ? `#${s.rank}` : '—'} label="Hạng" />
                    </div>
                    <div className="flex items-center gap-1 rounded-pill bg-surface/85 px-2.5 py-1 shadow-soft backdrop-blur" aria-label={`Còn ${s.passesLeft} Bùa Hồi Sinh`}>
                      {[0, 1, 2].map((i) => <Icon key={i} name="heart" size={15} filled={i < s.passesLeft} className={i < s.passesLeft ? 'text-primary' : 'text-border-strong/40'} />)}
                    </div>
                  </div>

                  <Link to="/me" className="flex h-16 w-16 items-center justify-center rounded-card border border-border bg-surface text-muted shadow-soft transition-transform active:scale-95" aria-label="Hồ sơ"><Icon name="paw" size={26} className="text-primary" /></Link>
                </div>

                {/* Tên phòng + chỉ báo + bật/tắt âm thanh */}
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-pill bg-surface/85 px-3 py-1.5 text-small font-bold shadow-soft backdrop-blur">
                    <Icon name={ROOMS[roomIdx]!.icon} size={17} className="text-primary" />{ROOMS[roomIdx]!.name}
                    <span className="ml-1 flex gap-1">{ROOMS.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === roomIdx ? 'bg-primary' : 'bg-border-strong/30'}`} />)}</span>
                  </span>
                  <button type="button" onClick={cycleWeather} aria-label={`Thời tiết: ${WEATHERS[weatherIdx]!.label}`} title={WEATHERS[weatherIdx]!.label} className="flex h-9 items-center gap-1.5 rounded-pill bg-surface/85 px-3 text-caption font-semibold text-muted shadow-soft backdrop-blur active:scale-90"><Icon name={WEATHERS[weatherIdx]!.icon} size={16} className="text-primary" />{WEATHERS[weatherIdx]!.label}</button>
                  <button type="button" onClick={toggleMute} aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'} className="flex h-9 w-9 items-center justify-center rounded-pill bg-surface/85 text-muted shadow-soft backdrop-blur active:scale-90"><Icon name={muted ? 'volume-off' : 'volume'} size={18} /></button>
                </div>

                {/* Thông báo trạng thái (mỏng) */}
                {dying && (
                  <div className="rounded-control border-2 border-danger bg-surface/95 p-2 text-center text-small shadow-soft">
                    <p className="font-semibold text-danger">{vi.banners.dying(s.passHoursLeft ?? 0)}</p>
                    {s.passAvailable && <Button onClick={() => setDialog(true)} className="mt-1" >{vi.pass.button}</Button>}
                  </div>
                )}

                {/* Gumi to giữa phòng (mục tiêu thả đồ ăn) */}
                <div data-feed-target className="flex flex-1 flex-col items-center justify-end pb-1">
                  <span className="mb-1 rounded-pill bg-surface/92 px-4 py-1 text-small font-bold text-primary shadow-soft backdrop-blur" data-testid="gumi-caption">{vi.gumi.stage[stage]}</span>
                  <Gumi state={s.gumi} size={240} interactive progress={progress} event={event?.name ?? null} eventKey={event?.key ?? 0} feed={feed} />
                </div>

                {/* Khay cho ăn + nút nhiệm vụ hôm nay + dock */}
                <div className="flex flex-col gap-2">
                  <FoodTray onFeed={feedGumi} />
                  {running && !todayDone && m && (
                    <Link to={`/chapter/${s.day}`} className="node-today flex items-center gap-3 rounded-card border border-primary/70 bg-surface/95 p-2 pr-3 shadow-pop backdrop-blur transition-transform active:scale-[0.99]">
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

                  <div className="flex justify-center gap-2.5">
                    <Dock to="/journey" icon="map" label="Bản đồ" badge={`${done}/${vi.journey.total}`} />
                    <Dock to="/leaderboard" icon="trophy" label="Xếp hạng" badge={s.rank ? `#${s.rank}` : undefined} />
                    <DockButton icon="shirt" label={vi.wardrobe.dock} onClick={() => setWardrobe(true)} />
                    <Dock to="/summary" icon="camera" label="Card" />
                  </div>
                </div>
            </div>

            {dialog && (
              <SugarPassDialog hoursLeft={s.passHoursLeft} error={passError} onCancel={() => { setDialog(false); setPassError(false); }} onConfirm={usePass} />
            )}
            {wardrobe && <SkinPicker daysDone={done} onClose={() => setWardrobe(false)} />}
          </div>
        );
      }}
    </AsyncView>
  );
}

function Stat({ icon, iconClass, value, label }: { icon: IconName; iconClass?: string; value: string; label: string }) {
  return (
    <span className="flex min-w-[4.5rem] flex-col items-center rounded-card border border-border bg-surface/92 px-3 py-1.5 shadow-soft backdrop-blur">
      <span className="flex items-center gap-1 text-title font-bold leading-none">
        <Icon name={icon} size={16} filled className={iconClass} />{value}
      </span>
      <span className="text-caption font-semibold text-muted">{label}</span>
    </span>
  );
}

function Dock({ to, icon, label, badge }: { to: string; icon: IconName; label: string; badge?: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1">
      <span className="relative flex h-14 w-14 items-center justify-center rounded-card border border-border bg-surface/95 text-muted shadow-pop transition-transform active:scale-90">
        <Icon name={icon} size={24} />
        {badge && <span className="absolute -right-1.5 -top-1.5 rounded-pill bg-primary px-1.5 py-0.5 text-caption font-bold leading-none text-on-primary shadow-soft">{badge}</span>}
      </span>
      <span className="rounded-pill bg-surface/80 px-2 py-0.5 text-caption font-semibold text-text backdrop-blur">{label}</span>
    </Link>
  );
}

function DockButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1">
      <span className="flex h-14 w-14 items-center justify-center rounded-card border border-border bg-surface/95 text-muted shadow-pop transition-transform active:scale-90"><Icon name={icon} size={24} /></span>
      <span className="rounded-pill bg-surface/80 px-2 py-0.5 text-caption font-semibold text-text backdrop-blur">{label}</span>
    </button>
  );
}
