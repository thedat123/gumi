import { useState } from 'react';
import { api } from '../../api';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { Confetti, GameShell } from '../../components/GameShell';
import { Icon } from '../../components/Icon';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

// Mỗi mức điểm xuất hiện 2 Ô → 10 ô (giống Chiếc Nón Kỳ Diệu). Hai ô cùng mức nằm đối xứng nhau.
const BASE: number[] = [...vi.minigames.spin.segments];
const SEG: number[] = [...BASE, ...BASE];
const N = SEG.length;              // 10
const STEP = 360 / N;              // 36°
// 10 màu SẶC SỠ xen kẽ — mỗi ô một màu, ô cạnh nhau luôn khác tông (vui mắt kiểu nón kỳ diệu).
const WHEEL_COLORS = ['#F6567E', '#FF9A3D', '#FFD23F', '#9BDE4E', '#3DD9A0', '#43C6EA', '#5A8DEE', '#A66CE0', '#E86AC8', '#FF7A5C'];
const colorOf = (k: number) => WHEEL_COLORS[k % WHEEL_COLORS.length]!;
const R = 80;                      // bán kính phần bánh (viewBox 200)
const SPIN_MS = 4200;

const polar = (deg: number, r = R): [number, number] => {
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  if (done) return <MissionDone day={day} points={reward ?? m.points} note={vi.minigames.spin.success} />;

  const spin = () => {
    if (spinning) return;
    const idx = Math.floor(Math.random() * N);
    setReward(null);
    setSpinning(true);
    playSfx('boing');
    // Quay 6 vòng rồi dừng sao cho TÂM ô idx nằm đúng dưới kim (đỉnh).
    setAngle((a) => a - (a % 360) + 360 * 6 + (360 - (idx * STEP + STEP / 2)));
    setTimeout(() => { setReward(SEG[idx]!); setSpinning(false); setBurst((n) => n + 1); playSfx('sparkle'); }, SPIN_MS);
  };
  const finish = async () => {
    if (reward === null || saving) return;
    setSaving(true); setSaveError(false);
    try { await api.submitMinigame(day, reward); setDone(true); }
    catch { setSaveError(true); }
    finally { setSaving(false); }
  };

  const bulbs = N * 2; // 20 bóng đèn quanh vành

  return (
    <GameShell act={actOfDay(day)} title={vi.minigames.spin.title} intro={vi.minigames.spin.intro}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {/* Kích thước co giãn: to HẾT CỠ theo chiều cao màn trên desktop, bám bề ngang trên mobile, không tràn. */}
        <svg viewBox="0 -8 200 212" className={`h-[min(90vw,68vh,42rem)] w-[min(90vw,68vh,42rem)] ${spinning ? 'wheel-glow wheel-spinning' : ''}`} role="img" aria-label="Vòng quay may mắn">
          <defs>
            <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FCE8A6" /><stop offset=".4" stopColor="#E9B94C" />
              <stop offset=".7" stopColor="#C8902F" /><stop offset="1" stopColor="#F4D581" />
            </linearGradient>
            <radialGradient id="hubGrad" cx="38%" cy="32%" r="75%">
              <stop offset="0" stopColor="#EE7A93" /><stop offset="1" stopColor="#B83556" />
            </radialGradient>
            <radialGradient id="gloss" cx="35%" cy="24%" r="72%">
              <stop offset="0" stopColor="#fff" stopOpacity=".38" /><stop offset=".55" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <filter id="wheelShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#4a1d2c" floodOpacity="0.25" />
            </filter>
            <filter id="pegShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#4a1d2c" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Vành vàng + bóng đèn */}
          <circle cx="100" cy="100" r="96" fill="url(#rimGrad)" filter="url(#wheelShadow)" />
          <circle cx="100" cy="100" r="88" fill="#fff" />
          {Array.from({ length: bulbs }, (_, k) => {
            const [bx, by] = polar(k * (360 / bulbs), 92);
            return <circle key={k} className="wheel-bulb" cx={bx} cy={by} r="3" fill={k % 2 ? '#FFFFFF' : '#FFF0B8'}
              stroke="#C8902F" strokeWidth="0.6" style={{ animationDelay: `${(k % 2) * 0.25}s` }} />;
          })}

          {/* Phần bánh quay */}
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: `transform ${SPIN_MS}ms cubic-bezier(0.17,0.67,0.12,0.99)` }}>
            {SEG.map((v, k) => {
              const mid = k * STEP + STEP / 2;
              const [tx, ty] = polar(mid, R * 0.72);          // đẩy chữ RA NGOÀI → không chen tâm
              const rot = mid > 90 && mid < 270 ? mid + 180 : mid; // ô nửa dưới: lật 180° cho chữ luôn đọc xuôi
              return (
                <g key={k}>
                  <path d={wedge(k)} fill={colorOf(k)} stroke="#fff" strokeWidth="2" />
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                    transform={`rotate(${rot} ${tx} ${ty})`}
                    className="font-black" style={{ fontSize: 15, fill: '#3a2230', stroke: '#fff', strokeWidth: 2.6, paintOrder: 'stroke' }}>+{v}</text>
                </g>
              );
            })}
          </g>

          {/* Bóng loáng (không quay) + trục */}
          <circle cx="100" cy="100" r="80" fill="url(#gloss)" pointerEvents="none" />
          <circle cx="100" cy="100" r="17" fill="#fff" filter="url(#pegShadow)" />
          <circle cx="100" cy="100" r="13" fill="url(#hubGrad)" />
          <circle cx="95" cy="95" r="3.5" fill="#fff" opacity="0.5" />

          {/* Kim chỉ (đỉnh) — nảy nhẹ khi quay */}
          <g className="wheel-pointer" filter="url(#pegShadow)">
            <path d="M100 22 L89 3 Q100 -1 111 3 Z" fill="#B83556" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
          </g>
        </svg>

        {reward !== null && (
          <div className="pop-in flex items-center gap-2 rounded-pill border border-black/10 bg-accent px-5 py-2 text-title font-extrabold text-on-accent shadow-pop">
            <Icon name="sparkle" size={20} filled /> +{reward} điểm!
          </div>
        )}
      </div>

      {saveError && <Banner kind="error">Chưa lưu được điểm. Bấm lại để thử.</Banner>}
      {reward === null
        ? <Button onClick={spin} loading={spinning} block>{spinning ? vi.minigames.spin.spinning : vi.minigames.spin.spin}</Button>
        : <Button onClick={finish} loading={saving} block>Nhận +{reward} điểm</Button>}

      <Confetti fire={burst} />
    </GameShell>
  );
}
