import { describe, expect, it } from 'vitest';
import { advanceWater, createWaterState, resetWaterState, WATER_CONFIG, WATER_POOL, WATER_STEP } from './waterCatch';

describe('water catching game', () => {
  it('catches healthy drops once and keeps the pool reusable', () => {
    const s = createWaterState(); s.mode = 'play';
    Object.assign(s.drops[0], { active: true, x: .5, y: .84, speed: .3, good: true });
    advanceWater(s, WATER_STEP, 412, 750);
    expect(s.hp).toBe(15); expect(s.drops[0].active).toBe(false);
    advanceWater(s, WATER_STEP, 412, 750);
    expect(s.hp).toBe(15);
  });
  it('ends immediately on the last life, without a later drop turning death into victory', () => {
    const s = createWaterState(); s.mode = 'play'; s.hp = s.lives = 1;
    Object.assign(s.drops[0], { active: true, x: .5, y: .84, speed: .3, good: false });
    Object.assign(s.drops[1], { active: true, x: .5, y: .84, speed: .3, good: true });
    advanceWater(s, WATER_STEP, 412, 750);
    expect(s.mode).toBe('dead'); expect(s.hp).toBe(1); expect(s.lives).toBe(0);
  });
  it('never changes a win into a loss on the same step', () => {
    const s = createWaterState(); s.mode = 'play'; s.hp = s.lives = 1;
    Object.assign(s.drops[0], { active: true, x: .5, y: .84, speed: .3, good: true });
    Object.assign(s.drops[1], { active: true, x: .5, y: .84, speed: .3, good: false });
    advanceWater(s, WATER_STEP, 412, 750);
    expect(s.mode).toBe('won'); expect(s.lives).toBe(1);
  });
  it('uses fixed simulation steps at 30, 60 and 120 Hz', () => {
    const states = [30, 60, 120].map(fps => {
      const s = createWaterState(); s.mode = 'play'; s.target = .8;
      for (let i = 0; i < 2 * fps; i++) advanceWater(s, 1 / fps, 412, 750, WATER_CONFIG, () => .9);
      return s;
    });
    for (const s of states.slice(1)) {
      expect(s.x).toBeCloseTo(states[0].x, 9);
      expect(s.time).toBeCloseTo(states[0].time, 9);
      expect(s.drops[0].y).toBeCloseTo(states[0].drops[0].y, 9);
    }
  });
  it('does no simulation outside a live game and bounds catch-up after a long stall', () => {
    const s = createWaterState(); advanceWater(s, 10, 412, 750);
    expect(s.time).toBe(0); s.mode = 'play'; advanceWater(s, 10, 412, 750);
    expect(s.time).toBeLessThanOrEqual(.101);
  });
  it('keeps positions normalized when rotating and constrains the entire catcher to the field', () => {
    const s = createWaterState(); s.mode = 'play'; s.target = -10;
    advanceWater(s, .1, 360, 640);
    expect(s.target).toBeGreaterThanOrEqual(37 / 360);
    s.target = 10; advanceWater(s, .1, 844, 240);
    expect(s.target).toBeLessThanOrEqual(1 - 70 / 844);
  });
  it('restarts without allocating another drop pool or carrying state from a failed game', () => {
    const s = createWaterState(), pool = s.drops, first = s.drops[0];
    s.mode = 'dead'; s.lives = 0; s.hp = 3; s.drops[0].active = true;
    resetWaterState(s);
    expect(s.drops).toBe(pool); expect(s.drops[0]).toBe(first); expect(s.drops).toHaveLength(WATER_POOL);
    expect(s.hp).toBe(16); expect(s.lives).toBe(3); expect(s.mode).toBe('ready');
    expect(s.drops.every(d => !d.active)).toBe(true);
  });
});
