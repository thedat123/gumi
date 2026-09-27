import { useState } from 'react';
import { vi } from '../content/vi';
import { useInstallPrompt } from '../lib/useInstallPrompt';

/** Icon tải-về-máy (mũi tên vào khay) — không có trong bộ Icon nên vẽ inline. */
function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
    </svg>
  );
}

/** Nút "Cài app" hiện khi trình duyệt cho cài PWA; iOS Safari thì mở hướng dẫn thủ công. */
export function InstallButton({ className = '' }: { className?: string }) {
  const { show, canInstall, promptInstall } = useInstallPrompt();
  const [hint, setHint] = useState(false);
  if (!show) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (canInstall ? promptInstall() : setHint(true))}
        className={`inline-flex h-9 items-center gap-1.5 rounded-pill bg-primary px-3 text-caption font-bold text-on-primary shadow-pop outline-none transition-all hover:brightness-[1.06] active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${className}`}
      >
        <DownloadIcon /><span>{vi.pwa.install}</span>
      </button>

      {hint && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-text/50 p-4 sm:items-center" onClick={() => setHint(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="ios-install-title" className="safe-bottom w-full max-w-sm rounded-card bg-surface p-5 text-center shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div aria-hidden="true" className="mb-2 text-headline">📲</div>
            <h2 id="ios-install-title" className="text-title font-bold">{vi.pwa.iosTitle}</h2>
            <p className="mt-2 text-small text-muted">{vi.pwa.iosBody}</p>
            <button type="button" onClick={() => setHint(false)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-5 font-semibold text-on-primary shadow-pop">{vi.pwa.close}</button>
          </div>
        </div>
      )}
    </>
  );
}
