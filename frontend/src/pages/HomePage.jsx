import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { avatarDataUri } from "@/lib/avatar";
import { PublicLayout } from "@/components/PublicLayout";
import {
  Search, ArrowRight, TrendingUp, TrendingDown, Sparkles, Users, Award,
  Globe, CheckCircle2, XCircle, Clock, MapPin, Shield, BookOpen, Target,
  BarChart3, PieChart as PieChartIcon, Star, Crown, Flag, Handshake, Zap
} from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useCountUp } from "@/lib/useCountUp";
import { FadeIn, StaggerList, StaggerItem } from "@/components/Motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/* Security helpers                                                    */
/* ------------------------------------------------------------------ */

// Only allow http(s), root-relative, and data:image URIs for images sourced
// from the API. Prevents javascript:/data:text-html style URL injection if
// backend data is ever malformed or compromised. Falls back to the
// generated avatar for anything else.
function isSafeImageUrl(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) return false;
  // Reject control characters that browsers strip during URL parsing
  // (classic javascript: scheme obfuscation vector, e.g. "jav\tascript:").
  if (/[\u0000-\u001F]/.test(trimmed)) return false;
  try {
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(trimmed)) return true;
    // Relative, same-origin paths only — explicitly reject protocol-relative "//host/..."
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
    const parsed = new URL(trimmed, window.location.origin);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function safeImageSrc(url, name) {
  return isSafeImageUrl(url) ? url : avatarDataUri(name);
}

// Clamp a percentage-like value into [0, 100] so malformed backend data can
// never render a broken/overflowing progress bar.
function clampPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/* ------------------------------------------------------------------ */
/* Perf helper: lazy-mount offscreen sections                          */
/* ------------------------------------------------------------------ */

// Defers mounting expensive below-the-fold sections until they're about to
// scroll into view. Reduces initial JS work (fewer components/animations
// mounted on first paint) which helps TBT and interaction readiness.
function useInView(rootMargin = "240px 0px") {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true); // graceful fallback for old browsers/tests
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
}

