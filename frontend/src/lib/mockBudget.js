function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const SECTORS = ["Education", "Healthcare", "Infrastructure", "Defense", "Social Welfare", "Public Safety", "Environment", "Administration"];

export function getMockBudget(regionLabel, levelMultiplier = 1) {
  const seed = hashString(regionLabel);
  const rand = (min, max, salt = 0) => {
    const x = Math.sin(seed + salt) * 10000;
    const frac = x - Math.floor(x);
    return min + frac * (max - min);
  };

  const totalBudget = Math.round(rand(2, 80, 1) * levelMultiplier * 1e9);

  let remaining = 100;
  const allocations = SECTORS.map((s, i) => {
    const pct = i === SECTORS.length - 1 ? remaining : Math.round(rand(4, 22, i + 2));
    remaining -= pct;
    return { sector: s, pct: Math.max(pct, 2) };
  });
  const totalPct = allocations.reduce((s, a) => s + a.pct, 0);
  const normalized = allocations.map((a) => ({ ...a, pct: Math.round((a.pct / totalPct) * 100) }));

  const years = [2022, 2023, 2024, 2025, 2026];
  const trend = years.map((y, i) => ({
    year: y,
    amount: Math.round(totalBudget * (0.82 + i * 0.045) * (1 + rand(-0.03, 0.03, i + 10))),
  }));

  return { totalBudget, allocations: normalized, trend };
}

const SOURCE_TEMPLATES = [
  { label: "Annual Budget Statement", type: "pdf" },
  { label: "Public Expenditure Audit Report", type: "pdf" },
  { label: "Sector Allocation Breakdown", type: "xlsx" },
  { label: "Budget Committee Meeting Minutes", type: "pdf" },
];

export function getMockSources(regionLabel) {
  const seed = hashString(regionLabel);
  return SOURCE_TEMPLATES.map((t, i) => ({
    ...t,
    id: `src-${seed}-${i}`,
    year: 2024 + (seed + i) % 3,
    url: "#",
  }));
}
