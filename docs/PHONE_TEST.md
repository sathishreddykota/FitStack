# Phone test: run tracking + notifications

About 20 minutes. Covers notifications step 5 and run-tracking step 7.

## Before we start (you)

1. Phone: **Settings → About phone → tap "Build number" 7 times**, then
   **Settings → Developer options → USB debugging: on**.
2. Plug the phone into the PC. When it asks **"Allow USB debugging?"**, tick
   "Always allow from this computer" → **Allow**.
3. Phone on the same Wi-Fi as the PC (**"Sathish 2"**), not mobile data.
4. Tell Claude "phone connected".

## What Claude does

- Starts the site and test database on the PC (served on the Wi-Fi at `192.168.31.53:3000`).
- Installs the app over USB (already built and pointing at the PC).
- If the PC's Wi-Fi address has changed, rebuilds the app first (1 minute).

## A. Sign in and notifications (10 min, at your desk)

| # | Do | Expect |
|---|---|---|
| 1 | Open **Daystrong** on the phone and sign in | Dashboard loads |
| 2 | **Nutrition** → add any food | Card: *"Nice log! Want a nudge…"* |
| 3 | **Turn on reminders** → Android asks → **Allow** | Card closes |
| 4 | **Settings → Notifications** | *"On for this phone ✓"* |
| 5 | **Send me a test notification** | Notification with the ⚡ icon within a few seconds |
| 6 | Lock the phone, tap the notification | App opens on the Dashboard |
| 7 | **Nutrition** → Quick add with lots of protein (e.g. 150 g) | *"Protein goal hit 💪"* |
| 8 | Claude sets your breakfast reminder to a minute from now and runs the scheduler | *"No breakfast logged yet 🍳"* (only if breakfast isn't logged) |

## B. Run tracking (10 min, outside)

| # | Do | Expect |
|---|---|---|
| 1 | **Run** → pick **Walk** → wait for GPS "Good" | Map shows where you are |
| 2 | **Start** → Android asks for location → **While using the app** | Notification *"Daystrong is recording"* |
| 3 | Lock the phone and walk 5 minutes | Notification stays |
| 4 | Unlock → **Pause** → **Resume** → walk 1 more minute | Timer continues |
| 5 | **Finish → Save** | Route on the map, splits, saved |
| 6 | Open the saved walk on the PC (`/activity`) | Same route and numbers |

## C. Sign out (1 min)

| # | Do | Expect |
|---|---|---|
| 1 | Sign out in the app | Back to the sign-in screen |
| 2 | Claude sends a test from the PC | **Nothing arrives** on the phone |

## If something goes wrong

- **App shows "Can't reach Daystrong":** phone not on the same Wi-Fi, or the PC's address changed.
- **No notification:** Android Settings → Apps → Daystrong → Notifications → check
  "Reminders & goals" is on, and battery saver isn't restricting Daystrong.
- **GPS stuck on "Searching":** step outside; the first fix can take 30–60 seconds.
