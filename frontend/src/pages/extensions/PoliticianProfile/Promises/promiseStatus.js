import { CircleDashed, PauseCircle, Clock, Scale, CheckCircle2, XCircle } from "lucide-react";

export const PROMISE_STATUS = [
  { value: "pending", label: "Pending", Icon: CircleDashed, color: "#A3A3A3", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "stalled", label: "Stalled", Icon: PauseCircle, color: "#94A3B8", cls: "bg-slate-200 text-slate-700 border-slate-300" },
  { value: "in_progress", label: "In Progress", Icon: Clock, color: "#F59E0B", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "compromised", label: "Compromised", Icon: Scale, color: "#8B5CF6", cls: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "delivered", label: "Delivered", Icon: CheckCircle2, color: "#10B981", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "broken", label: "Broken", Icon: XCircle, color: "#EF4444", cls: "bg-red-100 text-red-700 border-red-200" },
];

//export function statusMeta(status) {
//  return PROMISE_STATUS.find((s) => s.value === status) || PROMISE_STATUS[0];
//}

// promiseStatus.js — add this export
export const STATUS_MAP = new Map(PROMISE_STATUS.map((s) => [s.value, s]));

export function statusMeta(status) {
  return STATUS_MAP.get(status) || PROMISE_STATUS[0];
}
