// Nhận diện check-in bằng GOOGLE CLOUD VISION API — nhanh (<0.5s), rẻ (~$1.5/1000 ảnh), scale cực lớn.
//  • LABEL_DETECTION + OBJECT_LOCALIZATION → biết ảnh có phải LY/CỐC/CHAI ĐỒ UỐNG không.
//  • TEXT_DETECTION (OCR) → đọc % đường trên tem/nhãn để đối chiếu.
// Bật bằng VITE_GCV_API_KEY (khoá API của một Google Cloud project đã bật Cloud Vision API).
// LƯU Ý: nên gọi qua server/edge và hạn chế khoá theo HTTP referrer khi lên production.
import type { VlmResult } from './vlm';
import { readSugarPercent } from './drinkChallenge';

const KEY = import.meta.env.VITE_GCV_API_KEY as string | undefined;
export const gcvAvailable = !!KEY;
const ENDPOINT = `https://vision.googleapis.com/v1/images:annotate?key=${KEY}`;
const TIMEOUT_MS = 6000;

const EMPTY: VlmResult = { available: false, ran: false, ok: false, isDrink: false, drink: '', sugarPercent: null, confidence: 0, reason: '' };

// Nhãn/vật thể (Vision trả tiếng Anh) gợi ý ĐỒ UỐNG.
const DRINK_HINTS = [
  'drink', 'beverage', 'drinkware', 'tableware', 'serveware', 'cup', 'coffee cup', 'teacup', 'mug', 'bubble tea', 'milk tea', 'boba',
  'tea', 'teapot', 'coffee', 'espresso', 'americano', 'latte', 'cappuccino', 'macchiato', 'cortado', 'matcha', 'juice', 'smoothie', 'milkshake',
  'soft drink', 'non-alcoholic', 'cola', 'soda', 'energy drink', 'kombucha', 'lemonade', 'iced tea', 'drinking',
  'bottle', 'water bottle', 'plastic bottle', 'tumbler', 'highball glass', 'pint glass', 'cocktail', 'straw',
];
// Chữ trên ảnh (OCR) cho thấy đây là TEM/NHÃN/HOÁ ĐƠN của một ly nước — nhiệm vụ DRINK cho phép chụp tem/hoá đơn.
const TEXT_DRINK_RE = /(đường|duong|sugar|trà|tra\b|cà phê|ca phe|coffee|tea|size\s?[sml]|\bml\b|topping|trân châu|tran chau|latte|matcha|milk|smoothie|juice)/i;

interface Ann { description?: string; name?: string; score?: number }

/** Tìm mức đường trong text OCR khi số gắn với từ "đường/sugar". */
function findSugar(raw: string): number | null {
  const explicit = readSugarPercent(raw);
  if (explicit !== null) return explicit;
  const t = raw.toLowerCase().replace(/\s+/g, ' ');
  if (/(không đường|khong duong|no sugar|sugar free|unsweetened|0\s?%\s*(?:đường|duong|sugar))/.test(t)) return 0;
  // Menu VN hay ghi số TRƯỚC chữ ("70% đường"); cũng bắt kiểu "đường 70%". Ưu tiên số cạnh từ khoá đường.
  const near = t.match(/(\d{1,3})\s?%?\s*(?:đường|duong|sugar)|(?:đường|duong|sugar)[^\d]{0,8}(\d{1,3})\s?%?/);
  if (near) { const n = +(near[1] ?? near[2]!); if (n <= 100) return n; }
  return null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const s = String(r.result); res(s.slice(s.indexOf(',') + 1)); }; r.onerror = rej; r.readAsDataURL(blob); });
}

/** Xác minh ảnh là đồ uống + đọc % đường bằng Google Cloud Vision. Trả EMPTY nếu chưa cấu hình khoá. */
export async function verifyDrink(file: Blob): Promise<VlmResult> {
  if (!KEY) return EMPTY;
  try {
    const { compressImage } = await import('./image');
    // 1280px: đủ nét để OCR đọc TEM/HOÁ ĐƠN nhỏ trên ly (640px làm mất chữ), vẫn nhẹ ~240KB để upload nhanh.
    const small = await compressImage(file, 1280, 0.8);
    const content = await blobToBase64(small);
    const body = JSON.stringify({
      requests: [{
        image: { content },
        features: [{ type: 'LABEL_DETECTION', maxResults: 15 }, { type: 'OBJECT_LOCALIZATION', maxResults: 10 }, { type: 'TEXT_DETECTION' }],
      }],
    });
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try { res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctrl.signal }); }
    catch { return { ...EMPTY, available: true }; }
    finally { clearTimeout(to); }
    if (!res.ok) return { ...EMPTY, available: true };

    const j = await res.json();
    const r = j?.responses?.[0] ?? {};
    const labels: Ann[] = r.labelAnnotations ?? [];
    const objects: Ann[] = r.localizedObjectAnnotations ?? [];
    const text: string = r.fullTextAnnotation?.text ?? r.textAnnotations?.[0]?.description ?? '';

    // Điểm "đồ uống" = score cao nhất trong các nhãn/vật thể khớp gợi ý.
    let best = 0; let name = '';
    for (const a of [...labels, ...objects]) {
      const d = (a.description ?? a.name ?? '').toLowerCase();
      if (DRINK_HINTS.some((k) => d.includes(k))) { const sc = a.score ?? 0; if (sc > best) { best = sc; name = a.description ?? a.name ?? ''; } }
    }
    const sugarPercent = findSugar(text);
    const textDrinkSignal = TEXT_DRINK_RE.test(text);
    // Chấp nhận khi:
    //  • thấy rõ ly/cốc/chai (nhãn đồ uống ≥ 0.5), HOẶC
    //  • nhãn đồ uống vừa phải (≥ 0.35) kèm % đường / chữ đồ uống trên ảnh, HOẶC
    //  • ảnh TEM/HOÁ ĐƠN ly nước: đọc được % đường + có từ khoá đồ uống (nhiệm vụ cho phép).
    // Ảnh đồ ăn/người/phong cảnh gần như không có nhãn đồ uống nào (best≈0) nên vẫn bị loại.
    const isDrink =
      best >= 0.5 ||
      (best >= 0.35 && (sugarPercent !== null || textDrinkSignal)) ||
      (sugarPercent !== null && textDrinkSignal);
    return {
      available: true, ran: true, ok: isDrink, isDrink,
      drink: name, sugarPercent, confidence: best,
      isUnsweetened: sugarPercent === 0,
      reason: isDrink
        ? `Nhận ra: ${name || (sugarPercent !== null ? `tem/hoá đơn (${sugarPercent}% đường)` : 'đồ uống')}`
        : 'Chưa thấy ly/cốc/chai hay tem/hoá đơn đồ uống — chụp rõ ly nước hoặc tem giảm đường nhé.',
    };
  } catch { return { ...EMPTY, available: true }; }
}
