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

### Already set up on this PC (no Android Studio needed to build)

Java 21 and the Android SDK are installed in your user folder, so the app builds from a terminal:

| Tool | Location |
|---|---|
| Java 21 (Microsoft OpenJDK) | `C:\Users\sathi\.jdks\jdk-21.0.13.0.2+1` |
| Android SDK (platform 36, build-tools 36.0.0, platform-tools) | `C:\Users\sathi\AppData\Local\Android\Sdk` |

```bash
cd android
JAVA_HOME="C:\Users\sathi\.jdks\jdk-21.0.13.0.2+1" ./gradlew.bat assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

`android/local.properties` (not committed) points Gradle at the SDK. Android Studio, if you install
it later, uses the same SDK.

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

## Signing in inside the app

- **Email / phone code:** work directly in the app.
- **Continue with Google:** Google refuses sign-in inside an app's web view, so in the app the
  button opens Google in a secure browser tab (Chrome Custom Tab) and hands the session back:
  1. app → `POST /api/native-auth/begin` → `{ id, verifier }` (the verifier never leaves the app)
  2. tab → `/native-auth/start?id=…` → Google → `/native-auth/callback` → `/native-auth/done`
  3. done page (signed in) → `POST /api/native-auth/complete` → back to the app with
     `intent://auth?id=…;package=com.fitstack.app` (Chrome gives it only to FitStack)
  4. app → `POST /api/native-auth/claim { id, verifier }` → one-time Clerk ticket → signed in
  Code: `src/server/native-auth.ts`, `src/lib/native-auth.ts`, `src/components/auth/`,
  `src/app/native-auth/`. Each attempt works once and expires after 10 minutes.
- **Production:** Clerk's sign-in redirects must stay inside the app: build with
  `CAP_ALLOW_NAV=clerk.<your-domain>` (dev uses `*.clerk.accounts.dev` automatically).

## Release build (after the site is deployed)

```bash
CAP_SERVER_URL=https://<your-domain> CAP_ALLOW_NAV=clerk.<your-domain> npm run android:sync
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
