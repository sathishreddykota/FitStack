import type { MetadataRoute } from "next";

// Web app manifest → installable PWA, and the basis of the Play Store build
// (Trusted Web Activity via Bubblewrap reads this file).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Daystrong — Nutrition, Training & AI Coach",
    short_name: "Daystrong",
    description: "Track Indian food, workouts, water and recovery with an AI coach. ₹199/month.",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    categories: ["health", "fitness", "lifestyle"],
    lang: "en-IN",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Log food", url: "/nutrition", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Start workout", url: "/workout", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Ask coach", url: "/coach", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
