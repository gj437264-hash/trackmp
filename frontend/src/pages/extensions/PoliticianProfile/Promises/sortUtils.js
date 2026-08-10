// src/pages/extensions/PoliticianProfile/Promises/sortUtils.js
import { PROMISE_STATUS } from "./promiseStatus";

// Lifecycle order used for "by status" sorting — matches the 6-stage flow
const STATUS_ORDER = new Map(PROMISE_STATUS.map((s, i) => [s.value, i]));

// Safe date parse: never lets a bad/missing date crash the sort or produce NaN comparisons
function safeTime(dateStr) {
  if (!dateStr) return 0;
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? 0 : t;
}

// Whitelisted sort definitions. Keys here are the ONLY valid values for `sortBy`.
// Never use a raw string from props/URL/localStorage as an object key elsewhere —
// always resolve through this map so an unexpected value just falls through safely.
export const SORT_OPTIONS = [
  { value: "status", label: "By status" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "attachments", label: "Most attachments" },
];

const COMPARATORS = {
  status: (a, b) =>
    (STATUS_ORDER.get(a.status) ?? 99) - (STATUS_ORDER.get(b.status) ?? 99),
  newest: (a, b) => safeTime(b.date_made) - safeTime(a.date_made),
  oldest: (a, b) => safeTime(a.date_made) - safeTime(b.date_made),
  attachments: (a, b) => {
    const countOf = (p) => (p.source_links?.length || 0) + (p.files?.length || 0) + (p.source_url ? 1 : 0);
    return countOf(b) - countOf(a);
  },
};

/**
 * Returns a NEW sorted array — never mutates the input, since `promises`
 * may be shared state referenced elsewhere (e.g. PromiseProgress totals).
 */
export function sortPromises(list, sortBy) {
  const cmp = COMPARATORS[sortBy]; // whitelist lookup — undefined key = no-op
  if (!cmp || !Array.isArray(list)) return list || [];
  return [...list].sort(cmp);
}
