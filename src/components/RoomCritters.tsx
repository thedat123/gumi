import type { CSSProperties } from 'react';

const a = (v: string): CSSProperties => ({ animation: v });

/** Bướm SVG có cánh vỗ. */
function Butterfly({ hue = '#F4A6C0', hue2 = '#F7C7A6' }: { hue?: string; hue2?: string }) {
  return (
    <svg width="46" height="40" viewBox="0 0 46 40" aria-hidden="true">
      <line x1="23" y1="14" x2="23" y2="30" stroke="#5B4A44" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22 12 q-4 -8 -8 -6" stroke="#5B4A44" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M24 12 q4 -8 8 -6" stroke="#5B4A44" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <g className="bf-wing bf-l"><path d="M22 20 q-18 -14 -20 2 q-2 12 14 8 q7 -2 6 -10z" fill={hue} /><path d="M22 22 q-13 6 -14 12 q0 7 9 2 q6 -4 5 -14z" fill={hue2} /></g>
      <g className="bf-wing bf-r"><path d="M24 20 q18 -14 20 2 q2 12 -14 8 q-7 -2 -6 -10z" fill={hue} /><path d="M24 22 q13 6 14 12 q0 7 -9 2 q-6 -4 -5 -14z" fill={hue2} /></g>
    </svg>
  );
}

/** Chim nhỏ SVG có cánh vỗ. */
function Bird() {
  return (
    <svg width="44" height="36" viewBox="0 0 44 36" aria-hidden="true">
      <ellipse cx="22" cy="22" rx="13" ry="10" fill="#F6C86A" /><ellipse cx="22" cy="25" rx="9" ry="6" fill="#FCE3AE" />
      <circle cx="31" cy="17" r="7" fill="#F6C86A" /><circle cx="33" cy="16" r="1.7" fill="#3A2A22" />
      <path d="M38 17 l6 -2 l-5 5z" fill="#E8863C" />
      <path className="bird-wing" d="M18 20 q-10 -10 -16 -2 q8 8 16 4z" fill="#EBB24E" /><path d="M9 26 q-6 3 -8 8 q7 0 10 -4z" fill="#EBB24E" />
    </svg>
  );
}

/** Ong vò vẽ (ngoài trời). */
function Bee() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" aria-hidden="true">
      <g className="bee-wing" style={{ transformOrigin: '15px 9px' }}><ellipse cx="13" cy="8" rx="6" ry="3.6" fill="#DDF0FA" opacity="0.85" /><ellipse cx="19" cy="8" rx="6" ry="3.6" fill="#DDF0FA" opacity="0.85" /></g>
      <ellipse cx="17" cy="14" rx="9" ry="6.5" fill="#F5C33B" />
      <path d="M14 8.4 a9 6.5 0 0 0 0 11 M18.5 8.2 a9 6.5 0 0 0 0 11.6" stroke="#2E2320" strokeWidth="2.4" fill="none" />
      <path d="M26 14 l4 -1.5 l0 3z" fill="#2E2320" /><circle cx="9.5" cy="12.5" r="1" fill="#2E2320" />
    </svg>
  );
}

/** Chuột chạy dưới sàn (trong nhà). */
function Mouse() {
  return (
    <svg width="42" height="26" viewBox="0 0 42 26" aria-hidden="true">
      <ellipse cx="20" cy="23" rx="13" ry="2.5" fill="rgba(58,36,30,0.15)" />
      <path d="M30 18 q10 2 12 -6 q-6 5 -10 0z" fill="none" stroke="#B9A6A0" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="16" cy="15" rx="12" ry="7.5" fill="#AEA39E" />
      <circle cx="7" cy="10" r="4.5" fill="#AEA39E" /><circle cx="7" cy="10" r="2.4" fill="#E4B7C0" />
      <circle cx="27" cy="13" r="5.5" fill="#B7ACA7" />
      <circle cx="30" cy="12" r="1.2" fill="#2E2320" /><circle cx="32.5" cy="14" r="0.8" fill="#3A2A22" />
      <path d="M33 14 l5 -1 M33 15 l5 1" stroke="#8A7D78" strokeWidth="0.7" />
    </svg>
  );
}

/** Bọ rùa (ngoài trời, dưới đất). */
function Ladybug() {
  return (
    <svg width="28" height="24" viewBox="0 0 30 26" aria-hidden="true">
      <ellipse cx="15" cy="23" rx="10" ry="2.3" fill="rgba(58,36,30,0.15)" />
      <path d="M6 22 l-4 3 M24 22 l4 3 M6 16 l-5 0 M24 16 l5 0 M8 12 l-4 -3 M22 12 l4 -3" stroke="#3A2A22" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="15" cy="15" r="9" fill="#E4574C" /><path d="M15 6 a9 9 0 0 0 0 18z" fill="#CF463C" /><path d="M15 6 v18" stroke="#3A2A22" strokeWidth="1.4" />
      <circle cx="15" cy="8" r="4" fill="#2E2320" />
      <circle cx="10" cy="13" r="1.6" fill="#2E2320" /><circle cx="20" cy="13" r="1.6" fill="#2E2320" /><circle cx="11" cy="19" r="1.4" fill="#2E2320" /><circle cx="19" cy="19" r="1.4" fill="#2E2320" />
    </svg>
  );
}

