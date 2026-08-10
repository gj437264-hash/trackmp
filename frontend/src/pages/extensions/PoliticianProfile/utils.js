// utils.js — shared, dependency-light helpers (safe for the critical/initial bundle)

export function mediaIcon(type) {
  switch (type) {
    case "image":
      return "image";
    case "pdf":
      return "archive";
    case "video":
      return "video";
    default:
      return "file";
  }
}

export function currencySymbol(currency) {
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    const sym = parts.find((p) => p.type === "currency");
    return sym ? sym.value : currency || "$";
  } catch {
    return currency || "$";
  }
}

export function formatMoney(n, currency = "USD") {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  const sym = currencySymbol(currency);
  if (Math.abs(v) >= 1e9) return `${sym}${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `${sym}${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${sym}${(v / 1e3).toFixed(1)}K`;
  return `${sym}${v.toLocaleString()}`;
}

export function isFullHtmlDocument(html) {
  if (!html) return false;
  return /<html[\s>]/i.test(html) || /<!doctype/i.test(html);
}

/**
 * Whitelists http(s) URLs only, blocking javascript:, data:, etc.
 * ALWAYS pass user/editor-supplied URLs through this before using as href/src.
 */
export function ensureUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}
