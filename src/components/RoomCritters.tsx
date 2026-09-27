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

/** Chuột nhắt chạy dưới sàn (trong nhà) — tỉ lệ thật hơn: thân tròn, 2 tai, mõm hồng, chân, đuôi cong, ria. */
function Mouse() {
  return (
    <svg width="48" height="28" viewBox="0 0 48 28" aria-hidden="true">
      <ellipse cx="22" cy="25" rx="15" ry="2.4" fill="rgba(58,36,30,0.14)" />
      <path d="M33 17 q12 1 14 -8 q-2 7 -11 5" fill="none" stroke="#C7B5AE" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="18" cy="16" rx="13" ry="8" fill="#B4A9A3" />
      <ellipse cx="18" cy="18.6" rx="9" ry="4.4" fill="#D0C7C2" />
      <ellipse cx="12" cy="23.6" rx="2" ry="1" fill="#9C8F89" /><ellipse cx="23" cy="23.6" rx="2" ry="1" fill="#9C8F89" />
      <circle cx="10" cy="9" r="5" fill="#B4A9A3" /><circle cx="10" cy="9" r="2.7" fill="#E6BAC4" />
      <circle cx="29" cy="14" r="6.6" fill="#BCB1AB" />
      <ellipse cx="35" cy="14.6" rx="2.6" ry="2" fill="#B4A9A3" />
      <circle cx="37" cy="14.7" r="1.5" fill="#E8929F" />
      <circle cx="30" cy="12.4" r="1.5" fill="#2E2320" /><circle cx="30.5" cy="11.9" r="0.45" fill="#fff" />
      <path d="M36 15 l8 1 M36 16.5 l8 3 M36 13.5 l8 -1.5" stroke="#8A7D78" strokeWidth="0.6" />
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

/** Robot hút bụi (trong nhà) — dáng đĩa dẹt thật: cản va, mặt máy, cảm biến, chổi cạnh xoay, bánh xe. */
function Vacuum() {
  return (
    <svg width="54" height="34" viewBox="0 0 46 30" aria-hidden="true">
      <ellipse cx="23" cy="27" rx="18" ry="3" fill="rgba(58,36,30,0.18)" />
      <g className="npc-roll" style={{ transformOrigin: '40px 22px' }}>
        <path d="M40 22 l5 -1 M40 22 l4 3.5 M40 22 l3 -4.5 M40 22 l5 2.5 M40 22 l1 -5" stroke="#E0C878" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <path d="M5 21 a18 8 0 0 1 36 0 z" fill="#4E545C" />
      <rect x="4" y="20" width="38" height="6" rx="3" fill="#363B41" />
      <ellipse cx="23" cy="13" rx="19" ry="6.5" fill="#5C636C" />
      <ellipse cx="23" cy="11.4" rx="19" ry="5" fill="#666E77" />
      <circle cx="23" cy="12" r="3.4" fill="#8ED0EC" /><circle cx="23" cy="12" r="3.4" fill="none" stroke="#BCE6F5" strokeWidth="1" /><circle cx="21.6" cy="10.8" r="1" fill="#EAF8FE" />
      <rect x="12" y="9.5" width="9" height="2.2" rx="1.1" fill="#3A3F45" />
      <circle cx="11" cy="24" r="1.6" fill="#23262A" /><circle cx="35" cy="24" r="1.6" fill="#23262A" />
    </svg>
  );
}

/** Một con cá bơi (vẽ hướng sang PHẢI, tâm ở gốc 0,0) — đuôi quẫy riêng. */
function Fish({ body, tail, s = 1 }: { body: string; tail: string; s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <path className="aq-tail" d="M-8 0 l-9 -6 q3 6 0 12 z" fill={tail} />
      <path d="M-1 -5 q6 -5 10 -1 q-5 2 -10 1z" fill={tail} opacity="0.9" />
      <ellipse cx="0" cy="0" rx="9.5" ry="5.6" fill={body} />
      <path d="M0 -5.6 q4 -4 8 -1" fill="none" stroke={tail} strokeWidth="1.4" opacity="0.8" />
      <path d="M-3 0.5 q6 3 11 0" stroke="rgba(255,255,255,0.45)" strokeWidth="1" fill="none" />
      <circle cx="5.6" cy="-1.3" r="1.6" fill="#2A2320" /><circle cx="6.1" cy="-1.8" r="0.55" fill="#fff" />
    </g>
  );
}

/** Bể cá LỚN: kính + nước + sỏi + rong + đá + bong bóng, 3 con cá bơi CHÂN THẬT (qua lại, lật hướng, quẫy đuôi, nhấp nhô). */
function Aquarium() {
  const swim = (dur: number, d: number, delay: number): CSSProperties => ({ ['--d' as string]: `${d}px`, animation: `aq-swim ${dur}s ease-in-out ${delay}s infinite` });
  const bob = (dur: number): CSSProperties => ({ animation: `aq-bob ${dur}s ease-in-out infinite` });
  return (
    <svg width="238" height="170" viewBox="0 0 140 100" aria-hidden="true">
      <defs>
        <linearGradient id="aqW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C6ECF7" /><stop offset="1" stopColor="#66AED2" /></linearGradient>
        <clipPath id="aqClip"><rect x="14" y="14" width="112" height="66" rx="8" /></clipPath>
      </defs>
      <ellipse cx="70" cy="97" rx="54" ry="5" fill="rgba(58,36,30,0.14)" />
      {/* chân tủ gỗ */}
      <rect x="16" y="80" width="108" height="15" rx="3" fill="#B07C48" /><rect x="16" y="80" width="108" height="4" rx="2" fill="#C98545" />
      <rect x="34" y="86" width="14" height="7" rx="2" fill="#9c6b4a" opacity="0.6" /><rect x="92" y="86" width="14" height="7" rx="2" fill="#9c6b4a" opacity="0.6" />
      <g clipPath="url(#aqClip)">
        <rect x="14" y="14" width="112" height="66" fill="url(#aqW)" />
        <ellipse cx="70" cy="18" rx="56" ry="6" fill="#EAF9FE" opacity="0.7" />
        {/* sỏi đáy */}
        <rect x="14" y="70" width="112" height="10" fill="#C9A36B" />
        {[22, 34, 46, 58, 70, 82, 94, 106, 116].map((x, i) => <ellipse key={x} cx={x} cy={72 + (i % 2)} rx="5" ry="3" fill={i % 2 ? '#B98A5E' : '#D8B583'} />)}
        {/* rong biển (đung đưa) */}
        <path className="aq-sway" style={{ transformOrigin: '26px 70px' }} d="M26 72 q-5 -14 2 -22 q-6 12 0 22z" fill="#4E9E63" />
        <path className="aq-sway" style={{ transformOrigin: '35px 70px', animationDelay: '-1.1s' }} d="M35 72 q6 -16 0 -28 q10 12 2 28z" fill="#5FB472" />
        <path className="aq-sway" style={{ transformOrigin: '110px 70px', animationDelay: '-0.6s' }} d="M110 72 q7 -12 1 -22 q-8 10 -3 22z" fill="#4E9E63" />
        {/* đá trang trí */}
        <path d="M88 72 q6 -11 17 -2 q4 4 -3 6z" fill="#8C8F96" /><ellipse cx="97" cy="70" rx="4" ry="2" fill="#A7ABB2" />
        {/* bong bóng nổi lên */}
        {[[30, -0.2], [34, -1.4], [101, -0.8], [98, -2.1]].map(([x, d], i) => <circle key={i} className="aq-bubble" style={{ animationDelay: `${d}s` }} cx={x} cy="68" r={1.2 + (i % 2) * 0.6} fill="#EAF9FE" />)}
        {/* CÁ — 3 con, tốc độ/độ sâu/pha khác nhau */}
        <g transform="translate(23 33)"><g className="aq-fish" style={swim(8, 84, 0)}><g style={bob(2.6)}><Fish body="#F58B3C" tail="#F2A960" /></g></g></g>
        <g transform="translate(30 52)"><g className="aq-fish" style={swim(6.4, 72, -2)}><g style={bob(2)}><Fish body="#E45D6E" tail="#EE8391" s={0.82} /></g></g></g>
        <g transform="translate(20 44)"><g className="aq-fish" style={swim(9.6, 90, -4)}><g style={bob(3)}><Fish body="#5AA9E0" tail="#89C6EC" s={0.72} /></g></g></g>
      </g>
      {/* viền kính + nắp */}
      <rect x="12" y="12" width="116" height="70" rx="10" fill="none" stroke="#A9D6E4" strokeWidth="2.5" />
      <rect x="10" y="9" width="120" height="7" rx="3.5" fill="#8FA6AE" /><rect x="10" y="9" width="120" height="3" rx="1.5" fill="#AEC2C9" />
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
      <div className="npc" style={{ left: '2%', bottom: '6%' }}><Aquarium /></div>
      <div className="npc" style={{ top: '90%', ...a('npc-patrol 26s linear -9s infinite reverse') }}><Vacuum /></div>
      <div className="npc" style={{ top: '93%', ...a('npc-patrol 16s ease-in-out -5s infinite') }}><div style={a('npc-hop 0.34s ease-in-out infinite')}><Mouse /></div></div>
      <div className="npc" style={{ top: '13%', ...a('npc-cross 26s linear -6s infinite') }}><div style={a('npc-float 2.4s ease-in-out infinite')}><Butterfly hue="#B7A98E" hue2="#CFC3A8" /></div></div>
    </div>
  );
}
