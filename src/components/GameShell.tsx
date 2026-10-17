import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from './Icon';
import { vi } from '../content/vi';

/** Vài bong bóng nổi trong nền game (trang trí). */
function Bubbles() {
  const bubbles = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({
      left: `${8 + i * 13 + (i % 2) * 4}%`,
      size: 14 + (i % 4) * 12,
      dur: 9 + (i % 5) * 2.5,
      delay: -(i * 1.7),
    })),
    [],
  );
  return (
    <>
      {bubbles.map((b, i) => (
        <span key={i} className="game-bubble" style={{ left: b.left, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
      ))}
    </>
  );
}

/**
 * Khung nhập vai dùng chung cho mọi minigame: nền động theo vùng đất, thanh trên có nút Thoát + tựa game + HUD (điểm/tiến độ/đồng hồ).
 * Chiếm gần trọn khung nhìn để cảm giác "vào một màn chơi thật", không còn là mấy nút nhỏ.
 */
export function GameShell({ act = 1, title, intro, hud, footer, children, wide = false }: {
  act?: 1 | 2 | 3; title: string; intro?: string; hud?: ReactNode; footer?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  const { day: dayParam } = useParams();
  const day = Number(dayParam);
  const mission = vi.missions[day - 1];
  const [introOpen, setIntroOpen] = useState(false);
  return (
    <div className={`game-shell act-${act} relative -mx-4 -mb-6 -mt-1 flex min-h-[calc(100dvh-var(--app-header))] flex-col overflow-hidden px-4 pb-5 pt-3 sm:px-6`}>
      <div className="game-bg" aria-hidden="true"><Bubbles /></div>
      <div className={`relative z-10 mx-auto flex w-full flex-1 flex-col ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <header className="game-premium-header mb-4 flex flex-wrap items-center gap-3 rounded-[22px] border border-white/65 bg-surface/90 p-3 shadow-pop backdrop-blur-xl sm:p-4 [@media(max-height:520px)]:mb-2 [@media(max-height:520px)]:gap-2 [@media(max-height:520px)]:p-2">
          <Link to="/journey" aria-label="Thoát" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-border bg-surface text-muted shadow-soft transition-transform active:scale-90 [@media(max-height:520px)]:h-8 [@media(max-height:520px)]:w-8">
            <Icon name="x" size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            {mission && <p className="mb-0.5 text-[10px] font-black uppercase tracking-[.16em] text-primary/80 [@media(max-height:520px)]:hidden">CHẶNG {String(day).padStart(2, '0')} / {vi.journey.total} · {mission.kind} · +{mission.points} ĐIỂM</p>}
            <h1 className="text-title font-extrabold leading-tight text-text [@media(max-height:520px)]:text-body">{title}</h1>
            {intro && (
              <button
                type="button"
                onClick={() => setIntroOpen((v) => !v)}
                aria-expanded={introOpen}
                className="mt-1 flex w-full items-start gap-1 text-left [@media(max-height:520px)]:hidden"
              >
                <span className={`text-caption font-medium leading-relaxed text-muted ${introOpen ? '' : 'line-clamp-2'}`}>{intro}</span>
                <Icon name="chevron-right" size={14} className={`mt-0.5 shrink-0 text-primary/70 transition-transform ${introOpen ? '-rotate-90' : 'rotate-90'}`} />
              </button>
            )}
          </div>
          {hud && <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5 max-sm:w-full max-sm:justify-start max-sm:pl-[52px] [@media(max-height:520px)]:w-auto [@media(max-height:520px)]:pl-0">{hud}</div>}
        </header>
        <div className="flex flex-1 flex-col justify-center [@media(max-height:520px)]:justify-start">{children}</div>
        {footer && <div className="safe-bottom sticky bottom-0 z-20 mt-4 [@media(max-height:520px)]:mt-2">{footer}</div>}
      </div>
    </div>
  );
}

/** Chip HUD nhỏ (điểm/tiến độ) cho thanh trên của game. */
export function GameStat({ icon, value, tone = 'primary' }: { icon: Parameters<typeof Icon>[0]['name']; value: string; tone?: 'primary' | 'accent' | 'info' | 'success' }) {
  const tint = { primary: 'text-primary', accent: 'text-accent', info: 'text-info', success: 'text-success' }[tone];
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-surface/90 px-3 py-1.5 text-small font-bold shadow-soft backdrop-blur">
      <Icon name={icon} size={16} filled className={tint} />{value}
    </span>
  );
}

const CONFETTI_COLORS = ['#B83556', '#EF9F2A', '#1F7A4D', '#55768C', '#DC97A5', '#F5C542'];

/** Mưa confetti khi thắng. Đổi `fire` (số) để bắn lại. */
export function Confetti({ fire = 0, count = 90 }: { fire?: number; count?: number }) {
  const [pieces, setPieces] = useState<number>(0);
  useEffect(() => { if (fire > 0) setPieces((n) => n + 1); }, [fire]);
  if (pieces === 0) return null;
  const reduce = typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm'));
  if (reduce) return null;
  return (
    <div key={pieces} className="confetti-layer" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.35;
        const dur = 1.6 + Math.random() * 1.4;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const w = 7 + Math.random() * 7;
        return <span key={i} className="confetti" style={{ left: `${left}%`, width: w, height: w * 1.4, background: color, animationDuration: `${dur}s`, animationDelay: `${delay}s`, borderRadius: i % 3 === 0 ? '50%' : '2px' }} />;
      })}
    </div>
  );
}
