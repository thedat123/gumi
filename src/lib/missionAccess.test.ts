import { describe, expect, it } from 'vitest';
import { canEnterMission } from './missionAccess';
import type { DayState } from '../api/types';

const states: DayState[] = ['open', 'dying', 'checked', 'passed', 'missed', 'rejected', 'future'];
describe('mission access', () => {
  it.each(states)('tester can play a %s mission', (state) => {
    expect(canEnterMission(state, true)).toBe(true);
  });
  it.each(states)('regular player keeps progression rules for %s', (state) => {
    expect(canEnterMission(state)).toBe(state === 'open' || state === 'dying');
  });
  it('does not unlock a nonexistent mission', () => {
    expect(canEnterMission(undefined, true)).toBe(false);
  });
});
