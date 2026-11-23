-- ─────────────────────────────────────────────────────────────────────────────
-- FitStack: run the notification scheduler every 15 minutes from Supabase.
--
-- Run ONCE on the production database, AFTER the site is deployed, in
-- Supabase → SQL Editor. Not a Prisma migration on purpose: it contains the
-- deployed URL and only belongs to production.
--
-- Before running, replace the two placeholders:
--   <YOUR-DOMAIN>       e.g. fitstack.in   (no https://, no trailing slash)
--   <CRON_SECRET>       the same value as CRON_SECRET in the hosting env vars
--                       (generate a fresh one for production:
--                        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extensions: pg_cron (scheduler) and pg_net (HTTP calls from the database).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Keep the secret in Supabase Vault (encrypted), not in the job text.
select vault.create_secret('<CRON_SECRET>', 'fitstack_cron_secret', 'Bearer secret for /api/cron/notifications');

-- 3. Every 15 minutes: POST to the scheduler endpoint. Each user's local time is
--    worked out by the app, so the database clock (UTC) doesn't matter.
select cron.schedule(
  'fitstack-notifications',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<YOUR-DOMAIN>/api/cron/notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'fitstack_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- ── Checking it works ───────────────────────────────────────────────────────
-- Recent runs (status should be "succeeded"):
--   select jobid, status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
-- HTTP responses from the site (status_code should be 200):
--   select status_code, content::text, created from net._http_response order by created desc limit 10;
--
-- ── Changing / stopping ─────────────────────────────────────────────────────
--   select cron.unschedule('fitstack-notifications');
-- New secret:
--   select vault.update_secret((select id from vault.secrets where name = 'fitstack_cron_secret'), '<NEW_SECRET>');
--   (then set the same value as CRON_SECRET on the host and redeploy)
