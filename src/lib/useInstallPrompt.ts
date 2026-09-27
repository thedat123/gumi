import { useCallback, useEffect, useRef, useState } from 'react';

/** Sự kiện cài PWA của Chrome/Android (chưa có trong lib DOM chuẩn). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const ua = () => (typeof navigator !== 'undefined' ? navigator.userAgent : '');
const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);
const isIOS = () => /iphone|ipad|ipod/i.test(ua());
const isSafari = () => /safari/i.test(ua()) && !/crios|fxios|android|chrome/i.test(ua());

/**
 * Nút "Cài app" (PWA): bắt `beforeinstallprompt` để tự bật nút cài trên Android/Chrome;
 * iOS Safari không có sự kiện này → trả cờ để hiện hướng dẫn "Thêm vào MH chính".
 * Ẩn hoàn toàn khi app đã ở chế độ standalone (đã cài).
 */
export function useInstallPrompt() {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [needsIosHint, setNeedsIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) { setInstalled(true); return; }
    const onBIP = (e: Event) => { e.preventDefault(); deferred.current = e as BeforeInstallPromptEvent; setCanInstall(true); };
    const onInstalled = () => { setInstalled(true); setCanInstall(false); deferred.current = null; };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    if (isIOS() && isSafari()) setNeedsIosHint(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const e = deferred.current;
    if (!e) return;
    await e.prompt();
    const res = await e.userChoice;
    if (res.outcome === 'accepted') { setCanInstall(false); deferred.current = null; }
  }, []);

  return { show: !installed && (canInstall || needsIosHint), canInstall, needsIosHint, promptInstall };
}
