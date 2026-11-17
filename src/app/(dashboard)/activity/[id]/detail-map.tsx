"use client";

import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("@/components/activity/route-map").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="h-[38dvh] min-h-[220px] w-full animate-pulse bg-[#0E0E14]" />,
});

export function DetailMap({ points }: { points: { lat: number; lng: number }[] }) {
  return <RouteMap points={points} className="h-[38dvh] min-h-[220px] w-full" />;
}
