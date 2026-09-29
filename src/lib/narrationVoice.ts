import type { Line } from '../content/vi';

export interface VoiceSpec { voice: string; rate: string; pitch: string }

// Bộ giọng vi-VN Edge-TTS dùng CHUNG cho cả game: người kể & Gumi = HoaiMy (nữ, ấm),
// Boss Đường = NamMinh (nam, trầm). Màu nhân vật tạo bằng rate/pitch (SSML prosody) →
// nghe như một dàn lồng tiếng nhất quán trên mọi thiết bị, không phụ thuộc giọng máy.
export const VOICE: Record<Line['who'], VoiceSpec> = {
  narrator: { voice: 'vi-VN-HoaiMyNeural', rate: '-6%', pitch: '+0%' },
  gumi:     { voice: 'vi-VN-HoaiMyNeural', rate: '+6%', pitch: '+25%' },
  boss:     { voice: 'vi-VN-NamMinhNeural', rate: '-8%', pitch: '-15%' },
};

// Hash ổn định theo nội dung (FNV-1a 32-bit) → tên file .mp3. PHẢI giống nhau ở script build
// và runtime để tìm đúng file. Đổi text/giọng → hash đổi → sinh file mới, file cũ có thể xoá.
export function narrationHash(who: Line['who'], text: string): string {
  const v = VOICE[who];
  const s = `${v.voice}|${v.rate}|${v.pitch}|${text}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const narrationUrl = (who: Line['who'], text: string) => `/narration/${narrationHash(who, text)}.mp3`;
