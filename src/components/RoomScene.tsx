import { lazy, Suspense, type ReactElement } from 'react';
import { RoomCritters } from './RoomCritters';

const PixiScene = lazy(() => import('./PixiScene').then((m) => ({ default: m.PixiScene })));

export type RoomVariant = 'living' | 'kitchen' | 'garden';

/* ------- Bảng màu + không khí theo 3 vùng đất (phòng "đổi da" theo Hồi hiện tại) ------- */
interface Palette {
  wall: [string, string]; floor: [string, string]; base: string; plank: string; molding: string;
  sky: [string, string]; curtain: [string, string]; pelmet: string; lampGlow: string;
  bottleA: string; bottleB: string; potPlant: string; beam: string;
  window: 'meadow' | 'forest' | 'snow'; bulbs: boolean; snow: boolean;
}
const P: Record<1 | 2 | 3, Palette> = {
  1: { wall: ['#FCEFE7', '#F6DBCF'], floor: ['#EBC59C', '#D6A074'], base: '#C98F63', plank: '#B67C48', molding: '#EAC7B7',
       sky: ['#BFE6F5', '#EAF7EA'], curtain: ['#F7CEDA', '#EDA9BB'], pelmet: '#EDA9BB', lampGlow: '#FFE6A8',
       bottleA: '#7EC9E0', bottleB: '#BFE3B0', potPlant: '#5CB56B', beam: 'rgba(255,246,210,0.9)', window: 'meadow', bulbs: false, snow: false },
  2: { wall: ['#C9DAC6', '#A2BA9B'], floor: ['#D6AF80', '#AE7E52'], base: '#8F6338', plank: '#7A5330', molding: '#B2C3A7',
       sky: ['#F6C486', '#9C84B8'], curtain: ['#BBD1AF', '#89AB7D'], pelmet: '#89AB7D', lampGlow: '#FFCF77',
       bottleA: '#86C5A0', bottleB: '#CBE0A8', potPlant: '#3B8149', beam: 'rgba(255,205,140,0.7)', window: 'forest', bulbs: true, snow: false },
  3: { wall: ['#E8F0F7', '#CFDEEB'], floor: ['#DBC3A6', '#C0A382'], base: '#B0947A', plank: '#9C8168', molding: '#DBE6EF',
       sky: ['#CFE6FA', '#F1F8FE'], curtain: ['#D3E8F6', '#A9CBE0'], pelmet: '#A9CBE0', lampGlow: '#FFE1A0',
       bottleA: '#9AD0E6', bottleB: '#CFE7F2', potPlant: '#6FB6A0', beam: 'rgba(224,240,252,0.9)', window: 'snow', bulbs: false, snow: true },
};

/* ------- Cảnh ngoài cửa sổ theo vùng (vẽ trong khung kính đã clip) ------- */
function WindowView({ p }: { p: Palette }): ReactElement {
  if (p.window === 'meadow') {
    return (
      <g clipPath="url(#winGlass)">
        <rect x="22" y="24" width="156" height="134" fill="url(#winSky)" />
        <circle cx="150" cy="52" r="18" fill="#FFF3C4" />
        <path d="M22 120 Q70 100 120 116 T178 110 V158 H22 Z" fill="#8FCB7C" />
        <ellipse cx="70" cy="146" rx="44" ry="12" fill="#8FD0E6" opacity="0.9" />
        <path d="M22 132 Q80 116 140 130 T178 126 V158 H22 Z" fill="#6FB463" />
      </g>
    );
  }
  if (p.window === 'forest') {
    const pine = (x: number, s: number, c: string) => <path key={`${x}-${c}`} d={`M${x} 158 l${-10 * s} 0 l${10 * s} ${-30 * s} l${10 * s} ${30 * s} Z M${x} ${158 - 18 * s} l${-8 * s} ${6 * s} l${8 * s} ${-17 * s} l${8 * s} ${17 * s} Z`} fill={c} />;
    return (
      <g clipPath="url(#winGlass)">
        <rect x="22" y="24" width="156" height="134" fill="url(#winSky)" />
        <circle cx="150" cy="48" r="13" fill="#FFF1D0" opacity="0.95" />
        {[40, 74, 108, 140, 168].map((x) => pine(x, 1.15, '#4B6E52'))}
        {[30, 60, 92, 126, 158, 182].map((x) => pine(x, 1.7, '#2E4B36'))}
        <rect x="22" y="112" width="156" height="46" fill="#ffffff" opacity="0.1" />
      </g>
    );
  }
  return (
    <g clipPath="url(#winGlass)">
      <rect x="22" y="24" width="156" height="134" fill="url(#winSky)" />
      <path d="M22 120 L60 78 L86 106 L122 68 L152 104 L178 78 V158 H22 Z" fill="#AFC9DE" />
      <path d="M122 68 L112 84 L134 84 Z M60 78 L52 92 L70 92 Z" fill="#ffffff" />
      <path d="M22 134 L66 104 L100 126 L146 96 L178 118 V158 H22 Z" fill="#8FB0CC" />
      {[[44, 60], [92, 92], [140, 70], [70, 110], [120, 128], [160, 100]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill="#fff" opacity="0.9" />)}
    </g>
  );
}

