// Sinh sẵn audio lồng tiếng cốt truyện bằng Edge-TTS (vi-VN, miễn phí) → public/narration/<hash>.mp3.
// Chạy: npm run gen:narration. Idempotent — file đã có thì bỏ qua (content-addressed theo hash).
// Cần mạng (gọi máy chủ Microsoft). File .mp3 được commit và phục vụ tĩnh; build/CI KHÔNG cần chạy lại.
/// <reference types="node" />
import { createWriteStream, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { vi } from '../src/content/vi';
import type { Line } from '../src/content/vi';
import { VOICE, narrationHash } from '../src/lib/narrationVoice';

const OUT = join(process.cwd(), 'public', 'narration');
mkdirSync(OUT, { recursive: true });

// Gom mọi câu thoại có giọng trong cốt truyện (intro + win của 21 chương), khử trùng lặp theo hash.
const lines = new Map<string, Line>();
for (const ch of vi.story.chapters) {
  for (const ln of [...ch.intro, ...ch.win]) lines.set(narrationHash(ln.who, ln.text), ln);
}

// Một lượt tổng hợp: pipeline tự gắn error handler (socket đóng sớm → reject, không văng uncaught).
async function synthOnce(spec: (typeof VOICE)[Line['who']], text: string, tmp: string): Promise<void> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(spec.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: spec.rate, pitch: spec.pitch });
  audioStream.on('error', () => {}); // luôn có listener → destroy(err) không văng uncaught. KHÔNG gọi tts.close()
  await pipeline(audioStream, createWriteStream(tmp)); // (tránh onclose lần 2). Socket dọn khi process.exit.
}

// Edge-TTS thỉnh thoảng đóng socket sớm (audio cụt) → thử lại vài lần cho chắc.
async function synth(spec: (typeof VOICE)[Line['who']], text: string, file: string): Promise<void> {
  const tmp = `${file}.part`;
  for (let attempt = 1; ; attempt++) {
    try {
      await synthOnce(spec, text, tmp);
      renameSync(tmp, file);
      return;
    } catch (e) {
      if (existsSync(tmp)) unlinkSync(tmp);
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
}

let made = 0, skipped = 0;
for (const [hash, ln] of lines) {
  const file = join(OUT, `${hash}.mp3`);
  if (existsSync(file)) { skipped++; continue; }
  await synth(VOICE[ln.who], ln.text, file);
  made++;
  console.log(`✓ ${hash} [${ln.who}] ${ln.text.slice(0, 42)}…`);
}
console.log(`\nXong: tạo ${made} file, bỏ qua ${skipped}. Tổng ${lines.size} câu → public/narration/`);
process.exit(0);
