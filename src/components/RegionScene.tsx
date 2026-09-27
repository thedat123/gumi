import { lazy, Suspense, type CSSProperties } from 'react';

// Tách Pixi thành chunk riêng: chỉ tải khi có cảnh cần vẽ (không nặng trang đăng nhập).
const PixiScene = lazy(() => import('./PixiScene').then((m) => ({ default: m.PixiScene })));

/**
 * Bối cảnh vùng đất: nền gradient + hình bóng (CSS/SVG tĩnh) + lớp hạt động WebGL (PixiScene).
 *  1 Đầm Lầy Ngọt — bọt ngọt nổi, lau sậy, sương.
 *  2 Rừng Đường Ẩn — hàng thông mờ sương, phấn bay.
 *  3 Đỉnh 0% — núi tuyết, tuyết rơi, ánh sáng trong.
 */
export function RegionScene({ act }: { act: 1 | 2 | 3 }) {
  return (
    <div className={`scene scene--act${act}`} aria-hidden="true">
      <div className="scene-grad" />
      <div className="scene-mist scene-mist-a" />
      <div className="scene-mist scene-mist-b" />
      <span className="scene-cloud" style={{ '--cy': '10%', '--cw': '170px', '--ch': '52px', '--cd': '52s', '--co': '0.6' } as CSSProperties} />
      <span className="scene-cloud" style={{ '--cy': '22%', '--cw': '120px', '--ch': '38px', '--cd': '38s', '--cdelay': '-14s', '--co': '0.45' } as CSSProperties} />
      <Silhouette act={act} />
      <Suspense fallback={null}><PixiScene act={act} /></Suspense>
      <div className="scene-scrim" />
    </div>
  );
}

/* Phong cách "premium vector" (Alto/Monument Valley): 3 lớp ridge chồng nhau, gradient phối cảnh
   khí quyển (xa nhạt → gần đậm), viền rim-light mảnh, cảnh vật là hình khối vector thanh thoát. */
function Silhouette({ act }: { act: 1 | 2 | 3 }) {
  if (act === 1) {
    // Đầm Lầy Ngọt — bình minh ngọc lục bảo, ridge mềm + lau sậy mảnh hai mép.
    return (
      <>
        <svg className="scene-far" viewBox="0 0 400 120" preserveAspectRatio="none">
          <defs><linearGradient id="a1far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#77C6AC" /><stop offset="1" stopColor="#46A187" /></linearGradient></defs>
          <path d="M0 64 Q100 38 200 58 T400 50 V120 H0 Z" fill="url(#a1far)" />
          <path d="M0 64 Q100 38 200 58 T400 50" fill="none" stroke="#E6FBF0" strokeOpacity=".45" strokeWidth="1.4" />
        </svg>
        <svg className="scene-mid" viewBox="0 0 400 120" preserveAspectRatio="none">
          <defs><linearGradient id="a1mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2F937A" /><stop offset="1" stopColor="#166A58" /></linearGradient></defs>
          <path d="M0 82 Q130 56 230 80 T400 72 V120 H0 Z" fill="url(#a1mid)" />
          <path d="M0 82 Q130 56 230 80 T400 72" fill="none" stroke="#9CE6CC" strokeOpacity=".3" strokeWidth="1.2" />
        </svg>
        <svg className="scene-near" viewBox="0 0 400 120" preserveAspectRatio="none">
          <defs><linearGradient id="a1near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0F5344" /><stop offset="1" stopColor="#0A362C" /></linearGradient></defs>
          <path d="M0 94 Q110 76 210 94 T400 86 V120 H0 Z" fill="url(#a1near)" />
          {[20, 54, 84, 316, 348, 378].map((x, i) => (
            <g key={x} stroke="#0C4234" strokeWidth="3" strokeLinecap="round">
              <line x1={x} y1={98} x2={x + (i % 2 ? 3 : -3)} y2={64 - (i % 3) * 7} />
              <circle cx={x + (i % 2 ? 3 : -3)} cy={62 - (i % 3) * 7} r="3.6" fill="#123f30" stroke="none" />
            </g>
          ))}
        </svg>
      </>
    );
  }
  if (act === 2) {
    // Rừng Đường Ẩn — hoàng hôn tím chàm, hàng thông lùi dần trong sương.
    const pine = (x: number, s: number, c: string) => (
      <path key={`${x}-${c}`} d={`M${x} 118 L${x - 18 * s} 118 L${x} ${118 - 44 * s} L${x + 18 * s} 118 Z M${x} ${118 - 28 * s} L${x - 13 * s} ${106 - 6 * s} L${x + 13 * s} ${106 - 6 * s} Z`} fill={c} />
    );
    return (
      <>
        <svg className="scene-far" viewBox="0 0 400 120" preserveAspectRatio="none">
          <defs><linearGradient id="a2far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6A5A92" /><stop offset="1" stopColor="#463A72" /></linearGradient></defs>
          <path d="M0 72 Q100 46 200 66 T400 60 V120 H0 Z" fill="url(#a2far)" />
          {[30, 96, 168, 250, 316, 380].map((x) => pine(x, 0.62, '#40356A'))}
        </svg>
        <svg className="scene-mid" viewBox="0 0 400 120" preserveAspectRatio="none">
          <defs><linearGradient id="a2mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#463A78" /><stop offset="1" stopColor="#2E2556" /></linearGradient></defs>
          <path d="M0 84 Q120 64 220 84 T400 76 V120 H0 Z" fill="url(#a2mid)" />
          {[54, 132, 214, 300, 366].map((x) => pine(x, 0.85, '#332A5E'))}
        </svg>
        <svg className="scene-near" viewBox="0 0 400 120" preserveAspectRatio="none">
          {[16, 88, 168, 250, 332, 392].map((x) => pine(x, 1.12, '#201A40'))}
        </svg>
      </>
    );
  }
  // Đỉnh 0% — bình minh băng giá, dãy đỉnh tuyết lùi dần.
  return (
    <>
      <svg className="scene-far" viewBox="0 0 400 120" preserveAspectRatio="none">
        <defs><linearGradient id="a3far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#CFE6F6" /><stop offset="1" stopColor="#A6C8E4" /></linearGradient></defs>
        <path d="M0 92 L70 50 L130 82 L200 40 L270 80 L330 54 L400 88 V120 H0 Z" fill="url(#a3far)" />
      </svg>
      <svg className="scene-mid" viewBox="0 0 400 120" preserveAspectRatio="none">
        <defs><linearGradient id="a3mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#93B7D8" /><stop offset="1" stopColor="#6E97C0" /></linearGradient></defs>
        <path d="M0 104 L64 66 L128 98 L210 58 L292 96 L356 70 L400 96 V120 H0 Z" fill="url(#a3mid)" />
        <path d="M210 58 L198 76 L224 76 Z M64 66 L54 80 L76 80 Z" fill="#F4FAFF" />
      </svg>
      <svg className="scene-near" viewBox="0 0 400 120" preserveAspectRatio="none">
        <defs><linearGradient id="a3near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5A82AC" /><stop offset="1" stopColor="#3E6690" /></linearGradient></defs>
        <path d="M0 116 L90 70 L150 106 L240 62 L320 100 L400 74 V120 H0 Z" fill="url(#a3near)" />
        <path d="M240 62 L226 84 L256 84 Z M90 70 L79 88 L103 88 Z" fill="#FFFFFF" />
      </svg>
    </>
  );
}
