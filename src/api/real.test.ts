import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canEnterMission } from '../lib/missionAccess';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('./client', () => ({ supabase: { rpc } }));
import { createSupabaseApi } from './real';

beforeEach(() => rpc.mockReset());

describe('leaderboard RPC compatibility', () => {
  it('normalizes a null top list while preserving the current player rank', async () => {
    const me = { rank: 1, points: 100, gapToTop10: 0, top10LastName: '' };
    rpc.mockResolvedValueOnce({ data: { top: null, me }, error: null });
    const leaderboard = await createSupabaseApi().getLeaderboard();
    expect(rpc).toHaveBeenCalledWith('get_leaderboard', {});
    expect(leaderboard.top).toEqual([]);
    expect(leaderboard.top.length).toBe(0);
    expect(leaderboard.me).toEqual(me);
  });

  it('preserves populated and empty rankings', async () => {
    const top = [{ rank: 1, name: 'An', avatar: '🐻', points: 100, isMe: true }];
    for (const rows of [top, []]) {
      rpc.mockResolvedValueOnce({ data: { top: rows, me: null }, error: null });
      expect(await createSupabaseApi().getLeaderboard()).toEqual({ top: rows, me: null });
    }
  });

  it('propagates RPC errors', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'forbidden' } });
    await expect(createSupabaseApi().getLeaderboard()).rejects.toMatchObject({ code: 'forbidden' });
  });
});

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
