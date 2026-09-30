export const NEKO_COLS = 8;
export const NEKO_ROWS = 10;

export type NekoStyle = 'burgundy' | 'rose' | 'gold' | 'blue' | 'cream' | 'brown';
export interface NekoCat {
  id: number;
  row: number;
  col: number;
  len: number;
  style: NekoStyle;
}

export const START_CATS: NekoCat[] = [
  { id: 0, row: 8, col: 0, len: 4, style: 'cream' },
  { id: 1, row: 8, col: 6, len: 2, style: 'rose' },
  { id: 2, row: 9, col: 0, len: 1, style: 'gold' },
  { id: 3, row: 9, col: 1, len: 1, style: 'cream' },
  { id: 4, row: 9, col: 2, len: 2, style: 'cream' },
  { id: 5, row: 9, col: 6, len: 2, style: 'cream' },
];

// Pattern 2+2+... gives the player a clear first line, then mixes lengths.
export const CAT_QUEUE: { len: number; style: NekoStyle }[] = [
  { len: 2, style: 'gold' }, { len: 2, style: 'cream' },
  { len: 3, style: 'rose' }, { len: 2, style: 'cream' }, { len: 3, style: 'blue' },
  { len: 2, style: 'brown' }, { len: 2, style: 'gold' }, { len: 2, style: 'cream' },
];

export function horizontalRange(cats: NekoCat[], cat: NekoCat): [number, number] {
  const row = cats.filter((other) => other.row === cat.row && other.id !== cat.id);
  const left = row.reduce((edge, other) => other.col + other.len <= cat.col ? Math.max(edge, other.col + other.len) : edge, 0);
  const right = row.reduce((edge, other) => other.col >= cat.col + cat.len ? Math.min(edge, other.col) : edge, NEKO_COLS);
  return [left, right - cat.len];
}

export function canFit(cats: NekoCat[], row: number, col: number, len: number): boolean {
  return row >= 0 && row < NEKO_ROWS && col >= 0 && col + len <= NEKO_COLS
    && cats.every((other) => other.row !== row || col + len <= other.col || col >= other.col + other.len);
}

export function landingRow(cats: NekoCat[], col: number, len: number): number {
  // A cat enters from the bottom tray: stop at the first row with enough space.
  for (let row = NEKO_ROWS - 1; row >= 0; row--) if (canFit(cats, row, col, len)) return row;
  return -1;
}

/** Let each cat fall as far as its entire body can fit. Lower cats settle first. */
export function fallCats(cats: NekoCat[]): NekoCat[] {
  const settled: NekoCat[] = [];
  for (const cat of [...cats].sort((a, b) => b.row - a.row || a.id - b.id)) {
    let row = cat.row;
    while (row < NEKO_ROWS - 1 && canFit(settled, row + 1, cat.col, cat.len)) row++;
    settled.push({ ...cat, row });
  }
  return settled.sort((a, b) => a.id - b.id);
}

/** A new cat enters the bottom row and raises the existing stack by one row. */
export function pushUp(cats: NekoCat[], cat: Omit<NekoCat, 'row'>): NekoCat[] | null {
  if (cats.some((item) => item.row === 0)) return null;
  return [...cats.map((item) => ({ ...item, row: item.row - 1 })), { ...cat, row: NEKO_ROWS - 1 }];
}

export function filledRows(cats: NekoCat[]): number[] {
  return Array.from({ length: NEKO_ROWS }, (_, row) => row).filter((row) =>
    cats.filter((cat) => cat.row === row).reduce((total, cat) => total + cat.len, 0) === NEKO_COLS);
}

export function settleRows(cats: NekoCat[]): { cats: NekoCat[]; cleared: number } {
  let result = cats;
  let cleared = 0;
  while (true) {
    const full = filledRows(result);
    if (!full.length) break;
    cleared += full.length;
    result = result.filter((cat) => !full.includes(cat.row)).map((cat) => ({
      ...cat, row: cat.row + full.filter((row) => row > cat.row).length,
    }));
  }
  return { cats: fallCats(result), cleared };
}

export function hasOpenLanding(cats: NekoCat[], len: number): boolean {
  return Array.from({ length: NEKO_COLS - len + 1 }, (_, col) => landingRow(cats, col, len)).some((row) => row >= 0);
}
