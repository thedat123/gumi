// Nhận diện MẠNH NHẤT: dùng VLM (vision-language model) Google Gemini — model thị giác hàng đầu, có FREE TIER.
// VLM khác hẳn nhận diện thường: nó ĐỌC được tem/nhãn, hiểu "ly trà sữa 50% đường", nên có thể ĐỐI CHIẾU mức đường
// với mức người chơi khai. Bật bằng cách đặt VITE_GEMINI_API_KEY (lấy free tại https://aistudio.google.com/apikey).
// Không có key thì tự động dùng bản on-device (CLIP) — xem ./vision.ts.

const KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
// Chuỗi model dự phòng (ưu tiên flash-lite = nhanh nhất). Free-tier hay 503 quá tải theo từng model,
// nên thử lần lượt: model nào đang rảnh sẽ trả nhanh; model nghẽn thì bỏ qua NGAY (timeout) thay vì chờ ~20s.
// Đặt VITE_GEMINI_MODEL để ép dùng đúng 1 model.
const ENV_MODEL = import.meta.env.VITE_GEMINI_MODEL as string | undefined;
const MODELS = ENV_MODEL ? [ENV_MODEL] : ['gemini-2.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash'];
const urlOf = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
const TIMEOUT_MS = 4500; // bỏ qua model treo sau 4.5s (ưu tiên trả nhanh)

export const vlmAvailable = !!KEY;

export interface VlmResult {
  available: boolean;   // có cấu hình key & gọi được không
  ran: boolean;         // gọi model xong không (dù kết quả gì)
  ok: boolean;          // đủ điều kiện pass (là đồ uống thật, đủ tin cậy)
  isDrink: boolean;
  drink: string;
  sugarPercent: number | null; // % đường đọc được trên tem (nếu có)
  isHomemade?: boolean; // bình nước tự chuẩn bị nhìn thấy rõ
  isUnsweetened?: boolean; // chỉ true khi rõ nước lọc hoặc nhãn 0%/không đường
  confidence: number;   // 0..1
  reason: string;
}

const EMPTY: VlmResult = { available: false, ran: false, ok: false, isDrink: false, drink: '', sugarPercent: null, confidence: 0, reason: '' };

function toBase64(blob: Blob): Promise<{ mime: string; data: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const comma = s.indexOf(',');
      resolve({ mime: blob.type || 'image/jpeg', data: s.slice(comma + 1) });
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

const PROMPT = `Bạn là giám khảo check-in cho thử thách giảm đường. Xem ảnh và đánh giá NGHIÊM TÚC để chống gian lận.
Hỏi:
1) Đây có phải ảnh MỘT LY/CỐC/CHAI ĐỒ UỐNG thật, hoặc TEM/NHÃN/HOÁ ĐƠN của một ly nước không? (ảnh phong cảnh, người, đồ ăn, ảnh chụp màn hình... => không hợp lệ)
2) Nếu có: tên đồ uống là gì? Trên tem/nhãn có ghi mức đường bao nhiêu phần trăm không? Không suy đoán % từ vẻ ngoài.
3) Đây có rõ là bình nước tự chuẩn bị (nước lọc, nước thả lát trái cây hoặc trà túi lọc không đường) không?
4) Chỉ đánh dấu không đường khi thấy rõ nước lọc nguyên bản hoặc nhãn ghi 0%/không đường. Đừng suy ra trà, cà phê hay nước trái cây không đường chỉ từ màu sắc.
Chỉ trả về DUY NHẤT một JSON, không kèm chữ nào khác:
{"isDrink": true/false, "drink": "tên đồ uống hoặc ''", "sugarPercent": số 0-100 hoặc null nếu không thấy, "isHomemade": true/false, "isUnsweetened": true/false, "confidence": số 0..1, "reason": "giải thích ngắn bằng tiếng Việt"}`;

/** Xác minh ảnh check-in bằng Gemini VLM. Trả EMPTY (available:false) nếu chưa cấu hình key. */
export async function verifyDrink(file: Blob): Promise<VlmResult> {
  if (!KEY) return EMPTY;
  try {
    const { compressImage } = await import('./image');
    const small = await compressImage(file, 1280, 0.8); // 1280px: đọc được TEM nhỏ trên ly; vẫn nhẹ để upload + suy diễn nhanh
    const { mime, data } = await toBase64(small);
    const body = JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data } }] }],
      // thinkingBudget: 0 → TẮT bước "suy nghĩ" của Gemini 2.5 Flash-Lite (giảm mạnh độ trễ, thường về dưới ~1s).
      generationConfig: { temperature: 0, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 220 },
    });

    for (const model of MODELS) {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(urlOf(model), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctrl.signal });
      } catch {
        continue; // timeout / lỗi mạng → thử model kế
      } finally {
        clearTimeout(to);
      }
      if (res.status === 503 || res.status === 429 || res.status === 404) continue; // quá tải/không có → model kế
      if (!res.ok) return { ...EMPTY, available: true };
      const j = await res.json();
      const text: string = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const p = JSON.parse(text) as Partial<VlmResult>;
      const isDrink = !!p.isDrink;
      const confidence = typeof p.confidence === 'number' ? p.confidence : 0;
      return {
        available: true,
        ran: true,
        ok: isDrink && confidence >= 0.6,
        isDrink,
        drink: typeof p.drink === 'string' ? p.drink : '',
        sugarPercent: typeof p.sugarPercent === 'number' && Number.isFinite(p.sugarPercent) && p.sugarPercent >= 0 && p.sugarPercent <= 100 ? p.sugarPercent : null,
        isHomemade: p.isHomemade === true,
        isUnsweetened: p.isUnsweetened === true,
        confidence,
        reason: typeof p.reason === 'string' ? p.reason : '',
      };
    }
    return { ...EMPTY, available: true }; // mọi model đều quá tải → CheckIn báo "thử lại"
  } catch {
    return { ...EMPTY, available: true };
  }
}
