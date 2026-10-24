import { describe, expect, it } from 'vitest';
import { dueReminder } from './reminders';

describe('in-app reminders in Vietnam time', () => {
  it('selects scheduled messages in Vietnam time', () => {
    expect(dueReminder(new Date('2026-10-01T01:00:00Z'), null, 2, null)?.minute).toBe(480);
    expect(dueReminder(new Date('2026-10-01T14:00:00Z'), null, 2, null)?.minute).toBe(1260);
    expect(dueReminder(new Date('2026-10-01T16:30:00Z'), null, 2, null)?.minute).toBe(1410);
  });

  it('stops all reminders after playing today', () => {
    expect(dueReminder(new Date('2026-10-01T14:00:00Z'), '2026-10-01', 2, null)).toBeNull();
  });

  it('stops reminders after completing today even without a play marker', () => {
    expect(dueReminder(new Date('2026-10-01T14:00:00Z'), null, 2, '2026-10-01')).toBeNull();
  });

  it('shows midnight recovery only when the previous day was missed', () => {
    const midnight = new Date('2026-09-30T17:00:00Z');
    expect(dueReminder(midnight, '2026-09-29', 2, null)?.minute).toBe(0);
    expect(dueReminder(midnight, '2026-09-30', 2, null)).toBeNull();
    expect(dueReminder(midnight, null, 2, '2026-09-30')).toBeNull();
    expect(dueReminder(midnight, null, 1, null)).toBeNull();
  });
  it.each([0, 480, 900, 1080, 1260, 1410])('allows only five minutes for slot %i', (minute) => {
    const start = Date.parse('2026-09-30T17:00:00Z') + minute * 60_000;
    expect(dueReminder(new Date(start - 1), null, 2, null)).toBeNull();
    expect(dueReminder(new Date(start), null, 2, null)?.minute).toBe(minute);
    expect(dueReminder(new Date(start + 299_999), null, 2, null)?.minute).toBe(minute);
    expect(dueReminder(new Date(start + 300_000), null, 2, null)).toBeNull();
  });

  it('never replays reminders hours late', () => {
    for (const time of ['2026-10-01T00:59:00Z', '2026-10-01T07:59:00Z', '2026-10-01T14:20:00Z']) {
      expect(dueReminder(new Date(time), null, 2, null)).toBeNull();
    }
  });

});
