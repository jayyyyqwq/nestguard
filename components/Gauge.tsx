import type { Scale } from "@/lib/display";

const SEGMENTS = 28;

function zoneColor(segmentValue: number, { limits }: Scale): string {
  if (!limits) return "bg-ink";
  if (segmentValue >= limits.critical) return "bg-alert";
  if (segmentValue >= limits.attention) return "bg-gold";
  return "bg-trust";
}

/**
 * Segmented LED-style meter. Segments light up to the current value; unlit
 * segments still show their zone colour faintly, so the animal's safe /
 * watch / danger bands are visible even with no reading.
 */
export default function Gauge({ value, scale, label }: { value: number | null; scale: Scale; label: string }) {
  const step = (scale.max - scale.min) / SEGMENTS;
  const lit = value === null ? 0 : Math.round((value - scale.min) / step);

  return (
    <div className="flex h-3 gap-[2px]" role="img" aria-label={label}>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const color = zoneColor(scale.min + (i + 0.5) * step, scale);
        return (
          <span
            key={i}
            className={`flex-1 transition-opacity duration-500 ${color} ${i < lit ? "opacity-100" : "opacity-[0.16]"}`}
          />
        );
      })}
    </div>
  );
}
