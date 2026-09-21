import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Button } from '../components/Button';
import { Gumi } from '../components/Gumi';
import { RoomScene } from '../components/RoomScene';
import { SugarPassDialog } from '../components/SugarPassDialog';
import { vi } from '../content/vi';
import { approvedCount, gumiStage } from '../lib/scoring';
import { useAsync } from '../app/useAsync';
import type { GumiEvent } from '../api/types';

/** S05 — MÀN CHÍNH kiểu thú cưng ảo: Gumi sống trong phòng, nhiệm vụ là các nút quanh nhân vật. */
export function GumiRoom() {
  const state = useAsync(() => api.getJourney(), []);
  const [dialog, setDialog] = useState(false);
  const [passError, setPassError] = useState(false);
  const [event, setEvent] = useState<{ name: GumiEvent; key: number } | null>(null);
  const fire = (name: GumiEvent) => setEvent((e) => ({ name, key: (e?.key ?? 0) + 1 }));

  return (
    <AsyncView state={state}>
      {(s) => {
        const done = approvedCount(s.days);
        const progress = Math.min(1, done / vi.journey.total);
        const stage = gumiStage(s.days);
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
          <div className="mx-auto flex w-full max-w-[440px] flex-col">
            <div className="relative aspect-[9/16] max-h-[calc(100dvh-6rem)] w-full overflow-hidden rounded-[28px] border-4 border-surface shadow-pop">
              <RoomScene />

              <div className="relative z-10 flex h-full flex-col justify-between p-3">
                {/* HUD trên: ngày · điểm/chuỗi · hạng + Bùa */}
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-12 w-12 flex-col items-center justify-center rounded-pill border-2 border-surface bg-primary text-on-primary shadow-pop">
                    <span className="text-caption leading-none opacity-80">Ngày</span>
                    <span className="text-title font-bold leading-none">{Math.max(s.day, 0)}</span>
                  </span>

                  <div className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex gap-1.5">
                      <Pill icon="⭐" text={`${s.totalPoints}`} />
                      <Pill icon="🔥" text={`${s.streak}`} />
                      <Pill icon="🏅" text={s.rank ? `#${s.rank}` : '—'} />
                    </div>
                    <div className="flex gap-1" aria-label={`Còn ${s.passesLeft} Bùa Hồi Sinh`}>
                      {[0, 1, 2].map((i) => <span key={i} aria-hidden="true" className="text-small">{i < s.passesLeft ? '💗' : '🤍'}</span>)}
                    </div>
                  </div>

                  <Link to="/me" className="flex h-12 w-12 items-center justify-center rounded-pill border-2 border-surface bg-surface text-title shadow-soft" aria-label="Hồ sơ">🐾</Link>
                </div>

                {/* Thông báo trạng thái (mỏng) */}
                {dying && (
                  <div className="rounded-control border-2 border-danger bg-surface/95 p-2 text-center text-small shadow-soft">
                    <p className="font-semibold text-danger">{vi.banners.dying(s.passHoursLeft ?? 0)}</p>
                    {s.passAvailable && <Button onClick={() => setDialog(true)} className="mt-1" >{vi.pass.button}</Button>}
                  </div>
                )}

                {/* Gumi to giữa phòng */}
                <div className="flex flex-1 flex-col items-center justify-end pb-1">
                  <span className="mb-1 rounded-pill bg-surface/90 px-3 py-0.5 text-caption font-bold text-primary shadow-soft backdrop-blur" data-testid="gumi-caption">{vi.gumi.stage[stage]}</span>
                  <Gumi state={s.gumi} size={210} interactive progress={progress} event={event?.name ?? null} eventKey={event?.key ?? 0} />
                </div>

                {/* Nút nhiệm vụ hôm nay + dock */}
                <div className="flex flex-col gap-2">
                  {running && !todayDone && m && (
                    <Link to={`/chapter/${s.day}`} className="node-today flex items-center gap-3 rounded-card border-2 border-primary bg-surface/95 p-2 pr-3 shadow-pop backdrop-blur">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-primary text-title text-on-primary">🎮</span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block text-caption font-bold text-primary">NHIỆM VỤ HÔM NAY · +{m.points}đ</span>
                        <span className="block truncate text-small font-semibold">{m.title}</span>
                      </span>
                      <span aria-hidden="true" className="text-title text-primary">▸</span>
                    </Link>
                  )}
                  {running && todayDone && (
                    <div className="rounded-card border-2 border-success bg-surface/95 p-2 text-center text-small font-semibold text-success shadow-soft">🎉 Hôm nay xong rồi! Hẹn Gumi ngày mai nhé.</div>
                  )}
                  {s.phase === 'before' && <div className="rounded-card border-2 border-info bg-surface/95 p-2 text-center text-small font-semibold text-info shadow-soft">{vi.banners.before('01/10')}</div>}
                  {s.phase === 'ended' && <Link to="/summary" className="rounded-card border-2 border-primary bg-surface/95 p-2 text-center text-small font-bold text-primary shadow-soft">Xem Sugar Journey của bạn →</Link>}

                  <div className="flex justify-center gap-3">
                    <Dock to="/journey" icon="🗺️" label="Bản đồ" badge={`${done}/${vi.journey.total}`} />
                    <Dock to="/leaderboard" icon="🏆" label="Xếp hạng" badge={s.rank ? `#${s.rank}` : undefined} />
                    <Dock to="/summary" icon="📸" label="Card" />
                  </div>
                </div>
              </div>
            </div>

            {dialog && (
              <SugarPassDialog hoursLeft={s.passHoursLeft} error={passError} onCancel={() => { setDialog(false); setPassError(false); }} onConfirm={usePass} />
            )}
          </div>
        );
      }}
    </AsyncView>
  );
}

function Pill({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border-2 border-surface bg-surface/90 px-2.5 py-0.5 text-small font-bold shadow-soft backdrop-blur">
      <span aria-hidden="true">{icon}</span>{text}
    </span>
  );
}

function Dock({ to, icon, label, badge }: { to: string; icon: string; label: string; badge?: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-0.5">
      <span className="relative flex h-14 w-14 items-center justify-center rounded-pill border-2 border-surface bg-surface/95 text-title shadow-pop transition-transform active:scale-90">
        {icon}
        {badge && <span className="absolute -right-1 -top-1 rounded-pill bg-primary px-1.5 text-caption font-bold text-on-primary">{badge}</span>}
      </span>
      <span className="rounded-pill bg-surface/80 px-2 text-caption font-semibold text-text backdrop-blur">{label}</span>
    </Link>
  );
}
