import { getDevices, getEnclosures, getRecentAlerts } from "@/lib/api";
import { hasData, KIND, STATUS, worst } from "@/lib/display";
import type { Enclosure, EnclosureStatus } from "@/lib/types";
import AlertLog from "@/components/AlertLog";
import { EmptySlot, EnclosurePanel } from "@/components/EnclosurePanel";

function headline(enclosures: Enclosure[]): { title: string; detail: string; tone: EnclosureStatus } {
  const reporting = enclosures.filter(hasData);
  if (reporting.length === 0) {
    return {
      title: "Waiting for the boxes",
      detail: "No readings yet. Power on an ESP32 box, or press Run simulation to watch a demo.",
      tone: "waiting",
    };
  }
  const offline = reporting.filter((e) => e.isOffline);
  const top = worst(reporting.filter((e) => e.status !== "healthy" && !e.isOffline));

  if (top) {
    const noun = KIND[top.kind].noun;
    const title = top.status === "critical" ? `Check the ${noun} now` : `Keep an eye on the ${noun}`;
    return { title, detail: `${top.aiReason} ${top.aiAction}`, tone: top.status };
  }
  if (offline.length > 0) {
    return {
      title: offline.length === 1 ? "One box went quiet" : `${offline.length} boxes went quiet`,
      detail: `${offline.map((e) => e.name).join(" and ")} stopped reporting. ${offline[0].aiAction}`,
      tone: "critical",
    };
  }
  return { title: "All clear", detail: "Every reporting box is inside its animal's safe range.", tone: "healthy" };
}

export default async function Overview() {
  const [enclosures, devices, alerts] = await Promise.all([getEnclosures(), getDevices(), getRecentAlerts()]);
  const { title, detail, tone } = headline(enclosures);
  const names = Object.fromEntries(enclosures.map((e) => [e.id, e.name]));
  const reporting = enclosures.filter((e) => hasData(e) && !e.isOffline).length;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <>
      <section className="animate-rise flex flex-col gap-6 border-b border-ink pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 ${STATUS[tone].bar}`} />
            <span className="label">Status</span>
          </div>
          <h1 className="mt-2 font-display text-5xl sm:text-6xl font-bold uppercase leading-[0.95] tracking-tight">
            {title}
          </h1>
          <p className="mt-3 text-lg text-ink/75 leading-snug">{detail}</p>
        </div>
        <dl className="grid grid-cols-3 border border-ink bg-panel md:w-80 shrink-0">
          {[
            ["Boxes", `${enclosures.length}/${devices.length}`],
            ["Live", String(reporting)],
            ["Open alerts", String(alerts.filter((a) => !a.resolved).length)],
          ].map(([k, v], i) => (
            <div key={k} className={`px-3 py-2.5 ${i > 0 ? "border-l border-ink" : ""}`}>
              <dt className="label text-[11px]">{k}</dt>
              <dd className="font-display text-3xl font-semibold tabular leading-none mt-1">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-3 flex justify-between font-mono text-[11px] uppercase text-muted">
        <span>{today}</span>
        <span>Readings every 30 s per box</span>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((device, i) => {
          const enclosure = enclosures.find((e) => e.id === device.id);
          return enclosure ? (
            <EnclosurePanel key={device.id} enclosure={enclosure} index={i} />
          ) : (
            <EmptySlot key={device.id} device={device} index={i} />
          );
        })}
      </section>

      <section className="mt-14">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight">Alert log</h2>
          <span className="label">Latest {alerts.length}</span>
        </div>
        <AlertLog alerts={alerts} names={names} />
      </section>
    </>
  );
}
