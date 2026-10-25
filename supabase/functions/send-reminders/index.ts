// Edge Function: send-reminders — pg_cron gọi mỗi phút.
//  1) Xét từng người chơi (reminder_users). Tới mốc nhắc thì giành suất (claim_push_slot, 1 lần/người/mốc/ngày):
//     ghi thông báo trong app, gửi Web Push NGAY tới mọi thiết bị, và XẾP 1 EMAIL vào hàng đợi email_outbox.
//  2) Gửi 1 lô email trong hàng đợi qua SMTP — giới hạn số mail, thời gian và trần gửi/ngày,
//     thử lại khi lỗi tạm, bỏ địa chỉ chết. Phần lô chưa kịp gửi sẽ được lần chạy phút sau gửi tiếp.
//
// Triển khai: supabase functions deploy send-reminders (CI tự làm — xem docs/reminders.md)
// Secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT          — Web Push
//   SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASS             — Supabase Edge chặn cổng 25/587 → dùng 465
//   REMINDER_EMAIL_FROM ("Gumi <addr>"), APP_URL, EMAIL_UNSUB_SECRET
//   Tuỳ chọn: EMAIL_SLOTS ("08:00,21:00" — mốc nào gửi email; trống = mọi mốc),
//             EMAIL_DAILY_CAP (mặc định 450 — Gmail ~500/ngày), EMAIL_BATCH (mặc định 25 mail/lần chạy)
//   Thiếu SMTP_* → chỉ gửi push như cũ.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import nodemailer from 'npm:nodemailer@6.9.16';

import { dueReminder } from '../_shared/reminders.ts';
import { classifySmtpError, parseEmailSlots, reminderEmailPayload, unsubscribeToken } from '../_shared/email.ts';

interface ReminderUser {
  user_id: string; email: string | null; name: string | null; campaign_day: number; phase: string;
  last_play_date: string | null; last_completed_date: string | null;
}
interface Sub { user_id: string; endpoint: string; p256dh: string; auth: string }
interface Outbox { id: number; to_email: string; subject: string; html: string; text_body: string; headers: Record<string, string> }

const SEND_BUDGET_MS = 18_000; // pg_net chờ 25s → gửi trong ~18s rồi trả lời, phần còn lại để phút sau

