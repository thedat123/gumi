import { lazy, Suspense } from 'react';

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
      <Silhouette act={act} />
      <Suspense fallback={null}><PixiScene act={act} /></Suspense>
      <div className="scene-scrim" />
    </div>
  );
}

function Silhouette({ act }: { act: 1 | 2 | 3 }) {
  if (act === 1) {
    return (
      <>
        <svg className="scene-far" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0 62 Q90 34 190 56 T400 48 V120 H0 Z" fill="#2b4a37" /></svg>
        <svg className="scene-near" viewBox="0 0 400 120" preserveAspectRatio="none">
          <path d="M0 84 Q110 66 210 84 T400 76 V120 H0 Z" fill="#132e1e" />
          {[36, 92, 168, 250, 320, 372].map((x, i) => (
            <g key={x} fill="#0e2417">
              <rect x={x - 2} y={40 - (i % 3) * 6} width="4" height="52" rx="2" />
              <rect x={x - 5} y={30 - (i % 3) * 6} width="10" height="20" rx="5" fill="#3a2a18" />
            </g>
          ))}
        </svg>
      </>
    );
  }
  if (act === 2) {
    const pine = (x: number, s: number, c: string) => (
      <path key={`${x}-${c}`} d={`M${x} ${118} L${x - 20 * s} ${118} L${x} ${118 - 46 * s} L${x + 20 * s} ${118} Z M${x} ${118 - 30 * s} L${x - 15 * s} ${104 - 8 * s} L${x + 15 * s} ${104 - 8 * s} Z`} fill={c} />
    );
    return (
      <>
        <svg className="scene-far" viewBox="0 0 400 120" preserveAspectRatio="none">
          <path d="M0 70 Q100 40 200 64 T400 58 V120 H0Z" fill="#22492a" />
          {[40, 120, 210, 300, 370].map((x) => pine(x, 0.7, '#1b3d22'))}
        </svg>
        <svg className="scene-near" viewBox="0 0 400 120" preserveAspectRatio="none">
          {[20, 90, 165, 250, 330, 390].map((x) => pine(x, 1.05, '#0f2a17'))}
        </svg>
      </>
    );
  }
  return (
    <>
      <svg className="scene-far" viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M0 96 L70 46 L130 84 L200 34 L270 82 L330 52 L400 92 V120 H0 Z" fill="#9cc3e0" />
      </svg>
      <svg className="scene-near" viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M0 110 L90 60 L150 100 L240 54 L320 96 L400 66 V120 H0 Z" fill="#6f9dc4" />
        <path d="M240 54 L226 74 L256 74 Z M90 60 L80 76 L102 76 Z" fill="#ffffff" />
      </svg>
    </>
  );
}
