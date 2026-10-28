// Nhóm tuổi dùng chung cho màn khảo sát (người chơi) và thống kê (admin).

export const AGE_MIN = 6;
export const AGE_MAX = 99;

export interface AgeGroup {
  id: string;
  label: string;
  hint: string;
  emoji: string;
  min: number;
  max: number;
  color: string;
}

export const AGE_GROUPS: AgeGroup[] = [
  { id: 'u18', label: 'Dưới 18', hint: 'Học sinh', emoji: '🎒', min: AGE_MIN, max: 17, color: '#EF9F2A' },
  { id: '18_22', label: '18–22', hint: 'Sinh viên', emoji: '🎓', min: 18, max: 22, color: '#B83556' },
  { id: '23_29', label: '23–29', hint: 'Mới đi làm', emoji: '💼', min: 23, max: 29, color: '#55768C' },
  { id: '30_39', label: '30–39', hint: 'Đi làm', emoji: '☕', min: 30, max: 39, color: '#1F7A4D' },
  { id: '40p', label: '40+', hint: 'Trung niên', emoji: '🌿', min: 40, max: AGE_MAX, color: '#7A5AA6' },
];

export function isValidAge(age: unknown): age is number {
  return typeof age === 'number' && Number.isInteger(age) && age >= AGE_MIN && age <= AGE_MAX;
}

export function ageGroupOf(age: number | null | undefined): AgeGroup | null {
  if (!isValidAge(age)) return null;
  return AGE_GROUPS.find((g) => age >= g.min && age <= g.max) ?? null;
}

export interface AgeRow<T> {
  group: AgeGroup;
  items: T[];
}

/** Gom danh sách theo nhóm tuổi; người chưa trả lời vào `unknown`. */
export function groupByAge<T extends { age?: number | null }>(items: T[]): { rows: AgeRow<T>[]; unknown: T[] } {
  const rows = AGE_GROUPS.map((group) => ({ group, items: [] as T[] }));
  const unknown: T[] = [];
  for (const it of items) {
    const g = ageGroupOf(it.age);
    if (!g) unknown.push(it);
    else rows.find((r) => r.group.id === g.id)!.items.push(it);
  }
  return { rows, unknown };
}

/** Trung vị của các tuổi hợp lệ; null nếu không có ai. */
export function medianAge(ages: (number | null | undefined)[]): number | null {
  const xs = ages.filter(isValidAge).sort((a, b) => a - b);
  if (!xs.length) return null;
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m]! : Math.round((xs[m - 1]! + xs[m]!) / 2);
}
