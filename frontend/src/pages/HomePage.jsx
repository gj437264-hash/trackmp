import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { avatarDataUri } from "@/lib/avatar";
import { PublicLayout } from "@/components/PublicLayout";
import { Search, ArrowRight, TrendingUp, TrendingDown, Sparkles, Users, Award, Globe, CheckCircle2, XCircle, Clock, MapPin, Building2, Calendar, Shield, BookOpen, Target, BarChart3, PieChart as PieChartIcon, Star, Crown, Flag, Handshake } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useCountUp } from "@/lib/useCountUp";
import { FadeIn, StaggerList, StaggerItem } from "@/components/Motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Soft styled PoliticianCard
function PoliticianCard({ p, index }) {
  const img = p.image_url || avatarDataUri(p.name);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="h-full"
    >
      <Link
        to={`/politicians/${p.id}`}
        data-testid={`politician-card-${p.id}`}
        className="group bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-200/80 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
      >
        <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200/50 relative">
          <img
            src={img}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
            {p.country_code}
          </div>
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start">
            <Sparkles size={10} /> {p.party || "Independent"}
          </div>
          <h3 className="mt-3 font-display font-bold text-xl leading-tight text-slate-800 group-hover:text-indigo-600 transition-colors">
            {p.name}
          </h3>
          <div className="mt-2 text-sm text-slate-500 line-clamp-2 flex-1">
            {p.brief_intro || p.role || "Elected official"}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin size={12} className="text-indigo-400" />
              <span>{p.country_code}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-indigo-600 group-hover:text-indigo-800 transition-colors">
              View Record <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Counter with soft styling
function Counter({ target, suffix = "" }) {
  const { ref, value } = useCountUp(target);
  return (
    <span ref={ref} className="font-display font-bold">
      {value.toLocaleString()}{suffix}
    </span>
  );
}

// Soft styled RecentCard
function RecentCard({ p }) {
  const img = p.image_url || avatarDataUri(p.name);
  return (
    <motion.div whileHover={{ y: -4, scale: 1.05 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Link
        to={`/politicians/${p.id}`}
        className="flex-shrink-0 w-48 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden block shadow-sm hover:shadow-lg transition-all duration-300"
        data-testid={`recent-card-${p.id}`}
      >
        <div className="aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200/50">
          <img src={img} alt={p.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" loading="lazy" />
        </div>
        <div className="p-3">
          <div className="font-display font-bold text-sm text-slate-800 truncate">{p.name}</div>
          <div className="text-xs text-slate-400 truncate">{p.party || "Independent"}</div>
        </div>
      </Link>
    </motion.div>
  );
}

// Soft styled LeaderboardCard
function LeaderboardCard({ p, rank, tone }) {
  const img = p.photo_url || avatarDataUri(p.name);
  const pct = tone === "keeper" ? p.delivered_pct : p.broken_pct;
  const pctLabel = tone === "keeper" ? "Delivered" : "Broken";
  const colorClass = tone === "keeper" ? "text-emerald-600" : "text-red-500";
  const bgClass = tone === "keeper" ? "bg-emerald-50/50" : "bg-red-50/50";
  
  return (
    <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "spring", stiffness: 350, damping: 22 }}>
      <Link
        to={`/politicians/${p.politician_id}`}
        data-testid={`leaderboard-card-${p.politician_id}`}
        className="group bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-lg hover:border-indigo-200/80 transition-all duration-300"
      >
        <div className={`font-display font-bold text-2xl ${colorClass} w-8 text-center shrink-0 opacity-60`}>
          {rank}
        </div>
        <img
          src={img}
          alt={p.name}
          className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0 border-2 border-slate-200 group-hover:border-indigo-300 transition-all duration-300"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{p.name}</div>
          <div className="text-xs text-slate-400 truncate">{p.party || "Independent"}{p.role ? ` · ${p.role}` : ""}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-display font-bold text-xl ${colorClass}`}>
            {pct}%
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">{pctLabel}</div>
        </div>
      </Link>
    </motion.div>
  );
}

// Soft styled Leaderboard
function Leaderboard({ title, icon, items, tone }) {
  const Icon = icon;
  const colorClass = tone === "keeper" ? "text-emerald-600" : "text-red-500";
  const bgClass = tone === "keeper" ? "bg-emerald-50/50" : "bg-red-50/50";
  
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
        <div className={`p-2 rounded-xl ${bgClass}`}>
          <Icon size={20} className={colorClass} />
        </div>
        <h2 className="font-display font-bold text-2xl text-slate-800">{title}</h2>
        <span className="ml-auto text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {items.length} records
        </span>
      </div>
      {items.length === 0 ? (
        <div className="bg-slate-50/80 rounded-2xl p-8 text-center text-slate-500">
          Not enough data yet
        </div>
      ) : (
        <StaggerList className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {items.map((p, i) => (
            <StaggerItem key={p.politician_id}>
              <LeaderboardCard p={p} rank={i + 1} tone={tone} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}

// Feature Cards Section
function FeatureCard({ icon: Icon, title, description, color }) {
  const colorMap = {
    emerald: "text-emerald-600 bg-emerald-50/50 border-emerald-200",
    indigo: "text-indigo-600 bg-indigo-50/50 border-indigo-200",
    amber: "text-amber-600 bg-amber-50/50 border-amber-200",
    purple: "text-purple-600 bg-purple-50/50 border-purple-200",
  };
  
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-indigo-200/80 transition-all duration-300"
    >
      <div className={`inline-flex p-3 rounded-xl ${colorMap[color]} mb-4`}>
        <Icon size={24} />
      </div>
      <h3 className="font-display font-bold text-lg text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </motion.div>
  );
}

// How It Works Section
function StepCard({ number, title, description, icon: Icon }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl flex items-center justify-center font-display font-bold text-sm shadow-lg shadow-emerald-500/30">
        {number}
      </div>
      <div className="mt-4">
        <div className="inline-flex p-2 rounded-xl bg-indigo-50/50 text-indigo-600 mb-3">
          <Icon size={20} />
        </div>
        <h3 className="font-display font-bold text-base text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const [politicians, setPoliticians] = useState([]);
  const [countries, setCountries] = useState([]);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("all");
  const [loading, setLoading] = useState(false);

  const [keepers, setKeepers] = useState([]);
  const [breakers, setBreakers] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [stats, setStats] = useState({ total_politicians: 0, total_promises: 0, delivered_pct: 0, broken_pct: 0 });
  const [recent, setRecent] = useState([]);

  const isBrowsing = !!q || (country && country !== "all");

  useEffect(() => {
    api.get("/ref/countries").then((r) => setCountries(r.data.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLeaderboardLoading(true);
    Promise.all([
      api.get("/leaderboards/promises", { params: { kind: "keepers", limit: 20 } }),
      api.get("/leaderboards/promises", { params: { kind: "breakers", limit: 20 } }),
      api.get("/stats"),
      api.get("/politicians", { params: { sort: "recent", limit: 100 } }),
    ])
      .then(([keepersRes, breakersRes, statsRes, recentRes]) => {
        setKeepers(keepersRes.data.items || []);
        setBreakers(breakersRes.data.items || []);
        setStats(statsRes.data);
        setRecent(recentRes.data.items || []);
      })
      .finally(() => setLeaderboardLoading(false));
  }, []);

  useEffect(() => {
    if (!isBrowsing) { setPoliticians([]); return; }
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (country && country !== "all") params.country_code = country;
    const t = setTimeout(() => {
      api
        .get("/politicians", { params })
        .then((r) => setPoliticians(r.data.items || []))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, country, isBrowsing]);

  const total = politicians.length;

  return (
    <PublicLayout>
      {/* Structural Dot Matrix Civic Grid Mask Overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none -z-20" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      {/* Hero Section with Soft Design */}
      <section className="relative overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_6s_ease-in-out_infinite] mix-blend-multiply" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_8s_ease-in-out_infinite_1s] mix-blend-multiply" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_10s_ease-in-out_infinite_2s] mix-blend-multiply" />

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200/60 backdrop-blur-sm mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Public Ledger · Real-Time Tracking
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="font-display font-black text-4xl sm:text-5xl lg:text-7xl leading-[0.95] tracking-tight max-w-4xl text-slate-900"
          >
            The Public Record
            <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Of Every Politician.
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            className="mt-6 text-base md:text-lg max-w-2xl text-slate-600 leading-relaxed"
          >
            A real-time, auditable tracking system for campaign promises, legislative actions, and constituency milestones. From pledge to performance - transparent by construction.
          </motion.p>
          
          <div className="mt-10 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 max-w-3xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={20} />
              <Input
                data-testid="search-politician-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search politicians by name…"
                className="bg-white/80 backdrop-blur-sm border-slate-200 rounded-2xl pl-12 text-base h-14 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200"
              />
            </div>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger
                data-testid="filter-country-select"
                className="bg-white/80 backdrop-blur-sm border-slate-200 rounded-2xl h-14 text-base focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200"
              >
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-sm border-slate-200 rounded-2xl">
                <SelectItem value="all">All countries</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isBrowsing ? (
            <div className="mt-6 flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span data-testid="total-count" className="text-slate-600">{loading ? "Searching…" : `${total} records found`}</span>
              <span>{countries.length} countries indexed</span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Users size={18} />
                  <span className="font-display font-bold text-2xl text-slate-800">
                    <Counter target={stats.total_politicians} suffix="+" />
                  </span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Politicians Tracked</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={18} />
                  <span className="font-display font-bold text-2xl text-slate-800">
                    <Counter target={stats.total_delivered || 0} />
                  </span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Promises Delivered</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 text-red-500">
                  <XCircle size={18} />
                  <span className="font-display font-bold text-2xl text-slate-800">
                    <Counter target={stats.total_broken || 0} />
                  </span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Promises Broken</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Globe size={18} />
                  <span className="font-display font-bold text-2xl text-slate-800">
		    <Counter target={160} />+
                    {/*<Counter target={countries.length || 0} />*/}
                  </span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Countries Indexed</div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Recently Added Section - Original Position (Right After Search) */}
      {!isBrowsing && recent.length > 0 && (
        <FadeIn>
          <section className="max-w-7xl mx-auto px-4 md:px-8 pt-12">
            <div className="flex items-center gap-3 mb-6">
              <Clock size={20} className="text-indigo-400" />
              <h2 className="font-display font-bold text-2xl text-slate-800">Recently Added Politicians</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {recent.slice(0, 100).map((p) => (
                <RecentCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        </FadeIn>
      )}

      {/* Results Section - Original Position (Top Keepers & Breakers) */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {isBrowsing ? (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl h-80 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : politicians.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                <Search size={14} /> Empty Ledger
              </div>
              <h3 className="font-display font-bold text-3xl mt-4 text-slate-800">No politicians match your filter.</h3>
              <p className="mt-3 text-slate-500">
                Try clearing the search or adjust the country filter.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Users size={20} className="text-indigo-400" />
                <h2 className="font-display font-bold text-2xl text-slate-800">Search Results</h2>
                <span className="text-sm text-slate-400">{politicians.length} politicians found</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="politician-grid">
                {politicians.map((p, i) => (
                  <PoliticianCard key={p.id} p={p} index={i} />
                ))}
              </div>
            </div>
          )
        ) : leaderboardLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FadeIn>
              <Leaderboard title="Top Promise Keepers" icon={TrendingUp} items={keepers} tone="keeper" />
            </FadeIn>
            <FadeIn delay={0.15}>
              <Leaderboard title="Top Promise Breakers" icon={TrendingDown} items={breakers} tone="breaker" />
            </FadeIn>
          </div>
        )}
      </section>

      {/* Feature Cards Section - New (After Original Content) */}
      {!isBrowsing && (
        <FadeIn>
          <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/60">
                <Star size={12} /> Why TrackMP
              </span>
              <h2 className="mt-4 font-display font-bold text-3xl md:text-4xl text-slate-800">
                Transparency Through <span className="bg-gradient-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent">Verifiable Data</span>
              </h2>
              <p className="mt-3 text-slate-500 max-w-2xl mx-auto">
                Every promise, every vote, every project - logged with sources and open for inspection.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard 
                icon={Target}
                title="Promise Tracking"
                description="Every campaign promise logged with timestamp, source, and real-time status updates."
                color="emerald"
              />
              <FeatureCard 
                icon={BarChart3}
                title="Performance Metrics"
                description="Clear, data-driven metrics showing delivery rates and legislative impact."
                color="indigo"
              />
              <FeatureCard 
                icon={Shield}
                title="Verified Sources"
                description="All entries backed by official documents, news sources, and public records."
                color="amber"
              />
              <FeatureCard 
                icon={Crown}
                title="Accountability"
                description="Hold representatives accountable with transparent, auditable records."
                color="purple"
              />
            </div>
          </section>
        </FadeIn>
      )}

      {/* How It Works Section - New (After Feature Cards) */}
      {!isBrowsing && (
        <FadeIn>
          <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
                <BookOpen size={12} /> How It Works
              </span>
              <h2 className="mt-4 font-display font-bold text-3xl md:text-4xl text-slate-800">
                From Promise to <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Performance</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StepCard 
                number={1}
                icon={Flag}
                title="Promise Logged"
                description="Campaign promises and commitments are extracted from manifestos, speeches, and public statements."
              />
              <StepCard 
                number={2}
                icon={Handshake}
                title="Action Tracked"
                description="Legislative votes, project milestones, and constituency work are recorded with source links."
              />
              <StepCard 
                number={3}
                icon={PieChartIcon}
                title="Performance Scored"
                description="Aggregated metrics show delivery rates, broken promises, and overall performance."
              />
            </div>
          </section>
        </FadeIn>
      )}

      {/* Footer Stats Banner - New (At the Bottom) */}
      {!isBrowsing && (
        <FadeIn>
          <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
            <div className="bg-gradient-to-r from-emerald-600/10 via-indigo-600/10 to-teal-600/10 border border-slate-200 rounded-3xl p-8 text-center backdrop-blur-sm">
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                <div>
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <CheckCircle2 size={24} />
                    <span className="font-display font-bold text-3xl text-slate-800">
                      <Counter target={stats.delivered_pct || 0} />%
                    </span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Delivery Rate</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 text-indigo-600">
                    <Users size={24} />
                    <span className="font-display font-bold text-3xl text-slate-800">
                      <Counter target={stats.total_politicians || 0} />
                    </span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Total Politicians</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 text-amber-600">
                    <Award size={24} />
                    <span className="font-display font-bold text-3xl text-slate-800">
                      <Counter target={stats.total_promises || 0} />
                    </span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Total Promises</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 text-purple-600">
                    <Globe size={24} />
                    <span className="font-display font-bold text-3xl text-slate-800">
                    <Counter target={160} />+  
		    {/*<Counter target={countries.length || 0} />*/}
                    </span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Countries</div>
                </div>
              </div>
            </div>
          </section>
        </FadeIn>
      )}
    </PublicLayout>
  );
}
