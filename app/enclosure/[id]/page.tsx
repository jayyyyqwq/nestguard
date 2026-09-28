import { notFound } from "next/navigation";
import { getEnclosure } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import EnclosureTrendChart from "@/components/EnclosureTrendChart";
import { WifiOff, ThermometerSun, Droplets, Wind, Sun, Volume2 } from "lucide-react";

export default async function EnclosureMonitoringPage({ params }: { params: { id: string } }) {
  const enclosure = await getEnclosure(params.id);
  if (!enclosure) return notFound();

  return (
    <div className="max-w-5xl mx-auto px-10 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">{enclosure.name}</h1>
        <StatusBadge status={enclosure.status} />
      </div>

      {enclosure.isOffline && (
        <div className="bg-alert-tint border border-alert/20 rounded-2xl p-4 mb-8 flex items-center gap-3">
          <WifiOff size={18} className="text-alert shrink-0" />
          <div className="text-sm text-ink/80">
            <span className="font-medium text-alert">No recent data.</span> Last synced{" "}
            {enclosure.lastSynced}. The ESP32 buffers readings locally and will sync automatically
            once it reconnects.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-black/5 rounded-2xl p-5">
          <ThermometerSun size={18} className="text-primary" />
          <div className="font-display text-2xl mt-3">{enclosure.temperature}°C</div>
          <div className="text-muted text-xs mt-1">Temperature</div>
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-5">
          <Droplets size={18} className="text-primary" />
          <div className="font-display text-2xl mt-3">{enclosure.humidity}%</div>
          <div className="text-muted text-xs mt-1">Humidity</div>
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-5">
          <Wind size={18} className="text-primary" />
          <div className="font-display text-2xl mt-3">{enclosure.airQuality}</div>
          <div className="text-muted text-xs mt-1">Air quality</div>
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-5">
          <Sun size={18} className="text-primary" />
          <div className="font-display text-2xl mt-3">{enclosure.light}</div>
          <div className="text-muted text-xs mt-1">Light</div>
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-5">
          <Volume2 size={18} className="text-primary" />
          <div className="font-display text-2xl mt-3">{enclosure.sound}</div>
          <div className="text-muted text-xs mt-1">Sound ({enclosure.activity.toLowerCase()})</div>
        </div>
      </div>

      <div className="bg-white border border-black/5 rounded-2xl p-6 mb-8">
        <div className="text-sm font-medium mb-4">Temperature & humidity — recent readings</div>
        <EnclosureTrendChart data={enclosure.trend} />
      </div>

      <div
        className={`rounded-2xl p-6 ${
          enclosure.status === "healthy"
            ? "bg-trust-tint"
            : enclosure.status === "attention"
              ? "bg-gold-tint"
              : "bg-alert-tint"
        }`}
      >
        <div className="text-xs font-medium uppercase tracking-wide text-ink/50 mb-2">AI insight</div>
        <div className="font-medium text-ink mb-1">{enclosure.aiReason}</div>
        <div className="text-sm text-ink/70">{enclosure.aiAction}</div>
        <div className="text-xs text-ink/40 mt-4">Risk indicator based on sensor patterns — not a lab diagnosis.</div>
      </div>
    </div>
  );
}
