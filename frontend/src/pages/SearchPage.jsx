import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { avatarDataUri } from "@/lib/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, StaggerList, StaggerItem } from "@/components/Motion";
import {
  BadgeCheck,
  MapPin,
  ExternalLink,
  Search,
  Globe,
  Building2,
  Landmark,
  Shield,
  LandmarkIcon,
  Milestone,
  CalendarDays,
  Hourglass,
  Sparkles,
  Users,
  Clock,
  Filter,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All Records" },
  { value: "current", label: "Active Mandate" },
  { value: "former", label: "Historical Terms" },
];

const EMPTY_FILTERS = {
  country_code: "", state_id: "", city_id: "", constituency_id: "",
  position: "", party: "", election_year: "", status: "",
};

function filterChipLabel(key, value, refs) {
  switch (key) {
    case "country_code":
      return refs.countries.find((c) => c.code === value)?.name || value;
    case "state_id":
      return refs.states.find((s) => s.id === value)?.name || value;
    case "city_id":
      return refs.cities.find((c) => c.id === value)?.name || value;
    case "constituency_id":
      return refs.constituencies.find((c) => c.id === value)?.name || value;
    case "election_year":
      return `Year: ${value}`;
    case "status":
      return STATUS_OPTIONS.find((s) => s.value === value)?.label || value;
    default:
      return value;
  }
}