/** So sánh hằng thời gian (không lộ độ dài khớp qua thời gian phản hồi). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  const started = Date.now();
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) as { testEmail?: string } : {};
  const env = (k: string) => Deno.env.get(k)?.trim() || undefined;
  const url = env('SUPABASE_URL'), serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const pub = env('VAPID_PUBLIC_KEY'), priv = env('VAPID_PRIVATE_KEY');
  if (!url || !serviceKey || !pub || !priv) {
    return Response.json({ error: 'Thiếu env: SUPABASE_URL / SERVICE_ROLE / VAPID_*' }, { status: 500 });
  }
  const smtp = { host: env('SMTP_HOST'), port: Number(env('SMTP_PORT') ?? 465), user: env('SMTP_USER'), pass: env('SMTP_PASS') };
  const emailFrom = env('REMINDER_EMAIL_FROM'), unsubSecret = env('EMAIL_UNSUB_SECRET');
  const appUrl = env('APP_URL') ?? 'https://matdo.pages.dev';
  const emailOn = Boolean(smtp.host && smtp.user && smtp.pass && emailFrom && unsubSecret);
  const emailSlots = parseEmailSlots(env('EMAIL_SLOTS'));
  const dailyCap = Number(env('EMAIL_DAILY_CAP') ?? 450);
  const batchSize = Number(env('EMAIL_BATCH') ?? 25);

  webpush.setVapidDetails(env('VAPID_SUBJECT') ?? 'mailto:admin@leveldown.app', pub, priv);
  const supabase = createClient(url, serviceKey);

  // ---------- Chế độ GỬI THỬ cho đúng 1 tài khoản (GitHub Actions "Push reminders") ----------
  // Bỏ qua lịch & chống trùng, gửi ngay: thông báo trong app + push mọi thiết bị + email (gửi thẳng, không qua hàng đợi).
  // Chỉ người cầm SERVICE ROLE KEY mới gọi được — anon key (công khai trong app) không dùng được chế độ này.
  if (body.testEmail) {
    const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!safeEqual(bearer, serviceKey)) return Response.json({ error: 'forbidden' }, { status: 403 });
    const { data: rows, error: tErr } = await supabase.rpc('reminder_test_target', { p_email: body.testEmail });
    if (tErr) return Response.json({ error: tErr.message }, { status: 500 });
    const t = (rows ?? [])[0] as { user_id: string; email: string; name: string | null; campaign_day: number } | undefined;
    if (!t) return Response.json({ ok: false, error: `Không tìm thấy tài khoản ${body.testEmail}` }, { status: 404 });

    const text = '🧪 Nhắc nhở THỬ: Thử thách hôm nay đang chờ bạn chinh phục đấy, dành ít phút cho Gumi nhé!';
    const link = `/chapter/${t.campaign_day}`;
    const result = { ok: true, user: t.email, day: t.campaign_day, inApp: false, push: { devices: 0, sent: 0, errors: [] as string[] }, email: 'chưa cấu hình SMTP' as string };

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

    if (emailOn) {
      const token = await unsubscribeToken(unsubSecret!, t.user_id);
      const m = reminderEmailPayload(emailFrom!, {
        to: t.email, name: t.name, text, day: t.campaign_day, minute: 8 * 60, appUrl,
        unsubscribeUrl: `${url}/functions/v1/email-unsubscribe?u=${t.user_id}&t=${token}`,
      });
      const mailer = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 });
      try {
        const info = await mailer.sendMail({ from: emailFrom, to: m.to, subject: `[Thử] ${m.subject}`, html: m.html, text: m.text, headers: m.headers });
        result.email = `đã gửi (${info.response ?? 'ok'})`;
      } catch (err) {
        const e = err as { code?: string; responseCode?: number; response?: string; message?: string };
        result.email = `lỗi: ${e.responseCode ?? e.code ?? ''} ${e.response ?? e.message ?? ''}`.trim();
        result.ok = false;
      } finally { mailer.close(); }
    }
    return Response.json(result, { status: result.ok ? 200 : 500 });
  }

  // ---------- 1) Xét nhắc nhở ----------
  const { data: users, error } = await supabase.rpc('reminder_users');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const { data: subs, error: subError } = await supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth');
  if (subError) return Response.json({ error: subError.message }, { status: 500 });
  const subsByUser = new Map<string, Sub[]>();
  for (const s of (subs ?? []) as Sub[]) subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s]);

  const now = new Date();
  let pushed = 0, skipped = 0, pruned = 0, queued = 0;

  for (const u of (users ?? []) as ReminderUser[]) {
    const devices = subsByUser.get(u.user_id) ?? [];
    if (u.phase !== 'running' || (!devices.length && !(emailOn && u.email))) { skipped++; continue; }
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

    if (emailOn && u.email && (!emailSlots || emailSlots.has(due.minute))) {
      const token = await unsubscribeToken(unsubSecret!, u.user_id);
      const unsubscribeUrl = `${url}/functions/v1/email-unsubscribe?u=${u.user_id}&t=${token}`;
      const m = reminderEmailPayload(emailFrom!, { to: u.email, name: u.name, text: due.text, day: u.campaign_day, minute: due.minute, appUrl, unsubscribeUrl });
      const { error: qError } = await supabase.from('email_outbox').upsert({
        user_id: u.user_id, slot_date: due.date, slot_minute: due.minute, to_email: m.to,
        subject: m.subject, html: m.html, text_body: m.text, headers: m.headers,
      }, { onConflict: 'user_id,slot_date,slot_minute', ignoreDuplicates: true });
      if (qError) console.error('email enqueue failed', qError.message); else queued++;
    }
  }

  // ---------- 2) Gửi 1 lô email ----------
  const mail = { sent: 0, retry: 0, failed: 0, badAddress: 0, stopped: '' as string };
  if (emailOn) {
    const { data: sentToday } = await supabase.rpc('emails_sent_today');
    const room = Math.max(0, Math.min(batchSize, dailyCap - Number(sentToday ?? 0)));
    if (room === 0) mail.stopped = 'daily_cap';
    const { data: batch, error: batchError } = room > 0
      ? await supabase.rpc('claim_email_batch', { p_limit: room })
      : { data: [] as Outbox[], error: null };
    if (batchError) console.error('claim_email_batch failed', batchError.message);

    const rows = (batch ?? []) as Outbox[];
    if (rows.length) {
      const mailer = nodemailer.createTransport({
        host: smtp.host, port: smtp.port, secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
        pool: true, maxConnections: 2,
        connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
      });
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]!;
        // Hết thời gian hoặc đã phải dừng → trả phần còn lại về hàng đợi (không tính lượt), phút sau gửi tiếp.
        if (mail.stopped || Date.now() - started > SEND_BUDGET_MS) {
          for (const rest of rows.slice(i)) await supabase.rpc('finish_email', { p_id: rest.id, p_ok: false, p_error: mail.stopped || 'hết thời gian lượt chạy', p_requeue: true });
          break;
        }
        try {
          await mailer.sendMail({ from: emailFrom, to: r.to_email, subject: r.subject, html: r.html, text: r.text_body, headers: r.headers });
          await supabase.rpc('finish_email', { p_id: r.id, p_ok: true });
          mail.sent++;
        } catch (err) {
          const e = err as { code?: string; responseCode?: number; response?: string; message?: string };
          const v = classifySmtpError(e);
          const msg = `${e.responseCode ?? e.code ?? ''} ${e.response ?? e.message ?? ''}`.trim();
          console.error('smtp send failed', v.kind, msg);
          if (v.kind === 'stop') {
            mail.stopped = msg || 'smtp_stop';
            await supabase.rpc('finish_email', { p_id: r.id, p_ok: false, p_error: msg, p_requeue: true });
          } else if (v.kind === 'bad_address') {
            mail.badAddress++;
            await supabase.rpc('finish_email', { p_id: r.id, p_ok: false, p_error: msg, p_retry: false, p_disable: true });
          } else if (v.kind === 'rejected') {
            mail.failed++;
            await supabase.rpc('finish_email', { p_id: r.id, p_ok: false, p_error: msg, p_retry: false });
          } else {
            mail.retry++;
            await supabase.rpc('finish_email', { p_id: r.id, p_ok: false, p_error: msg, p_retry: true });
          }
        }
      }
      mailer.close();
    }
  }

  await supabase.rpc('purge_push_log');
  if (now.getUTCMinutes() === 0) await supabase.rpc('purge_email_outbox'); // dọn lịch sử mỗi giờ 1 lần
  return Response.json({ ok: true, users: (users ?? []).length, pushed, skipped, pruned, emailOn, queued, mail });
});