/** Lá rơi (ngoài trời). */
function Leaf() {
  return (
    <svg width="26" height="28" viewBox="0 0 26 28" aria-hidden="true">
      <path d="M13 2 C4 6 3 18 13 26 C23 18 22 6 13 2z" fill="#8FBE5C" />
      <path d="M13 2 C9 6 8.5 18 13 26z" fill="#7BAE4A" />
      <path d="M13 5 v18 M13 11 l5 -3 M13 16 l6 -2 M13 11 l-5 -2 M13 16 l-6 -1" stroke="#5E8C39" strokeWidth="1" fill="none" />
    </svg>
  );
}

function Vacuum() {
  return (
    <svg width="50" height="48" viewBox="0 0 40 40" aria-hidden="true">
      <ellipse cx="20" cy="35" rx="15" ry="3.5" fill="rgba(58,36,30,0.18)" />
      <path d="M6 24 a14 14 0 0 1 28 0z" fill="#5A6068" /><path d="M6 24 a14 14 0 0 1 28 0" fill="none" stroke="#3B4046" strokeWidth="2" />
      <rect x="4" y="23" width="32" height="4" rx="2" fill="#3B4046" />
      <circle cx="20" cy="16" r="4.5" fill="#8ED0EC" /><circle cx="20" cy="16" r="4.5" fill="none" stroke="#B9E6F5" strokeWidth="1" /><circle cx="14" cy="14" r="1" fill="#CFF0FB" />
    </svg>
  );
}

function FishBowl() {
  return (
    <svg width="98" height="94" viewBox="0 0 58 56" aria-hidden="true">
      <ellipse cx="29" cy="52" rx="18" ry="3.5" fill="rgba(58,36,30,0.15)" />
      <rect x="20" y="46" width="18" height="5" rx="2.5" fill="#C98545" />
      <path d="M12 22 a17 17 0 1 0 34 0 z" fill="#BFE6F2" opacity="0.5" /><ellipse cx="24" cy="18" rx="6" ry="8" fill="#EAF7FC" opacity="0.6" />
      <path d="M12 22 a17 17 0 1 0 34 0" fill="none" stroke="#8FD0E6" strokeWidth="2" /><ellipse cx="29" cy="20" rx="17" ry="5" fill="#DFF3FA" opacity="0.7" />
      <g style={a('npc-swim 3.4s ease-in-out infinite')}><ellipse cx="29" cy="34" rx="5.5" ry="3.5" fill="#F79A4A" /><path d="M34 34 l5 -3 l0 6z" fill="#F5B36F" /><circle cx="26" cy="33" r="0.9" fill="#3A2A22" /></g>
      <circle cx="36" cy="40" r="1.1" fill="#DFF3FA" opacity="0.8" /><circle cx="33" cy="45" r="0.8" fill="#DFF3FA" opacity="0.7" />
    </svg>
  );
}

/**
 * NPC nền — KHÁC NHAU theo cảnh:
 *  - Trong nhà: bình cá, robot hút bụi, chuột chạy, mối bay (tông trầm, "gia dụng").
 *  - Ngoài trời (ban công): bướm, chim, ong, bọ rùa, lá rơi (thiên nhiên).
 */
export function RoomCritters({ outdoor = false }: { outdoor?: boolean }) {
  if (outdoor) {
    return (
      <div className="npc-move pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden="true">
        <div className="npc" style={{ top: '18%', ...a('npc-cross 30s linear infinite') }}><div style={a('npc-float 3.2s ease-in-out infinite')}><Butterfly /></div></div>
        <div className="npc" style={{ top: '8%', ...a('npc-cross 22s linear -8s infinite') }}><div style={a('npc-glide 2.4s ease-in-out infinite')}><Bird /></div></div>
        <div className="npc" style={{ top: '34%', ...a('npc-cross 17s linear -4s infinite reverse') }}><div style={a('npc-float 1.6s ease-in-out infinite')}><Bee /></div></div>
        <div className="npc" style={{ top: '88%', ...a('npc-patrol 20s ease-in-out infinite') }}><Ladybug /></div>
        <div className="npc" style={{ top: '-6%', left: '30%', ...a('npc-fall 9s linear -3s infinite') }}><div style={a('npc-float 2.2s ease-in-out infinite')}><Leaf /></div></div>
        <div className="npc" style={{ top: '-6%', left: '68%', ...a('npc-fall 11s linear -7s infinite') }}><div style={a('npc-float 2.6s ease-in-out infinite')}><Leaf /></div></div>
      </div>
    );
  }
  return (
    <div className="npc-move pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden="true">
      <div className="npc" style={{ left: '4%', bottom: '17%' }}><FishBowl /></div>
      <div className="npc" style={{ top: '90%', ...a('npc-patrol 26s linear -9s infinite reverse') }}><Vacuum /></div>
      <div className="npc" style={{ top: '93%', ...a('npc-patrol 16s ease-in-out -5s infinite') }}><div style={a('npc-hop 0.34s ease-in-out infinite')}><Mouse /></div></div>
      <div className="npc" style={{ top: '13%', ...a('npc-cross 26s linear -6s infinite') }}><div style={a('npc-float 2.4s ease-in-out infinite')}><Butterfly hue="#B7A98E" hue2="#CFC3A8" /></div></div>
    </div>
  );
}
