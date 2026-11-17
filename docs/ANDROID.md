# FitStack Android app

The Android app is a thin [Capacitor](https://capacitorjs.com) shell around the FitStack website.
Everything you see is the same Next.js app; the only native part is **GPS recording**, which runs in
an Android *foreground service* (with a "FitStack is recording" notification) so runs keep tracking
with the screen off or another app open.

| Piece | Where |
|---|---|
| App config (app id, which URL to load) | `capacitor.config.ts` |
| Android project | `android/` (open it in Android Studio) |
| Offline / "can't reach FitStack" page | `mobile/www/index.html` |
| Native GPS bridge | `src/lib/native-gps.ts` (used by `src/hooks/use-run-recorder.ts`) |
| Permissions | `android/app/src/main/AndroidManifest.xml` |

App id: **`com.fitstack.app`** — permanent once the app is on the Play Store. Change it in
`capacitor.config.ts` *and* `android/app/build.gradle` (`namespace` + `applicationId`) before the
first upload if you want a different one.

## One-time setup (Windows)

1. Install **Android Studio** (it includes the Android SDK and a Java 21 runtime):
   https://developer.android.com/studio
2. Open it once and let it finish downloading the SDK (default options are fine).
3. On your phone: *Settings → About phone → tap "Build number" 7 times*, then
   *Developer options → USB debugging: on*. Plug the phone in and allow the computer.

## Try it on your phone (against your PC)

The phone and PC must be on the same Wi-Fi.

```bash
# 1. find your PC's Wi-Fi address (look for "IPv4 Address", e.g. 192.168.1.23)
ipconfig

# 2. run the site so the phone can reach it
npm run dev:lan

# 3. point the app at it and copy the config into the Android project
CAP_SERVER_URL=http://192.168.1.23:3000 npm run android:sync

# 4. open Android Studio, pick your phone at the top, press ▶ Run
npm run android:open
```

In PowerShell use `$env:CAP_SERVER_URL="http://192.168.1.23:3000"; npm run android:sync`.

Then in the app: **Run → pick Run → Start**. Android asks for location ("While using the app") and
notifications — allow both. Lock the phone and walk around; the notification stays while recording.

## Release build (after the site is deployed)

```bash
CAP_SERVER_URL=https://<your-domain> npm run android:sync
npm run android:open   # Build → Generate Signed App Bundle → .aab for the Play Console
```

## Play Console declarations

- **Location permission:** *foreground only.* The app never requests `ACCESS_BACKGROUND_LOCATION`;
  tracking with the screen off works through a foreground service started by the user pressing Start.
- **Foreground service type `location`:** declare it with a short screen recording showing:
  Start → notification appears → phone locked → run continues → Finish.
- **Data safety:** precise location (collected, linked to the account, used for app functionality,
  not shared); recordings are private by default.

## How recording works in the app

- Before Start: GPS runs only while the app is open (for the signal badge and "you are here" dot).
- Recording: the foreground service delivers positions to the page; the recording is saved on the
  phone every few points, so an app crash or restart keeps the run (it comes back paused).
- Finish → Save uploads the run; with no signal it waits in an on-phone queue and uploads later.
