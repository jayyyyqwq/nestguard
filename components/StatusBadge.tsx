import { EnclosureStatus } from "@/lib/types";

const styles: Record<EnclosureStatus, string> = {
  healthy: "bg-trust-tint text-trust-dark",
  attention: "bg-gold-tint text-gold-dark",
  critical: "bg-alert-tint text-alert",
};

const labels: Record<EnclosureStatus, string> = {
  healthy: "Healthy",
  attention: "Attention",
  critical: "Critical",
};

export default function StatusBadge({ status }: { status: EnclosureStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