function Window({ p }: { p: Palette }) {
  return (
    <svg viewBox="0 0 200 236" className="h-auto w-full drop-shadow-[0_6px_10px_rgba(58,36,30,0.18)]">
      <defs>
        <linearGradient id="winSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky[0]} /><stop offset="1" stopColor={p.sky[1]} /></linearGradient>
        <clipPath id="winGlass"><rect x="22" y="24" width="156" height="134" rx="7" /></clipPath>
      </defs>
      <rect x="14" y="16" width="172" height="150" rx="14" fill="#8CBFB6" />
      <WindowView p={p} />
      <line x1="100" y1="24" x2="100" y2="158" stroke="#8CBFB6" strokeWidth="7" />
      <line x1="22" y1="91" x2="178" y2="91" stroke="#8CBFB6" strokeWidth="7" />
      <rect x="6" y="164" width="188" height="12" rx="4" fill="#B98A6E" />
      {p.snow && <rect x="6" y="160" width="188" height="7" rx="3.5" fill="#fff" opacity="0.95" />}
      <path d="M14 16 q26 8 22 96 q-20 -18 -22 4 z" fill="url(#winCurtain)" />
      <path d="M186 16 q-26 8 -22 96 q20 -18 22 4 z" fill="url(#winCurtain)" />
      <linearGradient id="winCurtain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.curtain[0]} /><stop offset="1" stopColor={p.curtain[1]} /></linearGradient>
      <path d="M8 6 h184 v16 q-92 18 -184 0 z" fill={p.pelmet} />
      <rect x="86" y="176" width="26" height="22" rx="4" fill="#D98B57" />
      <path d="M99 176 C86 160 92 146 99 154 C106 146 112 160 99 176" fill={p.potPlant} />
    </svg>
  );
}

function Garland({ bulbs }: { bulbs: boolean }) {
  const bezier = (t: number, a: number, b: number, c: number) => (1 - t) ** 2 * a + 2 * (1 - t) * t * b + t ** 2 * c;
  const cols = ['#FFD7E6', '#C9ECFF', '#D8F5D0', '#FFF0C2', '#E7DCFF'];
  const flags = Array.from({ length: 13 }, (_, i) => {
    const t = 0.05 + (i / 12) * 0.9;
    return { x: bezier(t, 30, 500, 970), y: bezier(t, 26, 62, 26), c: cols[i % cols.length]! };
  });
  return (
    <svg viewBox="0 0 1000 96" preserveAspectRatio="none" className="h-auto w-full">
      <path d="M30 26 Q500 62 970 26" fill="none" stroke="#B98A6E" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      {flags.map((f, i) => <path key={i} d={`M${f.x - 15} ${f.y} L${f.x + 15} ${f.y} L${f.x} ${f.y + 30} Z`} fill={f.c} stroke="#fff" strokeWidth="1.2" />)}
      {bulbs && flags.filter((_, i) => i % 2 === 1).map((f, i) => <circle key={`b${i}`} cx={f.x} cy={f.y + 34} r="6" fill="#FFE29A" stroke="#E0B24A" strokeWidth="1.5" />)}
    </svg>
  );
}