function ResultCard({ p }) {
  const location = [p.constituency_name, p.city_name, p.state_name, p.country_name].filter(Boolean).join(", ");

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Link
        to={`/politicians/${p.politician_id}`}
        className="block bg-gradient-to-br from-white via-white to-emerald-50/30 backdrop-blur-sm border border-emerald-100/50 rounded-2xl p-6 shadow-sm hover:shadow-soft-lg transition-all duration-500 relative overflow-hidden group h-full"
        data-testid={`search-result-${p.politician_id}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/0 via-emerald-100/0 to-emerald-100/0 group-hover:from-emerald-100/10 group-hover:via-emerald-100/5 group-hover:to-emerald-100/20 transition-all duration-700" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-emerald-400/5 to-teal-400/5 rounded-full blur-2xl group-hover:from-emerald-400/10 group-hover:to-teal-400/10 transition-all duration-700" />

        <div className="relative flex gap-5">
          <div className="relative">
            <img
              src={p.photo_url || avatarDataUri(p.name)}
              alt={p.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50 shrink-0 group-hover:scale-110 group-hover:rotate-[-3deg] transition-all duration-500 shadow-lg"
            />
            {p.verified && (
              <div className="absolute -top-1 -right-1 bg-emerald-400 rounded-full p-0.5 shadow-lg shadow-emerald-400/30">
                <BadgeCheck size={14} className="text-white fill-emerald-500" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-slate-800 text-lg tracking-tight group-hover:text-emerald-600 transition-colors duration-300">
                  {p.name}
                </span>
                {p.verified && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    <Sparkles size={10} className="fill-emerald-400" />
                    Verified
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                <span className="bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1 rounded-full text-xs font-semibold text-emerald-700 border border-emerald-200/50">
                  {p.position}
                </span>
                {p.party && (
                  <span className="text-slate-400 text-xs font-medium">
                    · {p.party}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5 mt-3 pt-3 border-t border-emerald-100/50">
              {location && (
                <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <MapPin size={12} className="text-emerald-400" />
                  <span className="truncate">{location}</span>
                </div>
              )}
              <div className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1.5">
                <Clock size={11} className="text-emerald-400" />
                {p.start_date || "—"} <span className="text-slate-300">→</span> {p.end_date || (p.is_current ? <span className="text-emerald-600 font-bold uppercase tracking-wider text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Present Active</span> : "—")}
              </div>
            </div>
          </div>
          <ExternalLink size={16} className="text-emerald-300 group-hover:text-emerald-600 transition-colors self-start mt-0.5 shrink-0 opacity-60 group-hover:opacity-100" />
        </div>
      </Link>
    </motion.div>
  );
}

function ResultCardSkeleton() {
  return (
    <div className="bg-white/60 border border-slate-100 rounded-2xl p-6 h-full animate-pulse">
      <div className="flex gap-5">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-slate-200 rounded-full w-2/3" />
          <div className="h-5 bg-slate-100 rounded-full w-1/3" />
          <div className="h-3 bg-slate-100 rounded-full w-1/2 mt-4" />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [constituencies, setConstituencies] = useState([]);

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => { api.get("/ref/countries").then((r) => setCountries(r.data.items || [])); }, []);

  useEffect(() => {
    if (!filters.country_code) { setStates([]); return; }
    api.get("/ref/states", { params: { country_code: filters.country_code } }).then((r) => setStates(r.data.items || []));
  }, [filters.country_code]);

  useEffect(() => {
    if (!filters.state_id) { setCities([]); setConstituencies([]); return; }
    api.get("/ref/cities", { params: { state_id: filters.state_id } }).then((r) => setCities(r.data.items || []));
    api.get("/ref/constituencies", { params: { state_id: filters.state_id } }).then((r) => setConstituencies(r.data.items || []));
  }, [filters.state_id]);

  const runSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await api.get("/search/positions", { params });
      setResults(data);
    } catch {
      setResults({ current: [], former: [] });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setStates([]);
    setCities([]);
    setConstituencies([]);
  };

  const removeFilter = (key) => {
    const next = { ...filters, [key]: "" };
    if (key === "country_code") { next.state_id = ""; next.city_id = ""; next.constituency_id = ""; }
    if (key === "state_id") { next.city_id = ""; next.constituency_id = ""; }
    setFilters(next);
  };

  const handleEnter = (e) => { if (e.key === "Enter") runSearch(); };

  const activeFilters = Object.entries(filters).filter(([, v]) => v);
  const activeFilterCount = activeFilters.length;

  const totalCurrent = results?.current?.reduce((sum, g) => sum + g.politicians.length, 0) || 0;
  const totalFormer = results?.former?.length || 0;

  return (
    <PublicLayout>
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/30 via-white to-teal-50/20 -z-20" />

      <div className="absolute top-20 -left-20 w-72 h-72 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl -z-10 animate-pulse-slow" />
      <div className="absolute bottom-40 -right-20 w-96 h-96 bg-gradient-to-tl from-indigo-200/15 to-emerald-200/15 rounded-full blur-3xl -z-10 animate-pulse-slow [animation-delay:2s]" />

      <div className="absolute inset-0 opacity-[0.015] pointer-events-none -z-15" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #059669 2px, transparent 0)',
        backgroundSize: '48px 48px'
      }} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 mb-10 relative">
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-emerald-50/80 backdrop-blur-sm text-emerald-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-emerald-200/50 shadow-sm">
              <Sparkles size={14} className="text-emerald-400" />
              Regional Governance Explorer
            </div>
            <h1 className="mt-4 font-display font-bold text-5xl md:text-7xl tracking-tight text-slate-800">
              Find
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent ml-3">
                Representatives
              </span>
            </h1>
            <p className="mt-3 text-base font-light text-slate-500 max-w-xl leading-relaxed">
              Discover verified public servants across jurisdictions with our intelligent search engine.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-emerald-100/50 shadow-sm">
            <Users size={18} className="text-emerald-400" />
            <span className="text-sm font-medium text-slate-600">
              <span className="font-bold text-emerald-600">{totalCurrent + totalFormer}</span> verified records
            </span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-emerald-100/50 rounded-3xl p-6 md:p-8 shadow-soft-lg hover:shadow-soft-xl transition-shadow duration-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 opacity-50" />
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-100/20 to-teal-100/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <Filter size={18} className="text-emerald-400" />
              <span className="font-display font-bold text-slate-700">Refine Search Parameters</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="flex items-center gap-2 font-medium text-xs text-slate-600 mb-2">
                  <Globe size={14} className="text-emerald-400" /> Country
                </label>
                <select
                  value={filters.country_code}
                  onChange={(e) => setFilters({ ...filters, country_code: e.target.value, state_id: "", city_id: "", constituency_id: "" })}
                  className="w-full bg-slate-50/80 hover:bg-slate-100/90 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 backdrop-blur-sm"
                  data-testid="filter-country"
                >
                  <option value="">Global / Any</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 font-medium text-xs text-slate-600 mb-2">
                  <Building2 size={14} className="text-emerald-400" /> State / Region
                </label>
                <select
                  value={filters.state_id}
                  onChange={(e) => setFilters({ ...filters, state_id: e.target.value, city_id: "", constituency_id: "" })}
                  className="w-full bg-slate-50/80 hover:bg-slate-100/90 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 backdrop-blur-sm"
                  disabled={!states.length}
                  data-testid="filter-state"
                >
                  <option value="">All States</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 font-medium text-xs text-slate-600 mb-2">
                  <Landmark size={14} className="text-emerald-400" /> Municipality
                </label>
                <select
                  value={filters.city_id}
                  onChange={(e) => setFilters({ ...filters, city_id: e.target.value })}
                  className="w-full bg-slate-50/80 hover:bg-slate-100/90 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 backdrop-blur-sm"
                  disabled={!cities.length}
                  data-testid="filter-city"
                >
                  <option value="">All Cities</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 font-medium text-xs text-slate-600 mb-2">
                  <Milestone size={14} className="text-emerald-400" /> Constituency
                </label>
                <select
                  value={filters.constituency_id}
                  onChange={(e) => setFilters({ ...filters, constituency_id: e.target.value })}
                  className="w-full bg-slate-50/80 hover:bg-slate-100/90 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 backdrop-blur-sm"
                  disabled={!constituencies.length}
                  data-testid="filter-constituency"
                >
                  <option value="">All Jurisdictions</option>
                  {constituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 font-medium text-xs text-slate-600 mb-2">
                  <Shield size={14} className="text-emerald-400" /> Position
                </label>
                <input
                  value={filters.position}
                  onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                  onKeyDown={handleEnter}
                  className="w-full bg-slate-50/80 hover:bg-slate-100/90 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 backdrop-blur-sm"
                  placeholder="MP, MLA, Mayor..."
                  data-testid="filter-position"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 font-medium text-xs text-slate-600 mb-2">
                  <LandmarkIcon size={14} className="text-emerald-400" /> Party
                </label>
                <input
                  value={filters.party}
                  onChange={(e) => setFilters({ ...filters, party: e.target.value })}
                  onKeyDown={handleEnter}
                  className="w-full bg-slate-50/80 hover:bg-slate-100/90 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 backdrop-blur-sm"
                  placeholder="e.g. Independent"
                  data-testid="filter-party"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 font-medium text-xs text-slate-600 mb-2">
                  <CalendarDays size={14} className="text-emerald-400" /> Election Year
                </label>
                <input
                  type="number"
                  value={filters.election_year}
                  onChange={(e) => setFilters({ ...filters, election_year: e.target.value })}
                  onKeyDown={handleEnter}
                  className="w-full bg-slate-50/80 hover:bg-slate-100/90 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 backdrop-blur-sm"
                  placeholder="YYYY"
                  data-testid="filter-election-year"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 font-medium text-xs text-slate-600 mb-2">
                  <Hourglass size={14} className="text-emerald-400" /> Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full bg-slate-50/80 hover:bg-slate-100/90 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 backdrop-blur-sm"
                  data-testid="filter-status"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <AnimatePresence>
              {activeFilterCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap items-center gap-2 mt-5 overflow-hidden"
                >
                  {activeFilters.map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold pl-3 pr-2 py-1.5 rounded-full border border-emerald-200/60"
                    >
                      {filterChipLabel(key, value, { countries, states, cities, constituencies })}
                      <button
                        type="button"
                        onClick={() => removeFilter(key)}
                        className="hover:bg-emerald-200/60 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove filter ${key}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                onClick={runSearch}
                disabled={loading}
                className="flex-1 md:flex-none w-full md:w-auto min-w-[240px] flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-display font-bold text-sm tracking-wide px-8 py-4 rounded-2xl shadow-soft-emerald hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer group"
                data-testid="run-search"
              >
                <Search size={18} className="group-hover:scale-110 transition-transform duration-300" />
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  "Find Representatives"
                )}
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-rose-500 px-4 py-4 rounded-2xl border border-slate-200 hover:border-rose-200 transition-colors duration-200"
                  data-testid="clear-filters"
                >
                  <RotateCcw size={14} />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {searched && (
          <div className="mt-12">
            <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center gap-3 mb-6 text-slate-400">
                  <Sparkles size={16} className="text-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium">Scanning governance records...</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {Array.from({ length: 4 }).map((_, i) => <ResultCardSkeleton key={i} />)}
                </div>
              </motion.div>
            ) : totalCurrent === 0 && totalFormer === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white/60 backdrop-blur-sm border-2 border-dashed border-emerald-200 rounded-3xl p-16 text-center"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-full mb-4">
                  <Search size={32} className="text-emerald-400" />
                </div>
                <h3 className="font-display font-bold text-2xl text-slate-700 mb-2">No Results Found</h3>
                <p className="text-slate-500 max-w-md mx-auto">Try adjusting your search filters or explore different locations to find representatives.</p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    <RotateCcw size={14} /> Clear all filters
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-14">
                {results.current.map((group, gi) => (
                  <FadeIn key={group.position} delay={gi * 0.08} className="block">
                    <div className="flex items-center gap-4 mb-6 pb-3 border-b border-emerald-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/30" />
                        <h2 className="font-display font-bold text-2xl text-slate-800">
                          Active Mandate: {group.position}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200/50">
                          <Users size={12} />
                          {group.politicians.length} {group.politicians.length > 1 ? "holders" : "holder"}
                        </span>
                      </div>
                    </div>
                    <StaggerList className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {group.politicians.map((p) => (
                        <StaggerItem key={`${p.politician_id}-${p.position}`}>
                          <ResultCard p={p} />
                        </StaggerItem>
                      ))}
                    </StaggerList>
                  </FadeIn>
                ))}

                {totalFormer > 0 && (
                  <FadeIn delay={results.current.length * 0.08} className="block">
                    <div className="flex items-center gap-4 mb-6 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                        <h2 className="font-display font-bold text-2xl text-slate-800">
                          Historical Office Holders
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200">
                          <Clock size={12} />
                          {totalFormer} {totalFormer > 1 ? "records" : "record"}
                        </span>
                      </div>
                    </div>
                    <StaggerList className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {results.former.map((p) => (
                        <StaggerItem key={`${p.politician_id}-${p.position}-${p.start_date}`}>
                          <ResultCard p={p} />
                        </StaggerItem>
                      ))}
                    </StaggerList>
                  </FadeIn>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
