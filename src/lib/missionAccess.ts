import type { DayState } from '../api/types';

/** Quyền QA áp dụng cho mọi trạng thái, chỉ trong các màn hợp lệ. */
export function canEnterMission(state: DayState | undefined, replayAll = false): boolean {
  return state !== undefined && (replayAll || state === 'open' || state === 'dying');
}
