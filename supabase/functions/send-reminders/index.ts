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

import { dueReminder } from '../_shared/reminders.ts';

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

  const claimedUsers = new Set<string>();
  for (const t of (targets ?? []) as Target[]) {
    if (t.phase !== 'running') { skipped++; continue; }
    const due = dueReminder(now, t.last_play_date, t.campaign_day, t.last_completed_date);
    if (!due) { skipped++; continue; }

    // Giành suất gửi (đã gửi mốc này hôm nay thì bỏ) — chống cron mỗi phút gửi lặp.
    if (!claimedUsers.has(t.user_id)) {
      const { data: claimed, error: claimError } = await supabase.rpc('claim_push_slot', { p_user: t.user_id, p_date: due.date, p_minute: due.minute });
      if (claimError) return Response.json({ error: claimError.message }, { status: 500 });
      if (!claimed) { skipped++; continue; }
      claimedUsers.add(t.user_id);
      const { error: recordError } = await supabase.from('notifications').insert({
        user_id: t.user_id, title: 'Mật Độ', body: due.text, url: `/chapter/${t.campaign_day}`,
      });
      if (recordError) console.error('notification insert failed', recordError.message);
    }

    try {
      await webpush.sendNotification(
        { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
        JSON.stringify({ title: 'Mật Độ', body: due.text, url: `/chapter/${t.campaign_day}`, tag: `gumi-reminder-${due.date}-${due.minute}` }),
        { TTL: 300, urgency: 'high' },
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