const LazySection = memo(function LazySection({ children, minHeight = 240 }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      style={!inView ? { minHeight, contentVisibility: "auto", containIntrinsicSize: `${minHeight}px` } : undefined}
    >
      {inView ? children : null}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Decorative helpers                                                  */
/* ------------------------------------------------------------------ */

// Fewer particles than before (3 instead of 5) — cheaper to animate, still
// reads as "alive". Skipped entirely under prefers-reduced-motion.
const HERO_PARTICLES = [
  { icon: Sparkles, top: "14%", left: "8%", size: 18, delay: 0, color: "text-emerald-400" },
  { icon: Star, top: "72%", left: "90%", size: 14, delay: 0.7, color: "text-amber-400" },
  { icon: Zap, top: "40%", left: "4%", size: 12, delay: 1.4, color: "text-indigo-400" },
];

const HeroParticles = memo(function HeroParticles({ reduced }) {
  if (reduced) return null;
  return (
    <div className="absolute inset-0 pointer-events-none -z-10" aria-hidden>
      {HERO_PARTICLES.map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.div
            key={i}
            className={`absolute ${p.color} opacity-40`}
            style={{ top: p.top, left: p.left }}
            animate={{ y: [0, -14, 0], opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 5 + i, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          >
            <Icon size={p.size} />
          </motion.div>
        );
      })}
    </div>
  );
});

// Ticker only animates while its section is in view (via LazySection's
// content-visibility ancestor when scrolled away, and by not rendering at
// all under reduced motion).
const LiveTicker = memo(function LiveTicker({ items, reduced }) {
  const doubled = useMemo(() => (items?.length ? [...items, ...items] : []), [items]);
  if (!items?.length) return null;
  return (
    <div className="relative overflow-hidden border-y border-slate-200 bg-white/60 backdrop-blur-sm py-2.5">
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((p, i) => (
          <Link
            key={`${p.id}-${i}`}
            to={`/politicians/${encodeURIComponent(p.id)}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            {p.name}
            <span className="text-slate-300">·</span>
            <span className="text-slate-400 font-normal">{p.party || "Independent"}</span>
          </Link>
        ))}
      </motion.div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Cards                                                                */
/* ------------------------------------------------------------------ */

const PoliticianCard = memo(function PoliticianCard({ p, index }) {
  const img = safeImageSrc(p.image_url, p.name);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "80px" }}
      transition={{ delay: Math.min(index, 8) * 0.04 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="h-full"
    >
      <Link
        to={`/politicians/${encodeURIComponent(p.id)}`}
        data-testid={`politician-card-${p.id}`}
        className="group relative bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-200/80 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
      >
        <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-emerald-400/20 via-teal-400/20 to-indigo-400/20 -z-10" />
        <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200/50 relative">
          <img
            src={img}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            width="400"
            height="300"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarDataUri(p.name); }}
          />
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
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
});

const Counter = memo(function Counter({ target, suffix = "" }) {
  const { ref, value } = useCountUp(target);
  return (
    <span ref={ref} className="font-display font-bold">
      {value.toLocaleString()}{suffix}
    </span>
  );
});

const RecentCard = memo(function RecentCard({ p }) {
  const img = safeImageSrc(p.image_url, p.name);
  return (
    <motion.div whileHover={{ y: -4, scale: 1.05 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Link
        to={`/politicians/${encodeURIComponent(p.id)}`}
        className="group flex-shrink-0 w-48 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden block shadow-sm hover:shadow-lg hover:border-indigo-200/80 transition-all duration-300"
        data-testid={`recent-card-${p.id}`}
      >
        <div className="aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200/50 relative">
          <img
            src={img}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            width="192"
            height="192"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarDataUri(p.name); }}
          />
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
            New
          </div>
        </div>
        <div className="p-3">
          <div className="font-display font-bold text-sm text-slate-800 truncate">{p.name}</div>
          <div className="text-xs text-slate-400 truncate">{p.party || "Independent"}</div>
        </div>
      </Link>
    </motion.div>
  );
});

const LeaderboardCard = memo(function LeaderboardCard({ p, rank, tone }) {
  const img = safeImageSrc(p.photo_url, p.name);
  const pct = clampPct(tone === "keeper" ? p.delivered_pct : p.broken_pct);
  const pctLabel = tone === "keeper" ? "Delivered" : "Broken";
  const colorClass = tone === "keeper" ? "text-emerald-600" : "text-red-500";
  const ringClass = tone === "keeper" ? "ring-emerald-200" : "ring-red-200";
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "spring", stiffness: 350, damping: 22 }}>
      <Link
        to={`/politicians/${encodeURIComponent(p.politician_id)}`}
        data-testid={`leaderboard-card-${p.politician_id}`}
        className="group bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-lg hover:border-indigo-200/80 transition-all duration-300"
      >
        <div className={`font-display font-bold text-2xl ${colorClass} w-8 text-center shrink-0 opacity-60 flex items-center justify-center`}>
          {medal || rank}
        </div>
        <div className={`relative shrink-0 rounded-xl ring-2 ${ringClass} group-hover:ring-4 transition-all duration-300`}>
          <img
            src={img}
            alt={p.name}
            className="w-14 h-14 rounded-xl object-cover bg-slate-100"
            loading="lazy"
            width="56"
            height="56"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatarDataUri(p.name); }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{p.name}</div>
          <div className="text-xs text-slate-400 truncate">{p.party || "Independent"}{p.role ? ` · ${p.role}` : ""}</div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${tone === "keeper" ? "bg-emerald-500" : "bg-red-400"}`}
            />
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-display font-bold text-xl ${colorClass}`}>{pct}%</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">{pctLabel}</div>
        </div>
      </Link>
    </motion.div>
  );
});

const Leaderboard = memo(function Leaderboard({ title, icon, items, tone }) {
  const Icon = icon;
  const colorClass = tone === "keeper" ? "text-emerald-600" : "text-red-500";
  const bgClass = tone === "keeper" ? "bg-emerald-50/50" : "bg-red-50/50";

  return (
    <div className="relative bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 -z-10 ${tone === "keeper" ? "bg-emerald-400" : "bg-red-400"}`} />
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
});

const FEATURE_COLOR_MAP = {
  emerald: "text-emerald-600 bg-emerald-50/50 border-emerald-200",
  indigo: "text-indigo-600 bg-indigo-50/50 border-indigo-200",
  amber: "text-amber-600 bg-amber-50/50 border-amber-200",
  purple: "text-purple-600 bg-purple-50/50 border-purple-200",
};
const FEATURE_GLOW_MAP = {
  emerald: "group-hover:shadow-emerald-500/20",
  indigo: "group-hover:shadow-indigo-500/20",
  amber: "group-hover:shadow-amber-500/20",
  purple: "group-hover:shadow-purple-500/20",
};

const FeatureCard = memo(function FeatureCard({ icon: Icon, title, description, color }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.03 }}
      className={`group bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl ${FEATURE_GLOW_MAP[color]} hover:border-indigo-200/80 transition-all duration-300`}
    >
      <motion.div
        whileHover={{ rotate: 8, scale: 1.1 }}
        className={`inline-flex p-3 rounded-xl ${FEATURE_COLOR_MAP[color]} mb-4`}
      >
        <Icon size={24} />
      </motion.div>
      <h3 className="font-display font-bold text-lg text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </motion.div>
  );
});

