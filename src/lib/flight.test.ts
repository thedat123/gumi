import { describe, expect, it } from 'vitest';
import { flightAward, flightResolution, flightSize, FLIGHT_HEIGHT } from './flight';

describe('Flappy display and existing day 7 awards', () => {
  it('keeps the same world height and aspect ratio on portrait, landscape and desktop', () => {
    for (const [width,height] of [[360,620],[844,230],[1100,830]]) {
      const world=flightSize(width,height);
      expect(world.h).toBe(FLIGHT_HEIGHT);
      expect(world.w/world.h).toBeCloseTo(width/height);
    }
  });
  it('bounds scene pixel cost on high-DPI and large screens', () => {
    expect(flightResolution(390,650,3)).toBe(1.5);
    const dpr=flightResolution(1100,1000,3);
    expect(1100*1000*dpr*dpr).toBeCloseTo(700000);
    expect(flightResolution(3840,2160,3)).toBe(.75);
    expect(flightResolution(390,650,1)).toBe(1);
  });
  it('preserves pass and score boundaries', () => {
    expect([0,19,20,49,50,99,100].map(flightAward)).toEqual([0,0,20,20,50,50,100]);
  });
});