function WallDecor() {
  return (
    <svg viewBox="0 0 320 150" className="h-auto w-full drop-shadow-[0_6px_8px_rgba(58,36,30,0.16)]">
      {/* đồng hồ (kim chạy thật) */}
      <g transform="translate(40 40)">
        <circle r="26" fill="#FFF6EC" stroke="#D98C50" strokeWidth="5" />
        {[0, 90, 180, 270].map((a) => <line key={a} x1="0" y1="-22" x2="0" y2="-18.5" stroke="#C9A98F" strokeWidth="2" transform={`rotate(${a})`} />)}
        <line x1="0" y1="0" x2="0" y2="-12" stroke="#5f5048" strokeWidth="3.5" strokeLinecap="round" transform="rotate(300)" />
        <g>
          <line x1="0" y1="4" x2="0" y2="-17" stroke="#5f5048" strokeWidth="2.4" strokeLinecap="round" />
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="300s" repeatCount="indefinite" />
        </g>
        <g>
          <line x1="0" y1="6" x2="0" y2="-20" stroke="#B3261E" strokeWidth="1.3" strokeLinecap="round" />
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="6s" repeatCount="indefinite" />
        </g>
        <circle r="2.6" fill="#B3261E" />
      </g>
      {/* khung ảnh Chiến Thần */}
      <g transform="translate(170 74)">
        <rect x="-58" y="-58" width="116" height="116" rx="16" fill="#E7A86A" />
        <rect x="-49" y="-49" width="98" height="98" rx="12" fill="#FFE1B8" />
        <circle cx="0" cy="5" r="32" fill="#c9c9cf" />
        <path d="M-26 -20 L-16 -44 L-2 -24z M26 -20 L16 -44 L2 -24z" fill="#c9c9cf" />
        <rect x="-25" y="-5" width="21" height="11" rx="4" fill="#2a2320" />
        <rect x="4" y="-5" width="21" height="11" rx="4" fill="#2a2320" />
        <path d="M-9 16 q9 7 18 0" stroke="#2a2320" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </g>
      {/* khung tim */}
      <g transform="translate(288 52)">
        <rect x="-28" y="-28" width="56" height="56" rx="11" fill="#D98C50" />
        <rect x="-21" y="-21" width="42" height="42" rx="8" fill="#FFF0E0" />
        <path d="M0 11 C-14 -2 -10 -19 0 -12 C10 -19 14 -2 0 11" fill="#EDA9BB" />
      </g>
    </svg>
  );
}

function Shelf({ p, snow }: { p: Palette; snow: boolean }) {
  return (
    <svg viewBox="0 0 300 130" className="h-auto w-full drop-shadow-[0_7px_9px_rgba(58,36,30,0.16)]">
      <rect x="4" y="96" width="292" height="12" rx="4" fill="#C98545" />
      <rect x="40" y="24" width="32" height="72" rx="9" fill={p.bottleA} /><rect x="45" y="14" width="22" height="16" rx="5" fill="#4AA7C4" />
      <rect x="94" y="46" width="30" height="50" rx="7" fill={p.bottleB} /><rect x="94" y="46" width="30" height="11" rx="6" fill="#93CF7A" />
      <rect x="146" y="60" width="36" height="36" rx="7" fill="#F3C6D0" /><rect x="142" y="74" width="15" height="12" rx="4" fill="#F3C6D0" />
      {snow && <path d="M152 60 q6 -13 12 0" stroke="#fff" strokeWidth="3" fill="none" opacity="0.85" />}
      <rect x="204" y="42" width="15" height="54" rx="3" fill="#B98A6E" /><rect x="222" y="42" width="15" height="54" rx="3" fill="#8CBFB6" /><rect x="240" y="52" width="15" height="44" rx="3" fill="#EDA9BB" />
      <path d="M56 14 C42 -3 48 -17 56 -9 C64 -17 70 -3 56 14" fill={p.potPlant} />
    </svg>
  );
}

function Plant({ p }: { p: Palette }) {
  return (
    <svg viewBox="0 0 120 170" className="h-auto w-full drop-shadow-[0_10px_10px_rgba(58,36,30,0.22)]">
      <path d="M14 92 L106 92 L94 168 L26 168 Z" fill="#D98B57" />
      <path d="M14 92 L106 92 L102 112 L18 112 Z" fill="#C97E4A" />
      <path d="M60 92 C-4 60 8 -26 53 -4 C58 -44 106 -33 94 17 C132 24 124 78 60 92" fill={p.potPlant} />
      <path d="M53 85 C14 58 23 3 55 21 C60 -12 99 -4 87 33 C120 40 106 81 53 85" fill="#5CB56B" />
      <path d="M60 92 C51 46 53 12 58 -4" stroke="#3C7C46" strokeWidth="3" fill="none" />
    </svg>
  );
}

