// Edge Function: send-reminders — pg_cron gọi mỗi phút.
// Xét từng người chơi (reminder_users). Tới mốc nhắc thì giành suất (claim_push_slot, 1 lần/người/mốc/ngày):
// ghi thông báo trong app và gửi Web Push NGAY tới mọi thiết bị.
//
// Triển khai: supabase functions deploy send-reminders (CI tự làm — xem docs/reminders.md)
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

import { dueReminder } from '../_shared/reminders.ts';

interface ReminderUser {
  user_id: string; campaign_day: number; phase: string;
  last_play_date: string | null; last_completed_date: string | null;
}
interface Sub { user_id: string; endpoint: string; p256dh: string; auth: string }

/** So sánh hằng thời gian (không lộ độ dài khớp qua thời gian phản hồi). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Mô tả loại key (không lộ giá trị) để báo lỗi dễ sửa: role trong JWT, hoặc tiền tố key kiểu mới. */
function keyKind(key: string): string {
  if (!key) return 'không có key';
  if (key.startsWith('sb_publishable_')) return 'đây là publishable key (công khai)';
  if (key.startsWith('sb_secret_')) return 'key sb_secret_ không hợp lệ hoặc đã bị thu hồi';
  try {
    const payload = JSON.parse(atob(key.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')));
    return `JWT role=${payload.role ?? '?'}, project=${payload.ref ?? '?'}`;
  } catch { return 'không đọc được định dạng key'; }
}

Deno.serve(async (req) => {
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) as { testEmail?: string } : {};
  const env = (k: string) => Deno.env.get(k)?.trim() || undefined;
  const url = env('SUPABASE_URL'), serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const pub = env('VAPID_PUBLIC_KEY'), priv = env('VAPID_PRIVATE_KEY');
  if (!url || !serviceKey || !pub || !priv) {
    return Response.json({ error: 'Thiếu env: SUPABASE_URL / SERVICE_ROLE / VAPID_*' }, { status: 500 });
  }

  webpush.setVapidDetails(env('VAPID_SUBJECT') ?? 'mailto:admin@leveldown.app', pub, priv);
  const supabase = createClient(url, serviceKey);

  // ---------- Chế độ GỬI THỬ cho đúng 1 tài khoản (GitHub Actions "Push reminders") ----------
  // Bỏ qua lịch & chống trùng, gửi ngay: thông báo trong app + push mọi thiết bị.
  // Chỉ người cầm SERVICE ROLE KEY mới gọi được — anon key (công khai trong app) không dùng được chế độ này.
  if (body.testEmail) {
    // Xác thực bằng CHÍNH key người gọi: reminder_test_target chỉ cấp cho service_role, nên gọi được = đúng
    // service role (chạy với cả key kiểu cũ eyJ… lẫn kiểu mới sb_secret_…). anon/authenticated bị từ chối.
    const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const caller = createClient(url, bearer, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: rows, error: tErr } = safeEqual(bearer, serviceKey)
      ? await supabase.rpc('reminder_test_target', { p_email: body.testEmail })
      : await caller.rpc('reminder_test_target', { p_email: body.testEmail });
    if (tErr) {
      const denied = /permission denied|not allowed|jwt|invalid api key|unauthorized/i.test(tErr.message) || tErr.code === '42501';
      return denied
        ? Response.json({ error: 'forbidden', hint: `Key gửi lên không phải service role (${keyKind(bearer)}). Cập nhật GitHub secret SUPABASE_SERVICE_ROLE_KEY bằng key service_role / secret trong Supabase → Settings → API Keys.` }, { status: 403 })
        : Response.json({ error: tErr.message }, { status: 500 });
    }
    const t = (rows ?? [])[0] as { user_id: string; email: string; campaign_day: number } | undefined;
    if (!t) return Response.json({ ok: false, error: `Không tìm thấy tài khoản ${body.testEmail}` }, { status: 404 });

    const text = '🧪 Nhắc nhở THỬ: Thử thách hôm nay đang chờ bạn chinh phục đấy, dành ít phút cho Gumi nhé!';
    const link = `/chapter/${t.campaign_day}`;
    const result = { ok: true, user: t.email, day: t.campaign_day, inApp: false, push: { devices: 0, sent: 0, errors: [] as string[] } };

    const { error: nErr } = await supabase.from('notifications').insert({ user_id: t.user_id, title: 'Mật Độ', body: text, url: link });
    result.inApp = !nErr;
    if (nErr) result.ok = false;

    const { data: devs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', t.user_id);
    result.push.devices = (devs ?? []).length;
    for (const d of (devs ?? []) as Sub[]) {
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify({ title: 'Mật Độ', body: text, url: link, tag: `gumi-test-${Date.now()}` }), { TTL: 300, urgency: 'high' });
        result.push.sent++;
      } catch (err) {
        result.push.errors.push(String((err as { statusCode?: number }).statusCode ?? (err as Error).message));
      }
    }

    return Response.json(result, { status: result.ok ? 200 : 500 });
  }

  // ---------- Xét nhắc nhở ----------
  const { data: users, error } = await supabase.rpc('reminder_users');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const { data: subs, error: subError } = await supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth');
  if (subError) return Response.json({ error: subError.message }, { status: 500 });
  const subsByUser = new Map<string, Sub[]>();
  for (const s of (subs ?? []) as Sub[]) subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s]);

  const now = new Date();
  let pushed = 0, skipped = 0, pruned = 0;

  for (const u of (users ?? []) as ReminderUser[]) {
    const devices = subsByUser.get(u.user_id) ?? [];
    if (u.phase !== 'running' || !devices.length) { skipped++; continue; }
    const due = dueReminder(now, u.last_play_date, u.campaign_day, u.last_completed_date);
    if (!due) { skipped++; continue; }

    const { data: claimed, error: claimError } = await supabase.rpc('claim_push_slot', { p_user: u.user_id, p_date: due.date, p_minute: due.minute });
    if (claimError) return Response.json({ error: claimError.message }, { status: 500 });
    if (!claimed) { skipped++; continue; }

    const link = `/chapter/${u.campaign_day}`;
    const { error: recordError } = await supabase.from('notifications').insert({ user_id: u.user_id, title: 'Mật Độ', body: due.text, url: link });
    if (recordError) console.error('notification insert failed', recordError.message);

    for (const d of devices) {
      try {
        await webpush.sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify({ title: 'Mật Độ', body: due.text, url: link, tag: `gumi-reminder-${due.date}-${due.minute}` }),
          { TTL: 300, urgency: 'high' },
        );
        pushed++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', d.endpoint);
          pruned++;
        }
      }
    }
  }

  await supabase.rpc('purge_push_log');
  return Response.json({ ok: true, users: (users ?? []).length, pushed, skipped, pruned });
});
