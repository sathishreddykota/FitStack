"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLngExpression, Map as LeafletMap, Polyline, CircleMarker, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";

// ─────────────────────────────────────────────
// Route map (Leaflet) on a dark street map:
//  - default: OpenFreeMap's dark style (free, no key, no usage limits, OpenStreetMap
//    data), drawn by MapLibre GL inside Leaflet via @maplibre/maplibre-gl-leaflet
//  - NEXT_PUBLIC_MAPTILER_KEY set: MapTiler's raster dark tiles instead
// If the street map can't load (offline, WebGL off), the route still draws as a
// glowing line on the dark background, so recording never depends on a map provider.
// ─────────────────────────────────────────────

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const TILE_URL = KEY ? `https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key=${KEY}` : null;
const ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>';
const OFM_STYLE = "https://tiles.openfreemap.org/styles/dark";
/** Copied from node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs — update with the package. */
const MAPLIBRE_WORKER = "/vendor/maplibre-gl-6.16.0-worker.mjs";
const OFM_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/**
 * OpenFreeMap's dark style draws roads almost the colour of the background, so a
 * run's streets were barely visible. Re-tint it for Ember Night: readable grey roads
 * (main roads brighter), a hint of blue water and green parks, legible labels —
 * the orange route still the brightest thing on the map.
 */
function emberNightMap(map: import("maplibre-gl").Map) {
  type Paint = Parameters<typeof map.setPaintProperty>[1];
  const set = (id: string, prop: Paint, value: string) => {
    try {
      map.setPaintProperty(id, prop, value);
    } catch {
      /* layer without that property */
    }
  };
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    if (layer.type === "background") set(layer.id, "background-color", "#101017");
    else if (layer.type === "fill" && /water/.test(id)) set(layer.id, "fill-color", "#0C1722");
    else if (layer.type === "fill" && /park|wood|grass|landcover|forest/.test(id)) set(layer.id, "fill-color", "#13201A");
    else if (layer.type === "fill" && /building/.test(id)) set(layer.id, "fill-color", "#1A1A24");
    else if (layer.type === "line" && /water|river|stream/.test(id)) set(layer.id, "line-color", "#13263A");
    else if (layer.type === "line" && /casing/.test(id)) set(layer.id, "line-color", "#101017");
    else if (layer.type === "line" && /motorway|trunk|primary|major/.test(id)) set(layer.id, "line-color", "#5C5C70");
    else if (layer.type === "line" && /road|highway|street|secondary|tertiary|minor|service|path|track|bridge|tunnel|transportation/.test(id))
      set(layer.id, "line-color", "#3C3C4C");
    else if (layer.type === "symbol") {
      set(layer.id, "text-color", "#9C9CAA");
      set(layer.id, "text-halo-color", "#0A0A0F");
    }
  }
}

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
        attributionControl: true,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        boxZoom: false,
        keyboard: interactive,
      });
      // A view first: the street-map layer only creates its map once Leaflet has one.
      m.setView([17.385, 78.4867], 15); // replaced by the route / position as soon as there is one
      if (TILE_URL) leaflet.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19, tileSize: 256 }).addTo(m);
      else {
        try {
          // MapLibre loads its tile-decoding worker as a separate file the bundler
          // doesn't ship, so serve a copy from /public (keep in step with the package).
          const maplibre = await import("maplibre-gl");
          maplibre.setWorkerUrl(MAPLIBRE_WORKER);
          const { maplibreGL } = await import("@maplibre/maplibre-gl-leaflet");
          if (!cancelled) {
            const gl = maplibreGL({ style: OFM_STYLE, attribution: OFM_ATTRIBUTION, interactive: false } as Parameters<typeof maplibreGL>[0]).addTo(m);
            const glMap = gl.getMaplibreMap();
            // The layer creates its map synchronously (the view is set above), so "load"
            // can't have fired yet; if it somehow has, tint straight away.
            if (glMap?.loaded()) emberNightMap(glMap);
            else glMap?.once("load", () => emberNightMap(glMap));
          }
        } catch {
          /* no WebGL / offline: the route still draws on the dark background */
        }
      }
      // The screen closed while the street map loaded: clean up instead of finishing.
      if (cancelled) {
        m.remove();
        return;
      }
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
