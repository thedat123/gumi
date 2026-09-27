import { type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

/** Khung game arcade CHIẾM TRỌN MÀN HÌNH: nền theo vùng đất, thanh trên (Thoát→bản đồ + tựa + HUD), vùng canvas + lớp phủ. */
export function ArcadeStage({ act = 1, title, hint, hud, boxRef, canvasRef, overlay, onPointerDown }: {
  act?: 1 | 2 | 3; title: string; hint?: string; hud?: ReactNode;
  boxRef: RefObject<HTMLDivElement | null>; canvasRef: RefObject<HTMLCanvasElement | null>;
  overlay?: ReactNode; onPointerDown?: () => void;
}) {
  return (
    <div className={`game-shell act-${act} relative -mx-4 -mb-6 -mt-1 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden sm:h-[calc(100dvh-4rem)]`}>
      <div className="game-bg" aria-hidden="true" />
      <header className="relative z-20 flex items-center gap-3 px-4 pt-3 sm:px-6">
        <Link to="/journey" aria-label="Thoát" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-border bg-surface/85 text-muted shadow-soft backdrop-blur transition-transform active:scale-90">
          <Icon name="x" size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-title font-extrabold leading-tight">{title}</h1>
          {hint && <p className="truncate text-caption font-medium text-muted">{hint}</p>}
        </div>
        {hud}
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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/35 px-6 text-center backdrop-blur-[2px]">
      {children}
    </div>
  );
}
