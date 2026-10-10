// Gửi lời nhắc Web Push TỪ GITHUB ACTIONS (thay cho Supabase Edge Function + pg_cron).
// Chạy theo lịch trong .github/workflows/reminders.yml. Gọi các RPC service_role sẵn có
// (reminder_targets / claim_push_slot / purge_push_log — migration 0021) rồi đẩy Web Push.
//
// Env cần (đặt ở GitHub → Settings → Secrets and variables → Actions):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// Lưu ý: VAPID_PUBLIC_KEY PHẢI cùng cặp với VITE_VAPID_PUBLIC_KEY (client). Sinh cặp: npm run vapid.
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// ——— Bảng lịch nhắc (GIỮ ĐỒNG BỘ với src/lib/reminders.ts & edge function cũ) ———
const REMINDERS = [
  { minute: 0, text: '👻 Bạn có thấy bóng dáng ai đó vừa bỏ lỡ challenge hôm nay không? Chính là bạn đấyy!!!!, nhanh tay vào khôi phục lại chuỗi nào.' },
  { minute: 8 * 60, text: 'Thử thách hôm nay đang chờ bạn chinh phục đấy, Dành ít phút cho Gumi trước khi bắt đầu một ngày bận rộn nào.' },
  { minute: 15 * 60, text: 'Gumi nhớ bạn rồi đấy, vào thăm Gumi một xíu được hong' },
  { minute: 16 * 60, text: 'Đến giờ giải lao òi, đừng quên giảm đường cùng Gumi nhé bạn ơi 🐱' },
  { minute: 17 * 60, text: 'Hãy thực hiện thử thách hôm nay đi nhé, coi như là vì tớ đi☺️' },
  { minute: 20 * 60, text: 'Biết là bận rồi nhưng mà để ý Gumi một tí đi🥲' },
  { minute: 21 * 60, text: 'Cả ngày trôi qua rồi mà bạn vẫn chưa ghé thăm tôi? Đừng để tôi phải đến tận nhà gõ cửa nhé đấy nhé!' },
  { minute: 23 * 60 + 30, text: 'Đừng hòng đi ngủ yên ổn nếu chưa hoàn thành challenge hôm nay. Hoàn thành ngay trước khi quá muộn!' },
];

function vnParts(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const v = (t) => parts.find((p) => p.type === t).value;
  return { date: `${v('year')}-${v('month')}-${v('day')}`, minute: Number(v('hour')) * 60 + Number(v('minute')) };
}

function dueReminder(now, lastPlayDate, campaignDay, lastCompletedDate) {
  const { date, minute } = vnParts(now);
  if (lastPlayDate === date || lastCompletedDate === date) return null;
  if (minute < 8 * 60) {
    if (campaignDay <= 1) return null;
    const yesterday = new Date(`${date}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const y = yesterday.toISOString().slice(0, 10);
    if (lastPlayDate === y || lastCompletedDate === y) return null;
    return { date, ...REMINDERS[0] };
  }
  const reminder = [...REMINDERS].reverse().find((r) => r.minute <= minute);
  return { date, ...reminder };
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@leveldown.app';
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
const notifiedUsers = new Set(); // 1 dòng noti / user / lần chạy (dù user có nhiều thiết bị)

for (const t of targets ?? []) {
  let payload;
  if (FORCE) {
    payload = { title: 'Level Down Challenge', body: 'Thông báo thử trọn vòng — bạn vừa nhận push từ GitHub! 🎉', url: '/', tag: 'gumi-test-now' };
  } else {
    if (t.phase !== 'running') { skipped++; continue; }
    const due = dueReminder(now, t.last_play_date, t.campaign_day, t.last_completed_date);
    if (!due) { skipped++; continue; }
    const { data: claimed } = await supabase.rpc('claim_push_slot', { p_user: t.user_id, p_date: due.date, p_minute: due.minute });
    if (!claimed) { skipped++; continue; }
    payload = { title: 'Level Down Challenge', body: due.text, url: `/chapter/${t.campaign_day}`, tag: `gumi-reminder-${due.date}` };
  }

  // GHI vào trung tâm thông báo (nguồn sự thật cho chuông) — 1 lần/user, dù push OS có hiện hay không.
  if (!notifiedUsers.has(t.user_id)) {
    notifiedUsers.add(t.user_id);
    const { error: insErr } = await supabase.from('notifications').insert({ user_id: t.user_id, title: payload.title, body: payload.body, url: payload.url });
    if (!insErr) recorded++;
  }

  try {
    await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(payload));
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
