// Fallback GitHub runner; primary production scheduling should use Supabase pg_cron.
// Chạy bằng node --import tsx scripts/send-reminders.mjs. Gọi các RPC service_role sẵn có
// (reminder_targets / claim_push_slot / purge_push_log — migration 0021) rồi đẩy Web Push.
//
// Env cần (đặt ở GitHub → Settings → Secrets and variables → Actions):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// Lưu ý: VAPID_PUBLIC_KEY PHẢI cùng cặp với VITE_VAPID_PUBLIC_KEY (client). Sinh cặp: npm run vapid.
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

import { dueReminder } from '../supabase/functions/_shared/reminders.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@matdo.app';
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Thiếu env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
  process.exit(1);
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: targets, error } = await supabase.rpc('reminder_targets');
if (error) { console.error('reminder_targets lỗi:', error.message); process.exit(1); }

// FORCE_SEND=1 → gửi NGAY một noti thử cho MỌI subscription (bỏ qua lịch & chống trùng) để test trọn vòng.
const FORCE = process.env.FORCE_SEND === '1';
const now = new Date();
let sent = 0, skipped = 0, pruned = 0, recorded = 0;
const claimedUsers = new Set();
const notifiedUsers = new Set(); // 1 dòng noti / user / lần chạy (dù user có nhiều thiết bị)

for (const t of targets ?? []) {
  let payload;
  if (FORCE) {
    payload = { title: 'Mật Độ', body: 'Thông báo thử trọn vòng — bạn vừa nhận push từ GitHub! 🎉', url: '/', tag: 'gumi-test-now' };
  } else {
    if (t.phase !== 'running') { skipped++; continue; }
    const due = dueReminder(now, t.last_play_date, t.campaign_day, t.last_completed_date);
    if (!due) { skipped++; continue; }
    if (!claimedUsers.has(t.user_id)) {
      const { data: claimed, error: claimError } = await supabase.rpc('claim_push_slot', { p_user: t.user_id, p_date: due.date, p_minute: due.minute });
      if (claimError) throw claimError;
      if (!claimed) { skipped++; continue; }
      claimedUsers.add(t.user_id);
    }
    payload = { title: 'Mật Độ', body: due.text, url: `/chapter/${t.campaign_day}`, tag: `gumi-reminder-${due.date}` };
  }

  // GHI vào trung tâm thông báo (nguồn sự thật cho chuông) — 1 lần/user, dù push OS có hiện hay không.
  if (!notifiedUsers.has(t.user_id)) {
    notifiedUsers.add(t.user_id);
    const { error: insErr } = await supabase.from('notifications').insert({ user_id: t.user_id, title: payload.title, body: payload.body, url: payload.url });
    if (!insErr) recorded++;
  }

  try {
    await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(payload), { TTL: 300, urgency: 'high' });
    sent++;
  } catch (err) {
    const code = err?.statusCode;
    if (code === 404 || code === 410) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', t.endpoint);
      pruned++;
    } else {
      console.error('push lỗi', code, err?.body ?? err?.message);
    }
  }
}

await supabase.rpc('purge_push_log');
console.log(JSON.stringify({ ok: true, targets: (targets ?? []).length, sent, recorded, skipped, pruned }));
