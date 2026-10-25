# Reminder scheduling

All runners use `supabase/functions/_shared/reminders.ts`. Slots in
Asia/Ho_Chi_Minh: 00:00, 08:00, 15:00, 18:00, 21:00, 23:30.
A slot is eligible from its start until (excluding) five minutes later.
Old reminders are dropped, never replayed hours later. Today’s play or completion
suppresses reminders; midnight recovery additionally requires a missed previous day.
Web Push has a five-minute TTL and high urgency. Device OS and connectivity can
still delay delivery; this is not an exact-to-the-second delivery guarantee.

## Activate production scheduling

1. Authenticate the Supabase CLI for the existing project.
2. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT using the existing key
   pair (public key must match VITE_VAPID_PUBLIC_KEY). Do not generate a replacement.
3. `supabase functions deploy send-reminders --project-ref <existing-ref>`
4. Provision Vault secrets `send_reminders_url` and `send_reminders_key` as described
   in `supabase/functions/send-reminders/cron.sql`, then execute that SQL.
5. Verify cron.job and cron.job_run_details; inspect net._http_response for successful
   HTTP results (a successful cron tick alone does not prove function success).
6. Remove `on.schedule` from `.github/workflows/reminders.yml` once server scheduling
   is active. Keep workflow_dispatch for diagnostics. Until then GitHub remains a
   fallback and delayed jobs can miss the five-minute window.
7. Check a real scheduled slot with a dedicated subscribed test account and verify
   push_log, notifications, and device delivery. Never use FORCE_SEND to test production
   users: it sends to every subscription.

Claims remain per user/date/slot, while delivery fans out to all that user’s devices.
A claimed slot is not retried after a push provider failure (at-most-once attempts).

## Validation

`npm test -- src/lib/reminders.test.ts` covers all six slots, before/start/end
boundaries, Vietnam midnight, stale schedules, and play/completion suppression.
`npm test` and `npm run build` validate the application.
These checks do not establish live Edge Function or push-provider delivery.

## Production activation — 2026-10-24

Deployed send-reminders to project uywoofazfuxgmacykzno using existing VAPID secrets.
Enabled pg_cron 1.6.4 and pg_net 0.20.4; provisioned Vault authentication.
Cron job 1 (send-reminders) is active every minute. At 10:11 UTC its first observed
run succeeded and the Edge Function returned HTTP 200 with 12 targets, 0 sent,
12 skipped (outside a reminder window). This proves scheduling and function
execution, not device delivery. The local GitHub workflow is now manual-only;
that workflow change still needs to reach the repository default branch.

## Email reminders (SMTP) — 2026-10-25

Cùng các mốc giờ với push. Mỗi mốc vẫn giành suất 1 lần/người/ngày (`claim_push_slot`):
push gửi ngay, email được XẾP HÀNG vào `email_outbox` rồi gửi theo lô.

Luồng gửi (mỗi phút, trong `send-reminders`):
- Giành tối đa `EMAIL_BATCH` (mặc định 25) mail bằng `claim_email_batch` (FOR UPDATE SKIP LOCKED → 2 lần chạy chồng nhau không gửi trùng).
- Gửi trong ~18 giây (pg_net chờ 25 giây); mail chưa kịp gửi được trả về hàng đợi, phút sau gửi tiếp.
- Trần gửi/ngày `EMAIL_DAILY_CAP` (mặc định 450, Gmail ~500) — chạm trần thì dừng tới hôm sau.
- Lỗi tạm (mạng, 4xx) → thử lại sau 2, 4 phút, tối đa 3 lần. Sai mật khẩu SMTP / chạm giới hạn Gmail → dừng lô, giữ mail trong hàng đợi.
- Địa chỉ không tồn tại (5.1.x) → bỏ mail và tắt email của người đó (giữ uy tín người gửi).
- Mail nhắc chờ quá 2 giờ → `expired` (không gửi nhắc nhở cũ). Lịch sử giữ 14 ngày để tra soát.
- Chỉ gửi tới email ĐÃ XÁC MINH của tài khoản `role = 'player'` còn bật `profiles.email_reminders`.
- `EMAIL_SLOTS` (vd `08:00,21:00`) giới hạn mốc nào có email; bỏ trống = mọi mốc.

Huỷ nhận (`email-unsubscribe`, public): mở link chỉ hiện trang xác nhận (trình quét link không vô tình huỷ),
bấm nút mới huỷ; có nút bật lại. Hỗ trợ huỷ 1 chạm của Gmail/Outlook (List-Unsubscribe-Post, RFC 8058).

Supabase Edge Functions chặn cổng 25 và 587 → dùng cổng 465 (SSL).
Gmail: bật xác minh 2 bước, tạo Mật khẩu ứng dụng (myaccount.google.com/apppasswords).
Thiếu SMTP_HOST/SMTP_USER/SMTP_PASS/REMINDER_EMAIL_FROM/EMAIL_UNSUB_SECRET → chỉ gửi push.

Tra soát nhanh:
```sql
select status, count(*) from email_outbox where created_at > now() - interval '1 day' group by 1;
select to_email, attempts, last_error from email_outbox where status in ('failed','pending') order by id desc limit 20;
```

### Tự deploy qua GitHub Actions

Job `supabase` trong `.github/workflows/ci.yml` chạy mỗi lần push lên `main` (sau khi test xanh):
chạy migration mới (`scripts/migrate.py`), đẩy secrets sang Supabase, deploy 3 Edge Functions.
GitHub → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Giá trị |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens → Generate new token |
| `SUPABASE_PROJECT_REF` | `uywoofazfuxgmacykzno` |
| `SUPABASE_DB_URL` | giống `SUPABASE_DB_URL` trong `.env.local` |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `465` |
| `SMTP_USER` / `SMTP_PASS` | địa chỉ Gmail / Mật khẩu ứng dụng |
| `REMINDER_EMAIL_FROM` | `Gumi <địa-chỉ-gmail>` |
| `APP_URL` | link app production |
| `EMAIL_UNSUB_SECRET` | chuỗi ngẫu nhiên dài (vd `openssl rand -hex 32`) |
| `EMAIL_SLOTS` | (tuỳ chọn) vd `08:00,21:00`; bỏ trống = mọi mốc |
| `EMAIL_DAILY_CAP` / `EMAIL_BATCH` | (tuỳ chọn) mặc định `450` / `25` |
