// src/pages/extensions/PoliticianProfile/Promises/filterUtils.js
import { PROMISE_STATUS } from "./promiseStatus";

export const ALL_STATUS = "all";

// Dynamically generated from PROMISE_STATUS — adding/removing a lifecycle
// stage there automatically updates this dropdown, nothing to sync by hand.
export const STATUS_FILTER_OPTIONS = [
  { value: ALL_STATUS, label: "All statuses" },
  ...PROMISE_STATUS.map((s) => ({ value: s.value, label: s.label })),
];

// Fast membership check for validating incoming values (Select, URL param, etc.)
const VALID_VALUES = new Set(STATUS_FILTER_OPTIONS.map((o) => o.value));

export function isValidStatusFilter(value) {
  return VALID_VALUES.has(value);
}

/**
 * Returns a NEW filtered array — never mutates `list`.
 * Falls back to the full list for "all" or any unrecognized value,
 * so a bad value never silently produces an empty screen.
 */
export function filterByStatus(list, statusFilter) {
  if (!Array.isArray(list)) return [];
  if (statusFilter === ALL_STATUS || !isValidStatusFilter(statusFilter)) return list;
  return list.filter((p) => p.status === statusFilter);
}
