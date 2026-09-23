// Nhận diện ảnh check-in bằng CLIP zero-shot (Transformers.js / Hugging Face) — chạy on-device, MIỄN PHÍ, không cần key.
// Thay vì bắt model tự "dò vật thể" (khó, hay sai), ta ĐƯA ĐỀ: so ảnh với các mô tả đồ uống vs không-đồ-uống.
// CLIP hiểu ngữ cảnh rộng nên phân biệt "ly trà sữa/cà phê/chai nước" với "đồ ăn/người/phong cảnh" chính xác hơn nhiều.
import { pipeline } from '@huggingface/transformers';

export interface VisionResult {
  ok: boolean;
  labels: string[];
  /** Xác suất tổng ảnh là đồ uống (0..1). */
  score: number;
  ran: boolean;
  unavailable?: boolean;
}

// Đề "đúng" (đồ uống) và "sai" (không phải) cho CLIP so sánh. Càng đa dạng, càng ít nhầm.
const DRINK_PROMPTS = [
  'a photo of a cup of bubble tea',
  'a photo of a milk tea drink with a straw',
  'a photo of a plastic cup of iced drink',
  'a photo of a coffee cup',
  'a photo of a glass of beverage',
  'a photo of a bottle of water or soft drink',
  'a photo of a takeaway drink cup',
];
const OTHER_PROMPTS = [
  'a photo of a plate of food',
  'a photo of a person or a selfie',
  'a photo of a room or a landscape',
  'a photo of a phone or computer screen',
  'a photo of a random object',
  'a photo of an empty background',
];
const ALL_PROMPTS = [...DRINK_PROMPTS, ...OTHER_PROMPTS];
const DRINK_SET = new Set(DRINK_PROMPTS);
const OK_THRESHOLD = 0.5; // tổng xác suất các đề "đồ uống" phải ≥ 50%

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Classifier = (input: string, labels: string[]) => Promise<any>;
let clsP: Promise<Classifier> | null = null;
async function classifier(): Promise<Classifier> {
  if (!clsP) {
    // CLIP ViT-B/32 (OpenAI) — bản Xenova cho web, tải 1 lần rồi cache trong trình duyệt.
    clsP = (pipeline as unknown as (task: string, model: string, opts?: Record<string, unknown>) => Promise<Classifier>)(
      'zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', { dtype: 'q8' },
    );
  }
  return clsP;
}

/** Tải ảnh từ File/Blob thành <img> để đưa vào model. */
export function fileToImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 20000); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

interface ClsItem { score: number; label: string }

/** Ảnh có phải đồ uống (ly/cốc/chai) không — theo tổng xác suất các đề "đồ uống" của CLIP. */
export async function detectDrink(img: HTMLImageElement): Promise<VisionResult> {
  try {
    const cls = await classifier();
    const out = (await cls(img.src, ALL_PROMPTS)) as ClsItem[];
    const drinkProb = out.filter((o) => DRINK_SET.has(o.label)).reduce((s, o) => s + o.score, 0);
    const ok = drinkProb >= OK_THRESHOLD;
    return { ok, labels: ok ? [`đồ uống ${Math.round(drinkProb * 100)}%`] : [], score: drinkProb, ran: true };
  } catch {
    return { ok: false, labels: [], score: 0, ran: false, unavailable: true };
  }
}