const StepCard = memo(function StepCard({ number, title, description, icon: Icon }) {
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
});

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const SEARCH_DEBOUNCE_MS = 250;
const MAX_QUERY_LENGTH = 120;
const RECENT_DISPLAY_LIMIT = 20; // was rendering up to 100 DOM nodes into a horizontal strip

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
  const reduced = useReducedMotion();

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const orb1Y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -80]);
  const orb2Y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 0.4]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/ref/countries", { signal: controller.signal })
      .then((r) => setCountries(r.data.items || []))
      .catch((err) => {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
          console.error("Failed to load countries:", err);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLeaderboardLoading(true);
    Promise.all([
      api.get("/leaderboards/promises", { params: { kind: "keepers", limit: 20 }, signal: controller.signal }),
      api.get("/leaderboards/promises", { params: { kind: "breakers", limit: 20 }, signal: controller.signal }),
      api.get("/stats", { signal: controller.signal }),
      api.get("/politicians", { params: { sort: "recent", limit: RECENT_DISPLAY_LIMIT }, signal: controller.signal }),
    ])
      .then(([keepersRes, breakersRes, statsRes, recentRes]) => {
        setKeepers(keepersRes.data.items || []);
        setBreakers(breakersRes.data.items || []);
        setStats(statsRes.data);
        setRecent(recentRes.data.items || []);
      })
      .catch((err) => {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
          console.error("Failed to load homepage data:", err);
        }
      })
      .finally(() => setLeaderboardLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isBrowsing) { setPoliticians([]); return; }
    setLoading(true);
    const controller = new AbortController();
    const params = {};
    const cleanQ = q.trim().slice(0, MAX_QUERY_LENGTH);
    if (cleanQ) params.q = cleanQ;
    if (country && country !== "all" && /^[A-Za-z]{2,3}$/.test(country)) {
      params.country_code = country;
    }
    const t = setTimeout(() => {
      api
        .get("/politicians", { params, signal: controller.signal })
        .then((r) => setPoliticians(r.data.items || []))
        .catch((err) => {
          if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
            console.error("Search failed:", err);
          }
        })
        .finally(() => setLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, country, isBrowsing]);

  const total = politicians.length;

  const handleSearchChange = useCallback((e) => {
    setQ(e.target.value);
  }, []);

  const heroStatCards = useMemo(() => ([
    { icon: Users, color: "text-emerald-600", ring: "hover:ring-emerald-200", value: stats.total_politicians, suffix: "+", label: "Politicians Tracked" },
    { icon: CheckCircle2, color: "text-emerald-600", ring: "hover:ring-emerald-200", value: stats.total_delivered || 0, suffix: "", label: "Promises Delivered" },
    { icon: XCircle, color: "text-red-500", ring: "hover:ring-red-200", value: stats.total_broken || 0, suffix: "", label: "Promises Broken" },
    { icon: Globe, color: "text-indigo-600", ring: "hover:ring-indigo-200", value: 160, suffix: "+", label: "Countries Indexed" },
  ]), [stats.total_politicians, stats.total_delivered, stats.total_broken]);

  return (
    <PublicLayout>
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none -z-20" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden">
        <motion.div style={{ y: orb1Y, opacity: heroOpacity }} className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -z-10 mix-blend-multiply" />
        <motion.div style={{ y: orb2Y, opacity: heroOpacity }} className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10 mix-blend-multiply" />

        <HeroParticles reduced={reduced} />

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200/60 backdrop-blur-sm mb-6 shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Public Ledger · Real-Time Tracking
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
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
            transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }}
            className="mt-6 text-base md:text-lg max-w-2xl text-slate-600 leading-relaxed"
          >
            A real-time, auditable tracking system for campaign promises, legislative actions, and constituency milestones. From pledge to performance — transparent by construction.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.26 }}
            className="mt-10 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 max-w-3xl"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={20} aria-hidden="true" />
              <Input
                data-testid="search-politician-input"
                value={q}
                onChange={handleSearchChange}
                maxLength={MAX_QUERY_LENGTH}
                placeholder="Search politicians by name…"
                aria-label="Search politicians by name"
                autoComplete="off"
                className="bg-white/80 backdrop-blur-sm border-slate-200 rounded-2xl pl-12 text-base h-14 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200 shadow-sm focus:shadow-md"
              />
            </div>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger
                data-testid="filter-country-select"
                aria-label="Filter by country"
                className="bg-white/80 backdrop-blur-sm border-slate-200 rounded-2xl h-14 text-base focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200 shadow-sm"
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
          </motion.div>

          {isBrowsing ? (
            <div className="mt-6 flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span data-testid="total-count" className="text-slate-600" aria-live="polite">
                {loading ? "Searching…" : `${total} records found`}
              </span>
              <span>{countries.length} countries indexed</span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {heroStatCards.map((s) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    whileHover={{ y: -3, scale: 1.03 }}
                    className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md ring-0 hover:ring-2 ${s.ring} transition-all duration-300`}
                  >
                    <div className={`flex items-center gap-2 ${s.color}`}>
                      <Icon size={18} aria-hidden="true" />
                      <span className="font-display font-bold text-2xl text-slate-800">
                        <Counter target={s.value} suffix={s.suffix} />
                      </span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">{s.label}</div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {!isBrowsing && recent.length > 0 && (
        <LiveTicker items={recent} reduced={reduced} />
      )}

      {!isBrowsing && recent.length > 0 && (
        <FadeIn>
          <section className="max-w-7xl mx-auto px-4 md:px-8 pt-12">
            <div className="flex items-center gap-3 mb-6">
              <Clock size={20} className="text-indigo-400" aria-hidden="true" />
              <h2 className="font-display font-bold text-2xl text-slate-800">Recently Added Politicians</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {recent.map((p) => (
                <RecentCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        </FadeIn>
      )}

      {/* Results / Leaderboards */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {isBrowsing ? (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-live="polite">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl h-80 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : politicians.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                <Search size={14} aria-hidden="true" /> Empty Ledger
              </div>
              <h3 className="font-display font-bold text-3xl mt-4 text-slate-800">No politicians match your filter.</h3>
              <p className="mt-3 text-slate-500">Try clearing the search or adjust the country filter.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Users size={20} className="text-indigo-400" aria-hidden="true" />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-busy="true" aria-live="polite">
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

      {/* Below-the-fold sections: lazy-mounted to reduce initial JS/DOM cost */}
      {!isBrowsing && (
        <LazySection minHeight={520}>
          <FadeIn>
            <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/60">
                  <Star size={12} aria-hidden="true" /> Why TrackMP
                </span>
                <h2 className="mt-4 font-display font-bold text-3xl md:text-4xl text-slate-800">
                  Transparency Through <span className="bg-gradient-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent">Verifiable Data</span>
                </h2>
                <p className="mt-3 text-slate-500 max-w-2xl mx-auto">
                  Every promise, every vote, every project — logged with sources and open for inspection.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FeatureCard icon={Target} title="Promise Tracking" description="Every campaign promise logged with timestamp, source, and real-time status updates." color="emerald" />
                <FeatureCard icon={BarChart3} title="Performance Metrics" description="Clear, data-driven metrics showing delivery rates and legislative impact." color="indigo" />
                <FeatureCard icon={Shield} title="Verified Sources" description="All entries backed by official documents, news sources, and public records." color="amber" />
                <FeatureCard icon={Crown} title="Accountability" description="Hold representatives accountable with transparent, auditable records." color="purple" />
              </div>
            </section>
          </FadeIn>
        </LazySection>
      )}

      {!isBrowsing && (
        <LazySection minHeight={420}>
          <FadeIn>
            <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
                  <BookOpen size={12} aria-hidden="true" /> How It Works
                </span>
                <h2 className="mt-4 font-display font-bold text-3xl md:text-4xl text-slate-800">
                  From Promise to <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Performance</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StepCard number={1} icon={Flag} title="Promise Logged" description="Campaign promises and commitments are extracted from manifestos, speeches, and public statements." />
                <StepCard number={2} icon={Handshake} title="Action Tracked" description="Legislative votes, project milestones, and constituency work are recorded with source links." />
                <StepCard number={3} icon={PieChartIcon} title="Performance Scored" description="Aggregated metrics show delivery rates, broken promises, and overall performance." />
              </div>
            </section>
          </FadeIn>
        </LazySection>
      )}

      {!isBrowsing && (
        <LazySection minHeight={220}>
          <FadeIn>
            <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
              <div className="relative bg-gradient-to-r from-emerald-600/10 via-indigo-600/10 to-teal-600/10 border border-slate-200 rounded-3xl p-8 text-center backdrop-blur-sm overflow-hidden">
                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                  <div>
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <CheckCircle2 size={24} aria-hidden="true" />
                      <span className="font-display font-bold text-3xl text-slate-800"><Counter target={stats.delivered_pct || 0} />%</span>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Delivery Rate</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2 text-indigo-600">
                      <Users size={24} aria-hidden="true" />
                      <span className="font-display font-bold text-3xl text-slate-800"><Counter target={stats.total_politicians || 0} /></span>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Total Politicians</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2 text-amber-600">
                      <Award size={24} aria-hidden="true" />
                      <span className="font-display font-bold text-3xl text-slate-800"><Counter target={stats.total_promises || 0} /></span>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Total Promises</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2 text-purple-600">
                      <Globe size={24} aria-hidden="true" />
                      <span className="font-display font-bold text-3xl text-slate-800"><Counter target={160} />+</span>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Countries</div>
                  </div>
                </div>
              </div>
            </section>
          </FadeIn>
        </LazySection>
      )}
    </PublicLayout>
  );
}
