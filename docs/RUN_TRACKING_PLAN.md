# FitStack Run Tracking — Implementation Plan

GPS tracking for **runs, walks, jogs and rides**: live distance, time, pace, route map, splits,
personal bests and weekly totals. **PRO feature** (included in the 7-day trial, then ₹199/month).

Built the FitStack way: our own design (Ember Night motion style), our own names — functionally on par
with the best running apps, not a copy of any one app's look or branding.

---

## 0. The one big technical fact

A web app (our PWA / Trusted Web Activity) **stops getting GPS when the screen turns off or the user
switches apps** — Chrome pauses background pages. Real run tracking (phone in pocket, screen off,
music playing) needs a **native Android shell with a location foreground service** (the persistent
"FitStack is tracking your run" notification).

**Decision (recommended): switch the Play Store build from TWA to a Capacitor shell.**
- Still ONE codebase: the Capacitor app loads the deployed FitStack site; only GPS recording uses a
  native plugin (`@capgo/capacitor-background-geolocation`, free) with an Android foreground service.
- Recording starts from a button press in the app → this is *foreground-service* location, so we do
  **not** need the hard-to-get "background location" Play permission. We still declare
  `FOREGROUND_SERVICE_LOCATION` in the Play Console with a short video.
- Web/desktop users: can record while the screen stays on (Wake Lock) and can always add runs manually.

---

## 1. Features

### Phase R1 — Record & save (MVP)
| Feature | Details |
|---|---|
| Activity types | Run, Walk, Hike, Ride, Treadmill (manual) |
| Live recording screen | Big animated timer, distance, current pace, avg pace; Start / Pause / Resume / Finish; auto-pause when you stop; lock-screen notification with live stats |
| Live map | Route draws as you move (OpenStreetMap-based tiles) |
| GPS cleaning | Drops bad fixes (poor accuracy, teleport jumps), smooths the line |
| Save screen | Title (auto: "Morning Run"), notes, feel (1–5), private by default |
| Manual entry | Distance + time for treadmill / forgot-to-record |
| Offline-safe | Points buffered on the phone; uploaded when back online, never lost |

### Phase R2 — Activity details & history
| Feature | Details |
|---|---|
| Activity detail | Route map with start/finish, km splits table, pace chart, elevation chart, moving vs elapsed time, calories |
| History feed | List of your activities with mini route maps, filters by type |
| Weekly / monthly totals | km, time, runs; streak; animated bars |
| Weekly goal | e.g. 20 km/week, ring on the Today screen |

### Phase R3 — Records, coach & nutrition link
| Feature | Details |
|---|---|
| Best efforts (PRs) | Fastest 1 km, 5 km, 10 km, half marathon, longest run — detected automatically inside any run, with the PR celebration animation |
| Calories burned | MET × body weight × time; optionally add to the day's calorie budget |
| AI coach | New tools: read runs, weekly mileage, pace trends; suggests easy/tempo days and fueling |
| Dashboard | "This week: 14.2 km" tile + last run card |

### Phase R4 — Later (optional, decide after launch)
- Social: follow friends, feed, kudos, comments (big feature; needs moderation & privacy work)
- Segments / leaderboards, routes planner, Google Health Connect / Garmin / Strava imports, audio cues

---

## 2. Data model (Prisma, new migration)

```prisma
enum ActivityType   { RUN WALK HIKE RIDE TREADMILL }
enum ActivitySource { GPS MANUAL IMPORT }

model Activity {
  id               String         @id @default(cuid())
  userId           String
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  type             ActivityType
  source           ActivitySource @default(GPS)
  title            String
  notes            String?
  feel             Int?           // 1–5
  date             DateTime       @db.Date      // user's local day (same rule as everything else)
  startedAt        DateTime
  elapsedSec       Int
  movingSec        Int
  distanceM        Float
  elevationGainM   Float?
  avgPaceSecPerKm  Int?
  maxSpeedMps      Float?
  calories         Int?
  polyline         String?        @db.Text      // encoded route (Google polyline format, ~5 KB/run)
  startLat         Float?         // for privacy-zone trimming & maps
  startLng         Float?
  isPrivate        Boolean        @default(true)
  clientId         String         // idempotency: same upload twice = one activity
  splits           ActivitySplit[]
  bestEfforts      BestEffort[]
  createdAt        DateTime       @default(now())
  @@unique([userId, clientId])
  @@index([userId, date])
}

model ActivitySplit {                // one row per km
  id         String   @id @default(cuid())
  activityId String
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  index      Int
  distanceM  Float
  movingSec  Int
  elevDeltaM Float?
  @@unique([activityId, index])
}

model BestEffort {                   // fastest 1k / 5k / 10k / 21.1k inside an activity
  id         String   @id @default(cuid())
  userId     String
  activityId String
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  distanceM  Int                     // 1000, 5000, 10000, 21097
  timeSec    Int
  isPR       Boolean  @default(false)
  @@index([userId, distanceM, timeSec])
}
```

