import { useCallback, useEffect, useRef, useState } from 'react';
import type { Line } from '../content/vi';
import { narrationUrl } from './narrationVoice';

// Lồng tiếng cốt truyện: ưu tiên PHÁT FILE mp3 sinh sẵn bằng Edge-TTS (giọng vi-VN nhất quán mọi máy).
// Thiếu file (chưa generate) → tự lùi về Web Speech của trình duyệt cho câu đó.

// ---- Fallback Web Speech ----------------------------------------------------
const PITCH: Record<Line['who'], number> = { narrator: 1, gumi: 1.3, boss: 0.65 };
const RATE:  Record<Line['who'], number> = { narrator: 0.92, gumi: 1.02, boss: 0.85 };
const VOICE_PREFS = [/linh/i, /hoai\s*my/i, /nam\s*minh/i, /\bmicrosoft\b/i, /apple|siri/i];

function pickViVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const vi = voices.filter((v) => v.lang?.toLowerCase().startsWith('vi') || /vietnam/i.test(v.name));
  if (vi.length === 0) return undefined;
  for (const re of VOICE_PREFS) { const hit = vi.find((v) => re.test(v.name)); if (hit) return hit; }
  const pool = vi.filter((v) => !/google/i.test(v.name));
  const chosen = pool.length ? pool : vi;
  return chosen.find((v) => v.localService) ?? chosen[0];
}

let cachedVoice: SpeechSynthesisVoice | undefined;
let voicesReady = false;
function refreshVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const list = window.speechSynthesis.getVoices();
  if (list.length === 0) return cachedVoice;
  voicesReady = true;
  cachedVoice = pickViVoice(list);
  return cachedVoice;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => refreshVoice());
}

function speakFallback(line: Line, onDone: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) { onDone(); return; }
  const u = new SpeechSynthesisUtterance(line.text);
  const v = voicesReady ? cachedVoice : refreshVoice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? 'vi-VN';
  u.rate = RATE[line.who];
  u.pitch = PITCH[line.who];
  u.onend = onDone;
  u.onerror = onDone;
  window.speechSynthesis.speak(u);
}

/**
 * Đọc cốt truyện bằng giọng lồng sẵn (mp3), fallback Web Speech. Tự huỷ khi rời trang.
 */
export function useNarration() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0);

  const halt = useCallback(() => {
    tokenRef.current += 1; // vô hiệu mọi callback đang chờ của lượt trước
    const a = audioRef.current;
    if (a) { a.pause(); audioRef.current = null; }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const stop = useCallback(() => {
    halt();
    setSpeaking(false);
  }, [halt]);

  const speak = useCallback((lines: readonly Line[]) => {
    if (!supported || lines.length === 0) return;
    halt();
    const token = tokenRef.current;
    setSpeaking(true);

    let i = 0;
    const next = () => {
      if (token !== tokenRef.current) return; // đã bị huỷ / có lượt mới
      if (i >= lines.length) { setSpeaking(false); return; }
      const line = lines[i++];
      const cont = () => { if (token === tokenRef.current) next(); };
      const audio = new Audio(narrationUrl(line.who, line.text));
      audioRef.current = audio;
      audio.onended = cont;
      audio.onerror = () => { if (token === tokenRef.current) speakFallback(line, cont); }; // thiếu mp3 → Web Speech
      audio.play().catch(() => { if (token === tokenRef.current) speakFallback(line, cont); });
    };
    next();
  }, [supported, halt]);

  // Rời trang / unmount → tắt tiếng ngay.
  useEffect(() => () => halt(), [halt]);

  return { speak, stop, speaking, supported };
}
