import { useCallback, useEffect, useRef, useState } from 'react';
import type { Line } from '../content/vi';

// Cao độ giọng theo nhân vật để "người đọc" có màu sắc: người kể trầm đều, Gumi cao lảnh, Boss Đường trầm.
const PITCH: Record<Line['who'], number> = { narrator: 1, gumi: 1.25, boss: 0.7 };

/**
 * Đọc cốt truyện bằng giọng nói (Web Speech API, tiếng Việt). Không cần file audio.
 * Trả về speak/stop + trạng thái. Tự huỷ khi rời trang.
 */
export function useNarration() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const active = useRef(false);

  const pickVoice = useCallback(() => {
    if (!supported) return undefined;
    const vs = window.speechSynthesis.getVoices();
    return vs.find((v) => v.lang?.toLowerCase().startsWith('vi')) ?? vs.find((v) => /vietnam/i.test(v.name));
  }, [supported]);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    active.current = false;
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback((lines: readonly Line[]) => {
    if (!supported || lines.length === 0) return;
    window.speechSynthesis.cancel();
    const voice = pickVoice();
    active.current = true;
    setSpeaking(true);
    lines.forEach((ln, i) => {
      const u = new SpeechSynthesisUtterance(ln.text);
      if (voice) u.voice = voice;
      u.lang = 'vi-VN';
      u.rate = 0.98;
      u.pitch = PITCH[ln.who];
      if (i === lines.length - 1) u.onend = () => { if (active.current) { active.current = false; setSpeaking(false); } };
      window.speechSynthesis.speak(u);
    });
  }, [supported, pickVoice]);

  // Rời trang / unmount → tắt tiếng ngay.
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  return { speak, stop, speaking, supported };
}
