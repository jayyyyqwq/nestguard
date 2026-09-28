import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { getEnclosures } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

export default async function EnclosureDashboard() {
  const enclosures = await getEnclosures();
  const attentionEnclosures = enclosures.filter((e) => e.status !== "healthy");

  return (
    <div className="max-w-6xl mx-auto px-10 py-10">
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="text-muted text-sm">Good afternoon,</div>
          <h1 className="font-display text-3xl mt-1">Your enclosures</h1>
        </div>
        <Link
          href="/enclosure/new"
          className="bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors"
        >
          + Register enclosure
        </Link>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-3 gap-5 mb-10">
        <div className="bg-white border border-black/5 rounded-2xl p-6">
          <div className="text-muted text-sm">Total enclosures</div>
          <div className="font-display text-3xl mt-2">{enclosures.length}</div>
        </div>
        <div className="bg-trust-tint rounded-2xl p-6">
          <div className="text-trust-dark text-sm">Healthy</div>
          <div className="font-display text-3xl mt-2 text-trust-dark">
            {enclosures.length - attentionEnclosures.length}
          </div>
        </div>
        <div className="bg-gold-tint rounded-2xl p-6">
          <div className="text-gold-dark text-sm">Needs attention</div>
          <div className="font-display text-3xl mt-2 text-gold-dark">{attentionEnclosures.length}</div>
        </div>
      </div>

      {/* alert banner */}
      {attentionEnclosures.length > 0 && (
        <div className="bg-alert-tint border border-alert/20 rounded-2xl p-5 mb-8 flex items-start gap-4">
          <AlertTriangle size={20} className="text-alert mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-alert">
              {attentionEnclosures.length} {attentionEnclosures.length === 1 ? "enclosure needs" : "enclosures need"}{" "}
              your attention
            </div>
            <div className="text-sm text-ink/70 mt-1">
              {attentionEnclosures.map((e) => e.name).join(" and ")} —{" "}
              {attentionEnclosures[0].aiAction.toLowerCase()}
            </div>
          </div>
        </div>
      )}

      {/* enclosure list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl">All enclosures</h2>
      </div>
      <div className="bg-white border border-black/5 rounded-2xl divide-y divide-black/5">
        {enclosures.map((enclosure) => (
          <Link
            key={enclosure.id}
            href={`/enclosure/${enclosure.id}`}
            className="flex items-center justify-between px-6 py-4 hover:bg-primary-tint/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="font-medium w-32">{enclosure.name}</div>
              <div className="text-sm text-muted">{enclosure.temperature}°C</div>
              <div className="text-sm text-muted">{enclosure.humidity}% humidity</div>
              <div className="text-sm text-muted">{enclosure.airQuality} air quality</div>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={enclosure.status} />
              <ChevronRight size={16} className="text-muted" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