function Lamp({ p }: { p: Palette }) {
  return (
    <svg viewBox="0 0 220 210" className="h-auto w-full overflow-visible drop-shadow-[0_9px_9px_rgba(58,36,30,0.18)]">
      <defs><radialGradient id="lampG" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stopColor={p.lampGlow} stopOpacity="0.95" /><stop offset="1" stopColor={p.lampGlow} stopOpacity="0" /></radialGradient></defs>
      <ellipse cx="110" cy="120" rx="150" ry="150" fill="url(#lampG)" />
      <rect x="52" y="150" width="116" height="52" rx="9" fill="#C98545" />
      <rect x="104" y="72" width="12" height="78" fill="#9c6b4a" />
      <path d="M70 72 q40 -50 80 0 z" fill="#FFD98A" />
      <ellipse cx="110" cy="72" rx="40" ry="9" fill="#FFE6A8" />
    </svg>
  );
}

function Rug() {
  return (
    <svg viewBox="0 0 400 120" className="h-auto w-full">
      <ellipse cx="200" cy="74" rx="196" ry="42" fill="#E4A0B4" opacity="0.5" />
      <ellipse cx="200" cy="74" rx="152" ry="32" fill="#F2C7D2" opacity="0.85" />
      <ellipse cx="200" cy="74" rx="112" ry="24" fill="#FBE3EA" />
      <ellipse cx="200" cy="66" rx="72" ry="17" fill="#EDB7C6" />
      <ellipse cx="200" cy="61" rx="72" ry="13" fill="#F6CDD8" />
    </svg>
  );
}

/* ---------- Nền phòng (trong nhà / ngoài trời) ---------- */
function Floor({ p }: { p: Palette }) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[56%]" style={{ perspective: '820px', perspectiveOrigin: '50% -20%' }}>
      <div className="absolute inset-0 origin-bottom" style={{ transform: 'rotateX(63deg)', background: `linear-gradient(180deg, ${p.floor[0]}, ${p.floor[1]})` }}>
        <div className="absolute inset-0" style={{ background: `repeating-linear-gradient(90deg, transparent 0 76px, ${p.plank}55 76px 79px)` }} />
        <div className="absolute inset-0" style={{ background: `repeating-linear-gradient(0deg, transparent 0 58px, ${p.plank}2e 58px 61px)` }} />
      </div>
    </div>
  );
}
const Occlusion = () => <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 110px 0 140px -72px rgba(58,36,30,0.3), inset -110px 0 140px -72px rgba(58,36,30,0.3), inset 0 90px 120px -80px rgba(58,36,30,0.25)' }} />;

function IndoorBg({ p }: { p: Palette }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${p.wall[0]} 0%, ${p.wall[1]} 60%)` }} />
      <div className="absolute inset-x-0" style={{ top: '47%', height: '3px', background: p.molding, opacity: 0.5 }} />
      <Floor p={p} />
      <div className="absolute inset-x-0" style={{ top: '59.5%', height: '22px', background: 'linear-gradient(180deg, rgba(58,36,30,0.2), transparent)' }} />
      <div className="absolute inset-x-0" style={{ top: '59.5%', height: '5px', background: p.base }} />
      <Occlusion />
    </>
  );
}
function GardenBg({ p }: { p: Palette }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 44%)` }} />
      <svg className="absolute inset-x-0" style={{ top: '28%', height: '34%' }} viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M0 70 Q100 30 200 60 T400 50 V120 H0Z" fill="#9BD08A" opacity="0.65" />
        <path d="M0 92 Q120 60 240 84 T400 78 V120 H0Z" fill="#7BBE6C" opacity="0.85" />
      </svg>
      <Floor p={p} />
      <div className="absolute inset-x-0" style={{ top: '59.5%', height: '5px', background: p.base }} />
      <Occlusion />
    </>
  );
}

