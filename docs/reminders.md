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
