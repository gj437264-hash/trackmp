import { CheckCircle2, Clock, XCircle, CircleDashed } from "lucide-react";

const STYLES = {
  delivered: { cls: "bg-green-50 text-green-700 border-green-200", label: "Delivered", Icon: CheckCircle2 },
  in_progress: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "In Progress", Icon: Clock },
  pending: { cls: "bg-zinc-100 text-zinc-700 border-zinc-200", label: "Pending", Icon: CircleDashed },
  broken: { cls: "bg-red-50 text-red-700 border-red-200", label: "Broken", Icon: XCircle },
};

export default function StatusBadge({ status }) {
  const s = STYLES[status] || STYLES.pending;
  const Icon = s.Icon;
  return (
    <span data-testid={`status-${status}`} className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md ${s.cls}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

export const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "delivered", label: "Delivered" },
  { value: "broken", label: "Broken" },
];
