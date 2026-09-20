// Công thức ước tính đường (quyết định D7 trong brief.md). Chỉ là ước tính, luôn hiển thị kèm "≈".
export type SugarLevel = 0 | 30 | 50 | 70 | 100;
const GRAMS: Record<SugarLevel, number> = { 100: 40, 70: 28, 50: 20, 30: 12, 0: 0 };

export const gramsPerDrink = (level: SugarLevel): number => GRAMS[level];
export const weeklySugarGrams = (level: SugarLevel, drinksPerWeek: number): number => GRAMS[level] * drinksPerWeek;
export const gramsToSpoons = (grams: number): number => Math.round((grams / 4) * 10) / 10;
