import { Footprints } from "lucide-react";
import { routePath } from "@/lib/activity-format";
import { cn } from "@/lib/utils";

/** Small route drawing for lists — plain SVG, no map tiles, so a long feed stays light. */
export function RouteThumb({ polyline, className }: { polyline: string | null; className?: string }) {
  const d = routePath(polyline, 96, 96, 10);
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center justify-center overflow-hidden rounded-2xl bg-[#0E0E14]", className)}
      style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.06) 1px, transparent 0)", backgroundSize: "12px 12px" }}
    >
      {d ? (
        <svg viewBox="0 0 96 96" className="h-full w-full">
          <path d={d} fill="none" stroke="#FF6B2C" strokeOpacity=".25" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke="#FF8A57" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="fs-draw" pathLength={1} />
        </svg>
      ) : (
        <Footprints className="h-7 w-7 text-[var(--color-text-muted)]" />
      )}
    </div>
  );
}
