import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";
import "./globals.css";
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from "@/lib/constants";

// ─────────────────────────────────────────────
// Fonts
// ─────────────────────────────────────────────

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
  authors: [{ name: "FitStack" }],
  creator: "FitStack",
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
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
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
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "oklch(65% 0.24 35)", // Neon Orange
        },
      }}
    >
      <html
        lang="en"
        className={`${inter.variable} h-full`}
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
            position="bottom-right"
            toastOptions={{
              style: {
                background: "oklch(14% 0.01 260)",
                border: "1px solid oklch(22% 0.015 260)",
                color: "oklch(96% 0.005 260)",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
