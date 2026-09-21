import { lazy, Suspense } from 'react';

const PixiScene = lazy(() => import('./PixiScene').then((m) => ({ default: m.PixiScene })));

/**
 * Phòng của Gumi (kiểu thú cưng ảo): tường + cửa sổ nắng + khung ảnh "Chiến Thần 0% Đường"
 * + kệ nước healthy + thảm, phủ lớp bụi vàng ấm (Pixi). Trang trí, aria-hidden.
 */
export function RoomScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="h-full w-full" viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice">
        {/* Tường + sàn */}
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfe9e3" /><stop offset="1" stopColor="#a9d6ce" /></linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6b784" /><stop offset="1" stopColor="#cf9c68" /></linearGradient>
          <linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fdf3c4" /><stop offset="1" stopColor="#bfe6f2" /></linearGradient>
          <radialGradient id="sun" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stopColor="#fff6d8" stopOpacity="0.9" /><stop offset="1" stopColor="#fff6d8" stopOpacity="0" /></radialGradient>
        </defs>
        <rect x="0" y="0" width="400" height="452" fill="url(#wall)" />
        <rect x="0" y="440" width="400" height="200" fill="url(#floor)" />
        <rect x="0" y="440" width="400" height="10" fill="#b98652" />
        {/* vệt gỗ sàn */}
        {[70, 150, 230, 310].map((y) => <line key={y} x1="0" y1={y + 440} x2="400" y2={y + 400} stroke="#b98652" strokeWidth="2" opacity="0.4" />)}

        {/* Cửa sổ + nắng */}
        <g>
          <rect x="34" y="70" width="120" height="150" rx="10" fill="#8bbfb6" />
          <rect x="42" y="78" width="104" height="134" rx="6" fill="url(#win)" />
          <line x1="94" y1="78" x2="94" y2="212" stroke="#8bbfb6" strokeWidth="6" />
          <line x1="42" y1="145" x2="146" y2="145" stroke="#8bbfb6" strokeWidth="6" />
          <polygon points="46,220 150,220 210,440 -10,440" fill="url(#sun)" />
        </g>

        {/* Khung ảnh Gumi tiến hoá (Chiến Thần 0% Đường) */}
        <g transform="translate(200 150)">
          <rect x="-52" y="-52" width="104" height="104" rx="14" fill="#e7a86a" />
          <rect x="-44" y="-44" width="88" height="88" rx="10" fill="#ffd9a1" />
          <circle cx="0" cy="4" r="30" fill="#c9c9cf" />
          <path d="M-24 -20 L-14 -40 L-2 -22z M24 -20 L14 -40 L2 -22z" fill="#c9c9cf" />
          <rect x="-22" y="-4" width="18" height="10" rx="4" fill="#2a2320" />
          <rect x="4" y="-4" width="18" height="10" rx="4" fill="#2a2320" />
          <path d="M-8 14 q8 6 16 0" stroke="#2a2320" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        {/* Kệ + chai nước healthy + ly */}
        <g>
          <rect x="286" y="212" width="90" height="8" rx="3" fill="#c98545" />
          <rect x="300" y="150" width="26" height="62" rx="8" fill="#7ec9e0" /><rect x="304" y="140" width="18" height="14" rx="4" fill="#4aa7c4" />
          <rect x="340" y="176" width="24" height="36" rx="5" fill="#bfe3b0" /><rect x="340" y="176" width="24" height="8" rx="4" fill="#93cf7a" />
        </g>

        {/* Cây cảnh góc trái */}
        <g transform="translate(58 388)">
          <path d="M0 52 L-14 52 L-10 20 L10 20 L14 52z" fill="#d98b57" />
          <path d="M0 22 C-30 -6 -18 -34 0 -26 C18 -34 30 -6 0 22" fill="#4f9e5d" />
          <path d="M0 16 C-18 2 -12 -18 0 -14 C12 -18 18 2 0 16" fill="#5cb56b" />
        </g>

        {/* Thảm */}
        <ellipse cx="200" cy="586" rx="150" ry="30" fill="#d98b57" opacity="0.5" />
        <ellipse cx="200" cy="586" rx="110" ry="20" fill="#e7a86a" opacity="0.6" />
      </svg>

      <Suspense fallback={null}><PixiScene act="room" /></Suspense>
      {/* Vệt tối viền cho có chiều sâu */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 30%, transparent 55%, rgba(58,36,30,0.18) 100%)' }} />
    </div>
  );
}
