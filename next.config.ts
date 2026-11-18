import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Clerk and Cloudinary image domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
      },
    ],
  },

  // Silence warnings from Prisma during build
  webpack: (config) => {
    config.externals.push("@prisma/client", "prisma");
    return config;
  },
  
  turbopack: {},

  // Dev only: let a phone on the home Wi-Fi (the Android app via `npm run dev:lan`)
  // load the dev server's scripts and hot reload. Private network ranges only.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],

  // Enable experimental features useful for SaaS
  experimental: {
    // Server Actions are stable in Next.js 14+, just enabled by default
  },

  // Redirect root to marketing page or dashboard
  async redirects() {
    return [];
  },
};

export default nextConfig;
