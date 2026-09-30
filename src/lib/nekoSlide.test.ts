import { describe, expect, it } from 'vitest';
import { canFit, fallCats, horizontalRange, landingRow, pushUp, settleRows, START_CATS, type NekoCat } from './nekoSlide';

describe('Neko Slide board', () => {
  it('keeps a cat on its row and stops at neighbours', () => {
    expect(horizontalRange(START_CATS, START_CATS[4]!)).toEqual([2, 4]);
    expect(horizontalRange(START_CATS, START_CATS[0]!)).toEqual([0, 2]);
  });

  it('lands the tray cat in the lowest row with a contiguous gap', () => {
    expect(landingRow(START_CATS, 4, 2)).toBe(9);
    expect(landingRow(START_CATS, 0, 2)).toBe(7);
    expect(canFit(START_CATS, 9, 5, 2)).toBe(false);
  });

  it('clears a full row and moves rows above down', () => {
    const filled: NekoCat[] = [...START_CATS, { id: 6, row: 9, col: 4, len: 2, style: 'gold' }];
    const result = settleRows(filled);
    expect(result.cleared).toBe(1);
    expect(result.cats.every((cat) => cat.row === 9)).toBe(true);
    expect(result.cats).toHaveLength(2);
  });

  it('drops cats through open rows but stops when any body cell is supported', () => {
    const cats: NekoCat[] = [
      { id: 10, row: 3, col: 1, len: 3, style: 'rose' },
      { id: 11, row: 8, col: 2, len: 1, style: 'gold' },
    ];
    expect(fallCats(cats).map(({ id, row }) => [id, row])).toEqual([[10, 8], [11, 9]]);
  });

  it('raises all existing rows once when the tray cat enters the bottom', () => {
    const result = pushUp(START_CATS, { id: 6, col: 3, len: 2, style: 'gold' });
    expect(result?.find((cat) => cat.id === 0)?.row).toBe(7);
    expect(result?.find((cat) => cat.id === 6)?.row).toBe(9);
    expect(pushUp([{ id: 1, row: 0, col: 0, len: 1, style: 'gold' }],
      { id: 2, col: 1, len: 1, style: 'rose' })).toBeNull();
  });
});
