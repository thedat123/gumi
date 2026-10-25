// Edge Function: email-unsubscribe — link "Không nhận email nhắc nhở nữa" trong mail.
//   GET  → chỉ hiện trang XÁC NHẬN (không đổi gì): trình quét link của Gmail/antivirus tự mở link
//          sẽ không vô tình huỷ đăng ký của người chơi.
//   POST → đổi cài đặt: nút trên trang (action=off|on) hoặc nút huỷ 1 chạm của Gmail/Outlook
//          (RFC 8058, body "List-Unsubscribe=One-Click").
// Link có chữ ký HMAC theo user (EMAIL_UNSUB_SECRET, dùng chung với send-reminders).
//
// Triển khai (PHẢI public — người nhận mail không có JWT):
//   supabase functions deploy email-unsubscribe --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyUnsubscribeToken } from '../_shared/email.ts';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function page(title: string, body: string, form?: { action: 'on' | 'off'; label: string }, status = 200) {
  const button = form
    ? `<form method="post" style="margin-top:20px"><input type="hidden" name="action" value="${form.action}">
<button type="submit" style="border:0;border-radius:14px;padding:13px 22px;font-size:16px;font-weight:bold;cursor:pointer;background:${form.action === 'off' ? '#B8325A' : '#2F7A55'};color:#fff">${esc(form.label)}</button></form>`
    : '';
  return new Response(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#FFF7F0;font-family:Arial,Helvetica,sans-serif;color:#2A1A15">
<div style="max-width:420px;margin:16px;background:#fff;border-radius:20px;padding:28px 24px;text-align:center;border:1px solid #F1E0D6">
<h1 style="font-size:20px;margin:0 0 10px">${esc(title)}</h1><p style="margin:0;line-height:1.55;color:#6B5A52">${esc(body)}</p>${button}</div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return new Response(null, { status: 405 });
  const q = new URL(req.url).searchParams;
  const userId = q.get('u') ?? '';
  const token = q.get('t') ?? '';
  const secret = Deno.env.get('EMAIL_UNSUB_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || !url || !serviceKey) return page('Có lỗi xảy ra', 'Máy chủ chưa được cấu hình. Vui lòng thử lại sau.', undefined, 500);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !(await verifyUnsubscribeToken(secret, userId, token))) {
    return page('Link không hợp lệ', 'Link đã hỏng hoặc không đúng. Hãy dùng link trong email mới nhất.', undefined, 400);
  }

  if (req.method === 'GET') {
    return page('Không nhận email nhắc nhở nữa?', 'Bấm nút bên dưới để ngừng nhận email nhắc nhở từ Gumi. Thông báo trong app (nếu đã bật) vẫn hoạt động bình thường.',
      { action: 'off', label: 'Ngừng nhận email' });
  }

  const body = await req.text().catch(() => '');
  const form = new URLSearchParams(body);
  const oneClick = form.get('List-Unsubscribe') === 'One-Click';
  const on = !oneClick && form.get('action') === 'on';

  const { error } = await createClient(url, serviceKey).rpc('set_email_reminders', { p_user: userId, p_on: on });
  if (error) return page('Có lỗi xảy ra', 'Chưa lưu được thay đổi. Vui lòng thử lại sau.', undefined, 500);
  if (oneClick) return new Response(null, { status: 200 });
  return on
    ? page('Đã bật lại email nhắc nhở', 'Gumi sẽ tiếp tục gửi email nhắc bạn vào những ngày bạn chưa chơi.', { action: 'off', label: 'Ngừng nhận email' })
    : page('Đã ngừng email nhắc nhở', 'Bạn sẽ không nhận email nhắc nhở từ Gumi nữa. Đổi ý? Bấm nút bên dưới để bật lại.', { action: 'on', label: 'Bật lại email nhắc nhở' });
});
