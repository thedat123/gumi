import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canEnterMission } from '../lib/missionAccess';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('./client', () => ({ supabase: { rpc } }));
import { createSupabaseApi } from './real';

beforeEach(() => rpc.mockReset());

describe('tester replay with an older journey RPC', () => {
  it.each([undefined, false])('opens completed day 14 when replayAll is %s', async (replayAll) => {
    rpc.mockResolvedValueOnce({ data: { days: Array(14).fill('checked'), replayAll }, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    const journey = await createSupabaseApi().getJourney();
    expect(rpc).toHaveBeenLastCalledWith('_is_tester', {});
    expect(journey.days[13]).toBe('checked');
    expect(canEnterMission(journey.days[13], journey.replayAll)).toBe(true);
  });

  it('keeps completed missions closed for regular players', async () => {
    rpc.mockResolvedValueOnce({ data: { days: ['checked'], replayAll: false }, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    const journey = await createSupabaseApi().getJourney();
    expect(canEnterMission(journey.days[0], journey.replayAll)).toBe(false);
  });

  it('preserves an explicit replay grant without another request', async () => {
    rpc.mockResolvedValueOnce({ data: { days: ['checked'], replayAll: true }, error: null });
    expect((await createSupabaseApi().getJourney()).replayAll).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('does not grant access when the tester check fails', async () => {
    rpc.mockResolvedValueOnce({ data: { days: ['checked'] }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });
    const journey = await createSupabaseApi().getJourney();
    expect(canEnterMission(journey.days[0], journey.replayAll)).toBe(false);
  });
});