/* ---------- Đồ đạc theo từng phòng ---------- */
function Cabinets() {
  return (
    <svg viewBox="0 0 360 84" className="h-auto w-full drop-shadow-[0_6px_8px_rgba(58,36,30,0.16)]">
      <rect x="0" y="0" width="360" height="76" rx="8" fill="#E8C9A6" />
      {[8, 98, 188, 278].map((x) => <g key={x}><rect x={x} y="6" width="76" height="64" rx="6" fill="#F5E0C6" stroke="#D9B48C" strokeWidth="2" /><circle cx={x + 64} cy="38" r="3.5" fill="#9c6b4a" /></g>)}
    </svg>
  );
}
function Counter() {
  return (
    <svg viewBox="0 0 400 150" className="h-auto w-full drop-shadow-[0_8px_10px_rgba(58,36,30,0.2)]">
      <rect x="0" y="18" width="400" height="16" rx="6" fill="#EAD9C2" />
      <rect x="0" y="32" width="400" height="118" fill="#CE9E6E" />
      {[80, 160, 250, 330].map((x) => <line key={x} x1={x} y1="34" x2={x} y2="150" stroke="#B4835A" strokeWidth="2" opacity="0.45" />)}
      <rect x="48" y="22" width="72" height="10" rx="4" fill="#B9C6CC" /><rect x="56" y="24" width="56" height="6" rx="3" fill="#8FA0A6" />
      <path d="M120 26 v-14 q0 -8 -10 -8" stroke="#8FA0A6" strokeWidth="4" fill="none" />
      <rect x="250" y="22" width="100" height="12" rx="4" fill="#5A5560" />
      <circle cx="276" cy="28" r="7" fill="#2E2A33" /><circle cx="324" cy="28" r="7" fill="#2E2A33" />
      <path d="M300 22 q10 -13 20 0 z" fill="#DDE3E7" opacity="0.7" />
    </svg>
  );
}
function Fridge() {
  return (
    <svg viewBox="0 0 120 220" className="h-auto w-full drop-shadow-[0_10px_10px_rgba(58,36,30,0.2)]">
      <rect x="6" y="4" width="108" height="212" rx="14" fill="#EDEFF2" stroke="#CDD3DA" strokeWidth="3" />
      <line x1="6" y1="86" x2="114" y2="86" stroke="#CDD3DA" strokeWidth="3" />
      <rect x="92" y="26" width="8" height="44" rx="4" fill="#B7C0C8" />
      <rect x="92" y="102" width="8" height="70" rx="4" fill="#B7C0C8" />
      <rect x="20" y="30" width="26" height="16" rx="3" fill="#F3C6D0" />
    </svg>
  );
}
function Railing() {
  return (
    <svg viewBox="0 0 400 90" className="h-auto w-full">
      <rect x="0" y="6" width="400" height="12" rx="6" fill="#C98545" />
      {Array.from({ length: 14 }).map((_, i) => <rect key={i} x={12 + i * 28} y="18" width="8" height="66" rx="3" fill="#D8A15E" />)}
      <rect x="0" y="78" width="400" height="10" rx="4" fill="#B4835A" />
    </svg>
  );
}
function BistroTable() {
  return (
    <svg viewBox="0 0 200 150" className="h-auto w-full drop-shadow-[0_9px_9px_rgba(58,36,30,0.18)]">
      <ellipse cx="100" cy="132" rx="70" ry="10" fill="rgba(58,36,30,0.15)" />
      <rect x="96" y="52" width="8" height="76" fill="#9c6b4a" />
      <ellipse cx="100" cy="52" rx="66" ry="14" fill="#EAD9C2" stroke="#D9B48C" strokeWidth="2" />
      <rect x="70" y="34" width="14" height="18" rx="3" fill="#9AD0E6" />
      <rect x="112" y="30" width="16" height="22" rx="3" fill="#EDA9BB" /><path d="M120 30 C112 18 118 8 120 14 C122 8 128 18 120 30" fill="#5CB56B" />
    </svg>
  );
}

