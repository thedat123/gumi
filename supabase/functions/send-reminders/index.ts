// Edge Function: send-reminders
// pg_cron gọi mỗi phút → tìm user tới giờ nhắc (reminder_targets), chống trùng (claim_push_slot),
// rồi đẩy Web Push. Dọn subscription chết (404/410). Chạy bằng SERVICE ROLE (bỏ qua RLS).
//
// Triển khai:
//   supabase functions deploy send-reminders
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@domain
//   (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY được Supabase tự tiêm vào runtime)
// Lịch chạy: xem supabase/functions/send-reminders/cron.sql

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

// ——— Bảng lịch nhắc (GIỮ ĐỒNG BỘ với src/lib/reminders.ts) ———
const REMINDERS = [
  { minute: 0, text: '👻 Bạn có thấy bóng dáng ai đó vừa bỏ lỡ challenge hôm nay không? Chính là bạn đấyy!!!!, nhanh tay vào khôi phục lại chuỗi nào.' },
  { minute: 8 * 60, text: 'Thử thách hôm nay đang chờ bạn chinh phục đấy, Dành ít phút cho Gumi trước khi bắt đầu một ngày bận rộn nào.' },
  { minute: 15 * 60, text: 'Gumi nhớ bạn rồi đấy, vào thăm Gumi một xíu được hong' },
  { minute: 16 * 60, text: 'Đến giờ giải lao òi, đừng quên giảm đường cùng Gumi nhé bạn ơi 🐱' },
  { minute: 17 * 60, text: 'Hãy thực hiện thử thách hôm nay đi nhé, coi như là vì tớ đi☺️' },
  { minute: 20 * 60, text: 'Biết là bận rồi nhưng mà để ý Gumi một tí đi🥲' },
  { minute: 21 * 60, text: 'Cả ngày trôi qua rồi mà bạn vẫn chưa ghé thăm tôi? Đừng để tôi phải đến tận nhà gõ cửa nhé đấy nhé!' },
  { minute: 23 * 60 + 30, text: 'Đừng hòng đi ngủ yên ổn nếu chưa hoàn thành challenge hôm nay. Hoàn thành ngay trước khi quá muộn!' },
] as const;

interface Due { date: string; minute: number; text: string }

function vnParts(now: Date): { date: string; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const v = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${v('year')}-${v('month')}-${v('day')}`, minute: Number(v('hour')) * 60 + Number(v('minute')) };
}

function dueReminder(now: Date, lastPlayDate: string | null, campaignDay: number, lastCompletedDate: string | null): Due | null {
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
  const reminder = [...REMINDERS].reverse().find((r) => r.minute <= minute)!;
  return { date, ...reminder };
}

interface Target {
  user_id: string; endpoint: string; p256dh: string; auth: string;
  campaign_day: number; phase: string; last_play_date: string | null; last_completed_date: string | null;
}

Deno.serve(async (_req) => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const pub = Deno.env.get('VAPID_PUBLIC_KEY');
  const priv = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@leveldown.app';
  if (!url || !serviceKey || !pub || !priv) {
    return Response.json({ error: 'Thiếu env: SUPABASE_URL / SERVICE_ROLE / VAPID_*' }, { status: 500 });
  }
  webpush.setVapidDetails(subject, pub, priv);
  const supabase = createClient(url, serviceKey);

  const { data: targets, error } = await supabase.rpc('reminder_targets');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const now = new Date();
  let sent = 0, skipped = 0, pruned = 0;

  for (const t of (targets ?? []) as Target[]) {
    if (t.phase !== 'running') { skipped++; continue; }
    const due = dueReminder(now, t.last_play_date, t.campaign_day, t.last_completed_date);
    if (!due) { skipped++; continue; }

    // Giành suất gửi (đã gửi mốc này hôm nay thì bỏ) — chống cron mỗi phút gửi lặp.
    const { data: claimed } = await supabase.rpc('claim_push_slot', { p_user: t.user_id, p_date: due.date, p_minute: due.minute });
    if (!claimed) { skipped++; continue; }

    try {
      await webpush.sendNotification(
        { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
        JSON.stringify({ title: 'Gumi nhắc bạn 🐱', body: due.text, url: `/chapter/${t.campaign_day}`, tag: `gumi-reminder-${due.date}` }),
      );
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', t.endpoint);
        pruned++;
      }
    }
  }

  await supabase.rpc('purge_push_log');
  return Response.json({ ok: true, targets: (targets ?? []).length, sent, skipped, pruned });
});
