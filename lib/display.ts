import { Egg, Hexagon, Rabbit, type LucideIcon } from "lucide-react";
import type { Enclosure, EnclosureKind, EnclosureStatus, Limits } from "@/lib/types";

export const KIND: Record<EnclosureKind, { icon: LucideIcon; animal: string; noun: string }> = {
  beehive: { icon: Hexagon, animal: "bees", noun: "hive" },
  coop: { icon: Egg, animal: "chickens", noun: "coop" },
  shelter: { icon: Rabbit, animal: "small livestock", noun: "shelter" },
};

export const STATUS: Record<
  EnclosureStatus,
  { label: string; tag: string; text: string; bar: string; rank: number }
> = {
  waiting: { label: "No data", tag: "bg-paper-deep text-muted", text: "text-muted", bar: "bg-line", rank: 0 },
  healthy: { label: "OK", tag: "bg-trust text-white", text: "text-trust-dark", bar: "bg-trust", rank: 1 },
  attention: { label: "Watch", tag: "bg-gold text-ink", text: "text-gold-dark", bar: "bg-gold", rank: 2 },
  critical: { label: "Danger", tag: "bg-alert text-white", text: "text-alert-dark", bar: "bg-alert", rank: 3 },
};

/** False until the box has posted its first reading. */
export const hasData = (e: Enclosure) => e.status !== "waiting";

export interface Scale {
  min: number;
  max: number;
  limits?: Limits;
}

/** Gauge range for temperature: wide enough to show the safe zone and the danger zone. */
export function temperatureScale(e: Enclosure): Scale {
  const { attention, critical } = e.limits.temperature;
  return { min: Math.floor(attention - 20), max: Math.ceil(critical + 8), limits: e.limits.temperature };
}

/** Raw MQ-135 reading; higher is worse. */
export function airScale(e: Enclosure): Scale {
  return { min: 0, max: Math.round(e.limits.airQuality.critical * 1.25), limits: e.limits.airQuality };
}

export const HUMIDITY_SCALE: Scale = { min: 0, max: 100 };
export const ADC_SCALE: Scale = { min: 0, max: 4095 };

export function lightLabel(raw: number): string {
  if (raw < 100) return "Dark";
  if (raw < 600) return "Dim";
  return "Bright";
}

export function airLabel(e: Enclosure): string {
  const { attention, critical } = e.limits.airQuality;
  if (e.airQuality >= critical) return "Poor";
  if (e.airQuality >= attention) return "Stale";
  return "Fresh";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** HH:MM, or HH:MM:SS when `seconds` is set. Fixed format so server and client render identically. */
export function clock(iso: string, seconds = false): string {
  const d = new Date(iso);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return seconds ? `${hm}:${pad(d.getSeconds())}` : hm;
}

/** True when the trend spans less than an hour (e.g. a simulation run), so ticks need seconds. */
export function isShortSpan(points: { time: string }[]): boolean {
  if (points.length < 2) return true;
  return new Date(points[points.length - 1].time).getTime() - new Date(points[0].time).getTime() < 3_600_000;
}

export function worst<T extends { status: EnclosureStatus }>(items: T[]): T | undefined {
  return [...items].sort((a, b) => STATUS[b.status].rank - STATUS[a.status].rank)[0];
}
