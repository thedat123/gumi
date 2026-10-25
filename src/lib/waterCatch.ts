/** Day 14 physics. No DOM, React, network or allocations in the simulation loop. */
export type WaterMode = 'ready' | 'play' | 'dead' | 'won';
export interface WaterConfig { hp: number; every: number; bad: number; fall: number; burst: number }
// Ngày 14: đường (bad) nhiều hơn nước — 60% đường / 40% nước, rơi dày hơn để tăng độ khó.
export const WATER_CONFIG: WaterConfig = { hp: 16, every: .34, bad: .6, fall: 190, burst: 0 };
export const WATER_STEP = 1 / 60;
export const WATER_POOL = 24;
export interface WaterDrop { active: boolean; x: number; y: number; previousX: number; previousY: number; speed: number; good: boolean; kind: number; sway: number }
export interface WaterState {
  mode: WaterMode; x: number; target: number; hp: number; lives: number;
  time: number; spawn: number; burst: number; accumulator: number; drops: WaterDrop[];
}
export const waterClamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function createWaterState(config = WATER_CONFIG): WaterState {
  return { mode: 'ready', x: .5, target: .5, hp: config.hp, lives: 3,
    time: 0, spawn: 0, burst: 0, accumulator: 0,
    drops: Array.from({ length: WATER_POOL }, () => ({ active: false, x: 0, y: 0, previousX: 0, previousY: 0, speed: 0, good: true, kind: 0, sway: 0 })),
  };
}
export function resetWaterState(state: WaterState, config = WATER_CONFIG) {
  state.mode = 'ready'; state.x = state.target = .5; state.hp = config.hp; state.lives = 3;
  state.time = state.spawn = state.burst = state.accumulator = 0;
  for (const drop of state.drops) drop.active = false;
}
function spawn(state: WaterState, config: WaterConfig, random: () => number, x?: number) {
  const drop = state.drops.find(d => !d.active);
  if (!drop) return;
  drop.active = true; drop.x = drop.previousX = x ?? .08 + random() * .84;
  drop.y = drop.previousY = -.04;
  drop.speed = (config.fall + (1 - state.hp / config.hp) * 90) / 620;
  drop.good = x === undefined && random() > config.bad;
  drop.kind = Math.floor(random() * 3); drop.sway = random() * Math.PI * 2;
}
/** Fixed steps keep catch outcomes independent of refresh rate; catch-up is bounded after stalls. */
export function advanceWater(state: WaterState, dt: number, width: number, height: number, config = WATER_CONFIG, random = Math.random) {
  if (state.mode !== 'play') { state.accumulator = 0; return; }
  state.accumulator = Math.min(.1, state.accumulator + Math.max(0, dt));
  const catcherWidth = waterClamp(width * .17, 74, 140);
  const rx = catcherWidth / (2 * Math.max(1, width));
  const ry = catcherWidth / (2 * Math.max(1, height));
  while (state.accumulator >= WATER_STEP && state.mode === 'play') {
    state.accumulator -= WATER_STEP; state.time += WATER_STEP;
    state.target = waterClamp(state.target, rx, 1 - rx);
    state.x += (state.target - state.x) * (1 - Math.exp(-12 * WATER_STEP));
    state.spawn += WATER_STEP;
    if (state.spawn >= config.every) { state.spawn -= config.every; spawn(state, config, random); }
    if (config.burst > 0) {
      state.burst += WATER_STEP;
      if (state.burst >= config.burst) {
        state.burst -= config.burst;
        const center = .2 + random() * .6;
        for (let i = -1; i <= 1; i++) spawn(state, config, random, center + i * .12);
      }
    }
    for (const drop of state.drops) {
      if (!drop.active) continue;
      drop.previousY = drop.y; drop.previousX = drop.x;
      drop.y += drop.speed * WATER_STEP;
      drop.x += Math.sin(state.time * 2 + drop.sway) * 12 / Math.max(1, width) * WATER_STEP;
      if (drop.y >= .85 - ry * .5 && drop.previousY <= .85 + ry && Math.abs(drop.x - state.x) < rx) {
        drop.active = false;
        if (drop.good) { state.hp = Math.max(0, state.hp - 1); if (!state.hp) state.mode = 'won'; }
        else { state.lives = Math.max(0, state.lives - 1); if (!state.lives) state.mode = 'dead'; }
        // Terminal states are final: later drops cannot turn a loss into a win (or the reverse).
        if (state.mode !== 'play') break;
      } else if (drop.y > 1.08) drop.active = false;
    }
  }
}
