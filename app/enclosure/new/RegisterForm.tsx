"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { createEnclosure } from "@/lib/api";
import { KIND } from "@/lib/display";
import type { Device } from "@/lib/types";

export default function RegisterForm({ devices, preselect }: { devices: Device[]; preselect?: string }) {
  const router = useRouter();
  const available = devices.filter((d) => !d.registered);
  const initial = available.find((d) => d.id === preselect) ?? available[0];
  const [boxId, setBoxId] = useState(initial?.id ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (available.length === 0) {
    return (
      <div className="mt-8 border border-ink bg-panel p-6">
        <p className="font-display text-2xl font-bold uppercase">All three boxes are registered</p>
        <p className="mt-2 text-sm text-muted">Every NestGuard box already has an enclosure on the dashboard.</p>
        <Link href="/enclosure" className="mt-5 inline-block text-sm font-semibold underline">
          Back to overview
        </Link>
      </div>
    );
  }

  const box = devices.find((d) => d.id === boxId);
  const Icon = box ? KIND[box.kind].icon : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const enclosure = await createEnclosure({ id: boxId, name: name.trim() || undefined });
      router.push(`/enclosure/${enclosure.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register this box.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6 border border-ink bg-panel p-6 sm:p-7">
      <div>
        <label htmlFor="box" className="label block text-ink">
          Sensor box
        </label>
        <div className="relative mt-2">
          {Icon && <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink" />}
          <select
            id="box"
            value={boxId}
            onChange={(e) => setBoxId(e.target.value)}
            className="w-full appearance-none border border-ink bg-white py-3 pl-10 pr-10 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-gold"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id} disabled={d.registered}>
                {d.label} ({d.id}){d.registered ? " · already registered" : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink" />
        </div>
      </div>

      <div>
        <label htmlFor="name" className="label block text-ink">
          Name <span className="text-muted">(optional)</span>
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={box?.label}
          maxLength={60}
          className="mt-2 w-full border border-ink bg-white px-3.5 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>

      <div className="bg-ink px-4 py-3.5 font-mono text-xs leading-relaxed text-white/85">
        <div className="text-white/45">// firmware/nestguard/nestguard.ino</div>
        <div>
          const char *ENCLOSURE_ID = <span className="text-gold">&quot;{boxId}&quot;</span>;
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted">
        The box&apos;s firmware must carry this ID. It&apos;s how its readings find this enclosure.
      </p>

      {error && <div className="border-l-4 border-alert bg-alert-tint px-3.5 py-2.5 text-sm text-alert-dark">{error}</div>}

      <button
        type="submit"
        disabled={submitting || !boxId}
        className="w-full bg-gold px-5 py-3 font-display text-lg font-bold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-[#FFCC3D] disabled:opacity-50"
      >
        {submitting ? "Registering…" : `Register ${box?.label.toLowerCase() ?? "box"}`}
      </button>
    </form>
  );
}
