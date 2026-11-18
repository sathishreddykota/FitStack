# Phone notifications: reminders and achievements

Goal: from a user's **second day** onward, FitStack sends phone notifications when meals or
daily goals are missed, and celebrates when goals are hit. Notifications come from our server
(it knows what was logged), so they arrive even if the app hasn't been opened all day.

## What users get

**Free for every user** (decided 2026-11-18): daily reminders keep people logging, which is what
leads them to PRO.

All times are the user's own local time (from `FitnessProfile.timezone`), so someone in Dubai gets
the breakfast reminder at 10:30 Dubai time. Users can change the times in settings.

| When | Sent if | Example |
|---|---|---|
| 10:30 | No breakfast logged | "No breakfast logged yet 🍳 Tap to add it — it takes 10 seconds." |
| 14:30 | No lunch logged | "Lunch not logged yet. You're at 620 / 2,100 kcal." |
| 21:00 | No dinner logged | "Dinner not logged yet — log it to keep your day accurate." |
| 21:30 | Goals still open (**one** combined message) | "Still to go today: 38 g protein · 410 kcal · 9 g fiber · 12 g fat." |
| Right after logging | A goal is reached (once per goal per day) | "Protein goal hit 💪 142 / 140 g" |
| Right after logging | All four goals reached | "Perfect day ✅ Calories, protein, fat and fiber all on target." |
| 08:00 next morning | Yesterday had logging | "Yesterday: 3 of 4 goals hit. Fiber was 8 g short." / "5-day streak 🔥" |

Rules that keep it helpful, not spammy:

- **Day 1 is quiet.** Nothing is sent on the day the user signed up.
- **At most 5 a day**, never during quiet hours (22:00–07:30). One combined "still to go" message
  instead of four separate ones.
- **Calorie wording is gentle:** "under" means room left; going over shows "You're 250 kcal over
  today" only in the evening summary, never a scolding message.
- If the user logs nothing for **3 days**, reminders pause and a single "We miss you" nudge is sent;
  logging anything turns them back on. This stops a quiet user from getting buzzed forever.
- **Fiber goal:** we don't store one yet, so it's 14 g per 1,000 kcal of the calorie target
  (e.g. 2,000 kcal → 28 g), the standard dietary guideline.
- Every notification opens the right screen (Nutrition for meal reminders, Dashboard for summaries).

**Settings → Notifications:** a master on/off switch, plus switches for meal reminders,
goal reminders, achievements and the morning recap, and editable reminder times.

## How it works

```
Phone (Android app)                Our server (Next.js)                 Google (Firebase)
───────────────────                ────────────────────                 ─────────────────
First launch → ask permission ──►  POST /api/push/devices (save token)
                                   Every 15 min: scheduler calls
                                   /api/cron/notifications  ──────────►  FCM delivers the
                                     · whose 10:30/14:30/21:00/21:30         notification to
                                       is now? check their log             the phone
                                   After a meal is logged:
                                     · goal crossed? send achievement ──►
```

- **Delivery:** Firebase Cloud Messaging (FCM), Google's free push service used by almost every
  Android app. The app uses `@capacitor/push-notifications`; the server sends with `firebase-admin`.
- **Scheduler:** Vercel's free plan only runs scheduled jobs once a day, which is too coarse.
  Instead, Supabase's built-in `pg_cron` (already in your database plan) calls
  `/api/cron/notifications` every 15 minutes with a secret header. No new account needed.
- **No duplicates:** every sent notification is recorded (`user + day + kind`, unique), so a retry or
  an overlapping run never sends the same reminder twice.
- **Dead phones cleaned up:** tokens FCM reports as uninstalled are deleted automatically.

### New database tables

- `PushDevice`: token, userId, platform, lastSeenAt.
- `NotificationPrefs`: master switch, per-category switches, reminder times, quiet hours.
- `NotificationLog`: userId, local day, kind (`breakfast`, `protein_hit`, ...), sentAt. Unique on
  (userId, day, kind).

## Steps (each one tested before the next)

1. **Server core.** Tables, the rules engine as plain functions ("given this user's day and the
   time, which notifications are due?") with unit tests for every rule above, and the
   once-per-day log. Nothing is sent yet.
2. **Sending.** `firebase-admin` setup, `/api/push/devices`, the cron endpoint (secret-protected),
   and achievements fired from the meal-logging code.
3. **App side.** Permission prompt at a sensible moment (after the first meal is logged, not at
   launch), token registration, tapping a notification opens the right screen.
4. **Settings screen** for the switches and times.
5. **Phone test** on your real phone (combined with the run-tracking phone test), using a
   "send me a test notification" button and a fast-forward clock in development.

## Firebase setup (done 2026-11-18)

- Project **FitStack**, id `fitstack-82148` (free Spark plan; Analytics and Gemini off), with the
  Android app `com.fitstack.app`.
- `android/app/google-services.json`: the app's Firebase config (not secret, committed).
- `FIREBASE_SERVICE_ACCOUNT` in `.env.local`: the service-account key, base64 on one line. Secret,
  never committed. On the host (Vercel) add the same value as an environment variable.
- `CRON_SECRET` in `.env.local`: generate a fresh one for production.
- If the key ever leaks: Google Cloud console → IAM → Service accounts →
  `firebase-adminsdk-…@fitstack-82148.iam.gserviceaccount.com` → Keys → delete it, then generate a
  new one.

## Not in this round

- Notifications for people using FitStack in a desktop browser (web push). Possible later with the
  same rules engine.
- Workout, water and sleep reminders. Easy to add once the engine exists.

## Running the scheduler

- **On the PC (testing):** `npm run notify:tick` runs it once; `npm run notify:tick -- --every 15`
  keeps it going. It reads `CRON_SECRET` from `.env.local`.
- **Production:** after deploying, run [`supabase-notifications-cron.sql`](supabase-notifications-cron.sql)
  once in Supabase → SQL Editor (fill in the domain and a fresh secret first).
- **Phone test:** [`PHONE_TEST.md`](PHONE_TEST.md).

## Real-phone test (2026-11-18, Redmi Note 13 Pro 5G, Android 15, debug build)

| Check | Result |
|---|---|
| Offer card after logging food → Android permission → phone registered | ✅ |
| Test notification via Firebase (⚡ icon, orange, "Reminders & goals" channel) | ✅ |
| "Protein goal hit 💪" right after a log, once | ✅ |
| Day-1 rule held it back on the account's signup day | ✅ (as designed) |
| Scheduler: "Almost there for today" summary; second run sends nothing | ✅ |
| Tap opens the app on the Dashboard | ✅ |
| Sign-out removes the phone; scheduler finds 0 phones | ✅ |

Found and fixed on the phone: sign-in redirect opened Chrome, header under the status bar,
dark status-bar icons. "Continue with Google" opened Chrome — fixed the same day with a
browser-tab sign-in flow (see ANDROID.md → Signing in inside the app), tested on the phone.
