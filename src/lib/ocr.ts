// Nhận diện TEM/nhãn/hoá đơn ly nước bằng OCR chạy hẳn trên trình duyệt (Tesseract.js — miễn phí, không cần API key,
// ảnh không rời máy người dùng). Nếu thiết bị không chạy được thì trả unavailable để ban tổ chức duyệt tay.
export interface OcrResult { ok: boolean; text: string; unavailable?: boolean }

// Từ khoá đặc trưng của tem/hoá đơn ĐỒ UỐNG (có cả biến thể có dấu & không dấu vì OCR đôi khi mất dấu).
// Đã bỏ các token quá chung ('da', 'ice', 'oz', 'ly') vì hay khớp bừa với chữ ngẫu nhiên.
const TOKENS = [
  'duong', 'đường', 'tra sua', 'trà sữa', 'tra', 'trà', 'sua', 'sữa', 'ca phe', 'cà phê', 'coffee', 'tea', 'milk', 'sugar',
  'tong', 'tổng', 'vnd', 'hoa don', 'hoá đơn', 'order', 'bill', 'latte', 'matcha', 'topping', 'tran chau', 'trân châu',
  'size', 'ml', 'cup', 'highlands', 'phuc long', 'phúc long', 'gong cha', 'koi', 'starbucks', 'the coffee', 'mixue',
];

/**
 * Có phải ảnh tem/hoá đơn ly nước không.
 * Chặt hơn để ảnh bất kỳ KHÔNG lọt: cần MỘT dấu hiệu số mạnh (%, dung tích, size, giá tiền)
 * HOẶC ít nhất HAI từ khoá đồ uống khác nhau.
 */
export function hasStamp(raw: string): boolean {
  const t = raw.toLowerCase();
  const compact = t.replace(/\s+/g, '');
  if (compact.length < 6) return false;
  const strong = /\d\s?%|\d{2,4}\s?ml|size\s?[sml]\b|\d[.,]\d{3}/i; // % đường / dung tích / size / giá tiền
  if (strong.test(raw)) return true;
  const hits = new Set(TOKENS.filter((k) => t.includes(k))).size;
  return hits >= 2;
}

/** Đọc ảnh bằng OCR (vie+eng). onProgress: 0..100 khi đang nhận diện. */
export async function readStamp(file: Blob, onProgress?: (p: number) => void): Promise<OcrResult> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('vie+eng', 1, {
      logger: (m: { status: string; progress: number }) => { if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100)); },
    });
    const { data } = await worker.recognize(file);
    await worker.terminate();
    return { ok: hasStamp(data.text), text: data.text };
  } catch {
    return { ok: false, text: '', unavailable: true };
  }
}
