import { useEffect, useState } from 'react';

// Chạy ở máy (localhost / mạng LAN) thì QR vẫn trỏ về trang thật để điện thoại quét được.
export const PLAY_URL = `${/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname) ? 'https://matdo.pages.dev' : location.origin}/play`;

/** Ảnh QR (data URL) cho một đường dẫn; thư viện chỉ tải khi cần. */
export function useQr(text: string, width = 720) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    void import('qrcode').then((q) => q.toDataURL(text, { width, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#33231D', light: '#FFFFFF' } }))
      .then((d) => { if (alive) setSrc(d); }).catch(() => {});
    return () => { alive = false; };
  }, [text, width]);
  return src;
}
