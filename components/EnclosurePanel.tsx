import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import Gauge from "@/components/Gauge";
import Sparkline from "@/components/Sparkline";
import StatusBadge from "@/components/StatusBadge";
import { airLabel, airScale, hasData, KIND, STATUS, temperatureScale } from "@/lib/display";
import type { Device, Enclosure } from "@/lib/types";

function PanelHead({ id, label, kind }: { id: string; label: string; kind: Device["kind"] }) {
  const Icon = KIND[kind].icon;
  return (
    <span className="flex items-center gap-2">
      <Icon size={15} strokeWidth={2.2} />
      <span className="font-mono text-xs">{id}</span>
      <span className="label">{label}</span>
    </span>
  );
}

export function EnclosurePanel({ enclosure: e, index }: { enclosure: Enclosure; index: number }) {
  const live = hasData(e);
  const { attention, critical } = e.limits.temperature;

  return (
    <Link
      href={`/enclosure/${e.id}`}
      style={{ animationDelay: `${index * 70}ms` }}
      className="group animate-rise flex flex-col border border-ink bg-panel transition-colors hover:bg-white"
    >
      <div className={`h-1.5 ${STATUS[e.status].bar}`} />
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <PanelHead id={e.id} label={e.label} kind={e.kind} />
        <StatusBadge status={e.status} offline={e.isOffline} />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[26px] font-semibold leading-none">{e.name}</h3>
          <ArrowUpRight size={20} className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>

        <div className="mt-5 flex items-end gap-5">
          <div className={`font-display text-[64px] font-semibold leading-[0.85] tabular ${live ? "" : "text-ink/15"}`}>
            {live ? e.temperature.toFixed(1) : "0.0"}
            <span className="ml-1 text-2xl font-medium text-muted">°C</span>
          </div>
          <dl className="pb-0.5 text-sm leading-snug">
            <div className="flex gap-2">
              <dt className="label">Hum</dt>
              <dd className="tabular">{live ? `${Math.round(e.humidity)}%` : "--"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="label">Air</dt>
              <dd>{live ? airLabel(e) : "--"}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 space-y-1.5">
          <div className="flex justify-between">
            <span className="label">Temp · {KIND[e.kind].animal}</span>
            <span className="font-mono text-[11px] tabular text-muted">
              {attention}°/{critical}°
            </span>
          </div>
          <Gauge value={live ? e.temperature : null} scale={temperatureScale(e)} label="Temperature" />
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between">
            <span className="label">Air quality</span>
            <span className="font-mono text-[11px] tabular text-muted">{live ? Math.round(e.airQuality) : "--"}</span>
          </div>
          <Gauge value={live ? e.airQuality : null} scale={airScale(e)} label="Air quality" />
        </div>

        {e.trend.length > 1 && (
          <div className="mt-5 border-t border-line pt-3">
            <Sparkline data={e.trend} critical={critical} />
          </div>
        )}

        <p className={`mt-5 text-[15px] leading-snug ${live ? STATUS[e.status].text : "text-ink"}`}>
          {live ? e.aiReason : "Waiting for first reading."}
        </p>
        {!live && <p className="mt-1 text-sm text-muted">Power on the box, or press Run simulation.</p>}

        <div className="mt-auto pt-5 font-mono text-[11px] uppercase text-muted">
          {live ? `Synced ${e.lastSynced}` : "Never synced"}
        </div>
      </div>
    </Link>
  );
}

export function EmptySlot({ device, index }: { device: Device; index: number }) {
  const Icon = KIND[device.kind].icon;
  return (
    <Link
      href={`/enclosure/new?box=${device.id}`}
      style={{ animationDelay: `${index * 70}ms` }}
      className="group animate-rise flex min-h-[20rem] flex-col border border-dashed border-ink/50 transition-colors hover:border-ink hover:bg-panel"
    >
      <div className="flex items-center justify-between border-b border-dashed border-ink/30 px-5 py-3">
        <PanelHead id={device.id} label={device.label} kind={device.kind} />
        <span className="label">Unregistered</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <Icon size={28} strokeWidth={1.6} className="text-muted" />
        <span className="font-display text-[26px] font-semibold leading-none">{device.label}</span>
        <span className="inline-flex items-center gap-1.5 bg-ink px-3 py-1.5 font-display text-[14px] font-bold uppercase tracking-[0.08em] text-white">
          <Plus size={14} /> Register box
        </span>
      </div>
    </Link>
  );
}
