import { useState } from 'react';
import { api } from '../../api';
import { Button } from '../../components/Button';
import { Confetti, GameShell } from '../../components/GameShell';
import { Icon } from '../../components/Icon';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

const SEG: number[] = [...vi.minigames.spin.segments];
const N = SEG.length;
const STEP = 360 / N;
const COLORS = ['#F6A5C0', '#8FD0EC', '#A6E3A1', '#FFD98A', '#C9B6F5', '#F6B78C'];
const R = 96;

const polar = (deg: number, r = R) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)];
};
const wedge = (k: number): string => {
  const [x0, y0] = polar(k * STEP);
  const [x1, y1] = polar((k + 1) * STEP);
  return `M 100 100 L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
};

/** Ngày 19 — Vòng Quay May Mắn: quay nhận buff điểm rồi gửi submit_minigame(19). */
export function SpinWheel() {
  const day = 19;
  const m = vi.missions[day - 1]!;
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);

  if (done) return <MissionDone day={day} points={m.points} note={vi.minigames.spin.success} />;

  const spin = () => {
    if (spinning) return;
    const idx = Math.floor(Math.random() * N);
    setReward(null);
    setSpinning(true);
    playSfx('boing');
    setAngle((a) => a - (a % 360) + 360 * 5 + (360 - (idx * STEP + STEP / 2)));
    setTimeout(() => { setReward(SEG[idx]!); setSpinning(false); setBurst((n) => n + 1); playSfx('sparkle'); }, 2800);
  };
  const finish = async () => { try { await api.submitMinigame(day); } catch { /* mock */ } setDone(true); };

  return (
    <GameShell act={actOfDay(day)} title={vi.minigames.spin.title} intro={vi.minigames.spin.intro}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative">
          {/* Kim chỉ */}
          <span aria-hidden="true" className="absolute -top-2 left-1/2 z-20 -translate-x-1/2">
            <svg width="34" height="34" viewBox="0 0 34 34"><path d="M17 30 L6 8 Q17 15 28 8 Z" fill="#B83556" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" /></svg>
          </span>
          <svg viewBox="0 0 200 200" className={`h-72 w-72 max-w-[80vw] ${spinning ? 'wheel-glow' : ''}`} role="img" aria-label="Vòng quay may mắn">
            <circle cx="100" cy="100" r="99" fill="#fff" />
            <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: 'transform 2.8s cubic-bezier(0.12,0.75,0.15,1)' }}>
              {SEG.map((v, k) => {
                const [tx, ty] = polar(k * STEP + STEP / 2, R * 0.64);
                return (
                  <g key={k}>
                    <path d={wedge(k)} fill={COLORS[k % COLORS.length]} stroke="#fff" strokeWidth="2.5" />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" transform={`rotate(${k * STEP + STEP / 2} ${tx} ${ty})`} className="fill-text font-extrabold" style={{ fontSize: 19 }}>+{v}</text>
                  </g>
                );
              })}
            </g>
            {/* Chấm bi viền */}
            {Array.from({ length: N }, (_, k) => { const [dx, dy] = polar(k * STEP, R + 1); return <circle key={k} cx={dx} cy={dy} r="2.6" fill="#fff" />; })}
            <circle cx="100" cy="100" r="16" fill="#fff" stroke="#B83556" strokeWidth="3.5" />
            <circle cx="100" cy="100" r="6" fill="#B83556" />
          </svg>
        </div>

        {reward !== null && (
          <div className="pop-in flex items-center gap-2 rounded-pill bg-accent px-5 py-2 text-title font-extrabold text-on-accent shadow-pop">
            <Icon name="sparkle" size={20} filled /> +{reward} điểm!
          </div>
        )}
      </div>

      {reward === null
        ? <Button onClick={spin} loading={spinning} block>{spinning ? vi.minigames.spin.spinning : vi.minigames.spin.spin}</Button>
        : <Button onClick={finish} block>{vi.minigames.common.backHome}</Button>}

      <Confetti fire={burst} />
    </GameShell>
  );
}
