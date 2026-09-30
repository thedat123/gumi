import type { SugarLevel } from './sugar';
import type { VlmResult } from './vlm';

const STEPS: SugarLevel[] = [0, 30, 50, 70, 100];

export function readSugarPercent(text: string): number | null {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');
  if (/(không đường|khong duong|no sugar|sugar free|unsweetened)/.test(normalized)) return 0;
  const near = normalized.match(/(\d{1,3})\s?%\s*(?:đường|duong|sugar)|(?:đường|duong|sugar)[^\d]{0,8}(\d{1,3})\s?%/);
  const value = near ? Number(near[1] ?? near[2]) : null;
  return value !== null && value <= 100 ? value : null;
}

export function drinkTarget(day: number, baseline: SugarLevel): number | null {
  if (day === 1) return STEPS[Math.max(0, STEPS.indexOf(baseline) - 1)]!;
  if (day === 5) return 50;
  if (day === 15) return 30;
  if (day === 20) return 0;
  return null;
}

export type DrinkVerdict = { kind: 'pass' | 'fail' | 'unknown'; title: string; detail: string; percent: number | null };

export function judgeDrink(day: number, baseline: SugarLevel, evidence: VlmResult | null): DrinkVerdict {
  const target = drinkTarget(day, baseline);
  if (!evidence?.ran || !evidence.ok) return { kind: 'fail', title: 'Ảnh chưa hợp lệ', detail: evidence?.reason || 'Hãy chụp rõ ly, bình nước hoặc tem/hoá đơn đồ uống.', percent: null };
  if (day === 10) {
    const noSugar = evidence.sugarPercent === 0 || (evidence.sugarPercent === null && evidence.isUnsweetened);
    if (evidence.sugarPercent !== null && evidence.sugarPercent > 0) return {
      kind: 'fail', title: 'Bình nước còn đường thêm vào',
      detail: `AI đọc được ${evidence.sugarPercent}% đường. Hôm nay hãy chuẩn bị nước không thêm đường nhé.`, percent: evidence.sugarPercent,
    };
    return evidence.isHomemade && noSugar
      ? { kind: 'pass', title: 'Bình nước của bạn đã đạt!', detail: 'AI nhận thấy bình nước tự chuẩn bị. Gumi đã sẵn sàng ghi nhận thử thách.', percent: evidence.sugarPercent }
      : { kind: 'unknown', title: 'Chưa xác nhận được bình nước DIY', detail: 'Hãy chụp rõ bình nước cá nhân và nguyên liệu không thêm đường. AI chưa đủ bằng chứng để xác nhận.', percent: evidence.sugarPercent };
  }
  const percent = evidence.sugarPercent ?? (evidence.isUnsweetened ? 0 : null);
  if (percent === null || target === null) return {
    kind: 'unknown', title: 'AI chưa đọc được mức đường',
    detail: 'Hãy chụp rõ mức đường trên tem/hoá đơn. Với nước lọc nguyên bản, chụp rõ ly hoặc chai nước.', percent: null,
  };
  if (percent > target) return {
    kind: 'fail', title: 'Chưa đạt mục tiêu hôm nay',
    detail: `AI đọc được ${percent}% đường, trong khi thử thách yêu cầu tối đa ${target}%. Hãy chọn mức thấp hơn và chụp lại nhé.`, percent,
  };
  return {
    kind: 'pass', title: 'Đạt mục tiêu hôm nay!',
    detail: `AI đọc được ${percent}% đường. Mục tiêu của bạn là tối đa ${target}%. Bạn có thể gửi check-in.`, percent,
  };
}

export function storedSugarLevel(percent: number): SugarLevel {
  const allowed: SugarLevel[] = [0, 30, 50, 70];
  return allowed.reduce((best, level) => Math.abs(level - percent) < Math.abs(best - percent) ? level : best);
}
