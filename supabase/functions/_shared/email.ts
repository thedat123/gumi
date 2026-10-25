// Email nhắc nhở (SMTP) — dựng nội dung, link huỷ nhận có ký HMAC, phân loại lỗi SMTP.
// Chỉ dùng Web Crypto nên chạy được cả trên Deno (Edge Function) lẫn Node (test).

export interface ReminderEmail {
  to: string; name: string | null; text: string; day: number; minute: number;
  appUrl: string; unsubscribeUrl: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Chữ ký cho link huỷ nhận: chỉ ai có đúng link trong mail mới đổi được cài đặt của user đó. */
export const unsubscribeToken = (secret: string, userId: string) => hmacHex(secret, `unsub:${userId}`);

export async function verifyUnsubscribeToken(secret: string, userId: string, token: string): Promise<boolean> {
  const expected = await unsubscribeToken(secret, userId);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

/** Mốc giờ nào được gửi email: "HH:MM,HH:MM" (giờ VN). Bỏ trống/sai → mọi mốc. */
export function parseEmailSlots(raw: string | undefined): Set<number> | null {
  if (!raw?.trim()) return null;
  const minutes = raw.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  });
  return minutes.length && minutes.every(Number.isFinite) ? new Set(minutes) : null;
}

/** Tiêu đề theo mốc giờ — mỗi mốc một câu, tránh 6 mail giống hệt nhau bị gộp/đánh spam. */
export function reminderSubject(day: number, minute: number): string {
  const d = day >= 1 && day <= 14 ? ` · Ngày ${day}/14` : '';
  if (minute < 8 * 60) return `Gumi nhớ bạn lắm đó 👻${d}`;
  if (minute < 15 * 60) return `Thử thách hôm nay đã mở${d}`;
  if (minute < 18 * 60) return `Giải lao chút với Gumi nhé 🐱${d}`;
  if (minute < 21 * 60) return `Gumi vẫn đang đợi bạn${d}`;
  if (minute < 23 * 60) return `Còn kịp chơi hôm nay đó!${d}`;
  return `Sắp hết ngày rồi — giữ chuỗi nào!${d}`;
}

/** Nội dung 1 email nhắc nhở (from/to/subject/html/text/headers) để gửi qua SMTP. */
export function reminderEmailPayload(from: string, e: ReminderEmail) {
  const hello = e.name ? `Chào ${e.name},` : 'Chào bạn,';
  const playUrl = `${e.appUrl.replace(/\/$/, '')}/chapter/${e.day}`;
  const subject = reminderSubject(e.day, e.minute);
  // Preheader: dòng xem trước trong hộp thư (ẩn trong thân mail).
  const preheader = e.text.length > 110 ? `${e.text.slice(0, 107)}…` : e.text;
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#FFF7F0;font-family:Arial,Helvetica,sans-serif;color:#2A1A15">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7F0;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:28px 24px;border:1px solid #F1E0D6">
<tr><td style="font-size:13px;font-weight:bold;letter-spacing:1px;color:#B8325A">MẬT ĐỘ · 14 NGÀY BỚT NGỌT</td></tr>
<tr><td style="padding-top:14px;font-size:16px">${esc(hello)}</td></tr>
<tr><td style="padding-top:10px;font-size:16px;line-height:1.55">${esc(e.text)}</td></tr>
<tr><td style="padding-top:22px"><a href="${esc(playUrl)}" style="display:inline-block;background:#B8325A;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:13px 24px;border-radius:14px">Vào chơi cùng Gumi</a></td></tr>
<tr><td style="padding-top:26px;font-size:12px;line-height:1.5;color:#8A7A72">Bạn nhận mail này vì đã đăng ký thử thách Mật Độ. Đây là hộp thư tự động, vui lòng không trả lời. <a href="${esc(e.unsubscribeUrl)}" style="color:#8A7A72">Không nhận email nhắc nhở nữa</a>.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${hello}\n\n${e.text}\n\nVào chơi: ${playUrl}\n\n—\nBạn nhận mail này vì đã đăng ký thử thách Mật Độ. Không nhận email nhắc nhở nữa: ${e.unsubscribeUrl}`;
  return {
    from, to: e.to, subject, html, text,
    headers: { 'List-Unsubscribe': `<${e.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click', 'Auto-Submitted': 'auto-generated' },
  };
}

export type SmtpVerdict =
  | { kind: 'retry' }            // lỗi tạm (mạng, 4xx) → thử lại sau
  | { kind: 'stop' }             // chạm giới hạn gửi / sai cấu hình SMTP → dừng lô, trả lại hàng đợi
  | { kind: 'bad_address' }      // địa chỉ không tồn tại → bỏ & tắt email người đó
  | { kind: 'rejected' };        // bị từ chối vĩnh viễn vì lý do khác → bỏ mail này

/** Phân loại lỗi nodemailer theo mã SMTP (RFC 5321/3463). */
export function classifySmtpError(err: { code?: string; responseCode?: number; response?: string; message?: string }): SmtpVerdict {
  const code = err.responseCode ?? 0;
  const text = `${err.response ?? ''} ${err.message ?? ''}`;
  if (err.code === 'EAUTH' || code === 530 || code === 534 || code === 535) return { kind: 'stop' }; // sai tài khoản/mật khẩu SMTP
  if (/\b4\.7\.0\b|\b5\.4\.5\b|quota|rate limit|too many|daily (user )?sending/i.test(text) || code === 421 || code === 454) return { kind: 'stop' };
  if (code >= 500 && code < 600) {
    if (/\b5\.1\.[0-3]\b|no such user|does not exist|user unknown|invalid recipient|address rejected/i.test(text) || code === 550 && /recipient|mailbox/i.test(text)) return { kind: 'bad_address' };
    return { kind: 'rejected' };
  }
  return { kind: 'retry' };
}
