"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEnclosure } from "@/lib/api";

export default function RegisterEnclosurePage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const enclosure = await createEnclosure({ id: id.trim(), name: name.trim() });
      router.push(`/enclosure/${enclosure.id}`);
    } catch {
      setError("Could not register this enclosure — check the ID isn't already in use.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-10 py-10">
      <h1 className="font-display text-3xl mb-2">Register an enclosure</h1>
      <p className="text-muted text-sm mb-8">
        Use the same ID here that you'll set on the ESP32's firmware — that's how it knows which
        enclosure its readings belong to.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-black/5 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="id">
            Enclosure ID
          </label>
          <input
            id="id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. COOP1"
            required
            className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Backyard chicken coop"
            required
            className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {error && <div className="text-sm text-alert">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {submitting ? "Registering…" : "Register enclosure"}
        </button>
      </form>
    </div>
  );
}
