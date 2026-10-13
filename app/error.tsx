"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

const RETRY_MS = 5_000;

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  // The usual cause is the backend not running yet; recover on our own once it's up.
  useEffect(() => {
    const id = setInterval(retry, RETRY_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="label">NestGuard</div>
        <div className="mt-1 font-display text-4xl font-bold uppercase">Can&apos;t reach the sensors</div>
        <p className="mt-3 text-sm text-muted leading-relaxed">{error.message}</p>
        <p className="mt-2 font-mono text-[11px] uppercase text-muted">Retrying every few seconds</p>
        <button
          onClick={retry}
          className="mt-6 bg-ink px-5 py-2.5 font-display text-[15px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-ink/85"
        >
          Try again now
        </button>
      </div>
    </div>
  );
}