function Living({ p }: { p: Palette }) {
  return (
    <>
      <div className="absolute left-[2.5%] top-[8%] w-[36%] min-w-[150px] max-w-[360px]"><Window p={p} /></div>
      <div className="absolute left-1/2 top-[6%] w-[48%] min-w-[230px] max-w-[440px] -translate-x-1/2"><WallDecor /></div>
      <div className="absolute right-[2.5%] top-[11%] w-[31%] min-w-[150px] max-w-[320px]"><Shelf p={p} snow={p.snow} /></div>
      <div className="absolute bottom-[15%] left-[3%] w-[15%] min-w-[70px] max-w-[128px]"><Plant p={p} /></div>
      <div className="absolute bottom-[11%] right-[2%] w-[23%] min-w-[120px] max-w-[240px]"><Lamp p={p} /></div>
    </>
  );
}
function Kitchen({ p }: { p: Palette }) {
  return (
    <>
      <div className="absolute left-[3%] top-[7%] w-[44%] min-w-[220px] max-w-[440px]"><Cabinets /></div>
      <div className="absolute right-[3%] top-[9%] w-[30%] min-w-[150px] max-w-[320px]"><Window p={p} /></div>
      <div className="absolute bottom-[14%] left-[2%] w-[16%] min-w-[74px] max-w-[128px]"><Fridge /></div>
      <div className="absolute bottom-[9%] left-1/2 w-[76%] min-w-[300px] max-w-[600px] -translate-x-1/2"><Counter /></div>
      {/* Đồ bếp (element có sẵn: emoji) đặt trên mặt bàn */}
      <div className="absolute bottom-[20%] left-[16%] flex items-end gap-[6px] text-[clamp(18px,3.4vw,34px)] drop-shadow-[0_3px_3px_rgba(58,36,30,0.25)]"><span>🫖</span><span>🍳</span></div>
      <div className="absolute bottom-[20%] right-[14%] flex items-end gap-[6px] text-[clamp(18px,3.4vw,34px)] drop-shadow-[0_3px_3px_rgba(58,36,30,0.25)]"><span>🧂</span><span>🔪</span><span>☕</span></div>
    </>
  );
}
function Garden({ p }: { p: Palette }) {
  return (
    <>
      <div className="absolute inset-x-[6%] bottom-[42%]"><Railing /></div>
      <div className="absolute bottom-[13%] left-[4%] w-[16%] min-w-[76px] max-w-[132px]"><Plant p={p} /></div>
      <div className="absolute bottom-[12%] right-[5%] w-[15%] min-w-[70px] max-w-[124px]"><Plant p={p} /></div>
      <div className="absolute bottom-[15%] right-[24%] w-[27%] min-w-[150px] max-w-[290px]"><BistroTable /></div>
      {/* Điểm nhấn vườn (element có sẵn: emoji) */}
      <div className="absolute bottom-[27%] left-[19%] text-[clamp(20px,4vw,40px)] drop-shadow-[0_3px_3px_rgba(58,36,30,0.25)]">🌻</div>
      <div className="absolute bottom-[26%] right-[7%] text-[clamp(16px,3vw,30px)] drop-shadow-[0_3px_3px_rgba(58,36,30,0.25)]">🌸</div>
      <div className="absolute top-[40%] left-[12%] text-[clamp(16px,3vw,30px)]">🪴</div>
    </>
  );
}

/**
 * Phòng của Gumi — dựng theo "mảnh ghép" đặt tương đối (%) nên đẹp ở CẢ desktop lẫn mobile.
 * "Đổi da" theo Hồi (act) + đổi PHÒNG (variant): phòng khách / nhà bếp / ban công. NPC di chuyển cho sống động.
 */
export function RoomScene({ act = 1, variant = 'living' }: { act?: 1 | 2 | 3; variant?: RoomVariant }) {
  const p = P[act];
  const garden = variant === 'garden';
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {garden ? <GardenBg p={p} /> : <IndoorBg p={p} />}

      {/* Ánh sáng */}
      <div className="absolute" style={{ left: '2%', top: '4%', width: '46%', height: '74%', background: `radial-gradient(58% 58% at 38% 22%, ${p.beam}, transparent 70%)` }} />
      <div className="absolute bottom-[2%] left-1/2 h-[36%] w-[82%] -translate-x-1/2" style={{ background: 'radial-gradient(50% 62% at 50% 62%, rgba(255,243,214,0.8), transparent 70%)' }} />

      {/* Dây cờ / đèn dây */}
      <div className="absolute inset-x-[4%] top-[2.5%]"><Garland bulbs={p.bulbs || garden} /></div>

      {variant === 'living' && <Living p={p} />}
      {variant === 'kitchen' && <Kitchen p={p} />}
      {garden && <Garden p={p} />}

      {/* Thảm + NPC sống động */}
      <div className="absolute bottom-[6%] left-1/2 w-[76%] min-w-[260px] max-w-[560px] -translate-x-1/2"><Rug /></div>
      <RoomCritters />

      <Suspense fallback={null}><PixiScene act={act === 3 ? 3 : 'room'} /></Suspense>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(130% 95% at 50% 24%, transparent 56%, rgba(58,36,30,0.22) 100%)' }} />
    </div>
  );
}
