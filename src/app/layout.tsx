import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";
import "./globals.css";
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from "@/lib/constants";
import { PwaSupport } from "@/components/layout/pwa";
import { PushSupport } from "@/components/layout/push-support";
import { NativeAuthBridge } from "@/components/auth/native-auth-bridge";

// ─────────────────────────────────────────────
// Fonts
// ─────────────────────────────────────────────

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Numbers and headlines (Ember Night)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "fitness tracker",
    "nutrition tracking",
    "calorie tracker",
    "workout tracker",
    "strength training",
    "hybrid fitness",
    "gym tracker",
    "macro tracking",
    "body composition",
    "fitness SaaS",
  ],
  authors: [{ name: "Daystrong" }],
  creator: "Daystrong",
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: APP_NAME,
    description: APP_TAGLINE,
    siteName: APP_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_TAGLINE,
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // No viewportFit "cover": the page stays inside the status/navigation bars. With "cover"
  // the Android app (edge-to-edge on Android 15+) drew the header under the status bar.
};

// ─────────────────────────────────────────────
// Root Layout
// ─────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      // Titles use the app name from Clerk's dashboard by default; set them here so the
      // brand lives in the code (Daystrong) whatever the dashboard says.
      localization={{
        signIn: { start: { title: "Sign in to Daystrong", subtitle: "Welcome back! Please sign in to continue" } },
        signUp: { start: { title: "Create your Daystrong account", subtitle: "Welcome! Please fill in the details to get started." } },
      }}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#FF6B2C", // Ember
          colorTextOnPrimaryBackground: "#0A0A0F",
        },
      }}
    >
      <html
        lang="en-IN"
        className={`${inter.variable} ${spaceGrotesk.variable} h-full`}
        suppressHydrationWarning
      >
        <head>
          {/* Preconnect to Google Fonts for performance */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        </head>
        <body className="h-full antialiased">
          {children}
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              style: {
                background: "#1C1C26",
                border: "1px solid #2E2E3A",
                color: "#F4F4F6",
              },
            }}
          />
          <PwaSupport />
          <PushSupport />
          <NativeAuthBridge />
        </body>
      </html>
    </ClerkProvider>
  );
}
