import { STATUS } from "@/lib/display";
import type { EnclosureStatus } from "@/lib/types";

export default function StatusBadge({ status, offline = false }: { status: EnclosureStatus; offline?: boolean }) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 font-display text-[13px] font-bold uppercase tracking-[0.1em] ${
        offline ? "bg-ink text-white" : s.tag
      } ${status === "critical" && !offline ? "animate-blink" : ""}`}
    >
      {offline ? "Offline" : s.label}
    </span>
  );
}