Raw GPS points are processed on the phone + server and **not stored forever** (only the encoded
route), keeping storage small and privacy better.

---

## 3. Server (fits the existing `src/server` layout)

```
src/server/activity/
  geo.ts        pure: haversine distance, GPS filter, smoothing, auto-pause, splits,
                elevation gain (with noise threshold), best-effort sliding window,
                polyline encode/decode, MET calories        ← unit tested
  service.ts    save (idempotent by clientId), list, detail, delete, weekly totals, PR detection
  schemas.ts    zod
src/app/api/activities/route.ts            GET list · POST save (PRO)
src/app/api/activities/[id]/route.ts       GET detail · PATCH title/notes/private · DELETE
src/app/api/activities/stats/route.ts      weekly/monthly totals, PRs
```

Rules (same as the rest of v2): `assertPro`, zod validation, ownership on every query, user-timezone
dates, rate limit on uploads, max 6 h / 300 km per activity, reject impossible speeds.

---

## 4. App screens (Ember Night motion style)

| Screen | Motion |
|---|---|
| **Start** | Choose type; big glowing Start button with a pulse; GPS-signal meter fills as accuracy improves |
| **Recording** | Huge count-up timer, distance rolls up, pace updates smoothly; route draws live on the map; Pause morphs into Resume/Finish |
| **Saved** | Route "draws" itself on the map, stats count up, PR banner + confetti if a best effort was beaten |
| **Detail** | Splits bars grow in sequence, fastest km glows; pace & elevation charts draw left-to-right |
| **History / Week** | Cards rise in; weekly km bars animate; streak flame |

---

## 5. Privacy & compliance (location is sensitive data)

- Activities **private by default**; nothing is public until social features exist.
- Optional **privacy zone** (hide first/last 200 m of routes near home).
- Delete activity = route deleted for real.
- Update the Privacy Policy (location data, purpose, retention) — needed for Play Store "Data safety"
  and India's DPDP Act.
- Play Console: foreground-service location declaration + demo video.

---

## 6. Build order & effort (estimates)

| Step | What | Est. |
|---|---|---|
| 1 | Data model + migration, `geo.ts` with unit tests (distance, filtering, splits, PRs) | 1 day |
| 2 | Activity API (save/list/detail/stats) + API route tests | 1 day |
| 3 | Web recording screen (screen-on, Wake Lock) + save screen + map | 1.5 days |
| 4 | History, detail (splits/charts), weekly totals, dashboard tile | 1.5 days |
| 5 | Best efforts + PR celebration, calories, coach tools | 1 day |
| 6 | Capacitor Android shell + native GPS foreground service + offline buffer | 2 days |
| 7 | Test on a real Android phone (walk/run), Play Console declarations | 1 day |

**Total ≈ 9 working days** for R1–R3. Social (R4) is a separate project.

Testing: unit tests for every formula (known routes, GPS-noise fixtures), API tests against the test
database, a simulated GPS track in the browser for the recording screen, then a real outdoor run on
an Android phone before release.

---

## 7. Decisions (agreed 17 Nov 2026)
1. **Native shell:** ✅ Capacitor Android app with a GPS foreground service (replaces the TWA plan).
   Web users can still record with the screen on.
2. **Maps:** ✅ OpenStreetMap-based tiles from a provider with a free tier (e.g. MapTiler; needs a free
   API key before step 3).
3. **Social features (R4):** ✅ later, as a separate project.
4. **Calories burned:** ✅ shown on the activity and dashboard only; the food target stays fixed.
