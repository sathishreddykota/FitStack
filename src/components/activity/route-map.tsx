"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLngExpression, Map as LeafletMap, Polyline, CircleMarker, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

// ─────────────────────────────────────────────
// Route map (Leaflet). Dark street tiles from MapTiler when
// NEXT_PUBLIC_MAPTILER_KEY is set; without a key the route still draws as a
// glowing line on a dark grid, so recording never depends on a map provider.
// ─────────────────────────────────────────────

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const TILE_URL = KEY ? `https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key=${KEY}` : null;
const ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>';

export interface RouteMapProps {
  /** `seg` changes after each pause; segments are drawn apart so a pause gap shows no line. */
  points: { lat: number; lng: number; seg?: number | null }[];
  /** Follow the latest point (recording). Otherwise fit the whole route once. */
  live?: boolean;
  /** Where we are now (shown as a pulsing dot even before recording starts). */
  current?: { lat: number; lng: number } | null;
  className?: string;
  interactive?: boolean;
}

export function RouteMap({ points, live = false, current = null, className, interactive = true }: RouteMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const glow = useRef<Polyline | null>(null);
  const line = useRef<Polyline | null>(null);
  const start = useRef<CircleMarker | null>(null);
  const here = useRef<Marker | null>(null);
  const fitted = useRef(false);
  const L = useRef<typeof import("leaflet") | null>(null);
  // Leaflet loads asynchronously; flipping this re-runs the drawing effects once the map exists.
  const [ready, setReady] = useState(false);

  // Create the map once (Leaflet touches `window`, so load it in the browser only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      L.current = leaflet;
      const m = leaflet.map(el.current, {
        zoomControl: false,
        attributionControl: !!TILE_URL,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        boxZoom: false,
        keyboard: interactive,
      });
      if (TILE_URL) leaflet.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19, tileSize: 256 }).addTo(m);
      m.setView([17.385, 78.4867], 15); // replaced by the route / position as soon as there is one
      glow.current = leaflet.polyline([], { color: "#FF6B2C", weight: 14, opacity: 0.22, lineCap: "round", lineJoin: "round" }).addTo(m);
      line.current = leaflet.polyline([], { color: "#FF8A57", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(m);
      map.current = m;
      setReady(true);
      setTimeout(() => m.invalidateSize(), 50);
    })();
    return () => {
      cancelled = true;
      // Stop any pan/zoom first: removing mid-animation makes Leaflet throw
      // "_leaflet_pos" from a pending transition callback.
      map.current?.stop();
      map.current?.off();
      map.current?.remove();
      map.current = null;
      start.current = null;
      here.current = null;
      fitted.current = false;
      setReady(false);
    };
  }, [interactive]);

  // Draw / update the route.
  useEffect(() => {
    const m = map.current;
    const leaflet = L.current;
    if (!m || !leaflet) return;
    const latlngs: LatLngExpression[][] = [];
    points.forEach((p, i) => {
      if (i === 0 || (p.seg ?? 0) !== (points[i - 1].seg ?? 0)) latlngs.push([]);
      latlngs[latlngs.length - 1].push([p.lat, p.lng]);
    });
    glow.current?.setLatLngs(latlngs);
    line.current?.setLatLngs(latlngs);

    if (points.length) {
      const first = points[0];
      if (!start.current) {
        start.current = leaflet.circleMarker([first.lat, first.lng], { radius: 7, color: "#0A0A0F", weight: 3, fillColor: "#C8F560", fillOpacity: 1 }).addTo(m);
      } else {
        start.current.setLatLng([first.lat, first.lng]);
      }
    }

    if (live) {
      const last = points[points.length - 1] ?? current;
      if (last) {
        const zoom = Math.max(m.getZoom(), 16);
        // Glide when only panning; jump when the zoom changes (zoom animations race with unmount).
        m.setView([last.lat, last.lng], zoom, { animate: zoom === m.getZoom() });
      }
    } else if (points.length > 1 && !fitted.current) {
      m.fitBounds(line.current!.getBounds(), { padding: [28, 28], maxZoom: 17, animate: false });
      fitted.current = true;
    }
  }, [points, live, current, ready]);

  // "You are here" marker.
  useEffect(() => {
    const m = map.current;
    const leaflet = L.current;
    if (!m || !leaflet) return;
    if (!current) {
      here.current?.remove();
      here.current = null;
      return;
    }
    if (!here.current) {
      const icon = leaflet.divIcon({ className: "fs-here", html: '<span class="fs-here-dot"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
      here.current = leaflet.marker([current.lat, current.lng], { icon, interactive: false, keyboard: false }).addTo(m);
      if (!points.length) m.setView([current.lat, current.lng], 16, { animate: false });
    } else {
      here.current.setLatLng([current.lat, current.lng]);
    }
  }, [current, points.length, ready]);

  return (
    <>
      <div
        ref={el}
        role="img"
        aria-label={points.length > 1 ? "Map of your route" : "Map"}
        className={className}
        style={{
          background: TILE_URL
            ? "#0E0E14"
            : "#0E0E14 radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 0) 0 0 / 22px 22px",
        }}
      />
      <style>{`
        .fs-here-dot{display:block;width:16px;height:16px;margin:3px;border-radius:50%;background:#FF6B2C;border:3px solid #0A0A0F;box-shadow:0 0 0 0 rgba(255,107,44,.6);animation:fsHere 1.8s ease-out infinite}
        @keyframes fsHere{to{box-shadow:0 0 0 18px rgba(255,107,44,0)}}
        @media (prefers-reduced-motion:reduce){.fs-here-dot{animation:none}}
        .leaflet-container{font-family:inherit;background:transparent}
        .leaflet-control-attribution{background:rgba(10,10,15,.7)!important;color:#8A8A98!important;font-size:10px}
        .leaflet-control-attribution a{color:#B4B4C0!important}
      `}</style>
    </>
  );
}
