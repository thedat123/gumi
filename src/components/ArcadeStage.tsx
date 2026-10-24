import { useState, type ReactNode, type RefObject } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from './Icon';
import { vi } from '../content/vi';

/** Khung game arcade CHIẾM TRỌN MÀN HÌNH: nền theo vùng đất, thanh trên (Thoát→bản đồ + tựa + HUD), vùng canvas + lớp phủ. */
export function ArcadeStage({ act = 1, title, hint, hud, boxRef, canvasRef, overlay, onPointerDown, scenery }: {
  act?: 1 | 2 | 3; title: string; hint?: string; hud?: ReactNode;
  boxRef: RefObject<HTMLDivElement | null>; canvasRef: RefObject<HTMLCanvasElement | null>;
  scenery?: ReactNode; overlay?: ReactNode; onPointerDown?: () => void;
}) {
  const { day: dayParam } = useParams();
  const day = Number(dayParam);
  const mission = vi.missions[day - 1];
  const [hintOpen, setHintOpen] = useState(false);
  return (
    <div className={`game-shell game-h-full act-${act} relative flex flex-col overflow-hidden`}>
      <div className="game-bg" aria-hidden="true" />
      <header className="game-premium-header relative z-20 mx-3 mt-3 flex flex-wrap items-center gap-3 rounded-[22px] border border-white/65 bg-surface/90 p-3 shadow-pop backdrop-blur-xl sm:mx-6 sm:p-4 [@media(max-height:520px)]:mx-2 [@media(max-height:520px)]:mt-1.5 [@media(max-height:520px)]:gap-2 [@media(max-height:520px)]:rounded-2xl [@media(max-height:520px)]:p-2">
        <Link to="/journey" aria-label="Thoát" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-border bg-surface/85 text-muted shadow-soft backdrop-blur transition-transform active:scale-90 [@media(max-height:520px)]:h-8 [@media(max-height:520px)]:w-8">
          <Icon name="x" size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          {mission && <p className="mb-0.5 text-[10px] font-black uppercase tracking-[.16em] text-primary/80 [@media(max-height:520px)]:hidden">CHẶNG {String(day).padStart(2, '0')} / {vi.journey.total} · {mission.kind} · +{mission.points} ĐIỂM</p>}
          <h1 className="text-title font-extrabold leading-tight [@media(max-height:520px)]:text-body">{title}</h1>
          {hint && (
            <button
              type="button"
              onClick={() => setHintOpen((v) => !v)}
              aria-expanded={hintOpen}
              className="flex w-full items-start gap-1 text-left [@media(max-height:520px)]:hidden"
            >
              <span className={`text-caption font-medium text-muted ${hintOpen ? '' : 'line-clamp-2'}`}>{hint}</span>
              <Icon name="chevron-right" size={14} className={`mt-0.5 shrink-0 text-primary/70 transition-transform ${hintOpen ? '-rotate-90' : 'rotate-90'}`} />
            </button>
          )}
        </div>
        {hud && <div className="flex flex-wrap items-center gap-1.5 max-sm:w-full max-sm:pl-[52px] [@media(max-height:520px)]:w-auto [@media(max-height:520px)]:pl-0">{hud}</div>}
      </header>
      <div ref={boxRef} onPointerDown={onPointerDown} className="relative z-10 mt-2 flex-1 touch-none select-none [@media(max-height:520px)]:mt-1">
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
        {scenery}
        {overlay}
      </div>
    </div>
  );
}

/** Lớp phủ bắt đầu / thua / thắng của game arcade. */
export function ArcadeOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[#170F24]/65 px-4 py-3 text-center backdrop-blur-[5px]">
      <div className="my-auto flex max-h-full w-full max-w-md flex-col items-center gap-3 overflow-y-auto rounded-[28px] border border-white/30 bg-gradient-to-br from-[#4C2660]/95 to-[#251833]/95 p-6 text-white shadow-[0_20px_70px_rgba(13,6,25,.45)] sm:p-8 [@media(max-height:520px)]:gap-2 [@media(max-height:520px)]:rounded-2xl [@media(max-height:520px)]:p-4">
        {children}
      </div>
    </div>
  );
}
