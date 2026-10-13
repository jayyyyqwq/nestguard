import Link from "next/link";
import { clock, STATUS } from "@/lib/display";
import type { Alert } from "@/lib/types";

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? "Today"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export default function AlertLog({ alerts, names }: { alerts: Alert[]; names?: Record<string, string> }) {
  if (alerts.length === 0) {
    return (
      <div className="border border-dashed border-ink/40 px-5 py-8 text-center text-sm text-muted">
        No alerts. When a reading leaves its safe range it is logged here, and closed when it recovers.
      </div>
    );
  }

  return (
    <div className="border border-ink bg-panel">
      <div className="hidden sm:grid grid-cols-[7.5rem_9rem_1fr_6rem] gap-4 border-b border-ink px-5 py-2">
        <span className="label">Time</span>
        <span className="label">Box</span>
        <span className="label">Event</span>
        <span className="label text-right">State</span>
      </div>
      <ol className="divide-y divide-line">
        {alerts.map((a, i) => (
          <li
            key={`${a.createdAt}-${i}`}
            className={`grid grid-cols-[1fr_auto] sm:grid-cols-[7.5rem_9rem_1fr_6rem] gap-x-4 gap-y-1 px-5 py-3 items-center ${
              a.resolved ? "text-muted" : ""
            }`}
          >
            <span className="font-mono text-xs tabular">
              {dayLabel(a.createdAt)} {clock(a.createdAt, true)}
            </span>
            <span className="sm:order-none order-last col-span-2 sm:col-span-1 text-sm font-semibold">
              {names ? (
                <Link href={`/enclosure/${a.enclosureId}`} className="hover:underline">
                  {names[a.enclosureId] ?? a.enclosureId}
                </Link>
              ) : (
                <span className="font-mono text-xs font-normal">{a.enclosureId}</span>
              )}
            </span>
            <span className="order-last col-span-2 sm:order-none sm:col-span-1 text-sm">{a.message}</span>
            <span className="row-start-1 col-start-2 sm:row-auto sm:col-auto justify-self-end">
              {a.resolved ? (
                <span className="label">Closed</span>
              ) : (
                <span className={`px-2 py-0.5 font-display text-[12px] font-bold uppercase tracking-[0.1em] ${STATUS[a.kind].tag}`}>
                  Open
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
