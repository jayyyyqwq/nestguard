import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, WifiOff } from "lucide-react";
import { getEnclosure, getEnclosureAlerts } from "@/lib/api";
import {
  ADC_SCALE,
  airLabel,
  airScale,
  hasData,
  HUMIDITY_SCALE,
  KIND,
  lightLabel,
  STATUS,
  temperatureScale,
  type Scale,
} from "@/lib/display";
import AlertLog from "@/components/AlertLog";
import EnclosureTrendChart from "@/components/EnclosureTrendChart";
import Gauge from "@/components/Gauge";
import StatusBadge from "@/components/StatusBadge";

function ReadingRow({
  name,
  value,
  unit,
  note,
  scale,
}: {
  name: string;
  value: number | null;
  unit?: string;
  note: string;
  scale: Scale;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[8.5rem_6.5rem_1fr] items-center gap-x-5 gap-y-2 px-5 py-3.5">
      <div>
        <div className="font-display text-lg font-semibold uppercase tracking-wide leading-tight">{name}</div>
        <div className="font-mono text-[10px] uppercase text-muted">{note}</div>
      </div>
      <div className={`text-right sm:text-left font-display text-3xl font-semibold tabular ${value === null ? "text-ink/15" : ""}`}>
        {value ?? 0}
        {unit && <span className="text-base font-medium text-muted">{unit}</span>}
      </div>
      <div className="col-span-2 sm:col-span-1">
        <Gauge value={value} scale={scale} label={name} />
      </div>
    </div>
  );
}

function ChartBox({ title, children, legend }: { title: string; children: React.ReactNode; legend?: boolean }) {
  return (
    <div className="border border-ink bg-panel">
      <div className="flex items-center justify-between border-b border-ink px-4 py-2">
        <span className="font-display text-base font-bold uppercase tracking-wide">{title}</span>
        {legend && (
          <span className="flex gap-3 font-mono text-[10px] uppercase">
            <span className="text-gold-dark">- - watch</span>
            <span className="text-alert">- - danger</span>
          </span>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export default async function EnclosureDetail({ params }: { params: { id: string } }) {
  const enclosure = await getEnclosure(params.id);
  if (!enclosure) return notFound();
  const alerts = await getEnclosureAlerts(enclosure.id);

  const e = enclosure;
  const live = hasData(e);
  const kind = KIND[e.kind];
  const Icon = kind.icon;
  const status = STATUS[e.status];
  const { attention, critical } = e.limits.temperature;
  const val = (v: number) => (live ? Math.round(v) : null);

  return (
    <>
      <Link href="/enclosure" className="label inline-flex items-center gap-1.5 hover:text-ink">
        <ArrowLeft size={14} /> Overview
      </Link>

      <header className="animate-rise mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Icon size={16} strokeWidth={2.2} />
            <span className="font-mono text-xs">{e.id}</span>
            <span className="label">{e.label}</span>
          </div>
          <h1 className="mt-1 font-display text-5xl sm:text-6xl font-bold uppercase leading-none tracking-tight">{e.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase text-muted">{live ? `Synced ${e.lastSynced}` : "Never synced"}</span>
          <StatusBadge status={e.status} offline={e.isOffline} />
        </div>
      </header>

      {/* Verdict: the one thing to read first */}
      <section className="animate-rise mt-6 flex border border-ink bg-panel" style={{ animationDelay: "60ms" }}>
        <div className={`w-3 shrink-0 ${e.isOffline ? "bg-ink" : status.bar}`} />
        <div className="flex items-start gap-4 p-5 sm:p-6">
          {e.isOffline && <WifiOff size={24} className="mt-1 shrink-0" />}
          <div>
            <p className="font-display text-2xl sm:text-3xl font-semibold leading-tight">{e.aiReason}</p>
            <p className="mt-1.5 text-ink/75 sm:text-lg">{e.aiAction}</p>
            {e.isOffline && (
              <p className="mt-2 text-sm text-muted">These are the last readings received before the box went quiet.</p>
            )}
            <p className="mt-4 font-mono text-[10px] uppercase text-muted">
              Rule-based check against limits for {kind.animal}. Not a diagnosis.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className="animate-rise self-start border border-ink bg-panel" style={{ animationDelay: "120ms" }}>
          <div className="border-b border-ink px-5 py-2 font-display text-base font-bold uppercase tracking-wide">Readings</div>
          <div className="divide-y divide-line">
            <ReadingRow
              name="Temp"
              value={live ? e.temperature : null}
              unit="°C"
              note={`Watch ${attention}° · Danger ${critical}°`}
              scale={temperatureScale(e)}
            />
            <ReadingRow name="Air" value={val(e.airQuality)} note={live ? `${airLabel(e)} · MQ-135 raw` : "MQ-135 raw"} scale={airScale(e)} />
            <ReadingRow name="Humidity" value={val(e.humidity)} unit="%" note="Relative" scale={HUMIDITY_SCALE} />
            <ReadingRow name="Light" value={val(e.light)} note={live ? `${lightLabel(e.light)} · LDR raw` : "LDR raw"} scale={ADC_SCALE} />
            <ReadingRow name="Sound" value={val(e.sound)} note={live ? `${e.activity} activity` : "Mic raw"} scale={ADC_SCALE} />
          </div>
        </section>

        <section className="animate-rise space-y-6" style={{ animationDelay: "180ms" }}>
          {e.trend.length > 1 ? (
            <>
              <ChartBox title="Temperature °C" legend>
                <EnclosureTrendChart data={e.trend} dataKey="temp" unit="°C" limits={e.limits.temperature} />
              </ChartBox>
              <div className="grid gap-6 sm:grid-cols-2">
                <ChartBox title="Air quality">
                  <EnclosureTrendChart data={e.trend} dataKey="airQuality" unit="" limits={e.limits.airQuality} height={150} />
                </ChartBox>
                <ChartBox title="Humidity %">
                  <EnclosureTrendChart data={e.trend} dataKey="humidity" unit="%" height={150} />
                </ChartBox>
              </div>
            </>
          ) : (
            <div className="flex min-h-[16rem] flex-col items-center justify-center border border-dashed border-ink/50 px-6 text-center">
              <p className="font-display text-2xl font-bold uppercase">No trend yet</p>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Charts appear after the box has reported a couple of times. No hardware? Press Run simulation in the
                top bar.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-14">
        <h2 className="mb-3 font-display text-3xl font-bold uppercase tracking-tight">Alert history</h2>
        <AlertLog alerts={alerts} />
      </section>
    </>
  );
}
