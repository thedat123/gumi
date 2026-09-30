import { type ReactNode, type RefObject } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from './Icon';
import { vi } from '../content/vi';

/** Khung game arcade CHIẾM TRỌN MÀN HÌNH: nền theo vùng đất, thanh trên (Thoát→bản đồ + tựa + HUD), vùng canvas + lớp phủ. */
export function ArcadeStage({ act = 1, title, hint, hud, boxRef, canvasRef, overlay, onPointerDown }: {
  act?: 1 | 2 | 3; title: string; hint?: string; hud?: ReactNode;
  boxRef: RefObject<HTMLDivElement | null>; canvasRef: RefObject<HTMLCanvasElement | null>;
  overlay?: ReactNode; onPointerDown?: () => void;
}) {
  const { day: dayParam } = useParams();
  const day = Number(dayParam);
  const mission = vi.missions[day - 1];
  return (
    <div className={`game-shell act-${act} relative -mx-4 -mb-6 -mt-1 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden sm:h-[calc(100dvh-4rem)]`}>
      <div className="game-bg" aria-hidden="true" />
      <header className="game-premium-header relative z-20 mx-3 mt-3 flex flex-wrap items-center gap-3 rounded-[22px] border border-white/65 bg-surface/90 p-3 shadow-pop backdrop-blur-xl sm:mx-6 sm:p-4">
        <Link to="/journey" aria-label="Thoát" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-border bg-surface/85 text-muted shadow-soft backdrop-blur transition-transform active:scale-90">
          <Icon name="x" size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          {mission && <p className="mb-0.5 text-[10px] font-black uppercase tracking-[.16em] text-primary/80">CHẶNG {String(day).padStart(2, '0')} / 21 · {mission.kind} · +{mission.points} ĐIỂM</p>}
          <h1 className="text-title font-extrabold leading-tight">{title}</h1>
          {hint && <p className="line-clamp-2 text-caption font-medium text-muted">{hint}</p>}
        </div>
        {hud && <div className="flex flex-wrap items-center gap-1.5 max-sm:w-full max-sm:pl-[52px]">{hud}</div>}
      </header>
      <div ref={boxRef} onPointerDown={onPointerDown} className="relative z-10 mt-2 flex-1 touch-none select-none">
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
        {overlay}
      </div>
    </div>
  );
}

/** Lớp phủ bắt đầu / thua / thắng của game arcade. */
export function ArcadeOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#170F24]/65 px-4 text-center backdrop-blur-[5px]">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-[28px] border border-white/30 bg-gradient-to-br from-[#4C2660]/95 to-[#251833]/95 p-6 text-white shadow-[0_20px_70px_rgba(13,6,25,.45)] sm:p-8">
        {children}
      </div>
    </div>
  );
}
