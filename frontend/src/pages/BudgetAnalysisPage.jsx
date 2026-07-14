import React, { useEffect, useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { getMockBudget, getMockSources } from "@/lib/mockBudget";
import { currencyForCountry } from "@/lib/countryCurrency";
import { ARTICLES } from "@/lib/mockArticles";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { PieChart as PieIcon, TrendingUp, Landmark, Paperclip, BookOpen, FileText, ChevronDown, ExternalLink } from "lucide-react";

const SECTOR_COLORS = ["#059669", "#0d9488", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#64748b"];

function currencySymbol(currency) {
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0);
    const sym = parts.find((p) => p.type === "currency");
    return sym ? sym.value : currency;
  } catch {
    return currency;
  }
}

function formatBudget(n, currency) {
  const sym = currencySymbol(currency);
  if (Math.abs(n) >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${sym}${(n / 1e6).toFixed(1)}M`;
  return `${sym}${n.toLocaleString()}`;
}

export default function BudgetAnalysisPage() {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const YEARS = [2022, 2023, 2024, 2025, 2026];
  const [year, setYear] = useState(2026);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);

  useEffect(() => {
    api.get("/ref/countries").then((r) => setCountries(r.data.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!country) { setStates([]); setState(""); setCities([]); setCity(""); return; }
    api.get("/ref/states", { params: { country_code: country } }).then((r) => setStates(r.data.items || []));
  }, [country]);

  useEffect(() => {
    if (!state) { setCities([]); setCity(""); return; }
    api.get("/ref/cities", { params: { state_id: state } }).then((r) => setCities(r.data.items || []));
  }, [state]);

  const countryName = countries.find((c) => c.code === country)?.name;
  const stateName = states.find((s) => s.id === state)?.name;
  const cityName = cities.find((c) => c.id === city)?.name;

  const regionLabel = cityName || stateName || countryName;
  const levelMultiplier = city ? 0.05 : state ? 0.3 : 1;
  const currency = currencyForCountry(country);
  const budget = regionLabel ? getMockBudget(`${regionLabel}-${country}`, levelMultiplier) : null;
  const yearEntry = budget?.trend.find((t) => t.year === year);
  const sources = regionLabel ? getMockSources(`${regionLabel}-${country}`) : [];
  const relatedArticles = ARTICLES.filter((a) => a.category === "Reports" || a.category === "Research");

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">/// Budget Analysis</div>
        <h1 className="font-display font-black text-4xl text-slate-800 tracking-tight">Government Budgets by Region</h1>
        <p className="mt-3 text-slate-500 max-w-2xl">
          Explore public budget allocation across countries, states, and cities. Select a region to view breakdown and trends.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              data-testid="budget-country"
            >
              <option value="">Select country</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={!states.length}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              data-testid="budget-state"
            >
              <option value="">{states.length ? "Select state" : "—"}</option>
              {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!cities.length}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              data-testid="budget-city"
            >
              <option value="">{cities.length ? "Select city" : "—"}</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Year</span>
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              data-testid={`budget-year-${y}`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                year === y ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {!budget ? (
          <div className="mt-10 text-center py-16 text-slate-400">
            <Landmark size={32} className="mx-auto mb-3 opacity-40" />
            Select a country, state, or city to view budget analysis.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-soft-emerald">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-100">{regionLabel}{countryName && regionLabel !== countryName ? `, ${countryName}` : ""} · {year}</div>
              <div className="mt-1 font-display font-black text-3xl">{formatBudget(yearEntry?.amount ?? budget.totalBudget, currency)}</div>
              <div className="text-sm text-emerald-100 mt-1">Total Annual Budget ({currency})</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
                  <PieIcon size={16} className="text-emerald-600" /> Allocation by Sector
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={budget.allocations} dataKey="pct" nameKey="sector" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {budget.allocations.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {budget.allocations.map((a, i) => (
                    <div key={a.sector} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                      <span className="text-slate-600">{a.sector}</span>
                      <span className="ml-auto font-bold text-slate-800">{a.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
                  <TrendingUp size={16} className="text-teal-600" /> Budget Trend (5 Years)
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={budget.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatBudget(v, currency)} width={60} />
                    <Tooltip formatter={(v) => formatBudget(v, currency)} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {budget.trend.map((t) => (
                        <Cell key={t.year} fill={t.year === year ? "#059669" : "#a7f3d0"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setShowAttachments((s) => !s)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 text-sm font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                data-testid="budget-attachments-btn"
              >
                <Paperclip size={15} /> Attachments <ChevronDown size={14} className={`transition-transform ${showAttachments ? "rotate-180" : ""}`} />
              </button>
              <button
                onClick={() => setShowReadMore((s) => !s)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 text-sm font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                data-testid="budget-readmore-btn"
              >
                <BookOpen size={15} /> Know More <ChevronDown size={14} className={`transition-transform ${showReadMore ? "rotate-180" : ""}`} />
              </button>
            </div>

            {showAttachments && (
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5" data-testid="attachments-panel">
                <div className="text-sm font-bold text-slate-700 mb-3">Source Documents</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sources.map((s) => (
                    <a
                      key={s.id}
                      href={s.url}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-sm text-slate-600"
                    >
                      <FileText size={14} className="text-emerald-600 shrink-0" />
                      <span className="flex-1 truncate">{s.label}</span>
                      <span className="text-[10px] uppercase text-slate-400 shrink-0">{s.type} · {s.year}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {showReadMore && (
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5" data-testid="readmore-panel">
                <div className="text-sm font-bold text-slate-700 mb-3">Related Reports & Research</div>
                <div className="space-y-2">
                  {relatedArticles.map((a) => (
                    <Link
                      key={a.id}
                      to={`/articles/${a.id}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group"
                    >
                      <span className="text-sm text-slate-600 group-hover:text-emerald-700 transition-colors">{a.title}</span>
                      <ExternalLink size={12} className="text-slate-300 group-hover:text-emerald-600 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-slate-400 text-center">
              Figures shown are illustrative placeholders pending integration with official budget data sources.
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
