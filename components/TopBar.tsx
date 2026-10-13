"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Play, Square } from "lucide-react";
import { getSimulationStatus, setSimulation } from "@/lib/api";
import type { SimulationStatus } from "@/lib/types";

const LIVE_REFRESH_MS = 15_000; // real boxes post every 30-60s
const SIM_REFRESH_MS = 2_500; // simulator posts every 3s

const NAV = [
  { href: "/enclosure", label: "Overview" },
  { href: "/enclosure/new", label: "Register box" },
];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [sim, setSim] = useState<SimulationStatus | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    router.refresh();
    setRefreshedAt(new Date().toTimeString().slice(0, 8));
  }, [router]);

  const running = sim?.running ?? false;

  // Poll simulator status and re-render server data: fast while simulating, slow otherwise.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getSimulationStatus();
        if (!cancelled) setSim(next);
      } catch {
        // Backend down: the page's own error boundary explains it on refresh.
      }
      if (!cancelled) refresh();
    };
    poll();
    const id = setInterval(poll, running ? SIM_REFRESH_MS : LIVE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [running, refresh]);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      setSim(await setSimulation(running ? "stop" : "start"));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the simulator.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-stretch gap-6 px-4 sm:px-8 h-14">
        <Link href="/enclosure" className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-7 w-7 items-center justify-center bg-gold text-ink">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M12 3 19.8 7.5v9L12 21l-7.8-4.5v-9Z" fill="none" stroke="currentColor" strokeWidth="2.4" />
            </svg>
          </span>
          <span className="font-display text-xl font-bold uppercase tracking-[0.06em]">NestGuard</span>
        </Link>

        <nav className="hidden sm:flex items-stretch">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 font-display text-[15px] font-semibold uppercase tracking-[0.08em] border-b-[3px] transition-colors ${
                  active ? "border-gold text-white" : "border-transparent text-white/55 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-5">
          <span className="hidden md:flex items-center gap-2 font-mono text-[11px] uppercase text-white/55">
            <span className="h-2 w-2 bg-trust animate-blink" />
            Live{refreshedAt && <span className="tabular text-white/80">{refreshedAt}</span>}
          </span>
          <button
            onClick={toggle}
            disabled={busy || sim === null}
            className={`inline-flex items-center gap-2 px-4 py-2 font-display text-[15px] font-bold uppercase tracking-[0.08em] transition-colors disabled:opacity-50 ${
              running ? "bg-white text-ink hover:bg-white/85" : "bg-gold text-ink hover:bg-[#FFCC3D]"
            }`}
          >
            {running ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            {running ? "Stop" : "Run simulation"}
          </button>
        </div>
      </div>

      {running && sim && (
        <div className="bg-gold text-ink">
          <div className="hazard animate-stripes h-1.5" />
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 sm:px-8 py-2">
            <span className="font-display text-[13px] font-bold uppercase tracking-[0.1em] shrink-0">Simulated data</span>
            <span className="truncate text-sm">{sim.phase}</span>
            <span className="ml-auto font-mono text-xs tabular shrink-0">
              {mmss(sim.elapsedSeconds)} / {mmss(sim.durationSeconds)}
            </span>
          </div>
          <div className="h-1 bg-ink/15">
            <div className="h-full bg-ink transition-[width] duration-1000 ease-linear" style={{ width: `${sim.progress * 100}%` }} />
          </div>
        </div>
      )}

      {error && <div className="bg-alert px-4 py-2 text-center text-sm text-white">{error}</div>}
    </header>
  );
}
