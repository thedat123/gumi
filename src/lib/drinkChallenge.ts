import type { SugarLevel } from './sugar';
import type { VlmResult } from './vlm';

const STEPS: SugarLevel[] = [0, 30, 50, 70, 100];

// Từ khoá chỉ MỨC NGỌT trên tem/hoá đơn: quán VN ghi cả "đường" lẫn "ngọt" (và tiếng Anh sugar/sweet).
const SWEET_KW = '(?:đường|duong|ngọt|ngot|sugar|sweet)';

/**
 * Đọc mức đường (%) KHAI TRÊN TEM/HOÁ ĐƠN. Chấp nhận nhiều cách ghi thật của quán VN:
 *  • "70% đường", "đường 70%", "70 đường", "Đường: 70", "ngọt 50", "50% ngọt"  (có/không dấu %)
 *  • "không đường/không ngọt/sugar free/0% đường" → 0
 *  • định tính theo thang quán: "ít đường/ít ngọt" → 30, "nửa đường/half sugar" → 50
 * Vẫn chỉ đọc con số GHI SẴN nên không nới lỏng chống gian lận; bỏ qua % lạc ("giảm giá 50%").
 */
export function readSugarPercent(text: string): number | null {
  const t = text.toLowerCase().replace(/\s+/g, ' ');
  // Con số gắn LIỀN với từ khoá đường/ngọt (hai chiều), có hoặc KHÔNG có dấu %. Bắt số TRƯỚC để
  // "70% ngọt" ra 70 (không nhầm số 0 cuối thành "0% ngọt"); "0% đường" vẫn ra 0.
  const near = t.match(new RegExp(`(?<!\\d)(\\d{1,3})\\s?%?\\s*${SWEET_KW}|${SWEET_KW}[\\s:()\\-]{0,4}(\\d{1,3})\\s?%?`));
  if (near) { const n = Number(near[1] ?? near[2]); if (n >= 0 && n <= 100) return n; }
  // Cụm chữ chỉ 0% (không kèm số): nước/không đường/không ngọt/sugar free.
  if (new RegExp(`(?:không|khong|no|zero)\\s*${SWEET_KW}|sugar[\\s-]?free|unsweetened`).test(t)) return 0;
  // Mức ngọt định tính theo thang phổ biến của quán trà sữa VN.
  if (/ít\s*(?:đường|ngọt)|it\s*(?:duong|ngot)|less\s*sugar/.test(t)) return 30;
  if (/nửa\s*(?:đường|ngọt)|nua\s*(?:duong|ngot)|half\s*sugar/.test(t)) return 50;
  return null;
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
  // AI chạy KHÔNG xong (mạng/quá tải/thiết bị yếu) — KHÔNG phải ảnh sai → cho gửi admin duyệt tay.
  if (!evidence?.ran) return { kind: 'unknown', title: 'AI chưa kiểm được ảnh', detail: evidence?.reason || 'AI đang bận hoặc thiết bị chưa nhận diện được. Bạn có thể gửi ban tổ chức duyệt tay.', percent: null };
  // AI chạy xong nhưng KHÔNG thấy đồ uống → ảnh sai thật, nên chụp lại (vẫn có thể gửi duyệt tay nếu chắc).
  if (!evidence.ok) return { kind: 'fail', title: 'Ảnh chưa hợp lệ', detail: evidence.reason || 'Hãy chụp rõ ly, bình nước hoặc tem/hoá đơn đồ uống.', percent: null };
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
