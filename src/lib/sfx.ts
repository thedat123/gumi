// Âm thanh vui cho Gumi — tổng hợp bằng Web Audio (không cần file). Chỉ phát sau thao tác của người dùng.
let ctx: AudioContext | null = null;
let muted = (() => { try { return localStorage.getItem('ld_sfx') === 'off'; } catch { return false; } })();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('ld_sfx', m ? 'off' : 'on'); } catch { /* bỏ qua */ }
  if (m) stopAmbience();
  else if (ambWeather) setAmbience(ambWeather);
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = ctx || new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.08, when = 0, slideTo?: number) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur);
}

function crunch(when = 0) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + when;
  const dur = 0.07;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const n = a.createBufferSource(); n.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900;
  const g = a.createGain(); g.gain.setValueAtTime(0.06, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  n.connect(f).connect(g).connect(a.destination);
  n.start(t0); n.stop(t0 + dur);
}

/* ===== Âm thanh nền theo cảnh (ambient) — tổng hợp bằng Web Audio, rất nhẹ ===== */
export type Ambience = 'day' | 'cloudy' | 'sunset' | 'rain' | 'snow' | 'fog' | 'night';

let ambWeather: Ambience | null = null;
let ambNoise: AudioBufferSourceNode | null = null;
let ambFilter: BiquadFilterNode | null = null;
let ambGain: GainNode | null = null;
let ambTimer: number | undefined;

// Cấu hình tiếng nền cho từng thời tiết: độ to (gain) + màu tiếng (cutoff lọc).
const AMB: Record<Ambience, { gain: number; freq: number }> = {
  day: { gain: 0.008, freq: 700 }, cloudy: { gain: 0.014, freq: 560 }, sunset: { gain: 0.008, freq: 640 },
  rain: { gain: 0.05, freq: 1900 }, snow: { gain: 0.016, freq: 430 }, fog: { gain: 0.02, freq: 360 }, night: { gain: 0.011, freq: 520 },
};

function noiseBuffer(a: AudioContext): AudioBuffer {
  const len = a.sampleRate * 3;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0; // pink-ish noise cho mượt
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99 * b0 + w * 0.05; b1 = 0.96 * b1 + w * 0.08; b2 = 0.5 * b2 + w * 0.2; d[i] = (b0 + b1 + b2) * 0.4; }
  return buf;
}

function bird() {
  const base = 1700 + Math.random() * 1300;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) tone(base + Math.random() * 300, 0.06, 'sine', 0.014, i * 0.09, base * 1.25);
}
function cricket() { for (let i = 0; i < 6; i++) tone(4200, 0.02, 'square', 0.005, i * 0.03); }

/** Đặt/đổi tiếng nền theo thời tiết (null = tắt). Tự tôn trọng chế độ tắt tiếng. */
export function setAmbience(w: Ambience | null) {
  ambWeather = w;
  const a = ac();
  if (muted || !w || !a) { stopAmbience(); return; }
  if (!ambGain) {
    ambNoise = a.createBufferSource(); ambNoise.buffer = noiseBuffer(a); ambNoise.loop = true;
    ambFilter = a.createBiquadFilter(); ambFilter.type = 'lowpass';
    ambGain = a.createGain(); ambGain.gain.value = 0;
    ambNoise.connect(ambFilter).connect(ambGain).connect(a.destination);
    ambNoise.start();
  }
  const cfg = AMB[w];
  ambFilter!.frequency.setTargetAtTime(cfg.freq, a.currentTime, 0.5);
  ambGain!.gain.setTargetAtTime(cfg.gain, a.currentTime, 0.9); // fade mượt sang mức mới
  window.clearInterval(ambTimer); ambTimer = undefined;
  if (w === 'day' || w === 'sunset') ambTimer = window.setInterval(() => { if (!muted && Math.random() < 0.6) bird(); }, 4200);
  else if (w === 'night') ambTimer = window.setInterval(() => { if (!muted) cricket(); }, 1400);
}

export function stopAmbience() {
  if (ambGain && ctx) ambGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  window.clearInterval(ambTimer); ambTimer = undefined;
}

export type Sfx = 'pop' | 'boing' | 'happy' | 'chew' | 'sip' | 'sleep' | 'sparkle' | 'wrong' | 'win';

export function playSfx(s: Sfx) {
  switch (s) {
    case 'pop': tone(520, 0.12, 'triangle', 0.09, 0, 760); break;
    case 'boing': tone(300, 0.18, 'sine', 0.09, 0, 640); tone(640, 0.12, 'sine', 0.04, 0.06, 420); break;
    case 'happy': [523, 659, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.07, i * 0.08)); break;
    case 'chew': crunch(0); crunch(0.13); crunch(0.26); break;
    case 'sip': tone(420, 0.3, 'sine', 0.06, 0, 190); break;
    case 'sleep': tone(300, 0.5, 'sine', 0.05, 0, 170); break;
    case 'sparkle': [784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'sine', 0.05, i * 0.06)); break;
    // sai: tiếng "trượt" trầm đi xuống
    case 'wrong': tone(320, 0.16, 'sawtooth', 0.05, 0, 190); tone(240, 0.14, 'sawtooth', 0.035, 0.09, 150); break;
    // chiến thắng: đoạn nhạc reo vui + lấp lánh
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, i * 0.09)); [1319, 1568].forEach((f, i) => tone(f, 0.2, 'sine', 0.045, 0.36 + i * 0.08)); break;
  }
}
