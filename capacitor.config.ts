import type { CapacitorConfig } from "@capacitor/cli";

// ─────────────────────────────────────────────
// Android app shell. The app loads the deployed FitStack site (one codebase);
// native code is only used for GPS recording with a foreground service.
//
//   CAP_SERVER_URL=https://<your-domain> npx cap sync android     ← release build
//   CAP_SERVER_URL=http://<PC LAN IP>:3000 npx cap sync android   ← test on a phone
//
// appId is permanent once the app is on the Play Store — change it before the
// first upload if you want a different one.
// ─────────────────────────────────────────────

const serverUrl = process.env.CAP_SERVER_URL?.replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "com.fitstack.app",
  appName: "FitStack",
  // Offline / error page bundled in the app.
  webDir: "mobile/www",
  server: serverUrl
    ? {
        url: serverUrl,
        // Plain http is only for testing against a dev server on your Wi-Fi.
        cleartext: serverUrl.startsWith("http://"),
        errorPath: "index.html",
        // Sign-in (Clerk) briefly redirects through its own domain; keep that inside the app
        // instead of opening Chrome. Dev instances use *.clerk.accounts.dev; production uses
        // clerk.<your-domain> — add it via CAP_ALLOW_NAV (comma-separated) for release builds.
        allowNavigation: ["*.clerk.accounts.dev", ...(process.env.CAP_ALLOW_NAV?.split(",").map((h) => h.trim()).filter(Boolean) ?? [])],
      }
    : undefined,
  // Night behind the web view while the first page loads (default is white → a flash).
  backgroundColor: "#0A0A0F",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Show reminders/achievements as normal notifications even while the app is open.
    PushNotifications: { presentationOptions: ["sound", "alert"] },
    // Dark app: light status-bar/navigation-bar icons ("DARK" = for dark backgrounds).
    SystemBars: { style: "DARK" },
  },
};

export default config;
